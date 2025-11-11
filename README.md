# Castify: Local Movie Streaming Platform
Movie Library with Local Streaming for Android TV, Chromecast and Web

## Installation

Go to `scripts` directory.

```bash
cd scripts
```

Install Node modules

```bash
npm install
```



All of the movie files should be in one directory as follows.
Also keep the `SRT` subtitles files same as movie files only adding the language code
at the end of file name. Subtitles are optional and can have multiple if required.

**Example:** English subtitle for `movie.mp4` file should be `movie.en.srt`

Consider you have your movies in `E:\path\to\movies`directory.

```text
E:\path\to\movies
 ├─ 17.Again.2009.1080p.BrRip.x264.YIFY.mp4
 ├─ 17.Again.2009.1080p.BrRip.x264.YIFY.en.srt
 ├─ 17.Again.2009.1080p.BrRip.x264.YIFY.fr.srt
 ├─ 21.Jump.Street.2012.1080p.BluRay.x264.YIFY.mp4
 └─ 21.Jump.Street.2012.1080p.BluRay.x264.YIFY.fr.srt
```

While in the `scripts` directory in the project, run the build command to generate
movie library. You should specify your movies source directory in this command.

```bash
npm run build E:\path\to\movies
```

All the movie details, cover images will be downloaded from `YTS API` into `library`
directory. Also given `SRT` files will be converted into `VTT` caption files.

After the library preparation, run following server start command.
You should specify previous movies source directory here also.

```bash
npm start E:\path\to\movies
```

Then you will be able to see your computer LAN IP address with port to access the
web version of the movie library.

## Android TV Application

While running the server, open following url in your Android smart TV browser.

```text
http://[SERVER_IP]:8000/android/index.html
```

By clicking the download button you can the the `APK` of the Castify application.
Or you can download it from your PC browser and copy into TV using a USB device.

Installing and opening the app will be enough to access your movie library from the TV.
Make sure to keep both PC and the TV in the same local network.

## Chromecast Movies

Using the web version of the Castify, you can cast movies into your smart TV without
the Android application using Chromecast. Just open the local server in a web browser and
tap on a movie item. Then you will be able to see the castable device in your local
network.

**Important:** To work with subtitles in Chromecast, you have to host the server on a secured
HTTPS server.

## Web Player

Any of device in your local network with browser support can play your movies by opening 
a movie item from web player.

### Developed by Deshan Nawanjana

[Deshan.lk](https://deshan.lk/)
&ensp;|&ensp;
[DNJS](https://dnjs.lk/)
&ensp;|&ensp;
[LinkedIn](https://www.linkedin.com/in/deshan-nawanjana/)
&ensp;|&ensp;
[GitHub](https://github.com/deshan-nawanjana)
&ensp;|&ensp;
[YouTube](https://www.youtube.com/@deshan-nawanjana)
&ensp;|&ensp;
[Blogger](https://dn-w.blogspot.com/)
&ensp;|&ensp;
[Facebook](https://www.fb.com/mr.dnjs)
&ensp;|&ensp;
[Gmail](mailto:deshan.uok@gmail.com)
