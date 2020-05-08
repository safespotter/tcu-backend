module.exports = function (app, io) {

    var Charts = require('../models/mongo/chart');
    var SafeSpotter = require('../models/mongo/mongo-safeSpotter')
    var socketMap = [];

    io.on('connection',(socket)=>{
        console.log("Client Connected");
        socketMap.push(socket);
        dataUpdate();
    });

    app.post('/chart/create', function (req, res) {
        (async () => {
            try {
                console.log("Calling for chart Create");
                console.log(req.body);
                // dati su mongo
                let chart = new Charts(req.body);
                await chart.save();
                //dati su mongo
                dataUpdate(); //richiamo l'emissione
                res.json("Charts  Successfully Created"); //parse
            } catch (err) {
                console.log(err);
                res.status(400).send(err);
            }
        })();
    });

    app.post('/SafeSpotter/create', function (req, res) {
        let tmp_critical;
        let id;
        (async () => {
            try {
                //dati mongo
                if((await SafeSpotter.find({id: req.body.id })).length != 0   ) {
                    tmp_critical = await SafeSpotter.find({id: req.body.id });
                    tmp_critical[0].critical_issues != req.body.critical_issues ? id = req.body.id : id = -1;
                    await SafeSpotter.updateOne({id: req.body.id},
                        {street: req.body.street,
                            ip: req.body.ip,
                            critical_issues: req.body.critical_issues})
                }else{
                    console.log('entro qui')
                    let safeSpotter = new SafeSpotter(req.body)
                    await safeSpotter.save();
                }

                dataUpdate(id); //richiamo l'emissione
            } catch (err) {
                console.log(err);
                //res.status(400).send(err);
            }
        })();
    });


    async function dataUpdate(num){
        console.log('Socket Emmit');
        var charts = await Charts.find({});
        var safespotter = await SafeSpotter.find({});
        for(let socketMapObj of socketMap){
            if(charts.length > 0){
                socketMapObj.emit('dataUpdate',[
                    safespotter, num]);
            }
        }


    }





}
