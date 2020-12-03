'use strict'

const TTL = require('./services/config.json').TTL
const ClimaCell = require('./services/climacell-service')
const OpenWeather = require('./services/openweather-service')
const CacheManager = require('../../models/mongo/mongo-weather')
const HttpStatus = require('http-status-codes');

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
        await clearCache()
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
    let cache = await getCacheLive()
    if (cache) return cache.toObject()

    return selectedService.requestLiveWeather()
        .then(data => data.save())
        .then(data => data.toObject())
}

/**
 * Gets the weather forecast using the selectedService
 * Config in ./services/config.json
 * Returned Object is dependant on currently the selected service
 *
 * @returns {Promise<Object>}
 */
async function getFutureWeather() {
    let cache = await getCacheFuture()
    if (cache) return cache.toObject()

    return selectedService.requestFutureWeather()
        .then(data => data.save())
        .then(data => data.toObject())
}


async function getCacheLive() {
    try {
        return await CacheManager.WeatherLive.findOne(
            {time: {$gt: new Date(Date.now() - TTL * 1000)}}
        )
    } catch (e) {
        console.log(e)
        return null
    }
}

async function getCacheFuture() {
    try {
        return await CacheManager.WeatherForecast.findOne(
            {time: {$gt: new Date(Date.now() - TTL * 1000)}}
        )
    } catch (e) {
        console.log(e)
        return null
    }
}

function clearCache() {
    return Promise.all([
        CacheManager.WeatherLive.deleteMany({}),
        CacheManager.WeatherForecast.deleteMany({})
    ]).catch(e => console.log(e))
}

/**
 * Wrapper to call a function through http requests
 *
 * @param foo: function with no parameters
 * @returns {function( req, res ): Promise<any|undefined>}
 */
const convertToHttp = foo => {
    return async (req, res) => {
        try {
            const data = await foo()
            return res.status(HttpStatus.OK).send(data)
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: "Error when requesting weather data!"
            });
        }
    }
}
module.exports = {
    Services,
    setService,
    getLiveWeather: convertToHttp(getLiveWeather),
    getFutureWeather: convertToHttp(getFutureWeather),
}
