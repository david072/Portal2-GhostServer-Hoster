import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:portal2_ghost_sever_hoster/pages/auth/login_page.dart';
import 'package:portal2_ghost_sever_hoster/pages/home_page.dart';

const spAuthTokenKey = "auth_token";
const spAuthTokenExpiryKey = "auth_token_expiry";

void main() {
  runApp(
    MaterialApp.router(
      routerConfig: GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: '/login',
            builder: (context, state) => const LoginPage(),
          ),
        ],
      ),
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
    ),
  );
}
