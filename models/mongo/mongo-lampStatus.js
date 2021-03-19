const mongoose = require('mongoose');

module.exports = mongoose.model('LampStatus', new mongoose.Schema({
    lamp_id: Number,
    alert_id: Number,
    date: { type: Date, default: Date.now },
    videoURL: String
},{
    versionKey: false
}));
