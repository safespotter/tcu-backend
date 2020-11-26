class WeatherSnapshot {
    static WeatherType = {
        CLEAR: 'clear',
        THUNDERSTORM: 'thunders',
        DRIZZLE: 'drizzle',
        LIGHT_RAIN: 'light rain',
        RAIN: 'rain',
        SNOW: 'snow',
        FOG: 'fog',
        LIGHT_CLOUDS: 'light clouds',
        CLOUDS: 'clouds'
    }
    constructor({
            time,
            latitude,
            longitude,
            temperature,
            pressure,
            humidity,
            conditions,
            precipitationType,
            precipitationValue,
            precipitationProbability,
            windDirection,
            windSpeed
        }) {
        this.time = time
        this.coordinates = {lat: latitude, lon: longitude}
        this.temp = temperature
        this.pressure = pressure
        this.humidity = humidity
        this.conditions = conditions
        this.precipitation = {type: precipitationType, value: precipitationValue}
        this.precipProbability = precipitationProbability
        this.wind = {direction: windDirection, speed: windSpeed}

        if (!conditions in Object.values(WeatherSnapshot.WeatherType)) {
            this.conditions = null
            throw new Error("Weather condition has to be one of the supported values in WeatherType!")
        }
    }
}

module.exports = WeatherSnapshot
