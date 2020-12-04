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

module.exports = {MockResponse, stripProperty}
