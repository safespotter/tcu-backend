const mockTrafficData = (quantity = 3, map = o => o) => {
    const pool = require('./traffic.mock.json')
    let data = new Array(quantity)
    data = data.map(_ => pool[Math.random() * Math.floor(pool.lenght)])
    data = data.map(o => map(JSON.parse(o)))
    return data
}

const mockWeatherData = (quantity = 1, map = o => o) => {
    const pool = require('./weather.mock.json')
    let data = new Array(quantity)
    data = data.map(_ => pool[Math.random() * Math.floor(pool.lenght)])
    data = data.map(o => map(JSON.parse(o)))
    return data
}

class MockResponse {
    status(code) {
        this.statusCode = code
        return this
    }

    send(body) {
        if ('error' in body) {
            this.error = body.error
            this.message = 'message' in body ? body.message : null
        } else {
            this.body = body
        }
        return this
    }
}

const stripProperty = (obj, prop) => {
    let res = {}
    for (const key of Object.keys(obj)) {
        if (key !== prop) {
            res[key] = obj[key]
        }
    }
    return res
}

module.exports = {MockResponse, stripProperty, mockTrafficData, mockWeatherData}
