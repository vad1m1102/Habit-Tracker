import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    Switch,
    Platform,
    LayoutAnimation,
    UIManager,
} from "react-native";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { getHabits, updateHabit, deleteHabit, Habit } from "../src/storage/habits";
import { categories, getCategoryById } from "../src/data/categories";
import { useTheme } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ICONS = [
    // Спорт & фітнес
    "🏃", "💪", "🧘", "🏋️", "🚴", "⚽", "🏊", "🤸", "🎾", "⛷️", "🥊", "🏄",
    "⛹️", "🤾", "🏇", "🧗", "🏌️", "🤺", "🏸", "🥋",
    // Їжа & здоров'я
    "💧", "🍎", "🥗", "🍵", "💊", "🧃", "🥤", "🫖", "🥑", "🍳", "🫁", "❤️",
    "🥦", "🍌", "🧄", "🥚", "🍯", "🫐",
    // Творчість & навчання
    "📖", "✍️", "🎵", "🎨", "📚", "🎸", "🎮", "💻", "🎹", "📷", "🎬", "🧪",
    "🎻", "🎤", "🖌️", "🧩", "♟️", "🔬",
    // Самопочуття & рутина
    "😴", "🧠", "🧹", "🪥", "🛁", "💤", "🌅", "🧴", "💆", "🧖", "🪞", "🧺",
    "🧘‍♀️", "💅", "🛌",
    // Природа & відпочинок
    "🌿", "🌳", "☀️", "🐕", "🚶", "🏔️", "🌊", "🏕️", "🦋", "🌸",
    "🌻", "🍀", "🌙", "⛅", "🌈",
    // Продуктивність & соціальне
    "📌", "✅", "📝", "⏰", "💬", "🤝", "💡", "🎯", "📊", "💰",
    "📅", "🗂️", "📈", "🔑", "🏆",
    // Подорожі & транспорт
    "✈️", "🚗", "🚆", "🗺️", "🏖️", "🎒", "⛵",
    // Домашні тварини
    "🐱", "🐶", "🐰", "🐠", "🦜", "🐾",
    // Емоції & мотивація
    "😊", "🙏", "🔥", "⭐", "💎", "🫶", "✨",
];
const COLORS = [
    "#F5A623", "#E17055", "#FF6B6B", "#6C5CE7",
    "#00B894", "#0984E3", "#FDCB6E", "#A29BFE",
    "#FF9FF3", "#54A0FF", "#5F27CD", "#01A3A4",
    "#F368E0", "#10AC84", "#EE5A24", "#2C3A47",
];

export default function EditHabit() {
    const c = useTheme();
    const params = useLocalSearchParams<{ habitId: string }>();

    const [habit, setHabit] = useState<Habit | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("📌");
    const [color, setColor] = useState("#F5A623");
    const [category, setCategory] = useState("");
    const [showCategory, setShowCategory] = useState(false);
    const [repeatEnabled, setRepeatEnabled] = useState(true);
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [endDateEnabled, setEndDateEnabled] = useState(false);
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [goalEnabled, setGoalEnabled] = useState(true);
    const [goalCount, setGoalCount] = useState(1);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(20, 0, 0, 0);
        return d;
    });
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [showIcons, setShowIcons] = useState(false);
    const [showColors, setShowColors] = useState(false);

    useEffect(() => {
        (async () => {
            const habits = await getHabits();
            const found = habits.find((h) => h.id === params.habitId);
            if (!found) return;
            setHabit(found);
            setTitle(found.title);
            setDescription(found.description || "");
            setIcon(found.icon);
            setColor(found.color);
            setCategory(found.category || "");
            setRepeatEnabled(true);
            setSelectedDays(found.repeat?.days ?? [0, 1, 2, 3, 4, 5, 6]);
            if (found.repeat?.endDate) {
                setEndDateEnabled(true);
                setEndDate(new Date(found.repeat.endDate));
            }
            setGoalEnabled(found.goal?.enabled ?? true);
            setGoalCount(found.goal?.count ?? 1);
            setReminderEnabled(found.reminder?.enabled ?? false);
            if (found.reminder?.time) {
                const [h, m] = found.reminder.time.split(":").map(Number);
                const t = new Date();
                t.setHours(h, m, 0, 0);
                setReminderTime(t);
            }
        })();
    }, [params.habitId]);

    const toggleDay = (dayIdx: number) => {
        setSelectedDays((prev) =>
            prev.includes(dayIdx)
                ? prev.filter((d) => d !== dayIdx)
                : [...prev, dayIdx]
        );
    };

    const saveChanges = async () => {
        if (!habit || !title.trim()) return;
        await updateHabit(habit.id, {
            title: title.trim(),
            description: description || undefined,
            icon,
            color,
            category,
            repeat: {
                type: "daily",
                days: selectedDays,
                endDate: endDateEnabled ? endDate.toISOString().split("T")[0] : undefined,
            },
            goal: { enabled: goalEnabled, count: goalCount, period: "day" },
            reminder: {
                enabled: reminderEnabled,
                time: `${String(reminderTime.getHours()).padStart(2, "0")}:${String(reminderTime.getMinutes()).padStart(2, "0")}`,
            },
        });
        router.back();
    };

    const handleDelete = async () => {
        if (!habit) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteHabit(habit.id);
        router.back();
    };

    if (!habit) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
                <Text style={{ color: c.text, textAlign: "center", marginTop: 40 }}>
                    Завантаження...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: c.text }]}>Редагувати</Text>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        saveChanges();
                    }}
                    style={({ pressed }) => [
                        styles.saveBtnWrap,
                        { backgroundColor: c.accent },
                        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                    ]}
                >
                    <Text style={styles.saveBtnText}>Зберегти</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <TextInput
                        placeholder="Назва звички"
                        value={title}
                        onChangeText={setTitle}
                        maxLength={50}
                        style={[styles.input, { color: c.text }]}
                        placeholderTextColor={c.sub}
                    />
                    {title.length > 40 && (
                        <Text style={[styles.charCounter, { color: c.sub }]}>
                            {title.length}/50
                        </Text>
                    )}
                </View>

                {/* Description */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <TextInput
                        placeholder="Запишіть свої думки та емоції."
                        value={description}
                        onChangeText={setDescription}
                        maxLength={200}
                        style={[styles.input, styles.textArea, { color: c.text }]}
                        placeholderTextColor={c.sub}
                        multiline
                        numberOfLines={3}
                    />
                    {description.length > 160 && (
                        <Text style={[styles.charCounter, { color: c.sub }]}>
                            {description.length}/200
                        </Text>
                    )}
                </View>

                {/* Icon / Color */}
                <View style={styles.row3}>
                    <Pressable
                        style={[styles.selector, { backgroundColor: c.card }]}
                        onPress={() => { setShowIcons(!showIcons); setShowColors(false); }}
                    >
                        <Text style={[styles.selectorLabel, { color: c.text }]}>Іконка {icon}</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.selector, { backgroundColor: c.card }]}
                        onPress={() => { setShowColors(!showColors); setShowIcons(false); }}
                    >
                        <Text style={[styles.selectorLabel, { color: c.text }]}>Колір</Text>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                    </Pressable>
                </View>

                {showIcons && (
                    <View style={[styles.section, { backgroundColor: c.card, maxHeight: 220 }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.pickerGrid}>
                                {ICONS.map((em) => (
                                    <Pressable
                                        key={em}
                                        onPress={() => { setIcon(em); setShowIcons(false); }}
                                        style={[
                                            styles.pickerItem,
                                            { backgroundColor: icon === em ? c.accentOrange + "33" : c.surface },
                                        ]}
                                    >
                                        <Text style={{ fontSize: 22 }}>{em}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {showColors && (
                    <View style={[styles.section, { backgroundColor: c.card }]}>
                        <View style={styles.pickerGrid}>
                            {COLORS.map((cl) => (
                                <Pressable
                                    key={cl}
                                    onPress={() => { setColor(cl); setShowColors(false); }}
                                    style={[
                                        styles.colorPickItem,
                                        { backgroundColor: cl },
                                        color === cl && { borderWidth: 3, borderColor: "#fff" },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Category */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <Pressable
                        style={styles.sectionRow}
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setShowCategory(!showCategory);
                        }}
                    >
                        <Text style={[styles.sectionLabel, { color: c.text }]}>Категорія</Text>
                        <Text style={{ color: c.sub, fontSize: 14 }}>
                            {getCategoryById(category)?.name || "Без категорії"}
                        </Text>
                    </Pressable>
                    {showCategory && (
                        <View style={{ marginTop: 12, gap: 6 }}>
                            {categories.map((cat) => (
                                <Pressable
                                    key={cat.id}
                                    onPress={() => {
                                        setCategory(cat.id);
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setShowCategory(false);
                                    }}
                                    style={[
                                        styles.categoryItem,
                                        { backgroundColor: category === cat.id ? cat.color + "33" : c.surface },
                                    ]}
                                >
                                    <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                                    <Text style={[{ color: c.text, fontSize: 14, fontWeight: "600", flex: 1 }]}>
                                        {cat.name}
                                    </Text>
                                    {category === cat.id && (
                                        <Ionicons name="checkmark" size={18} color={c.accent} />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>


                {/* Repeat */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <View style={styles.sectionRow}>
                        <Text style={[styles.sectionLabel, { color: c.text }]}>Повторення</Text>
                        <Switch
                            value={repeatEnabled}
                            onValueChange={setRepeatEnabled}
                            trackColor={{ false: c.surface, true: c.accentOrange }}
                            thumbColor="#fff"
                        />
                    </View>

                    {repeatEnabled && (
                        <>
                            <View style={[styles.daysRow, { marginTop: 12 }]}>
                                {DAY_LABELS.map((label, idx) => {
                                    const active = selectedDays.includes(idx);
                                    return (
                                        <Pressable
                                            key={idx}
                                            onPress={() => toggleDay(idx)}
                                            style={[
                                                styles.dayBtn,
                                                {
                                                    backgroundColor: active ? c.accentOrange : c.surface,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayBtnText,
                                                    { color: active ? "#000" : c.sub },
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* End date */}
                            <View style={[styles.sectionRow, { marginTop: 12 }]}>
                                <Text style={[styles.smallLabel, { color: c.text }]}>
                                    Дата завершення
                                </Text>
                                <Switch
                                    value={endDateEnabled}
                                    onValueChange={(v) => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setEndDateEnabled(v);
                                        if (v) setShowDatePicker(true);
                                        else setShowDatePicker(false);
                                    }}
                                    trackColor={{ false: c.surface, true: c.accentOrange }}
                                    thumbColor="#fff"
                                />
                            </View>

                            {endDateEnabled && (
                                <Pressable
                                    onPress={() => {
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setShowDatePicker(true);
                                    }}
                                    style={[styles.dateDisplay, { backgroundColor: c.surface }]}
                                >
                                    <Text style={[styles.dateDisplayText, { color: c.text }]}>
                                        {endDate.toLocaleDateString("uk-UA")}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={18} color={c.sub} />
                                </Pressable>
                            )}

                            {showDatePicker && (
                                <>
                                    <DateTimePicker
                                        value={endDate}
                                        mode="date"
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        minimumDate={new Date()}
                                        onChange={(_, selected) => {
                                            if (Platform.OS !== "ios") {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                setShowDatePicker(false);
                                            }
                                            if (selected) setEndDate(selected);
                                        }}
                                        themeVariant="dark"
                                    />
                                    {Platform.OS === "ios" && (
                                        <Pressable
                                            onPress={() => {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                setShowDatePicker(false);
                                            }}
                                            style={[styles.doneBtn, { backgroundColor: c.accent }]}
                                        >
                                            <Text style={styles.doneBtnText}>Готово</Text>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* Goal */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <View style={styles.sectionRow}>
                        <Text style={[styles.sectionLabel, { color: c.text }]}>Ціль</Text>
                        <Switch
                            value={goalEnabled}
                            onValueChange={(v) => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setGoalEnabled(v);
                            }}
                            trackColor={{ false: c.surface, true: c.accentOrange }}
                            thumbColor="#fff"
                        />
                    </View>
                    {goalEnabled && (
                        <View style={[styles.stepperRow, { backgroundColor: c.surface }]}>
                            <Pressable
                                onPress={() => setGoalCount(Math.max(1, goalCount - 1))}
                                style={[styles.stepperBtn, { backgroundColor: c.card }]}
                            >
                                <Ionicons name="remove" size={20} color={c.text} />
                            </Pressable>
                            <Text style={[styles.stepperValue, { color: c.text }]}>
                                {goalCount} {goalCount === 1 ? "раз" : goalCount < 5 ? "рази" : "разів"} на день
                            </Text>
                            <Pressable
                                onPress={() => setGoalCount(Math.min(20, goalCount + 1))}
                                style={[styles.stepperBtn, { backgroundColor: c.card }]}
                            >
                                <Ionicons name="add" size={20} color={c.text} />
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Reminder */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <View style={styles.sectionRow}>
                        <Text style={[styles.sectionLabel, { color: c.text }]}>Нагадування</Text>
                        <Switch
                            value={reminderEnabled}
                            onValueChange={(v) => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setReminderEnabled(v);
                                if (!v) setShowTimePicker(false);
                            }}
                            trackColor={{ false: c.surface, true: c.accentOrange }}
                            thumbColor="#fff"
                        />
                    </View>
                    {reminderEnabled && (
                        <>
                            <Pressable
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setShowTimePicker(true);
                                }}
                                style={[styles.dateDisplay, { backgroundColor: c.surface }]}
                            >
                                <Text style={[styles.dateDisplayText, { color: c.text }]}>
                                    {String(reminderTime.getHours()).padStart(2, "0")}:
                                    {String(reminderTime.getMinutes()).padStart(2, "0")}
                                </Text>
                                <Ionicons name="time-outline" size={18} color={c.sub} />
                            </Pressable>

                            {showTimePicker && (
                                <>
                                    <DateTimePicker
                                        value={reminderTime}
                                        mode="time"
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        is24Hour={true}
                                        onChange={(_, selected) => {
                                            if (Platform.OS !== "ios") {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                setShowTimePicker(false);
                                            }
                                            if (selected) setReminderTime(selected);
                                        }}
                                        themeVariant="dark"
                                    />
                                    {Platform.OS === "ios" && (
                                        <Pressable
                                            onPress={() => {
                                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                                setShowTimePicker(false);
                                            }}
                                            style={[styles.doneBtn, { backgroundColor: c.accent }]}
                                        >
                                            <Text style={styles.doneBtnText}>Готово</Text>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* Delete button */}
                <View style={[styles.section, { backgroundColor: c.card }]}>
                    <Pressable
                        onPress={handleDelete}
                        style={({ pressed }) => [
                            styles.deleteRow,
                            pressed && { opacity: 0.7 },
                        ]}
                    >
                        <Ionicons name="trash-outline" size={20} color="#FF453A" />
                        <Text style={styles.deleteBtnText}>Видалити звичку</Text>
                    </Pressable>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
    headerTitle: { fontSize: 18, fontWeight: "700" },
    saveBtnWrap: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },
    section: { borderRadius: 14, padding: 14, marginBottom: 12 },
    input: { fontSize: 16, padding: 0 },
    textArea: { minHeight: 60, textAlignVertical: "top" },
    charCounter: { fontSize: 11, textAlign: "right", marginTop: 4 },
    row3: { flexDirection: "row", gap: 8, marginBottom: 12 },
    selector: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        padding: 12,
        gap: 6,
    },
    selectorLabel: { fontSize: 14, fontWeight: "600" },
    colorDot: { width: 20, height: 20, borderRadius: 10 },
    pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    pickerItem: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    colorPickItem: { width: 44, height: 44, borderRadius: 22 },
    sectionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sectionLabel: { fontSize: 16, fontWeight: "600" },
    smallLabel: { fontSize: 14 },
    daysRow: { flexDirection: "row", justifyContent: "space-between" },
    dayBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center",
    },
    dayBtnText: { fontSize: 13, fontWeight: "700" },
    dateDisplay: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
    },
    dateDisplayText: { fontSize: 14, fontWeight: "600" },
    stepperRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 10,
        padding: 8,
        marginTop: 10,
    },
    stepperBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },
    stepperValue: { fontSize: 14, fontWeight: "600" },
    doneBtn: {
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    doneBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 10,
        padding: 10,
    },
    deleteRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FF453A",
    },
});
