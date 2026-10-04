(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.body.classList.contains("theme-stamp")) return;

  function stampRubbers() {
    document.querySelectorAll(".stamp-row .rubber").forEach((el, i) => {
      el.style.setProperty("--i", String(i));
      el.addEventListener("click", () => {
        el.classList.add("is-pressed");
        window.setTimeout(() => el.classList.remove("is-pressed"), 160);
      });
    });
  }

  function ensureInkKeyframes() {
    if (document.getElementById("stamp-ink-style")) return;
    const style = document.createElement("style");
    style.id = "stamp-ink-style";
    style.textContent = `
      @keyframes stamp-ink {
        from { transform: scale(0.5); opacity: 0.75; }
        to { transform: scale(4.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function inkBurst(x, y) {
    if (reduceMotion) return;
    const blot = document.createElement("span");
    blot.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;width:10px;height:10px;margin:-5px 0 0 -5px;
      border-radius:42% 58% 55% 45%/52% 42% 58% 48%;
      background: color-mix(in srgb, var(--accent) 65%, transparent);
      pointer-events:none;z-index:9998;
      animation: stamp-ink 480ms ease-out forwards;
    `;
    document.body.appendChild(blot);
    window.setTimeout(() => blot.remove(), 500);
  }

  function bindInkClicks() {
    document.addEventListener("click", (e) => {
      if (e.target.closest(".btn, .rubber, .card, .footer-seal, .release-tile")) {
        inkBurst(e.clientX, e.clientY);
      }
    });
  }

  function staggerCards() {
    document.querySelectorAll(".card-grid .card").forEach((card, i) => {
      card.style.setProperty("--delay", `${i * 80}ms`);
    });
  }

  function scrollProgress() {
    let bar = document.querySelector(".scroll-progress");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "scroll-progress";
      bar.setAttribute("aria-hidden", "true");
      document.body.appendChild(bar);
    }

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = `${p}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function boot() {
    ensureInkKeyframes();
    stampRubbers();
    bindInkClicks();
    staggerCards();
    scrollProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
