import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "reminder_settings:v1";

export type ReminderTemplate = {
    id: string;
    text: string;
    isDefault: boolean;
};

export type ReminderSettings = {
    enabled: boolean;
    time: string; // "HH:mm"
    selectedTemplateId: string;
    templates: ReminderTemplate[];
};

export const defaultTemplates: ReminderTemplate[] = [
    { id: "t1", text: "Час відмітити звичку! 💪", isDefault: true },
    { id: "t2", text: "Не забудь про свої звички! 🔔", isDefault: true },
    { id: "t3", text: "Крок за кроком до мети! 🎯", isDefault: true },
    { id: "t4", text: "Сьогодні ще не пізно! ⏰", isDefault: true },
    { id: "t5", text: "Маленькі дії — великі результати! 🚀", isDefault: true },
];

const defaultSettings: ReminderSettings = {
    enabled: true,
    time: "20:00",
    selectedTemplateId: "t1",
    templates: defaultTemplates,
};

export async function getReminderSettings(): Promise<ReminderSettings> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...defaultSettings, templates: [...defaultTemplates] };
    const parsed = JSON.parse(raw);
    return {
        ...defaultSettings,
        ...parsed,
        templates: parsed.templates?.length ? parsed.templates : [...defaultTemplates],
    };
}

export async function saveReminderSettings(
    updates: Partial<ReminderSettings>
): Promise<ReminderSettings> {
    const current = await getReminderSettings();
    const next = { ...current, ...updates };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}

export async function addCustomTemplate(text: string): Promise<ReminderSettings> {
    const current = await getReminderSettings();
    const newTemplate: ReminderTemplate = {
        id: `custom_${Date.now()}`,
        text: text.trim(),
        isDefault: false,
    };
    const next = {
        ...current,
        templates: [...current.templates, newTemplate],
        selectedTemplateId: newTemplate.id,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}

export async function deleteCustomTemplate(id: string): Promise<ReminderSettings> {
    const current = await getReminderSettings();
    const filtered = current.templates.filter((t) => t.id !== id);
    const next = {
        ...current,
        templates: filtered,
        selectedTemplateId:
            current.selectedTemplateId === id ? filtered[0]?.id ?? "t1" : current.selectedTemplateId,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}
