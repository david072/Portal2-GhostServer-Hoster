import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:portal2_ghost_sever_hoster/backend/backend.dart';
import 'package:portal2_ghost_sever_hoster/pages/home_page.dart';

class WebinterfacePage extends StatefulWidget {
  const WebinterfacePage({super.key, required this.serverId});

  final int serverId;

  @override
  State<WebinterfacePage> createState() => _WebinterfacePageState();
}

class _WebinterfacePageState extends State<WebinterfacePage> {
  bool loading = true;

  GhostServer? server;
  GhostServerSettings? settings;
  bool acceptingPlayers = true;
  bool acceptingSpectators = true;
  List<Player> players = [];

  int navigationRailSelectedIndex = 0;

  @override
  void initState() {
    super.initState();
    setup();
  }

  Future<void> setup() async {
    setState(() => loading = true);

    server = await Backend.getGhostServerById(widget.serverId);
    settings = await Backend.getGhostServerSettingsById(widget.serverId);
    acceptingPlayers = await Backend.getAcceptingPlayers(widget.serverId);
    acceptingSpectators = await Backend.getAcceptingSpectators(widget.serverId);
    players = await Backend.getPlayers(widget.serverId);

    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(server?.name ?? "Loading..."),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: setup,
            icon: const Icon(Icons.refresh),
          ),
          if (!loading)
            IconButton(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => DeleteGhostServerDialog(
                    server: server!,
                    update: setup,
                  ),
                );
              },
              icon: const Icon(Icons.delete_outlined),
            ),
        ],
      ),
      body: !loading
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                NavigationRail(
                  selectedIndex: navigationRailSelectedIndex,
                  onDestinationSelected: (idx) =>
                      setState(() => navigationRailSelectedIndex = idx),
                  labelType: NavigationRailLabelType.all,
                  destinations: [
                    NavigationRailDestination(
                      icon: const Icon(Icons.settings_outlined),
                      selectedIcon: const Icon(Icons.settings),
                      label: const Text("General"),
                    ),
                    NavigationRailDestination(
                      icon: const Icon(Icons.people_outlined),
                      selectedIcon: const Icon(Icons.people),
                      label: const Text("Players"),
                    ),
                  ],
                ),
                const VerticalDivider(),
                Expanded(
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: SingleChildScrollView(
                        child: SizedBox(
                          width: 2 * MediaQuery.sizeOf(context).width / 3,
                          child: switch (navigationRailSelectedIndex) {
                            1 => _PlayersTab(
                              serverId: widget.serverId,
                              acceptingPlayers: acceptingPlayers,
                              acceptingSpectators: acceptingSpectators,
                              players: players,
                              update: setup,
                            ),
                            _ => _GeneralTab(
                              serverId: widget.serverId,
                              server: server!,
                              settings: settings!,
                            ),
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            )
          : const Center(child: CircularProgressIndicator()),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Backend.startCountdown(widget.serverId);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: const Text("Countdown started!")),
          );
        },
        icon: const Icon(Icons.play_arrow_outlined),
        label: const Text("Start Countdown"),
      ),
    );
  }
}

class _GeneralTab extends StatelessWidget {
  const _GeneralTab({
    required this.serverId,
    required this.server,
    required this.settings,
  });

  final int serverId;
  final GhostServer server;
  final GhostServerSettings settings;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Connect",
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        Text(
          "To connect, paste the text below into your game's console and hit enter!",
        ),
        const SizedBox(height: 20),
        GhostServerConnectCommandField(command: server.connectCommand()),
        const SizedBox(height: 80),
        Text("Settings", style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 10),
        _SettingsSection(
          serverId: serverId,
          settings: settings,
        ),
        const SizedBox(height: 80),
        Text(
          "Server Message",
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 10),
        _ServerMessageSection(serverId: serverId),
      ],
    );
  }
}

class _PlayersTab extends StatefulWidget {
  const _PlayersTab({
    required this.serverId,
    required this.acceptingPlayers,
    required this.acceptingSpectators,
    required this.players,
    required this.update,
  });

  final int serverId;
  final bool acceptingPlayers;
  final bool acceptingSpectators;
  final List<Player> players;

  final void Function() update;

  @override
  State<_PlayersTab> createState() => _PlayersTabState();
}

class _PlayersTabState extends State<_PlayersTab> {
  bool acceptingPlayers = true;
  bool acceptingSpectators = true;

  @override
  void initState() {
    super.initState();
    acceptingPlayers = widget.acceptingPlayers;
    acceptingSpectators = widget.acceptingSpectators;
  }

  Future<void> updateAcceptingSettings() async {
    await Backend.setAcceptingPlayers(widget.serverId, acceptingPlayers);
    await Backend.setAcceptingSpectators(widget.serverId, acceptingSpectators);
  }

  Future<bool> showConfirmationDialog(
    String title,
    String content,
    String confirmAction,
  ) async =>
      (await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(content),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(confirmAction),
            ),
          ],
        ),
      )) ??
      false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SwitchListTile(
          value: acceptingPlayers,
          title: const Text("Accept Players"),
          onChanged: (v) {
            acceptingPlayers = v;
            updateAcceptingSettings();
            setState(() {});
          },
        ),
        SwitchListTile(
          value: acceptingSpectators,
          title: const Text("Accept Spectators"),
          onChanged: (v) {
            acceptingSpectators = v;
            updateAcceptingSettings();
            setState(() {});
          },
        ),
        const SizedBox(height: 20),
        Text(
          "ConnectedPlayers",
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 10),
        widget.players.isNotEmpty
            ? ListView.builder(
                shrinkWrap: true,
                itemCount: widget.players.length,
                itemBuilder: (context, i) {
                  var player = widget.players[i];
                  return ListTile(
                    title: Text(
                      player.name,
                    ),
                    subtitle: Text(
                      "ID: ${player.id}"
                      "${player.isSpectator ? " • Spectator" : ""}",
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton.icon(
                          onPressed: () async {
                            var shouldKick = await showConfirmationDialog(
                              "Kick Player",
                              "Do you really want to kick the player ${player.name}",
                              "Kick",
                            );

                            if (shouldKick) {
                              await Backend.disconnectPlayerById(
                                widget.serverId,
                                player.id,
                              );
                              widget.update();
                            }
                          },
                          icon: const Icon(Icons.logout),
                          label: const Text("Kick"),
                        ),
                        const SizedBox(width: 10),
                        TextButton.icon(
                          onPressed: () async {
                            var shouldBan = await showConfirmationDialog(
                              "Ban Player",
                              "Do you really want to ban the player ${player.name}",
                              "Ban",
                            );

                            if (shouldBan) {
                              await Backend.banPlayerById(
                                widget.serverId,
                                player.id,
                              );
                              widget.update();
                            }
                          },
                          icon: const Icon(Icons.remove_circle_outline),
                          label: const Text("Ban"),
                        ),
                      ],
                    ),
                  );
                },
              )
            : const Text("No players connected!"),
      ],
    );
  }
}

class _SettingsSection extends StatefulWidget {
  const _SettingsSection({required this.serverId, required this.settings});

  final int serverId;
  final GhostServerSettings settings;

  @override
  State<_SettingsSection> createState() => _SettingsSectionState();
}

class _SettingsSectionState extends State<_SettingsSection> {
  final formKey = GlobalKey<FormState>();

  final countdownDurationController = TextEditingController();
  final preCommandsController = TextEditingController();
  final postCommandsController = TextEditingController();

  @override
  void initState() {
    super.initState();
    countdownDurationController.text = "${widget.settings.duration}";
    preCommandsController.text = widget.settings.preCommands;
    postCommandsController.text = widget.settings.postCommands;
  }

  Future<void> saveSettings() async {
    if (!(formKey.currentState?.validate() ?? false)) return;

    await Backend.updateGhostServerSettings(
      widget.serverId,
      GhostServerSettings(
        preCommands: preCommandsController.text.trim(),
        postCommands: postCommandsController.text.trim(),
        duration: int.parse(countdownDurationController.text),
      ),
    );

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: const Text("Settings updated!")),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 200,
            child: TextFormField(
              controller: countdownDurationController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
                labelText: "Countdown Duration",
                suffixText: "s",
              ),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: (s) {
                if (s == null || s.isEmpty) {
                  return "Please provide the countdown duration.";
                }
                var d = int.tryParse(s);
                if (d == null || d < 1) {
                  return "Please provide an integer greater than 0.";
                }
                return null;
              },
            ),
          ),
          const SizedBox(height: 20),
          Flex(
            direction: Axis.horizontal,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Flexible(
                child: TextFormField(
                  controller: preCommandsController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                    labelText: "Pre-Countdown Commands",
                  ),
                  maxLines: null,
                ),
              ),
              const SizedBox(width: 20),
              Flexible(
                child: TextFormField(
                  controller: postCommandsController,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                    labelText: "Post-Countdown Commands",
                  ),
                  maxLines: null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: saveSettings,
            icon: const Icon(Icons.save_outlined),
            label: const Text("Save"),
          ),
        ],
      ),
    );
  }
}

class _ServerMessageSection extends StatefulWidget {
  const _ServerMessageSection({required this.serverId});

  final int serverId;

  @override
  State<_ServerMessageSection> createState() => _ServerMessageSectionState();
}

class _ServerMessageSectionState extends State<_ServerMessageSection> {
  final formKey = GlobalKey<FormState>();

  String message = "";

  Future<void> sendMessage() async {
    if (!(formKey.currentState?.validate() ?? false)) return;

    await Backend.sendServerMessage(widget.serverId, message.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Form(
          key: formKey,
          child: TextFormField(
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
              labelText: "Message",
            ),
            onChanged: (s) => message = s,
            validator: (s) {
              if (s == null || s.isEmpty) return "Please provide a message.";
              return null;
            },
          ),
        ),
        const SizedBox(height: 20),
        FilledButton.icon(
          onPressed: sendMessage,
          icon: const Icon(Icons.send_outlined),
          label: const Text("Send"),
        ),
      ],
    );
  }
}
