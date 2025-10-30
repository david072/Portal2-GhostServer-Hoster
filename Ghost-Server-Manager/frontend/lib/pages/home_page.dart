import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:portal2_ghost_sever_hoster/backend/backend.dart';
import 'package:portal2_ghost_sever_hoster/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool loading = true;

  List<GhostServer> servers = [];

  @override
  void initState() {
    super.initState();
    setup();
  }

  Future<bool> checkLoggedIn() async {
    var sp = await SharedPreferences.getInstance();
    var authToken = sp.getString(spAuthTokenKey);
    if (authToken == null) {
      return false;
    }

    var expiry = DateTime.fromMillisecondsSinceEpoch(
      sp.getInt(spAuthTokenExpiryKey)!,
    );
    if (DateTime.now().isAtSameMomentAs(expiry) ||
        DateTime.now().isAfter(expiry)) {
      sp.remove(spAuthTokenKey);
      sp.remove(spAuthTokenExpiryKey);
      return false;
    }

    return true;
  }

  Future<void> setup() async {
    if (!await checkLoggedIn()) {
      if (!mounted) return;
      context.go("/login");
      return;
    }

    servers = await Backend.getGhostServers();

    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Ghost Servers"),
        centerTitle: true,
        actions: [
          IconButton(onPressed: setup, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(10),
        child: !loading
            ? Center(
                child: SizedBox(
                  width: MediaQuery.sizeOf(context).width / 2,
                  child: ListView.builder(
                    itemCount: servers.length,
                    itemBuilder: (context, i) =>
                        _GhostServerCard(server: servers[i], update: setup),
                  ),
                ),
              )
            : const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _GhostServerCard extends StatelessWidget {
  const _GhostServerCard({required this.server, required this.update});

  final GhostServer server;
  final void Function() update;

  void copyConnectCommand(BuildContext context) {
    Clipboard.setData(ClipboardData(text: server.connectCommand()));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: const Text("Copied!")),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  server.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const Spacer(),
                IconButton(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => _DeleteGhostServerDialog(
                        server: server,
                        update: update,
                      ),
                    );
                  },
                  icon: const Icon(Icons.delete_outlined),
                ),
              ],
            ),
            const Divider(height: 20),
            Text("Connecting:", style: Theme.of(context).textTheme.bodyLarge),
            Text(
              "To connect, paste the text below into your game's console and hit enter!",
            ),
            const SizedBox(height: 20),
            TextField(
              controller: TextEditingController(
                text: server.connectCommand(),
              ),
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  onPressed: () => copyConnectCommand(context),
                  icon: const Icon(Icons.copy),
                ),
              ),
              readOnly: true,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                FilledButton.tonal(
                  onPressed: () {},
                  child: const Text("Webinterface"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DeleteGhostServerDialog extends StatelessWidget {
  const _DeleteGhostServerDialog({required this.server, required this.update});

  final GhostServer server;
  final void Function() update;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Delete Ghost Server"),
      content: Text(
        "Do you really want to delete the Ghost Server "
        "\"${server.name}\"? This cannot be reverted!",
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Cancel"),
        ),
        TextButton(
          onPressed: () async {
            await Backend.deleteGhostServer(server.id);
            if (!context.mounted) return;
            Navigator.pop(context);
            update();
          },
          child: const Text("Delete"),
        ),
      ],
    );
  }
}
