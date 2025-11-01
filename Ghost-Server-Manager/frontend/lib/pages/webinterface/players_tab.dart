import 'package:flutter/material.dart';
import 'package:portal2_ghost_sever_hoster/backend/backend.dart';

class PlayersTab extends StatefulWidget {
  const PlayersTab({
    super.key,
    required this.serverId,
    required this.players,
    required this.update,
  });

  final int serverId;
  final List<Player> players;

  final void Function() update;

  @override
  State<PlayersTab> createState() => _PlayersTabState();
}

class _PlayersTabState extends State<PlayersTab> {
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
