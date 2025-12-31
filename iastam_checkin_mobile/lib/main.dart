import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/session_list_screen.dart';
import 'screens/attendee_list_screen.dart';
import 'models/session_manual.dart';

void main() {
  try {
    runApp(const ProviderScope(child: MyApp()));
  } catch (e) {
    print('Error starting app: $e');
    // Still try to run the app even if there's an error
    runApp(const ProviderScope(child: MyApp()));
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IASTAM Check-in',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(centerTitle: true, elevation: 2),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
      ),
      home: const SessionListScreen(),
      debugShowCheckedModeBanner: false,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/attendees':
            final session = settings.arguments as Session;
            return MaterialPageRoute(
              builder: (context) => AttendeeListScreen(session: session),
            );
          default:
            return null;
        }
      },
    );
  }
}
