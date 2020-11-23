'use strict'

const ClimaCell = require('./services/climacell-service')
const OpenWeather = require('./services/climacell-service')

const Services = {
    OPEN_WEATHER: OpenWeather,
    CLIMA_CELL: ClimaCell,
}

let selectedService = null

function setService( service ) {
    if (Object.values(Services).includes(service)) {
        selectedService = service
    } else {
        throw new Error("Invalid weather service!")
    }
}

//default initialization
setService(Services.OPEN_WEATHER)

function getLiveWeather() {
    return selectedService.requestLiveWeather().then(res => parseResponse(res))
}
function getFutureWeather() {
    return selectedService.requestFutureWeather().then(res => parseResponse(res))
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

module.exports = { Services, setService, getLiveWeather, getFutureWeather }

// quick n dirty manual tests
/*
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

setService(Services.CLIMA_CELL)
getLiveWeather().then(res => console.log(res)).catch(e => console.error(e))
getFutureWeather().then(res => console.log(res)).catch(e => console.error(e))
