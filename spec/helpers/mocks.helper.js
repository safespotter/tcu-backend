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

module.exports = {MockResponse}
