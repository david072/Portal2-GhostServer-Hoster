import 'dart:convert';

import 'package:http/http.dart' as http;

const _baseUri = "http://localhost:8080";

class Backend {
  static Future<(String, DateTime)> login(String email, String password) async {
    var response = await http.post(
      Uri.parse("$_baseUri/auth/generateAuthToken2"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": email, "password": password}),
    );
    if (response.statusCode != 200) throw response.body;
    var json = jsonDecode(response.body);
    return (
      json["token"] as String,
      DateTime.fromMillisecondsSinceEpoch(json["expires"]),
    );
  }
}
