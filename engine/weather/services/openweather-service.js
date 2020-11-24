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

    let formattedData

    if ('hourly' in data) {
        formattedData = []
        for (const item of data.hourly) {
            let tmp = new WeatherSnapshot({
                time: new Date(item.dt),
                latitude: data.lat,
                longitude: data.lon,
                temperature: item.temp,
                pressure: item.pressure,
                humidity: item.humidity,
                conditions: item.weather[0].main,
                precipitationType: undefined,
                precipitationValue: undefined,
                windDirection: item.wind_deg,
                windSpeed: item.wind_speed
            })
            formattedData.push(tmp)
        }
    } else {
        formattedData = new WeatherSnapshot({
            time: new Date(data.dt * 1000),
            latitude: data.coord.lat,
            longitude: data.coord.lon,
            temperature: data.main.temp,
            pressure: data.main.pressure,
            humidity: data.main.humidity,
            conditions: data.weather[0].main,
            precipitationType: undefined,
            precipitationValue: undefined,
            windDirection: data.wind.deg,
            windSpeed: data.wind.speed
        })
    }

    return formattedData
}

module.exports = {requestLiveWeather, requestFutureWeather, formatData}
