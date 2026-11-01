import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../src/ui/useTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeTabs from "../../src/ui/SwipeTabs";

export default function Achievements() {
    const c = useTheme();

    return (
        <SwipeTabs tabIndex={2}>
            <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
                <Text style={[styles.title, { color: c.text }]}>Досягнення</Text>
                <View style={[styles.placeholder, { backgroundColor: c.card }]}>
                    <Text style={[styles.placeholderText, { color: c.sub }]}>
                        Досягнення будуть тут
                    </Text>
                </View>
            </SafeAreaView>
        </SwipeTabs>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: {
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 8,
        marginBottom: 20,
    },
    placeholder: {
        margin: 16,
        borderRadius: 16,
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        fontSize: 16,
    },
});
