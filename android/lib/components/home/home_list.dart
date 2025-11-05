import 'package:flutter/material.dart';

import 'package:castify/components/home/home_item.dart';

import 'package:castify/screens/player.dart';

import 'package:castify/modules/remote.dart';
import 'package:castify/utility/helpers.dart';
import 'package:flutter/services.dart';

/// Items count per row
const _itemsPerRow = 6;

/// Grid layout spacing
const _layoutSpacing = SliverGridDelegateWithFixedCrossAxisCount(
  crossAxisCount: _itemsPerRow,
  mainAxisSpacing: 18,
  crossAxisSpacing: 18,
  childAspectRatio: 0.67,
);

/// Movies List View
class HomeList extends StatefulWidget {
  /// Server address with port
  final String server;

  /// Movies array
  final List<dynamic> items;

  /// Movies List View
  const HomeList({super.key, required this.server, required this.items});

  @override
  State<HomeList> createState() => _HomeListState();
}

class _HomeListState extends State<HomeList> {
  /// Current selected item index
  int index = 0;

  /// Global keys for items
  late List<GlobalKey> keys;

  /// Scroll controller
  final ScrollController controller = ScrollController();

  @override
  void initState() {
    super.initState();
    // create keys for items
    keys = List<GlobalKey>.generate(
      widget.items.length,
      (i) => GlobalKey(debugLabel: 'item_$i'),
    );
  }

  /// Method to handle remote input
  void input(String key, int increment) {
    // return if not mounted
    if (!mounted) return;
    // check select input
    if (key == "Go Back" && increment > 10) {
      // exit application
      SystemNavigator.pop();
    } else if (key == "Select") {
      // get movie item by index
      final movie = widget.items[index];
      // play selected movie
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => Player(server: widget.server, data: movie),
        ),
      );
    } else {
      // get current index
      int i = index;
      // get items count
      int count = widget.items.length;
      // calculate selected index
      if (key == "Arrow Left") {
        i = (i - 1).clamp(0, count - 1);
      } else if (key == "Arrow Right") {
        i = (i + 1).clamp(0, count - 1);
      } else if (key == "Arrow Up") {
        i = (i - _itemsPerRow).clamp(0, count - 1);
      } else if (key == "Arrow Down") {
        i = (i + _itemsPerRow).clamp(0, count - 1);
      }
      // select movie item
      select(i);
    }
  }

  /// Method to select movie item
  void select(int i) async {
    // return if same as current index
    if (i == index) return;
    // set as current index
    setState(() => index = i);
    // return if index out of boundary
    if (i < 0 || i >= widget.items.length) return;
    // get key from index
    final key = keys[i];
    // get key context
    final context = key.currentContext;
    // return if no context
    if (context == null) return;
    // scroll into selected item
    await Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 250),
      alignment: 0.5,
      curve: Curves.ease,
    );
  }

  @override
  void dispose() {
    // controller
    controller.dispose();
    // dispose widget
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RemoteProvider(
      onPress: input,
      child: GridView.builder(
        controller: controller,
        padding: const EdgeInsets.all(22),
        gridDelegate: _layoutSpacing,
        itemCount: widget.items.length,
        itemBuilder: (context, i) {
          final movie = widget.items[i];
          final source = movie['source'];
          final image = toImageURL(widget.server, source);
          return HomeItem(
            image: image,
            selected: i == index,
            reference: keys[i],
          );
        },
      ),
    );
  }
}
