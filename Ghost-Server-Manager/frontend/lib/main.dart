import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:go_router/go_router.dart';
import 'package:portal2_ghost_sever_hoster/pages/auth/login_page.dart';
import 'package:portal2_ghost_sever_hoster/pages/auth/register_page.dart';
import 'package:portal2_ghost_sever_hoster/pages/home_page.dart';

const spAuthTokenKey = "auth_token";
const spAuthTokenExpiryKey = "auth_token_expiry";

void main() {
  usePathUrlStrategy();

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
            routes: [
              GoRoute(
                path: '/register',
                builder: (context, state) => const RegisterPage(),
              ),
            ],
          ),
        ],
      ),
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
    ),
  );
}
