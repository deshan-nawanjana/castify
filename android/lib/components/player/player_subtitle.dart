import 'package:flutter/material.dart';

import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';

import 'package:castify/utility/helpers.dart';

/// Video Player Subtitle
class PlayerSubtitle extends StatefulWidget {
  /// Video controller
  final VideoPlayerController controller;

  /// Server address with port
  final String server;

  /// Movie data
  final dynamic data;

  /// Selected subtitle language
  final String? lang;

  /// Video Player Subtitle
  const PlayerSubtitle({
    super.key,
    required this.controller,
    required this.server,
    this.data,
    this.lang,
  });

  @override
  State<PlayerSubtitle> createState() => _PlayerSubtitleState();
}

class _PlayerSubtitleState extends State<PlayerSubtitle> {
  /// Loaded subtitle tracks
  Map<String, Subtitles> tracks = {};

  @override
  void initState() {
    super.initState();
    // load subtitles
    load();
  }

  /// Method to load subtitles
  void load() async {
    // get movie data
    final data = widget.data;
    // for each subtitle track
    for (int i = 0; i < data["subtitles"].length; i += 1) {
      // current track language
      final lang = data["subtitles"][i];
      // get subtitle url
      final url = toSubtitleURL(widget.server, data["source"], lang);
      // fetch subtitle content
      final text = await fetch(url, false);
      // continue if no text
      if (text == null) continue;
      // parse and store subtitle track
      tracks[lang] = toSubtitleTrack(text);
    }
  }

  /// Method to find subtitle item from track
  Subtitle? find(Subtitles? track, Duration time) {
    // return if no track
    if (track == null) return null;
    // for each subtitle item
    for (final item in track.subtitle) {
      // continue if invalid item
      if (item == null) continue;
      // return if matched with time
      if (time >= item.start && time <= item.end) return item;
    }
    // return as no item found
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: widget.controller,
      builder: (context, value, child) {
        // return if no track selected
        if (widget.lang == null) return SizedBox.shrink();
        // return if track not available
        if (!tracks.containsKey(widget.lang)) return SizedBox.shrink();
        // get current track
        final track = tracks[widget.lang];
        // get current video time
        final time = value.position;
        // find subtitle line from track
        final subtitle = find(track, time);
        // return if no subtitle
        if (subtitle == null) return SizedBox.shrink();
        return Align(
          alignment: Alignment.bottomCenter,
          child: Container(
            margin: EdgeInsets.only(bottom: 20),
            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withAlpha(100),
              borderRadius: BorderRadius.circular(12.0),
            ),
            child: Text(
              subtitle.text,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: "Roboto",
                fontWeight: FontWeight.w500,
                fontSize: 25,
                color: Colors.white,
                decoration: TextDecoration.none,
              ),
            ),
          ),
        );
      },
    );
  }
}
