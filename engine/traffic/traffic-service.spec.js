const {getTraffic} = require('./traffic-service')
const {TrafficInfo} = require('../../models/mongo/mongo-traffic')
const {MockResponse} = require('../../spec/helpers/mocks.helper')
const {mongooseHelper} = require('../../spec/helpers/db.helper')

//TODO: Set this up so that the module takes data from the mock and doesn't actually make an http request

const mockData = () => {
    return {
        timestamp: Date.now(),
        service: 'mock',
        events: [
            {
                "__type": "TrafficIncident:http://schemas.microsoft.com/search/local/ws/rest/v1",
                "point": {
                    "type": "Point",
                    "coordinates": [
                        40.159215,
                        9.195036
                    ]
                },
                "description": "SS128 Centrale Sarda tratto chiuso causa veicolo fermo da Gavoi a Sarule",
                "end": "/Date(1607027877329)/",
                "icon": 1,
                "incidentId": 9288751678406000,
                "isEndTimeBackfilled": true,
                "lastModified": "/Date(1606992515752)/",
                "roadClosed": true,
                "severity": 4,
                "source": 5,
                "start": "/Date(1606972740000)/",
                "title": "Via Carlo Felice NB",
                "toPoint": {
                    "type": "Point",
                    "coordinates": [
                        40.160603,
                        9.194988
                    ]
                },
                "type": 3,
                "verified": true
            },
            {
                "__type": "TrafficIncident:http://schemas.microsoft.com/search/local/ws/rest/v1",
                "point": {
                    "type": "Point",
                    "coordinates": [
                        40.160603,
                        9.194988
                    ]
                },
                "description": "SS128 Centrale Sarda tratto chiuso causa veicolo fermo da Gavoi a Sarule",
                "end": "/Date(1607027877329)/",
                "icon": 1,
                "incidentId": 9288751652806000,
                "isEndTimeBackfilled": true,
                "lastModified": "/Date(1606992515752)/",
                "roadClosed": true,
                "severity": 4,
                "source": 5,
                "start": "/Date(1606972740000)/",
                "title": "Via Sassari NB",
                "toPoint": {
                    "type": "Point",
                    "coordinates": [
                        40.161898,
                        9.195559
                    ]
                },
                "type": 3,
                "verified": true
            },
            {
                "__type": "TrafficIncident:http://schemas.microsoft.com/search/local/ws/rest/v1",
                "point": {
                    "type": "Point",
                    "coordinates": [
                        40.161879,
                        9.195684
                    ]
                },
                "description": "SS128 Centrale Sarda tratto chiuso causa veicolo fermo da Gavoi a Sarule",
                "end": "/Date(1607027877344)/",
                "icon": 1,
                "incidentId": 9287597512058000,
                "isEndTimeBackfilled": true,
                "lastModified": "/Date(1606992515752)/",
                "roadClosed": true,
                "severity": 4,
                "source": 5,
                "start": "/Date(1606972740000)/",
                "title": "SS128 / Strada Statale Numero 128 NB",
                "toPoint": {
                    "type": "Point",
                    "coordinates": [
                        40.185309,
                        9.18435
                    ]
                },
                "type": 3,
                "verified": true
            },
        ]
    }
}

beforeAll(async function () {
    await mongooseHelper.connect()
})

afterAll(async function () {
    try {
        await TrafficInfo.collection.drop()
    } catch (e) {
        console.error(e)
    }
    await mongooseHelper.disconnect()
})

afterEach(async function () {
    // Manually clear cache
    try {
        await TrafficInfo.deleteMany()
    } catch (e) {
        console.error(e)
    }
})

describe("getTraffic", function() {
    it("should return data", async function () {
        const res = new MockResponse()
        await getTraffic({}, res)

        expect(res.statusCode).toBe(200)
        expect(res.body).not.toBe(null)
    })

    it("should return a cached response if there is recent data", async function () {
        const res = new MockResponse()

        let fakeData = new TrafficInfo(mockData())
        await fakeData.save()

        await getTraffic({}, res)

        expect(res.body).toEqual(fakeData.toObject().events)
    })

    it("should return new data if the cache is too old", async function () {
        const res = new MockResponse()

        let fakeData = new TrafficInfo(mockData())
        fakeData.timestamp = new Date(2020, 1, 1)
        await fakeData.save()

        await getTraffic({}, res)

        expect(res.statusCode).toBe(200)
        expect(res.body).not.toEqual(fakeData.toObject().events)
    })
})
