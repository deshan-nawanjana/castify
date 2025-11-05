import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// holding events activating key labels
final _holdKeys = [
  "Arrow Up",
  "Arrow Down",
  "Arrow Left",
  "Arrow Right",
  "Go Back",
];

/// TV Remote Input Listener
class RemoteProvider extends StatefulWidget {
  /// Child widget to enable key events
  final Widget child;

  /// Callback function to handle keypress
  final void Function(String code, int increment) onPress;

  /// TV Remote Input Listener
  const RemoteProvider({super.key, required this.child, required this.onPress});

  @override
  State<RemoteProvider> createState() => _RemoteProviderState();
}

class _RemoteProviderState extends State<RemoteProvider> {
  // key holding timer
  Timer? _timer;
  // key holding state
  bool _active = false;

  // Key down handler
  void _onKeyDown(KeyEvent event) {
    // get event key label
    final label = event.logicalKey.keyLabel;
    // callback key press
    widget.onPress(label, 0);
    // cancel ongoing timer
    _timer?.cancel();
    // return if not a holding key
    if (!_holdKeys.contains(label)) return;
    // set holding state
    _active = true;
    // holding activation delay
    Future.delayed(const Duration(milliseconds: 300), () {
      // cancel ongoing timer
      _timer?.cancel();
      // return if not active
      if (!_active) return;
      // increment index
      int increment = 0;
      // create and start timer for holding
      _timer = Timer.periodic(const Duration(milliseconds: 150), (_) {
        // increase increment
        increment += 1;
        // callback holding key
        widget.onPress(label, increment);
      });
    });
  }

  // key up handler
  void _onKeyUp() {
    // cancel ongoing timer
    _timer?.cancel();
    // reset holding state
    _active = false;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      // set as focused node
      autofocus: true,
      // child widget
      child: widget.child,
      // key event listener
      onKeyEvent: (node, event) {
        // handle key down event
        if (event is KeyDownEvent) _onKeyDown(event);
        // handle key up event
        if (event is KeyUpEvent) _onKeyUp();
        // return as event handled
        return KeyEventResult.handled;
      },
    );
  }
}
