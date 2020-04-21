const express = require('express');
const mongoose = require('mongoose');

/** Building system constants **/
const app = express();
const passport = require('passport');

const http = require('http').createServer(app);
const io = require('socket.io')(http);

/** Configuration load according to the environment**/
const env = process.env.NODE_ENV || 'development';
const config = require('./config/config')[env];

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
http.listen(3000, () => {
    console.log('listening on *:3000');
});

/** Export of app, passport and the right configuration **/
module.exports = { app, passport, config, http, io };

/** Configuration of express, routes and passport **/
require('./config/passport')(passport);
require('./config/express')(app, passport);
require('./config/routes')(app, passport, config);

/* Connection to Mongo */
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/tcu-backend', {  useNewUrlParser: true, promiseLibrary: require('bluebird') })
    .then(() =>  console.log('Engine connected successfully to the mongo database'))
    .catch((err) => console.error(err));
