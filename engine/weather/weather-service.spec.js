const {Services, setService, getLiveWeather, getFutureWeather} = require('./weather-service')
const {WeatherLive, WeatherForecast} = require('../../models/mongo/mongo-weather')
const {mongooseHelper} = require('../../spec/helpers/db.helper')
const {mockWeatherData} = require('../../spec/helpers/mocks.helper')

const mockLiveData = (service, time) => {
    return mockWeatherData(1, o => {
        o.time = time
        o.service = service
        return o
    })[0]
}
const mockFutureData = (service, time) => {
    return {
        service: service,
        time: time,
        data: mockWeatherData(5, o => {
            o.time = time
            o.service = service
            return o
        })
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
