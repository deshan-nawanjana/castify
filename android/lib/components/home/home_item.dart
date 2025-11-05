import 'package:flutter/material.dart';

/// Movie List Item
class HomeItem extends StatelessWidget {
  /// Movie cover image url
  final String image;

  /// Selected item indicator
  final bool? selected;

  /// Reference key
  final GlobalKey? reference;

  /// Movie List Item
  const HomeItem({
    super.key,
    required this.image,
    this.selected,
    this.reference,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected ?? false;
    return AnimatedContainer(
      key: reference,
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: isSelected
            ? [BoxShadow(color: Colors.black, blurRadius: 40, spreadRadius: 2)]
            : [],
        border: isSelected
            ? Border.all(color: Colors.white, width: 2)
            : Border(),
      ),
      child: Padding(
        padding: const EdgeInsets.all(2),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                image,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return Container(
                    color: Colors.black.withValues(alpha: 0.5),
                    child: const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  );
                },
                errorBuilder: (context, error, stackTrace) => Container(
                  color: Colors.black.withValues(alpha: 0.5),
                  child: const Center(
                    child: Icon(Icons.error, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
