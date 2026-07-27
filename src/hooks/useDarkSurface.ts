import { useEffect } from "react";

/** Força tema escuro na <html> enquanto o componente estiver montado. */
export function useDarkSurface() {
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);
}
