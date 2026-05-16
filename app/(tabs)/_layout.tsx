import { Tabs, router } from "expo-router";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/ui/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";

/* ── Custom Tab Bar with FAB notch ── */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useTheme();
  const TAB_BAR_H = 60;
  const NOTCH_W = 72;

  // Visible tabs (exclude fab-placeholder)
  const visibleRoutes = state.routes.filter(
    (r) => r.name !== "fab-placeholder"
  );

  // Split into left/right groups around center
  const left = visibleRoutes.filter(
    (r) => r.name === "index" || r.name === "analytics"
  );
  const right = visibleRoutes.filter(
    (r) => r.name === "achievements" || r.name === "challenges"
  );

  const renderTab = (route: (typeof state.routes)[number]) => {
    const { options } = descriptors[route.key];
    const idx = state.routes.indexOf(route);
    const focused = state.index === idx;
    const color = focused ? c.accent : c.tabInactive;

    return (
      <Pressable
        key={route.key}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        style={styles.tabItem}
      >
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        <View style={{ marginTop: 2 }}>
          <Ionicons
            name="ellipse"
            size={focused ? 4 : 0}
            color={c.accent}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.barOuter, { paddingBottom: insets.bottom, backgroundColor: c.tabBar, borderTopColor: c.border }]}>
      {/* FAB button – floats above the notch */}
      <Pressable
        style={[styles.fab, { backgroundColor: c.accent, shadowColor: c.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/categories");
        }}
      >
        <Ionicons name="add" size={32} color="#000" />
      </Pressable>

      {/* Bar background with notch cutout */}
      <View style={[styles.barRow, { height: TAB_BAR_H }]}>
        {/* Left tabs */}
        <View style={styles.tabGroup}>{left.map(renderTab)}</View>

        {/* Center spacer for FAB notch */}
        <View style={{ width: NOTCH_W }} />

        {/* Right tabs */}
        <View style={styles.tabGroup}>{right.map(renderTab)}</View>
      </View>
    </View>
  );
}

/* ── Main Layout ── */
export default function TabsLayout() {
  const c = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Сьогодні",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="today-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Аналітика",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden placeholder to keep Tabs happy */}
        <Tabs.Screen
          name="fab-placeholder"
          options={{
            title: "",
            tabBarIcon: () => null,
            href: null,
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: "Досягнення",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: "Челенджі",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="fitness-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  barOuter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  fab: {
    position: "absolute",
    top: -28,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    // Android elevation
    elevation: 8,
    zIndex: 10,
  },
});
