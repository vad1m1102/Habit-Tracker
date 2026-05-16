import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Dimensions,
    Modal,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
    getHabits,
    Habit,
    getAllDone,
    getStreak,
    getBestStreak,
    getTotalCompletions,
} from "../../src/storage/habits";
import { useTheme } from "../../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeTabs from "../../src/ui/SwipeTabs";
import * as Haptics from "expo-haptics";

const SCREEN_W = Dimensions.get("window").width;

/* ── Helpers ── */

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

function getMonday(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    dt.setDate(dt.getDate() - ((day + 6) % 7));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function getWeekRange(iso: string): string[] {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) dates.push(shiftDate(iso, i));
    return dates;
}

const SHORT_MONTHS = [
    "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
    "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
];

const SHORT_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

type HabitAnalytics = {
    habit: Habit;
    streak: number;
    bestStreak: number;
    totalCompletions: number;
    completionRate: number; // 0-100
    weeklyData: number[]; // last 7 days completions
    weeklyLabels: string[]; // day labels for the last 7 days
};

type OverviewStats = {
    totalHabits: number;
    activeHabits: number;
    totalCompletionsToday: number;
    totalGoalsToday: number;
    currentBestStreak: number;
    bestStreakHabit: string;
    weeklyCompletionRates: number[]; // last 7 weeks, each 0-100
};

/* ── Circular Progress (SVG) ── */
function CircularProgress({
    progress,
    size = 80,
    strokeWidth = 6,
    c,
}: {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    c: ReturnType<typeof useTheme>;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size} style={{ position: "absolute" }}>
                {/* Background circle */}
                <SvgCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={c.surface}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <SvgCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={c.accent}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <Text style={[styles.circularText, { color: c.accent }]}>
                {progress}%
            </Text>
        </View>
    );
}

/* ── Heatmap Component ── */
function Heatmap({
    allDone,
    habits,
    c,
}: {
    allDone: Record<string, Record<string, number>>;
    habits: Habit[];
    c: ReturnType<typeof useTheme>;
}) {
    const [selectedCell, setSelectedCell] = useState<{ dateISO: string; completed: number; total: number } | null>(null);

    const WEEKS_COUNT = 5;
    const today = todayISO();
    const currentMonday = getMonday(today);

    const weeks: string[][] = [];
    for (let w = -(WEEKS_COUNT - 1); w <= 0; w++) {
        const monday = shiftDate(currentMonday, w * 7);
        weeks.push(getWeekRange(monday));
    }

    // Compute intensity + details per day
    const getDayInfo = (dateISO: string): { intensity: number; completed: number; total: number } => {
        const dayDone = allDone[dateISO];
        const [y, m, d] = dateISO.split("-").map(Number);
        const jsDay = new Date(y, m - 1, d).getDay();
        const dayIdx = (jsDay + 6) % 7;

        const scheduled = habits.filter((h) => {
            const createdISO = h.createdAt?.split("T")[0];
            if (createdISO && dateISO < createdISO) return false;
            if (h.repeat?.days && h.repeat.days.length > 0) {
                if (!h.repeat.days.includes(dayIdx)) return false;
            }
            return true;
        });

        if (scheduled.length === 0) return { intensity: 0, completed: 0, total: 0 };
        if (!dayDone) return { intensity: 0, completed: 0, total: scheduled.length };

        const completed = scheduled.filter((h) => (dayDone[h.id] ?? 0) > 0).length;
        return { intensity: Math.min(completed / scheduled.length, 1), completed, total: scheduled.length };
    };

    const gap = 4;
    const gridWidth = SCREEN_W - 32 - 36;
    const cellSize = Math.floor((gridWidth - 6 * gap) / 7);

    // Month labels
    const monthLabels: string[] = [];
    let lastMonth = -1;
    weeks.forEach((week) => {
        const [y, m] = week[0].split("-").map(Number);
        if (m !== lastMonth) {
            monthLabels.push(SHORT_MONTHS[m - 1]);
            lastMonth = m;
        }
    });

    const formatDate = (iso: string) => {
        const [y, m, d] = iso.split("-").map(Number);
        return `${d} ${SHORT_MONTHS[m - 1]}`;
    };

    const getDayNum = (iso: string) => {
        return parseInt(iso.split("-")[2], 10);
    };

    return (
        <View>
            {/* Tooltip */}
            {selectedCell && (
                <View style={[styles.heatmapTooltip, { backgroundColor: c.surface }]}>
                    <Text style={[styles.heatmapTooltipText, { color: c.text }]}>
                        {formatDate(selectedCell.dateISO)}: {selectedCell.completed}/{selectedCell.total} виконано
                    </Text>
                    <Pressable onPress={() => setSelectedCell(null)}>
                        <Text style={[styles.heatmapTooltipClose, { color: c.sub }]}>✕</Text>
                    </Pressable>
                </View>
            )}

            {/* Month title */}
            <Text style={{ color: c.sub, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                {monthLabels.join(" – ")}
            </Text>

            {/* Day labels on top */}
            <View style={{ flexDirection: "row", gap, marginBottom: 4 }}>
                {SHORT_DAYS.map((label, i) => (
                    <View key={i} style={{ width: cellSize, alignItems: "center" }}>
                        <Text style={{ color: c.sub, fontSize: 11, fontWeight: "600" }}>
                            {label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Grid: rows = weeks, cols = days */}
            {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: "row", gap, marginBottom: gap }}>
                    {week.map((dateISO, di) => {
                        const { intensity, completed, total } = getDayInfo(dateISO);
                        const isToday = dateISO === today;
                        const isFuture = dateISO > today;
                        const isSelected = selectedCell?.dateISO === dateISO;
                        const dayNum = getDayNum(dateISO);

                        let bg = c.surface;
                        if (!isFuture && intensity > 0) {
                            if (intensity <= 0.25) bg = c.accent + "40";
                            else if (intensity <= 0.5) bg = c.accent + "70";
                            else if (intensity <= 0.75) bg = c.accent + "B0";
                            else bg = c.accent;
                        }

                        return (
                            <Pressable
                                key={di}
                                onPress={() => {
                                    if (!isFuture) {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedCell(
                                            isSelected ? null : { dateISO, completed, total }
                                        );
                                    }
                                }}
                                style={[
                                    styles.heatmapCell,
                                    {
                                        width: cellSize,
                                        height: cellSize,
                                        borderRadius: 6,
                                        backgroundColor: isToday
                                            ? c.accent
                                            : isFuture
                                                ? c.surface + "60"
                                                : bg,
                                        borderWidth: isToday ? 2.5 : isSelected ? 1.5 : 0,
                                        borderColor: isToday ? "#fff" : isSelected ? c.text : "transparent",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: isToday ? "800" : "600",
                                        color: isToday ? "#000" : isFuture ? c.sub + "50" : intensity >= 0.75 ? "#000" : c.sub,
                                    }}
                                >
                                    {dayNum}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            ))}

            {/* Legend */}
            <View style={[styles.heatmapLegend, { marginTop: 8 }]}>
                <Text style={[styles.heatmapLegendText, { color: c.sub }]}>Менше</Text>
                {[c.surface, c.accent + "40", c.accent + "70", c.accent + "B0", c.accent].map(
                    (bg, i) => (
                        <View
                            key={i}
                            style={[styles.heatmapLegendCell, { backgroundColor: bg, borderRadius: 3 }]}
                        />
                    )
                )}
                <Text style={[styles.heatmapLegendText, { color: c.sub }]}>Більше</Text>
            </View>
        </View>
    );
}

/* ── Weekly Bar Chart ── */
function WeeklyBarChart({
    data,
    labels,
    c,
}: {
    data: number[];
    labels: string[];
    c: ReturnType<typeof useTheme>;
}) {
    const maxVal = Math.max(...data, 1);

    return (
        <View style={styles.barChartContainer}>
            {data.map((val, i) => (
                <View key={i} style={styles.barChartCol}>
                    <View style={styles.barChartBarWrap}>
                        <View
                            style={[
                                styles.barChartBar,
                                {
                                    backgroundColor: val > 0 ? c.accent : c.surface,
                                    height: `${Math.max((val / maxVal) * 100, 4)}%`,
                                },
                            ]}
                        />
                    </View>
                    <Text style={[styles.barChartLabel, { color: c.sub }]}>{labels[i]}</Text>
                    <Text style={[styles.barChartValue, { color: val > 0 ? c.accent : c.sub }]}>
                        {val}
                    </Text>
                </View>
            ))}
        </View>
    );
}

/* ── Per-habit Row ── */
function HabitAnalyticsRow({
    data,
    c,
}: {
    data: HabitAnalytics;
    c: ReturnType<typeof useTheme>;
}) {
    const { habit, streak, bestStreak, totalCompletions, completionRate, weeklyData, weeklyLabels } = data;
    const maxWeekly = Math.max(...weeklyData, 1);

    return (
        <View style={[styles.habitRow, { backgroundColor: c.card }]}>
            {/* Header */}
            <View style={styles.habitRowHeader}>
                <View style={[styles.habitIcon, { backgroundColor: habit.color + "40" }]}>
                    <Text style={styles.habitIconEmoji}>{habit.icon}</Text>
                </View>
                <View style={styles.habitRowInfo}>
                    <Text style={[styles.habitRowTitle, { color: c.text }]} numberOfLines={1}>
                        {habit.title}
                    </Text>
                    <Text style={[styles.habitRowSub, { color: c.sub }]}>
                        {completionRate}% виконань
                    </Text>
                </View>
            </View>

            {/* Stats grid */}
            <View style={styles.habitStatsGrid}>
                <View style={styles.habitStatItem}>
                    <Ionicons name="flame" size={16} color={c.accentOrange} />
                    <Text style={[styles.habitStatValue, { color: c.text }]}>{streak}</Text>
                    <Text style={[styles.habitStatLabel, { color: c.sub }]}>Стрік</Text>
                </View>
                <View style={styles.habitStatItem}>
                    <Ionicons name="trophy" size={16} color={c.accent} />
                    <Text style={[styles.habitStatValue, { color: c.text }]}>{bestStreak}</Text>
                    <Text style={[styles.habitStatLabel, { color: c.sub }]}>Рекорд</Text>
                </View>
                <View style={styles.habitStatItem}>
                    <Ionicons name="checkmark-done" size={16} color={c.accent} />
                    <Text style={[styles.habitStatValue, { color: c.text }]}>{totalCompletions}</Text>
                    <Text style={[styles.habitStatLabel, { color: c.sub }]}>Разів</Text>
                </View>
            </View>

            {/* Mini weekly sparkline */}
            <View style={styles.sparklineWrap}>
                {weeklyData.map((val, i) => (
                    <View key={i} style={styles.sparklineCol}>
                        <View style={[styles.sparklineTrack, { backgroundColor: c.surface }]}>
                            <View
                                style={[
                                    styles.sparklineFill,
                                    {
                                        backgroundColor: val > 0 ? c.accent : "transparent",
                                        height: `${Math.max((val / maxWeekly) * 100, 6)}%`,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.sparklineLabel, { color: c.sub }]}>
                            {weeklyLabels[i]?.charAt(0) ?? SHORT_DAYS[i]?.charAt(0)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

/* ── Main Analytics Screen ── */
export default function Analytics() {
    const c = useTheme();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [allDone, setAllDone] = useState<Record<string, Record<string, number>>>({});
    const [habitAnalytics, setHabitAnalytics] = useState<HabitAnalytics[]>([]);
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [selectedTab, setSelectedTab] = useState<"overview" | "habits">("overview");
    const [habitsFilter, setHabitsFilter] = useState<"active" | "archived">("active");

    const load = useCallback(() => {
        (async () => {
            const [h, done] = await Promise.all([getHabits(), getAllDone()]);
            setHabits(h);
            setAllDone(done);

            const activeHabits = h.filter((x) => !x.isArchived);
            const today = todayISO();
            const todayDone = done[today] ?? {};

            // Overview stats
            let completedToday = 0;
            let totalGoalsToday = 0;
            let bestStreakVal = 0;
            let bestStreakHabitName = "";

            const analytics: HabitAnalytics[] = [];

            const allHabits = h;

            for (const habit of allHabits) {
                const goalCount = habit.goal?.enabled ? habit.goal.count : 1;
                const streak = await getStreak(habit.id);
                const best = await getBestStreak(habit.id);
                const total = await getTotalCompletions(habit.id);

                // Completion rate: days completed / days since creation
                const createdDate = habit.createdAt?.split("T")[0] ?? today;
                const daysSinceCreation = Math.max(1, daysBetween(createdDate, today));
                const rate = Math.round((total / daysSinceCreation) * 100);

                // Weekly data (last 7 days) with correct day labels
                const weeklyData: number[] = [];
                const weeklyLabels: string[] = [];
                for (let i = 6; i >= 0; i--) {
                    const dateISO = shiftDate(today, -i);
                    weeklyData.push(done[dateISO]?.[habit.id] ?? 0);
                    const [yy, mm, dd] = dateISO.split("-").map(Number);
                    const jsDay = new Date(yy, mm - 1, dd).getDay();
                    weeklyLabels.push(SHORT_DAYS[(jsDay + 6) % 7]);
                }

                // Today's check (only for active habits)
                if (!habit.isArchived) {
                    const doneToday = todayDone[habit.id] ?? 0;
                    if (doneToday >= goalCount) completedToday++;
                    totalGoalsToday++;
                }

                if (best > bestStreakVal) {
                    bestStreakVal = best;
                    bestStreakHabitName = habit.title;
                }

                analytics.push({
                    habit,
                    streak,
                    bestStreak: best,
                    totalCompletions: total,
                    completionRate: Math.min(rate, 100),
                    weeklyData,
                    weeklyLabels,
                });
            }

            // Weekly completion rates (last 7 weeks)
            const weeklyRates: number[] = [];
            for (let w = 6; w >= 0; w--) {
                const weekStart = shiftDate(today, -w * 7);
                let weekCompleted = 0;
                let weekTotal = 0;
                for (let d = 0; d < 7; d++) {
                    const dateISO = shiftDate(weekStart, d);
                    const dayDone = done[dateISO] ?? {};
                    for (const habit of activeHabits) {
                        weekTotal++;
                        if ((dayDone[habit.id] ?? 0) > 0) weekCompleted++;
                    }
                }
                weeklyRates.push(weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0);
            }

            // Sort analytics by streak (descending)
            analytics.sort((a, b) => b.streak - a.streak);

            setHabitAnalytics(analytics);
            setOverview({
                totalHabits: h.length,
                activeHabits: activeHabits.length,
                totalCompletionsToday: completedToday,
                totalGoalsToday: totalGoalsToday,
                currentBestStreak: bestStreakVal,
                bestStreakHabit: bestStreakHabitName,
                weeklyCompletionRates: weeklyRates,
            });
        })();
    }, []);

    useFocusEffect(load);

    // Daily completions for last 7 days (bar chart)
    const last7Days = useMemo(() => {
        const today = todayISO();
        const data: number[] = [];
        const labels: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const dateISO = shiftDate(today, -i);
            const dayDone = allDone[dateISO] ?? {};
            const count = Object.values(dayDone).filter((v) => v > 0).length;
            data.push(count);
            const [, , d] = dateISO.split("-");
            labels.push(SHORT_DAYS[(new Date(dateISO).getDay() + 6) % 7].substring(0, 2));
        }
        return { data, labels };
    }, [allDone]);

    const todayProgress = overview
        ? overview.totalGoalsToday > 0
            ? Math.round((overview.totalCompletionsToday / overview.totalGoalsToday) * 100)
            : 0
        : 0;

    return (
        <SwipeTabs>
            <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
                <Text style={[styles.title, { color: c.text }]}>Аналітика</Text>

                {/* Tabs */}
                <View style={[styles.tabBar, { backgroundColor: c.card }]}>
                    <Pressable
                        style={[
                            styles.tabItem,
                            selectedTab === "overview" && [styles.tabItemActive, { backgroundColor: c.accent }],
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedTab("overview");
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: selectedTab === "overview" ? "#000" : c.sub },
                            ]}
                        >
                            Огляд
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.tabItem,
                            selectedTab === "habits" && [styles.tabItemActive, { backgroundColor: c.accent }],
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedTab("habits");
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: selectedTab === "habits" ? "#000" : c.sub },
                            ]}
                        >
                            По звичках
                        </Text>
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {selectedTab === "overview" ? (
                        <>
                            {/* Today's progress */}
                            {overview && (
                                <View style={[styles.card, { backgroundColor: c.card }]}>
                                    <View style={styles.cardHeader}>
                                        <Ionicons name="today" size={18} color={c.accent} />
                                        <Text style={[styles.cardTitle, { color: c.text }]}>Сьогодні</Text>
                                    </View>

                                    <View style={styles.todayRow}>
                                        {/* Circular progress */}
                                        <View style={styles.circularWrap}>
                                            <CircularProgress progress={todayProgress} c={c} />
                                        </View>

                                        <View style={styles.todayStats}>
                                            <View style={styles.todayStatRow}>
                                                <Ionicons name="checkmark-circle" size={18} color={c.accent} />
                                                <Text style={[styles.todayStatText, { color: c.text }]}>
                                                    {overview.totalCompletionsToday}/{overview.totalGoalsToday} виконано
                                                </Text>
                                            </View>
                                            <View style={styles.todayStatRow}>
                                                <Ionicons name="flame" size={18} color={c.accentOrange} />
                                                <Text style={[styles.todayStatText, { color: c.text }]}>
                                                    Найкращий стрік: {overview.currentBestStreak}🔥
                                                </Text>
                                            </View>
                                            {overview.bestStreakHabit ? (
                                                <Text style={[styles.todayStreakHabit, { color: c.sub }]} numberOfLines={1}>
                                                    ({overview.bestStreakHabit})
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Heatmap */}
                            <View style={[styles.card, { backgroundColor: c.card }]}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="grid" size={18} color={c.accent} />
                                    <Text style={[styles.cardTitle, { color: c.text }]}>Активність</Text>
                                </View>
                                <Heatmap allDone={allDone} habits={habits} c={c} />
                            </View>

                            {/* Weekly bar chart */}
                            <View style={[styles.card, { backgroundColor: c.card }]}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="bar-chart" size={18} color={c.accent} />
                                    <Text style={[styles.cardTitle, { color: c.text }]}>
                                        Останні 7 днів
                                    </Text>
                                </View>
                                <WeeklyBarChart
                                    data={last7Days.data}
                                    labels={last7Days.labels}
                                    c={c}
                                />
                            </View>

                            {/* Summary cards */}
                            {overview && (
                                <View style={styles.summaryRow}>
                                    <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
                                        <Ionicons name="list" size={22} color={c.accent} />
                                        <Text style={[styles.summaryValue, { color: c.text }]}>
                                            {overview.activeHabits}
                                        </Text>
                                        <Text style={[styles.summaryLabel, { color: c.sub }]}>Активних</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
                                        <Ionicons name="archive" size={22} color={c.accentOrange} />
                                        <Text style={[styles.summaryValue, { color: c.text }]}>
                                            {overview.totalHabits - overview.activeHabits}
                                        </Text>
                                        <Text style={[styles.summaryLabel, { color: c.sub }]}>В архіві</Text>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Active / Archived sub-filter */}
                            <View style={[styles.subFilterBar, { backgroundColor: c.card }]}>
                                <Pressable
                                    style={[
                                        styles.subFilterItem,
                                        habitsFilter === "active" && [styles.subFilterItemActive, { backgroundColor: c.accent }],
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setHabitsFilter("active");
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.subFilterText,
                                            { color: habitsFilter === "active" ? "#000" : c.sub },
                                        ]}
                                    >
                                        Активні
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[
                                        styles.subFilterItem,
                                        habitsFilter === "archived" && [styles.subFilterItemActive, { backgroundColor: c.accentOrange }],
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setHabitsFilter("archived");
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.subFilterText,
                                            { color: habitsFilter === "archived" ? "#000" : c.sub },
                                        ]}
                                    >
                                        Архів
                                    </Text>
                                </Pressable>
                            </View>

                            {/* Per-habit analytics */}
                            {habitAnalytics
                                .filter((d) =>
                                    habitsFilter === "active"
                                        ? !d.habit.isArchived
                                        : d.habit.isArchived
                                )
                                .map((data) => (
                                    <HabitAnalyticsRow key={data.habit.id} data={data} c={c} />
                                ))}
                            {habitAnalytics.filter((d) =>
                                habitsFilter === "active" ? !d.habit.isArchived : d.habit.isArchived
                            ).length === 0 && (
                                    <View style={[styles.emptyCard, { backgroundColor: c.card }]}>
                                        <Ionicons name="analytics-outline" size={48} color={c.sub} />
                                        <Text style={[styles.emptyText, { color: c.sub }]}>
                                            {habitsFilter === "active"
                                                ? "Додайте звички для аналітики"
                                                : "Немає архівних звичок"}
                                        </Text>
                                    </View>
                                )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </SwipeTabs>
    );
}

/* ── Utils ── */
function daysBetween(a: string, b: string): number {
    const da = new Date(a);
    const db = new Date(b);
    return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── Styles ── */
const styles = StyleSheet.create({
    container: { flex: 1 },
    title: {
        fontSize: 28,
        fontWeight: "800",
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },

    /* Tabs */
    tabBar: {
        flexDirection: "row",
        marginHorizontal: 16,
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 11,
        alignItems: "center",
    },
    tabItemActive: {},
    tabText: {
        fontSize: 15,
        fontWeight: "700",
    },

    /* Card */
    card: {
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "700",
    },

    /* Today */
    todayRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
    circularWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    circularText: {
        fontSize: 18,
        fontWeight: "800",
    },
    todayStats: {
        flex: 1,
        gap: 8,
    },
    todayStatRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    todayStatText: {
        fontSize: 15,
        fontWeight: "600",
    },
    todayStreakHabit: {
        fontSize: 13,
        marginLeft: 26,
    },

    /* Heatmap */
    heatmapMonths: {
        position: "relative",
        marginBottom: 4,
    },
    heatmapMonthLabel: {
        position: "absolute",
        fontSize: 11,
        fontWeight: "600",
    },
    heatmapContainer: {
        flexDirection: "row",
    },
    heatmapDayLabels: {
        width: 26,
        position: "relative",
    },
    heatmapDayLabel: {
        fontSize: 10,
        fontWeight: "600",
        position: "absolute",
    },
    heatmapGrid: {
        flexDirection: "row",
        gap: 3,
    },
    heatmapCol: {
        flexDirection: "column",
    },
    heatmapCell: {},
    heatmapTooltip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 10,
    },
    heatmapTooltipText: {
        fontSize: 13,
        fontWeight: "600",
    },
    heatmapTooltipClose: {
        fontSize: 16,
        fontWeight: "700",
        paddingLeft: 12,
    },
    heatmapLegend: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        marginTop: 10,
    },
    heatmapLegendText: {
        fontSize: 10,
        fontWeight: "600",
    },
    heatmapLegendCell: {
        width: 12,
        height: 12,
    },

    /* Bar Chart */
    barChartContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        height: 130,
        gap: 4,
    },
    barChartCol: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
    },
    barChartBarWrap: {
        flex: 1,
        width: "70%",
        justifyContent: "flex-end",
    },
    barChartBar: {
        borderRadius: 6,
        minHeight: 4,
    },
    barChartLabel: {
        fontSize: 11,
        fontWeight: "600",
        marginTop: 6,
    },
    barChartValue: {
        fontSize: 11,
        fontWeight: "700",
        marginTop: 2,
    },

    /* Summary row */
    summaryRow: {
        flexDirection: "row",
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 18,
        padding: 18,
        alignItems: "center",
        gap: 6,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: "800",
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: "600",
    },

    /* Per-habit row */
    habitRow: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
    },
    habitRowHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
    },
    habitIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    habitIconEmoji: {
        fontSize: 20,
    },
    habitRowInfo: {
        flex: 1,
    },
    habitRowTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    habitRowSub: {
        fontSize: 13,
        marginTop: 2,
    },

    /* Habit stats grid */
    habitStatsGrid: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 14,
    },
    habitStatItem: {
        alignItems: "center",
        gap: 4,
    },
    habitStatValue: {
        fontSize: 18,
        fontWeight: "800",
    },
    habitStatLabel: {
        fontSize: 11,
        fontWeight: "600",
    },

    /* Sparkline */
    sparklineWrap: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    sparklineCol: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    sparklineTrack: {
        width: "100%",
        height: 40,
        borderRadius: 6,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    sparklineFill: {
        width: "100%",
        borderRadius: 6,
        minHeight: 2,
    },
    sparklineLabel: {
        fontSize: 10,
        fontWeight: "600",
    },

    /* Empty */
    emptyCard: {
        borderRadius: 18,
        padding: 40,
        alignItems: "center",
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: "600",
    },

    /* Sub-filter (active/archived) */
    subFilterBar: {
        flexDirection: "row",
        borderRadius: 12,
        padding: 3,
        marginBottom: 14,
    },
    subFilterItem: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: "center",
    },
    subFilterItemActive: {},
    subFilterText: {
        fontSize: 13,
        fontWeight: "700",
    },
});
