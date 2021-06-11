const SafespotterManager = require('../models/mongo/mongo-safeSpotter');
const LampStatus = require('../models/mongo/mongo-lampStatus');
const Notification = require('../models/mongo/mongo-notification');
const Push = require('../models/mongo/mongo-pushNotification');
const HttpStatus = require('http-status-codes');
const _ = require("lodash");
const fs = require('fs');
const request = require('request');
const SocketEmit = require('../engine/SocketEmit');
const routes = require('../config/routes');
const webpush = require('web-push');

/**Metodo che avvia il download del file video*/
const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url).pipe(fs.createWriteStream(path)).on('close', callback)
    })
};

/**Funzione che converte in stringa le condizioni di criticità*/
function convertAlertType(input) {
    switch (input) {
        case 1:
            return 'Cambio di corsia illegale';
        case 2:
            return 'Traffico congestionato';
        case 3:
            return 'Oggetto o persona in strada';
        case 4:
            return 'Invasione di area pedonale';
        case 5:
            return 'Possible incidente';
        case 6:
            return 'Veicolo in sosta vietata';
        default:
            return 'Errore anomalia';
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
function initializeLampStatus(model, data) {
    model.lamp_id = data.lamp_id;
    model.alert_id = data.alert_id;
    return model;
}

/**Metodo che normalizza il path del video*/
function getVideoPath(path) {
    return path.replace(".", "");
}

/**Metodo che crea il path*/
function pathCreator(id, day, datetime) {
    //verifico che esista la cartella video
    !fs.existsSync("video") && fs.mkdirSync("video");

    //verifico che esista la cartella relativa al lampione
    !fs.existsSync("video/" + id) && fs.mkdirSync("video/" + id);

    //verifico che esista la cartella relativa al giorno
    !fs.existsSync("video/" + id + "/" + day) && fs.mkdirSync("video/" + id + "/" + day);

    //restituisco il path
    return "./video/" + id + "/" + day + "/" + datetime + ".mp4";
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
async function createNotification(lamp_id, alert_id) {

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
                let notification = new Notification;
                notification.lamp_id = lamp_id;
                notification.alert_id = alert_id;
                notification.street = lamp[0].street;
                notification.checked = false;
                await notification.save();

                //check della notifica
                setTimeout(async () => {
                    notification.checked = true;
                    await notification.save();
                }, timer);
            }

            if (anomaly_level >= 2) {
                // notifiche push
                routes.pushNotification(convertAlertLevel(anomaly_level), convertAlertType(alert_id), timestamp);
            }

            //dati su mongo
            routes.dataUpdate(lamp_id); //richiamo l'emissione

            //check del lampione
            setTimeout(async () => {
                //aggiungere "where" sul timestamp
                await SafespotterManager.updateOne({id: lamp_id, date: timestamp},
                    {
                        alert_id: 0,
                        anomaly_level: 0,
                        date: new Date(),
                        checked: false,
                    });
                routes.dataUpdate(lamp_id);
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
 *
 * */
async function updateLamppostStatus(req, res) {

    try {
        //salvo su variabile il contenuto del body
        const data = req.body;
        let doc = new LampStatus;
        let path = "";

        // controllo che siano stati passati dei dati
        if (typeof data === "undefined" || _.isEmpty(data)) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "no data received"
            })
        }


        doc = initializeLampStatus(doc, data);

        //creo la notifica se l'anomalia che arriva è maggiore di quella già esistente e aggiorno il lampione
        await createNotification(data.lamp_id, data.alert_id);

        //controllo se i dati ricevuti hanno l'attributo video ed eventualmente lo salvo
        if (_.has(data, "videoURL")) {

            //creo il path di salvataggio
            path = pathCreator(data.lamp_id.toString(), customDayDate(Date.now()), customTimeDate(Date.now()));

            //eseguo il download del video a partire dall'url
            download(data["videoURL"], path, () => {
                console.log('File salvato nella directory ' + path);
            });

            path = getVideoPath(path);
            doc.videoURL = path;
        }

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

/**API che setta il valore checked della notifica
 *
 *  Body:
 *      id: number
 *      date: string
 *
 * */
async function checkNotification(req, res) {
    try {

        const lamp_id = req.body.id;
        const date = req.body.date;

        await Notification.updateOne({$and: [{id: lamp_id}, {date: date}]}, {
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
 *  street: string
 *  position: string
 *
 * */
async function addLamppost(req, res) {

    try {

        let id = 1;
        const safespotters = await SafespotterManager.find({});

        if (safespotters.length > 0)
        //get the max id value and then add 1
            id = _.maxBy(safespotters, 'id').id + 1;


        const street = req.body.street;
        const position = req.body.position;

        let doc = new SafespotterManager;

        doc.id = id;
        doc.street = street;
        doc.position = position;

        doc = defaultLamppostConfiguration(doc);

        doc.save();

        return res.status(HttpStatus.OK).send({
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
async function deleteLamppost (req, res){
   try{

       const lamp_id = req.params.id;

       await SafespotterManager.deleteOne({id: lamp_id}).then(
           result => {
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
    deleteLamppost
};
