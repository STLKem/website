(function () {
  const HOLD_MS = 600;
  const AUTO_SPEED = 0.28;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    const wrap = document.querySelector("[data-release-reel]");
    if (!wrap) return;
    const scroller = wrap.querySelector("[data-reel-scroller]");
    const track = wrap.querySelector(".release-reel-track");
    if (!scroller || !track) return;

    let loopWidth = 0;
    let offset = 0;
    let paused = false;
    let dragging = false;
    let dragMoved = false;
    let suppressClick = false;
    let startX = 0;
    let startOffset = 0;
    let holdTimer = null;
    let activeTile = null;
    let hoverTile = null;
    let rebuildTimer = 0;

    const preview = document.createElement("div");
    preview.className = "release-preview";
    preview.innerHTML = `
      <div class="release-preview-bar">
        <strong data-preview-title>Preview</strong>
        <button type="button" class="release-preview-close" data-preview-close>Close</button>
      </div>
      <div class="release-preview-stage" data-preview-stage></div>
      <div class="release-preview-foot">
        <span data-preview-note>Local clip · no ads</span>
        <a href="#" data-preview-link>Open page →</a>
      </div>
    `;
    document.body.appendChild(preview);

    const titleEl = preview.querySelector("[data-preview-title]");
    const stage = preview.querySelector("[data-preview-stage]");
    const linkEl = preview.querySelector("[data-preview-link]");
    const noteEl = preview.querySelector("[data-preview-note]");
    const closeBtn = preview.querySelector("[data-preview-close]");

    function applyStrings() {
      const i18n = window.PortfolioI18n;
      if (!i18n) return;
      const lang = i18n.getLang();
      closeBtn.textContent = i18n.t(lang, "preview.close");
      noteEl.textContent = i18n.t(lang, "preview.note");
      linkEl.textContent = i18n.t(lang, "preview.open");
    }
    applyStrings();
    document.addEventListener("portfolio:lang", applyStrings);

    const isOpen = () => preview.classList.contains("is-open");

    function clearHold() {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }

    function stopMedia() {
      if (stage._shotTimer) {
        clearInterval(stage._shotTimer);
        stage._shotTimer = null;
      }
      stage.querySelectorAll("video").forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      stage.textContent = "";
    }

    function closePreview() {
      clearHold();
      preview.classList.remove("is-open");
      activeTile = null;
      stopMedia();
      track.querySelectorAll(".release-tile.is-armed").forEach((t) => t.classList.remove("is-armed"));
      hoverTile = null;
      if (!scroller.matches(":hover")) paused = false;
    }

    function positionPreview(tile) {
      const rect = tile.getBoundingClientRect();
      if (!rect.width) return;
      const pw = preview.offsetWidth || 420;
      const ph = preview.offsetHeight || 280;
      let left = rect.left + rect.width / 2 - pw / 2;
      let top = rect.top - ph - 14;
      if (top < 12) top = rect.bottom + 14;
      left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
      top = Math.max(12, Math.min(top, window.innerHeight - ph - 12));
      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
    }

    function showShotPreview(paths) {
      const list = paths.map((p) => p.trim()).filter(Boolean);
      if (!list.length) return false;

      const img = document.createElement("img");
      img.className = "release-preview-shot";
      img.alt = "";
      img.src = list[0];
      stage.appendChild(img);

      if (list.length > 1) {
        let i = 0;
        stage._shotTimer = window.setInterval(() => {
          i = (i + 1) % list.length;
          img.src = list[i];
        }, 1600);
      }
      return true;
    }

    function openPreview(tile) {
      if (dragging || !tile.isConnected) return;
      activeTile = tile;
      tile.classList.add("is-armed");
      paused = true;

      const title = tile.querySelector(".release-tile-title")?.textContent?.trim() || "Preview";
      titleEl.textContent = title;
      linkEl.href = tile.getAttribute("href") || "#";
      stopMedia();

      const local = tile.getAttribute("data-video");
      const yt = tile.getAttribute("data-youtube");
      const shotsRaw = tile.getAttribute("data-shots") || "";
      const shots = shotsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      const poster = tile.getAttribute("data-poster") || "";

      if (local) {
        const empty = document.createElement("div");
        empty.className = "release-preview-empty";
        empty.textContent = `Add clip → ${local}`;
        const video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = "metadata";
        if (poster) video.poster = poster;
        video.addEventListener("loadeddata", () => {
          empty.remove();
          video.play().catch(() => {});
        }, { once: true });
        video.addEventListener("error", () => {
          video.remove();

          if (shots.length && showShotPreview(shots)) {
            empty.remove();
          } else if (poster && showShotPreview([poster])) {
            empty.remove();
          } else if (!stage.contains(empty)) {
            stage.appendChild(empty);
          }
        }, { once: true });
        stage.appendChild(empty);
        stage.appendChild(video);
        video.src = local;
      } else if (yt) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1`;
        iframe.allow = "autoplay; encrypted-media";
        iframe.title = title;
        stage.appendChild(iframe);
      } else if (shots.length) {
        showShotPreview(shots);
      } else if (poster) {
        showShotPreview([poster]);
      } else {
        const empty = document.createElement("div");
        empty.className = "release-preview-empty";
        empty.textContent = 'Set data-shots="assets/games/.../1.png,..."';
        stage.appendChild(empty);
      }

      preview.classList.add("is-open");
      positionPreview(tile);
    }

    function applyOffset() {
      if (loopWidth > 0) offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    function buildLoop() {
      const progress = loopWidth > 0 ? offset / loopWidth : 0;
      closePreview();

      track.querySelectorAll(".release-tile[data-clone]").forEach((n) => n.remove());
      const originals = [...track.querySelectorAll(".release-tile")];
      if (!originals.length) return;

      originals.forEach((tile) => {
        const poster = tile.getAttribute("data-poster");
        const media = tile.querySelector(".release-tile-media");
        if (poster && media) {
          const fit = tile.getAttribute("data-poster-fit") || "cover";
          const pos = tile.getAttribute("data-poster-pos") || "center center";
          media.classList.add("has-poster");
          media.style.backgroundImage = `url("${poster}")`;
          media.style.backgroundSize = fit;
          media.style.backgroundPosition = pos;
          media.style.backgroundRepeat = "no-repeat";
          const ph = media.querySelector(".release-tile-placeholder");
          if (ph) ph.style.display = "none";
        }
      });

      void track.offsetWidth;
      const first = originals[0];
      const last = originals[originals.length - 1];
      const setWidth = Math.round(last.offsetLeft + last.offsetWidth - first.offsetLeft);
      if (setWidth < 10) return;

      const copies = Math.ceil(scroller.clientWidth / setWidth) + 2;
      for (let s = 1; s < copies; s += 1) {
        originals.forEach((tile) => {
          const clone = tile.cloneNode(true);
          clone.dataset.clone = String(s);
          clone.classList.remove("is-armed");
          clone.tabIndex = -1;
          clone.setAttribute("aria-hidden", "true");
          track.appendChild(clone);
        });
      }

      void track.offsetWidth;
      const firstClone = track.querySelector('.release-tile[data-clone="1"]');
      loopWidth = firstClone ? Math.round(firstClone.offsetLeft - first.offsetLeft) : setWidth;
      offset = progress * loopWidth;
      applyOffset();
    }

    function setArmed(tile) {
      if (hoverTile === tile) return;
      if (hoverTile) hoverTile.classList.remove("is-armed");
      hoverTile = tile || null;
      clearHold();
      if (!tile) return;
      tile.classList.add("is-armed");
      holdTimer = window.setTimeout(() => openPreview(tile), HOLD_MS);
    }

    scroller.addEventListener("pointerenter", () => {
      paused = true;
    });

    scroller.addEventListener("pointerleave", () => {
      if (!isOpen() && !dragging) paused = false;
      setArmed(null);
      if (isOpen()) {
        window.setTimeout(() => {
          if (!preview.matches(":hover")) closePreview();
        }, 160);
      }
    });

    scroller.addEventListener("pointermove", (e) => {
      if (dragging) return;
      const tile = e.target.closest?.(".release-tile");
      if (tile && scroller.contains(tile)) setArmed(tile);
      else setArmed(null);
    });

    scroller.addEventListener(
      "wheel",
      (e) => {
        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) {
          dx *= 16;
          dy *= 16;
        } else if (e.deltaMode === 2) {
          dx *= window.innerWidth;
          dy *= window.innerHeight;
        }

        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        if (!delta) return;

        offset += delta;
        applyOffset();
        paused = true;
        e.preventDefault();

        window.clearTimeout(scroller._reelWheelResume);
        scroller._reelWheelResume = window.setTimeout(() => {
          if (!scroller.matches(":hover") && !isOpen() && !dragging) paused = false;
        }, 900);
      },
      { passive: false }
    );

    scroller.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = false;
      dragMoved = false;
      startX = e.clientX;
      startOffset = offset;
      clearHold();

      const onMove = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        const dx = ev.clientX - startX;
        if (!dragging) {
          if (Math.abs(dx) < 6) return;
          dragging = true;
          paused = true;
          scroller.classList.add("is-dragging");
          try {
            scroller.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
        dragMoved = true;
        offset = startOffset - (ev.clientX - startX);
        applyOffset();
      };

      const onUp = (ev) => {
        if (ev.pointerId !== e.pointerId) return;
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);

        if (dragging) {
          dragging = false;
          scroller.classList.remove("is-dragging");
          try {
            scroller.releasePointerCapture(ev.pointerId);
          } catch (_) {}
        }

        if (!scroller.matches(":hover") && !isOpen()) paused = false;

        suppressClick = dragMoved;
        dragMoved = false;
        window.setTimeout(() => {
          suppressClick = false;
        }, 80);
      };

      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });

    scroller.addEventListener("dragstart", (e) => e.preventDefault());

    track.addEventListener(
      "click",
      (e) => {
        if (!suppressClick) return;
        e.preventDefault();
        e.stopPropagation();
      },
      true
    );

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closePreview();
    });

    preview.addEventListener("pointerenter", () => {
      paused = true;
    });

    preview.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        if (!preview.matches(":hover") && !scroller.matches(":hover")) closePreview();
      }, 160);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePreview();
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(buildLoop, 180);
    });

    window.addEventListener("blur", () => {
      dragging = false;
      scroller.classList.remove("is-dragging");
      paused = false;
      closePreview();
    });

    function tick() {
      if (!reduceMotion && !paused && !dragging && !document.hidden && loopWidth > 0) {
        offset += AUTO_SPEED;
        applyOffset();
      }
      if (isOpen() && activeTile) positionPreview(activeTile);
      requestAnimationFrame(tick);
    }

    buildLoop();
    requestAnimationFrame(tick);
    window.addEventListener("load", buildLoop);
    if (document.fonts?.ready) document.fonts.ready.then(buildLoop).catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
