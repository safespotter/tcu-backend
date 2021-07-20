'use strict'

/**
 *  Service module that requests data from ClimaCell
 *  Docs at https://developer.climacell.co/v3/reference
 */


const https = require('https')
const env = process.env.NODE_ENV || 'development';
const auth = require('./../../../config/config')[env];
const config = require('./config.json')

const WeatherModels = require('../../../models/mongo/mongo-weather')

const COORDS = config.coordinates;
const OPTIONS = {
    host: "api.climacell.co",
    headers: {
        "apikey": auth.ClimaCell.key,
        "content-type": "application/json"
    }
}

// create a string with the fields for liveWeather to be queried set in config.js
let fieldsLive = ""
for (const [field, value] of Object.entries(config.ClimaCell.Fields)) {
    if (value && field !== "precipitation_probability") {
        fieldsLive += field + "%2C"
    }
}
fieldsLive = fieldsLive.slice(0, -3) //remove trailing '%2C'

// create a string with the fields for futureWeather to be queried set in config.js
let fieldsFuture = ""
for (const [field, value] of Object.entries(config.ClimaCell.Fields)) {
    if (value) {
        fieldsFuture += field + "%2C"
    }
}
fieldsFuture = fieldsFuture.slice(0, -3) //remove trailing '%2C'

/**
 * Gets the current weather for the city of Monserrato.
 * Returns a Promise of a https.IncomingMessage.
 * Example: https://docs.developer.climacell.co/reference#get-realtime
 *
 * @returns {Promise<WeatherLive>}
 */
function requestLiveWeather() {
    let path = `/v3/weather/realtime?lat=${COORDS.latitude}&lon=${COORDS.longitude}&fields=${fieldsLive}&unit_system=si`
    console.log("get: " + new URL(path, "https://" + OPTIONS.host))
    return new Promise(resolve => {
        https.get(
            {
                ...OPTIONS,
                path: path
            },
            res => resolve(res)
        )
    }).then(solveJsonResponse)
        .then(data => formatData(data))
}

/**
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour for 108 hours.
 * Returns a Promise of a https.IncomingMessage.
 * Example: https://developer.climacell.co/v3/reference#get-hourly
 *
 * @returns {Promise<WeatherForecast>}
 */
function requestFutureWeather() {
    let path = `/v3/weather/forecast/hourly?lat=${COORDS.latitude}&lon=${COORDS.longitude}&fields=${fieldsFuture}&start_time=now&unit_system=si`
    console.log("get: " + new URL(path, "https://" + OPTIONS.host))
    return new Promise(resolve => {
        https.get(
            {
                ...OPTIONS,
                path: path
            },
            res => resolve(res)
        )
    }).then(solveJsonResponse)
        .then(data => formatData(data))
}

/**
 * Transforms an http response with JSON content into a JS Object
 *
 * @param res: http.IncomingMessage
 * @returns {Promise<Object>}
 */
const solveJsonResponse = res => {
    return new Promise((resolve, reject) => {
        let rawData = ''
        res.on('data', (chunk) => {
            rawData += chunk
        })
        res.on('end', () => {
            if (res.statusCode > 299) {
                reject(JSON.parse(rawData))
            } else {
                resolve(JSON.parse(rawData))
            }
        })
    })
}

function formatData(data) {

    let solveConditions = str => {
        switch (str) {
            case 'freezing_rain_heavy':
            case 'freezing_rain':
            case 'rain_heavy':
            case 'rain':
                return WeatherModels.WeatherConditions.RAIN
            case 'freezing_rain_light':
            case 'rain_light':
                return WeatherModels.WeatherConditions.LIGHT_RAIN
            case 'freezing_drizzle':
            case 'drizzle':
                return WeatherModels.WeatherConditions.DRIZZLE
            case 'ice_pellets_heavy':
            case 'ice_pellets':
            case 'ice_pellets_light':
            case 'snow_heavy':
            case 'snow':
            case 'snow_light':
                return WeatherModels.WeatherConditions.SNOW
            case 'tstorm':
                return WeatherModels.WeatherConditions.THUNDERSTORM
            case 'flurries':
            case 'fog':
            case 'fog_light':
                return WeatherModels.WeatherConditions.FOG
            case 'cloudy':
            case 'mostly_cloudy':
                return WeatherModels.WeatherConditions.CLOUDS
            case 'partly_cloudy':
            case 'mostly_clear':
                return WeatherModels.WeatherConditions.LIGHT_CLOUDS
            case 'clear':
                return WeatherModels.WeatherConditions.CLEAR
        }
    }

    let formatter = dat => {

        return {
            service: config.ClimaCell.service,
            time: new Date(dat.observation_time.value),
            coordinates: {
                lat: dat.lat,
                lon: dat.lon
            },
            temp: dat.temp.value,
            pressure: dat.baro_pressure.value,
            humidity: dat.humidity.value,
            conditions: solveConditions(dat.weather_code.value),
            precipitation: {
                type: dat.precipitation_type.value !== 'none' ? dat.precipitation_type.value : null,
                value: dat.precipitation.value,
            },
            wind: {
                direction: dat.wind_direction.value,
                speed: dat.wind_speed.value,
            },
            precipProbability: ('precipitation_probability' in dat) ? dat.precipitation_probability.value : null,
            sunrise: new Date(dat.sunrise.value),
            sunset: new Date(dat.sunset.value),
        }
    }

    let formattedData
    if (data instanceof Array) {
        formattedData = new WeatherModels.WeatherForecast({service: config.ClimaCell.service})
        for (const item of data) {
            formattedData.data.push(formatter(item))
        }
    } else {
        formattedData = new WeatherModels.WeatherLive(formatter(data))
    }

    return formattedData
}

module.exports = {
    requestLiveWeather,
    requestFutureWeather,
    TTL: config.ClimaCell.TTL,
    service: config.ClimaCell.service,
}

/* Quick tests */
// requestLiveWeather().then(console.log).catch(console.error)
// requestFutureWeather().then(console.log).catch(console.error)
