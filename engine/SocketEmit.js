// 'use strict';
// const express = require('express');
//
// const app = express();
// const server = app.listen(3000, () => {
//     console.log('started in 3000')
// });
//
//
//     const socket = require("socket.io");
//     const io = socket(server);
//
//     var SafeSpotter = require('../models/mongo/mongo-safeSpotter')
//     var socketMap = [];
//
//     io.on('connection', (socket) => {
//         console.log("Client Connected");
//         socketMap.push(socket);
//         dataUpdate();
//     });
//
//     app.post('/SafeSpotter/create', async function (req) {
//             console.log(req.body)
//
//         let tmp_critical;
//         let allert;
//         let id;
//         try {
//
//             if ((await SafeSpotter.find({id: req.body.id})).length != 0 && req.body.critical_issues >= 0 && req.body.critical_issues <= 5) {
//                 tmp_critical = await SafeSpotter.find({id: req.body.id});
//                 tmp_critical[0].critical_issues != req.body.critical_issues ? id = req.body.id : id = -1;
//                 req.body.critical_issues == 5 ? allert = 1 : allert = 0;
//
//                 await SafeSpotter.updateOne({id: req.body.id},
//                     {
//                         street: req.body.street,
//                         ip: req.body.ip,
//                         critical_issues: req.body.critical_issues,
//                         date: new Date()
//                     })
//             } else {
//                 console.log('entro qui')
//                 let safeSpotter = new SafeSpotter(req.body)
//                 await safeSpotter.save();
//             }
//
//             //dati su mongo
//             dataUpdate(id, allert); //richiamo l'emissione
//             res.json("Charts  Successfully Created"); //parse
//         } catch (err) {
//             console.log(err);
//             //res.status(400).send(err);
//         }
//     });
//
//
//     async function dataUpdate(num, allert) {
//         console.log('Socket Emmit');
//         var safespotter = await SafeSpotter.find().sort({date: -1});
//         for (let socketMapObj of socketMap) {
//             if (safespotter.length > 0) {
//                 socketMapObj.emit('dataUpdate', [
//                     safespotter, num, allert]);
//             }
//         }
//
//
//     }
//
//     module.exports = {getData}
