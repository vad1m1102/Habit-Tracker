import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getHabits, Habit, unarchiveHabit, deleteHabit } from "../src/storage/habits";
import { useTheme } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function ArchivedHabits() {
    const c = useTheme();
    const [habits, setHabits] = useState<Habit[]>([]);

    const load = useCallback(() => {
        (async () => {
            const all = await getHabits();
            setHabits(all.filter((h) => h.isArchived));
        })();
    }, []);

    useFocusEffect(load);

    const handleRestore = async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await unarchiveHabit(id);
        load();
    };

    const handleDelete = async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteHabit(id);
        load();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={c.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: c.text }]}>Завершені звички</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={habits}
                keyExtractor={(h) => h.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={[styles.card, { backgroundColor: c.card }]}>
                        <View style={[styles.iconWrap, { backgroundColor: item.color + "99" }]}>
                            <Text style={styles.iconEmoji}>{item.icon || "📌"}</Text>
                        </View>
                        <View style={styles.cardTextWrap}>
                            <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
                            {item.description ? (
                                <Text style={[styles.sub, { color: c.sub }]} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            ) : null}
                        </View>
                        <Pressable
                            onPress={() => handleRestore(item.id)}
                            style={[styles.actionBtn, { backgroundColor: c.accent }]}
                        >
                            <Ionicons name="refresh" size={18} color="#000" />
                        </Pressable>
                        <Pressable
                            onPress={() => handleDelete(item.id)}
                            style={[styles.actionBtn, { backgroundColor: "#FF453A22" }]}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF453A" />
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={[styles.empty, { backgroundColor: c.card }]}>
                        <Ionicons name="archive-outline" size={48} color={c.accent} />
                        <Text style={[styles.emptyTitle, { color: c.text }]}>
                            Немає завершених звичок
                        </Text>
                        <Text style={[styles.emptySub, { color: c.sub }]}>
                            Свайпніть звичку вправо щоб завершити
                        </Text>
                    </View>
                }
            />
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
    headerTitle: { fontSize: 18, fontWeight: "700" },

    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    iconEmoji: { fontSize: 20 },
    cardTextWrap: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: "700" },
    sub: { marginTop: 3, fontSize: 13 },

    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },

    empty: {
        marginTop: 60,
        borderRadius: 18,
        padding: 32,
        alignItems: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
    emptySub: { marginTop: 6, fontSize: 14, textAlign: "center" },
});
