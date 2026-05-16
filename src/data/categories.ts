export type Category = {
    id: string;
    name: string;
    icon: string;
    color: string;
};

export const categories: Category[] = [
    { id: "health", name: "Фізичне здоров'я", icon: "🏃", color: "#FF6B6B" },
    { id: "mental", name: "Психічне здоров'я", icon: "🧘", color: "#4ECDC4" },
    { id: "growth", name: "Саморозвиток", icon: "📈", color: "#45B7D1" },
    { id: "finance", name: "Управління фінансами", icon: "💰", color: "#96CEB4" },
    { id: "creativity", name: "Креативність", icon: "💡", color: "#FF85A2" },
    { id: "productivity", name: "Продуктивність", icon: "📊", color: "#6C5CE7" },
    { id: "home", name: "Догляд за домом", icon: "🏡", color: "#FDCB6E" },
    { id: "nutrition", name: "Харчування та кулінарія", icon: "🍳", color: "#E17055" },
    { id: "custom", name: "Власна категорія", icon: "✏️", color: "#8E8E93" },
];

export function getCategoryById(id: string): Category | undefined {
    return categories.find((c) => c.id === id);
}
