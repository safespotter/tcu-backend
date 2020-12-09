const {getTraffic} = require('./traffic-service')
const {TrafficCache, TrafficEvent} = require('../../models/mongo/mongo-traffic')
const {stripProperty, mockTrafficData} = require('../../spec/helpers/mocks.helper')
const {mongooseHelper} = require('../../spec/helpers/db.helper')

//TODO: Set this up so that the module takes data from the mock and doesn't actually make an http request

const mockData = () => {
    return {
        service: 'mock',
        events: mockTrafficData()
    }
}

beforeAll(async function () {
    await mongooseHelper.connect()
})

afterAll(async function () {
    try {
        await Promise.all([
            TrafficCache.collection.drop(),
            TrafficEvent.collection.drop()
        ])

    } catch (e) {
        console.error(e)
    }
    await mongooseHelper.disconnect()
})

afterEach(async function () {
    // Manually clear cache
    try {
        await TrafficCache.deleteMany()
    } catch (e) {
        console.error(e)
    }
})

describe("getTraffic", function() {

    let service = require('./bingmaps/bingmaps-service')
    beforeEach(function() {
        spyOn(service, 'getTraffic').and.resolveTo(mockData())
    })

    it("should return data", async function () {
        const res = await getTraffic()

        expect(Array.isArray(res)).toBe(true)
        expect(res.map(o => stripProperty(o, '_id'))).toEqual(mockData().events)
        expect(res.some(o => o instanceof TrafficEvent)).toBe(false)
        expect(service.getTraffic).toHaveBeenCalled()
    })

    it("should return a cached response if there is recent data", async function () {
        let fakeData = await TrafficCache.fromObject(mockData())
        fakeData = await fakeData.save()
        await fakeData.populate('events').execPopulate()

        const res = await getTraffic()

        expect(res).toEqual(fakeData.events.map(o => o.toObject()))
        expect(service.getTraffic).not.toHaveBeenCalled()
    })

    it("should return new data if the cache is too old", async function () {
        let fakeData = await TrafficCache.fromObject(mockData())
        fakeData.timestamp = new Date(2020, 1, 1)
        await fakeData.save()

        const res = await getTraffic()

        expect(res).not.toBe(null)
        expect(service.getTraffic).toHaveBeenCalled()
    })
})
