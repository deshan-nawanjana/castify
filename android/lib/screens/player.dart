import 'dart:async';

import 'package:flutter/material.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'package:castify/components/player/player_overlay.dart';
import 'package:castify/components/player/player_subtitle.dart';

import 'package:castify/modules/remote.dart';
import 'package:castify/utility/helpers.dart';

/// Video Player
class Player extends StatefulWidget {
  /// Server address with port
  final String server;

  /// Movie data
  final dynamic data;

  /// Video Player
  const Player({super.key, required this.server, required this.data});

  @override
  State<Player> createState() => _PlayerState();
}

class _PlayerState extends State<Player> {
  /// Video player controller
  late VideoPlayerController videoController;

  /// Chewie controller
  ChewieController? chewieController;

  /// Overlay visibility
  bool overlayVisible = true;

  /// Timer to handle overlay
  Timer? timer;

  /// Selected subtitle
  String? subtitle;

  @override
  void initState() {
    super.initState();
    // get movie source
    final source = widget.data["source"];
    // create video controller
    videoController = VideoPlayerController.networkUrl(
      Uri.parse(toMovieURL(widget.server, source)),
    );
    // initialize video controller
    videoController.initialize().then((_) {
      // create chewie controller
      chewieController = ChewieController(
        videoPlayerController: videoController,
        autoPlay: true,
        looping: false,
        allowFullScreen: false,
        allowPlaybackSpeedChanging: false,
        showOptions: false,
        showControls: false,
      );
      // rebuild widget
      setState(() {});
      // hide overlay with delay
      Future.delayed(const Duration(seconds: 2), () async {
        // apply empty input
        input("None", 0);
        // enable wake lock
        WakelockPlus.enable();
      });
    });
  }

  /// Method to handle remote input
  void input(String key, int increment) {
    // return if not mounted
    if (!mounted) return;
    // switch by key label
    if (key == "Go Back" && increment < 1) {
      // close player
      back();
    } else if (key == "Select") {
      // toggle play state
      play();
    } else if (key == "Arrow Right") {
      // seek forward
      seek(increment, 1);
    } else if (key == "Arrow Left") {
      // seek forward
      seek(increment, -1);
    } else if (key == "Teletext") {
      // change subtitle tracks
      lang();
    }
    // make overlay visible
    setState(() => overlayVisible = true);
    // cancel previous timer
    timer?.cancel();
    // start timer to fade out overlay
    timer = Timer(const Duration(seconds: 2), () {
      // fade out overlay
      setState(() => overlayVisible = false);
    });
  }

  /// Method to get back
  void back() {
    // close video player
    Navigator.pop(context);
  }

  /// Method to toggle video play
  void play() {
    // return if not initialized
    if (!videoController.value.isInitialized) return;
    // switch by playing state
    videoController.value.isPlaying
        // pause video
        ? videoController.pause()
        // resume video
        : videoController.play();
  }

  /// Method to seek video
  void seek(int increment, int direction) async {
    // return if not initialized
    if (!videoController.value.isInitialized) return;
    // get current video position
    final current = videoController.value.position;
    // get offset by increment
    final offset = increment < 1
        ? Duration(seconds: 5)
        : increment < 10
        ? Duration(seconds: 30)
        : Duration(seconds: 90);
    // get target video position by direction
    final target = direction > 0 ? current + offset : current - offset;
    // get video duration
    final duration = videoController.value.duration;
    // get clamped position
    final clamped = target < Duration.zero
        // clamp to zero
        ? Duration.zero
        // clamp to duration
        : (target > duration ? duration : target);
    // seek to clamped position
    await videoController.seekTo(clamped);
  }

  /// Method to switch subtitle language
  void lang() {
    // get subtitle tracks
    final tracks = widget.data["subtitles"];
    // return if no tracks
    if (tracks.isEmpty) return;
    // check current subtitle
    if (subtitle == null) {
      // select first track
      setState(() => subtitle = tracks[0]);
    } else if (subtitle == tracks.last) {
      // hide subtitles
      setState(() => subtitle = null);
    } else {
      // get current index
      final index = tracks.indexOf(subtitle ?? "");
      // select next track
      setState(() => subtitle = tracks[index + 1]);
    }
  }

  @override
  void dispose() {
    // dispose video controller
    videoController.dispose();
    // dispose chewie controller
    chewieController?.dispose();
    // dispose timer
    timer?.cancel();
    // disable wake lock
    WakelockPlus.disable();
    // dispose widget
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // video controller initialized state
    final initialized = videoController.value.isInitialized;
    return Center(
      child: RemoteProvider(
        onPress: input,
        child: chewieController != null && initialized
            ? Stack(
                alignment: Alignment.center,
                children: [
                  Chewie(controller: chewieController as ChewieController),
                  PlayerSubtitle(
                    controller: videoController,
                    server: widget.server,
                    data: widget.data,
                    lang: subtitle,
                  ),
                  PlayerOverlay(
                    controller: videoController,
                    visible: overlayVisible,
                    server: widget.server,
                    data: widget.data,
                    lang: subtitle,
                  ),
                ],
              )
            : const CircularProgressIndicator(color: Color(0xFFFF0000)),
      ),
    );
  }
}
