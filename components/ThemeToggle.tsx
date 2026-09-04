"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* localStorage may be unavailable in sandboxed iframes. */
  }
  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* silent */
  }
}

export function ThemeToggle() {
  /* null on first render — avoids a hydration mismatch because the server
   * does not know the client's stored preference. The button appears after
   * the first effect, which is imperceptible in practice. */
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
    const arm = requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });

    /* Mirror any system-level changes while the tab is open (e.g. the user
     * switches macOS appearance), but only if they haven't set an explicit
     * preference via the toggle. */
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!localStorage.getItem("theme")) {
        const next = mq.matches ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      }
    };
    mq.addEventListener("change", onSystemChange);
    return () => {
      cancelAnimationFrame(arm);
      mq.removeEventListener("change", onSystemChange);
    };
  }, []);

  if (theme === null) return null;

  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="tap-safe hidden px-xs py-2xs font-mono text-2xs font-medium tracking-[0.06em] uppercase whitespace-nowrap text-muted transition-colors duration-(--dur-micro) ease-out hover:text-ink sm:inline"
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
