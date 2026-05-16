import { View, Text, StyleSheet } from "react-native";

export default function AddHabitScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New habit</Text>
      <Text>Form will be here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F2F2F7" },
  title: { fontSize: 34, fontWeight: "800", marginTop: 10, marginBottom: 20 },
});
