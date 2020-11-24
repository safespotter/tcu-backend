class WeatherSnapshot {
    constructor(
        {
            time,
            latitude,
            longitude,
            temperature,
            pressure,
            humidity,
            conditions,
            precipitationType,
            precipitationValue,
            windDirection,
            windSpeed
        } = {}
    ) {
        this.time = time
        this.coordinates = {lat: latitude, lon: longitude}
        this.temp = temperature
        this.pressure = pressure
        this.humidity = humidity
        this.conditions = conditions
        this.precipitation = {type: precipitationType, value: precipitationValue}
        this.wind = {direction: windDirection, speed: windSpeed}
    }
}

module.exports = WeatherSnapshot
