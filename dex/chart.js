// Chart functionality for DEX price visualization

let priceChart = null;
let chartData = {
    labels: [],
    prices: [],
    volumes: [],
    ohlc: [], // For candlestick data: [{x, o, h, l, c}]
    timeMin: null,
    timeMax: null
};
let chartInterval = '1y'; // Default interval
let chartScaleType = 'logarithmic'; // Default scale type
let chartType = 'line'; // 'line' or 'candlestick'

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
                    type: chartScaleType,
                    display: true,
                    position: 'left',
                    grace: '5%',
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
            // Align timestamp to proper day/week boundary
            const intervalKey = alignTimestamp(timestamp, interval);
            
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
    const ohlc = []; // OHLC data for candlestick chart
    
    // Align start and end timestamps to proper boundaries
    const firstIntervalStart = alignTimestamp(startTimestamp, interval);
    const lastIntervalStart = alignTimestamp(endTimestamp, interval);
    
    let lastKnownPrice = null;
    
    for (let ts = firstIntervalStart; ts <= lastIntervalStart; ts += intervalSeconds) {
        // Re-align each timestamp to ensure we stay on boundaries
        const alignedTs = alignTimestamp(ts, interval);
        const groupedInterval = grouped[alignedTs];
        
        labels.push(formatChartTime(alignedTs, chartInterval));
        
        if (groupedInterval && groupedInterval.prices.length > 0) {
            // Calculate average price for this interval
            const avgPrice = groupedInterval.prices.reduce((sum, p) => sum + p, 0) / groupedInterval.prices.length;
            const totalVolume = groupedInterval.volumes.reduce((sum, v) => sum + v, 0);
            
            // Calculate OHLC for candlestick
            const open = groupedInterval.prices[0];
            const close = groupedInterval.prices[groupedInterval.prices.length - 1];
            const high = Math.max(...groupedInterval.prices);
            const low = Math.min(...groupedInterval.prices);
            
            lastKnownPrice = avgPrice;
            prices.push(avgPrice);
            volumes.push(totalVolume);
            ohlc.push({
                x: alignedTs * 1000, // Convert to milliseconds for Chart.js
                o: open,
                h: high,
                l: low,
                c: close
            });
        } else {
            // No data for this interval, use last known price or null
            prices.push(lastKnownPrice);
            volumes.push(0);
            // For candlestick, create a flat candle if we have a last known price
            if (lastKnownPrice !== null) {
                ohlc.push({
                    x: alignedTs * 1000,
                    o: lastKnownPrice,
                    h: lastKnownPrice,
                    l: lastKnownPrice,
                    c: lastKnownPrice
                });
            }
        }
    }
    
    console.log('📈 [processChartData] Generated data points:', {
        labels: labels.length,
        prices: prices.length,
        volumes: volumes.length,
        ohlc: ohlc.length,
        priceRange: [Math.min(...prices.filter(p => p !== null)), Math.max(...prices.filter(p => p !== null))],
        timeRange: [firstIntervalStart, lastIntervalStart]
    });
    
    return { labels, prices, volumes, ohlc, timeMin: firstIntervalStart * 1000, timeMax: lastIntervalStart * 1000 };
}

// Create empty time range for when no orders exist
function createEmptyTimeRange(startTimestamp, endTimestamp, interval) {
    const intervalSeconds = getIntervalSeconds(interval);
    const labels = [];
    const prices = [];
    const volumes = [];
    const ohlc = [];
    
    // Align to proper day/week boundaries
    const firstIntervalStart = alignTimestamp(startTimestamp, interval);
    const lastIntervalStart = alignTimestamp(endTimestamp, interval);
    
    for (let ts = firstIntervalStart; ts <= lastIntervalStart; ts += intervalSeconds) {
        const alignedTs = alignTimestamp(ts, interval);
        labels.push(formatChartTime(alignedTs, chartInterval));
        prices.push(null);
        volumes.push(0);
    }
    
    return { labels, prices, volumes, ohlc, timeMin: firstIntervalStart * 1000, timeMax: lastIntervalStart * 1000 };
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
// Weekly candles for 1Y, daily candles for all smaller timeframes
function getIntervalSeconds(interval) {
    const intervals = {
        '1d': 86400,     // 1 day intervals for 24h view (daily candles)
        '1w': 86400,     // 1 day intervals for 7d view (daily candles)
        '1m': 86400,     // 1 day intervals for 30d view (daily candles)
        '1y': 604800     // 1 week intervals for 365d view (weekly candles)
    };
    return intervals[interval] || 86400;
}

// Align timestamp to start of day (00:00 UTC)
function alignToDay(timestamp) {
    const date = new Date(timestamp * 1000);
    date.setUTCHours(0, 0, 0, 0);
    return Math.floor(date.getTime() / 1000);
}

// Align timestamp to start of week (Monday 00:00 UTC)
function alignToWeek(timestamp) {
    const date = new Date(timestamp * 1000);
    date.setUTCHours(0, 0, 0, 0);
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getUTCDay();
    // Calculate days to subtract to get to Monday (if Sunday, go back 6 days)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    date.setUTCDate(date.getUTCDate() - daysToMonday);
    return Math.floor(date.getTime() / 1000);
}

// Align timestamp based on interval type
function alignTimestamp(timestamp, interval) {
    if (interval === '1y') {
        return alignToWeek(timestamp);
    } else {
        return alignToDay(timestamp);
    }
}

// Format time for chart labels based on interval
// Daily candles for timeframes < 1Y, weekly candles for 1Y
function formatChartTime(timestamp, interval) {
    // Nexus timestamps are in seconds, convert to milliseconds for JavaScript Date
    const date = new Date(timestamp * 1000);
    
    if (interval === '1d') {
        // Show weekday for 1 day view (daily candle)
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } else if (interval === '1w') {
        // Show date for 7d view (daily candles)
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1m') {
        // Show date for 30d view (daily candles)
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (interval === '1y') {
        // Show week/month for 365d view (weekly candles)
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleString();
}

// Update chart with new data
function updateChartData(data, pair) {
    console.log('📊 [updateChartData] Updating chart with:', {
        labels: data.labels.length,
        prices: data.prices.length,
        volumes: data.volumes.length,
        ohlc: data.ohlc?.length || 0,
        pair: pair.pair,
        interval: chartInterval,
        chartType: chartType
    });
    
    // Store data globally for chart type switching
    chartData = data;
    
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
        
        // Update data based on chart type
        if (chartType === 'candlestick' && data.ohlc && data.ohlc.length > 0) {
            // Switch to candlestick mode
            priceChart.data.labels = []; // Candlestick uses x values in data
            priceChart.data.datasets[0].type = 'candlestick';
            priceChart.data.datasets[0].data = data.ohlc;
            priceChart.data.datasets[0].borderColor = undefined;
            priceChart.data.datasets[0].backgroundColor = undefined;
            priceChart.data.datasets[0].color = {
                up: 'rgba(34, 197, 94, 1)',      // Green for bullish
                down: 'rgba(239, 68, 68, 1)',   // Red for bearish
                unchanged: 'rgba(156, 163, 175, 1)'
            };
            priceChart.data.datasets[0].borderWidth = 1;
            priceChart.data.datasets[0].fill = false;
            priceChart.data.datasets[0].tension = 0;
            priceChart.data.datasets[0].pointRadius = 0;
            
            // Update x-axis for time scale
            priceChart.options.scales.x.type = 'time';
            priceChart.options.scales.x.time = {
                unit: chartInterval === '1y' ? 'month' : 'day',
                displayFormats: {
                    day: 'MMM d',
                    week: 'MMM d',
                    month: 'MMM yyyy'
                },
                tooltipFormat: chartInterval === '1y' ? 'Week of MMM d, yyyy' : 'MMM d, yyyy'
            };
            priceChart.options.scales.x.adapters = {
                date: {
                    zone: 'UTC'
                }
            };
            priceChart.options.scales.x.ticks = {
                source: 'auto',
                autoSkip: true,
                maxTicksLimit: 12,
                color: '#9ca3af',
                font: {
                    size: 11
                },
                maxRotation: 0
            };
            // Set explicit time bounds to show full range even without data
            if (data.timeMin && data.timeMax) {
                priceChart.options.scales.x.min = data.timeMin;
                priceChart.options.scales.x.max = data.timeMax;
                console.log('📊 [updateChartData] Set x-axis bounds:', {
                    min: new Date(data.timeMin).toISOString(),
                    max: new Date(data.timeMax).toISOString()
                });
            }
            
            // Volume data with matching x timestamps for time scale
            priceChart.data.datasets[1].data = data.ohlc.map((candle, i) => ({
                x: candle.x,
                y: data.volumes[i] || 0
            }));
        } else {
            // Line chart mode
            priceChart.data.labels = data.labels;
            priceChart.data.datasets[0].type = 'line';
            priceChart.data.datasets[0].data = data.prices;
            priceChart.data.datasets[0].borderColor = 'rgb(99, 102, 241)';
            priceChart.data.datasets[0].backgroundColor = 'rgba(99, 102, 241, 0.1)';
            priceChart.data.datasets[0].borderWidth = 2;
            priceChart.data.datasets[0].fill = true;
            priceChart.data.datasets[0].tension = 0.4;
            priceChart.data.datasets[0].pointRadius = 0;
            priceChart.data.datasets[0].color = undefined;
            
            // Reset x-axis to category - fully clean up time scale properties
            priceChart.options.scales.x.type = 'category';
            delete priceChart.options.scales.x.time;
            delete priceChart.options.scales.x.adapters;
            delete priceChart.options.scales.x.min;
            delete priceChart.options.scales.x.max;
            // Reset ticks to default for category scale
            priceChart.options.scales.x.ticks = {
                color: '#9ca3af',
                font: {
                    size: 11
                }
            };
            
            // Volume data as simple array for category scale
            priceChart.data.datasets[1].data = data.volumes;
        }
        
        // Calculate price bounds for y-axis scaling
        let priceValues = [];
        
        if (chartType === 'candlestick' && data.ohlc && data.ohlc.length > 0) {
            // For candlestick, extract all high and low values
            data.ohlc.forEach(candle => {
                if (candle && candle.h > 0) priceValues.push(candle.h);
                if (candle && candle.l > 0) priceValues.push(candle.l);
            });
        } else if (data.prices) {
            // For line chart, use simple values
            priceValues = data.prices.filter(p => p !== null && p > 0);
        }
        
        // Apply scale bounds
        if (priceValues.length > 0) {
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);
            
            // Handle single trade or flat price case
            if (minPrice === maxPrice) {
                // Use ±10% of the price value
                priceChart.options.scales.y.min = minPrice * 0.9;
                priceChart.options.scales.y.max = maxPrice * 1.1;
            } else if (chartScaleType === 'logarithmic') {
                const logMin = Math.log10(minPrice);
                const logMax = Math.log10(maxPrice);
                const logRange = logMax - logMin;
                const buffer = logRange * 0.1;
                
                priceChart.options.scales.y.min = Math.pow(10, logMin - buffer);
                priceChart.options.scales.y.max = Math.pow(10, logMax + buffer);
            } else {
                // For linear scale, add 10% buffer
                const priceRange = maxPrice - minPrice;
                const buffer = priceRange * 0.1;
                
                priceChart.options.scales.y.min = Math.max(0, minPrice - buffer);
                priceChart.options.scales.y.max = maxPrice + buffer;
            }
            
            console.log('📊 [updateChartData] Y-axis bounds:', {
                minPrice,
                maxPrice,
                scaleType: chartScaleType,
                yMin: priceChart.options.scales.y.min,
                yMax: priceChart.options.scales.y.max
            });
        } else {
            // No valid price data, remove explicit bounds
            delete priceChart.options.scales.y.min;
            delete priceChart.options.scales.y.max;
        }
        
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

// Toggle chart scale between logarithmic and linear
function toggleChartScale() {
    chartScaleType = chartScaleType === 'linear' ? 'logarithmic' : 'linear';
    
    // Update button text
    const toggleBtn = document.getElementById('scale-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = chartScaleType === 'linear' ? 'Log' : 'Linear';
    }
    
    // Update chart scale
    if (priceChart && priceChart.options.scales.y) {
        priceChart.options.scales.y.type = chartScaleType;
        
        // Calculate price bounds
        let priceValues = [];
        
        // Handle both line chart (simple values) and candlestick (OHLC objects)
        const data = priceChart.data.datasets[0].data;
        if (chartType === 'candlestick') {
            // For candlestick, extract all high and low values
            data.forEach(candle => {
                if (candle && candle.h > 0) priceValues.push(candle.h);
                if (candle && candle.l > 0) priceValues.push(candle.l);
            });
        } else {
            // For line chart, use simple values
            priceValues = data.filter(p => p !== null && p > 0);
        }
        
        if (priceValues.length > 0) {
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);
            
            // Handle single trade or flat price case
            if (minPrice === maxPrice) {
                // Use ±10% of the price value
                priceChart.options.scales.y.min = minPrice * 0.9;
                priceChart.options.scales.y.max = maxPrice * 1.1;
            } else if (chartScaleType === 'logarithmic') {
                // Add ~10% buffer on log scale
                const logMin = Math.log10(minPrice);
                const logMax = Math.log10(maxPrice);
                const logRange = logMax - logMin;
                const buffer = logRange * 0.1;
                
                priceChart.options.scales.y.min = Math.pow(10, logMin - buffer);
                priceChart.options.scales.y.max = Math.pow(10, logMax + buffer);
            } else {
                // For linear scale, add 10% buffer
                const priceRange = maxPrice - minPrice;
                const buffer = priceRange * 0.1;
                
                priceChart.options.scales.y.min = Math.max(0, minPrice - buffer);
                priceChart.options.scales.y.max = maxPrice + buffer;
            }
        } else {
            delete priceChart.options.scales.y.min;
            delete priceChart.options.scales.y.max;
        }
        
        priceChart.update();
    }
}

// Toggle chart type between line and candlestick
function toggleChartType() {
    chartType = chartType === 'line' ? 'candlestick' : 'line';
    
    // Update button text and active state
    const toggleBtn = document.getElementById('chart-type-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = chartType === 'line' ? 'Candles' : 'Line';
        toggleBtn.classList.toggle('active', chartType === 'candlestick');
    }
    
    console.log('[toggleChartType] Switched to:', chartType);
    
    // Reload chart with current pair if data exists
    if (currentPair && chartData.labels.length > 0) {
        updateChartData(chartData, currentPair);
    } else if (currentPair) {
        loadChart(currentPair);
    }
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        initializeChart();
        
        // Setup scale toggle button and set initial text
        const scaleToggle = document.getElementById('scale-toggle');
        if (scaleToggle) {
            scaleToggle.addEventListener('click', toggleChartScale);
            // Set button text to reflect current scale (log is default, so show "Linear" option)
            scaleToggle.textContent = 'Linear';
        }
        
        // Setup chart type toggle button
        const chartTypeToggle = document.getElementById('chart-type-toggle');
        if (chartTypeToggle) {
            chartTypeToggle.addEventListener('click', toggleChartType);
            // Set button text to show alternative option (line is default, so show "Candles")
            chartTypeToggle.textContent = 'Candles';
        }
    }, 100);
});
