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
    if (cache) return cache

    return selectedService.requestLiveWeather()
        .then(data => data.save())
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
    if (cache) return cache

    return selectedService.requestFutureWeather()
        .then(data => data.save())
}


async function getCacheLive() {
    try {
        return  await CacheManager.WeatherLive.findOne(
            {time: {$gt: new Date(Date.now() - TTL * 1000)}}
        )
    } catch (e) {
        console.log(e)
        return null
    }
}

async function getCacheFuture() {
    try {
        return  CacheManager.WeatherForecast.findOne(
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
            return res.status(HttpStatus.OK).send({data})
        } catch (error) {
            console.log(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: "something went wrong"
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


// quick n dirty manual tests
/*
let testServices = async () => {
    /!** Connection to Mongo **!/
    const mongoose = require('mongoose')
    mongoose.Promise = require('bluebird');
    await mongoose.connect('mongodb://localhost/tcu-backend', {
        useNewUrlParser: true,
        promiseLibrary: require('bluebird'),
        useUnifiedTopology: true,
        useCreateIndex: true,
    })
        .then(() => console.log('Engine connected successfully to the mongo database'))
        .catch((err) => console.error(err));

    await setService(Services.OPEN_WEATHER)
    console.log("Open Weather Api")
    try {
        let [dataLive, dataFuture] = await Promise.all([getLiveWeather(), getFutureWeather()])
        console.log(dataLive)
        console.log(dataFuture)
    } catch (e) {
        console.error(e)
    }

    await setService(Services.CLIMA_CELL)
    console.log("Clima Cell Api")
    try {
        let [dataLive, dataFuture] = await Promise.all([getLiveWeather(), getFutureWeather()])
        console.log(dataLive)
        console.log(dataFuture)
    } catch (e) {
        console.error(e)
    }
}
testServices().then()
*/
/*

let testCache = async (service) => {
    /!** Connection to Mongo **!/
    const mongoose = require('mongoose')
    mongoose.Promise = require('bluebird');
    await mongoose.connect('mongodb://localhost/tcu-backend', {
        useNewUrlParser: true,
        promiseLibrary: require('bluebird'),
        useUnifiedTopology: true,
        useCreateIndex: true,
    })
        .then(() => console.log('Engine connected successfully to the mongo database'))
        .catch((err) => console.error(err));

    await setService(service)

    let a
    console.log("Live:")
    try {
        console.log('1: ')
        a = await getLiveWeather()
        console.log(a._id)
        console.log('2: ')
        a = await getLiveWeather()
        console.log(a._id)
    } catch (e) {
        console.error(e)
    }

    console.log("Future:")
    try {
        console.log('1: ')
        a = await getFutureWeather()
        console.log(a._id)
        console.log('2: ')
        a = await getFutureWeather()
        console.log(a._id)
    } catch (e) {
        console.error(e)
    }
}
testCache(Services.OPEN_WEATHER).then()
*/
