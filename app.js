const express = require('express');
const mongoose = require('mongoose');

/** Building system constants **/
const app = express();
const passport = require('passport');

/** Configuration load according to the environment**/
const env = process.env.NODE_ENV || 'development';
const config = require('./config/config')[env];

/** Configuration Socket.io **/
const socket = require("socket.io");

const server = app.listen(3000, () => {
    console.log('Web socket started in port 3000')
});
const io = socket(server);

/** Configuration RTSP STREAM VIDEO **/

const Stream = require('node-rtsp-stream');
module.exports = {app, passport, config, Stream};

/** Configuration of express, routes and passport **/
require('./config/passport')(passport);
require('./config/express')(app, passport);
require('./config/routes')(app, passport, config, io);
//require('./config/ipCamera')(Stream);

/** Connection to Mongo **/
mongoose.Promise = require('bluebird');
mongoose.connect(
    'mongodb://localhost/tcu-backend',
    {
        useNewUrlParser: true,
        promiseLibrary: require('bluebird'),
        useUnifiedTopology: true,
        useCreateIndex: true,
    })
    .then(() =>  console.log('Engine connected successfully to the mongo database'))
    .catch((err) => console.error(err));
