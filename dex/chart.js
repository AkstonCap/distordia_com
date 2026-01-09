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
let chartType = 'candlestick'; // 'line' or 'candlestick'
let candleSize = 'large'; // 'small' or 'large' - determines candle duration within each timespan

// Candle size options for each timespan
// Format: { small: [seconds, label], large: [seconds, label] }
const CANDLE_SIZES = {
    '1d': { small: [900, '15m'], large: [3600, '1h'] },      // 15 min or 1 hour
    '1w': { small: [3600, '1h'], large: [14400, '4h'] },     // 1 hour or 4 hours
    '1m': { small: [14400, '4h'], large: [86400, '1d'] },    // 4 hours or 1 day
    '1y': { small: [86400, '1d'], large: [604800, '1w'] }    // 1 day or 1 week
};

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
                        title: function(tooltipItems) {
                            if (tooltipItems.length === 0) return '';
                            const item = tooltipItems[0];
                            // For candlestick with time scale, format the date nicely
                            if (item.raw && typeof item.raw === 'object' && item.raw.x) {
                                const date = new Date(item.raw.x);
                                const intervalSeconds = getIntervalSeconds(chartInterval);
                                if (intervalSeconds >= 604800) {
                                    // Weekly candles
                                    return 'Week of ' + date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                                } else if (intervalSeconds >= 86400) {
                                    // Daily candles
                                    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                                } else {
                                    // Hourly or smaller candles
                                    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                                           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                            }
                            return item.label || '';
                        },
                        label: function(context) {
                            const raw = context.raw;
                            
                            // Handle candlestick OHLC data
                            if (raw && typeof raw === 'object' && 'o' in raw) {
                                const lines = [];
                                lines.push('Open: ' + formatPrice(raw.o));
                                lines.push('High: ' + formatPrice(raw.h));
                                lines.push('Low: ' + formatPrice(raw.l));
                                lines.push('Close: ' + formatPrice(raw.c));
                                if (raw.v !== undefined) {
                                    lines.push('Volume: ' + formatNumber(raw.v));
                                }
                                return lines;
                            }
                            
                            // Skip volume bar tooltip when in candlestick mode (volume shown in candle tooltip)
                            if (raw && typeof raw === 'object' && 'y' in raw && !('o' in raw)) {
                                if (chartType === 'candlestick') {
                                    return null; // Hide duplicate volume
                                }
                                return 'Volume: ' + formatNumber(raw.y);
                            }
                            
                            // Handle line chart and simple volume values
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
                c: close,
                v: totalVolume // Store volume with the candle
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
                    c: lastKnownPrice,
                    v: 0 // No volume for flat candle
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

// Get interval duration in seconds based on timespan and candle size
function getIntervalSeconds(interval) {
    const sizes = CANDLE_SIZES[interval];
    if (sizes) {
        return sizes[candleSize][0];
    }
    return 3600; // Default 1 hour
}

// Align timestamp to 15 minute boundary
function alignTo15Min(timestamp) {
    const seconds = 900; // 15 minutes
    return Math.floor(timestamp / seconds) * seconds;
}

// Align timestamp to 1 hour boundary
function alignToHour(timestamp) {
    const date = new Date(timestamp * 1000);
    date.setUTCMinutes(0, 0, 0);
    return Math.floor(date.getTime() / 1000);
}

// Align timestamp to 4 hour boundary
function alignTo4Hour(timestamp) {
    const date = new Date(timestamp * 1000);
    const hour = Math.floor(date.getUTCHours() / 4) * 4;
    date.setUTCHours(hour, 0, 0, 0);
    return Math.floor(date.getTime() / 1000);
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

// Align timestamp based on interval type and candle size
function alignTimestamp(timestamp, interval) {
    const intervalSeconds = getIntervalSeconds(interval);
    
    // Use appropriate alignment based on candle size
    if (intervalSeconds === 900) {
        return alignTo15Min(timestamp);
    } else if (intervalSeconds === 3600) {
        return alignToHour(timestamp);
    } else if (intervalSeconds === 14400) {
        return alignTo4Hour(timestamp);
    } else if (intervalSeconds === 86400) {
        return alignToDay(timestamp);
    } else if (intervalSeconds === 604800) {
        return alignToWeek(timestamp);
    }
    return alignToHour(timestamp);
}

// Format time for chart labels based on candle size
function formatChartTime(timestamp, interval) {
    const date = new Date(timestamp * 1000);
    const intervalSeconds = getIntervalSeconds(interval);
    
    // Format based on candle duration
    if (intervalSeconds <= 3600) {
        // 15 min or 1 hour candles - show time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (intervalSeconds === 14400) {
        // 4 hour candles - show day and time
        return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
               date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (intervalSeconds === 86400) {
        // Daily candles - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
        // Weekly candles - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
            canvas.style.visibility = 'visible';
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
            
            // Determine x-axis unit based on candle size
            const intervalSeconds = getIntervalSeconds(chartInterval);
            let timeUnit = 'hour';
            let tooltipFmt = 'MMM d, HH:mm';
            
            if (intervalSeconds >= 604800) {
                timeUnit = 'month';
                tooltipFmt = 'Week of MMM d, yyyy';
            } else if (intervalSeconds >= 86400) {
                timeUnit = 'week';
                tooltipFmt = 'MMM d, yyyy';
            } else if (intervalSeconds >= 14400) {
                timeUnit = 'day';
                tooltipFmt = 'MMM d, HH:mm';
            }
            
            // Update x-axis for time scale
            priceChart.options.scales.x.type = 'time';
            priceChart.options.scales.x.time = {
                unit: timeUnit,
                displayFormats: {
                    hour: 'HH:mm',
                    day: 'MMM d',
                    week: 'MMM d',
                    month: 'MMM yyyy'
                },
                tooltipFormat: tooltipFmt
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
            
            // Volume data with matching x timestamps for time scale - use volume stored in candle
            priceChart.data.datasets[1].data = data.ohlc.map(candle => ({
                x: candle.x,
                y: candle.v || 0
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
    
    // Hide canvas (use visibility to preserve layout), show message
    const canvas = document.getElementById('price-chart');
    if (canvas) {
        canvas.style.visibility = 'hidden';
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
    
    // Update candle size labels for the new interval
    updateCandleSizeLabels();
    
    // Reload chart with new interval
    if (currentPair) {
        console.log('[updateChartInterval] Calling loadChart with:', currentPair.pair);
        loadChart(currentPair);
    } else {
        console.warn('[updateChartInterval] No currentPair, cannot reload');
    }
}

// Update candle size button labels based on current interval
function updateCandleSizeLabels() {
    const sizes = CANDLE_SIZES[chartInterval];
    if (sizes) {
        const smallLabel = document.getElementById('candle-small-label');
        const largeLabel = document.getElementById('candle-large-label');
        if (smallLabel) smallLabel.textContent = sizes.small[1];
        if (largeLabel) largeLabel.textContent = sizes.large[1];
    }
}

// Set candle size (small or large)
function setCandleSize(newSize) {
    if (candleSize === newSize) return;
    
    candleSize = newSize;
    
    // Update active state on buttons
    const group = document.getElementById('candle-size-group');
    if (group) {
        group.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === newSize);
        });
    }
    
    console.log('[setCandleSize] Switched to:', candleSize, '(' + getIntervalSeconds(chartInterval) + 's)');
    
    // Reload chart with current pair
    if (currentPair) {
        loadChart(currentPair);
    }
}

// Set chart type (line or candlestick)
function setChartType(newType) {
    if (chartType === newType) return;
    
    chartType = newType;
    
    // Update active state on buttons
    const group = document.getElementById('chart-type-group');
    if (group) {
        group.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === newType);
        });
    }
    
    console.log('[setChartType] Switched to:', chartType);
    
    // Reload chart with current pair if data exists
    if (currentPair && chartData.labels.length > 0) {
        updateChartData(chartData, currentPair);
    } else if (currentPair) {
        loadChart(currentPair);
    }
}

// Toggle chart scale between logarithmic and linear
function setChartScale(newScale) {
    if (chartScaleType === newScale) return;
    
    chartScaleType = newScale;
    
    // Update active state on buttons
    const group = document.getElementById('scale-toggle-group');
    if (group) {
        group.querySelectorAll('.chart-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === newScale);
        });
    }
    
    // Update chart scale
    if (priceChart && priceChart.options.scales.y) {
        priceChart.options.scales.y.type = chartScaleType;
        
        // Calculate price bounds
        let priceValues = [];
        
        // Handle both line chart (simple values) and candlestick (OHLC objects)
        const data = priceChart.data.datasets[0].data;
        if (chartType === 'candlestick') {
            data.forEach(candle => {
                if (candle && candle.h > 0) priceValues.push(candle.h);
                if (candle && candle.l > 0) priceValues.push(candle.l);
            });
        } else {
            priceValues = data.filter(p => p !== null && p > 0);
        }
        
        if (priceValues.length > 0) {
            const minPrice = Math.min(...priceValues);
            const maxPrice = Math.max(...priceValues);
            
            if (minPrice === maxPrice) {
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

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => {
        initializeChart();
        
        // Initialize candle size labels for default interval
        updateCandleSizeLabels();
        
        // Setup candle size toggle group
        const candleSizeGroup = document.getElementById('candle-size-group');
        if (candleSizeGroup) {
            candleSizeGroup.querySelectorAll('.chart-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => setCandleSize(btn.dataset.value));
            });
        }
        
        // Setup chart type toggle group
        const chartTypeGroup = document.getElementById('chart-type-group');
        if (chartTypeGroup) {
            chartTypeGroup.querySelectorAll('.chart-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => setChartType(btn.dataset.value));
            });
        }
        
        // Setup scale toggle group
        const scaleToggleGroup = document.getElementById('scale-toggle-group');
        if (scaleToggleGroup) {
            scaleToggleGroup.querySelectorAll('.chart-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => setChartScale(btn.dataset.value));
            });
        }
    }, 100);
});
