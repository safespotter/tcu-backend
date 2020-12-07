'use strict'

const ClimaCell = require('./services/climacell-service')
const OpenWeather = require('./services/openweather-service')
const {WeatherLive, WeatherForecast} = require('../../models/mongo/mongo-weather')

/**
 * Dictionary of available Services
 */
const Services = {
    OPEN_WEATHER: OpenWeather,
    CLIMA_CELL: ClimaCell,
}

let selectedService = Services.OPEN_WEATHER

/**
 * Sets the service to be used to handle the requests
 * Available services are members of this module's Services
 * Returned Object is dependant on currently the selected service
 *
 * @param service
 */
async function setService(service) {
    if (Object.values(Services).includes(service)) {
        selectedService = service
    } else {
        throw new Error("Invalid weather service!")
    }
}

/**
 * Gets the current weather using the selectedService
 * Config in ./services/config.json
 *
 * @returns {Promise<Object>}
 */
async function getLiveWeather() {
    let data = null
    let cache = await getCacheLive()

    if (cache && cache.time > Date.now() - selectedService.TTL.live * 1000) { // cache is valid
        data = cache
    } else { // cache is old or missing
        try {
            data = await selectedService.requestLiveWeather()
            data = await data.save()
            // no await to not block the execution
            clearCacheLive().then()
        } catch (e) {
            console.error("Error when requesting weather data!")
            console.error(e)
            data = cache // return the old cache since it's the only data we have
        }
    }
    return data.toObject()
}

/**
 * Gets the weather forecast using the selectedService
 * Config in ./services/config.json
 * Returned Object is dependant on currently the selected service
 *
 * @returns {Promise<Object>}
 */
async function getFutureWeather() {
    let data = null
    let cache = await getCacheFuture()

    if (cache && cache.time > Date.now() - selectedService.TTL.forecast * 1000) { // cache is valid
        data = cache
    } else { // cache is old or missing
        try {
            data = await selectedService.requestFutureWeather()
            data = await data.save()
            // no await to not block the execution
            clearCacheFuture().then()
        } catch (e) {
            console.error("Error when requesting weather data!")
            console.error(e)
            data = cache // return the old cache since it's the only data we have
        }
    }
    return data.toObject()
}


async function getCacheLive() {
    try {
        return await WeatherLive.findOne({service: selectedService.service}).sort({time: -1})
    } catch (e) {
        console.log(e)
        return null
    }
}

async function getCacheFuture() {
    try {
        return await WeatherForecast.findOne({service: selectedService.service}).sort({time: -1})
    } catch (e) {
        console.log(e)
        return null
    }
}

async function clearCacheLive() {
    try {
        await WeatherLive.deleteMany({
            time: {$lt: Date.now() - selectedService.TTL.live * 1000},
            service: selectedService.service
        })
    } catch (e) {
        console.error("Error when clearing cache of weather live:")
        console.error(e)
    }
}
async function clearCacheFuture() {
    try {
        await WeatherForecast.deleteMany({
            time: {$lt: Date.now() - selectedService.TTL.forecast * 1000},
            service: selectedService.service
        })
    } catch (e) {
        console.error("Error when clearing cache of weather forecast:")
        console.error(e)
    }
}

module.exports = {
    Services,
    setService,
    getLiveWeather,
    getFutureWeather,
}
