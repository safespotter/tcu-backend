const mongoose = require('mongoose');

module.exports = mongoose.model('LampStatus', new mongoose.Schema({
    id: Number,
    status: Number,
    alert_type: String,
    date: { type: Date, default: Date.now },
    videoURL: String
},{
    versionKey: false
}));
