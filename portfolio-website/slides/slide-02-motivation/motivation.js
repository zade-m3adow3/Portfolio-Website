/**
 * motivation.js — Slide 02
 * GSAP horizontal scroll, card animations, inline SVG loading, KaTeX render.
 */

(function () {
  "use strict";

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const GSAP_EASE = "power4.out";

  /* ── KaTeX equation ─────────────────────────────────────── */
  function renderEquations() {
    const el = document.getElementById("s2-gim-equation");
    if (!el || typeof katex === "undefined") return;

    katex.render(
      String.raw`\mathcal{I}(t) = \mathcal{I}_{\text{neural}}(t) \;\wedge\; \mathcal{I}_{\text{spectral}}(t) \;\wedge\; \mathcal{I}_{\text{symbolic}}(t) \;\wedge\; \mathcal{I}_{\text{capability}}(t) \;\wedge\; \mathcal{I}_{\text{load}}(t) \;\wedge\; \mathcal{I}_{\text{physical}}(t) \;\wedge\; \mathcal{I}_{\text{ethical}}(t)`,
      el,
      { displayMode: true, throwOnError: false }
    );
  }

  /* ── Synthetic SVG Fallback ─────────────────────────────── */
  function createSyntheticSVG(simId) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 400 200");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.width = "100%";
    svg.style.height = "100%";

    // Grid lines
    for (let i = 1; i < 4; i++) {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", "40");
      line.setAttribute("y1", i * 50);
      line.setAttribute("x2", "380");
      line.setAttribute("y2", i * 50);
      line.setAttribute("stroke", "rgba(107,114,128,0.2)");
      line.setAttribute("stroke-dasharray", "4 4");
      svg.appendChild(line);
    }

    // Axes
    const xAxis = document.createElementNS(ns, "line");
    xAxis.setAttribute("x1", "40"); xAxis.setAttribute("y1", "180");
    xAxis.setAttribute("x2", "380"); xAxis.setAttribute("y2", "180");
    xAxis.setAttribute("stroke", "rgba(107,114,128,0.6)");
    
    const yAxis = document.createElementNS(ns, "line");
    yAxis.setAttribute("x1", "40"); yAxis.setAttribute("y1", "20");
    yAxis.setAttribute("x2", "40"); yAxis.setAttribute("y2", "180");
    yAxis.setAttribute("stroke", "rgba(107,114,128,0.6)");

    svg.appendChild(xAxis);
    svg.appendChild(yAxis);

    // Get color based on simId
    const colors = {
      "01": "#00c8ff",
      "02": "#7f5af0",
      "03": "#0af5a0",
      "04": "#ff3864",
      "05": "#e8c547"
    };
    const color = colors[simId] || "#00c8ff";

    // Path
    const path = document.createElementNS(ns, "path");
    // Generate some random looking path
    let d = "M 40 150 ";
    for (let i = 1; i <= 10; i++) {
      d += `L ${40 + i*34} ${150 - Math.random()*120} `;
    }
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "2");

    svg.appendChild(path);
    return svg;
  }

  /* ── Inline SVG loader ──────────────────────────────────── */
  async function loadSVGs() {
    const plots = document.querySelectorAll(".s2-sim-plot[data-svg]");

    for (const plot of plots) {
      const relPath = plot.dataset.svg;
      const simId = plot.closest('.s2-sim-card').dataset.sim;
      // Resolve relative to this script's slide directory
      const base = document.querySelector('link[href*="motivation.css"]');
      let svgPath = relPath;

      if (base) {
        const dir = base.href.replace(/\/[^/]+$/, "/");
        svgPath = dir + relPath;
      } else {
        // Fallback: construct path relative to current page
        const pagePath = window.location.pathname.replace(/\/[^/]*$/, "/");
        svgPath = pagePath + "slides/slide-02-motivation/" + relPath;
      }

      plot.classList.add("loading");

      try {
        const resp = await fetch(svgPath);
        if (!resp.ok) throw new Error(resp.statusText);
        const text = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");

        if (svg) {
          // Remove fixed width/height so it scales with container
          svg.removeAttribute("width");
          svg.removeAttribute("height");
          svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svg.style.width = "100%";
          svg.style.height = "100%";
          plot.classList.remove("loading");
          plot.appendChild(svg);
        } else {
          throw new Error("No SVG element found");
        }
      } catch (err) {
        plot.classList.remove("loading");
        // Fallback: create synthetic D3-style SVG
        const fallbackSvg = createSyntheticSVG(simId);
        plot.appendChild(fallbackSvg);
      }
    }
  }

  /* ── Card Entrance (IntersectionObserver) ───────────────── */
  function initCardAnimations() {
    const slide = document.getElementById("slide-02");
    if (!slide) return;

    const cards = document.querySelectorAll(".s2-card");
    const pullquote = document.querySelector(".s2-pullquote");
    const scrollHint = document.querySelector(".s2-scroll-hint");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
          // Animate cards
          cards.forEach((card, i) => {
            gsap.to(card, {
              opacity: 1,
              x: 0,
              duration: 0.7,
              ease: GSAP_EASE,
              delay: i * 0.15,
            });
          });

          // Pull quote
          if (pullquote) {
            gsap.to(pullquote, {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: GSAP_EASE,
              delay: 0.6,
            });
          }

          // Hint
          if (scrollHint) {
            gsap.to(scrollHint, {
              opacity: 1,
              duration: 1,
              delay: 1.0,
            });
          }

          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });

    observer.observe(slide);
  }

  /* ── GSAP horizontal scroll ─────────────────────────────── */
  function initHorizontalScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const track     = document.getElementById("s2-track");
    const outer     = document.getElementById("s2-outer");
    const progressBar = document.getElementById("s2-progress-bar");

    if (!track || !outer) return;

    // Horizontal pan: move track left by 100vw
    const tl_s2 = gsap.timeline({
      scrollTrigger: {
        trigger: "#slide-02",
        pin: true,
        scrub: 1,
        start: "top top",
        end: "+=200%",           // 2× viewport height of scroll to traverse both panels
        anticipatePin: 1,
        onUpdate(self) {
          // Progress bar spans across both panels
          if (progressBar) {
            progressBar.style.width = (self.progress * 100) + "%";
          }
        },
      },
    });

    tl_s2.to(track, {
      x: "-100vw",
      ease: "none",
    });

    /* ── Sim card stagger (Panel B) ───────────────────────── */
    const simCards = document.querySelectorAll(".s2-sim-card");
    gsap.set(simCards, { opacity: 0, y: 20 });

    ScrollTrigger.create({
      trigger: "#slide-02",
      start: "top top",          // fires when panel B comes into view via scroll
      onUpdate(self) {
        if (self.progress > 0.5) {
          simCards.forEach((card, i) => {
            if (card.dataset.animated) return;
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: GSAP_EASE,
              delay: i * 0.1,
            });
            card.dataset.animated = "1";
          });
        }
      },
    });
  }

  /* ── Sim plot expand on click (lightbox feel) ────────────── */
  function initPlotInteraction() {
    document.querySelectorAll(".s2-sim-plot").forEach((plot) => {
      plot.addEventListener("click", () => {
        const isExpanded = plot.classList.contains("s2-plot-expanded");

        // Close any open
        document.querySelectorAll(".s2-plot-expanded").forEach((el) => {
          el.classList.remove("s2-plot-expanded");
          el.style.transform = "";
          el.style.zIndex = "";
          el.style.position = "";
        });

        if (!isExpanded) {
          plot.classList.add("s2-plot-expanded");
          plot.style.position = "fixed";
          plot.style.inset = "10vh 10vw";
          plot.style.width = "80vw";
          plot.style.height = "80vh";
          plot.style.zIndex = "999";
          plot.style.background = "#08080f";
          plot.style.border = "1px solid rgba(0,200,255,0.3)";
          plot.style.boxShadow = "0 0 60px rgba(0,200,255,0.15)";
          plot.style.cursor = "zoom-out";
        }
      });
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    renderEquations();
    loadSVGs();
    initCardAnimations();
    initHorizontalScroll();
    initPlotInteraction();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
