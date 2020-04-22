const mongoose = require('mongoose');

module.exports = mongoose.model('SafeSpotter', new mongoose.Schema({
    id: Number,
    street: String,
    ip: String,
    critical_issues: Number,
},{
    versionKey: false
}));


