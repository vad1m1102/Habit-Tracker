import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { getHabits, Habit } from "../src/storage/habits";
import { useTheme } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AllHabits() {
    const c = useTheme();
    const params = useLocalSearchParams<{ filter?: string }>();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [filter, setFilter] = useState<"active" | "archived">(
        params.filter === "archived" ? "archived" : "active"
    );

    const load = useCallback(() => {
        (async () => {
            const h = await getHabits();
            setHabits(h);
        })();
    }, []);

    useFocusEffect(load);

    const active = habits.filter((h) => !(h as any).isArchived);
    const archived = habits.filter((h) => (h as any).isArchived);
    const displayed = filter === "active" ? active : archived;

    // Group by creation date
    const grouped = displayed.reduce<Record<string, Habit[]>>((acc, h) => {
        const date = new Date(h.createdAt).toLocaleDateString("uk-UA", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(h);
        return acc;
    }, {});

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>Всі звички</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Filter toggle */}
            <View style={[styles.toggle, { backgroundColor: c.card }]}>
                <Pressable
                    style={[
                        styles.toggleBtn,
                        filter === "active" && { backgroundColor: c.accent },
                    ]}
                    onPress={() => setFilter("active")}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            { color: filter === "active" ? "#000" : c.sub },
                        ]}
                    >
                        Активні: {active.length}
                    </Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.toggleBtn,
                        filter === "archived" && { backgroundColor: c.accent },
                    ]}
                    onPress={() => setFilter("archived")}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            { color: filter === "archived" ? "#000" : c.sub },
                        ]}
                    >
                        Завершені: {archived.length}
                    </Text>
                </Pressable>
            </View>

            {/* Habits grouped by date */}
            <FlatList
                data={Object.entries(grouped)}
                keyExtractor={([date]) => date}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: [date, items] }) => (
                    <View style={styles.group}>
                        <Text style={[styles.groupDate, { color: c.sub }]}>
                            Створено{"\n"}{date}
                        </Text>
                        {items.map((habit) => (
                            <View
                                key={habit.id}
                                style={[styles.card, { backgroundColor: c.card }]}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: c.surface }]}>
                                    <Text style={styles.iconEmoji}>
                                        {(habit as any).icon || "📌"}
                                    </Text>
                                </View>
                                <View style={styles.cardText}>
                                    <Text style={[styles.habitName, { color: c.text }]}>
                                        {habit.title}
                                    </Text>
                                    <View style={styles.statusRow}>
                                        <View
                                            style={[styles.statusDot, { backgroundColor: c.accentOrange }]}
                                        />
                                        <Text style={[styles.statusText, { color: c.sub }]}>
                                            В ПРОЦЕСІ
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={[styles.emptyText, { color: c.sub }]}>
                            {filter === "active"
                                ? "Немає активних звичок"
                                : "Немає завершених звичок"}
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
    closeBtn: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "700" },

    toggle: {
        flexDirection: "row",
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 3,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    toggleText: { fontSize: 14, fontWeight: "600" },

    group: { marginBottom: 16 },
    groupDate: { fontSize: 13, fontWeight: "500", marginBottom: 8 },

    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
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
    cardText: { flex: 1 },
    habitName: { fontSize: 16, fontWeight: "700" },
    statusRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },

    emptyWrap: { marginTop: 60, alignItems: "center" },
    emptyText: { fontSize: 16 },
});
