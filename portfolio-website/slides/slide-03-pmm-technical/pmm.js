/**
 * pmm.js — Slide 03
 * Layout interactions, KaTeX render, SVG diagram highlight.
 */

(function () {
  "use strict";

  let viewMode = 'technical'; // 'technical' or 'layman'
  let activePMMComponent = 'npe';

  /* ── KaTeX render ── */
  function renderEquations() {
    if (typeof katex === "undefined") return;
    document.querySelectorAll(".pmm-katex-block").forEach(el => {
      const tex = el.dataset.katex;
      if (tex) {
        katex.render(tex, el, { displayMode: true, throwOnError: false });
      }
    });
  }

  /* ── Load SVG simulation evidence plots ── */
  async function loadSimEvidence() {
    const plots = document.querySelectorAll('.pmm-sim-evidence-plot[data-svg-pmm]');
    for (const el of plots) {
      const src = el.dataset.svgPmm;
      el.innerHTML = '<span style="color:var(--text-muted);font-family:monospace;font-size:10px;padding:8px;">Loading…</span>';
      try {
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(resp.statusText);
        const text = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (svg) {
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.style.width = '100%';
          svg.style.height = '100%';
          el.innerHTML = '';
          el.appendChild(svg);
        } else {
          throw new Error('No SVG');
        }
      } catch (err) {
        el.innerHTML = '<span style="color:var(--rollback-red);font-family:monospace;font-size:10px;padding:8px;">[SVG unavailable]</span>';
      }
    }
  }

  /* ── Diagram Highlight ── */
  function highlightDiagramNode(id) {
    if (typeof gsap === "undefined") return;

    // Dim all rects
    document.querySelectorAll("#pmm-arch-svg rect, #pmm-arch-svg path, #pmm-arch-svg circle").forEach(node => {
      // Basic reset of classes
      node.classList.remove("pmm-node-highlighted");
      if (node.tagName !== "line" && !node.classList.contains("background-grid")) {
          node.classList.add("pmm-node-dimmed");
      }
    });
    
    document.querySelectorAll("#pmm-arch-svg line, #pmm-arch-svg path.connection").forEach(line => {
      line.classList.remove("pmm-line-active");
    });

    // Determine target node id in SVG based on component id
    let targetId = id;
    if (id === 'gim') targetId = 'gim-halo'; // example if exists
    else if (id === 'dasm') targetId = 'dasm-box';
    else if (id === 'oja') targetId = 'oja-arc';
    else targetId = `pmm-node-${id}`;

    const targetNode = document.getElementById(targetId);
    if (targetNode) {
      targetNode.classList.remove("pmm-node-dimmed");
      targetNode.classList.add("pmm-node-highlighted");
      gsap.to(targetNode, {
        scaleX: 1.05, 
        scaleY: 1.05, 
        duration: 0.2, 
        yoyo: true, 
        repeat: 1, 
        transformOrigin: 'center'
      });
    }

    // Attempt to highlight lines (if classes/ids are set up in SVG)
    document.querySelectorAll(`.line-to-${id}`).forEach(line => {
      line.classList.add("pmm-line-active");
    });
  }

  /* ── Component Switch ── */
  function switchComponent(id) {
    activePMMComponent = id;

    // Update rail
    document.querySelectorAll(".pmm-rail-item").forEach(item => {
      item.classList.remove("pmm-rail-active");
    });
    const activeItem = document.querySelector(`.pmm-rail-item[data-component="${id}"]`);
    if (activeItem) activeItem.classList.add("pmm-rail-active");

    // Update panes
    document.querySelectorAll(".pmm-pane").forEach(pane => {
      pane.classList.add("pmm-pane-hidden");
    });
    const targetPane = document.getElementById(`pmm-pane-${id}`);
    if (targetPane) {
      targetPane.classList.remove("pmm-pane-hidden");
      
      // Sync view mode in the new pane
      targetPane.querySelectorAll(".pmm-view").forEach(v => {
        v.style.display = 'none';
        v.classList.remove("pmm-view-active");
      });
      const activeView = targetPane.querySelector(`.pmm-view-${viewMode}`);
      if (activeView) {
        activeView.style.display = 'block';
        activeView.classList.add("pmm-view-active");
      }

      if (typeof gsap !== "undefined") {
        gsap.fromTo(targetPane, {opacity: 0, y: 10}, {opacity: 1, y: 0, duration: 0.35, ease: "power2.out"});
      }
    }

    // Highlight diagram
    highlightDiagramNode(id);
  }

  /* ── View Toggle (Tech/Layman) ── */
  function initToggle() {
    // Target only the toggle inside slide-03, not apux-toggle on slide-04
    const slide03 = document.getElementById("slide-03");
    const toggleBtn = slide03 ? slide03.querySelector(".pmm-toggle") : document.getElementById("pmm-toggle");
    if (!toggleBtn) return;
    
    const options = toggleBtn.querySelectorAll(".pmm-toggle-option");

    toggleBtn.addEventListener("click", () => {
      viewMode = viewMode === 'technical' ? 'layman' : 'technical';
      const isLayman = viewMode === 'layman';
      
      toggleBtn.setAttribute("aria-pressed", isLayman ? "true" : "false");
      
      options.forEach(opt => opt.classList.remove("pmm-toggle-active"));
      const activeOpt = Array.from(options).find(opt => opt.dataset.mode === viewMode);
      if (activeOpt) activeOpt.classList.add("pmm-toggle-active");

      // Animate visible pane content
      const visiblePane = document.getElementById(`pmm-pane-${activePMMComponent}`);
      if (visiblePane) {
        visiblePane.querySelectorAll(".pmm-view").forEach(v => {
          v.style.display = 'none';
          v.classList.remove("pmm-view-active");
        });
        const activeView = visiblePane.querySelector(`.pmm-view-${viewMode}`);
        if (activeView) {
          activeView.style.display = 'block';
          activeView.classList.add("pmm-view-active");
          if (typeof gsap !== "undefined") {
            gsap.fromTo(activeView, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
          }
        }
      }
    });
  }

  /* ── Init ── */
  function init() {
    renderEquations();
    loadSimEvidence();
    initToggle();

    // Bind rail clicks
    document.querySelectorAll(".pmm-rail-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.component;
        if (id && id !== activePMMComponent) {
          switchComponent(id);
        }
      });
    });

    // Pinning — skip on mobile/tablet
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined" && window.innerWidth > 1024) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: "#slide-03",
        start: "top top",
        end: "+=100%",
        pin: true,
        anticipatePin: 1
      });
    }

    // Initial state
    switchComponent(activePMMComponent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
