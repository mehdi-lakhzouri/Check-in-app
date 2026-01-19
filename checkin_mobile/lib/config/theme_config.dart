import 'package:flutter/material.dart';

/// App theme configuration with WCAG AA compliant dark mode
class ThemeConfig {
  // Primary color - Conference Blue
  static const Color primaryColor = Color(0xFF1E88E5);
  
  // Success color
  static const Color successColor = Color(0xFF4CAF50);
  
  // Warning color
  static const Color warningColor = Color(0xFFFF9800);
  
  // Error color
  static const Color errorColor = Color(0xFFF44336);
  
  // ============================================================
  // DARK MODE COLOR PALETTE - WCAG AA Compliant
  // ============================================================
  
  // Surface colors - layered for elevation
  static const Color darkSurface = Color(0xFF121212);
  static const Color darkSurfaceElevated1 = Color(0xFF1E1E1E);
  static const Color darkSurfaceElevated2 = Color(0xFF232323);
  static const Color darkSurfaceElevated3 = Color(0xFF282828);
  static const Color darkSurfaceContainer = Color(0xFF1D1D1D);
  static const Color darkSurfaceContainerHigh = Color(0xFF2B2B2B);
  static const Color darkSurfaceContainerHighest = Color(0xFF353535);
  
  // Text colors - high contrast for readability
  static const Color darkOnSurface = Color(0xFFE8E8E8);
  static const Color darkOnSurfaceVariant = Color(0xFFB3B3B3);
  static const Color darkOnSurfaceDisabled = Color(0xFF6B6B6B);
  
  // Primary colors for dark mode
  static const Color darkPrimary = Color(0xFF64B5F6);
  static const Color darkPrimaryContainer = Color(0xFF1565C0);
  static const Color darkOnPrimary = Color(0xFF003258);
  static const Color darkOnPrimaryContainer = Color(0xFFD1E4FF);
  
  // Secondary colors
  static const Color darkSecondary = Color(0xFF81C784);
  static const Color darkSecondaryContainer = Color(0xFF2E7D32);
  static const Color darkOnSecondary = Color(0xFF003914);
  static const Color darkOnSecondaryContainer = Color(0xFFC8E6C9);
  
  // Outline colors
  static const Color darkOutline = Color(0xFF5C5C5C);
  static const Color darkOutlineVariant = Color(0xFF404040);
  
  // Divider color
  static const Color darkDivider = Color(0xFF3D3D3D);
  
  /// Light theme
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      filled: true,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
  );
  
  /// Dark theme - WCAG AA compliant with proper contrast ratios
  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: darkSurface,
    colorScheme: const ColorScheme.dark(
      brightness: Brightness.dark,
      primary: darkPrimary,
      onPrimary: darkOnPrimary,
      primaryContainer: darkPrimaryContainer,
      onPrimaryContainer: darkOnPrimaryContainer,
      secondary: darkSecondary,
      onSecondary: darkOnSecondary,
      secondaryContainer: darkSecondaryContainer,
      onSecondaryContainer: darkOnSecondaryContainer,
      surface: darkSurface,
      onSurface: darkOnSurface,
      onSurfaceVariant: darkOnSurfaceVariant,
      surfaceContainerLowest: darkSurface,
      surfaceContainerLow: darkSurfaceElevated1,
      surfaceContainer: darkSurfaceContainer,
      surfaceContainerHigh: darkSurfaceContainerHigh,
      surfaceContainerHighest: darkSurfaceContainerHighest,
      outline: darkOutline,
      outlineVariant: darkOutlineVariant,
      error: Color(0xFFFF8A80),
      onError: Color(0xFF601410),
      errorContainer: Color(0xFF8C1D18),
      onErrorContainer: Color(0xFFFFDAD6),
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
      backgroundColor: darkSurfaceElevated1,
      foregroundColor: darkOnSurface,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: darkSurfaceElevated2,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: darkOutlineVariant.withValues(alpha: 0.3)),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: darkDivider,
      thickness: 1,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: darkPrimary,
        foregroundColor: darkOnPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        elevation: 2,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: darkPrimary,
        foregroundColor: darkOnPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: darkPrimary,
        side: BorderSide(color: darkPrimary.withValues(alpha: 0.5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: darkPrimary,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: darkOutlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: darkOutlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: darkPrimary, width: 2),
      ),
      filled: true,
      fillColor: darkSurfaceElevated2,
      hintStyle: TextStyle(color: darkOnSurfaceVariant.withValues(alpha: 0.7)),
      labelStyle: const TextStyle(color: darkOnSurfaceVariant),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: darkSurfaceElevated3,
      contentTextStyle: const TextStyle(color: darkOnSurface),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: darkSurfaceElevated2,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      titleTextStyle: const TextStyle(
        color: darkOnSurface,
        fontSize: 20,
        fontWeight: FontWeight.w600,
      ),
      contentTextStyle: const TextStyle(
        color: darkOnSurfaceVariant,
        fontSize: 14,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: darkSurfaceElevated2,
      surfaceTintColor: Colors.transparent,
      modalBackgroundColor: darkSurfaceElevated2,
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: darkSurfaceElevated3,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: darkOnSurfaceVariant,
      textColor: darkOnSurface,
    ),
    iconTheme: const IconThemeData(
      color: darkOnSurfaceVariant,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: darkSurfaceElevated2,
      selectedColor: darkPrimaryContainer,
      disabledColor: darkSurfaceContainer,
      labelStyle: const TextStyle(color: darkOnSurface),
      secondaryLabelStyle: const TextStyle(color: darkOnPrimaryContainer),
      side: BorderSide(color: darkOutlineVariant.withValues(alpha: 0.5)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: darkPrimary,
      linearTrackColor: darkSurfaceContainerHigh,
      circularTrackColor: darkSurfaceContainerHigh,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return darkPrimary;
        }
        return darkOnSurfaceVariant;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return darkPrimary.withValues(alpha: 0.5);
        }
        return darkSurfaceContainerHigh;
      }),
    ),
  );
}
