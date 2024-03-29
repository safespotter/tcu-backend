const mongoose = require('mongoose');

module.exports = mongoose.model('SafeSpotter', new mongoose.Schema({
    id: Number,
    street: String,
    condition: String,
    alert_id: Number,
    anomaly_level: Number,
    notification_id: Number,
    status_id: Number,
    lat: Number,
    long: Number,
    ip_cam_fix: String,
    ip_cam_brand: String,
    date: {type: Date, default: Date.now},
    checked: {type: Boolean, default: false},
    configuration: [],
    timers: [],
    panel_list: [],
    panel_group: Number,
    panel: Boolean,
    alert_endtime: Date,
    panel_status: Number,
    alternativeRoutes: [],
    platform: String,
    keepAlive: Date,
    manualAlert: {type: Number, default: 0}
}, {
    versionKey: false
}));


