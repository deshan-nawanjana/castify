import 'package:flutter/material.dart';

/// Home Screen Logo
class HomeLogo extends StatelessWidget {
  /// Home Screen Logo
  const HomeLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image(image: AssetImage('assets/icon.png'), width: 150),
          const SizedBox(height: 50),
          const CircularProgressIndicator(),
        ],
      ),
    );
  }
}
