class GHICalculator {
    // Dew point ranges and their corresponding comfort levels and colors
    static COMFORT_RANGES = [
        { max: 10, label: 'None', color: '#5ECBFC' },
        { max: 15, label: 'Very low', color: '#62FF3B' },
        { max: 18, label: 'Low', color: '#CBFF73' },
        { max: 20, label: 'Moderate', color: '#FFFF9E' },
        { max: 24, label: 'High', color: '#FFD239' },
        { max: 26, label: 'Very high', color: '#FF981E' },
        { max: Infinity, label: 'Extreme', color: '#FF6610' }
    ];

    /**
     * Calculate the Global Humidity Index (GHI) based on dew point.
     * @param {number} dewPoint - Dew point temperature in Celsius
     * @returns {Object} Contains normalized GHI value (0-100), comfort level label, and color code
     */
    static calculateGHI(dewPoint) {
        // Normalize dew point to 0-100 scale
        const normalizedGHI = Math.ceil((dewPoint / 38) * 100);
        const ghi = Math.max(0, Math.min(100, normalizedGHI));  // Ensure it's between 0-100

        // Determine comfort level and color based on dew point
        const comfortInfo = GHICalculator.COMFORT_RANGES.find(range => dewPoint <= range.max);

        return {
            ghi,
            comfort_level: comfortInfo.label,
            color: comfortInfo.color
        };
    }
} 