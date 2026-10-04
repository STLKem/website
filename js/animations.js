(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  function initReveal() {
    const items = document.querySelectorAll(".reveal, .reveal-left, .reveal-scale, .split-chars");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    items.forEach((el, index) => {
      if (!el.style.getPropertyValue("--delay")) {
        el.style.setProperty("--delay", `${Math.min(index % 7, 6) * 60}ms`);
      }
      observer.observe(el);
    });
  }

  function splitElement(el) {
    const value = el.textContent;

    el.textContent = "";
    el.classList.add("split-chars");
    [...value].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00a0" : ch;
      span.style.setProperty("--char-i", String(i));
      el.appendChild(span);
    });
  }

  function initSplitChars() {
    document.querySelectorAll("[data-split]").forEach(splitElement);
  }

  function resplitAfterI18n() {

    document.querySelectorAll("[data-split]").forEach((el) => {
      splitElement(el);
      el.classList.add("is-visible");
    });
  }

  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");
    if (!toggle || !links) return;

    const setOpen = (open) => {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    toggle.addEventListener("click", () => {
      setOpen(!links.classList.contains("is-open"));
    });

    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  function initAnchorHighlight() {
    const sections = [...document.querySelectorAll("main section[id]")];
    const navMap = new Map(
      [...document.querySelectorAll('.nav-links a[href^="#"]')].map((a) => [
        a.getAttribute("href").slice(1),
        a
      ])
    );

    if (!sections.length || !navMap.size) return;

    const setCurrent = (id) => {
      navMap.forEach((link, key) => {
        if (key === id) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    };

    if (!reduceMotion) {
      document.addEventListener("click", (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute("href").slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", `#${id}`);
      });
    }

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0.1, 0.35, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function initMagnetic() {
    if (reduceMotion || !finePointer) return;

    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = Number(el.dataset.magnet || 18);

      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.setProperty("--magnet-x", `${x / strength}px`);
        el.style.setProperty("--magnet-y", `${y / strength}px`);
      });

      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--magnet-x", "0px");
        el.style.setProperty("--magnet-y", "0px");
      });
    });
  }

  function initCursor() {
    if (reduceMotion || !finePointer || !document.body.dataset.cursor) return;

    document.documentElement.classList.add("has-custom-cursor");

    const blob = document.createElement("div");
    blob.className = "cursor-blob";
    document.body.appendChild(blob);

    let x = -200;
    let y = -200;
    let cx = -200;
    let cy = -200;
    let hasPointer = false;
    let hot = false;

    const HOT = "a, button, .card, summary, .magnetic, .release-tile";

    window.addEventListener(
      "pointermove",
      (e) => {
        x = e.clientX;
        y = e.clientY;
        if (!hasPointer) {
          cx = x;
          cy = y;
        }
        hasPointer = true;

        const t = e.target;
        hot = Boolean(
          t &&
            t.tagName !== "IFRAME" &&
            t.closest &&
            t.closest(HOT)
        );
        blob.classList.toggle("is-on", t?.tagName !== "IFRAME");
        blob.classList.toggle("is-hot", hot);
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", () => {
      hasPointer = false;
      blob.classList.remove("is-on", "is-hot");
    });

    window.addEventListener("blur", () => {
      hasPointer = false;
      blob.classList.remove("is-on", "is-hot");
    });

    const tick = () => {
      if (hasPointer) {
        const nx = cx + (x - cx) * 0.18;
        const ny = cy + (y - cy) * 0.18;
        if (Math.abs(nx - cx) > 0.01 || Math.abs(ny - cy) > 0.01) {
          cx = nx;
          cy = ny;
          blob.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function boot() {
    initSplitChars();
    initReveal();
    initHeaderScroll();
    initMobileNav();
    initAnchorHighlight();
    initMagnetic();

    document.addEventListener("portfolio:lang", () => {
      resplitAfterI18n();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
