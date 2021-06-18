const mongoose = require('mongoose');

module.exports = mongoose.model('SafeSpotter', new mongoose.Schema({
    id: Number,
    street: String,
    condition: String,
    alert_id: Number,
    anomaly_level: Number,
    lat: Number,
    long: Number,
    ip: String,
    date: { type: Date, default: Date.now },
    checked: { type: Boolean, default: false },
    configuration: [],
    timers: []
},{
    versionKey: false
}));


