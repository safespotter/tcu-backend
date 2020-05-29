const mongoose = require('mongoose');


module.exports = mongoose.model('Notification', new mongoose.Schema({
    id: Number,
    critical_issues: Number,
    date: { type: Date, default: Date.now },
    checked: Boolean
},{
    versionKey: false
}));
