#!/usr/bin/env python3
"""
Distordia Verification Daemon

A local script that runs alongside a Nexus node to:
1. Process verification requests from on-chain assets
2. Check DIST balances of currently verified namespaces
3. Update verified namespace assets based on balance changes
4. Process dispute requests

Requirements:
- Python 3.8+
- requests library (pip install requests)
- Local Nexus node running with API access
- Logged-in session with distordia namespace credentials

Usage:
    python verification_daemon.py --config config.json
    python verification_daemon.py --node http://localhost:8080 --session <session_id>
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    print("Error: requests library required. Install with: pip install requests")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

DEFAULT_CONFIG = {
    "node_url": "http://localhost:8080",
    "check_interval": 300,  # 5 minutes
    "distordia_namespace": "distordia",
    "asset_max_entries": 50,
    "tier_thresholds": {
        "L0": 1,
        "L1": 1000,
        "L2": 10000,
        "L3": 100000
    },
    "log_file": "verification_daemon.log",
    "log_level": "INFO"
}

# =============================================================================
# LOGGING SETUP
# =============================================================================

def setup_logging(log_file: str, log_level: str):
    """Configure logging to file and console."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)


# =============================================================================
# NEXUS API CLIENT
# =============================================================================

class NexusClient:
    """Client for interacting with local Nexus node API."""
    
    def __init__(self, node_url: str, session_id: Optional[str] = None):
        self.node_url = node_url.rstrip('/')
        self.session_id = session_id
        self.logger = logging.getLogger(__name__)
    
    def request(self, endpoint: str, params: dict = None) -> dict:
        """Make a POST request to the Nexus API."""
        url = f"{self.node_url}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        body = params or {}
        if self.session_id:
            body["session"] = self.session_id
        
        try:
            response = requests.post(url, json=body, headers=headers, timeout=30)
            data = response.json()
            
            if "error" in data:
                raise NexusAPIError(data["error"].get("message", "Unknown error"))
            
            return data.get("result", data)
        
        except requests.exceptions.RequestException as e:
            raise NexusAPIError(f"Request failed: {e}")
    
    def login(self, username: str, password: str, pin: str) -> str:
        """Login to create a session."""
        result = self.request("sessions/create/local", {
            "username": username,
            "password": password,
            "pin": pin
        })
        self.session_id = result.get("session")
        self.logger.info(f"Logged in, session: {self.session_id[:16]}...")
        return self.session_id
    
    def unlock(self, pin: str, notifications: bool = True):
        """Unlock the session for transactions."""
        self.request("sessions/unlock/local", {
            "pin": pin,
            "notifications": notifications
        })
        self.logger.info("Session unlocked")
    
    # -------------------------------------------------------------------------
    # Read Operations
    # -------------------------------------------------------------------------
    
    def get_namespace_info(self, namespace: str) -> Optional[dict]:
        """Get namespace details including genesis ID."""
        try:
            return self.request("names/get/namespace", {"name": namespace})
        except NexusAPIError:
            return None
    
    def get_account_balance(self, account_name: str) -> float:
        """Get token account balance in display units."""
        try:
            result = self.request("finance/get/account", {"name": account_name})
            # Balance in base units, convert to display (6 decimals for NXS/tokens)
            return float(result.get("balance", 0)) / 1e6
        except NexusAPIError:
            return 0.0
    
    def get_verification_balance(self, namespace: str) -> float:
        """Get DIST verification account balance for a namespace."""
        account_name = f"{namespace}::DIST-verification"
        return self.get_account_balance(account_name)
    
    def get_asset(self, asset_name: str) -> Optional[dict]:
        """Get asset data by name."""
        try:
            return self.request("assets/get/asset", {"name": asset_name})
        except NexusAPIError:
            return None
    
    def list_assets_by_type(self, asset_type: str) -> list:
        """List all assets with a specific distordia-type."""
        try:
            # Use register API for public queries
            result = self.request("register/list/assets:asset", {
                "where": f"results.distordia-type={asset_type}"
            })
            return result if isinstance(result, list) else []
        except NexusAPIError:
            return []
    
    # -------------------------------------------------------------------------
    # Write Operations (require session)
    # -------------------------------------------------------------------------
    
    def create_asset(self, name: str, data: dict) -> dict:
        """Create a new asset."""
        return self.request("assets/create/asset", {
            "name": name,
            "format": "JSON",
            "data": json.dumps(data)
        })
    
    def update_asset(self, name: str, data: dict) -> dict:
        """Update an existing asset."""
        return self.request("assets/update/asset", {
            "name": name,
            **data
        })


class NexusAPIError(Exception):
    """Exception for Nexus API errors."""
    pass


# =============================================================================
# VERIFICATION DAEMON
# =============================================================================

class VerificationDaemon:
    """Main daemon class for processing verifications."""
    
    def __init__(self, client: NexusClient, config: dict):
        self.client = client
        self.config = config
        self.namespace = config["distordia_namespace"]
        self.thresholds = config["tier_thresholds"]
        self.max_entries = config["asset_max_entries"]
        self.logger = logging.getLogger(__name__)
    
    # -------------------------------------------------------------------------
    # Request Processing
    # -------------------------------------------------------------------------
    
    def process_verification_requests(self):
        """Process pending verification requests."""
        self.logger.info("Processing verification requests...")
        
        requests = self.get_pending_requests("verification-request")
        
        for req in requests:
            try:
                self.process_single_request(req)
            except Exception as e:
                self.logger.error(f"Failed to process request {req.get('id')}: {e}")
    
    def get_pending_requests(self, request_type: str) -> list:
        """Get all pending requests of a specific type."""
        assets = self.client.list_assets_by_type(request_type)
        
        pending = []
        for asset in assets:
            if asset.get("status") == "pending":
                pending.append(asset)
        
        return pending
    
    def process_single_request(self, request: dict):
        """Process a single verification request."""
        namespace = request.get("namespace")
        requested_tier = request.get("tier", "L1")
        request_id = request.get("address") or request.get("name")
        
        self.logger.info(f"Processing request for {namespace} -> {requested_tier}")
        
        # Check namespace exists
        ns_info = self.client.get_namespace_info(namespace)
        if not ns_info:
            self.update_request_status(request_id, "rejected", "Namespace not found")
            return
        
        # Check DIST balance
        balance = self.client.get_verification_balance(namespace)
        penalties = self.get_penalties_for_namespace(namespace)
        effective_balance = max(0, balance - penalties)
        
        # Determine eligible tier
        eligible_tier = self.calculate_eligible_tier(effective_balance)
        
        # Check if requested tier is allowed
        tier_order = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
        if tier_order.get(eligible_tier, 0) < tier_order.get(requested_tier, 0):
            self.update_request_status(
                request_id, 
                "rejected", 
                f"Insufficient balance. Eligible for {eligible_tier}, requested {requested_tier}"
            )
            return
        
        # Add to verified list
        self.add_to_verified(namespace, ns_info.get("address"), requested_tier, balance)
        
        # Update request status
        self.update_request_status(request_id, "approved", f"Verified as {requested_tier}")
        
        self.logger.info(f"✓ {namespace} verified as {requested_tier}")
    
    def update_request_status(self, request_id: str, status: str, message: str):
        """Update the status of a request asset."""
        try:
            self.client.update_asset(request_id, {
                "status": status,
                "message": message,
                "processed": datetime.utcnow().isoformat() + "Z"
            })
        except NexusAPIError as e:
            self.logger.error(f"Failed to update request status: {e}")
    
    # -------------------------------------------------------------------------
    # Dispute Processing
    # -------------------------------------------------------------------------
    
    def process_dispute_requests(self):
        """Process pending dispute requests."""
        self.logger.info("Processing dispute requests...")
        
        requests = self.get_pending_requests("dispute-request")
        
        for req in requests:
            try:
                self.process_dispute(req)
            except Exception as e:
                self.logger.error(f"Failed to process dispute {req.get('id')}: {e}")
    
    def process_dispute(self, dispute: dict):
        """Process a single dispute request."""
        namespace = dispute.get("namespace")
        penalty = float(dispute.get("penalty", 0))
        reason = dispute.get("reason", "")
        dispute_id = dispute.get("address") or dispute.get("name")
        
        self.logger.info(f"Processing dispute against {namespace}: {penalty} DIST")
        
        # Add to disputes registry
        self.add_dispute(namespace, penalty, reason, dispute_id)
        
        # Update request status
        self.update_request_status(dispute_id, "registered", "Dispute registered")
        
        # Re-evaluate namespace tier
        self.audit_single_namespace(namespace)
        
        self.logger.info(f"✓ Dispute registered against {namespace}")
    
    # -------------------------------------------------------------------------
    # Balance Auditing
    # -------------------------------------------------------------------------
    
    def audit_all_verified(self):
        """Audit all verified namespaces for balance changes."""
        self.logger.info("Auditing all verified namespaces...")
        
        stats = {"valid": 0, "updated": 0, "revoked": 0}
        
        for tier in ["L3", "L2", "L1"]:
            verified = self.get_verified_for_tier(tier)
            
            for entry in verified:
                namespace = entry.get("namespace")
                try:
                    result = self.audit_single_namespace(namespace, tier)
                    stats[result] += 1
                except Exception as e:
                    self.logger.error(f"Failed to audit {namespace}: {e}")
        
        self.logger.info(
            f"Audit complete: {stats['valid']} valid, "
            f"{stats['updated']} updated, {stats['revoked']} revoked"
        )
        
        return stats
    
    def audit_single_namespace(self, namespace: str, current_tier: str = None) -> str:
        """Audit a single namespace and update if needed."""
        if current_tier is None:
            current_tier = self.get_current_tier(namespace)
        
        if current_tier == "L0":
            return "valid"
        
        # Check current balance
        balance = self.client.get_verification_balance(namespace)
        penalties = self.get_penalties_for_namespace(namespace)
        effective_balance = max(0, balance - penalties)
        
        # Determine eligible tier
        eligible_tier = self.calculate_eligible_tier(effective_balance)
        
        tier_order = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
        current_order = tier_order.get(current_tier, 0)
        eligible_order = tier_order.get(eligible_tier, 0)
        
        if eligible_order >= current_order:
            return "valid"
        
        # Need to update/revoke
        self.remove_from_tier(namespace, current_tier)
        
        if eligible_tier != "L0":
            ns_info = self.client.get_namespace_info(namespace)
            self.add_to_verified(namespace, ns_info.get("address"), eligible_tier, balance)
            self.logger.info(f"↓ {namespace} downgraded from {current_tier} to {eligible_tier}")
            return "updated"
        else:
            self.logger.info(f"✗ {namespace} revoked from {current_tier}")
            return "revoked"
    
    def calculate_eligible_tier(self, effective_balance: float) -> str:
        """Calculate eligible tier based on effective balance."""
        if effective_balance >= self.thresholds["L3"]:
            return "L3"
        elif effective_balance >= self.thresholds["L2"]:
            return "L2"
        elif effective_balance >= self.thresholds["L1"]:
            return "L1"
        else:
            return "L0"
    
    # -------------------------------------------------------------------------
    # Verified List Management
    # -------------------------------------------------------------------------
    
    def get_verified_for_tier(self, tier: str) -> list:
        """Get all verified namespaces for a tier."""
        verified = []
        index = 1
        
        while True:
            asset_name = f"{self.namespace}:{tier}-verified-{index}"
            asset = self.client.get_asset(asset_name)
            
            if not asset:
                break
            
            namespaces_str = asset.get("namespaces", "[]")
            try:
                namespaces = json.loads(namespaces_str) if isinstance(namespaces_str, str) else namespaces_str
                verified.extend(namespaces)
            except json.JSONDecodeError:
                pass
            
            index += 1
        
        return verified
    
    def get_current_tier(self, namespace: str) -> str:
        """Get the current verified tier for a namespace."""
        for tier in ["L3", "L2", "L1"]:
            verified = self.get_verified_for_tier(tier)
            if any(v.get("namespace") == namespace for v in verified):
                return tier
        return "L0"
    
    def add_to_verified(self, namespace: str, genesis: str, tier: str, balance: float):
        """Add a namespace to the verified list."""
        # Remove from other tiers first
        for other_tier in ["L3", "L2", "L1"]:
            if other_tier != tier:
                self.remove_from_tier(namespace, other_tier)
        
        # Find target asset
        index = 1
        target_entries = []
        target_index = 1
        
        while True:
            asset_name = f"{self.namespace}:{tier}-verified-{index}"
            asset = self.client.get_asset(asset_name)
            
            if not asset:
                target_index = index
                break
            
            namespaces_str = asset.get("namespaces", "[]")
            try:
                entries = json.loads(namespaces_str) if isinstance(namespaces_str, str) else namespaces_str
            except json.JSONDecodeError:
                entries = []
            
            # Check if already exists
            if any(e.get("namespace") == namespace for e in entries):
                return  # Already verified
            
            if len(entries) < self.max_entries:
                target_entries = entries
                target_index = index
                break
            
            index += 1
            target_index = index
        
        # Add new entry
        entry = {
            "namespace": namespace,
            "genesis": genesis,
            "verified": datetime.utcnow().isoformat() + "Z",
            "balance": balance
        }
        target_entries.append(entry)
        
        # Write to blockchain
        asset_name = f"{tier}-verified-{target_index}"
        asset_data = {
            "distordia-type": "verification-registry",
            "tier": tier,
            "version": 1,
            "updated": datetime.utcnow().isoformat() + "Z",
            "namespaces": json.dumps(target_entries)
        }
        
        # Check if asset exists
        full_name = f"{self.namespace}:{asset_name}"
        if self.client.get_asset(full_name):
            self.client.update_asset(full_name, asset_data)
        else:
            self.client.create_asset(asset_name, asset_data)
    
    def remove_from_tier(self, namespace: str, tier: str) -> bool:
        """Remove a namespace from a tier's verified list."""
        index = 1
        
        while True:
            asset_name = f"{self.namespace}:{tier}-verified-{index}"
            asset = self.client.get_asset(asset_name)
            
            if not asset:
                break
            
            namespaces_str = asset.get("namespaces", "[]")
            try:
                entries = json.loads(namespaces_str) if isinstance(namespaces_str, str) else namespaces_str
            except json.JSONDecodeError:
                entries = []
            
            # Find and remove
            original_len = len(entries)
            entries = [e for e in entries if e.get("namespace") != namespace]
            
            if len(entries) < original_len:
                # Update asset
                self.client.update_asset(asset_name, {
                    "updated": datetime.utcnow().isoformat() + "Z",
                    "namespaces": json.dumps(entries)
                })
                return True
            
            index += 1
        
        return False
    
    # -------------------------------------------------------------------------
    # Dispute Management
    # -------------------------------------------------------------------------
    
    def get_all_disputes(self) -> list:
        """Get all disputes from on-chain assets."""
        disputes = []
        index = 1
        
        while True:
            asset_name = f"{self.namespace}:disputes-{index}"
            asset = self.client.get_asset(asset_name)
            
            if not asset:
                break
            
            disputes_str = asset.get("disputes", "[]")
            try:
                entries = json.loads(disputes_str) if isinstance(disputes_str, str) else disputes_str
                disputes.extend(entries)
            except json.JSONDecodeError:
                pass
            
            index += 1
        
        return disputes
    
    def get_penalties_for_namespace(self, namespace: str) -> float:
        """Get total active penalties for a namespace."""
        disputes = self.get_all_disputes()
        
        total = 0.0
        for d in disputes:
            if d.get("namespace") == namespace and d.get("status") == "active":
                total += float(d.get("penalty", 0))
        
        return total
    
    def add_dispute(self, namespace: str, penalty: float, reason: str, source_id: str):
        """Add a dispute to the disputes registry."""
        # Find target asset
        index = 1
        target_entries = []
        target_index = 1
        
        while True:
            asset_name = f"{self.namespace}:disputes-{index}"
            asset = self.client.get_asset(asset_name)
            
            if not asset:
                target_index = index
                break
            
            disputes_str = asset.get("disputes", "[]")
            try:
                entries = json.loads(disputes_str) if isinstance(disputes_str, str) else disputes_str
            except json.JSONDecodeError:
                entries = []
            
            if len(entries) < self.max_entries:
                target_entries = entries
                target_index = index
                break
            
            index += 1
            target_index = index
        
        # Add new dispute
        dispute = {
            "id": f"dispute-{int(time.time() * 1000)}",
            "namespace": namespace,
            "penalty": penalty,
            "reason": reason,
            "status": "active",
            "source": source_id,
            "created": datetime.utcnow().isoformat() + "Z"
        }
        target_entries.append(dispute)
        
        # Write to blockchain
        asset_name = f"disputes-{target_index}"
        asset_data = {
            "distordia-type": "disputes-registry",
            "version": 1,
            "updated": datetime.utcnow().isoformat() + "Z",
            "disputes": json.dumps(target_entries)
        }
        
        full_name = f"{self.namespace}:{asset_name}"
        if self.client.get_asset(full_name):
            self.client.update_asset(full_name, asset_data)
        else:
            self.client.create_asset(asset_name, asset_data)
    
    # -------------------------------------------------------------------------
    # Main Loop
    # -------------------------------------------------------------------------
    
    def run_once(self):
        """Run a single processing cycle."""
        self.logger.info("=" * 60)
        self.logger.info("Starting verification cycle")
        
        # Process verification requests
        self.process_verification_requests()
        
        # Process dispute requests
        self.process_dispute_requests()
        
        # Audit existing verifications
        self.audit_all_verified()
        
        self.logger.info("Cycle complete")
    
    def run_forever(self, interval: int):
        """Run continuously with specified interval."""
        self.logger.info(f"Starting daemon with {interval}s interval")
        
        while True:
            try:
                self.run_once()
            except Exception as e:
                self.logger.error(f"Cycle failed: {e}")
            
            self.logger.info(f"Sleeping for {interval}s...")
            time.sleep(interval)


# =============================================================================
# MAIN
# =============================================================================

def load_config(config_path: str) -> dict:
    """Load configuration from file."""
    config = DEFAULT_CONFIG.copy()
    
    if config_path and os.path.exists(config_path):
        with open(config_path, 'r') as f:
            user_config = json.load(f)
            config.update(user_config)
    
    return config


def main():
    parser = argparse.ArgumentParser(
        description="Distordia Verification Daemon",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with config file
  python verification_daemon.py --config config.json

  # Run with command line options
  python verification_daemon.py --node http://localhost:8080 --username admin --password secret --pin 1234

  # Run once (no loop)
  python verification_daemon.py --once
        """
    )
    
    parser.add_argument("--config", "-c", help="Path to config JSON file")
    parser.add_argument("--node", "-n", help="Nexus node URL")
    parser.add_argument("--session", "-s", help="Existing session ID")
    parser.add_argument("--username", "-u", help="Username for login")
    parser.add_argument("--password", "-p", help="Password for login")
    parser.add_argument("--pin", help="PIN for login/unlock")
    parser.add_argument("--interval", "-i", type=int, help="Check interval in seconds")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    
    # Override with command line args
    if args.node:
        config["node_url"] = args.node
    if args.interval:
        config["check_interval"] = args.interval
    if args.verbose:
        config["log_level"] = "DEBUG"
    
    # Setup logging
    logger = setup_logging(config["log_file"], config["log_level"])
    
    logger.info("Distordia Verification Daemon starting...")
    logger.info(f"Node: {config['node_url']}")
    
    # Create client
    client = NexusClient(config["node_url"], args.session)
    
    # Login if credentials provided
    if args.username and args.password and args.pin:
        try:
            client.login(args.username, args.password, args.pin)
            client.unlock(args.pin)
        except NexusAPIError as e:
            logger.error(f"Login failed: {e}")
            sys.exit(1)
    elif not args.session:
        logger.warning("No session or credentials provided - write operations will fail")
    
    # Create daemon
    daemon = VerificationDaemon(client, config)
    
    # Run
    if args.once:
        daemon.run_once()
    else:
        try:
            daemon.run_forever(config["check_interval"])
        except KeyboardInterrupt:
            logger.info("Shutting down...")


if __name__ == "__main__":
    main()
