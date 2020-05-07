const express = require('express');
const mongoose = require('mongoose');

/** Building system constants **/
const app = express();
const passport = require('passport');

/** Configuration load according to the environment**/
const env = process.env.NODE_ENV || 'development';
const config = require('./config/config')[env];


Stream = require('node-rtsp-stream')
stream = new Stream({
    name: 'name1',
    streamUrl: 'rtsp://192.168.1.75:5554/camera',
    wsPort: 9999,
    ffmpegOptions: { // options ffmpeg flags
        '-stats': '', // an option with no neccessary value uses a blank string
        '-r': 30 // options with required values specify the value after the key
    }
})
Stream = require('node-rtsp-stream')
stream = new Stream({
    name: 'name2',
    streamUrl: 'rtsp://192.168.1.75:5554/camera',
    wsPort: 9998,
    ffmpegOptions: { // options ffmpeg flags
        '-stats': '', // an option with no neccessary value uses a blank string
        '-r': 30 // options with required values specify the value after the key
    }
})

// const onvif = require('node-onvif');
// const fs = require('fs');
//
// // Create an OnvifDevice object
// let device = new onvif.OnvifDevice({
//     xaddr: 'http://192.168.1.75:8080/onvif/device_service',
//     user : 'admin',
//     pass : 'admin'
// });
//
// // Initialize the OnvifDevice object
// device.init().then(() => {
//     // Get the UDP stream URL
//     let url = device.getUdpStreamUrl();
//     console.log(url);
// }).catch((error) => {
//     console.error(error);
// });


module.exports = {app, passport, config};

/** Configuration of express, routes and passport **/
require('./config/passport')(passport);
require('./config/express')(app, passport);
require('./config/routes')(app, passport, config);


/* Connection to Mongo */
mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/tcu-backend', {  useNewUrlParser: true, promiseLibrary: require('bluebird') })
    .then(() =>  console.log('Engine connected successfully to the mongo database'))
    .catch((err) => console.error(err));


