const mongoose = require('mongoose');


module.exports = mongoose.model('Notification', new mongoose.Schema({
    lamp_id: Number,
    street: String,
    alert_id: Number,
    date: { type: Date, default: Date.now },
    checked: Boolean
},{
    versionKey: false
}));
