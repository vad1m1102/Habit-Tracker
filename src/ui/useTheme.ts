import { useThemeContext } from "../context/ThemeContext";

export function useTheme() {
  return useThemeContext().colors;
}

export function useThemeMode() {
  const { mode, setMode } = useThemeContext();
  return { mode, setMode };
}
