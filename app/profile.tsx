import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    TextInput,
    Image,
    Alert,
    Platform,
    Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, useRef } from "react";
import { getHabits, Habit } from "../src/storage/habits";
import { getUserProfile, saveUserProfile, UserProfile } from "../src/storage/userProfile";
import { useTheme } from "../src/ui/useTheme";
import { useThemeMode } from "../src/ui/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

export default function Profile() {
    const c = useTheme();
    const { mode } = useThemeMode();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [profile, setProfile] = useState<UserProfile>({ name: "Користувач", photoUri: null });
    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState("");
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const nameRef = useRef<TextInput>(null);

    const load = useCallback(() => {
        (async () => {
            const [h, p] = await Promise.all([getHabits(), getUserProfile()]);
            setHabits(h);
            setProfile(p);
        })();
    }, []);

    useFocusEffect(load);

    const totalHabits = habits.length;
    const activeHabits = habits.filter((h) => !(h as any).isArchived).length;

    const handleEditName = () => {
        setTempName(profile.name);
        setEditingName(true);
        setTimeout(() => nameRef.current?.focus(), 100);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveName = async () => {
        if (tempName.trim()) {
            const updated = await saveUserProfile({ name: tempName.trim() });
            setProfile(updated);
        }
        setEditingName(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handlePickPhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Потрібен дозвіл", "Дозвольте доступ до галереї для зміни фото.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            const updated = await saveUserProfile({ photoUri: result.assets[0].uri });
            setProfile(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleRemovePhoto = async () => {
        Alert.alert("Видалити фото?", "Фото профілю буде видалено", [
            { text: "Скасувати", style: "cancel" },
            {
                text: "Видалити",
                style: "destructive",
                onPress: async () => {
                    const updated = await saveUserProfile({ photoUri: null });
                    setProfile(updated);
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
                    style={styles.closeBtn}
                >
                    <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
                <Text style={[styles.title, { color: c.text }]}>Профіль</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrap}>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (profile.photoUri) {
                                    setShowPhotoModal(true);
                                } else {
                                    handlePickPhoto();
                                }
                            }}
                            onLongPress={profile.photoUri ? handleRemovePhoto : undefined}
                        >
                            <View style={[styles.avatar, { backgroundColor: c.card }]}>
                                {profile.photoUri ? (
                                    <Image source={{ uri: profile.photoUri }} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person" size={48} color={c.accent} />
                                )}
                            </View>
                        </Pressable>
                        {/* Camera badge */}
                        <Pressable
                            style={[styles.cameraBadge, { backgroundColor: c.accent }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handlePickPhoto();
                            }}
                            hitSlop={8}
                        >
                            <Ionicons name="camera" size={14} color="#000" />
                        </Pressable>
                    </View>
                    {/* Editable name */}
                    {editingName ? (
                        <View style={styles.nameEditRow}>
                            <TextInput
                                ref={nameRef}
                                style={[styles.nameInput, { color: c.text, borderBottomColor: c.accent }]}
                                value={tempName}
                                onChangeText={setTempName}
                                onBlur={handleSaveName}
                                onSubmitEditing={handleSaveName}
                                maxLength={30}
                                returnKeyType="done"
                            />
                            <Pressable onPress={handleSaveName}>
                                <Ionicons name="checkmark-circle" size={28} color={c.accent} />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable onPress={handleEditName} style={styles.nameRow}>
                            <Text style={[styles.userName, { color: c.text }]}>{profile.name}</Text>
                            <Ionicons name="pencil" size={16} color={c.sub} />
                        </Pressable>
                    )}

                    <Text style={[styles.userSub, { color: c.sub }]}>
                        Відстежує звички кожен день 💪
                    </Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <Pressable
                        style={[styles.statCard, { backgroundColor: c.card }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({ pathname: "/all-habits", params: { filter: "active" } });
                        }}
                    >
                        <Text style={[styles.statValue, { color: c.accent }]}>
                            {totalHabits}
                        </Text>
                        <Text style={[styles.statLabel, { color: c.sub }]}>Всього</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.statCard, { backgroundColor: c.card }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({ pathname: "/all-habits", params: { filter: "active" } });
                        }}
                    >
                        <Text style={[styles.statValue, { color: c.accent }]}>
                            {activeHabits}
                        </Text>
                        <Text style={[styles.statLabel, { color: c.sub }]}>Активних</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.statCard, { backgroundColor: c.card }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push({ pathname: "/all-habits", params: { filter: "archived" } });
                        }}
                    >
                        <Text style={[styles.statValue, { color: c.accent }]}>
                            {totalHabits - activeHabits}
                        </Text>
                        <Text style={[styles.statLabel, { color: c.sub }]}>Завершених</Text>
                    </Pressable>
                </View>

                {/* Menu items */}
                <View style={[styles.menuSection, { backgroundColor: c.card }]}>
                    <MenuItem
                        icon="settings-outline"
                        label="Налаштування"
                        c={c}
                        onPress={() => router.push("/settings")}
                    />
                    <View style={[styles.menuDivider, { backgroundColor: c.surface }]} />
                    <MenuItem
                        icon="notifications-outline"
                        label="Нагадування"
                        c={c}
                        onPress={() => router.push("/reminders-settings")}
                    />
                    <View style={[styles.menuDivider, { backgroundColor: c.surface }]} />
                    <MenuItem
                        icon="color-palette-outline"
                        label="Тема"
                        c={c}
                        rightText={mode === "dark" ? "Темна" : "Світла"}
                        onPress={() => router.push("/theme-settings")}
                    />
                    <View style={[styles.menuDivider, { backgroundColor: c.surface }]} />
                    <MenuItem
                        icon="information-circle-outline"
                        label="Про додаток"
                        c={c}
                    />
                </View>
            </ScrollView>

            {/* Photo zoom modal */}
            <Modal visible={showPhotoModal} transparent animationType="fade">
                <Pressable
                    style={styles.photoModalOverlay}
                    onPress={() => setShowPhotoModal(false)}
                >
                    {profile.photoUri && (
                        <Image
                            source={{ uri: profile.photoUri }}
                            style={styles.photoModalImage}
                            resizeMode="contain"
                        />
                    )}
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

function MenuItem({
    icon,
    label,
    c,
    rightText,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    c: ReturnType<typeof useTheme>;
    rightText?: string;
    onPress?: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.6 },
            ]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress?.();
            }}
        >
            <View style={[styles.menuIconWrap, { backgroundColor: c.surface }]}>
                <Ionicons name={icon} size={20} color={c.accent} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{label}</Text>
            <View style={styles.menuRight}>
                {rightText && (
                    <Text style={[styles.menuRightText, { color: c.sub }]}>
                        {rightText}
                    </Text>
                )}
                <Ionicons name="chevron-forward" size={18} color={c.sub} />
            </View>
        </Pressable>
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
    closeBtn: {
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

    /* Avatar section */
    avatarSection: {
        alignItems: "center",
        marginTop: 8,
        marginBottom: 24,
    },
    avatarWrap: {
        position: "relative",
        marginBottom: 12,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    cameraBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    nameEditRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 4,
    },
    nameInput: {
        fontSize: 22,
        fontWeight: "800",
        borderBottomWidth: 2,
        paddingVertical: 4,
        minWidth: 120,
        textAlign: "center",
    },
    userName: {
        fontSize: 22,
        fontWeight: "800",
    },
    userSub: {
        fontSize: 14,
        marginTop: 4,
    },

    /* Stats row */
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "800",
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginTop: 4,
    },

    /* Menu section */
    menuSection: {
        borderRadius: 16,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
    },
    menuRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    menuRightText: {
        fontSize: 14,
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 62,
    },
    photoModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    photoModalImage: {
        width: 280,
        height: 280,
        borderRadius: 140,
    },
});
