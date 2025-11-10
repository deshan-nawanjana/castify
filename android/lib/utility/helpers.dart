import 'dart:convert';

import 'package:chewie/chewie.dart';
import 'package:http/http.dart' as http;

/// Performs fetch requests
Future<dynamic> fetch(String url, [bool decode = true]) async {
  // try request
  try {
    // request data source
    final response = await http
        .get(Uri.parse(url))
        .timeout(Duration(seconds: 5));
    // check response
    if (response.statusCode == 200) {
      // return decoded if required
      if (decode) return json.decode(response.body);
      // return response body as string
      return response.body;
    } else {
      // return as error status
      return null;
    }
  } catch (error) {
    // return as error
    return null;
  }
}

/// Creates movie image url
String toImageURL(String server, String source) {
  return "http://$server/library/covers/$source.jpg";
}

/// Creates movie stream url
String toMovieURL(String server, String source) {
  return "http://$server/library/movies/$source";
}

/// Creates movie subtitle url
String toSubtitleURL(String server, String source, String lang) {
  return "http://$server/library/subtitles/$source.$lang.vtt";
}

/// Creates time string from duration
String toTimeString(Duration duration) {
  // helper to add leading zeros
  String twoDigits(int n) => n.toString().padLeft(2, '0');
  // get values in each unit
  final hours = twoDigits(duration.inHours);
  final minutes = twoDigits(duration.inMinutes.remainder(60));
  final seconds = twoDigits(duration.inSeconds.remainder(60));
  // return time stamp string
  return "$hours:$minutes:$seconds";
}

/// Creates time stamp from time string
int toTimeStamp(String input) {
  // split into parts
  final parts = input.split(':');
  // split into second parts
  final secondsParts = parts.last.split('.');
  // calculate units
  final hours = parts.length == 3 ? int.parse(parts[0]) : 0;
  final minutes = parts.length == 3 ? int.parse(parts[1]) : int.parse(parts[0]);
  final seconds = int.parse(secondsParts[0]);
  final millis = int.parse(secondsParts[1].padRight(3, '0'));
  // return time in milliseconds
  return ((hours * 3600 + minutes * 60 + seconds) * 1000 + millis);
}

String toSubtitleText(String input) {
  // get input text
  String text = input;
  // remove html tags
  text = text.replaceAll(RegExp(r'<[^>]*>'), '');
  // remove ssa tags
  text = text.replaceAll(RegExp(r'\{[^}]*\}'), '');
  // remove multiple spaces
  text = text.replaceAll(RegExp(r'\s+'), ' ');
  // return text
  return text.trim();
}

/// Creates subtitle track
Subtitles toSubtitleTrack(String input) {
  // split input into lines
  final lines = input.split('\n');
  // output items
  final output = Subtitles([]);
  // current line variables
  int? start;
  int? end;
  String text = "";
  // for each line
  for (int i = 0; i < lines.length; i += 1) {
    // current trimmed line
    final line = lines[i].trim();
    // line validations
    final isHead = line.startsWith("WEBVTT");
    final isEmpty = line.isEmpty;
    final isTime = line.contains('-->');
    final isEnd = i == lines.length - 1;
    // check for time line or end of lines
    if (isTime || isEnd) {
      // check start time and end time
      if (start != null && end != null && text.isNotEmpty) {
        // add subtitle item
        output.subtitle.add(
          Subtitle(
            index: i,
            start: Duration(milliseconds: start),
            end: Duration(milliseconds: end),
            text: toSubtitleText(text),
          ),
        );
        // clear text holder
        text = "";
      }
    }
    // continue unwanted lines
    if (isEmpty || isHead) continue;
    // check for timestamps line
    if (isTime) {
      // split time strings
      final parts = line.split(' --> ');
      // store start time and end time
      start = toTimeStamp(parts[0]);
      end = toTimeStamp(parts[1]);
    } else {
      // concat line into text holder
      text += "\n$line";
    }
  }
  // return output
  return output;
}
