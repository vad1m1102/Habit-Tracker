import { PropsWithChildren } from "react";

interface SwipeTabsProps extends PropsWithChildren {
  tabIndex?: number;
}

export default function SwipeTabs({ children }: SwipeTabsProps) {
  return <>{children}</>;
}
