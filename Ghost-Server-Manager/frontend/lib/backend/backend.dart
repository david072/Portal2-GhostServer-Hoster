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

  factory GhostServer.fromJson(Map<String, dynamic> json) =>
      _$GhostServerFromJson(json);

  String connectCommand() => "ghost_connect $_host $wsPort";
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

  Future<void> deleteGhostServer(int id) =>
      _get("$_baseApiUri/delete?id=$id", authenticated: true);
}

// ignore: constant_identifier_names
const Backend = _Backend();
