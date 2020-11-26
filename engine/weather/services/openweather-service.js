'use strict'

/**
 *  Service module that requests data from OpenWeather
 *  Docs at https://openweathermap.org/api
 */

const https = require('https')

const auth = require('./auth.json')
const config = require('./config.json')

const WeatherSnapshot = require('../WeatherSnapshot')

const API_KEY = auth.OpenWeather.key
const BASE_URL = "https://api.openweathermap.org/data/2.5"
const CITY_ID = config.OpenWeather.cityId
const COORDS = config.coordinates

// create a string with the exclusion for futureWeather to be queried set in config.js
let excludeFuture = ""
for ( const [field, value] of Object.entries(config.OpenWeather.FutureData)) {
    if (!value) { excludeFuture += field + "," }
}
excludeFuture = excludeFuture.slice(0, -1) //remove trailing ','

/**
 * Gets the current weather for the city of Monserrato.
 * Returns a Promise of a https.IncomingMessage of this Object: https://openweathermap.org/current#current_JSON
 *
 * @returns {Promise<https.IncomingMessage>}
 */
function requestLiveWeather() {
    return new Promise(resolve => {
        console.log(`get: ${BASE_URL}/weather?id=${CITY_ID}&units=metric&appid=${API_KEY}`)
        https.get(
            `${BASE_URL}/weather?id=${CITY_ID}&units=metric&appid=${API_KEY}`,
            res => resolve(res)
        )
    })
}

/**
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour for 48 hours.
 * Returns a Promise of a https.IncomingMessage of this Object: https://openweathermap.org/api/one-call-api#parameter
 *
 * @returns {Promise<https.IncomingMessage>}
 */
function requestFutureWeather() {
    return new Promise(resolve => {
        console.log(`get: ${BASE_URL}/onecall?lat=${COORDS.latitude}&lon=${COORDS.longitude}&exclude=${excludeFuture}&units=metric&appid=${API_KEY}`)
        https.get(
            `${BASE_URL}/onecall?lat=${COORDS.latitude}&lon=${COORDS.longitude}&exclude=${excludeFuture}&units=metric&appid=${API_KEY}`,
            res => resolve(res)
        )
    })
}

/**
 * @param data: Object
 * @returns {WeatherSnapshot}
 */

function formatData( data ) {

    let solveConditions = id => {
        if (id >= 700 && id <= 799)
            return WeatherSnapshot.WeatherType.FOG

        // noinspection EqualityComparisonWithCoercionJS
        if (id == 800)
            return WeatherSnapshot.WeatherType.CLEAR

        if (id >= 803 && id <= 899)
            return WeatherSnapshot.WeatherType.CLOUDS

        if (id >= 801 && id <= 802)
            return WeatherSnapshot.WeatherType.LIGHT_CLOUDS

        if (id >= 200 && id <= 299)
            return WeatherSnapshot.WeatherType.THUNDERSTORM

        // noinspection EqualityComparisonWithCoercionJS
        if (id >= 600 && id <= 699 || id == 511)
            return WeatherSnapshot.WeatherType.SNOW

        if (id >= 300 && id <= 399)
            return WeatherSnapshot.WeatherType.DRIZZLE

        if (id >= 500 && id <= 501 )
            return WeatherSnapshot.WeatherType.LIGHT_RAIN

        if (id >= 503 && id <= 504 || id >= 520 && id <= 599)
            return WeatherSnapshot.WeatherType.RAIN
    }

    let formattedData

    if ('hourly' in data) {
        formattedData = []
        for (const item of data.hourly) {
            let precipType = null
            let precipValue = 0

            if ('rain' in item) {
                precipType = 'rain'
                precipValue = item.rain['1h']
            } else if ('snow' in item) {
                precipType = 'snow'
                precipValue = item.snow['1h']
            }

            let tmp = new WeatherSnapshot({
                time: new Date(item.dt),
                latitude: data.lat,
                longitude: data.lon,
                temperature: item.temp,
                pressure: item.pressure,
                humidity: item.humidity,
                conditions: solveConditions(item.weather[0].id),
                precipitationProbability: item.pop,
                windDirection: item.wind_deg,
                windSpeed: data.wind.speed,
                precipitationType: precipType,
                precipitationValue: precipValue
            })

            formattedData.push(tmp)
        }
    } else {
        let precipType = null
        let precipValue = 0

        if ('rain' in data) {
            precipType = 'rain'
            precipValue = data.rain['1h']
        } else if ('snow' in data) {
            precipType = 'snow'
            precipValue = data.snow['1h']
        }
        formattedData = new WeatherSnapshot({
            time: new Date(data.dt * 1000),
            latitude: data.coord.lat,
            longitude: data.coord.lon,
            temperature: data.main.temp,
            pressure: data.main.pressure,
            humidity: data.main.humidity,
            conditions: data.weather[0].main,
            windDirection: data.wind.deg,
            windSpeed: data.wind.speed,
            precipitationType: precipType,
            precipitationValue: precipValue,
            precipitationProbability: null
        })
    }

    return formattedData
}

module.exports = {requestLiveWeather, requestFutureWeather, formatData}
