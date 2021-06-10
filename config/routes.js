const AccMan = require('../engine/access-manager');
const DashMan = require('../engine/dashboard-manager');
const CalMan = require('../engine/calendar-manager');
const InfoManager = require('../engine/info-manager');
const SafMan = require('../engine/safespotter-manager');
const ErrorHandler = require('../engine/error-handler');
const cors = require('cors');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const SocketEmit = require('../engine/SocketEmit');
const env = process.env.NODE_ENV || 'development';
const config = require('./config')[env];


module.exports = function (app, passport, config, io) {

    const PUBLIC_VAPID = config["public_vapid"];
    const PRIVATE_VAPID = config["private_vapid"];
    //const site_URL = (config['site_URL'].includes('localhost') ? 'http://localhost:4200' : '') + '/#/preferences/api-keys?err=true';

    /* PATHs */
    const amPath = '/users';
    const keysPath = '/keys';
    const dashPath = '/dashboards';
    const calPath = '/calendar';
    const messPath = '/message';
    const safePath = '/safePath';
    const weatherPath = '/weather';


    /* AUTH */
    const reqAuth = passport.authenticate('jwt', {session: false});

    const admin = '0';
    const user = '1';
    const editor = '2';
    const analyst = '3';

    const all = [admin, user, editor, analyst];

    /****************** ACCESS MANAGER ********************/
    app.post('/login', AccMan.basicLogin);

    /****************** CRUD USERS ********************/
    app.post(`${amPath}/create/`, AccMan.createUser);
    app.get(`${amPath}/getFromId/`, reqAuth, AccMan.roleAuth(all), AccMan.getUserById);
    app.put(`${amPath}/update/`, reqAuth, AccMan.roleAuth(all), AccMan.updateUser);
    app.delete(`${amPath}/delete/`, reqAuth, AccMan.roleAuth([admin]), AccMan.deleteUser);


    /****************** CALENDAR MANAGER ******************/
    app.get(`${calPath}/getEvents`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.post(`${calPath}/addEvent`, reqAuth, AccMan.roleAuth(all), CalMan.addEvent);
    app.put(`${calPath}/updateEvent`, reqAuth, AccMan.roleAuth(all), CalMan.getEvents);
    app.delete(`${calPath}/deleteEvent`, reqAuth, AccMan.roleAuth(all), CalMan.deleteEvent);

    /****************** SAFESPOTTER MANAGER ********************/
    app.get(`${safePath}/getData`, reqAuth, AccMan.roleAuth(all), SafMan.returnList);
    app.post(`${safePath}/updateLamppostStatus`, SafMan.updateLamppostStatus);
    app.get(`${safePath}/getStreetLampStatus/:lamp_id`, reqAuth, AccMan.roleAuth(all), SafMan.getStreetLampStatus);
    app.post(`${safePath}/checkNotification`, reqAuth, AccMan.roleAuth(all), SafMan.checkNotification);
    app.put(`${safePath}/updateLamppostConfiguration/:id`, reqAuth, AccMan.roleAuth(all), SafMan.updateLamppostConfiguration);
    app.get(`${safePath}/getLamppostConfiguration/:id`, reqAuth, AccMan.roleAuth(all), SafMan.getLamppostConfiguration);
    app.put(`${safePath}/updateLamppostTimer/:id`, reqAuth, AccMan.roleAuth(all), SafMan.updateLamppostTimer);
    app.get(`${safePath}/getLamppostTimers/:id`, reqAuth, AccMan.roleAuth(all), SafMan.getLamppostTimers);
    app.post(`${safePath}/addLamppost`, reqAuth, AccMan.roleAuth(all), SafMan.addLamppost);

    /****************** WEATHER SERVICE ********************/
    app.get(`${weatherPath}/getLive`, reqAuth, AccMan.roleAuth(all), InfoManager.requestWeatherLive);
    app.get(`${weatherPath}/getForecast`, reqAuth, AccMan.roleAuth(all), InfoManager.requestWeatherForecast);


    /****************** SUPPORT METHODS ********************/
    var SafeSpotter = require('../models/mongo/mongo-safeSpotter');
    var Notification = require('../models/mongo/mongo-notification');
    var Push = require('../models/mongo/mongo-pushNotification');

    var socketMap = [];

    io.on('connection', (socket) => {
        console.log("Client Connected");
        socketMap.push(socket);
        dataUpdate();
    });

    async function dataUpdate(num, alert = 0) {
        console.log('Socket Emmit');
        const safespotter = await SafeSpotter.find().sort({date: -1});
        const notification = await Notification.find({checked: false});
        const count = await Notification.countDocuments({checked: false});
        for (let socketMapObj of socketMap) {
            if (safespotter.length > 0) {
                socketMapObj.emit('dataUpdate', [
                    safespotter, num, alert, notification, count]);
            }
        }

        // mark them as "checked" after they get sent once
        for (let el of safespotter) {
            el.checked = true;
            el.save(); // the result is not used so don't await it
        }
    }

    app.use(cors());
    app.use(bodyParser.json());

    webpush.setVapidDetails('mailto:you@domain.com', PUBLIC_VAPID, PRIVATE_VAPID);

    /** push notification subscription*/
    app.post('/subscription', (req, res) => {
        (async () => {
            try {
                if ((await Push.find({keys: req.body.keys})).length != 0) {

                    await Push.updateOne({id: req.body.keys}, {
                        endpoint: req.body.endpoint,
                        expirationTime: req.body.expirationTime,
                    })
                } else {
                    let push = new Push(req.body)
                    await push.save();
                }
            } catch (e) {
                console.log(e)
            }
        })();
    });

    async function pushNotification(anomaly_level, alert_id, timestamp) {

        try {
            const allSubscriptions = await Push.find({});
            const notificationPayload = {
                "notification": {
                    "title": 'ALLERTA '+ anomaly_level,
                    "body": alert_id,
                    "icon": "assets/icons/icon-512x512.png",
                    "vibrate": [100, 50, 100],
                    "data": {
                        "dateOfArrival": timestamp
                    }
                }
            };
            Promise.all(allSubscriptions.map(sub => webpush.sendNotification(
                sub, JSON.stringify(notificationPayload))))
                .then(() => {
                    return console.log("Notifica push inviata con successo")
                })
                .catch(err => {
                    return console.error("Error sending notification, reason: ", err)
                });

        } catch (e) {
            console.log(err);
        }
    }

    /****************** ERROR HANDLER ********************/
    app.use(ErrorHandler.fun404);

    /****************** MODULE EXPORTS ********************/
    exports.dataUpdate = dataUpdate;
    exports.pushNotification = pushNotification;
};



