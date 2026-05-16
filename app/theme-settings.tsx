import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useTheme, useThemeMode } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemeMode } from "../src/ui/theme";

const THEMES: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
    {
        key: "dark",
        label: "Темна",
        icon: "moon",
        desc: "Стильна темна тема для комфортного використання вночі",
    },
    {
        key: "light",
        label: "Світла",
        icon: "sunny",
        desc: "Класична світла тема для ясного перегляду вдень",
    },
];

export default function ThemeSettings() {
    const c = useTheme();
    const { mode, setMode } = useThemeMode();

    const handleSelect = (key: ThemeMode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMode(key);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color={c.accent} />
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>Тема</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionLabel, { color: c.sub }]}>ВИГЛЯД ДОДАТКУ</Text>

                <View style={styles.themesGrid}>
                    {THEMES.map((t) => {
                        const isActive = mode === t.key;
                        return (
                            <Pressable
                                key={t.key}
                                style={[
                                    styles.themeCard,
                                    {
                                        backgroundColor: c.card,
                                        borderWidth: 2,
                                        borderColor: isActive ? c.accent : "transparent",
                                    },
                                ]}
                                onPress={() => handleSelect(t.key)}
                            >
                                {/* Preview */}
                                <View
                                    style={[
                                        styles.preview,
                                        {
                                            backgroundColor: t.key === "dark" ? "#000" : "#F2F2F7",
                                        },
                                    ]}
                                >
                                    {/* Mini app preview */}
                                    <View
                                        style={[
                                            styles.previewCard,
                                            {
                                                backgroundColor: t.key === "dark" ? "#1C1C1E" : "#FFFFFF",
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.previewLine,
                                                {
                                                    backgroundColor: t.key === "dark" ? "#C6E94D" : "#6ABF4B",
                                                    width: "60%",
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.previewLine,
                                                {
                                                    backgroundColor:
                                                        t.key === "dark"
                                                            ? "rgba(235,235,245,0.3)"
                                                            : "rgba(60,60,67,0.3)",
                                                    width: "80%",
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.previewLine,
                                                {
                                                    backgroundColor:
                                                        t.key === "dark"
                                                            ? "rgba(235,235,245,0.15)"
                                                            : "rgba(60,60,67,0.15)",
                                                    width: "45%",
                                                },
                                            ]}
                                        />
                                    </View>
                                    <View style={styles.previewBottom}>
                                        <View
                                            style={[
                                                styles.previewDot,
                                                {
                                                    backgroundColor: t.key === "dark" ? "#C6E94D" : "#6ABF4B",
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.previewDot,
                                                {
                                                    backgroundColor:
                                                        t.key === "dark" ? "#8E8E93" : "#8E8E93",
                                                },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.previewDot,
                                                {
                                                    backgroundColor:
                                                        t.key === "dark" ? "#8E8E93" : "#8E8E93",
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>

                                {/* Label */}
                                <View style={styles.themeInfo}>
                                    <View style={styles.themeHeader}>
                                        <Ionicons
                                            name={t.icon}
                                            size={18}
                                            color={isActive ? c.accent : c.sub}
                                        />
                                        <Text
                                            style={[
                                                styles.themeLabel,
                                                { color: isActive ? c.accent : c.text },
                                            ]}
                                        >
                                            {t.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.themeDesc, { color: c.sub }]} numberOfLines={2}>
                                        {t.desc}
                                    </Text>
                                </View>

                                {/* Check */}
                                {isActive && (
                                    <View style={[styles.checkBadge, { backgroundColor: c.accent }]}>
                                        <Ionicons name="checkmark" size={14} color="#000" />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "700" },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    themesGrid: {
        gap: 14,
    },
    themeCard: {
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
    },
    preview: {
        height: 140,
        padding: 16,
        justifyContent: "space-between",
    },
    previewCard: {
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    previewLine: {
        height: 6,
        borderRadius: 3,
    },
    previewBottom: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 16,
    },
    previewDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    themeInfo: {
        padding: 16,
        gap: 4,
    },
    themeHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    themeLabel: {
        fontSize: 17,
        fontWeight: "700",
    },
    themeDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    checkBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
});
