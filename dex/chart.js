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
        // Fetch historical executed orders for the chart
        const response = await fetch(API_ENDPOINTS.listExecuted, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                market: pair.pair,
                limit: 100, // Get more data points for chart
                sort: 'timestamp',
                order: 'asc'
            })
        });

        if (response.ok) {
            const data = await response.json();
            const bids = data.result?.bids || [];
            const asks = data.result?.asks || [];
            const executedOrders = [...bids, ...asks];
            
            console.log(`Loaded ${executedOrders.length} historical orders for chart`);
            
            if (executedOrders.length > 0) {
                // Sort by timestamp
                executedOrders.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                
                // Process data based on selected interval
                const processedData = processChartData(executedOrders, pair.pair, chartInterval);
                
                // Update chart
                updateChart(processedData, pair);
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
function processChartData(orders, marketPair, interval) {
    if (orders.length === 0) {
        return { labels: [], prices: [], volumes: [] };
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
    
    // Convert to arrays and calculate OHLC (using close price for simplicity)
    const timestamps = Object.keys(grouped).sort((a, b) => a - b);
    const labels = [];
    const prices = [];
    const volumes = [];
    
    timestamps.forEach(ts => {
        const interval = grouped[ts];
        const avgPrice = interval.prices.reduce((sum, p) => sum + p, 0) / interval.prices.length;
        const totalVolume = interval.volumes.reduce((sum, v) => sum + v, 0);
        
        labels.push(formatChartTime(parseInt(ts), chartInterval));
        prices.push(avgPrice);
        volumes.push(totalVolume);
    });
    
    return { labels, prices, volumes };
}

// Get interval duration in seconds
function getIntervalSeconds(interval) {
    const intervals = {
        '1d': 86400,
        '1w': 604800,
        '1m': 2592000, // 30 days
        '1y': 31536000 // 365 days
    };
    return intervals[interval] || 86400;
}

// Format time for chart labels based on interval
function formatChartTime(timestamp, interval) {
    // Nexus timestamps are in seconds, convert to milliseconds for JavaScript Date
    const date = new Date(timestamp * 1000);
    
    if (interval === '1d') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1w') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1m') {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1y') {
        return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
    return date.toLocaleString();
}

// Update chart with new data
function updateChart(data, pair) {
    if (!priceChart) {
        initializeChart();
    }
    
    if (priceChart) {
        // Update chart title
        priceChart.options.plugins.title = {
            display: true,
            text: `${pair.pair} - ${chartInterval}`,
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
        
        // Update chart
        priceChart.update('none'); // 'none' for no animation on update
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
    chartInterval = interval;
    
    // Update active button state
    document.querySelectorAll('.chart-interval').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.interval === interval) {
            btn.classList.add('active');
        }
    });
    
    // Reload chart with new interval
    if (currentPair) {
        loadChart(currentPair);
    }
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        initializeChart();
    }, 100);
});
