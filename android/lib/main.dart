import 'package:flutter/material.dart';

import 'package:castify/screens/home.dart';

void main() {
  // initialize bindings
  WidgetsFlutterBinding.ensureInitialized();
  // run app
  runApp(const Castify());
}

class Castify extends StatelessWidget {
  const Castify({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Castify',
      theme: ThemeData.dark(),
      debugShowCheckedModeBanner: false,
      home: const Home(),
    );
  }
}
