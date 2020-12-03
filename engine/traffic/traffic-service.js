'use strict'
const Service = require('./bingmaps/bingmaps-service')
const HttpStatus = require('http-status-codes')

async function getTraffic(req, res) {
    try {
        const data = await Service.getTraffic()
        return res.status(HttpStatus.OK).send(data)
    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Error when requesting traffic data!"
        });
    }
}

module.exports = { getTraffic }
