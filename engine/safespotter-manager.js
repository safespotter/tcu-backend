const SafespotterManager = require('../models/mongo/mongo-safeSpotter');
const LampStatus = require('../models/mongo/mongo-lampStatus');
const Notification = require('../models/mongo/mongo-notification');
const Panel = require('../models/mongo/mongo-panels');
const Push = require('../models/mongo/mongo-pushNotification');
const HttpStatus = require('http-status-codes');
const _ = require("lodash");
const fs = require('fs');
const request = require('request');
const SocketEmit = require('../engine/SocketEmit');
const routes = require('../config/routes');
const webpush = require('web-push');
const Client = require('ftp');
const env = process.env.NODE_ENV || 'development';
const config = require('./../config/config')[env];
const historyTkn = config['historyTkn'];
const wazePath = config['wazePath'];
const tetralertToken = config['Tetralert'];
const telegramToken = config['TelegramToken'];
const telegramChatID = config['TelegramChatID'];
const TelegramBot = require('node-telegram-bot-api');
const Request = require("request-promise");
const bot = new TelegramBot(telegramToken, {polling: true});


function uploadVideoFtp(id, day, datetime, path) {

    const c = new Client();
    c.on('ready', function () {
        //cartella home
        c.cwd('/', function (err) {

            if (!err) {
                // 1. percorso dove prendere il file
                // 2. nuovo nome file
                //c.put('C://Users/Stefano/WebstormProjects/tcu-backend/prova.txt', 'message.txt', function(err) {
                // c.mkdir('provalamp', false, function (err) {
                //     if (err) throw err;
                // });
                c.put(path, id + '_' + day + '_' + datetime + '.mp4', function (err) {
                    // c.put(path, 'prova.mp4', function (err) {
                    if (err) throw err;
                    c.end();
                });

            }
        });
    });
    c.connect({
        host: config["ftp"]["host"],
        port: config["ftp"]["port"],
        user: config["ftp"]["user"],
        password: config["ftp"]["password"],
        secure: config["ftp"]["secure"],
        secureOptions: config["ftp"]["secureOptions"],
        connTimeout: config["ftp"]["connTimeout"],
        pasvTimeout: config["ftp"]["pasvTimeout"],
        aliveTimeout: config["ftp"]["aliveTimeout"]
    });
}

function storeLocalVideo(id, day, datetime, path) {

}

function wazeFileCreator(lamp_id, street, latitude, longitude, alert_id, status_id, starttime, endtime) {

    let type;
    let polyline;

    try {
        switch (alert_id) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 6:
            case 7:
                type = 'HAZARD';
                break;
            case 5:
                type = 'ACCIDENT';
                break;
        }

        const jsonToSave = {
            "id": status_id,
            "type": type,
            "polyline": '0 0',
            "street": street,
            "starttime": starttime,
            "endtime": endtime,
            "description": convertAlertType(alert_id),
            "direction": "BOTH_DIRECTIONS"
        }

        if (!fs.existsSync(wazePath)) {
            fs.writeFileSync(wazePath, JSON.stringify({incidents: [jsonToSave]}), 'utf8');
        } else{
            let data = fs.readFileSync(wazePath);
            let json = JSON.parse(data)['incidents'];
            json.push(jsonToSave);
            fs.writeFileSync(wazePath, JSON.stringify({incidents:json}),'utf8');
        }

    } catch (e) {
        console.warn(e);
    }

}

async function tetralertAPI(title, text, startTimestamp, panels, anomalyLevel, resetTimestamp) {
    try {

        let lampAlert = 0;

        switch (anomalyLevel) {
            case 1:
                //allerta gialla
                lampAlert = 10;
                break;
            case 2:
                //allerta arancione
                lampAlert = 15;
                break;
            case 3:
                //allerta rossa
                lampAlert = 20;
                break;
        }

        const body = {
            "comunicazione": {
                "titolo": title,
                "testo": text,
                "ora_invio": startTimestamp,
                "destinatari": {"semafori": [panels], "bandi": [panels]},
                "canali": ["semafori", "bandi"],
                "allerta_semafori": lampAlert,
                "ora_reset": resetTimestamp
            }
        };
        const option = {
            method: 'POST',
            uri: 'https://safespotter-api.tetralert.it/comunicazioni/create?tk=' + tetralertToken,
            auth: {
                bearer: tetralertToken
            },
            body: body,
            json: true
        }

        const result = await Request(option);

        console.log("result tetralert", result)

    } catch (e) {
        console.warn("Errore API Tetralert")
    }
}

/**Metodo che avvia il download del file video*/
const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);

        if (res.headers['content-length'] > 0)
            request(url).pipe(fs.createWriteStream(path)).on('close', callback)

    })
};

/**Funzione che converte in stringa le condizioni di criticità*/
function convertAlertType(input) {
    switch (input) {
        case 1:
        case '1':
            return 'Cambio di corsia illegale';
        case 2:
        case '2':
            return 'Traffico congestionato';
        case 3:
        case '3':
            return 'Oggetto o persona in strada';
        case 4:
        case '4':
            return 'Invasione di area pedonale';
        case 5:
        case '5':
            return 'Possible incidente';
        case 6:
        case '6':
            return 'Veicolo in sosta vietata';
        case 7:
        case '7':
            return 'Guida spericolata';
        default:
            return 'Errore anomalia';
    }
}

function convertAlertTypePath(input) {
    switch (input) {
        case 1:
        case '1':
            return 'cambio';
        case 2:
        case '2':
            return 'traffico';
        case 3:
        case '3':
            return 'persona';
        case 4:
        case '4':
            return 'invasione';
        case 5:
        case '5':
            return 'incidente';
        case 6:
        case '6':
            return 'sosta';
        case 7:
        case '7':
            return 'spericolata';
        default:
            return 'errore';
    }
}

/**Funzione che converte in stringa le condizioni di criticità*/
function convertAlertLevel(input) {
    switch (input) {
        case '0':
            return 'NESSUNA';
        case '1':
            return 'VERDE';
        case '2':
            return 'GIALLA';
        case '3':
            return 'ARANCIONE';
        case '4':
            return 'ROSSA';
    }
}

/**Metodo che inizializza lo status del lampione*/
function initializeLampStatus(model, data, date, status_id) {
    model.lamp_id = data.lamp_id;
    model.alert_id = data.alert_id;
    model.date = date;
    model.status_id = status_id;
    return model;
}

/**Metodo che normalizza il path del video*/
function getVideoPath(path) {
    return path.replace(".", "");
}

/**Metodo che crea il path*/
function pathCreator(id, day, datetime, alert) {

    //verifico che esista la cartella video
    !fs.existsSync(config["videoBasePath"] + "video") && fs.mkdirSync(config["videoBasePath"] + "video");

    //verifico che esista la cartella relativa al lampione
    !fs.existsSync(config["videoBasePath"] + "video/" + id) && fs.mkdirSync(config["videoBasePath"] + "video/" + id);

    //verifico che esista la cartella relativa al giorno
    !fs.existsSync(config["videoBasePath"] + "video/" + id + "/" + day) && fs.mkdirSync(config["videoBasePath"] + "video/" + id + "/" + day);

    //restituisco il path
    return config["videoBasePath"] + "video/" + id + "/" + day + "/" + datetime + '_' + convertAlertTypePath(alert) + ".mp4";
}


/**metodo che personalizza l'orario in hh_mm_ss*/
function customTimeDate(date) {

    let custom_date = new Date(date).toISOString().slice(11, 19);

    custom_date = custom_date.replace(/:/g, "_");

    return custom_date;
}

/**metodo che personalizza la data in YYYY_MM_DD*/
function customDayDate(date) {
    let custom_date = new Date(date).toISOString().slice(0, 10);

    custom_date = custom_date.replace(/-/g, "_");

    return custom_date;
}


/** configurazione di default del lampione */
function defaultLamppostConfiguration(lamp) {


    lamp.date = new Date();
    lamp.configuration =
        [
            {
                "alert_id": "1",
                "configuration_type": "0"
            },
            {
                "alert_id": "2",
                "configuration_type": "0"
            },
            {
                "alert_id": "3",
                "configuration_type": "0"
            },
            {
                "alert_id": "4",
                "configuration_type": "0"
            },
            {
                "alert_id": "5",
                "configuration_type": "0"
            },
            {
                "alert_id": "6",
                "configuration_type": "0"
            }
        ];
    lamp.timers = [
        {
            "alert_level": "0",
            "timer": 0
        },
        {
            "alert_level": "1",
            "timer": 900000
        },
        {
            "alert_level": "2",
            "timer": 900000
        },
        {
            "alert_level": "3",
            "timer": 900000
        },
        {
            "alert_level": "4",
            "timer": 900000
        }
    ];
    lamp.alert_id = 0;
    lamp.anomaly_level = 0;
    lamp.condition = "Connesso";

    return lamp;
}

/**funzione che crea le notifiche e aggiorna il lampione*/
async function createNotification(lamp_id, alert_id, status_id) {

    try {
        let anomaly_level = 0;
        let lamp = await SafespotterManager.find({id: lamp_id});
        let timer = 0;
        let timestamp = new Date();

        _.find(lamp[0].configuration, function (el) {
            if (el.alert_id == alert_id) {
                anomaly_level = el.configuration_type;
            }
        });

        _.find(lamp[0].timers, function (el) {
            if (el.alert_level == anomaly_level) {
                timer = el.timer;
            }
        });

        //se l'anomalia che arriva è minimo di livello 1 e maggiore uguale a quella già esistente
        if (anomaly_level >= lamp[0].anomaly_level || lamp[0].anomaly_level === undefined) {

            await SafespotterManager.updateOne({id: lamp_id},
                {
                    alert_id: alert_id,
                    anomaly_level: anomaly_level,
                    date: timestamp,
                    checked: false,
                });

            if (anomaly_level >= 1) {

                const not = await Notification.find({});
                let not_id = 1;

                if (not.length > 0)
                    //get the max id value and then add 1
                    not_id = _.maxBy(not, 'notification_id').notification_id + 1;

                let notification = new Notification;
                notification.notification_id = not_id;
                notification.lamp_id = lamp_id;
                notification.alert_id = alert_id;
                notification.street = lamp[0].street;
                notification.checked = false;
                await notification.save();

                await SafespotterManager.updateOne({id: lamp_id}, {
                    notification_id: not_id,
                    status_id: status_id
                });

                //check della notifica
                setTimeout(async () => {
                    notification.checked = true;
                    await notification.save();
                }, timer);
            }

            if (anomaly_level >= 2) {
                // notifiche push
                //routes.pushNotification(convertAlertLevel(anomaly_level), convertAlertType(alert_id), timestamp);
            }

            if (anomaly_level >= 4) {
                // notifica telegram
                //wazeFileCreator(lamp[0]['id'], lamp[0]['street'], lamp[0]['lat'], lamp[0]['long'], alert_id, status_id, Math.floor(timestamp / 1000), Math.floor(timestamp / 1000) + timer);
                bot.sendMessage(telegramChatID, 'Attenzione, rilevato ' + convertAlertType(alert_id) + ' in ' + lamp[0].street + ".");
                await SafespotterManager.updateOne({id: lamp_id}, {
                    panel: true
                });
                // attivazione del pannello luminoso
                // mettere la chiamata al pannello
                for (const panel of lamp[0]['panel_list']) {
                    await Panel.updateOne({panel_id: panel}, {
                        status: 3,
                        date: timestamp
                    }).then(async () => {
                    })
                }
                //await tetralertAPI('ALLERTA AUTOMATICA', convertAlertType(alert_id), Math.floor(timestamp / 1000), lamp[0]['panel_group'], 3, Math.floor(timestamp / 1000) + timer);
            }

            //dati su mongo
            routes.dataUpdate(lamp_id); //richiamo l'emissione

            //check del lampione
            setTimeout(async () => {
                const updatedDate = new Date();
                await SafespotterManager.updateOne({id: lamp_id, date: timestamp},
                    {
                        alert_id: 0,
                        anomaly_level: 0,
                        date: updatedDate,
                        checked: false,
                        panel: false
                    });

                await panelsManagement(lamp_id, timestamp);

                await routes.dataUpdate(lamp_id);
            }, timer);
        }
    } catch (err) {
        console.log(err);
    }
}

/**API che restituisce la lista dei lampioni con relativa criticità*/
async function returnList(req, res) {
    try {
        const response = await SafespotterManager.find({});
        res.send(response);
    } catch (e) {
        console.log(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            name: 'Internal Server Error',
            message: 'error safespotter list'
        });
    }
}

/** API che riceve e salva le comunicazioni dai lampioni
 *
 *  Body:
 *      lamp_id: number,
 *      alert_id: number,
 *      videoURL: string
 *      video_id: number
 *
 * */
async function updateLamppostStatus(req, res) {

    try {
        //salvo su variabile il contenuto del body
        const data = req.body;
        let doc = new LampStatus;
        let path = "";
        let flag = false;
        const day = Date.now();

        // controllo che siano stati passati dei dati
        if (typeof data === "undefined" || _.isEmpty(data)) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "no data received"
            })
        }

        const lampStatus = await LampStatus.find({});

        let lampStatus_id = 1;

        if (lampStatus.length > 0)
            //get the max id value and then add 1
            lampStatus_id = _.maxBy(lampStatus, 'status_id').status_id + 1;

        doc = initializeLampStatus(doc, data, day, lampStatus_id);

        //creo la notifica se l'anomalia che arriva è maggiore di quella già esistente e aggiorno il lampione
        await createNotification(data.lamp_id, data.alert_id, lampStatus_id);

        if (_.has(data, "video_id")) {

            flag = true;
            const videoCheck = await LampStatus.find({lamp_id: data.lamp_id, video_id: data.video_id})
            if (videoCheck.length > 0) {
                doc.videoURL = videoCheck[0].videoURL;
                doc.video_id = data.video_id;
                await doc.save();
            } else {
                const new_path = 'video/' + data.lamp_id.toString() + '/' + customDayDate(day) + '/' + customTimeDate(day) + '_' + convertAlertTypePath(req.body.alert_id) + '.mp4';
                doc.videoURL = new_path;
                doc.video_id = data.video_id;
                await doc.save();
                path = pathCreator(data.lamp_id.toString(), customDayDate(day), customTimeDate(day), req.body.alert_id);
                //eseguo il download del video a partire dall'url
                download(data["videoURL"], path, () => {
                    //uploadVideoFtp(data.lamp_id.toString(), customDayDate(day), customTimeDate(day), path);
                    // setTimeout(function () {
                    //     fs.unlinkSync(path);
                    //     fs.rmdirSync('./video', {recursive: true});
                    // }, 1);
                    console.log('File salvato nella directory ' + path);
                });

            }
        }

        if (flag === false)
            //salvo su mongodb i dati ricevuti dal lampione (aggiungere altri se necessario)
            await doc.save();

        return res.status(HttpStatus.OK).send({
            message: "data saved successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong"
        });
    }

}

/** API che preleva le informazioni salvate dei lampioni in ordine di data
 *
 *  Parametri:
 *      lamp_id: number
 *
 * */
async function getStreetLampStatus(req, res) {

    try {
        let data;
        let lamp_id = req.params.lamp_id;

        data = await LampStatus.find({
            'lamp_id': lamp_id
        }).sort({"date": "desc"});

        return res.status(HttpStatus.OK).send({
            data
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong"
        });
    }
}

async function getHystoryLamp(req, res) {

    try {
        let data;
        let lamp_id = req.query.lamp_id;
        let token = req.query.tkn;

        if (token !== historyTkn) {
            return res.status(HttpStatus.UNAUTHORIZED).send({
                error: "UNAUTHORIZED"
            });
        }

        data = await LampStatus.find({
            'lamp_id': lamp_id
        }).sort({"date": "desc"});

        return res.status(HttpStatus.OK).send({
            data
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong"
        });
    }
}

/**API che setta il valore checked della notifica
 *
 *  Body:
 *      id: number
 *      date: string
 *
 * */
async function checkNotification(req, res) {
    try {

        const lamp_id = req.body.lamp_id;
        const date = req.body.date;

        await Notification.updateOne({$and: [{lamp_id: lamp_id}, {date: date}]}, {
            checked: true
        });

        return res.status(HttpStatus.OK).send({
            message: "notification checked"
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong with notification checking"
        });
    }
}


/** API che aggiorna la configurazione di un lampione
 *
 * Parametri:
 *  lamp_id: number
 *
 * Body:
 *  alert_id: number
 *  configuration_type: number
 *
 * */
async function updateLamppostConfiguration(req, res) {

    // configuration_type = 0 -> nessuna notifica
    // configuration_type = 1 -> notifica verde
    // configuration_type = 2 -> notifica gialla
    // configuration_type = 3 -> notifica arancione
    // configuration_type = 4 -> notifica rossa

    try {
        const lamp_id = req.params.id;
        const alert_id = req.body.alert_id;
        const configuration_type = req.body.configuration_type;

        let doc = await SafespotterManager.findOne({id: lamp_id});

        if (doc == null) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "Lampione non presente nella lista"
            })
        }

        if (configuration_type < 0 || configuration_type > 4) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "valore di allerta errato"
            })
        }

        //se la configurazione non esiste
        if (_.isEmpty(doc.configuration)) {
            doc.configuration = [{alert_id: alert_id, configuration_type: configuration_type}];
            doc.save();
        } else {
            //devo controllare se l'alert id è presente dentro configuration
            //se presente allora devo aggiornare il configuration type
            //altrimenti devo pushare i due valori (alert_id, configuration_type)
            let index = _.indexOf(doc.configuration, doc.configuration[_.findKey(doc.configuration, {'alert_id': alert_id})]);
            if (index >= 0) {
                doc.configuration[index].configuration_type = configuration_type;
                //doc.anomaly_level = configuration_type;
                doc.markModified('configuration');
                doc.save();
            } else {
                doc.configuration.push({alert_id: alert_id, configuration_type: configuration_type});
                doc.save();
            }
        }
        routes.dataUpdate(lamp_id);
        return res.status(HttpStatus.OK).send({
            lamp_id: lamp_id,
            alert_id: alert_id,
            notification_type: configuration_type
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong updating lamppost configuration"
        });
    }

}


/** API che preleva la configurazione di un lampione passato come parametro
 *
 *  Parametri:
 *      lamp_id: number
 *
 * */
async function getLamppostConfiguration(req, res) {

    try {

        const lamp_id = req.params.id;
        let configuration;
        let timers;
        let doc = await SafespotterManager.findOne({id: lamp_id});

        if (doc == null) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "Lampione non presente nella lista"
            })
        }

        configuration = doc.configuration;
        timers = doc.timers;

        return res.status(HttpStatus.OK).send({
            lamp_id: lamp_id,
            configuration: configuration,
            timers: timers
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong updating lamppost configuration"
        });
    }


}

/** API che aggiorna i timer delle anomalie di un lampione
 *
 * Parametri:
 *  lamp_id: number
 *
 * Body:
 *  alert_level: number
 *  timer: number
 *
 * */
async function updateLamppostTimer(req, res) {
    try {

        const lamp_id = req.params.id;
        const alert_level = req.body.alert_level.toString();
        const timer = parseInt(req.body.timer, 10); //value in ms
        //const timer = req.body.timer;

        let doc = await SafespotterManager.findOne({id: lamp_id});

        if (doc == null) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "Lampione non presente nella lista"
            })
        }

        if (alert_level < 0 || alert_level > 4) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "valore di allerta errato"
            })
        }

        if (timer < 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "valore del timer errato"
            })
        }


        let index = _.indexOf(doc.timers, doc.timers[_.findKey(doc.timers, {'alert_level': alert_level})]);

        doc.timers[index].timer = timer;
        doc.markModified('timers');
        doc.save();

        return res.status(HttpStatus.OK).send({
            lamp_id: lamp_id,
            alert_level: alert_level,
            timer: timer
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong updating lamppost timers"
        });
    }
}

/** API che preleva i timer di un lampione passato come parametro
 *
 *  Parametri:
 *      lamp_id: number
 *
 * */
async function getLamppostTimers(req, res) {

    try {

        const lamp_id = req.params.id;
        let timers;
        let doc = await SafespotterManager.findOne({id: lamp_id});

        if (doc == null) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "Lampione non presente nella lista"
            })
        }

        timers = doc.timers;

        return res.status(HttpStatus.OK).send({
            lamp_id: lamp_id,
            timers: timers
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong updating lamppost configuration"
        });
    }


}

/** API che aggiunge un lampione all'infrastruttura
 *
 * Body:
 *  street *: string
 *  lat *: number
 *  long *: number
 *  ip_cam_fix *: string
 *  ip_cam_brand *: string
 *  platform: string
 *
 *  * Required parameters
 * */
async function addLamppost(req, res) {

    try {

        let id = 1;
        const safespotters = await SafespotterManager.find({});

        if (safespotters.length > 0)
            //get the max id value and then add 1
            id = _.maxBy(safespotters, 'id').id + 1;

        const street = req.body.street;
        const latitude = req.body.lat;
        const longitude = req.body.long;
        const ip_cam_fix = req.body.ip_cam_fix;
        const ip_cam_brand = req.body.ip_cam_brand;
        const platform = req.body.platform;

        if (street.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'street field empty. Required parameter'
            })
        }

        if (latitude.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'latitude field empty. Required parameter'
            })
        }

        if (longitude.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'longitude field empty. Required parameter'
            })
        }

        if (ip_cam_fix.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'ip_cam_fix field empty. Required parameter'
            })
        }

        if (ip_cam_fix.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'ip_cam_brand field empty. Required parameter'
            })
        }

        if (platform.length == 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                message: 'platform field empty. Required parameter'
            })
        }

        let doc = new SafespotterManager;

        doc.id = id;
        doc.street = street;
        doc.lat = latitude;
        doc.long = longitude;
        doc.ip_cam_fix = ip_cam_fix;
        doc.ip_cam_brand = ip_cam_brand;
        doc.platform = platform;

        doc = defaultLamppostConfiguration(doc);

        doc.save();

        setTimeout(function () {
            routes.dataUpdate(id);
        }, 1000);


        return res.status(HttpStatus.OK).send({
            id: id,
            message: 'lamppost added successfully'
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong adding the new lamppost"
        });
    }

}

/** API che aggiunge un lampione all'infrastruttura
 *
 * Parametri:
 *  id: number
 *
 * */
async function deleteLamppost(req, res) {
    try {

        const lamp_id = req.params.id;

        await SafespotterManager.deleteOne({id: lamp_id}).then(
            result => {
                setTimeout(function () {
                    routes.dataUpdate(lamp_id);
                }, 1000);
                res.status(HttpStatus.OK).send({
                    message: "lamppost deleted successfully"
                })
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong removing the lamppost"
        });
    }
}

/** API che aggiunge un lampione all'infrastruttura
 *
 * Body:
 *  lamp_id: number
 *  street: string
 *  lat: number
 *  long: number
 *  ip_cam_fix: string
 *  ip_cam_brand: string
 *
 * */
async function updateLamppost(req, res) {

    try {

        let updateDoc = {};


        if (req.body.lamp_id == undefined) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamp_id value missing"
            });
        }

        const lamp_id = req.body.lamp_id;

        if (!(typeof req.body.street === "undefined" || _.isEmpty(req.body.street))) {
            updateDoc.street = req.body.street;
        }

        if (!(typeof req.body.lat === "undefined" || _.isEmpty(req.body.lat))) {
            updateDoc.lat = req.body.lat;
        }

        if (!(typeof req.body.long === "undefined" || _.isEmpty(req.body.long))) {
            updateDoc.long = req.body.long;
        }

        if (!(typeof req.body.ip_cam_fix === "undefined" || _.isEmpty(req.body.ip_cam_fix))) {
            updateDoc.ip_cam_fix = req.body.ip_cam_fix;
        }

        if (!(typeof req.body.ip_cam_brand === "undefined" || _.isEmpty(req.body.ip_cam_brand))) {
            updateDoc.ip_cam_brand = req.body.ip_cam_brand;
        }

        await SafespotterManager.updateOne({id: lamp_id}, updateDoc).then(
            result => {
                if (result.nModified) {

                    setTimeout(function () {
                        routes.dataUpdate(lamp_id);
                    }, 1000);

                    res.status(HttpStatus.OK).send({
                        message: "lamppost updated successfully"
                    });
                } else
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: "lamppost id not detected"
                    });
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });

    } catch (error) {
        console.log(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "something went wrong updating the lamppost"
        });
    }

}

async function updateActionRequiredAlert(req, res) {

    const lamp_id = req.body.lamp_id;
    const notification_id = req.body.notification_id;
    const last_update = req.body.date;

    try {
        await SafespotterManager.updateOne({id: lamp_id}, {
            alert_id: 0,
            anomaly_level: 0,
            panel: false
        }).then(
            result => {
                if (result.nModified) {

                    setTimeout(async () => {

                        await panelsManagement(lamp_id, last_update);

                        await Notification.updateOne({$and: [{lamp_id: lamp_id}, {notification_id: notification_id}]}, {
                            checked: true
                        }).then(result => console.log("aggiorno notifica", result));
                    }, 1000);

                    setTimeout(function () {
                        routes.dataUpdate(lamp_id);
                    }, 1000);

                    res.status(HttpStatus.OK).send({
                        message: "lamppost updated successfully"
                    });
                } else
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: "lamppost id not detected"
                    });
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });
    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Generic error"
        });
    }

}

async function updatePanel(req, res) {
    const lamp_id = req.body.lamp_id;
    const status = req.body.panel;

    const new_date = new Date;
    try {
        await SafespotterManager.find({id: lamp_id}).then(
            result => {
                if (result) {

                    if (status > 0) {
                        SafespotterManager.updateOne({id: lamp_id}, {
                            panel: true,
                            date: new_date
                        }).then();
                    } else {
                        SafespotterManager.updateOne({id: lamp_id}, {
                            panel: false,
                            date: new_date
                        }).then();
                    }

                    for (const panel of result[0]['panel_list']) {
                        //inserire le chiamate ai pannelli
                        Panel.update({panel_id: panel}, {
                            status: status,
                            date: new_date
                        }).then();
                    }

                    setTimeout(function () {
                        routes.dataUpdate(lamp_id);
                    }, 1000);

                    res.status(HttpStatus.OK).send({
                        message: "Panel updated successfully"
                    });
                } else
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: "lamppost id not detected or panel is wrong"
                    });
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });
    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Generic error"
        });
    }
}

async function manualAlert(req, res) {

    const lamp_id = req.body.lamp_id;
    const alert_id = req.body.alert_id;
    const anomaly_level = req.body.anomaly_level;
    const status = req.body.panel;
    const timer = req.body.timer;
    const telegram = req.body.telegram || false;
    let panel;

    const date = new Date;

    if (lamp_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "lamp id missing"
        });
    }

    if (alert_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "alert_id missing"
        });
    }

    if (anomaly_level === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "anomaly_level missing"
        });
    }

    if (status === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "panel status missing"
        });
    }

    if (timer === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "timer status missing"
        });
    }

    try {
        if (status == 0) {
            panel = false;
        } else
            panel = true;

        await SafespotterManager.updateOne({id: lamp_id}, {
            alert_id: alert_id,
            anomaly_level: anomaly_level,
            date: date,
            panel: panel
        }).then(
            result => {
                if (result.nModified) {

                    setTimeout(async function () {

                        const lampStatus = await LampStatus.find({});
                        let lampStatus_id = 1;

                        if (lampStatus.length > 0)
                            //get the max id value and then add 1
                            lampStatus_id = _.maxBy(lampStatus, 'status_id').status_id + 1;

                        let doc = new LampStatus;
                        doc.lamp_id = lamp_id;
                        doc.alert_id = alert_id;
                        doc.date = date;
                        doc.status_id = lampStatus_id;
                        doc.save();

                        setTimeout(async function () {
                            await SafespotterManager.find({id: lamp_id}).then(
                                result => {
                                    if (result) {
                                        for (const panel of result[0]['panel_list']) {
                                            //inserire le chiamate ai pannelli
                                            Panel.update({panel_id: panel}, {
                                                status: status,
                                                date: date
                                            }).then(result => {
                                            });
                                        }
                                        //tetralertAPI('ALLERTA MANUALE', convertAlertType(alert_id), Math.floor(date / 1000), result[0]['panel_group'], parseInt(status), Math.floor(date / 1000) + timer).then();
                                    }
                                })
                        }, 1000);

                        await SafespotterManager.updateOne({id: lamp_id}, {
                            status_id: lampStatus_id
                        });

                        if (telegram) {
                            await bot.sendMessage(telegramChatID, 'Attenzione, rilevato ' + convertAlertType(alert_id));
                        }
                        await routes.dataUpdate(lamp_id);
                    }, 1000);

                    res.status(HttpStatus.OK).send({
                        message: "Manual alert sent successfully"
                    });

                    setTimeout(async function () {

                        await SafespotterManager.updateOne({id: lamp_id, date: date}, {
                            alert_id: 0,
                            anomaly_level: 0,
                            panel: false
                        })

                        await panelsManagement(lamp_id, date);

                        await routes.dataUpdate(lamp_id);
                    }, timer);

                } else
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: "lamppost id not detected or parameters are wrong"
                    });
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });
    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Generic error"
        });
    }
}

async function prorogationAlert(req, res) {
    const lamp_id = req.body.lamp_id;
    const timer = req.body.timer;
    const date = new Date();

    if (lamp_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "lamp_id missing"
        });
    }

    if (timer === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "timer missing"
        });
    }

    try {
        await SafespotterManager.updateOne({id: lamp_id}, {
            date: date
        })

        await SafespotterManager.find({id: lamp_id, panel: true})
            .then(result => {
                if (result.length > 0) {
                    for (const panel of result[0]['panel_list']) {
                        //inserire le chiamate ai pannelli
                        Panel.update({panel_id: panel}, {
                            date: date
                        }).then(result => {
                        });
                    }
                    //tetralertAPI('ALLERTA PROROGATA', convertAlertType(result[0]['alert_id']), Math.floor(date / 1000), result[0]['panel_group'], parseInt(status), Math.floor(date / 1000) + timer).then();
                }
            })

        res.status(HttpStatus.OK).send({
            message: "Prorogation alert updated successfully"
        });

        setTimeout(async function () {

            await SafespotterManager.updateOne({id: lamp_id, date: date}, {
                alert_id: 0,
                anomaly_level: 0,
                panel: false
            }).then(async () => {

                await panelsManagement(lamp_id, date);
                const doc = await SafespotterManager.find({id: lamp_id});
                await Notification.updateOne({notification_id: doc.notification_id}, {
                    checked: true
                }).then(() =>
                    routes.dataUpdate(lamp_id))
            });
        }, timer);

    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Generic error"
        });
    }
}

async function editAlert(req, res) {

    const notification_id = req.body.notification_id || null;
    const status_id = req.body.status_id;
    const lamp_id = req.body.lamp_id;
    const alert_id = req.body.alert_id;
    const anomaly_level = req.body.anomaly_level;
    const status = req.body.panel;
    const timer = req.body.timer;
    const telegram = req.body.telegram || false;

    const date = new Date;

    if (lamp_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "lamp id missing"
        });
    }

    if (alert_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "alert_id missing"
        });
    }

    if (anomaly_level === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "anomaly_level missing"
        });
    }

    if (status === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "panel status missing"
        });
    }

    if (timer === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "timer status missing"
        });
    }

    try {

        await SafespotterManager.updateOne({id: lamp_id}, {
            alert_id: alert_id,
            anomaly_level: anomaly_level,
            date: date,
            panel: true
        }).then(
            result => {
                if (result.nModified) {

                    setTimeout(async function () {
                        await Notification.updateOne({notification_id: notification_id}, {
                            alert_id: alert_id,
                        });

                        await LampStatus.updateOne({status_id: status_id}, {
                            alert_id: alert_id,
                        });

                        await SafespotterManager.find({id: lamp_id}).then(
                            result => {
                                if (result) {
                                    for (const panel of result[0]['panel_list']) {
                                        //inserire le chiamate ai pannelli
                                        Panel.update({panel_id: panel}, {
                                            status: status,
                                            date: date
                                        }).then(result => {
                                        });
                                    }
                                    //tetralertAPI('ALLERTA MODIFICATA', convertAlertType(result[0]['alert_id']), Math.floor(date / 1000), result[0]['panel_group'], parseInt(status), Math.floor(date / 1000) + timer).then();
                                }
                            })

                        if (telegram) {
                            await bot.sendMessage(telegramChatID, 'Attenzione, rilevato ' + convertAlertType(alert_id));
                        }

                        await routes.dataUpdate(lamp_id);

                    }, 1000);
                    res.status(HttpStatus.OK).send({
                        message: "Alert edited successfully"
                    });

                    setTimeout(async function () {
                        await SafespotterManager.updateOne({id: lamp_id, date: date}, {
                            alert_id: 0,
                            anomaly_level: 0,
                            panel: false,
                        });

                        // await SafespotterManager.find({id: lamp_id}).then(
                        //     result => {
                        //         if (result) {
                        //             for (const panel of result[0]['panel_list']) {
                        //                 //inserire le chiamate ai pannelli
                        //                 Panel.update({panel_id: panel}, {
                        //                     status: 0
                        //                 }).then(result => {
                        //                 });
                        //             }
                        //         }
                        //     });

                        await panelsManagement(lamp_id, date);

                        await routes.dataUpdate(lamp_id)
                    }, timer);

                } else
                    return res.status(HttpStatus.BAD_REQUEST).send({
                        error: "lamppost id not detected or parameters are wrong"
                    });
            }
        ).catch(err => {
            console.log(err);
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        });
    } catch (e) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "Generic error"
        });
    }
}

async function propagateAlert(req, res) {

    const lamp_id = req.body.lamp_id;
    const alert_id = req.body.alert_id;
    const anomaly_level = req.body.anomaly_level;
    const panel_level = req.body.panel;
    const timer = req.body.timer;
    const dest_lamp = req.body.dest_lamp;
    let panel = false;

    if (lamp_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "lamp id missing"
        });
    }

    if (alert_id === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "alert_id missing"
        });
    }

    if (anomaly_level === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "anomaly_level missing"
        });
    }

    if (panel_level === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "panel_level missing"
        });
    }

    if (timer === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "timer status missing"
        });
    }

    if (dest_lamp === undefined) {
        return res.status(HttpStatus.BAD_REQUEST).send({
            error: "lamppost missing"
        });
    }

    const date = new Date;

    try {
        if (anomaly_level < 1 || anomaly_level > 4) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "cant propagate alert in range outside 1 - 4"
            });
        } else {
            for (const lamp of dest_lamp) {

                if (panel_level > 0) {
                    panel = true;
                }
                const lampStatus = await LampStatus.find({});
                let status = new LampStatus;
                let lampStatus_id = 1;

                if (lampStatus.length > 0)
                    //get the max id value and then add 1
                    lampStatus_id = _.maxBy(lampStatus, 'status_id').status_id + 1;

                status.lamp_id = lamp;
                status.alert_id = alert_id;
                status.date = date;
                status.status_id = lampStatus_id;
                await status.save();

                await SafespotterManager.updateOne({id: lamp}, {
                    alert_id: alert_id,
                    anomaly_level: anomaly_level,
                    date: date,
                    panel: panel,
                    status_id: lampStatus_id
                }).then();

                await SafespotterManager.find({id: lamp, date: date}).then(
                    data => {
                        const panel_list = data[0].panel_list;
                        for (const panel of panel_list) {
                            //inserire le chiamate ai pannelli
                            Panel.update({panel_id: panel}, {
                                status: panel_level,
                                date: date
                            }).then()
                        }
                        //tetralertAPI('ALLERTA PROPAGATA', convertAlertType(data[0]['alert_id']), Math.floor(date / 1000), data[0]['panel_group'], parseInt(status), Math.floor(date / 1000) + timer).then();
                    })

                await routes.dataUpdate(lamp_id);

                res.status(HttpStatus.OK).send({
                    message: "Alert propagate successfully"
                });

                setTimeout(async function () {
                    for (const lamp of dest_lamp) {
                        await SafespotterManager.updateOne({id: lamp, date: date}, {
                            alert_id: 0,
                            anomaly_level: 0,
                            panel: false
                        });
                        if (panel)
                            await panelsManagement(lamp, date);
                    }
                    await routes.dataUpdate(lamp_id);
                }, timer);
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "lamppost id not detected"
        });
    }

}

async function panelsManagement(lamp_id, date) {
    const new_date = new Date;
    await SafespotterManager.find({id: lamp_id}).then(
        result => {
            if (result.length > 0) {

                const panel_list = result[0].panel_list;
                SafespotterManager.find({
                    id: {$ne: lamp_id},
                    panel_list: panel_list,
                    anomaly_level: {$gt: 1},
                    panel: true
                })
                    .then(res => {
                        if (res.length > 0) {
                            for (const panel of panel_list) {
                                //inserire le chiamate ai pannelli
                                Panel.update({panel_id: panel, date: date}, {
                                    status: (res[0].anomaly_level - 1),
                                    date: new_date
                                }).then(result => {
                                })
                            }
                        } else {
                            for (const panel of panel_list) {
                                //inserire le chiamate ai pannelli
                                Panel.update({panel_id: panel, date: date}, {
                                    status: 0,
                                    date: new_date
                                }).then(result => {
                                })
                            }
                        }
                    })
            }
        });
}

async function getLamppost(req, res) {
    const lamp_id = req.params.id;

    try {

        const lamp = await SafespotterManager.find({id: lamp_id});

        if (lamp.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        }

        return res.status(HttpStatus.OK).send(lamp[0]);

    } catch (err) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "lamppost id not detected"
        });
    }
}

async function getPanelsStatus(req, res) {

    const lamp_id = req.params.id;

    try {

        const lamp = await SafespotterManager.find({id: lamp_id});

        if (lamp.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "lamppost id not detected"
            });
        }

        const panel_list = lamp[0].panel_list;

        if (panel_list.length === 0) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "panels unsetted"
            });
        }

        let status;

        for (const panel_id of panel_list) {
            //da modificare quando si possono usare più pannelli
            let panel = await Panel.find({panel_id: panel_id})
            status = panel[0]['status'];
        }

        return res.status(HttpStatus.OK).send({
            "lamp_id": parseInt(lamp_id),
            "panel_list": panel_list,
            "status": status
        });

    } catch (err) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: "lamppost id not detected"
        });
    }

}

module.exports = {
    returnList,
    updateLamppostStatus,
    getStreetLampStatus,
    checkNotification,
    updateLamppostConfiguration,
    getLamppostConfiguration,
    updateLamppostTimer,
    getLamppostTimers,
    addLamppost,
    deleteLamppost,
    updateLamppost,
    updateActionRequiredAlert,
    updatePanel,
    manualAlert,
    prorogationAlert,
    editAlert,
    propagateAlert,
    getPanelsStatus,
    getLamppost,
    getHystoryLamp
};
