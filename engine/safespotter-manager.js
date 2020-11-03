var SafespotterManager = require('../models/mongo/mongo-safeSpotter');
var LampStatus = require('../models/mongo/mongo-lampStatus');
const HttpStatus = require('http-status-codes');
const _ = require("lodash");
const fs = require('fs');
const request = require('request');

/**Metodo che avvia il download del file video*/
const download = (url, path, callback) => {
    request.head(url, (err, res, body) => {
        request(url).pipe(fs.createWriteStream(path)).on('close', callback)
    })
};

/**Metodo che inizializza lo status del lampione*/
function initializeLampStatus(model, data) {
    model.id = data.id;
    model.status = data.status;
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

        doc = initializeLampStatus(doc, data);

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

module.exports = {returnList, saveDataFromStreetLamp, getStreetLampStatus};
