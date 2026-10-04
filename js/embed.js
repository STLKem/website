(function () {
  const NARROW_PX = 860;
  const frames = new Set();

  function isHandheld() {
    return (
      window.matchMedia("(pointer: coarse)").matches &&
      window.innerWidth < NARROW_PX
    );
  }

  function t(key) {
    const i18n = window.PortfolioI18n;
    if (!i18n) return "";
    return i18n.t(i18n.getLang(), key);
  }

  function takeMarkup(frame) {
    if (frame._embedHtml) return frame._embedHtml;

    const tpl = frame.querySelector("template[data-embed-markup]");
    if (tpl) {
      const html = tpl.innerHTML.trim();
      if (html && !/^<!--[\s\S]*-->$/.test(html)) {
        frame._embedHtml = html;
        return html;
      }
    }

    const direct = frame.querySelector("iframe");
    if (direct) {
      const html = direct.outerHTML;
      direct.removeAttribute("src");
      direct.remove();
      frame._embedHtml = html;
      return html;
    }

    return "";
  }

  function clearChrome(frame) {
    frame
      .querySelectorAll(".placeholder-block, .embed-gate, .embed-resume")
      .forEach((n) => n.remove());
  }

  function getIframe(frame) {
    return frame.querySelector("iframe");
  }

  function mount(frame, html) {
    clearChrome(frame);
    frame.classList.remove("is-gated", "is-audio-paused");
    frame.querySelectorAll("iframe").forEach((n) => n.remove());
    frame.insertAdjacentHTML("beforeend", html);
    const iframe = getIframe(frame);
    if (iframe) {
      iframe.setAttribute("tabindex", "-1");
      try {
        iframe.focus({ preventScroll: true });
      } catch (_) {

      }
    }
  }

  function buildPlayGate(frame, html) {
    const gate = document.createElement("div");
    gate.className = "embed-gate";

    const title = document.createElement("strong");
    title.dataset.gateTitle = "1";

    const text = document.createElement("p");
    text.dataset.gateText = "1";

    const row = document.createElement("div");
    row.className = "embed-gate-actions";

    const load = document.createElement("button");
    load.type = "button";
    load.className = "btn";
    load.dataset.gateLoad = "1";
    load.addEventListener("click", (e) => {
      e.stopPropagation();
      mount(frame, html);
    });
    row.appendChild(load);

    const url = frame.dataset.itchUrl;
    if (url) {
      const link = document.createElement("a");
      link.className = "btn btn-ghost";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.dataset.gateItch = "1";
      row.appendChild(link);
    }

    gate.append(title, text, row);
    clearChrome(frame);
    frame.querySelectorAll("iframe").forEach((n) => n.remove());
    frame.classList.add("is-gated");
    frame.classList.remove("is-audio-paused");
    frame.appendChild(gate);
    fillGateText(gate);
  }

  function fillGateText(gate) {
    const handheld = isHandheld();
    gate.querySelector("[data-gate-title]").textContent = t(
      handheld ? "embed.gate.title" : "embed.play.title"
    );
    gate.querySelector("[data-gate-text]").textContent = t(
      handheld ? "embed.gate.text" : "embed.play.text"
    );
    gate.querySelector("[data-gate-load]").textContent = t(
      handheld ? "embed.gate.load" : "embed.play.load"
    );
    const itch = gate.querySelector("[data-gate-itch]");
    if (itch) itch.textContent = t("embed.gate.itch");
  }

  function pauseAudio(frame) {
    const iframe = getIframe(frame);
    if (!iframe || frame.classList.contains("is-audio-paused")) return;
    if (frame.classList.contains("is-gated")) return;

    const html = takeMarkup(frame) || iframe.outerHTML;
    frame._embedHtml = html;

    iframe.removeAttribute("src");
    iframe.src = "about:blank";
    iframe.remove();

    frame.classList.add("is-audio-paused");
    clearChrome(frame);

    const resume = document.createElement("div");
    resume.className = "embed-resume";
    resume.innerHTML =
      '<strong data-resume-title="1"></strong>' +
      '<p data-resume-text="1"></p>' +
      '<div class="embed-gate-actions">' +
      '<button type="button" class="btn" data-resume-load="1"></button>' +
      "</div>";

    resume.querySelector("[data-resume-load]").addEventListener("click", (e) => {
      e.stopPropagation();
      resumeAudio(frame);
    });

    resume.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      e.stopPropagation();
      resumeAudio(frame);
    });

    frame.appendChild(resume);
    fillResumeText(resume);
  }

  function resumeAudio(frame) {
    const html = takeMarkup(frame);
    if (!html) return;
    mount(frame, html);
  }

  function fillResumeText(resume) {
    resume.querySelector("[data-resume-title]").textContent = t(
      "embed.resume.title"
    );
    resume.querySelector("[data-resume-text]").textContent = t(
      "embed.resume.text"
    );
    resume.querySelector("[data-resume-load]").textContent = t(
      "embed.resume.load"
    );
  }

  function onDocPointerDown(e) {
    frames.forEach((frame) => {
      if (!frame.isConnected) {
        frames.delete(frame);
        return;
      }
      if (frame.contains(e.target)) {

        return;
      }

      if (getIframe(frame) && !frame.classList.contains("is-audio-paused")) {
        pauseAudio(frame);
      }
    });
  }

  function boot() {
    document.querySelectorAll("[data-itch-embed]").forEach((frame) => {
      const aspect = frame.getAttribute("data-aspect");
      if (aspect) frame.style.aspectRatio = aspect;

      const html = takeMarkup(frame);
      if (!html) return;
      frames.add(frame);
      buildPlayGate(frame, html);
    });

    document.addEventListener("pointerdown", onDocPointerDown, true);

    document.addEventListener("portfolio:lang", () => {
      document.querySelectorAll(".embed-gate").forEach(fillGateText);
      document.querySelectorAll(".embed-resume").forEach(fillResumeText);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
