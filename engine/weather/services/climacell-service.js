'use strict'

/**
 *  Service module that requests data from ClimaCell
 *  Docs at https://developer.climacell.co/v3/reference
 */


const https = require('https')

const auth = require('./auth.json')
const config = require('./config.json')

const WeatherSnapshot = require('../WeatherSnapshot')

const COORDS = config.coordinates
const OPTIONS = {
    host: "api.climacell.co",
    headers: {
        "apikey": auth.ClimaCell.key,
        "content-type": "application/json"
    }
}

// create a string with the fields for liveWeather to be queried set in config.js
let fieldsLive = ""
for ( const [field, value] of Object.entries(config.ClimaCell.Fields)) {
    if (value && field !== "precipitation_probability") { fieldsLive += field + "%2C" }
}
fieldsLive = fieldsLive.slice(0, -3) //remove trailing '%2C'

// create a string with the fields for futureWeather to be queried set in config.js
let fieldsFuture = ""
for ( const [field, value] of Object.entries(config.ClimaCell.Fields)) {
    if (value) { fieldsFuture += field + "%2C" }
}
fieldsFuture = fieldsFuture.slice(0, -3) //remove trailing '%2C'

/**
 * Gets the current weather for the city of Monserrato.
 * Returns a Promise of a https.IncomingMessage.
 * Example: https://docs.developer.climacell.co/reference#get-realtime
 *
 * @returns {Promise<https.IncomingMessage>}
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
    })
}

/**
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour for 108 hours.
 * Returns a Promise of a https.IncomingMessage.
 * Example: https://developer.climacell.co/v3/reference#get-hourly
 *
 * @returns {Promise<https.IncomingMessage>}
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
    })
}

function formatData( data ) {

    let solveConditions = str => {
        switch (str) {
            case 'freezing_rain_heavy':
            case 'freezing_rain':
            case 'rain_heavy':
            case 'rain':
                return WeatherSnapshot.WeatherType.RAIN
            case 'freezing_rain_light':
            case 'rain_light':
                return WeatherSnapshot.WeatherType.LIGHT_RAIN
            case 'freezing_drizzle':
            case 'drizzle':
                return WeatherSnapshot.WeatherType.DRIZZLE
            case 'ice_pellets_heavy':
            case 'ice_pellets':
            case 'ice_pellets_light':
            case 'snow_heavy':
            case 'snow':
            case 'snow_light':
                return WeatherSnapshot.WeatherType.SNOW
            case 'tstorm':
                return WeatherSnapshot.WeatherType.THUNDERSTORM
            case 'flurries':
            case 'fog':
            case 'fog_light':
                return WeatherSnapshot.WeatherType.FOG
            case 'cloudy':
            case 'mostly_cloudy':
                return WeatherSnapshot.WeatherType.CLOUDS
            case 'partly_cloudy':
            case 'mostly_clear':
                return WeatherSnapshot.WeatherType.LIGHT_CLOUDS
            case 'clear':
                return WeatherSnapshot.WeatherType.CLEAR
        }
    }

    let formatter = dat => {

        return new WeatherSnapshot({
            time: new Date(dat.observation_time.value),
            latitude: dat.lat,
            longitude: dat.lon,
            temperature: dat.temp.value,
            pressure: dat.baro_pressure.value,
            humidity: dat.humidity.value,
            conditions: solveConditions(dat.weather_code.value),
            precipitationType: dat.precipitation_type.value !== 'none' ? dat.precipitation_type.value : null,
            precipitationValue: dat.precipitation.value,
            windDirection: dat.wind_direction.value,
            windSpeed: dat.wind_speed.value,
            precipitationProbability: 'precipitation_probability' in dat ? dat.precipitation_probability.value : null
        })
    }

    let formattedData
    if (data instanceof Array) {
        formattedData = []
        for (const item of data) {
            formattedData.push(formatter(item))
        }
    } else {
        formattedData = formatter(data)
    }

    return formattedData
}

module.exports = {requestLiveWeather, requestFutureWeather, formatData}
