const mongoose = require('mongoose');

module.exports = mongoose.model('SafeSpotter', new mongoose.Schema({
    id: Number,
    street: String,
    condition: String,
    critical_issues: Number,
    condition_convert: String,
    date: { type: Date, default: Date.now }
},{
    versionKey: false
}));


