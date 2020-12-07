'use strict'

const WeatherService = require("./weather/weather-service")
const TrafficService = require("./traffic/traffic-service")
const HttpStatus = require('http-status-codes')

const convertServiceToRequest = (foo, serviceName) => async (req, res) => {
    try {
        const data = await foo()
        res.status(HttpStatus.OK).send(data)
    } catch (e) {
        console.error(e)
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: `Cannot get ${serviceName} information`
        })
    }
}

module.exports = {
    requestWeatherLive: convertServiceToRequest(WeatherService.getLiveWeather(), 'weather live'),
    requestWeatherForecast: convertServiceToRequest(WeatherService.getFutureWeather(), 'weather forecast'),
    requestTraffic: convertServiceToRequest(TrafficService.getTraffic(), 'traffic'),
}
