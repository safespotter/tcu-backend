const mongoose = require('mongoose');


module.exports = mongoose.model('Notification', new mongoose.Schema({
    id: Number,
    street: String,
    critical_issues: Number,
    date: { type: Date, default: Date.now },
    checked: Boolean,
    condition_convert: String
},{
    versionKey: false
}));
