/**
 * performance.js — Device capability detection.
 * Sets global flags consumed by hero.js, apux.js, sims.js, and anim.js
 * to reduce GPU/CPU load on mobile and low-end devices.
 * Must be loaded BEFORE all slide scripts (placed in <head>).
 */
(function () {
  'use strict';

  const isMobile      = window.innerWidth <= 768;
  const isTablet      = window.innerWidth <= 1024;
  const isLowEnd      = (navigator.hardwareConcurrency || 4) <= 4;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchPrimary = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* ── Defaults (desktop / high-end) ─────────────────────── */
  window.PARTICLE_COUNT      = 800;
  window.USE_SIMPLE_ANIMATIONS = false;
  window.APUX_QUALITY        = 'high';
  window.CHARTS_ANIMATED     = true;
  window.AUDIO_ENABLED       = true;

  /* ── Mobile / low-end overrides ─────────────────────────── */
  if (isMobile || isLowEnd || prefersReduced) {
    // 1. Reduce hero particle count: 800 → 200
    window.PARTICLE_COUNT = 200;

    // 2. Disable backdrop-filter blur everywhere (expensive on mobile GPU)
    document.documentElement.classList.add('no-blur');

    // 3. Switch to simple IntersectionObserver fade-ins
    window.USE_SIMPLE_ANIMATIONS = true;

    // 4. Three.js APU-X model: low quality mode
    window.APUX_QUALITY = 'low';

    // 5. D3 charts: disable animated line-draw, show final state
    window.CHARTS_ANIMATED = false;

    // 6. Disable Web Audio API entirely
    window.AUDIO_ENABLED = false;
  }

  /* ── Tablet-only (not mobile) ───────────────────────────── */
  if (isTablet && !isMobile) {
    window.PARTICLE_COUNT = 300;
  }

  /* ── Dispatch quality event so apux.js can read it early ─ */
  window.addEventListener('DOMContentLoaded', function () {
    if (window.APUX_QUALITY === 'low') {
      document.dispatchEvent(new CustomEvent('apux-set-quality', { detail: 'low' }));
    }
  });

  /* ── Convert pinned slide sections to normal flow on mobile */
  if (isTablet) {
    window.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('.slide-section, .slide').forEach(function (s) {
        if (window.innerWidth <= 1024) {
          s.style.height = 'auto';
          s.style.minHeight = '100svh';
        }
      });
    });
  }

  /* ── Debug flag bundle ──────────────────────────────────── */
  window.__perfFlags = {
    isMobile,
    isTablet,
    isLowEnd,
    prefersReduced,
    isTouchPrimary,
    PARTICLE_COUNT:        window.PARTICLE_COUNT,
    USE_SIMPLE_ANIMATIONS: window.USE_SIMPLE_ANIMATIONS,
    APUX_QUALITY:          window.APUX_QUALITY,
    CHARTS_ANIMATED:       window.CHARTS_ANIMATED,
    AUDIO_ENABLED:         window.AUDIO_ENABLED,
  };
})();
