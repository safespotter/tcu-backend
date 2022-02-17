const mongoose = require('mongoose');

module.exports = mongoose.model('Panels', new mongoose.Schema({
    panel_id: Number,
    panel_group: Number,
    status: Number,
    via: String,
    lat: Number,
    long: Number,
    date: Date,
},{
    versionKey: false
}));
