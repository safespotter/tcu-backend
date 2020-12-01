const mongooseHelper = {
    _consumers: 0,
    mongoose: require('mongoose'),
    connect: async function () {
        this._consumers++
        if (!this._connection) {
            console.log("These tests rely on MongoDB. Make sure that the database is active and listening.")

            this.mongoose.Promise = require('bluebird');
            this._connection = await this.mongoose.connect('mongodb://localhost/tcu-backend-test', {
                useNewUrlParser: true,
                promiseLibrary: require('bluebird'),
                useUnifiedTopology: true,
                useCreateIndex: true,
            })
                .then(() => console.log('Connected successfully to the mongo database'))
                .catch((err) => console.error(err));
        }
        return this._connection
    },
    disconnect: async function () {
        this._consumers--
        if (this._consumers === 0) {
            this.mongoose.disconnect()
        }
    }
}

module.exports = {mongooseHelper}
