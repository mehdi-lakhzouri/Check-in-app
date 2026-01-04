import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/env_config.dart';
import '../config/app_config.dart';

/// Settings State
class SettingsState {
  final String officerName;
  final bool isDarkMode;
  final bool isLoaded;

  const SettingsState({
    this.officerName = '',
    this.isDarkMode = false,
    this.isLoaded = false,
  });

  SettingsState copyWith({
    String? officerName,
    bool? isDarkMode,
    bool? isLoaded,
  }) {
    return SettingsState(
      officerName: officerName ?? this.officerName,
      isDarkMode: isDarkMode ?? this.isDarkMode,
      isLoaded: isLoaded ?? this.isLoaded,
    );
  }

  /// Get full API base URL from environment config
  String get apiBaseUrl => EnvConfig.apiBaseUrl;

  /// Server is always configured via env config
  bool get isConfigured => true;
}

/// Settings Notifier
class SettingsNotifier extends StateNotifier<SettingsState> {
  SharedPreferences? _prefs;

  SettingsNotifier() : super(const SettingsState());

  /// Initialize and load settings from SharedPreferences
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    final officerName = _prefs?.getString(AppConfig.officerNameKey) ?? '';
    final isDarkMode = _prefs?.getBool(AppConfig.darkModeKey) ?? false;

    state = state.copyWith(
      officerName: officerName,
      isDarkMode: isDarkMode,
      isLoaded: true,
    );
  }

  /// Update officer name
  Future<void> setOfficerName(String name) async {
    await _prefs?.setString(AppConfig.officerNameKey, name);
    state = state.copyWith(officerName: name);
  }

  /// Toggle dark mode
  Future<void> toggleDarkMode() async {
    final newValue = !state.isDarkMode;
    await _prefs?.setBool(AppConfig.darkModeKey, newValue);
    state = state.copyWith(isDarkMode: newValue);
  }

  /// Set dark mode
  Future<void> setDarkMode(bool value) async {
    await _prefs?.setBool(AppConfig.darkModeKey, value);
    state = state.copyWith(isDarkMode: value);
  }

  /// Clear all settings
  Future<void> clearSettings() async {
    await _prefs?.remove(AppConfig.officerNameKey);
    await _prefs?.remove(AppConfig.darkModeKey);
    state = const SettingsState(isLoaded: true);
  }
}

/// Settings Provider
final settingsProvider = StateNotifierProvider<SettingsNotifier, SettingsState>(
  (ref) => SettingsNotifier(),
);
