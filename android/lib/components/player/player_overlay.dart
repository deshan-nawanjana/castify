import 'package:flutter/material.dart';

import 'package:video_player/video_player.dart';

import 'package:castify/utility/helpers.dart';

/// Text style
const _textStyle = TextStyle(
  fontFamily: "Roboto",
  color: Colors.white,
  decoration: TextDecoration.none,
);

/// Video Player Overlay
class PlayerOverlay extends StatelessWidget {
  /// Video controller
  final VideoPlayerController controller;

  /// Visible state
  final bool visible;

  /// Server address with port
  final String server;

  /// Movie data
  final dynamic data;

  /// Selected subtitle language
  final String? lang;

  /// Video Player Overlay
  const PlayerOverlay({
    super.key,
    required this.controller,
    required this.visible,
    required this.server,
    this.data,
    this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: controller,
      builder: (context, value, child) {
        // get video duration
        final duration = controller.value.duration;
        // calculate video progress
        final progress = value.position.inSeconds / duration.inSeconds;
        // buffering and playing states
        final buffering = value.isBuffering;
        final playing = value.isPlaying;
        return AnimatedOpacity(
          opacity: visible || !playing ? 1 : 0,
          duration: const Duration(milliseconds: 250),
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              color: Colors.black.withAlpha(180),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 18, left: 8, right: 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          buffering || playing ? Icons.pause : Icons.play_arrow,
                          size: 80,
                        ),
                        Expanded(child: SizedBox.shrink()),
                        if (lang != null)
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(60),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              (lang ?? "").toUpperCase(),
                              style: _textStyle.copyWith(
                                color: Colors.white.withAlpha(180),
                                fontSize: 18,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Expanded(child: SizedBox.shrink()),
                  Padding(
                    padding: const EdgeInsets.all(25),
                    child: Row(
                      spacing: 18,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 100,
                          height: 145,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Image.network(
                              toImageURL(server, data["source"]),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        Expanded(
                          child: Column(
                            spacing: 5,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "${data["title"]} (${data["year"]})",
                                softWrap: true,
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                                style: _textStyle.copyWith(fontSize: 35),
                              ),
                              Text(
                                data["description"],
                                softWrap: true,
                                overflow: TextOverflow.ellipsis,
                                maxLines: 5,
                                style: _textStyle.copyWith(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w400,
                                  color: Colors.white.withAlpha(180),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(right: 10, bottom: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "${toTimeString(value.position)} / ${toTimeString(duration)}",
                          style: _textStyle.copyWith(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            color: Colors.white.withAlpha(150),
                          ),
                        ),
                      ],
                    ),
                  ),
                  LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.white30,
                    minHeight: 3,
                    color: Color(0xFFFF0000),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
