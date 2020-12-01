const {Services, setService, getLiveWeather, getFutureWeather} = require('./weather-service')
const WeatherModel = require('../../models/mongo/mongo-weather')

const mongoose = require('mongoose')
mongoose.Promise = require('bluebird');

class MockResponse {
    statusCode = null
    data = null
    error = null

    status(id) {
        this.statusCode = id
        return this
    }

    send(item) {
        if ('data' in item) {
            if ('toObject' in item.data) {
                // Mongo documents don't like being compared
                this.data = item.data.toObject()
            } else {
                this.data = item.data
            }
        }

        if ('error' in item) {
            this.error = item.error
        }
        return this
    }
}

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

    console.log("These tests rely on MongoDB. Make sure that the database is active and listening.")

    await mongoose.connect('mongodb://localhost/tcu-backend-test', {
        useNewUrlParser: true,
        promiseLibrary: require('bluebird'),
        useUnifiedTopology: true,
        useCreateIndex: true,
    })
        .then(() => console.log('Connected successfully to the mongo database'))
        .catch((err) => console.error(err));

    Services.MOCK = mockService
    await setService(mockService)
})

afterEach(async function () {

    const collections = await mongoose.connection.db.collections()
    for (const collection of collections) {
        collection.drop()
    }
})

afterAll(async function () {
    await mongoose.disconnect()
})

describe("getLiveWeather", function () {

    it("should return data", async function () {
        const res = new MockResponse()
        await getLiveWeather({}, res)

        expect(res.statusCode).toBe(200)
        expect(res.data).not.toBe(null)
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getLiveWeather({}, res1)
        await getLiveWeather({}, res2)

        expect(res2.data).toEqual(res1.data)
    })

    it("should clear the cache if the service changes", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getLiveWeather({}, res1)

        await setService(mockService)

        await getLiveWeather({}, res2)

        expect(res2.data).not.toEqual(res1.data)
    })
})

describe("getFutureWeather", function () {

    it("should return a collection of data", async function () {
        const res = new MockResponse()
        await getFutureWeather({}, res)
        expect(res.statusCode).toBe(200)
        expect(Object.keys(res.data)).toContain('data')
    })

    it("should return a cached response if it has been called recently", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getFutureWeather({}, res1)
        await getFutureWeather({}, res2)

        expect(res2.data).toEqual(res1.data)
    })

    it("should clear the cache if the service changes", async function () {
        const res1 = new MockResponse()
        const res2 = new MockResponse()

        await getFutureWeather({}, res1)

        await setService(mockService)

        await getFutureWeather({}, res2)

        expect(res2.data).not.toEqual(res1.data)
    })
})
