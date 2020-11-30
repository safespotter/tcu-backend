// const SafeSpotter = require('../models/mongo/mongo-safeSpotter');
// const Notification = require('../models/mongo/mongo-notification');
// const Push = require('../models/mongo/mongo-pushNotification');
//
//
// async function dataUpdate(num, alert) {
//     console.log('Socket Emit da Socket');
//
//     const safespotter = await SafeSpotter.find().sort({date: -1});
//     const notification = await Notification.find({});
//     const count = await Notification.countDocuments({});
//     for (let socketMapObj of socketMap) {
//         if (safespotter.length > 0) {
//             socketMapObj.emit('dataUpdate', [
//                 safespotter, num, alert, notification, count]);
//         }
//     }
// }
//
// module.exports = {dataUpdate};