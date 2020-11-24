'use strict'

const ClimaCell = require('./services/climacell-service')
const OpenWeather = require('./services/openweather-service')

/**
 * Dictionary of available Services
 */
const Services = {
    OPEN_WEATHER: OpenWeather,
    CLIMA_CELL: ClimaCell,
}

let selectedService = null

/**
 * Sets the service to be used to handle the requests
 * Available services are members of this module's Services
 * Returned Object is dependant on currently the selected service
 *
 * @param service
 */
function setService( service ) {
    if (Object.values(Services).includes(service)) {
        selectedService = service
    } else {
        throw new Error("Invalid weather service!")
    }
}
//default initialization
setService(Services.OPEN_WEATHER)

/**
 * Gets the current weather using the selectedService
 * Config in ./services/config.json
 *
 * @returns {Promise<Object>}
 */
function getLiveWeather() {
    return selectedService.requestLiveWeather().then(res => parseResponse(res))
}

/**
 * Gets the weather forecast using the selectedService
 * Config in ./services/config.json
 * Returned Object is dependant on currently the selected service
 *
 * @returns {Promise<Object>}
 */
function getFutureWeather() {
    return selectedService.requestFutureWeather().then(res => parseResponse(res))
}


/**
 * Resolves an https message
 * Based on https://nodejs.org/api/http.html#http_http_get_options_callback
 *
 * @param res: https.IncomingMessage
 * @returns {Promise<Object>}
 */
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
    }).then( data => {return data} ) //needed for await to behave correctly
}

module.exports = { Services, setService, getLiveWeather, getFutureWeather }

/*
// quick n dirty manual tests
let foo = async () => {
    setService(Services.OPEN_WEATHER)
    console.log("Open Weather Api")
    try {
        let [dataLive, dataFuture] = await Promise.all([getLiveWeather(), getFutureWeather()])
        console.log(dataLive)
        console.log(dataFuture)
    } catch (e) {
        console.error(e)
    }

    setService(Services.CLIMA_CELL)
    console.log("Clima Cell Api")
    try {
        let [dataLive, dataFuture] = await Promise.all([getLiveWeather(), getFutureWeather()])
        console.log(dataLive)
        console.log(dataFuture)
    } catch (e) {
        console.error(e)
    }
}
foo().then()
*/
