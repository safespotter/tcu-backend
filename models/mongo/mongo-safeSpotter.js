const mongoose = require('mongoose');

module.exports = mongoose.model('SafeSpotter', new mongoose.Schema({
    id: Number,
    street: String,
    condition: String,
    alert_id: Number,
    anomaly_level: Number,
    date: { type: Date, default: Date.now },
    checked: { type: Boolean, default: false },
    configuration: []
},{
    versionKey: false
}));


