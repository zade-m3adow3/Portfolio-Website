/**
 * motivation.js — Slide 02
 * GSAP horizontal scroll, card animations, inline SVG loading, KaTeX render.
 */

(function () {
  "use strict";

  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const GSAP_EASE = "power4.out";

  /* ── KaTeX equations ─────────────────────────────────────── */
  function renderEquations() {
    if (typeof katex === "undefined") return;

    // GIM integrity predicate
    const el = document.getElementById("s2-gim-equation");
    if (el) {
      katex.render(
        String.raw`\mathcal{I}(t) = \mathcal{I}_{\text{neural}}(t) \;\wedge\; \mathcal{I}_{\text{spectral}}(t) \;\wedge\; \mathcal{I}_{\text{symbolic}}(t) \;\wedge\; \mathcal{I}_{\text{capability}}(t) \;\wedge\; \mathcal{I}_{\text{load}}(t) \;\wedge\; \mathcal{I}_{\text{physical}}(t) \;\wedge\; \mathcal{I}_{\text{ethical}}(t)`,
        el,
        { displayMode: true, throwOnError: false }
      );
    }

    // SIM-01 — Crossbar Thermal Noise
    const el01 = document.getElementById("sim01-equation");
    if (el01) {
      katex.render(
        String.raw`V_{\text{noise}} = 2.77\,\mu V < V_{\text{LSB}}`,
        el01,
        { displayMode: false, throwOnError: false }
      );
    }

    // SIM-02 — CHS Shielding
    const el02 = document.getElementById("sim02-equation");
    if (el02) {
      katex.render(
        String.raw`\delta_{\text{shield}} \leq 10^{-5} \Rightarrow 10^5\times\text{ suppression}`,
        el02,
        { displayMode: false, throwOnError: false }
      );
    }

    // SIM-03 — DASM Zero-Drift Rollback
    const el03 = document.getElementById("sim03-equation");
    if (el03) {
      katex.render(
        String.raw`\mathbb{E}[\text{error}_{\text{rollback}}] \equiv 0`,
        el03,
        { displayMode: false, throwOnError: false }
      );
    }

    // SIM-04 — Eigengap Collapse / GIM Trigger
    const el04 = document.getElementById("sim04-equation");
    if (el04) {
      katex.render(
        String.raw`\hat{\delta}_k \to 0^+ \Rightarrow \text{GIM triggers at } t=481`,
        el04,
        { displayMode: false, throwOnError: false }
      );
    }

    // SIM-05 — Stiefel Convergence
    const el05 = document.getElementById("sim05-equation");
    if (el05) {
      katex.render(
        String.raw`\limsup_{t\to\infty}\mathbb{E}[V(\hat{W}_t)] \leq \tfrac{\eta_t B^4}{2\delta_k} + O(\sigma^2_{\text{noise}})`,
        el05,
        { displayMode: false, throwOnError: false }
      );
    }
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
          svg.setAttribute("preserveAspectRatio", "none");
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

    const cards = document.querySelectorAll(".s2-flaw-card");
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

    ScrollTrigger.matchMedia({
      // Desktop: Horizontal Scroll Pin
      "(min-width: 1025px)": function() {
        const track     = document.getElementById("s2-track");
        const outer     = document.getElementById("s2-outer");
        const progressBar = document.getElementById("s2-progress-bar");

        if (!track || !outer) return;

        const tl_s2 = gsap.timeline({
          scrollTrigger: {
            trigger: "#slide-02",
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => "+=" + track.scrollWidth,
            anticipatePin: 1,
            onUpdate(self) {
              if (progressBar) {
                progressBar.style.width = (self.progress * 100) + "%";
              }
            },
          },
        });

        tl_s2.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth) + "px",
          ease: "none",
        });

        const simCards = document.querySelectorAll(".s2-sim-card");
        simCards.forEach(c => c.dataset.animated = "1");
      },
      
      // Mobile: Vertical flow, simple reveal
      "(max-width: 1024px)": function() {
        const simCards = document.querySelectorAll(".s2-sim-card");
        const simObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
              simObserver.unobserve(el);
            }
          });
        }, { threshold: 0.1 });
        simCards.forEach((c) => simObserver.observe(c));
      }
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
        });

        if (!isExpanded) {
          plot.classList.add("s2-plot-expanded");
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
