'use strict'
const Service = require('./bingmaps/bingmaps-service')
const {TrafficCache, TrafficEvent} = require("../../models/mongo/mongo-traffic");

const TTL = 5 * 60 * 1000 // 5 minutes

async function getTraffic() {
    let data = null
    let cache = await getCache()

    if (cache && cache.timestamp > Date.now() - TTL) { // cache is valid
        data = cache
    } else { // cache is old or missing
        try {
            data = await Service.getTraffic()
            data = await TrafficCache.fromObject(data)
            data = await data.save()
            // no await to not block the execution
            clearOldCache().then()
        } catch (e) {
            console.error("Error when requesting traffic data!")
            console.error(e)
            data = cache // return the old cache since it's the only data we have
        }
    }
    await data.populate('events').execPopulate()
    return data.events.map(o => o.toObject())
}

async function getCache() {
    // Get the most recent
    return await TrafficCache.findOne().sort({timestamp: -1})
}

async function clearOldCache() {
    try {
        let cacheList = await TrafficCache.find({timestamp: {$lt: Date.now() - TTL}})
        let eventList = cacheList.reduce((l, o) => l.concat(o.events), [])

        await Promise.all([
            TrafficCache.deleteMany({_id: {$in: cacheList.map(o => o._id)}}),
            TrafficEvent.deleteMany({_id: {$in: eventList}})
        ])
    } catch (e) {
        console.error("Error when clearing traffic cache:")
        console.error(e)
    }
}

module.exports = {getTraffic}
