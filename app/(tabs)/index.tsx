import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, useMemo, useRef } from "react";
import {
  getHabits,
  Habit,
  getDoneForDate,
  incrementDoneToday,
  getStreak,
  archiveHabit,
  archiveExpiredHabits,
  reorderHabits,
} from "../../src/storage/habits";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "../../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeTabs from "../../src/ui/SwipeTabs";
import * as Haptics from "expo-haptics";
import { scheduleHabitReminders } from "../../src/notifications";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";



/* ── Calendar helpers ── */
const SCREEN_W = Dimensions.get("window").width - 32; // minus paddingHorizontal
const WEEKS_BEFORE = 12;
const WEEKS_AFTER = 12;
const TOTAL_WEEKS = WEEKS_BEFORE + 1 + WEEKS_AFTER; // 25 weeks

function getMondayOfWeek(base: Date): Date {
  const d = new Date(base);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Generate all weeks: WEEKS_BEFORE weeks before + current + WEEKS_AFTER after
function generateWeeks(today: Date) {
  const currentMonday = getMondayOfWeek(today);
  const weeks: Date[][] = [];
  for (let w = -WEEKS_BEFORE; w <= WEEKS_AFTER; w++) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() + w * 7);
    weeks.push(getWeekDates(mon));
  }
  return weeks;
}

const SHORT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** Convert JS Date weekday to our 0=Mon..6=Sun index */
function jsDayToIdx(jsDay: number) {
  return (jsDay + 6) % 7; // JS: 0=Sun → our: 6; JS: 1=Mon → our: 0
}

function dateToISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ── Habit Card Component ── */
function HabitCard({
  item,
  done,
  streaks,
  setDone,
  setStreaks,
  load,
  c,
  isPast,
}: {
  item: Habit;
  done: Record<string, number>;
  streaks: Record<string, number>;
  setDone: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setStreaks: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  load: () => void;
  c: ReturnType<typeof useTheme>;
  isPast: boolean;
}) {
  const swipeRef = useRef<Swipeable>(null);

  const goalCount = item.goal?.enabled ? item.goal.count : 1;
  const doneCount = done[item.id] ?? 0;
  const isDone = doneCount >= goalCount;

  const rightActions = () => (
    <Pressable
      onPress={async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await archiveHabit(item.id);
        load();
      }}
      style={styles.swipeArchive}
    >
      <Ionicons name="archive-outline" size={22} color="#000" />
      <Text style={styles.swipeArchiveText}>Завершити</Text>
    </Pressable>
  );

  const leftActions = () => (
    <View style={styles.swipeComplete}>
      <Ionicons name="checkmark-circle" size={26} color="#000" />
      <Text style={styles.swipeCompleteText}>Виконано</Text>
    </View>
  );

  const handleSwipeComplete = async () => {
    // 1. ЗАПАМ'ЯТОВУЄМО МИНУЛЕ (на випадок катастрофи)
    const previousDoneCount = done[item.id] ?? 0;
    const previousStreak = streaks[item.id] ?? 0;

    // 2. БРЕШЕМО КОРИСТУВАЧУ В ОБЛИЧЧЯ (ОПТИМІСТИЧНЕ ОНОВЛЕННЯ)
    // Миттєво малюємо зелену галочку, не чекаючи відповіді від бази!
    setDone(prev => ({ ...prev, [item.id]: previousDoneCount + goalCount }));
    setStreaks(prev => ({ ...prev, [item.id]: previousStreak + 1 }));

    // Даємо вібрацію успіху, нехай радіє
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 3. СПРОБА ЗРОБИТИ РЕАЛЬНУ РОБОТУ
    try {
      // Тепер, коли UI вже красивий, ліземо в базу
      const updatedDone = await incrementDoneToday(item.id, goalCount);
      const s = await getStreak(item.id);

      // Синхронізуємо реальні дані з бази, щоб усе було точно на 100%
      setDone(updatedDone);
      setStreaks((prev) => ({ ...prev, [item.id]: s }));

    } catch (error) {
      // 4. ПОВНИЙ ПРОВАЛ? РОБИМО ВИГЛЯД, ЩО НІЧОГО НЕ БУЛО (ВІДКАТ)
      console.error("Упс, база даних вирішила відпочити:", error);

      // Повертаємо старі значення
      setDone(prev => ({ ...prev, [item.id]: previousDoneCount }));
      setStreaks(prev => ({ ...prev, [item.id]: previousStreak }));

      // Б'ємо по руках вібрацією помилки
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Тут в ідеалі ще треба показати тостер: "Помилка збереження"
    }
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={isPast ? undefined : rightActions}
      renderLeftActions={isPast ? undefined : leftActions}
      overshootRight={false}
      overshootLeft={false}
      enabled={!isPast}
      onSwipeableOpen={(dir) => {
        if (dir === "left") handleSwipeComplete();
        setTimeout(() => swipeRef.current?.close(), 300);
      }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({
            pathname: "/edit-habit",
            params: { habitId: item.id },
          });
        }}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.card },
          pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconWrap, { backgroundColor: item.color + "99" }]}>
            <Text style={styles.iconEmoji}>{item.icon || "📌"}</Text>
          </View>
          <View style={styles.cardTextWrap}>
            <Text
              style={[
                styles.cardTitle,
                { color: c.text },
                isDone && { opacity: 0.6 },
              ]}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text
                style={[styles.cardDesc, { color: c.sub }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            ) : null}
            <Text style={[styles.sub, { color: c.sub }]}>
              {isDone ? "" : ""} Стрік:{" "}
              {streaks[item.id] ?? 0}🔥
            </Text>
          </View>

          {goalCount > 1 ? (
            <View
              style={[
                styles.goalBadge,
                {
                  backgroundColor: isDone ? c.accent : c.surface,
                  borderColor: isDone ? c.accent : c.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.goalBadgeText,
                  { color: isDone ? "#000" : c.text },
                ]}
              >
                {doneCount}/{goalCount}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.checkCircle,
                {
                  borderColor: isDone ? c.accent : c.surface,
                  backgroundColor: isDone ? c.accent : "transparent",
                },
              ]}
            >
              {isDone && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}
export default function Index() {
  const c = useTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [done, setDone] = useState<Record<string, number>>({});
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const calRef = useRef<FlatList>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const today = useMemo(() => new Date(), []);
  const weeks = useMemo(() => generateWeeks(today), []);

  const load = useCallback(() => {
    (async () => {
      await archiveExpiredHabits();
      const h = await getHabits();
      setHabits(h);
      const iso = dateToISO(selectedDate);
      const d = await getDoneForDate(iso);
      setDone(d);
      const entries = await Promise.all(
        h.map(async (x) => [x.id, await getStreak(x.id)] as const)
      );
      setStreaks(Object.fromEntries(entries));
      scheduleHabitReminders(h, d);
    })();
  }, [selectedDate]);

  useFocusEffect(load);

  const dayName = selectedDate.toLocaleDateString("uk-UA", { weekday: "long" });
  const dateStr = selectedDate.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
  });
  const isViewingToday = isSameDay(selectedDate, today);

  const selectedDayIdx = jsDayToIdx(selectedDate.getDay());
  const filteredHabits = useMemo(
    () =>
      habits.filter((h) => {
        if (isViewingToday && h.isArchived) return false;
        const createdISO = h.createdAt?.split("T")[0];
        if (createdISO && dateToISO(selectedDate) < createdISO) return false;
        if (!h.repeat?.days || h.repeat.days.length === 0) return true;
        return h.repeat.days.includes(selectedDayIdx);
      }),
    [habits, selectedDayIdx, isViewingToday, selectedDate]
  );

  const total = filteredHabits.length;
  const completed = filteredHabits.filter((h) => {
    const goalCount = h.goal?.enabled ? h.goal.count : 1;
    return (done[h.id] ?? 0) >= goalCount;
  }).length;



  const handleDragEnd = async ({ data }: { data: Habit[] }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fullIds = habits.map((h) => h.id);
    const reorderedIds = data.map((h) => h.id);
    const nonFiltered = fullIds.filter((id) => !reorderedIds.includes(id));
    await reorderHabits([...reorderedIds, ...nonFiltered]);
    load();
  };

  const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<Habit>) => (
    <ScaleDecorator>
      <View
        style={{ flexDirection: "row", alignItems: "center", opacity: isActive ? 0.8 : 1 }}
      >
        <Pressable onPressIn={drag} disabled={isActive} style={styles.reorderControls}>
          <Ionicons name="reorder-three" size={22} color={c.sub} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <HabitCard
            item={item}
            done={done}
            streaks={streaks}
            setDone={setDone}
            setStreaks={setStreaks}
            load={load}
            c={c}
            isPast={true}
          />
        </View>
      </View>
    </ScaleDecorator>
  );

  return (
    <SwipeTabs>
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.bg }]}
        edges={["top"]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: c.sub }]}>
              {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
            </Text>
            <Text style={[styles.title, { color: c.text }]}>{dateStr}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {isViewingToday && (
              <Pressable
                style={[
                  styles.allBtn,
                  {
                    backgroundColor: reorderMode ? c.accent : c.card,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setReorderMode(!reorderMode);
                }}
              >
                <Ionicons
                  name={reorderMode ? "checkmark" : "reorder-three"}
                  size={24}
                  color={reorderMode ? "#000" : c.text}
                />
              </Pressable>
            )}
            <Pressable
              style={[styles.allBtn, { backgroundColor: c.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/profile");
              }}
            >
              <Ionicons name="person-circle-outline" size={24} color={c.text} />
            </Pressable>
          </View>
        </View>

        {/* Swipeable calendar strip */}
        <FlatList
          ref={calRef}
          data={weeks}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={WEEKS_BEFORE}
          getItemLayout={(_: any, index: number) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          keyExtractor={(_, i) => `week-${i}`}
          renderItem={({ item: weekDates }: { item: Date[] }) => (
            <View
              style={[
                styles.calendarRow,
                { backgroundColor: c.card, width: SCREEN_W },
              ]}
            >
              {weekDates.map((d: Date, i: number) => {
                const isSelected = isSameDay(d, selectedDate);
                const isToday = isSameDay(d, today);
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDate(d);
                    }}
                    style={[
                      styles.calDay,
                      isSelected && { backgroundColor: c.accent },
                      !isSelected && isToday && {
                        borderWidth: 1.5,
                        borderColor: c.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calDayLabel,
                        { color: isSelected ? "#000" : c.sub },
                      ]}
                    >
                      {SHORT_DAYS[i]}
                    </Text>
                    <Text
                      style={[
                        styles.calDayNum,
                        { color: isSelected ? "#000" : c.text },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          style={{ flexGrow: 0, marginBottom: 12, zIndex: 10 }}
        />

        {/* Progress summary */}
        {total > 0 && (
          <View style={[styles.progressBar, { backgroundColor: c.card }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: c.text }]}>
                {completed}/{total} виконано
              </Text>
              <Text style={[styles.progressPercent, { color: c.accent }]}>
                {total > 0 ? Math.round((completed / total) * 100) : 0}%
              </Text>
            </View>
            <View
              style={[styles.progressTrack, { backgroundColor: c.surface }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: c.accent,
                    width: `${total > 0 ? (completed / total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}


        {/* Habits list */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {reorderMode ? (
            <DraggableFlatList
              data={filteredHabits}
              keyExtractor={(h) => h.id}
              onDragEnd={handleDragEnd}
              renderItem={renderDraggableItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              autoscrollThreshold={80}
              autoscrollSpeed={300}
            />
          ) : (
            <FlatList
              data={filteredHabits}
              keyExtractor={(h) => h.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <HabitCard
                  item={item}
                  done={done}
                  streaks={streaks}
                  setDone={setDone}
                  setStreaks={setStreaks}
                  load={load}
                  c={c}
                  isPast={!isViewingToday}
                />
              )}
              ListEmptyComponent={
                <View style={[styles.empty, { backgroundColor: c.card }]}>
                  <Ionicons name="leaf-outline" size={48} color={c.accent} />
                  <Text style={[styles.emptyTitle, { color: c.text }]}>
                    {isViewingToday
                      ? "Поки немає звичок"
                      : "Немає звичок на цей день"}
                  </Text>
                  <Text style={[styles.emptySub, { color: c.sub }]}>
                    {isViewingToday
                      ? 'Натисни "+" щоб створити першу'
                      : "Оберіть інший день або створіть нову"}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </SwipeTabs>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },
  greeting: { fontSize: 14, fontWeight: "500" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 2 },
  allBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Calendar strip */
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  calDay: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 52,
    borderRadius: 12,
  },
  calDayLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  calDayNum: { fontSize: 16, fontWeight: "700" },

  /* Progress */
  progressBar: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: { fontSize: 14, fontWeight: "600" },
  progressPercent: { fontSize: 14, fontWeight: "800" },
  progressTrack: {
    height: 10,
    borderRadius: 5,
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },

  /* Habit card */
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  streakBadge: { fontSize: 13, fontWeight: "700" },
  cardDesc: { fontSize: 13, marginTop: 1 },
  sub: { marginTop: 3, fontSize: 13 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  goalBadge: {
    minWidth: 42,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  goalBadgeText: { fontSize: 13, fontWeight: "800" },

  /* Empty */
  empty: {
    marginTop: 60,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  emptySub: { marginTop: 6, fontSize: 14 },

  /* Swipe actions */
  swipeArchive: {
    marginBottom: 10,
    backgroundColor: "#F5A623",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  swipeArchiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000",
    marginTop: 2,
  },
  swipeComplete: {
    marginBottom: 10,
    backgroundColor: "#C6E94D",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginRight: 8,
  },
  swipeCompleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#000",
    marginTop: 2,
  },


  /* Reorder controls */
  reorderControls: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingVertical: 4,
  },
});
