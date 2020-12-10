const mongooseHelper = {
    mongoose: require('mongoose'),
    _consumers: 0,
    _ready: false,

    connect: async function () {
        this._consumers++
        //only start the connection if you are the first to request the db
        if (this._consumers === 1) {
            console.log("These tests rely on MongoDB. Make sure that the database is active and listening.")
            this.mongoose.Promise = require('bluebird');
            this.mongoose.connect('mongodb://localhost/tcu-backend-test', {
                useNewUrlParser: true,
                promiseLibrary: require('bluebird'),
                useUnifiedTopology: true,
                useCreateIndex: true,
            })
                .then(() => {
                    console.log('Connected successfully to the mongo database')
                    // set the flag
                    this._ready = true
                })
                .catch((err) => console.error(err));
        }
        // wait for the db
        while (!this._ready) {
            // sleep
            await new Promise(resolve => setTimeout(resolve))
        }
    },

    disconnect: async function () {
        this._consumers--
        if (this._consumers === 0) {
            this.mongoose.disconnect()
        }
    }
}

module.exports = {mongooseHelper}
