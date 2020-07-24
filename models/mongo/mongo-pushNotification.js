const mongoose = require('mongoose');


module.exports = mongoose.model('PushNotification', new mongoose.Schema({
    endpoint: String,
    expirationTime: Date,
    keys: { p256dh: String,
    auth: String}
},{
    versionKey: false
}));
