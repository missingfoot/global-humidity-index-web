// Register the datalabels plugin
Chart.register(ChartDataLabels);

// Initialize weather service with API key
const weatherService = new WeatherService('8521ca53770dacbc31cfb8560960f236');
let currentTimeOption = 'now';
let cityOptions = [];
let charts = {
    ghi: null,
    temp: null,
    dew: null,
    humidity: null
};
let cityData = {
    city1: null,
    city2: null
};

// Cache constants
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEYS = {
    defaultCity: 'defaultCity',
    citySelections: 'citySelections',
    weatherData: 'weatherData'
};

function formatCity(city) {
    if (!city.id) return city.text;
    
    const countryCode = city.country?.toLowerCase();
    return $(`
        <div class="city-option">
            <span class="flag-icon flag-icon-${countryCode}"></span>
            <span class="city-name">${city.name}</span>
            <span class="country-name">${city.country}</span>
        </div>
    `);
}

async function updateTimeOptions(cityName) {
    const timeOptionsContainer = document.getElementById('time-options');
    const options = await weatherService.getTimeOptions(cityName);
    
    // If we have two cities selected, make sure noon option is only enabled if available for both
    const city1 = document.getElementById('city1').value;
    const city2 = document.getElementById('city2').value;
    
    if (city1 && city2) {
        const todayNoonOption = options.find(opt => opt.id === 'today_noon');
        if (todayNoonOption) {
            todayNoonOption.enabled = todayNoonOption.enabled && 
                cityData.city1?.local_time && 
                cityData.city2?.local_time;
        }
    }
    
    timeOptionsContainer.innerHTML = options
        .filter(option => option.enabled)
        .map(option => `
            <div class="time-option${option.id === currentTimeOption ? ' active' : ''}" 
                 data-value="${option.id}">
                ${option.name}
            </div>
        `).join('');
    
    // If current option is disabled, switch to 'now'
    const currentOptionEnabled = options.find(opt => opt.id === currentTimeOption)?.enabled;
    if (!currentOptionEnabled) {
        currentTimeOption = 'now';
        document.querySelector('.time-option[data-value="now"]')?.classList.add('active');
    }
    
    // Reattach click handlers
    document.querySelectorAll('.time-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            currentTimeOption = this.dataset.value;
            updateBothCities();
        });
    });
}

function updateBothCities() {
    updateCity(1);
    updateCity(2);
}

async function updateCity(cityNum) {
    const citySelect = document.getElementById(`city${cityNum}`);
    const resultDiv = document.getElementById(`result${cityNum}`);
    const loadingDiv = document.getElementById(`loading${cityNum}`);
    
    if (!citySelect.value) {
        resultDiv.innerHTML = '';
        return;
    }
    
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        const weatherData = await weatherService.getWeatherData(citySelect.value, currentTimeOption);
        const ghiData = GHICalculator.calculateGHI(weatherData.dew_point);
        
        // Combine weather and GHI data
        const data = {
            ...weatherData,
            ...ghiData
        };
        
        displayWeatherData(data, resultDiv);
        cityData[`city${cityNum}`] = data;
        updateCharts();
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message || 'Failed to load weather data. Please try again.'}
            </div>
        `;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function displayWeatherData(data, resultDiv) {
    resultDiv.innerHTML = `
        <h4>${data.city}, ${data.country}</h4>
        <div class="metric">
            <span class="metric-label">Local Time</span>
            <span class="metric-value">${data.local_time}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Temperature</span>
            <span class="metric-value">${data.temperature.toFixed(1)}°C</span>
        </div>
        <div class="metric">
            <span class="metric-label">Dew Point</span>
            <span class="metric-value">${data.dew_point.toFixed(1)}°C</span>
        </div>
        <div class="metric">
            <span class="metric-label">Relative Humidity</span>
            <span class="metric-value">${data.humidity.toFixed(1)}%</span>
        </div>
        <div class="metric">
            <span class="metric-label">GHI Value</span>
            <span class="metric-value">${Math.round(data.ghi)}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Comfort Level</span>
            <span class="metric-value">${data.comfort_level}</span>
        </div>
    `;
    resultDiv.style.backgroundColor = data.color;
    resultDiv.style.display = 'block';
}

function getChartColors(isDark = document.documentElement.getAttribute('data-theme') === 'dark') {
    return {
        dewPoint: isDark ? 'rgba(0, 149, 255, 0.85)' : 'rgba(54, 162, 235, 0.7)',
        dewPointBorder: isDark ? 'rgba(0, 149, 255, 1)' : 'rgba(54, 162, 235, 1)',
        humidity: isDark ? 'rgba(0, 200, 83, 0.85)' : 'rgba(75, 192, 192, 0.7)',
        humidityBorder: isDark ? 'rgba(0, 200, 83, 1)' : 'rgba(75, 192, 192, 1)'
    };
}

function updateCharts() {
    const chartsContainer = document.getElementById('charts-container');
    
    if (!cityData.city1 || !cityData.city2) {
        chartsContainer.style.display = 'none';
        return;
    }
    
    chartsContainer.style.display = 'block';
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colors = getChartColors(isDark);

    const chartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true
            },
            datalabels: {
                anchor: 'end',
                align: 'right',
                offset: 4,
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    display: false,
                    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                }
            }
        },
        layout: {
            padding: {
                right: 50
            }
        }
    };

    // Create charts
    createGHIChart(chartOptions);
    createTemperatureChart(chartOptions);
    createDewPointChart(chartOptions, colors);
    createHumidityChart(chartOptions, colors);
}

function createGHIChart(chartOptions) {
    const ctxGhi = document.getElementById('ghiChart').getContext('2d');
    charts.ghi = new Chart(ctxGhi, {
        type: 'bar',
        data: {
            labels: [cityData.city1.city, cityData.city2.city],
            datasets: [{
                data: [cityData.city1.ghi, cityData.city2.ghi],
                backgroundColor: [
                    cityData.city1.color,
                    cityData.city2.color
                ],
                borderColor: [
                    cityData.city1.color,
                    cityData.city2.color
                ],
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    ...chartOptions.scales.x,
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    ...chartOptions.plugins.datalabels,
                    formatter: value => Math.round(value)
                }
            }
        }
    });
}

function createTemperatureChart(chartOptions) {
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    charts.temp = new Chart(ctxTemp, {
        type: 'bar',
        data: {
            labels: [cityData.city1.city, cityData.city2.city],
            datasets: [{
                data: [cityData.city1.temperature, cityData.city2.temperature],
                backgroundColor: [
                    cityData.city1.color,
                    cityData.city2.color
                ],
                borderColor: [
                    cityData.city1.color,
                    cityData.city2.color
                ],
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    ...chartOptions.scales.x,
                    min: -20,
                    max: 60,
                    ticks: {
                        callback: value => value + '°C'
                    }
                }
            },
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    ...chartOptions.plugins.datalabels,
                    formatter: value => value.toFixed(1) + '°C'
                }
            }
        }
    });
}

function createDewPointChart(chartOptions, colors) {
    const ctxDew = document.getElementById('dewChart').getContext('2d');
    charts.dew = new Chart(ctxDew, {
        type: 'bar',
        data: {
            labels: [cityData.city1.city, cityData.city2.city],
            datasets: [{
                data: [cityData.city1.dew_point, cityData.city2.dew_point],
                backgroundColor: colors.dewPoint,
                borderColor: colors.dewPointBorder,
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    ...chartOptions.scales.x,
                    min: -20,
                    max: 60,
                    ticks: {
                        callback: value => value + '°C'
                    }
                }
            },
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    ...chartOptions.plugins.datalabels,
                    formatter: value => value.toFixed(1) + '°C'
                }
            }
        }
    });
}

function createHumidityChart(chartOptions, colors) {
    const ctxHumidity = document.getElementById('humidityChart').getContext('2d');
    charts.humidity = new Chart(ctxHumidity, {
        type: 'bar',
        data: {
            labels: [cityData.city1.city, cityData.city2.city],
            datasets: [{
                data: [cityData.city1.humidity, cityData.city2.humidity],
                backgroundColor: colors.humidity,
                borderColor: colors.humidityBorder,
                borderWidth: 1
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    ...chartOptions.scales.x,
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            },
            plugins: {
                ...chartOptions.plugins,
                datalabels: {
                    ...chartOptions.plugins.datalabels,
                    formatter: value => value.toFixed(1) + '%'
                }
            }
        }
    });
}

function toggleTheme() {
    const html = document.documentElement;
    const themeSwitch = document.querySelector('.theme-switch');
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    
    // Update theme switch button
    const icon = themeSwitch.querySelector('.theme-switch-icon');
    const text = themeSwitch.querySelector('.theme-switch-text');
    
    if (newTheme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light Mode';
    } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark Mode';
    }

    // Store theme preference
    localStorage.setItem('theme', newTheme);

    // Update chart colors if charts exist
    if (charts.ghi) updateCharts();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize select2
    $('.city-select').select2({
        placeholder: 'Search for a city...',
        allowClear: true,
        data: weatherService.getCityList().map(city => ({
            id: `${city.name},${city.country}`,
            text: city.display_name,
            name: city.name,
            country: city.country.toLowerCase()
        })),
        templateResult: formatCity,
        templateSelection: formatCity
    });

    // Add change handlers
    $('.city-select').on('change', async function() {
        const cityNum = this.id.replace('city', '');
        if (this.value) {
            await updateTimeOptions(this.value);
            updateCity(cityNum);
        }
    });

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (savedTheme === 'dark') {
            const themeSwitch = document.querySelector('.theme-switch');
            const icon = themeSwitch.querySelector('.theme-switch-icon');
            const text = themeSwitch.querySelector('.theme-switch-text');
            icon.textContent = '☀️';
            text.textContent = 'Light Mode';
        }
    }

    // Hide loading overlay
    document.getElementById('loading').style.display = 'none';
}); 