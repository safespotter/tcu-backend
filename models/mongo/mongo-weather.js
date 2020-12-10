const mongoose = require('mongoose');

const WeatherConditions = {
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

const WeatherSnapshot = new mongoose.Schema({
    service: {type: String, required: true, index: true},
    time: {type: Date, index: true, default: Date.now()},
    coordinates: {
        lat: Number,
        lon: Number
    },
    temp: Number,
    pressure: Number,
    humidity: Number,
    conditions: {type: String, lowercase: true, trim: true, enum: Object.values(WeatherConditions)},
    precipitation: {
        type: {type: String},
        value: Number
    },
    precipProbability: {type: Number},
    wind: {
        direction: {type: Number},
        speed: Number
    },
    sunrise: Date,
    sunset: Date,
},{
    strict: false,
    versionKey: false
})

const WeatherLive = mongoose.model('WeatherLive', WeatherSnapshot)

const WeatherForecast = mongoose.model('WeatherForecast', new mongoose.Schema({
    service: {type: String, required: true, index: true},
    time: {type: Date, default: Date.now, index: true},
    data: [WeatherSnapshot]
},{
    versionKey: false
}))

module.exports = {WeatherLive, WeatherForecast, WeatherConditions}
