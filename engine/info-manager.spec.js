const {evaluateRisk} = require('./info-manager')

const WeatherService = require('./weather/weather-service')
const TrafficService = require("./traffic/traffic-service")
const {WeatherConditions} = require("../models/mongo/mongo-weather");

const {mockWeatherData, mockTrafficData} = require('../spec/helpers/mocks.helper')

const mockPoint = {
    lat: 40,
    lon: 9
}

describe("evaluateRisk", function() {

    it("should return a low risk when conditions are good", async function () {
        const lowRisk = {
            weatherLive: mockWeatherData(1, o => {
                o.sunset = Date.now() + 3 * 3600 * 1000
                o.conditions = WeatherConditions.CLEAR
                o.wind.speed = 0
                o.precipitation.value = 0
                o.precipProbability = 0
                return o
            })[0],
            weatherFuture: {
                service: 'mock',
                time: Date.now(),
                data: mockWeatherData(5, o => {
                    o.sunset = Date.now() + 3 * 3600 * 1000
                    o.conditions = WeatherConditions.CLEAR
                    o.wind.speed = 0
                    o.precipitation.value = 0
                    o.precipProbability = 0
                    return o
                })
            },
            traffic: mockTrafficData(5, o => {
                o.severity = 0
                return o
            }),
        }
        spyOn(WeatherService, 'getLiveWeather').and.resolveTo(lowRisk.weatherLive)
        spyOn(WeatherService, 'getFutureWeather').and.resolveTo(lowRisk.weatherFuture)
        spyOn(TrafficService, 'getTraffic').and.resolveTo(lowRisk.traffic)

        const risk = await evaluateRisk(mockPoint)

        expect(risk).toEqual(0)
    })

    it("should return a low risk when conditions are bad", async function () {
        const highRisk = {
            weatherLive: mockWeatherData(1, o => {
                o.sunset = Date.now() - 3 * 3600 * 1000
                o.conditions = WeatherConditions.FOG
                o.wind.speed = 100
                o.precipitation.value = 100
                o.precipProbability = 80
                return o
            })[0],
            weatherFuture: {
                service: 'mock',
                time: Date.now(),
                data: mockWeatherData(5, o => {
                    o.sunset = Date.now() - 3 * 3600 * 1000
                    o.conditions = WeatherConditions.FOG
                    o.wind.speed = 100
                    o.precipitation.value = 100
                    o.precipProbability = 80
                    return o
                })
            },
            traffic: mockTrafficData(5, o => {
                o.point.coordinates = [mockPoint.lat, mockPoint.lon]
                o.severity = 7
                return o
            }),
        }
        spyOn(WeatherService, 'getLiveWeather').and.resolveTo(highRisk.weatherLive)
        spyOn(WeatherService, 'getFutureWeather').and.resolveTo(highRisk.weatherFuture)
        spyOn(TrafficService, 'getTraffic').and.resolveTo(highRisk.traffic)

        const risk = await evaluateRisk(mockPoint)

        expect(risk).toEqual(3)
    })
})
