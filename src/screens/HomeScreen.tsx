import { View, Text, Pressable, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habits</Text>

      <Pressable style={styles.btn} onPress={() => navigation.navigate("AddHabit")}>
        <Text style={styles.btnText}>Add habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F2F2F7" },
  title: { fontSize: 34, fontWeight: "800", marginTop: 10, marginBottom: 20 },
  btn: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800", fontSize: 16 },
});
