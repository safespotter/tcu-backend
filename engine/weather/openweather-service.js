/**
 *  Service to request data from OpenWeather
 */


'use strict'

const https = require('https')

// TODO: replace personal key with project's key
const API_KEY = "604f273e691bd8b9ca583b504b6dfd86" //nsanso's key
const CITY_ID = "2524084" // city id of Monserrato
const COORDS = {lat: "39.2599", lon: "9.1397"}

/**
 * Gets the current weather for the city of Monserrato.
 * Returns a Promise of this Object: https://openweathermap.org/current#current_JSON
 *
 * @returns {Promise<JSON>}
 */
function getCurrentWeather() {
    const promise = new Promise(resolve => {
        https.get(
            `https://api.openweathermap.org/data/2.5/weather?id=${CITY_ID}&appid=${API_KEY}&units=metric`,
            res => resolve(res)
        )
    })

    return promise.then(res => parseResponse(res))
}


/**
 * REQUIRES PAID SUBSCRIPION.
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour.
 * Returns a Promise of this Object: https://openweathermap.org/api/hourly-forecast#JSON
 *
 * @returns {Promise<JSON>}
 */
/*
function getFutureWeatherPro() {
    const promise = new Promise(resolve => {
        https.get(
            `https://pro.openweathermap.org/data/2.5/forecast/hourly?id=${CITY_ID}&appid=${API_KEY}&units=metric`,
            res => resolve(res)
        )
    })

    return promise.then(res => parseResponse(res))
}
*/

/**
 * Gets the future weather for the city of Monserrato, in intervals of 1 hour.
 * Returns a Promise of this Object: https://openweathermap.org/api/one-call-api#parameter
 *
 * @returns {Promise<JSON>}
 */
function getFutureWeather() {
    const EXCLUDE = "current,minutely,daily,alerts"
    const promise = new Promise(resolve => {
        https.get(
            `https://api.openweathermap.org/data/2.5/onecall?lat=${COORDS.lat}&lon=${COORDS.lon}&exclude=${EXCLUDE}&appid=${API_KEY}`,
            res => resolve(res)
        )
    })

    return promise.then(res => parseResponse(res))
}

function parseResponse(res) {
    return new Promise((resolve, reject) => {
        const {statusCode} = res
        const contentType = res.headers['content-type']

        // Check for errors
        let error

        // if status code != 2xx
        if (statusCode < 200 || statusCode >= 300) {
            error = new Error('Request Failed.\n' +
                `Status Code: ${statusCode}`)
        }
        // or if content type != application/json
        else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' +
                `Expected application/json but received ${contentType}`)
        }
        // clear the response, handle error and return
        if (error) {
            res.resume()
            reject(error)
        }

        // otherwise parse the data
        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk) => {
            rawData += chunk
        })
        res.on('end', () => {
            try {
                const data = JSON.parse(rawData)
                resolve(data)
            } catch (e) {
                reject(e)
            }
        })
    })
}

module.exports = {getCurrentWeather, getFutureWeather}

// to manually test the module uncomment the next lines and run this file
// getCurrentWeather().then(data => console.log(data)).catch(err => console.log(err))
// getFutureWeather().then( data => console.log(data)).catch( err => console.log(err))
