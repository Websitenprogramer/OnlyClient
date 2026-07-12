(function () {
  const CANVAS_ID = "skin-preview-canvas";
  const SECTION_ID = "skin-preview";
  const SKIN_URL = "https://minotar.net/skin/OnlyNoah3";
  const SKINVIEW3D_SOURCES = [
    "https://cdn.jsdelivr.net/npm/skinview3d@3.4.2/bundles/skinview3d.bundle.js",
    "https://unpkg.com/skinview3d@3.4.2/bundles/skinview3d.bundle.js",
  ];

  let viewer = null;
  let loadPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-skinview3d-src="${src}"]`);
      if (existing) {
        if (typeof skinview3d !== "undefined") resolve();
        else existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.skinview3dSrc = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(src));
      document.head.appendChild(script);
    });
  }

  function ensureSkinview3d() {
    if (typeof skinview3d !== "undefined") return Promise.resolve(true);
    if (!loadPromise) {
      loadPromise = (async () => {
        for (const src of SKINVIEW3D_SOURCES) {
          try {
            await loadScript(src);
            if (typeof skinview3d !== "undefined") return true;
          } catch {
            /* try next */
          }
        }
        return false;
      })();
    }
    return loadPromise;
  }

  async function init() {
    const canvas = document.getElementById(CANVAS_ID);
    const section = document.getElementById(SECTION_ID);
    if (!canvas || !section) return;

    const ok = await ensureSkinview3d();
    if (!ok || typeof skinview3d === "undefined") {
      section.classList.add("skin-preview--failed");
      return;
    }

    const width = Math.min(328, canvas.parentElement?.clientWidth || 328);
    const height = Math.round(width * 1.28);

    viewer = new skinview3d.SkinViewer({
      canvas,
      width,
      height,
      skin: SKIN_URL,
    });

    viewer.camera.position.z = 52;
    viewer.zoom = 0.88;
    viewer.fov = 42;
    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.6;
    viewer.animation = new skinview3d.WalkingAnimation();
    viewer.animation.speed = 0.35;
    viewer.animation.paused = true;

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;

    const resize = () => {
      const w = Math.min(328, canvas.parentElement?.clientWidth || 328);
      const h = Math.round(w * 1.28);
      if (w > 0 && h > 0) viewer.setSize(w, h);
    };

    resize();
    window.addEventListener("resize", resize);
    section.classList.add("skin-preview--ready");

    canvas.addEventListener("pointerdown", () => {
      viewer.autoRotate = false;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
