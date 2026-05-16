import { router, usePathname, type Href } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { PropsWithChildren } from "react";

const routes: Href[] = ["/", "/analytics", "/achievements", "/challenges"];

export default function SwipeTabs({ children }: PropsWithChildren) {
  const pathname = usePathname();

  const currentIndex = (() => {
    const map: Record<string, number> = {
      "/": 0,
      "/index": 0,
      "/analytics": 1,
      "/achievements": 2,
      "/challenges": 3,
    };
    return map[pathname] ?? 0;
  })();

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      const TH = 90;

      if (e.translationX < -TH && currentIndex < routes.length - 1) {
        runOnJS(router.replace)(routes[currentIndex + 1]);
      } else if (e.translationX > TH && currentIndex > 0) {
        runOnJS(router.replace)(routes[currentIndex - 1]);
      }
    });

  return <GestureDetector gesture={pan}>{children}</GestureDetector>;
}
