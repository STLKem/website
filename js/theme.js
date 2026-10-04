(function () {
  const STORAGE_KEY = "portfolio-theme";
  const root = document.documentElement;

  const BAR_COLOR = { dark: "#0b0b0b", light: "#f1eee5" };

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    });
    const bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute("content", BAR_COLOR[theme]);
  }

  function toggleTheme() {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
  }

  applyTheme(getPreferred());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme(root.getAttribute("data-theme") || getPreferred());
    });
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-theme-toggle]");
    if (!btn) return;
    toggleTheme();
  });

  window.PortfolioTheme = { applyTheme, toggleTheme, getPreferred };
})();
