'use strict'
const Service = require('./bingmaps/bingmaps-service')
const {TrafficCache} = require("../../models/mongo/mongo-traffic");

const TTL = 5 * 60 // 5 minutes in seconds

async function getTraffic() {
    let data = await getCache()
    if (!data) {
        data = await Service.getTraffic()
        data = await TrafficCache.fromObject(data)
        data.save()
    }
    await data.populate('events').execPopulate()
    return data.events.map(o => o.toObject())
}

async function getCache() {
    return await TrafficCache.findOne(
        {timestamp: {$gt: new Date(Date.now() - TTL * 1000)}}, // TTL is in seconds, date is calculated in ms
        {},
        {sort: {timestamp: 1}} // Get the latest in case there are multiple valid caches (not yet possible)
    )
}

module.exports = {getTraffic}
