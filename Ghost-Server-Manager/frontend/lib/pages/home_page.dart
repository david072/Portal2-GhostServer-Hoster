import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:portal2_ghost_sever_hoster/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool loading = true;

  @override
  void initState() {
    super.initState();
    setup();
  }

  Future<void> setup() async {
    var sp = await SharedPreferences.getInstance();
    var authToken = sp.getString(spAuthTokenKey);
    if (authToken == null) {
      if (!mounted) return;
      context.go("/login");
      return;
    }

    var expiry = DateTime.fromMillisecondsSinceEpoch(
      sp.getInt(spAuthTokenExpiryKey)!,
    );
    if (DateTime.now().isAtSameMomentAs(expiry) ||
        DateTime.now().isAfter(expiry)) {
      sp.remove(spAuthTokenKey);
      sp.remove(spAuthTokenExpiryKey);

      if (!mounted) return;
      context.go("/login");
      return;
    }

    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: !loading
          ? const Center(child: Text("Hello, World!"))
          : const Center(child: CircularProgressIndicator()),
    );
  }
}
