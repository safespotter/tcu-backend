const mongoose = require('mongoose')

const TrafficInfo = mongoose.model('TrafficCache', new mongoose.Schema({
    timestamp: {type: Date, required: true, index: true},
    service: String,
    events: [Object]
}))

module.exports = { TrafficInfo }
