const {Services, setService, getLiveWeather, getFutureWeather} = require('./weather-service')
const WeatherModel = require('../../models/mongo/mongo-weather')
const {MockResponse} = require('../../spec/helpers/mocks.helper')
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
        const res = new MockResponse()
        await getLiveWeather({}, res)

        expect(res.statusCode).toBe(200)
        expect(res.body).not.toBe(null)
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getLiveWeather({}, res1)
        await getLiveWeather({}, res2)

        expect(res2.body).toEqual(res1.body)
    })

    it("should clear the cache if the service changes", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getLiveWeather({}, res1)
        await setService(mockService)
        await getLiveWeather({}, res2)

        expect(res2.body).not.toEqual(res1.body)
    })
})

describe("getFutureWeather", function () {

    it("should return a collection of data", async function () {
        const res = new MockResponse()
        await getFutureWeather({}, res)

        expect(res.statusCode).toBe(200)
        expect(Object.keys(res.body)).toContain('data')
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getFutureWeather({}, res1)
        await getFutureWeather({}, res2)

        expect(res2.body).toEqual(res1.body)
    })

    it("should clear the cache if the service changes", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getFutureWeather({}, res1)
        await setService(mockService)
        await getFutureWeather({}, res2)

        expect(res2.body).not.toEqual(res1.body)
    })
})
