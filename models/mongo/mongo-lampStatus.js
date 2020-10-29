const mongoose = require('mongoose');

module.exports = mongoose.model('LampStatus', new mongoose.Schema({
    id: Number,
    status: String,
    date: { type: Date, default: Date.now }
},{
    versionKey: false
}));
