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
const _baseAuthUri = "$_baseUri/api/auth";
const _baseServerUri = "$_baseUri/api/server";

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
    required String preCountdownCommands,
    required String postCountdownCommands,
    required int countdownDuration,
    required bool acceptingPlayers,
    required bool acceptingSpectators,
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
    Json body = const {},
    bool authenticated = false,
  }) async => http.post(
    Uri.parse(uri),
    headers: {
      HttpHeaders.contentTypeHeader: "application/json",
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
    body: jsonEncode(body),
  );

  Future<http.Response> _put(
    String uri, {
    Json body = const {},
    bool authenticated = false,
  }) async => http.put(
    Uri.parse(uri),
    headers: {
      HttpHeaders.contentTypeHeader: "application/json",
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
    body: jsonEncode(body),
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

  Future<http.Response> _delete(
    String uri, {
    bool authenticated = false,
  }) async => http.delete(
    Uri.parse(uri),
    headers: {
      if (authenticated)
        HttpHeaders.authorizationHeader: "Bearer ${await _getAuthToken()}",
    },
  );

  Future<(String, DateTime)> login(String email, String password) async {
    var response = await _postJson(
      "$_baseAuthUri/login",
      body: {"email": email, "password": password},
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
      body: {"email": email, "password": password},
    );
    if (response.statusCode != 201) throw response.body;
  }

  Future<void> createGhostServer(String? name) => _postJson(
    "$_baseServerUri/create${name != null ? "?name=$name" : ""}",
    authenticated: true,
  );

  Future<List<GhostServer>> getGhostServers() async {
    var response = await _get("$_baseServerUri/list", authenticated: true);
    if (response.statusCode != 200) throw response.body;
    var json = jsonDecode(response.body) as List<dynamic>;
    return json.cast<Json>().map(GhostServer.fromJson).toList();
  }

  Future<GhostServer> getGhostServerById(int id) async {
    var response = await _get("$_baseServerUri/$id", authenticated: true);
    if (response.statusCode != 200) throw response.body;
    return GhostServer.fromJson(jsonDecode(response.body));
  }

  Future<GhostServerSettings> getGhostServerSettingsById(int id) async {
    var response = await _get(
      "$_baseServerUri/$id/settings",
      authenticated: true,
    );
    if (response.statusCode != 200) throw response.body;
    return GhostServerSettings.fromJson(jsonDecode(response.body));
  }

  Future<void> updateGhostServerSettings(
    int id,
    GhostServerSettings settings,
  ) => _put(
    "$_baseServerUri/$id/settings",
    body: settings.toJson(),
    authenticated: true,
  );

  Future<void> sendServerMessage(int id, String message) => _put(
    "$_baseServerUri/$id/serverMessage?message=$message",
    authenticated: true,
  );

  Future<void> startCountdown(int id) =>
      _put("$_baseServerUri/$id/startCountdown", authenticated: true);

  Future<List<Player>> getPlayers(int id) async {
    var response = await _get(
      "$_baseServerUri/$id/listPlayers",
      authenticated: true,
    );
    var resp = jsonDecode(response.body) as List<dynamic>;
    return resp.cast<Json>().map(Player.fromJson).toList();
  }

  Future<void> disconnectPlayerById(int serverId, int playerId) => _put(
    "$_baseServerUri/$serverId/disconnectPlayer",
    body: {"id": playerId},
    authenticated: true,
  );

  Future<void> banPlayerById(int serverId, int playerId) => _put(
    "$_baseServerUri/$serverId/banPlayer",
    body: {"id": playerId},
    authenticated: true,
  );

  Future<void> deleteGhostServer(int id) =>
      _delete("$_baseServerUri/$id", authenticated: true);
}

// ignore: constant_identifier_names
const Backend = _Backend();
