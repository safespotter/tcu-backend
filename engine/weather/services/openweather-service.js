'use strict'

/**
 *  Service module that requests data from OpenWeather
 *  Docs at https://openweathermap.org/api
 */

const https = require('https')

const auth = require('./auth.json')
const config = require('./config.json')

const WeatherModels = require('../../../models/mongo/mongo-weather')

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
 * @returns {Promise<WeatherLive>}
 */
function requestLiveWeather() {
    return new Promise(resolve => {
        const RESOURCE_URL = `${BASE_URL}/weather?id=${CITY_ID}&units=metric&appid=${API_KEY}`
        console.log(`get: ${RESOURCE_URL}`)
        https.get(
            RESOURCE_URL,
            res => resolve(res)
        )
    }).then(solveJsonResponse)
        .then(data => formatData(data))
}

/**
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour for 48 hours.
 * Returns a Promise of a https.IncomingMessage of this Object: https://openweathermap.org/api/one-call-api#parameter
 *
 * @returns {Promise<WeatherForecast>}
 */
function requestFutureWeather() {
    return new Promise(resolve => {
        const RESOURCE_URL = `${BASE_URL}/onecall?lat=${COORDS.latitude}&lon=${COORDS.longitude}&exclude=${excludeFuture}&units=metric&appid=${API_KEY}`
        console.log(`get: ${RESOURCE_URL}`)
        https.get(
            RESOURCE_URL,
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

function formatData( data ) {

    let solveConditions = id => {
        if (id >= 700 && id <= 799)
            return WeatherModels.WeatherConditions.FOG

        // noinspection EqualityComparisonWithCoercionJS
        if (id == 800)
            return WeatherModels.WeatherConditions.CLEAR

        if (id >= 803 && id <= 899)
            return WeatherModels.WeatherConditions.CLOUDS

        if (id >= 801 && id <= 802)
            return WeatherModels.WeatherConditions.LIGHT_CLOUDS

        if (id >= 200 && id <= 299)
            return WeatherModels.WeatherConditions.THUNDERSTORM

        // noinspection EqualityComparisonWithCoercionJS
        if (id >= 600 && id <= 699 || id == 511)
            return WeatherModels.WeatherConditions.SNOW

        if (id >= 300 && id <= 399)
            return WeatherModels.WeatherConditions.DRIZZLE

        if (id >= 500 && id <= 501 )
            return WeatherModels.WeatherConditions.LIGHT_RAIN

        if (id >= 503 && id <= 504 || id >= 520 && id <= 599)
            return WeatherModels.WeatherConditions.RAIN
    }

    let formattedData

    if ('hourly' in data) {
        formattedData = new WeatherModels.WeatherForecast()
        for (const item of data.hourly) {
            let precip = {type: null, value: 0}
            if ('rain' in item) {
                precip = {type: 'rain', value: item.rain['1h']}
            } else if ('snow' in item) {
                precip = {type: 'snow', value: item.snow['1h']}
            }

            let wind = {direction: item.wind_deg, speed: item.wind_speed}

            let tmp = {
                time: new Date(item.dt),
                coordinates: {
                    lat: data.lat,
                    lon: data.lon,
                },
                temp: item.temp,
                pressure: item.pressure,
                humidity: item.humidity,
                conditions: solveConditions(item.weather[0].id),
                precipProbability: item.pop,
                wind: wind,
                precipitation: precip
            }

            formattedData.data.push(tmp)
        }
    } else {
        let precip = {type: null, value: 0}
        if ('rain' in data) {
            precip = {type: 'rain', value: data.rain['1h']}
        } else if ('snow' in data) {
            precip = {type: 'snow', value: data.snow['1h']}
        }

        let wind = {direction: 0, speed: 0}
        if ('wind' in data) {
            wind = {direction: data.wind.deg, speed: data.wind.speed}
        }

        formattedData = new WeatherModels.WeatherLive({
            time: new Date(data.dt * 1000),
            coordinates: {
                lat: data.coord.lat,
                lon: data.coord.lon,
            },
            temp: data.main.temp,
            pressure: data.main.pressure,
            humidity: data.main.humidity,
            conditions: solveConditions(data.weather[0].id),
            wind: wind,
            precipitation: precip,
            precipProbability: null
        })
    }

    return formattedData
}

module.exports = {requestLiveWeather, requestFutureWeather}

//// Quick tests
// requestLiveWeather().then(console.log).catch(console.error)
// requestFutureWeather().then(console.log).catch(console.error)
