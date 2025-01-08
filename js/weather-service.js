class WeatherService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall';
        this.geoUrl = 'https://api.openweathermap.org/geo/1.0';
    }

    /**
     * Get coordinates for a city using the geocoding API.
     * @param {string} cityName - Name of the city
     * @param {string} countryCode - Two-letter country code
     * @returns {Promise<Object>} Coordinates object with lat and lon
     */
    async getCoordinates(cityName, countryCode) {
        // Special handling for multi-word cities
        if (cityName.toLowerCase() === "hong kong") {
            return {
                lat: 22.3193,
                lon: 114.1694
            };
        }

        if (cityName.includes(",")) {
            cityName = cityName.split(",")[0].trim();
        }

        const url = `${this.geoUrl}/direct?q=${encodeURIComponent(cityName)},${countryCode}&limit=1&appid=${this.apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error(`City not found: ${cityName}, ${countryCode}`);
        }

        return {
            lat: data[0].lat,
            lon: data[0].lon
        };
    }

    /**
     * Get timezone for coordinates.
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<string>} Timezone string
     */
    async getCityTimezone(lat, lon) {
        const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        const offset = data.timezone || 0;  // UTC offset in seconds
        const hours = Math.floor(offset / 3600);
        
        if (hours >= 0) {
            return `Etc/GMT-${hours}`;
        } else {
            return `Etc/GMT+${Math.abs(hours)}`;
        }
    }

    /**
     * Get weather data for a city.
     * @param {string} cityName - City name with country code (e.g., "London,GB")
     * @param {string} timeOption - One of 'now', 'today_noon', 'yesterday_noon'
     * @returns {Promise<Object>} Weather data including temperature, dew point, etc.
     */
    async getWeatherData(cityName, timeOption = 'now') {
        const [city, country] = cityName.split(',').map(part => part.trim());
        const coords = await this.getCoordinates(city, country);
        const timezone = await this.getCityTimezone(coords.lat, coords.lon);

        const url = `${this.oneCallUrl}?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        // Process the weather data based on time option
        const weatherData = this.processWeatherData(data, timeOption, timezone);
        weatherData.city = city;
        weatherData.country = country;

        return weatherData;
    }

    /**
     * Process raw weather data into required format.
     * @private
     */
    processWeatherData(data, timeOption, timezone) {
        const current = data.current;
        const temp = current.temp;
        const dewPoint = current.dew_point;
        const humidity = current.humidity;

        const localTime = new Date(current.dt * 1000).toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit'
        });

        return {
            temperature: temp,
            dew_point: dewPoint,
            humidity: humidity,
            local_time: localTime
        };
    }

    /**
     * Get list of available cities.
     * @returns {Array<Object>} List of city objects with name and country
     */
    getCityList() {
        // Popular cities first
        const popularCities = [
            { id: 1, name: 'London', country: 'GB', display_name: 'London, GB', popular: true },
            { id: 2, name: 'New York', country: 'US', display_name: 'New York, US', popular: true },
            { id: 3, name: 'Tokyo', country: 'JP', display_name: 'Tokyo, JP', popular: true },
            { id: 4, name: 'Singapore', country: 'SG', display_name: 'Singapore, SG', popular: true },
            { id: 5, name: 'Dubai', country: 'AE', display_name: 'Dubai, AE', popular: true },
            { id: 6, name: 'Hong Kong', country: 'HK', display_name: 'Hong Kong, HK', popular: true },
            { id: 7, name: 'Mumbai', country: 'IN', display_name: 'Mumbai, IN', popular: true },
            { id: 8, name: 'Sydney', country: 'AU', display_name: 'Sydney, AU', popular: true },
            { id: 9, name: 'Istanbul', country: 'TR', display_name: 'Istanbul, TR', popular: true },
            { id: 10, name: 'Konya', country: 'TR', display_name: 'Konya, TR', popular: true },
            { id: 11, name: 'Paris', country: 'FR', display_name: 'Paris, FR', popular: true },
            { id: 12, name: 'Le Havre', country: 'FR', display_name: 'Le Havre, FR', popular: true },
            { id: 13, name: 'Riyadh', country: 'SA', display_name: 'Riyadh, SA', popular: true },
            { id: 14, name: 'Munich', country: 'DE', display_name: 'Munich, DE', popular: true },
            { id: 15, name: 'Kuching', country: 'MY', display_name: 'Kuching, MY', popular: true }
        ];

        return popularCities;
    }

    /**
     * Get available time options for a city.
     * @param {string} cityName - City name with country code
     * @returns {Promise<Array>} List of available time options
     */
    async getTimeOptions(cityName) {
        const [city, country] = cityName.split(',').map(part => part.trim());
        const coords = await this.getCoordinates(city, country);
        const timezone = await this.getCityTimezone(coords.lat, coords.lon);

        const now = new Date();
        const cityTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const noonToday = new Date(cityTime);
        noonToday.setHours(12, 0, 0, 0);

        return [
            {
                id: 'now',
                name: 'Current Time',
                enabled: true
            },
            {
                id: 'yesterday_noon',
                name: 'Yesterday at Noon',
                enabled: true
            },
            {
                id: 'today_noon',
                name: 'Today at Noon',
                enabled: cityTime > noonToday
            }
        ];
    }
} 