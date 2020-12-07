const {Services, setService, getLiveWeather, getFutureWeather} = require('./weather-service')
const {WeatherLive, WeatherForecast} = require('../../models/mongo/mongo-weather')
const {mongooseHelper} = require('../../spec/helpers/db.helper')

const mockLiveData = (service, time) => {
    return {
        time: time,
        service: service,
        coordinates: {
        lat: 39.26,
            lon: 9.14
    },
        temp: 12.36,
        pressure: 1008,
        humidity: 87,
        conditions: "light clouds",
        wind: {
        direction: 210,
            speed: 2.1
    },
        precipitation: {
        type: null,
            value: 0
    },
        precipProbability: null,
        sunrise: Date.parse("2020-12-07T06:30:04.000Z"),
        sunset: Date.parse("2020-12-07T16:00:21.000Z")
    }
}
const mockFutureData = (service, time) => {
    return {
        service: service,
        time: time,
        data: [
            {
                time: Date.parse("1970-01-19T14:29:13.200Z"),
                service: service,
                coordinates: {
                    lat: 39.26,
                    lon: 9.14
                },
                temp: 12.36,
                pressure: 1008,
                humidity: 87,
                conditions: "light rain",
                precipProbability: 0.95,
                wind: {
                    direction: 248,
                    speed: 4.73
                },
                precipitation: {
                    type: "rain",
                    value: 0.2
                }
            },
            {
                time: Date.parse("1970-01-19T14:29:16.800Z"),
                service: service,
                coordinates: {
                    lat: 39.26,
                    lon: 9.14
                },
                temp: 12.59,
                pressure: 1008,
                humidity: 80,
                conditions: "clouds",
                precipProbability: 0.75,
                wind: {
                    direction: 244,
                    speed: 3.96
                },
                precipitation: {
                    type: null,
                    value: 0
                }
            },
            {
                time: Date.parse("1970-01-19T14:29:20.400Z"),
                service: service,
                coordinates: {
                    lat: 39.26,
                    lon: 9.14
                },
                temp: 12.61,
                pressure: 1007,
                humidity: 78,
                conditions: "light rain",
                precipProbability: 0.93,
                wind: {
                    direction: 231,
                    speed: 4.24
                },
                precipitation: {
                    type: "rain",
                    value: 0.27
                }
            }
        ]
    }
}

const mockService = {
    service: 'mock',
    TTL: {
        live: 180,
        forecast: 3600
    },
    requestLiveWeather: function () {
        return new Promise(res => res(new WeatherLive(mockLiveData(this.service, Date.now()))))
    },
    requestFutureWeather: function () {
        return new Promise(res => res(new WeatherForecast(mockFutureData(this.service, Date.now()))))
    }
}

beforeAll(async function () {
    await mongooseHelper.connect()

    Services.MOCK = mockService
    await setService(mockService)
})

afterEach(async function () {
    // Manually clear cache
    try {
        await Promise.all([
            WeatherLive.deleteMany(),
            WeatherForecast.deleteMany()
        ])
    } catch (e) {
        console.error(e)
    }
})

afterAll(async function () {
    try {
        await Promise.all([
            WeatherLive.collection.drop(),
            WeatherForecast.collection.drop()
        ])
    } catch (e) {
        console.error(e)
    }
    await mongooseHelper.disconnect()
})

describe("getLiveWeather", function () {

    it("should return data", async function () {
        const res = await getLiveWeather()

        expect(res).not.toBe(null)
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = await getLiveWeather()
        const res2 = await getLiveWeather()

        expect(res2).toEqual(res1)
    })

    // TODO: Test the 'live' cache more
})

describe("getFutureWeather", function () {

    it("should return a collection of data", async function () {
        const res = await getFutureWeather()

        expect(Array.isArray(res.data)).toBe(true)
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = await getFutureWeather()
        const res2 = await getFutureWeather()

        expect(res2).toEqual(res1)
    })

    // TODO: Test the 'future' cache more
})
