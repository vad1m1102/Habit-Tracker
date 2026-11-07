import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/ui/useTheme";
import SwipeTabs from "../../src/ui/SwipeTabs";

// ── Types ──────────────────────────────────────────────────────────────────────
type Challenge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  targetDays: number;
  startDate: string; // ISO date YYYY-MM-DD
  createdAt: string;
  completed: boolean;
};

const CHALLENGES_KEY = "challenges:v1";

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(isoDate: string): number {
  const start = new Date(isoDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatDaysLeft(targetDays: number, startDate: string): string {
  const elapsed = daysSince(startDate);
  const left = targetDays - elapsed;
  if (left <= 0) return "Завершено!";
  return `${left} ${left === 1 ? "день" : left < 5 ? "дні" : "днів"} залишилось`;
}

// ── Templates ─────────────────────────────────────────────────────────────────
type Template = {
  icon: string;
  title: string;
  description: string;
  targetDays: number;
};

const TEMPLATES: Template[] = [
  {
    icon: "🏃",
    title: "30-денний спринт",
    description: "Щодня 30 хвилин бігу або фізичної активності",
    targetDays: 30,
  },
  {
    icon: "📚",
    title: "Читання 21 день",
    description: "Читати щонайменше 20 сторінок кожного дня",
    targetDays: 21,
  },
  {
    icon: "💧",
    title: "Водний виклик",
    description: "Пити 8 склянок води щодня протягом 2 тижнів",
    targetDays: 14,
  },
  {
    icon: "🧘",
    title: "Медитація 7 днів",
    description: "10 хвилин медитації щоранку",
    targetDays: 7,
  },
  {
    icon: "😴",
    title: "Режим сну",
    description: "Лягати спати до 23:00 протягом місяця",
    targetDays: 30,
  },
  {
    icon: "🥗",
    title: "Правильне харчування",
    description: "Без солодкого та фастфуду 14 днів",
    targetDays: 14,
  },
];

const EMOJI_OPTIONS = ["🏃","💪","📚","🧘","💧","🥗","🌅","🎯","✍️","🚴","🏊","🎨","🌱","🍎","🛌","🧩"];

// ── Component ──────────────────────────────────────────────────────────────────
export default function ChallengesScreen() {
  const c = useTheme();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [step, setStep] = useState<"closed" | "templates" | "custom">("closed");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newIcon, setNewIcon] = useState("🎯");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDays, setNewDays] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
      const list: Challenge[] = raw ? JSON.parse(raw) : [];
      // Auto-mark completed
      const updated = list.map((ch) => {
        const elapsed = daysSince(ch.startDate);
        return elapsed >= ch.targetDays ? { ...ch, completed: true } : ch;
      });
      setChallenges(updated);
      await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(updated));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveChallenge = async (data: Omit<Challenge, "id" | "createdAt" | "completed">) => {
    const ch: Challenge = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const updated = [ch, ...challenges];
    setChallenges(updated);
    await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(updated));
    closeModal();
  };

  const handleSaveFromTemplate = () => {
    if (!selectedTemplate) return;
    saveChallenge({
      icon: selectedTemplate.icon,
      title: selectedTemplate.title,
      description: selectedTemplate.description,
      targetDays: selectedTemplate.targetDays,
      startDate: todayISO(),
    });
  };

  const handleSaveCustom = () => {
    if (!newTitle.trim()) {
      Alert.alert("Помилка", "Введіть назву челенджу");
      return;
    }
    const days = parseInt(newDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert("Помилка", "Введіть коректну кількість днів (мінімум 1)");
      return;
    }
    saveChallenge({
      icon: newIcon,
      title: newTitle.trim(),
      description: newDesc.trim(),
      targetDays: days,
      startDate: todayISO(),
    });
  };

  const closeModal = () => {
    setStep("closed");
    setSelectedTemplate(null);
    setNewIcon("🎯");
    setNewTitle("");
    setNewDesc("");
    setNewDays("30");
  };

  const deleteChallenge = (id: string) => {
    Alert.alert("Видалити челендж?", "Цю дію не можна скасувати", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Видалити",
        style: "destructive",
        onPress: async () => {
          const updated = challenges.filter((ch) => ch.id !== id);
          setChallenges(updated);
          await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(updated));
        },
      },
    ]);
  };

  const active = challenges.filter((ch) => !ch.completed);
  const completed = challenges.filter((ch) => ch.completed);

  if (loading) {
    return (
      <SwipeTabs tabIndex={3}>
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
          <ActivityIndicator color={c.accent} size="large" style={{ marginTop: 100 }} />
        </SafeAreaView>
      </SwipeTabs>
    );
  }

  return (
    <SwipeTabs tabIndex={3}>
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: c.text }]}>Челенджі</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: c.accent }]}
                  onPress={() => setStep("templates")}
                  activeOpacity={0.75}
                >
                  <Text style={styles.addBtnText}>+ Новий</Text>
                </TouchableOpacity>
              </View>

              {/* Active challenges */}
              {active.length > 0 && (
                <Text style={[styles.sectionTitle, { color: c.sub }]}>АКТИВНІ</Text>
              )}
              {active.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  c={c}
                  onDelete={() => deleteChallenge(ch.id)}
                />
              ))}

              {/* Empty state */}
              {challenges.length === 0 && (
                <View style={[styles.emptyBox, { backgroundColor: c.card }]}>
                  <Text style={styles.emptyIcon}>🎯</Text>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>Немає активних челенджів</Text>
                  <Text style={[styles.emptyText, { color: c.sub }]}>
                    Розпочни виклик і слідкуй за своїм прогресом
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: c.accent }]}
                    onPress={() => setStep("templates")}
                  >
                    <Text style={styles.emptyBtnText}>Розпочати виклик</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Completed challenges */}
              {completed.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: c.sub, marginTop: 24 }]}>ЗАВЕРШЕНІ</Text>
                  {completed.map((ch) => (
                    <ChallengeCard
                      key={ch.id}
                      challenge={ch}
                      c={c}
                      onDelete={() => deleteChallenge(ch.id)}
                      isCompleted
                    />
                  ))}
                </>
              )}

              <View style={{ height: 40 }} />
            </>
          }
        />

        {/* Step 1: Templates Modal */}
        <Modal visible={step === "templates"} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Оберіть виклик</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {TEMPLATES.map((tpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.templateRow,
                      {
                        backgroundColor: selectedTemplate === tpl ? c.surface : c.bg,
                        borderColor: selectedTemplate === tpl ? c.accent : c.border,
                      },
                    ]}
                    onPress={() => setSelectedTemplate(tpl)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.templateIcon}>{tpl.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.templateTitle, { color: c.text }]}>{tpl.title}</Text>
                      <Text style={[styles.templateDesc, { color: c.sub }]} numberOfLines={1}>
                        {tpl.description}
                      </Text>
                    </View>
                    <View style={[styles.daysPill, { backgroundColor: c.surface }]}>
                      <Text style={[styles.daysPillText, { color: c.accentOrange }]}>{tpl.targetDays}д</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Custom option */}
                <TouchableOpacity
                  style={[styles.customOptionBtn, { borderColor: c.border }]}
                  onPress={() => { setStep("custom"); setSelectedTemplate(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.customOptionIcon}>✏️</Text>
                  <Text style={[styles.customOptionText, { color: c.sub }]}>Створити власний...</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: c.surface }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.modalCancelText, { color: c.sub }]}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: selectedTemplate ? c.accent : c.surface },
                  ]}
                  onPress={handleSaveFromTemplate}
                  disabled={!selectedTemplate}
                >
                  <Text
                    style={[styles.modalSaveText, { color: selectedTemplate ? "#000" : c.sub }]}
                  >
                    Розпочати
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Step 2: Custom Modal */}
        <Modal visible={step === "custom"} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Власний виклик</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalLabel, { color: c.sub }]}>Іконка</Text>
                <View style={styles.emojiRow}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.emojiBtn, { backgroundColor: newIcon === emoji ? c.accent : c.surface }]}
                      onPress={() => setNewIcon(emoji)}
                    >
                      <Text style={styles.emojiBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalLabel, { color: c.sub }]}>Назва *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                  placeholder="Назва виклику"
                  placeholderTextColor={c.sub}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  maxLength={40}
                />

                <Text style={[styles.modalLabel, { color: c.sub }]}>Опис (необов'язково)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                  placeholder="Деталі виклику"
                  placeholderTextColor={c.sub}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  maxLength={80}
                />

                <Text style={[styles.modalLabel, { color: c.sub }]}>Кількість днів *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                  placeholder="30"
                  placeholderTextColor={c.sub}
                  value={newDays}
                  onChangeText={setNewDays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </ScrollView>

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: c.surface }]}
                  onPress={() => setStep("templates")}
                >
                  <Text style={[styles.modalCancelText, { color: c.sub }]}>← Назад</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: c.accent }]}
                  onPress={handleSaveCustom}
                >
                  <Text style={styles.modalSaveText}>Розпочати</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SwipeTabs>
  );
}

// ── Challenge Card ─────────────────────────────────────────────────────────────
type CardProps = {
  challenge: Challenge;
  c: ReturnType<typeof useTheme>;
  onDelete: () => void;
  isCompleted?: boolean;
};

function ChallengeCard({ challenge, c, onDelete, isCompleted }: CardProps) {
  const elapsed = daysSince(challenge.startDate);
  const progress = Math.min(elapsed / challenge.targetDays, 1);
  const pct = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={[styles.challengeCard, { backgroundColor: c.card }]}
      onLongPress={onDelete}
      activeOpacity={0.85}
    >
      <View style={styles.challengeTop}>
        <Text style={styles.challengeIcon}>{challenge.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.challengeTitle, { color: c.text }]}>{challenge.title}</Text>
          {challenge.description ? (
            <Text style={[styles.challengeDesc, { color: c.sub }]} numberOfLines={1}>
              {challenge.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.challengeRight}>
          {isCompleted ? (
            <View style={[styles.completedBadge, { backgroundColor: c.accent }]}>
              <Text style={styles.completedBadgeText}>✓</Text>
            </View>
          ) : (
            <View style={[styles.daysPill, { backgroundColor: c.surface }]}>
              <Text style={[styles.daysPillText, { color: c.accentOrange }]}>
                {challenge.targetDays}д
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: c.surface }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isCompleted ? c.accent : c.accentOrange,
              width: `${pct}%`,
            },
          ]}
        />
      </View>

      <View style={styles.challengeBottom}>
        <Text style={[styles.pctText, { color: isCompleted ? c.accent : c.accentOrange }]}>
          {pct}%
        </Text>
        <Text style={[styles.daysText, { color: c.sub }]}>
          {isCompleted ? "🎉 Виконано!" : formatDaysLeft(challenge.targetDays, challenge.startDate)}
        </Text>
        <Text style={[styles.elapsedText, { color: c.sub }]}>
          {elapsed}/{challenge.targetDays} днів
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800" },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  // Challenge card
  challengeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  challengeTop: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  challengeIcon: { fontSize: 32 },
  challengeTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  challengeDesc: { fontSize: 12 },
  challengeRight: { alignItems: "flex-end" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  challengeBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pctText: { fontSize: 13, fontWeight: "800" },
  daysText: { fontSize: 12 },
  elapsedText: { fontSize: 11 },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  completedBadgeText: { color: "#000", fontSize: 14, fontWeight: "900" },
  // Days pill
  daysPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  daysPillText: { fontSize: 12, fontWeight: "700" },
  // Empty state
  emptyBox: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginTop: 20,
  },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    gap: 10,
  },
  templateIcon: { fontSize: 28 },
  templateTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  templateDesc: { fontSize: 12 },
  customOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  customOptionIcon: { fontSize: 22 },
  customOptionText: { fontSize: 14, fontWeight: "600" },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emojiBtnText: { fontSize: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  modalSaveText: { fontSize: 15, fontWeight: "700", color: "#000" },
});
