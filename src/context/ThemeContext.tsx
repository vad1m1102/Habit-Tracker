import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme, ThemeColors, ThemeMode } from "../ui/theme";

const KEY = "app_theme:v1";

type ThemeContextType = {
    mode: ThemeMode;
    colors: ThemeColors;
    setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    mode: "dark",
    colors: darkTheme,
    setMode: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>("dark");

    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem(KEY);
            if (saved === "light" || saved === "dark") {
                setModeState(saved);
            }
        })();
    }, []);

    const setMode = (m: ThemeMode) => {
        setModeState(m);
        AsyncStorage.setItem(KEY, m);
    };

    const colors = mode === "dark" ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ mode, colors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    return useContext(ThemeContext);
}
