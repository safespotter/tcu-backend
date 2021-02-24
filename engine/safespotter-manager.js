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

/**Metodo che avvia il download del file video*/
const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url).pipe(fs.createWriteStream(path)).on('close', callback)
    })
};

/**Funzione che converte in stringa le condizioni di criticità*/
function convertCondition(input) {
    switch (parseInt(input)) {
        case 0:
            return 'NESSUNA';
        case 1:
            return 'BASSA';
        case 2:
            return 'DISCRETA';
        case 3:
            return 'MODERATA';
        case 4:
            return 'ALTA';
        case 5:
            return 'MASSIMA';
    }
}

/**Metodo che inizializza lo status del lampione*/
function initializeLampStatus(model, data) {
    model.id = data.id;
    model.status = data.status;
    model.alert_type = data.alert_type;
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

/**funzione che aggiorna le notifiche*/
async function createNotification(lamp_id, critical_issues, alert_type) {
    let tmp_critical;
    let alert;
    let id;
    try {
        let lamp = await SafespotterManager.find({id: lamp_id});
        /*controllo che il lampione sia presente nel database e nel caso lo aggiungo*/

        if (lamp.length !== 0 && critical_issues >= 0 && critical_issues <= 5) {
            tmp_critical = lamp;
            tmp_critical[0].critical_issues !== critical_issues ? id = lamp_id : id = -1;
            //se l'allerta è massima viene usato un flag
            critical_issues === 5 ? alert = 1 : alert = 0;

            await SafespotterManager.updateOne({id: lamp_id},
                {
                    critical_issues: critical_issues,
                    condition_convert: convertCondition(critical_issues),
                    alert_type: alert_type,
                    date: new Date(),
                    checked: false,
                })
        } else {

        }

        if ((await SafespotterManager.find({id: lamp_id})).length !== 0 && critical_issues >= 3 && critical_issues <= 5) {
            let notification = new Notification;
            notification.id = lamp_id;
            notification.critical_issues = critical_issues;
            notification.street = lamp[0].street;
            notification.checked = false;
            await notification.save();
        }

        //dati su mongo
        routes.dataUpdate(id, alert); //richiamo l'emissione

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

/** API che riceve e salva le comunicazioni dai lampioni */
async function saveDataFromStreetLamp(req, res) {

    try {
        //salvo su variabile il contenuto del body
        const data = req.body;
        let path = "";
        let doc = new LampStatus;

        // controllo che siano stati passati dei dati
        if (typeof data === "undefined" || _.isEmpty(data)) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "no data received"
            })
        }

        //controllo che il valore di status sia sul range 0-5
        if (data.status < 0 || data.status > 5) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: "valore di status errato"
            })
        }

        doc = initializeLampStatus(doc, data);
        await createNotification(data.id, data.status, data.alert_type);

        //controllo se i dati ricevuti hanno l'attributo video ed eventualmente lo salvo
        if (_.has(data, "videoURL")) {

            //creo il path di salvataggio
            path = pathCreator(data.id.toString(), customDayDate(Date.now()), customTimeDate(Date.now()));

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

/** API che preleva le informazioni salvate dei lampioni in ordine di data*/
async function getStreetLampStatus(req, res) {

    try {
        let data;
        let id = req.params.id;

        data = await LampStatus.find({
            'id': id
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

/**API che setta il valore checked della notifica*/
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
                error: "valore di notifica errato"
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
            console.log("doc config ", doc.configuration[_.findKey(doc.configuration, {'alert_id': alert_id})]);
            let index = _.indexOf(doc.configuration, doc.configuration[_.findKey(doc.configuration, {'alert_id': alert_id})]);
            if (index >= 0){
                doc.configuration[index].configuration_type = configuration_type;
                doc.markModified('configuration');
                doc.save();
            } else {
                doc.configuration.push({alert_id: alert_id, configuration_type: configuration_type});
                doc.save();
            }
        }

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

module.exports = {
    returnList,
    saveDataFromStreetLamp,
    getStreetLampStatus,
    checkNotification,
    updateLamppostConfiguration
};
