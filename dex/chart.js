// Chart functionality for DEX price visualization

let priceChart = null;
let chartData = {
    labels: [],
    prices: [],
    volumes: []
};
let chartInterval = '1d'; // Default interval

// Initialize chart
function initializeChart() {
    const chartCanvas = document.getElementById('price-chart');
    if (!chartCanvas) return;

    const ctx = chartCanvas.getContext('2d');
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Price',
                    data: [],
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Volume',
                    data: [],
                    type: 'bar',
                    backgroundColor: 'rgba(139, 92, 246, 0.3)',
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#e5e7eb',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.label === 'Price') {
                                    label += formatPrice(context.parsed.y);
                                } else {
                                    label += formatNumber(context.parsed.y);
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(55, 65, 81, 0.3)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Load chart data for a specific pair
async function loadChart(pair) {
    if (!pair || !pair.pair) return;
    
    console.log(`Loading chart for ${pair.pair} with interval ${chartInterval}`);
    
    try {
        // Calculate timestamp for lookback period
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        const lookbackSeconds = getLookbackSeconds(chartInterval);
        const startTimestamp = now - lookbackSeconds;
        
        console.log(`Fetching orders from ${new Date(startTimestamp * 1000).toLocaleString()} to now`);
        
        // Fetch historical executed orders for the chart
        const response = await fetch(API_ENDPOINTS.listExecuted, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                market: pair.pair,
                limit: 1000,
                sort: 'timestamp',
                order: 'desc'
            })
        });

        if (response.ok) {
            const data = await response.json();
            const bids = data.result?.bids || [];
            const asks = data.result?.asks || [];
            let executedOrders = [...bids, ...asks];
            
            console.log(`Loaded ${executedOrders.length} total executed orders`);
            
            // Filter by timestamp in JavaScript
            executedOrders = executedOrders.filter(order => {
                return (order.timestamp || 0) >= startTimestamp;
            });
            
            console.log(`${executedOrders.length} orders within ${chartInterval} time range`);
            
            if (executedOrders.length > 0) {
                // Sort by timestamp
                executedOrders.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                
                // Process data based on selected interval
                const processedData = processChartData(executedOrders, pair.pair, chartInterval, startTimestamp, now);
                
                // Update chart
                updateChartData(processedData, pair);
            } else {
                // Show placeholder if no data
                showChartPlaceholder(pair);
            }
        } else {
            console.warn('Failed to fetch chart data');
            showChartPlaceholder(pair);
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
        showChartPlaceholder(pair);
    }
}

// Process raw order data into chart intervals
function processChartData(orders, marketPair, interval, startTimestamp, endTimestamp) {
    console.log('📈 [processChartData] Processing data:', {
        ordersCount: orders.length,
        marketPair,
        interval,
        startTimestamp: new Date(startTimestamp * 1000).toLocaleString(),
        endTimestamp: new Date(endTimestamp * 1000).toLocaleString()
    });
    
    if (orders.length === 0) {
        // Still create empty time slots for the full range
        return createEmptyTimeRange(startTimestamp, endTimestamp, interval);
    }
    
    // Determine interval duration in seconds
    const intervalSeconds = getIntervalSeconds(interval);
    
    // Group orders by time intervals
    const grouped = {};
    
    orders.forEach(order => {
        const timestamp = order.timestamp || 0;
        const price = calculatePriceFromOrder(order, marketPair);
        const contractAmount = parseFloat(order.contract?.amount || 0);
        const contractTicker = order.contract?.ticker || '';
        const volume = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
        
        if (price > 0 && volume > 0) {
            // Round timestamp to interval
            const intervalKey = Math.floor(timestamp / intervalSeconds) * intervalSeconds;
            
            if (!grouped[intervalKey]) {
                grouped[intervalKey] = {
                    timestamp: intervalKey,
                    prices: [],
                    volumes: []
                };
            }
            
            grouped[intervalKey].prices.push(price);
            grouped[intervalKey].volumes.push(volume);
        }
    });
    
    console.log('📈 [processChartData] Grouped into intervals:', Object.keys(grouped).length);
    
    // Create complete time range including empty intervals
    const labels = [];
    const prices = [];
    const volumes = [];
    
    // Start from the beginning of the first interval that contains startTimestamp
    const firstIntervalStart = Math.floor(startTimestamp / intervalSeconds) * intervalSeconds;
    const lastIntervalStart = Math.floor(endTimestamp / intervalSeconds) * intervalSeconds;
    
    let lastKnownPrice = null;
    
    for (let ts = firstIntervalStart; ts <= lastIntervalStart; ts += intervalSeconds) {
        const interval = grouped[ts];
        
        labels.push(formatChartTime(ts, chartInterval));
        
        if (interval && interval.prices.length > 0) {
            // Calculate average price for this interval
            const avgPrice = interval.prices.reduce((sum, p) => sum + p, 0) / interval.prices.length;
            const totalVolume = interval.volumes.reduce((sum, v) => sum + v, 0);
            
            lastKnownPrice = avgPrice;
            prices.push(avgPrice);
            volumes.push(totalVolume);
        } else {
            // No data for this interval, use last known price or null
            prices.push(lastKnownPrice);
            volumes.push(0);
        }
    }
    
    console.log('📈 [processChartData] Generated data points:', {
        labels: labels.length,
        prices: prices.length,
        volumes: volumes.length,
        priceRange: [Math.min(...prices.filter(p => p !== null)), Math.max(...prices.filter(p => p !== null))]
    });
    
    return { labels, prices, volumes };
}

// Create empty time range for when no orders exist
function createEmptyTimeRange(startTimestamp, endTimestamp, interval) {
    const intervalSeconds = getIntervalSeconds(interval);
    const labels = [];
    const prices = [];
    const volumes = [];
    
    const firstIntervalStart = Math.floor(startTimestamp / intervalSeconds) * intervalSeconds;
    const lastIntervalStart = Math.floor(endTimestamp / intervalSeconds) * intervalSeconds;
    
    for (let ts = firstIntervalStart; ts <= lastIntervalStart; ts += intervalSeconds) {
        labels.push(formatChartTime(ts, chartInterval));
        prices.push(null);
        volumes.push(0);
    }
    
    return { labels, prices, volumes };
}

// Get lookback period in seconds (how far back to fetch data)
function getLookbackSeconds(interval) {
    const lookbacks = {
        '1d': 86400,      // 24 hours
        '1w': 604800,     // 7 days
        '1m': 2592000,    // 30 days
        '1y': 31536000    // 365 days
    };
    return lookbacks[interval] || 86400;
}

// Get interval duration in seconds
function getIntervalSeconds(interval) {
    const intervals = {
        '1d': 3600,      // 1 hour intervals for 24h view
        '1w': 21600,     // 6 hour intervals for 7d view
        '1m': 86400,     // 1 day intervals for 30d view
        '1y': 604800     // 1 week intervals for 365d view
    };
    return intervals[interval] || 3600;
}

// Format time for chart labels based on interval
function formatChartTime(timestamp, interval) {
    // Nexus timestamps are in seconds, convert to milliseconds for JavaScript Date
    const date = new Date(timestamp * 1000);
    
    if (interval === '1d') {
        // Show hours for 24h view
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (interval === '1w') {
        // Show day and time for 7d view
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1m') {
        // Show date for 30d view
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1y') {
        // Show month for 365d view
        return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
    return date.toLocaleString();
}

// Update chart with new data
function updateChartData(data, pair) {
    console.log('📊 [updateChartData] Updating chart with:', {
        labels: data.labels.length,
        prices: data.prices.length,
        volumes: data.volumes.length,
        pair: pair.pair,
        interval: chartInterval
    });
    
    if (!priceChart) {
        console.log('📊 [updateChartData] Chart not initialized, initializing now...');
        initializeChart();
    }
    
    if (priceChart) {
        // Make sure canvas is visible
        const canvas = document.getElementById('price-chart');
        if (canvas) {
            canvas.style.display = 'block';
        }
        
        // Hide any placeholder
        const chartContainer = canvas?.parentElement;
        const placeholder = chartContainer?.querySelector('.chart-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Update chart title
        priceChart.options.plugins.title = {
            display: true,
            text: `${pair.pair} - ${chartInterval.toUpperCase()}`,
            color: '#e5e7eb',
            font: {
                size: 14,
                weight: 'normal'
            }
        };
        
        // Update data
        priceChart.data.labels = data.labels;
        priceChart.data.datasets[0].data = data.prices;
        priceChart.data.datasets[1].data = data.volumes;
        
        console.log('📊 [updateChartData] Chart updated successfully');
        
        // Update chart with animation
        priceChart.update();
    } else {
        console.error('❌ [updateChartData] Failed to initialize chart');
    }
}

// Show placeholder when no data available
function showChartPlaceholder(pair) {
    const chartContainer = document.getElementById('price-chart')?.parentElement;
    if (!chartContainer) return;
    
    // Hide canvas, show message
    const canvas = document.getElementById('price-chart');
    if (canvas) {
        canvas.style.display = 'none';
    }
    
    let placeholder = chartContainer.querySelector('.chart-placeholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'chart-placeholder';
        chartContainer.appendChild(placeholder);
    }
    
    placeholder.style.display = 'flex';
    placeholder.innerHTML = `
        <div style="text-align: center;">
            <h3 style="color: var(--primary-color); margin-bottom: 1rem;">${pair.pair}</h3>
            <p style="color: var(--text-secondary);">No historical data available</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
                Current Price: ${formatPrice(pair.price)}
            </p>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                24h Change: <span class="${pair.change24h >= 0 ? 'trade-buy' : 'trade-sell'}">
                    ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
                </span>
            </p>
        </div>
    `;
}

// Update chart interval
function updateChartInterval(interval) {
    console.log('[updateChartInterval] Called with:', interval);
    console.log('[updateChartInterval] Current chartInterval:', chartInterval);
    console.log('[updateChartInterval] Current pair:', currentPair);
    
    chartInterval = interval;
    
    console.log('[updateChartInterval] Updated chartInterval to:', chartInterval);
    
    // Update active button state
    document.querySelectorAll('.chart-interval').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.interval === interval) {
            btn.classList.add('active');
        }
    });
    
    // Reload chart with new interval
    if (currentPair) {
        console.log('[updateChartInterval] Calling loadChart with:', currentPair.pair);
        loadChart(currentPair);
    } else {
        console.warn('[updateChartInterval] No currentPair, cannot reload');
    }
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        initializeChart();
    }, 100);
});
