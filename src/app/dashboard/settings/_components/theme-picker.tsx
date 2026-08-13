"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

// Hydration-safe "am I on the client yet" flag (theme is unknown during SSR).
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Same three-way theme switch as the avatar menu, embedded in settings. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={mounted && theme === option.value ? "secondary" : "outline"}
          size="sm"
          onClick={() => setTheme(option.value)}
          aria-pressed={mounted ? theme === option.value : undefined}
        >
          <option.icon aria-hidden className="h-4 w-4" />
          {option.label}
        </Button>
      ))}
    </div>
  );
}
