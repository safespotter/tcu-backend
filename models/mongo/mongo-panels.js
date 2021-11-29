const mongoose = require('mongoose');

module.exports = mongoose.model('Panels', new mongoose.Schema({
    panel_id: Number,
    status: Number,
    via: String,
    ip: String,
    date: Date,
},{
    versionKey: false
}));
