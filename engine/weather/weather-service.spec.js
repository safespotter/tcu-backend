const {Services, setService, getLiveWeather, getFutureWeather} = require('./weather-service')
const WeatherModel = require('../../models/mongo/mongo-weather')
const {mongooseHelper} = require('../../spec/helpers/db.helper')

const mockData = () => {
    const t = Date.now()
    return {time: t}
}

const mockService = {
    requestLiveWeather: function () {
        return new Promise(res => res(new WeatherModel.WeatherLive(mockData())))
    },
    requestFutureWeather: function () {
        return new Promise(res => {
            const r = new WeatherModel.WeatherForecast()
            r.data.fill(mockData(), 0, 5)
            res(r)
        })
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
            WeatherModel.WeatherLive.deleteMany(),
            WeatherModel.WeatherForecast.deleteMany()
        ])
    } catch (e) {
        console.error(e)
    }
})

afterAll(async function () {
    try {
        await Promise.all([
            WeatherModel.WeatherLive.collection.drop(),
            WeatherModel.WeatherForecast.collection.drop()
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

    it("should clear the cache if the service changes", async function () {
        const res1 = await getLiveWeather()
        await setService(mockService)
        const res2 = await getLiveWeather()

        expect(res2).not.toEqual(res1)
    })
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

    it("should clear the cache if the service changes", async function () {
        const res1 = await getFutureWeather()
        await setService(mockService)
        const res2 = await getFutureWeather()

        expect(res2).not.toEqual(res1)
    })
})
