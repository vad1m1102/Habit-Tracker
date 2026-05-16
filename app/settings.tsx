import { View, Text, Pressable, StyleSheet, ScrollView, Switch } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function Settings() {
    const c = useTheme();

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
                <Text style={[styles.title, { color: c.text }]}>Налаштування</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Data section */}
                <Text style={[styles.sectionLabel, { color: c.sub }]}>ДАНІ</Text>
                <View style={[styles.menuSection, { backgroundColor: c.card }]}>
                    <SettingsItem
                        icon="archive-outline"
                        label="Архів звичок"
                        c={c}
                        onPress={() => router.push("/archived-habits")}
                    />
                </View>

                {/* About section */}
                <Text style={[styles.sectionLabel, { color: c.sub }]}>ПРО ДОДАТОК</Text>
                <View style={[styles.menuSection, { backgroundColor: c.card }]}>
                    <View style={styles.menuItem}>
                        <View style={[styles.menuIconWrap, { backgroundColor: c.surface }]}>
                            <Ionicons name="information-circle-outline" size={20} color={c.accent} />
                        </View>
                        <Text style={[styles.menuLabel, { color: c.text }]}>Версія</Text>
                        <Text style={[styles.menuRightText, { color: c.sub }]}>1.0.0</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingsItem({
    icon,
    label,
    c,
    onPress,
    rightText,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    c: ReturnType<typeof useTheme>;
    onPress?: () => void;
    rightText?: string;
}) {
    return (
        <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress?.();
            }}
        >
            <View style={[styles.menuIconWrap, { backgroundColor: c.surface }]}>
                <Ionicons name={icon} size={20} color={c.accent} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{label}</Text>
            <View style={styles.menuRight}>
                {rightText && (
                    <Text style={[styles.menuRightText, { color: c.sub }]}>{rightText}</Text>
                )}
                <Ionicons name="chevron-forward" size={18} color={c.sub} />
            </View>
        </Pressable>
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
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    menuSection: {
        borderRadius: 16,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
    },
    menuRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    menuRightText: { fontSize: 14 },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 62,
    },
});
