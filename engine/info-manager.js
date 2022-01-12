'use strict'

const WeatherService = require("./weather/weather-service")
const TrafficService = require("./traffic/traffic-service")
const Request = require('request-promise');
const HttpStatus = require('http-status-codes')
const sha256 = require('js-sha256');
const {WeatherConditions} = require("../models/mongo/mongo-weather");
const env = process.env.NODE_ENV || 'development';
const config = require('./../config/config.json')[env];


/**
 * Evaluates the risk index in a point based on weather conditions and traffic information
 *
 * @param point: {lat: number, lon: number}
 */
async function evaluateRisk(point) {
    const weatherL = await WeatherService.getLiveWeather()
    const weatherF = await WeatherService.getFutureWeather()
    const traffic = await TrafficService.getTraffic()

    /* day - night */
    // check if is night or if it is sunset/sunrise (duration = 2 * nightTransitionTime)
    const nightTransitionTime = 30 * 60 * 1000 // 30 min
    const isNight =
        Date.now() > weatherL.sunset + nightTransitionTime ||
        Date.now() < weatherL.sunrise - nightTransitionTime
    const isNightTransition =
        Date.now() > weatherL.sunset - nightTransitionTime && !isNight ||
        Date.now() < weatherL.sunrise + nightTransitionTime && !isNight

    /* traffic */
    // check the most severe incident nearby (aOI is the radius in meters)
    const areaOfInterest = 500 // 500m
    const distanceFromCoords = (pointA, pointB) => {
        // https://gis.stackexchange.com/questions/2951/algorithm-for-offsetting-a-latitude-longitude-by-some-amount-of-meters
        const latDiff = pointA.lat - pointB.lat
        const lonDiff = pointA.lon - pointB.lon
        const yDiff = latDiff / 111111
        const xDiff = lonDiff / (Math.cos(pointA.lat) * 111111)
        return Math.sqrt(xDiff ** 2 + yDiff ** 2)
    }
    const relevantTraffic = traffic.filter(o => {
        const p = {
            lat: o.point.coordinates[0],
            lon: o.point.coordinates[1]
        }
        return distanceFromCoords(point, p) < areaOfInterest
    })
    const highestSeverity = relevantTraffic.reduce((max, o) => {
        return o.severity > max ? o.severity : max
    }, 0)

    /* weather */
    // check for adverse weather conditions
    const isWeatherAdverse = weatherL.conditions in
        [
            WeatherConditions.FOG,
            WeatherConditions.RAIN,
            WeatherConditions.THUNDERSTORM,
            WeatherConditions.SNOW,
        ]
    // check for heavy wind (in m/s)
    const windThreshold = 40 * 3.6 // 40 km/h
    const isWindStrong = weatherL.wind.speed > windThreshold
    //check for heavy precipitation (in mm/h)
    const precipHeavyThreshold = 10 // mm/h
    const precipViolentThreshold = 50 // mm/h
    const isPrecipHeavy = weatherL.precipitation.value > precipHeavyThreshold
    const isPrecipViolent = weatherL.precipitation.value > precipViolentThreshold
    // check for precipitation probability in the next hour
    const precipProbableThreshold = 50 // percent
    const isPrecipProbable = weatherF.data[0].precipProbability > precipProbableThreshold

    const weights = {
        isNight: isNight * 1,
        isNightTransition: isNightTransition * 0.5,
        highestSeverity: highestSeverity * 0.5,
        isWeatherAdverse: isWeatherAdverse * 0.5,
        isWindStrong: isWindStrong * 1,
        isPrecipHeavy: isPrecipHeavy * 1,
        isPrecipViolent: isPrecipViolent * 1,
        isPrecipProbable: isPrecipProbable * 0.5,
    }
    const risk = Object.values(weights).reduce((sum, v) => sum + v)
    return Math.min(Math.ceil(+risk), 3)
}

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

async function getLiveWeather(req, res) {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const stringToHash = 'api-key' + config['WeatherLink']['key'] + 'station-id' + config['WeatherLink']['station'] + 't' + timestamp;
        const apiSignature = sha256.sha256.hmac(config['WeatherLink']['secret'], stringToHash)

        const option = {
            method: 'GET',
            uri: 'https://api.weatherlink.com/v2/current/' + config['WeatherLink']['station'] + '?api-key=' + config['WeatherLink']['key'] + '&t=' + timestamp + '&api-signature=' + apiSignature,
            json: true
        }

        const result = await Request(option);

        res.status(HttpStatus.OK).send({
           result
        });

    } catch (e) {
        res.status(HttpStatus.BAD_REQUEST).send({
            error: 'something went wrong'
        });
    }

}

module.exports = {
    getLiveWeather,
    requestWeatherLive: convertServiceToRequest(WeatherService.getLiveWeather, 'weather live'),
    requestWeatherForecast: convertServiceToRequest(WeatherService.getFutureWeather, 'weather forecast'),
    requestTraffic: convertServiceToRequest(TrafficService.getTraffic, 'traffic'),
    evaluateRisk,
}
