/**
 * Triggers native browser print with guaranteed crisp Light Mode and vector rendering.
 * Temporarily switches document element to light mode so Tailwind dark:* classes and
 * dark CSS variables do not pollute the printed output.
 */
export function triggerLightPrint() {
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");

  if (wasDark) {
    root.classList.remove("dark");
    root.classList.add("light");
  }

  // Allow browser layout engine to paint computed light-theme styles before opening print preview
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
      if (wasDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      }
    }, 40);
  });
}

/**
 * Global listener for Ctrl+P / Cmd+P to enforce light mode during native keyboard prints.
 */
export function registerPrintThemeSync() {
  let wasDarkBeforePrint = false;

  const onBeforePrint = () => {
    const root = document.documentElement;
    wasDarkBeforePrint = root.classList.contains("dark");
    if (wasDarkBeforePrint) {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  };

  const onAfterPrint = () => {
    const root = document.documentElement;
    if (wasDarkBeforePrint) {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  window.addEventListener("beforeprint", onBeforePrint);
  window.addEventListener("afterprint", onAfterPrint);

  return () => {
    window.removeEventListener("beforeprint", onBeforePrint);
    window.removeEventListener("afterprint", onAfterPrint);
  };
}
