var SafespotterManager = require('../models/mongo/mongo-safeSpotter')
const HttpStatus = require('http-status-codes');


async function returnList(req, res){
    try {
        const response = await SafespotterManager.find({})
        res.send(response)
    }catch (e) {
        console.log(e)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            name: 'Internal Server Error',
            message: 'error safespotter list'
        });
    }
}

module.exports={returnList}
