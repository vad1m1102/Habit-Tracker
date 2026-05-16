// Dark iOS-style theme with green/orange accents
export const darkTheme = {
  bg: "#000000",
  card: "#1C1C1E",
  surface: "#2C2C2E",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  sub: "rgba(235,235,245,0.6)",
  accent: "#C6E94D",       // lime/green — primary accent
  accentOrange: "#F5A623", // orange — secondary accent
  danger: "#FF453A",
  tabBar: "#1C1C1E",
  tabInactive: "#8E8E93",
  border: "rgba(255,255,255,0.08)",
  cardHighlight: "#2C2C2E",
};

// Light iOS-style theme
export const lightTheme = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  surface: "#E5E5EA",
  text: "#000000",
  textSecondary: "#6C6C70",
  sub: "rgba(60,60,67,0.6)",
  accent: "#6ABF4B",       // green — primary accent
  accentOrange: "#F5A623", // orange — secondary accent
  danger: "#FF3B30",
  tabBar: "#FFFFFF",
  tabInactive: "#8E8E93",
  border: "rgba(0,0,0,0.08)",
  cardHighlight: "#E5E5EA",
};

export type ThemeColors = typeof darkTheme;
export type ThemeMode = "dark" | "light";

// Default export for backward compatibility
export const theme = darkTheme;

// Re-export for backward compatibility
export const colors = {
  dark: darkTheme,
  light: lightTheme,
};
