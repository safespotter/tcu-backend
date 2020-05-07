const onvif = require('node-onvif');
const fs = require('fs');

// Create an OnvifDevice object
let device = new onvif.OnvifDevice({
    xaddr: 'http://192.168.10.14:10080/onvif/device_service',
    user : 'admin',
    pass : '123456'
});

// Initialize the OnvifDevice object
device.init().then(() => {
    // Get the data of the snapshot
    console.log('fetching the data of the snapshot...');
    return device.fetchSnapshot();
}).then((res) => {
    // Save the data to a file
    fs.writeFileSync('snapshot.jpg', res.body, {encoding: 'binary'});
    console.log('Done!');
}).catch((error) => {
    console.error(error);
});



// Stream = require('node-rtsp-stream')
// stream = new Stream({
//     name: 'name',
//     streamUrl: 'rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov',
//     wsPort: 9999,
//     ffmpegOptions: { // options ffmpeg flags
//         '-stats': '', // an option with no neccessary value uses a blank string
//         '-r': 30 // options with required values specify the value after the key
//     }
// })
