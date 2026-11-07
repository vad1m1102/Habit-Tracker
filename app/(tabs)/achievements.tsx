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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../src/ui/useTheme";
import SwipeTabs from "../../src/ui/SwipeTabs";
import { getHabits, getAllDone, Habit } from "../../src/storage/habits";

// ── Types ──────────────────────────────────────────────────────────────────────
type AutoBadge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number; // 0..1
  progressLabel: string;
};

type CustomBadge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  createdAt: string;
};

const CUSTOM_KEY = "custom_badges:v1";

// ── Auto-badge definitions ─────────────────────────────────────────────────────
type BadgeDef = {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (data: StatsData) => { unlocked: boolean; progress: number; label: string };
};

type StatsData = {
  habits: Habit[];
  allDone: Record<string, Record<string, number>>;
  maxStreak: number;
  totalCompletions: number;
  maxDailyHabits: number;
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function getMaxStreak(allDone: Record<string, Record<string, number>>, habits: Habit[]): number {
  let best = 0;
  for (const habit of habits) {
    const goalCount = habit.goal?.enabled ? habit.goal.count : 1;
    const isDone = (iso: string) => (allDone[iso]?.[habit.id] ?? 0) >= goalCount;
    const dates = Object.keys(allDone).sort();
    let cur = 0;
    for (let i = 0; i < dates.length; i++) {
      if (isDone(dates[i])) {
        if (i > 0 && dates[i] !== shiftDate(dates[i - 1], 1)) cur = 1;
        else cur++;
        if (cur > best) best = cur;
      } else {
        cur = 0;
      }
    }
  }
  return best;
}

function getTotalComps(allDone: Record<string, Record<string, number>>, habits: Habit[]): number {
  let total = 0;
  for (const habit of habits) {
    const goalCount = habit.goal?.enabled ? habit.goal.count : 1;
    for (const day of Object.values(allDone)) {
      if ((day[habit.id] ?? 0) >= goalCount) total++;
    }
  }
  return total;
}

function getMaxDailyHabits(allDone: Record<string, Record<string, number>>, habits: Habit[]): number {
  let max = 0;
  for (const [, dayMap] of Object.entries(allDone)) {
    let count = 0;
    for (const habit of habits) {
      const goalCount = habit.goal?.enabled ? habit.goal.count : 1;
      if ((dayMap[habit.id] ?? 0) >= goalCount) count++;
    }
    if (count > max) max = count;
  }
  return max;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    id: "streak_7",
    icon: "🔥",
    title: "Тиждень вогню",
    description: "7 днів поспіль",
    check: ({ maxStreak }) => ({
      unlocked: maxStreak >= 7,
      progress: Math.min(maxStreak / 7, 1),
      label: `${Math.min(maxStreak, 7)}/7 днів`,
    }),
  },
  {
    id: "streak_30",
    icon: "⚡",
    title: "Місяць сили",
    description: "30 днів поспіль",
    check: ({ maxStreak }) => ({
      unlocked: maxStreak >= 30,
      progress: Math.min(maxStreak / 30, 1),
      label: `${Math.min(maxStreak, 30)}/30 днів`,
    }),
  },
  {
    id: "streak_100",
    icon: "👑",
    title: "100 днів легенди",
    description: "100 днів поспіль",
    check: ({ maxStreak }) => ({
      unlocked: maxStreak >= 100,
      progress: Math.min(maxStreak / 100, 1),
      label: `${Math.min(maxStreak, 100)}/100 днів`,
    }),
  },
  {
    id: "total_50",
    icon: "🎯",
    title: "Перші 50",
    description: "50 виконань звичок",
    check: ({ totalCompletions }) => ({
      unlocked: totalCompletions >= 50,
      progress: Math.min(totalCompletions / 50, 1),
      label: `${Math.min(totalCompletions, 50)}/50`,
    }),
  },
  {
    id: "total_100",
    icon: "💯",
    title: "Соточка",
    description: "100 виконань звичок",
    check: ({ totalCompletions }) => ({
      unlocked: totalCompletions >= 100,
      progress: Math.min(totalCompletions / 100, 1),
      label: `${Math.min(totalCompletions, 100)}/100`,
    }),
  },
  {
    id: "total_500",
    icon: "🏆",
    title: "Чемпіон звичок",
    description: "500 виконань звичок",
    check: ({ totalCompletions }) => ({
      unlocked: totalCompletions >= 500,
      progress: Math.min(totalCompletions / 500, 1),
      label: `${Math.min(totalCompletions, 500)}/500`,
    }),
  },
  {
    id: "daily_5",
    icon: "🌟",
    title: "Продуктивний день",
    description: "5 звичок за один день",
    check: ({ maxDailyHabits }) => ({
      unlocked: maxDailyHabits >= 5,
      progress: Math.min(maxDailyHabits / 5, 1),
      label: `${Math.min(maxDailyHabits, 5)}/5 за день`,
    }),
  },
  {
    id: "daily_10",
    icon: "🚀",
    title: "Супергерой",
    description: "10 звичок за один день",
    check: ({ maxDailyHabits }) => ({
      unlocked: maxDailyHabits >= 10,
      progress: Math.min(maxDailyHabits / 10, 1),
      label: `${Math.min(maxDailyHabits, 10)}/10 за день`,
    }),
  },
];

const EMOJI_OPTIONS = ["🏅","⭐","💎","🎖️","🥇","🌈","🎉","💪","🧠","❤️","🌸","🦋","🎵","🍀","🌙","☀️"];

// ── Component ──────────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const c = useTheme();
  const [autoBadges, setAutoBadges] = useState<AutoBadge[]>([]);
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newIcon, setNewIcon] = useState("🏅");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [habits, allDone, raw] = await Promise.all([
        getHabits(),
        getAllDone(),
        AsyncStorage.getItem(CUSTOM_KEY),
      ]);

      const activeHabits = habits.filter((h) => !h.isArchived);
      const stats: StatsData = {
        habits: activeHabits,
        allDone,
        maxStreak: getMaxStreak(allDone, activeHabits),
        totalCompletions: getTotalComps(allDone, activeHabits),
        maxDailyHabits: getMaxDailyHabits(allDone, activeHabits),
      };

      const badges: AutoBadge[] = BADGE_DEFS.map((def) => {
        const { unlocked, progress, label } = def.check(stats);
        return { id: def.id, icon: def.icon, title: def.title, description: def.description, unlocked, progress, progressLabel: label };
      });

      setAutoBadges(badges);
      setCustomBadges(raw ? (JSON.parse(raw) as CustomBadge[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveCustomBadge = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Помилка", "Введіть назву бейджа");
      return;
    }
    const badge: CustomBadge = {
      id: `${Date.now()}`,
      icon: newIcon,
      title: newTitle.trim(),
      description: newDesc.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [badge, ...customBadges];
    setCustomBadges(updated);
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    setModalVisible(false);
    setNewTitle("");
    setNewDesc("");
    setNewIcon("🏅");
  };

  const deleteCustomBadge = (id: string) => {
    Alert.alert("Видалити бейдж?", "Цю дію не можна скасувати", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Видалити",
        style: "destructive",
        onPress: async () => {
          const updated = customBadges.filter((b) => b.id !== id);
          setCustomBadges(updated);
          await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
        },
      },
    ]);
  };

  const unlockedCount = autoBadges.filter((b) => b.unlocked).length;

  if (loading) {
    return (
      <SwipeTabs tabIndex={2}>
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
          <ActivityIndicator color={c.accent} size="large" style={{ marginTop: 100 }} />
        </SafeAreaView>
      </SwipeTabs>
    );
  }

  return (
    <SwipeTabs tabIndex={2}>
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: c.text }]}>Досягнення</Text>
                <View style={[styles.statsPill, { backgroundColor: c.card }]}>
                  <Text style={[styles.statsPillText, { color: c.accent }]}>
                    {unlockedCount}/{autoBadges.length} 🏆
                  </Text>
                </View>
              </View>

              {/* Auto badges section */}
              <Text style={[styles.sectionTitle, { color: c.sub }]}>АВТОМАТИЧНІ БЕЙДЖІ</Text>
              <View style={styles.grid}>
                {autoBadges.map((badge) => (
                  <View
                    key={badge.id}
                    style={[
                      styles.badgeCard,
                      { backgroundColor: c.card, opacity: badge.unlocked ? 1 : 0.4 },
                    ]}
                  >
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={[styles.badgeTitle, { color: c.text }]} numberOfLines={1}>
                      {badge.title}
                    </Text>
                    <Text style={[styles.badgeDesc, { color: c.sub }]} numberOfLines={2}>
                      {badge.description}
                    </Text>
                    {/* Progress bar */}
                    <View style={[styles.progressBg, { backgroundColor: c.surface }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: badge.unlocked ? c.accent : c.accentOrange,
                            width: `${Math.round(badge.progress * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressLabel, { color: c.sub }]}>{badge.progressLabel}</Text>
                    {badge.unlocked && (
                      <View style={[styles.unlockedTag, { backgroundColor: c.accent }]}>
                        <Text style={styles.unlockedTagText}>✓</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Custom badges section */}
              <View style={styles.customHeader}>
                <Text style={[styles.sectionTitle, { color: c.sub }]}>МОЇ БЕЙДЖІ</Text>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: c.accent }]}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.addBtnText}>+ Додати</Text>
                </TouchableOpacity>
              </View>

              {customBadges.length === 0 && (
                <View style={[styles.emptyBox, { backgroundColor: c.card }]}>
                  <Text style={styles.emptyIcon}>🎖️</Text>
                  <Text style={[styles.emptyText, { color: c.sub }]}>
                    Додай свій перший власний бейдж!
                  </Text>
                </View>
              )}

              <View style={styles.grid}>
                {customBadges.map((badge) => (
                  <TouchableOpacity
                    key={badge.id}
                    style={[styles.badgeCard, { backgroundColor: c.card }]}
                    onLongPress={() => deleteCustomBadge(badge.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={[styles.badgeTitle, { color: c.text }]} numberOfLines={1}>
                      {badge.title}
                    </Text>
                    {badge.description ? (
                      <Text style={[styles.badgeDesc, { color: c.sub }]} numberOfLines={2}>
                        {badge.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.customTag, { color: c.accentOrange }]}>Власний</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 40 }} />
            </>
          }
        />

        {/* Add Custom Badge Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Новий бейдж</Text>

              {/* Emoji picker */}
              <Text style={[styles.modalLabel, { color: c.sub }]}>Іконка</Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiBtn,
                      {
                        backgroundColor: newIcon === emoji ? c.accent : c.surface,
                      },
                    ]}
                    onPress={() => setNewIcon(emoji)}
                  >
                    <Text style={styles.emojiBtnText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: c.sub }]}>Назва *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                placeholder="Наприклад: Ранній птах"
                placeholderTextColor={c.sub}
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={30}
              />

              <Text style={[styles.modalLabel, { color: c.sub }]}>Опис (необов'язково)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                placeholder="Коротко про досягнення"
                placeholderTextColor={c.sub}
                value={newDesc}
                onChangeText={setNewDesc}
                maxLength={60}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: c.surface }]}
                  onPress={() => {
                    setModalVisible(false);
                    setNewTitle("");
                    setNewDesc("");
                    setNewIcon("🏅");
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: c.sub }]}>Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: c.accent }]}
                  onPress={saveCustomBadge}
                >
                  <Text style={styles.modalSaveText}>Зберегти</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SwipeTabs>
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
  statsPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statsPillText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 12,
  },
  badgeCard: {
    width: "46%",
    marginHorizontal: "2%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    position: "relative",
  },
  badgeIcon: { fontSize: 36, marginBottom: 8 },
  badgeTitle: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  badgeDesc: { fontSize: 11, textAlign: "center", marginBottom: 8, lineHeight: 15 },
  progressBg: { width: "100%", height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 10, marginTop: 4 },
  unlockedTag: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockedTagText: { color: "#000", fontSize: 11, fontWeight: "900" },
  customTag: { fontSize: 10, fontWeight: "700", marginTop: 6 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: "#000", fontSize: 13, fontWeight: "700" },
  emptyBox: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16, textAlign: "center" },
  modalLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emojiBtnText: { fontSize: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  modalSaveText: { fontSize: 15, fontWeight: "700", color: "#000" },
});
