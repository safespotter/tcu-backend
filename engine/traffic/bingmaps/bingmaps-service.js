'use strict'
const https = require('https')

const CONFIG = require('./config.json')
const AUTH = require('./auth.json')

const URL = CONFIG.URL
const BORDERS = CONFIG.BORDERS
const MAP_AREA = `${BORDERS.S},${BORDERS.W},${BORDERS.N},${BORDERS.E}`

// set the request parameters
let PARAMS = ''
// specify the culture
if (CONFIG.CULTURE) {
    PARAMS += `c=${CONFIG.CULTURE}&`
}
// specify the severity of the incidents we want to fetch. If we want all of them skip this
if (Object.values(CONFIG.SEVERITY).some(item => !item.fetch)) {
    PARAMS += 's='
    for (const {id, fetch} of Object.values(CONFIG.SEVERITY)) {
        if (fetch) {
            PARAMS += `${id},`
        }
    }
    PARAMS.replace(/,$/, '&')
}
// specify the types of incident we want to fetch. If we want all of them skip this
if (Object.values(CONFIG.TYPE).some(item => !item.fetch)) {
    PARAMS += 't='
    for (const {id, fetch} of Object.values(CONFIG.TYPE)) {
        if (fetch) {
            PARAMS += `${id},`
        }
    }
    PARAMS.replace(/,$/, '&')
}

/**
 * Fetches data from the BingMaps Traffic API based on the configuration of this module
 *
 * @returns {Promise<Object>}
 */
function getTraffic() {
    return new Promise( resolve => {
        https.get(
            `https://${URL}/${MAP_AREA}?${PARAMS}key=${AUTH.KEY}`,
            res => resolve(res)
        )
    }).then(solveHttpResponse)
}

/**
 * Transforms an http response with JSON content into a JS Object
 *
 * @param res: http.IncomingMessage
 * @returns {Promise<Object>}
 */
const solveHttpResponse = res => {
    return new Promise( (resolve, reject) => {
        let rawData = ''
        res.on('data', (chunk) => {
            rawData += chunk
        })
        res.on('end', () => {
            if (res.statusCode > 299) {
                reject(JSON.parse(rawData))
            } else {
                resolve(JSON.parse(rawData))
            }
        })
    })
}

module.exports = { getTraffic }

//// quick test
// getTraffic().then(res => console.log(JSON.stringify(res))).catch(e => console.error(e))
