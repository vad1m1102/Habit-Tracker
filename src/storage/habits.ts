import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "habits:v1";

export type HabitRepeat = {
  type: "daily";
  days: number[]; // 0=Mon..6=Sun for daily; 1..31 for monthly
  endDate?: string; // ISO date
};

export type HabitGoal = {
  enabled: boolean;
  count: number;
  period: "day" | "week";
  unit?: string; // e.g. "стор.", "мл", "скл.", "хв", "раз"
};

export type HabitReminder = {
  enabled: boolean;
  time: string; // "HH:mm"
};

export type Habit = {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  repeat: HabitRepeat;
  goal: HabitGoal;
  reminder: HabitReminder;
  createdAt: string;
  isArchived: boolean;
};

export const defaultHabit: Omit<Habit, "id" | "createdAt"> = {
  title: "",
  description: "",
  icon: "📌",
  color: "#F5A623",
  category: "",
  repeat: { type: "daily", days: [0, 1, 2, 3, 4, 5, 6] },
  goal: { enabled: true, count: 1, period: "day", unit: "раз" },
  reminder: { enabled: false, time: "20:00" },
  isArchived: false,
};

export async function getHabits(): Promise<Habit[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as any[];
  // Migrate old habits that don't have new fields
  return parsed.map((h) => ({
    ...defaultHabit,
    ...h,
  }));
}

export async function addHabit(data: Partial<Habit> & { title: string }): Promise<Habit> {
  const newHabit: Habit = {
    ...defaultHabit,
    ...data,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: data.title.trim(),
    createdAt: new Date().toISOString(),
  };
  const habits = await getHabits();
  const next = [newHabit, ...habits];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return newHabit;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  const habits = await getHabits();
  const next = habits.map((h) => (h.id === id ? { ...h, ...updates } : h));
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { isArchived: true });
}

export async function unarchiveHabit(id: string): Promise<void> {
  await updateHabit(id, { isArchived: false });
}

export async function deleteHabit(id: string) {
  const habits = await getHabits();
  const next = habits.filter((h) => h.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/** Reorder habits by providing new array of IDs in desired order */
export async function reorderHabits(orderedIds: string[]): Promise<void> {
  const habits = await getHabits();
  const map = new Map(habits.map((h) => [h.id, h]));
  const reordered = orderedIds.map((id) => map.get(id)!).filter(Boolean);
  // Append any habits not in orderedIds (safety)
  const remaining = habits.filter((h) => !orderedIds.includes(h.id));
  await AsyncStorage.setItem(KEY, JSON.stringify([...reordered, ...remaining]));
}

/** Auto-archive habits whose endDate has passed */
export async function archiveExpiredHabits(): Promise<void> {
  const habits = await getHabits();
  const todayStr = todayISO();
  let changed = false;
  const updated = habits.map((h) => {
    if (
      !h.isArchived &&
      h.repeat?.endDate &&
      h.repeat.endDate < todayStr
    ) {
      changed = true;
      return { ...h, isArchived: true };
    }
    return h;
  });
  if (changed) {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
}

// ── Done tracking ──

const DONE_KEY = "habits_done:v1"; // { "YYYY-MM-DD": { [habitId]: number } }

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getDoneToday(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
  return all[todayISO()] ?? {};
}

export async function getDoneForDate(dateISO: string): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
  return all[dateISO] ?? {};
}

export async function getAllDone(): Promise<Record<string, Record<string, number>>> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
}

/** Increment completion count for a habit on a specific date (e.g. past day or today), up to goalCount. If already at goal, reset to 0. */
export async function incrementDoneForDate(
  habitId: string,
  dateISO: string,
  goalCount: number = 1
): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};

  const map = all[dateISO] ?? {};
  const current = map[habitId] ?? 0;

  // If at or above goal → reset to 0, otherwise increment
  const next = current >= goalCount ? 0 : current + 1;

  const updated = { ...map, [habitId]: next };
  all[dateISO] = updated;

  await AsyncStorage.setItem(DONE_KEY, JSON.stringify(all));
  return updated;
}

/** Set exact completion count for a habit on a specific date (e.g. from slider) */
export async function setDoneForDate(
  habitId: string,
  dateISO: string,
  count: number
): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};

  const map = all[dateISO] ?? {};
  const updated = { ...map, [habitId]: Math.max(0, count) };
  all[dateISO] = updated;

  await AsyncStorage.setItem(DONE_KEY, JSON.stringify(all));
  return updated;
}

/** Increment completion count for a habit today, up to goalCount. If already at goal, reset to 0. */
export async function incrementDoneToday(
  habitId: string,
  goalCount: number = 1
): Promise<Record<string, number>> {
  return incrementDoneForDate(habitId, todayISO(), goalCount);
}

/** Toggle completion for a habit on a specific date */
export async function toggleDoneForDate(
  habitId: string,
  dateISO: string,
  goalCount: number = 1
): Promise<Record<string, number>> {
  return incrementDoneForDate(habitId, dateISO, goalCount);
}

/** @deprecated — use incrementDoneToday instead */
export async function toggleDoneToday(habitId: string): Promise<Record<string, number>> {
  return incrementDoneToday(habitId, 1);
}

// ── Streaks ──

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export async function getStreak(habitId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(DONE_KEY);
  const all = raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};

  const habits = await getHabits();
  const habit = habits.find((h) => h.id === habitId);
  const goalCount = habit?.goal?.enabled ? habit.goal.count : 1;

  const isDoneOnDay = (iso: string) => (all[iso]?.[habitId] ?? 0) >= goalCount;
  const todayStr = todayISO();
  const start = isDoneOnDay(todayStr) ? todayStr : shiftDate(todayStr, -1);

  let streak = 0;
  let cursor = start;

  while (isDoneOnDay(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

export async function getBestStreak(habitId: string): Promise<number> {
  const all = await getAllDone();
  const habits = await getHabits();
  const habit = habits.find((h) => h.id === habitId);
  const goalCount = habit?.goal?.enabled ? habit.goal.count : 1;
  const isDoneOnDay = (iso: string) => (all[iso]?.[habitId] ?? 0) >= goalCount;

  const dates = Object.keys(all).sort();

  let best = 0;
  let current = 0;

  for (let i = 0; i < dates.length; i++) {
    if (isDoneOnDay(dates[i])) {
      current++;
      if (i > 0) {
        const expected = shiftDate(dates[i - 1], 1);
        if (dates[i] !== expected) current = 1;
      }
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

export async function getTotalCompletions(habitId: string): Promise<number> {
  const all = await getAllDone();
  const habits = await getHabits();
  const habit = habits.find((h) => h.id === habitId);
  const goalCount = habit?.goal?.enabled ? habit.goal.count : 1;
  let total = 0;
  for (const day of Object.values(all)) {
    if ((day[habitId] ?? 0) >= goalCount) total++;
  }
  return total;
}
