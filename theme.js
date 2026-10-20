(function () {
  if (window.GNG_THEME_INSTALLED) return;
  window.GNG_THEME_INSTALLED = true;

  const STORAGE_KEY = "gng-theme";
  const root = document.documentElement;

  function readStoredTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === "dark" || value === "light" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
    }
  }

  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute("content", theme === "dark" ? "#17243a" : "#f4f1eb");
  }

  function getTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function updateButton() {
    const button = document.getElementById("gng-theme-toggle");
    if (!button) return;

    const dark = getTheme() === "dark";
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.setAttribute(
      "aria-label",
      dark ? "Ativar tema claro" : "Ativar tema escuro"
    );
    button.title = dark ? "Ativar tema claro" : "Ativar tema escuro";

    const label = button.querySelector(".gng-theme-label");
    if (label) {
      label.textContent = dark ? "Tema claro" : "Tema escuro";
    }
  }

  function applyTheme(theme, animate) {
    const next = theme === "dark" ? "dark" : "light";

    if (animate) {
      root.classList.add("gng-theme-switching");
      window.setTimeout(function () {
        root.classList.remove("gng-theme-switching");
      }, 420);
    }

    root.dataset.theme = next;
    root.style.colorScheme = next;
    saveTheme(next);
    updateThemeColor(next);
    updateButton();

    window.dispatchEvent(
      new CustomEvent("gng:theme-change", {
        detail: { theme: next }
      })
    );
  }

  function toggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark", true);
  }

  function createToggle() {
    if (document.getElementById("gng-theme-toggle")) return;

    if (
      document.getElementById("admin-login") ||
      document.getElementById("admin-dashboard")
    ) {
      root.classList.add("gng-admin-context");
    }

    const button = document.createElement("button");
    button.id = "gng-theme-toggle";
    button.className = "gng-theme-toggle";
    button.type = "button";
    button.innerHTML = `
      <span class="gng-theme-icon-wrap" aria-hidden="true">
        <svg class="gng-theme-icon gng-theme-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path>
        </svg>
        <svg class="gng-theme-icon gng-theme-moon" viewBox="0 0 24 24">
          <path d="M20.2 15.3A8.7 8.7 0 0 1 8.7 3.8 9 9 0 1 0 20.2 15.3Z"></path>
        </svg>
      </span>
      <span class="gng-theme-label">Tema escuro</span>
    `;

    button.addEventListener("click", toggleTheme);
    document.body.appendChild(button);
    updateButton();
  }

  const initialTheme = readStoredTheme() || "light";
  root.dataset.theme = initialTheme;
  root.style.colorScheme = initialTheme;
  updateThemeColor(initialTheme);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createToggle, { once: true });
  } else {
    createToggle();
  }

  window.GNG_THEME = {
    get: getTheme,
    set: function (theme) {
      applyTheme(theme, true);
    },
    toggle: toggleTheme
  };
})();