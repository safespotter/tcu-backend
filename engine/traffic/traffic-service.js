'use strict'
const Service = require('./bingmaps/bingmaps-service')
const HttpStatus = require('http-status-codes')
const {TrafficInfo} = require("../../models/mongo/mongo-traffic");

const TTL = 5 * 60 // 5 minutes in seconds

async function getTraffic(req, res) {
    try {
        let data = await getCache()
        if (!data) {
            data = await Service.getTraffic()
            data.save() // Both to check that we have a valid mongo document and to handle the cache in this file only
        }
        return res.status(HttpStatus.OK).send(data.toObject().events)
    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Error when requesting traffic data!"
        });
    }
}

async function getCache() {
    return await TrafficInfo.findOne(
        {timestamp: {$gt: new Date(Date.now() - TTL * 1000)}}, // TTL is in seconds, date is calculated in ms
        {},
        {sort: {timestamp: 1}} // Get the latest in case there are multiple valid caches (not yet possible)
    )
}

module.exports = {getTraffic}
