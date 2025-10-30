import 'dart:convert';
import 'dart:io';

import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:http/http.dart' as http;
import 'package:portal2_ghost_sever_hoster/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'backend.freezed.dart';

part 'backend.g.dart';

const _host = "localhost";
const _baseUri = "http://$_host:8080";
const _baseAuthUri = "$_baseUri/auth";
const _baseApiUri = "$_baseUri/api";
const _baseContainerUri = "$_baseUri/container";

typedef Json = Map<String, dynamic>;

@freezed
abstract class GhostServer with _$GhostServer {
  const GhostServer._();

  const factory GhostServer({
    required int id,
    required String containerId,
    required int port,
    required int wsPort,
    required int userId,
    required String name,
    required String relativeRemainingDuration,
  }) = _GhostServer;

  factory GhostServer.fromJson(Json json) => _$GhostServerFromJson(json);

  String connectCommand() => "ghost_connect $_host $wsPort";
}

@freezed
abstract class GhostServerSettings with _$GhostServerSettings {
  const factory GhostServerSettings({
    required String preCommands,
    required String postCommands,
    required int duration,
  }) = _GhostServerSettings;

  factory GhostServerSettings.fromJson(Json json) =>
      _$GhostServerSettingsFromJson(json);
}

@freezed
abstract class Player with _$Player {
  const factory Player({
    required int id,
    required String name,
    required bool isSpectator,
  }) = _Player;

  factory Player.fromJson(Json json) => _$PlayerFromJson(json);
}

class _Backend {
  const _Backend();

  Future<String> _getAuthToken() async =>
      (await SharedPreferences.getInstance()).getString(spAuthTokenKey) ??
      (throw "Please log in!");

  Future<http.Response> _postJson(
    String uri, {
    Json json = const {},
    bool authenticated = false,
  }) async => http.post(
    Uri.parse(uri),
    headers: {
      HttpHeaders.contentTypeHeader: "application/json",
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
    body: jsonEncode(json),
  );

  Future<http.Response> _put(
    String uri, {
    bool authenticated = false,
  }) async => http.put(
    Uri.parse(uri),
    headers: {
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
  );

  Future<http.Response> _get(
    String uri, {
    bool authenticated = false,
  }) async => http.get(
    Uri.parse(uri),
    headers: {
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
  );

  Future<(String, DateTime)> login(String email, String password) async {
    var response = await _postJson(
      "$_baseAuthUri/generateAuthToken2",
      json: {"email": email, "password": password},
    );
    if (response.statusCode != 200) throw response.body;
    var json = jsonDecode(response.body);
    return (
      json["token"] as String,
      DateTime.fromMillisecondsSinceEpoch(json["expires"]),
    );
  }

  Future<void> register(String email, String password) async {
    var response = await _postJson(
      "$_baseAuthUri/register",
      json: {"email": email, "password": password},
    );
    if (response.statusCode != 201) throw response.body;
  }

  Future<void> createGhostServer(String? name) => _postJson(
    "$_baseApiUri/create${name != null ? "?name=$name" : ""}",
    authenticated: true,
  );

  Future<List<GhostServer>> getGhostServers() async {
    var response = await _get("$_baseApiUri/list", authenticated: true);
    if (response.statusCode != 200) throw response.body;
    var json = jsonDecode(response.body) as List<dynamic>;
    return json.cast<Json>().map(GhostServer.fromJson).toList();
  }

  Future<GhostServer> getGhostServerById(int id) async {
    var response = await _get(
      "$_baseApiUri/validateContainerId?id=$id",
      authenticated: true,
    );
    if (response.statusCode != 200) throw response.body;
    return GhostServer.fromJson(jsonDecode(response.body));
  }

  Future<GhostServerSettings> getGhostServerSettingsById(int id) async {
    var response = await _get(
      "$_baseContainerUri/settings?id=$id",
      authenticated: true,
    );
    if (response.statusCode != 200) throw response.body;
    return GhostServerSettings.fromJson(jsonDecode(response.body));
  }

  Future<void> updateGhostServerSettings(
    int id,
    GhostServerSettings settings,
  ) => _put(
    "$_baseContainerUri/settings?id=$id&duration=${settings.duration}&preCommands=${settings.preCommands}&postCommands=${settings.postCommands}",
    authenticated: true,
  );

  Future<void> sendServerMessage(int id, String message) => _put(
    "$_baseContainerUri/serverMessage?id=$id&message=$message",
    authenticated: true,
  );

  Future<void> startCountdown(int id) =>
      _put("$_baseContainerUri/startCountdown?id=$id", authenticated: true);

  Future<bool> getAcceptingPlayers(int id) async {
    var response = await _get(
      "$_baseContainerUri/acceptingPlayers?id=$id",
      authenticated: true,
    );
    return response.body == "true";
  }

  Future<void> setAcceptingPlayers(int id, bool accept) => _put(
    "$_baseContainerUri/acceptingPlayers?id=$id&value=${accept ? "1" : "0"}",
    authenticated: true,
  );

  Future<bool> getAcceptingSpectators(int id) async {
    var response = await _get(
      "$_baseContainerUri/acceptingSpectators?id=$id",
      authenticated: true,
    );
    return response.body == "true";
  }

  Future<void> setAcceptingSpectators(int id, bool accept) => _put(
    "$_baseContainerUri/acceptingSpectators?id=$id&value=${accept ? "1" : "0"}",
    authenticated: true,
  );

  Future<List<Player>> getPlayers(int id) async {
    var response = await _get(
      "$_baseContainerUri/listPlayers?id=$id",
      authenticated: true,
    );
    var resp = jsonDecode(response.body) as List<dynamic>;
    return resp.cast<Json>().map(Player.fromJson).toList();
  }

  Future<void> disconnectPlayerById(int serverId, int playerId) => _put(
    "$_baseContainerUri/disconnectPlayer?id=$serverId&player_id=$playerId",
    authenticated: true,
  );

  Future<void> banPlayerById(int serverId, int playerId) => _put(
    "$_baseContainerUri/banPlayer?id=$serverId&player_id=$playerId",
    authenticated: true,
  );

  Future<void> deleteGhostServer(int id) =>
      _get("$_baseApiUri/delete?id=$id", authenticated: true);
}

// ignore: constant_identifier_names
const Backend = _Backend();
