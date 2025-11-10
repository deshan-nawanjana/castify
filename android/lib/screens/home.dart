import 'package:flutter/material.dart';

import 'package:castify/components/home/home_logo.dart';
import 'package:castify/components/home/home_list.dart';

import 'package:castify/utility/helpers.dart';

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  /// Loading state
  bool loading = true;

  /// Movies library
  List<dynamic> library = [];

  /// server address
  String address = "";

  @override
  void initState() {
    // initiate states
    super.initState();
    // connect to available server
    connect();
  }

  /// Method to fetch available server address
  Future<void> connect() async {
    // for each ip number
    for (int number = 1; number < 15; number += 1) {
      // create ip address
      final server = "192.168.1.$number:8000";
      // parse library data url
      final source = "http://$server/library/data.json";
      // request data source
      final data = await fetch(source);
      // continue on invalid response
      if (data == null) continue;
      // check data format
      if (data is List) {
        // sort movies by year
        data.sort((a, b) => Comparable.compare(b["year"], a["year"]));
        // store library data
        setState(() {
          library = data;
          address = server;
          loading = false;
        });
        // break as success
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/background.png'),
            fit: BoxFit.cover,
          ),
        ),
        child: loading
            ? HomeLogo()
            : library.isNotEmpty
            ? HomeList(server: address, items: library)
            : SizedBox.shrink(),
      ),
    );
  }
}
