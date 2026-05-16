import { Platform } from "react-native";
import { Habit } from "./storage/habits";

const isWeb = Platform.OS === "web";

// Динамічний імпорт — на вебі не завантажуємо expo-notifications
let Notifications: typeof import("expo-notifications") | null = null;

if (!isWeb) {
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/** Запит дозволу на сповіщення */
export async function requestPermissions(): Promise<boolean> {
    if (isWeb || !Notifications) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
}

/** Скасувати всі заплановані сповіщення */
export async function cancelAll(): Promise<void> {
    if (isWeb || !Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Запланувати нагадування для всіх звичок з увімкненим reminder.
 * На вебі — просто skip.
 */
export async function scheduleHabitReminders(
    habits: Habit[],
    doneToday?: Record<string, number>
): Promise<void> {
    if (isWeb || !Notifications) return;

    const granted = await requestPermissions();
    if (!granted) return;

    await cancelAll();

    const ourDayToExpoWeekday = (ourDay: number): number => {
        if (ourDay === 6) return 1;
        return ourDay + 2;
    };

    for (const habit of habits) {
        if (!habit.reminder?.enabled || !habit.reminder?.time) continue;
        if (habit.isArchived) continue;
        // Пропускаємо, якщо звичка вже виконана сьогодні
        const goalCount = habit.goal?.enabled ? habit.goal.count : 1;
        if (doneToday && (doneToday[habit.id] ?? 0) >= goalCount) continue;

        const [hours, minutes] = habit.reminder.time.split(":").map(Number);
        const days = habit.repeat?.days ?? [0, 1, 2, 3, 4, 5, 6];

        for (const day of days) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `${habit.icon} ${habit.title}`,
                    body: "Час відмітити звичку! 💪",
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                    weekday: ourDayToExpoWeekday(day),
                    hour: hours,
                    minute: minutes,
                },
            });
        }
    }
}
