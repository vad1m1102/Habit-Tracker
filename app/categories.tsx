import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/ui/useTheme";
import { categories, Category } from "../src/data/categories";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Categories() {
    const c = useTheme();

    const handleSelect = (category: Category) => {
        router.replace({
            pathname: "/add-habit",
            params: { categoryId: category.id, categoryName: category.name },
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>Категорії звичок</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Category list */}
            <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Pressable
                        style={[styles.card, { backgroundColor: c.card }]}
                        onPress={() => handleSelect(item)}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: item.color + "22" }]}>
                            <Text style={styles.icon}>{item.icon}</Text>
                        </View>
                        <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
                        <Ionicons name="chevron-forward" size={18} color={c.sub} />
                    </Pressable>
                )}
            />

            {/* Bottom button */}
            <View style={styles.bottomWrap}>
                <Pressable
                    style={[styles.createBtn, { backgroundColor: c.accent }]}
                    onPress={() => router.replace("/add-habit")}
                >
                    <Text style={[styles.createBtnText, { color: "#000" }]}>
                        Створити Звичку
                    </Text>
                </Pressable>
            </View>
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
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    icon: { fontSize: 22 },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
    },
    bottomWrap: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    createBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
    },
    createBtnText: {
        fontSize: 16,
        fontWeight: "700",
    },
});
