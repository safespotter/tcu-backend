'use strict'
const Service = require('./bingmaps/bingmaps-service')
const HttpStatus = require('http-status-codes')
const {TrafficCache} = require("../../models/mongo/mongo-traffic");

const TTL = 5 * 60 // 5 minutes in seconds

async function getTraffic(req, res) {
    try {
        let data = await getCache()
        if (!data) {
            data = await Service.getTraffic()
            data = await TrafficCache.fromObject(data)
            data.save()
        }
        await data.populate('events').execPopulate()
        return res.status(HttpStatus.OK).send(data.events.map(o => o.toObject()))
    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Error when requesting traffic data!"
        });
    }
}

async function getCache() {
    return await TrafficCache.findOne(
        {timestamp: {$gt: new Date(Date.now() - TTL * 1000)}}, // TTL is in seconds, date is calculated in ms
        {},
        {sort: {timestamp: 1}} // Get the latest in case there are multiple valid caches (not yet possible)
    )
}

module.exports = {getTraffic}
