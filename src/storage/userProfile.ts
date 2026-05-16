import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "user_profile:v1";

export type UserProfile = {
    name: string;
    photoUri: string | null;
};

const defaultProfile: UserProfile = {
    name: "Користувач",
    photoUri: null,
};

export async function getUserProfile(): Promise<UserProfile> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...defaultProfile };
    return { ...defaultProfile, ...JSON.parse(raw) };
}

export async function saveUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = await getUserProfile();
    const next = { ...current, ...updates };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}
