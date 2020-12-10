const mongoose = require('mongoose')

// Model for TrafficEvent
const TrafficEvent = mongoose.model('TrafficEvent', new mongoose.Schema({
    severity: {type: Number, required: true}
}, {strict: false, toObject: {versionKey: false}}))

// Schema for TrafficCache
const cacheSchema = new mongoose.Schema({
    timestamp: {type: Date, required: true, index: true, default: Date.now()},
    service: String,
    events: [{type: mongoose.ObjectId, ref: 'TrafficEvent'}]
}, {toObject: {versionKey: false}})

// Model for TrafficCache
const TrafficCache = mongoose.model('TrafficCache', cacheSchema)

// Constructor for TrafficCache
TrafficCache.fromObject = async obj => {
    try {
        let events = obj.events.map(e => new TrafficEvent(e))
        events = await Promise.all(events.map(e => e.save()))
        obj.events = events.map(e => e._id)
        return new TrafficCache(obj)
    } catch (e) {
        console.error('Error in creation of TrafficCache:')
        console.error(e)
    }
}


module.exports = {TrafficCache, TrafficEvent}
