import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Platform,
    TextInput,
    Alert,
    Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTheme } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    getReminderSettings,
    saveReminderSettings,
    addCustomTemplate,
    deleteCustomTemplate,
    ReminderSettings,
    ReminderTemplate,
} from "../src/storage/reminderSettings";

export default function RemindersSettings() {
    const c = useTheme();
    const [settings, setSettings] = useState<ReminderSettings | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [customText, setCustomText] = useState("");

    const load = useCallback(() => {
        (async () => {
            const s = await getReminderSettings();
            setSettings(s);
        })();
    }, []);

    useFocusEffect(load);

    if (!settings) return null;

    const timeDate = (() => {
        const [h, m] = settings.time.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    })();

    const formatTime = (t: string) => {
        const [h, m] = t.split(":");
        return `${h}:${m}`;
    };

    const handleTimeChange = async (_: any, date?: Date) => {
        if (Platform.OS === "android") setShowPicker(false);
        if (date) {
            const h = String(date.getHours()).padStart(2, "0");
            const m = String(date.getMinutes()).padStart(2, "0");
            const updated = await saveReminderSettings({ time: `${h}:${m}` });
            setSettings(updated);
        }
    };

    const handleToggle = async () => {
        const updated = await saveReminderSettings({ enabled: !settings.enabled });
        setSettings(updated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSelectTemplate = async (id: string) => {
        const updated = await saveReminderSettings({ selectedTemplateId: id });
        setSettings(updated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleAddTemplate = async () => {
        if (!customText.trim()) return;
        const updated = await addCustomTemplate(customText);
        setSettings(updated);
        setCustomText("");
        setShowAddModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDeleteTemplate = async (t: ReminderTemplate) => {
        if (t.isDefault) return;
        Alert.alert("Видалити шаблон?", t.text, [
            { text: "Скасувати", style: "cancel" },
            {
                text: "Видалити",
                style: "destructive",
                onPress: async () => {
                    const updated = await deleteCustomTemplate(t.id);
                    setSettings(updated);
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color={c.accent} />
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>Нагадування</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Enable toggle */}
                <View style={[styles.card, { backgroundColor: c.card }]}>
                    <View style={styles.rowBetween}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: c.surface }]}>
                                <Ionicons name="notifications" size={20} color={c.accent} />
                            </View>
                            <Text style={[styles.cardLabel, { color: c.text }]}>Нагадування</Text>
                        </View>
                        <Pressable
                            onPress={handleToggle}
                            style={[
                                styles.toggle,
                                {
                                    backgroundColor: settings.enabled ? c.accent : c.surface,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.toggleThumb,
                                    {
                                        backgroundColor: "#fff",
                                        transform: [{ translateX: settings.enabled ? 20 : 2 }],
                                    },
                                ]}
                            />
                        </Pressable>
                    </View>
                </View>

                {settings.enabled && (
                    <>
                        {/* Time picker */}
                        <Text style={[styles.sectionLabel, { color: c.sub }]}>ЧАС НАГАДУВАННЯ</Text>
                        <View style={[styles.card, { backgroundColor: c.card }]}>
                            <Pressable
                                style={styles.rowBetween}
                                onPress={() => setShowPicker(true)}
                            >
                                <View style={styles.rowLeft}>
                                    <View style={[styles.iconWrap, { backgroundColor: c.surface }]}>
                                        <Ionicons name="time" size={20} color={c.accentOrange} />
                                    </View>
                                    <Text style={[styles.cardLabel, { color: c.text }]}>Час</Text>
                                </View>
                                <View style={[styles.timeBadge, { backgroundColor: c.surface }]}>
                                    <Text style={[styles.timeText, { color: c.accent }]}>
                                        {formatTime(settings.time)}
                                    </Text>
                                </View>
                            </Pressable>

                            {showPicker && (
                                <View style={styles.pickerWrap}>
                                    <DateTimePicker
                                        value={timeDate}
                                        mode="time"
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        onChange={handleTimeChange}
                                        themeVariant="dark"
                                        textColor={c.text}
                                        locale="uk"
                                    />
                                    {Platform.OS === "ios" && (
                                        <Pressable
                                            onPress={() => setShowPicker(false)}
                                            style={[styles.doneBtn, { backgroundColor: c.accent }]}
                                        >
                                            <Text style={[styles.doneBtnText, { color: "#000" }]}>Готово</Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Templates */}
                        <Text style={[styles.sectionLabel, { color: c.sub }]}>ТЕКСТ НАГАДУВАННЯ</Text>
                        <View style={[styles.card, { backgroundColor: c.card }]}>
                            {settings.templates.map((t, i) => (
                                <View key={t.id}>
                                    {i > 0 && (
                                        <View style={[styles.divider, { backgroundColor: c.surface }]} />
                                    )}
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.templateRow,
                                            pressed && { opacity: 0.6 },
                                        ]}
                                        onPress={() => handleSelectTemplate(t.id)}
                                        onLongPress={() => handleDeleteTemplate(t)}
                                    >
                                        <View style={styles.templateLeft}>
                                            <Ionicons
                                                name={
                                                    settings.selectedTemplateId === t.id
                                                        ? "checkmark-circle"
                                                        : "ellipse-outline"
                                                }
                                                size={22}
                                                color={
                                                    settings.selectedTemplateId === t.id ? c.accent : c.sub
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.templateText,
                                                    { color: c.text },
                                                    settings.selectedTemplateId === t.id && { fontWeight: "700" },
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {t.text}
                                            </Text>
                                        </View>
                                        {!t.isDefault && (
                                            <Ionicons name="trash-outline" size={16} color={c.danger} />
                                        )}
                                    </Pressable>
                                </View>
                            ))}

                            {/* Add custom button */}
                            <View style={[styles.divider, { backgroundColor: c.surface }]} />
                            <Pressable
                                style={({ pressed }) => [
                                    styles.addRow,
                                    pressed && { opacity: 0.6 },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowAddModal(true);
                                }}
                            >
                                <Ionicons name="add-circle" size={22} color={c.accent} />
                                <Text style={[styles.addText, { color: c.accent }]}>
                                    Додати свій шаблон
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Add template modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
                    <Pressable
                        style={[styles.modalContent, { backgroundColor: c.card }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Text style={[styles.modalTitle, { color: c.text }]}>Новий шаблон</Text>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: c.surface,
                                    color: c.text,
                                    borderColor: c.border,
                                },
                            ]}
                            placeholder="Введіть текст нагадування..."
                            placeholderTextColor={c.sub}
                            value={customText}
                            onChangeText={setCustomText}
                            multiline
                            maxLength={100}
                        />
                        <View style={styles.modalBtns}>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: c.surface }]}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: c.text }]}>Скасувати</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: c.accent }]}
                                onPress={handleAddTemplate}
                            >
                                <Text style={[styles.modalBtnText, { color: "#000" }]}>Додати</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
    backBtn: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "700" },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "600",
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 16,
        overflow: "hidden",
        padding: 16,
    },
    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    timeBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
    },
    timeText: {
        fontSize: 17,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },
    pickerWrap: {
        marginTop: 12,
        alignItems: "center",
    },
    doneBtn: {
        marginTop: 8,
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 12,
    },
    doneBtnText: {
        fontSize: 16,
        fontWeight: "700",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 2,
    },
    templateRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
    },
    templateLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        paddingRight: 8,
    },
    templateText: {
        fontSize: 15,
        flex: 1,
    },
    addRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
    },
    addText: {
        fontSize: 15,
        fontWeight: "600",
    },
    /* Modal */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        width: "100%",
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
        textAlign: "center",
    },
    modalInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        minHeight: 60,
        textAlignVertical: "top",
        borderWidth: 1,
    },
    modalBtns: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: "700",
    },
});
