module.exports = function (Stream) {
    streamOne = new Stream({
        name: 'name1',
        streamUrl: 'rtsp://192.168.1.75:5554/camera',
        wsPort: 9999,
        ffmpegOptions: { // options ffmpeg flags
            '-stats': '', // an option with no neccessary value uses a blank string
            '-r': 30 // options with required values specify the value after the key
        }
    })

    streamTwo = new Stream({
        name: 'name2',
        streamUrl: 'rtsp://192.168.1.75:5554/camera',
        wsPort: 9998,
        ffmpegOptions: { // options ffmpeg flags
            '-stats': '', // an option with no neccessary value uses a blank string
            '-r': 30 // options with required values specify the value after the key
        }
    })
}
