'use strict'

/**
 *  Service module that requests data from ClimaCell
 *  Docs at https://developer.climacell.co/v3/reference
 */


const https = require('https')

const auth = require('./auth.json')
const config = require('./config.json')

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
for ( const [field, value] of Object.entries(config.ClimaCell.Fields.Realtime)) {
    if (value) { fieldsLive += field + "%2C" }
}
fieldsLive = fieldsLive.slice(0, -3) //remove trailing '%2C'

// create a string with the fields for futureWeather to be queried set in config.js
let fieldsFuture = ""
for ( const [field, value] of Object.entries(config.ClimaCell.Fields.Hourly)) {
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

module.exports = {requestLiveWeather, requestFutureWeather}
