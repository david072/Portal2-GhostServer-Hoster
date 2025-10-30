import 'dart:convert';

import 'package:http/http.dart' as http;

const _baseUri = "http://localhost:8080";
const _baseAuthUri = "$_baseUri/auth";

typedef Json = Map<String, dynamic>;

class Backend {
  static Future<http.Response> _postJson(String uri, Json json) => http.post(
    Uri.parse(uri),
    headers: {"Content-Type": "application/json"},
    body: jsonEncode(json),
  );

  static Future<(String, DateTime)> login(String email, String password) async {
    var response = await _postJson(
      "$_baseAuthUri/generateAuthToken2",
      {"email": email, "password": password},
    );
    if (response.statusCode != 200) throw response.body;
    var json = jsonDecode(response.body);
    return (
      json["token"] as String,
      DateTime.fromMillisecondsSinceEpoch(json["expires"]),
    );
  }

  static Future<void> register(String email, String password) async {
    var response = await _postJson(
      "$_baseAuthUri/register",
      {"email": email, "password": password},
    );
    if (response.statusCode != 201) throw response.body;
  }
}
