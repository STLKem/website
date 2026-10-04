(function () {
  const LANG_KEY = "portfolio-lang";
  const SUPPORTED = ["en", "pl"];

  function getLang() {
    const saved = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    return "en";
  }

  function t(lang, key) {
    const pack = window.I18N?.[lang] || {};
    const fallback = window.I18N?.en || {};
    return pack[key] ?? fallback[key] ?? key;
  }

  function reveal() {
    document.documentElement.classList.add("i18n-ready");
  }

  function applyTranslations(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = t(lang, key);
      if (el.dataset.i18nAttr) {
        el.setAttribute(el.dataset.i18nAttr, value);
      } else {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      el.innerHTML = t(lang, key);
    });

    const select = document.querySelector("[data-lang-select]");
    if (select) select.value = lang;

    localStorage.setItem(LANG_KEY, lang);
    document.dispatchEvent(
      new CustomEvent("portfolio:lang", { detail: { lang } })
    );
    reveal();
  }

  function bootI18n() {
    const lang = getLang();
    applyTranslations(lang);

    const select = document.querySelector("[data-lang-select]");
    if (select) {
      select.addEventListener("change", () => {
        const next = select.value;
        if (SUPPORTED.includes(next)) applyTranslations(next);
      });
    }
  }

  function yearStamp() {
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function boot() {
    try {
      bootI18n();
      yearStamp();
    } catch (err) {
      console.error(err);
      reveal();
    }
  }

  setTimeout(reveal, 1500);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.PortfolioI18n = { applyTranslations, getLang, t };
})();
