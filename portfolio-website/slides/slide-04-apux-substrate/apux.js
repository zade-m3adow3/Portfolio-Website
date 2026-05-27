/**
 * apux.js — Slide 04
 * Procedural Three.js APU-X layer visualization.
 * No GLB file required — 7-layer stack built from BoxGeometry.
 * Supports idle rotation, explode view, thermal mode, per-layer focus.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function () {
  "use strict";

  let viewMode = "technical";
  let scene, camera, renderer, controls;
  let layerGroup;
  const layerMeshes = [];
  let animMode = "idle";
  let thermalActive = false;

  /* ── Layer definitions ─────────────────────────────────────── */
  const LAYERS = [
    { label: "14nm FinFET Base",          color: 0x00c8ff, emissive: 0x002233, h: 0.35 },
    { label: "512-Tile Crossbar Array",   color: 0x7f5af0, emissive: 0x1a0044, h: 0.50 },
    { label: "CNT Thermal Pillars",       color: 0x0af5a0, emissive: 0x003322, h: 0.55 },
    { label: "CHS Coaxial Shielding",     color: 0xe8c547, emissive: 0x332c00, h: 0.35 },
    { label: "SOT-MRAM State Storage",    color: 0xff3864, emissive: 0x330010, h: 0.50 },
    { label: "DASM Snapshot Registers",   color: 0x00ffd5, emissive: 0x002b28, h: 0.35 },
    { label: "Shadow Verification Tile",  color: 0xffffff, emissive: 0x1a1a1a, h: 0.30 },
  ];

  /* ── 1. Build Three.js Scene ───────────────────────────────── */
  function initThreeScene() {
    const container = document.getElementById("apux-canvas");
    if (!container) return;

    /* Scene */
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05050c);
    scene.fog = new THREE.FogExp2(0x05050c, 0.045);

    /* Camera */
    camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 4.5, 14);

    /* Renderer */
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* Orbit Controls */
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6;
    controls.maxDistance = 28;
    controls.target.set(0, 1.8, 0);
    controls.update();

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const keyLight = new THREE.DirectionalLight(0x00c8ff, 2.5);
    keyLight.position.set(10, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x7f5af0, 1.8, 25);
    fillLight.position.set(-10, 6, -6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xe8c547, 1.2, 20);
    rimLight.position.set(0, -3, 10);
    scene.add(rimLight);

    /* Build layer stack */
    layerGroup = new THREE.Group();
    scene.add(layerGroup);

    let yAccum = 0;
    LAYERS.forEach((def, i) => {
      const geo = new THREE.BoxGeometry(5.8, def.h, 5.8);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.emissive,
        emissiveIntensity: 0.45,
        metalness: 0.55,
        roughness: 0.38,
        transparent: true,
        opacity: 0.93,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const baseY = yAccum + def.h / 2;
      mesh.position.y = baseY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        baseY,
        explodeY: baseY + i * 1.3 + 0.6,
        index: i,
        def,
      };

      /* Bright edge outline */
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: def.color, transparent: true, opacity: 0.6 })
      );
      mesh.add(edges);

      layerGroup.add(mesh);
      layerMeshes.push(mesh);
      yAccum += def.h + 0.06;
    });

    /* Grid floor */
    const grid = new THREE.GridHelper(22, 22, 0x111133, 0x0d0d22);
    grid.position.y = -0.05;
    scene.add(grid);

    /* Resize */
    window.addEventListener("resize", () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    /* Render loop */
    const clock = new THREE.Clock();
    (function tick() {
      requestAnimationFrame(tick);
      const elapsed = clock.getElapsedTime();

      if (animMode === "idle") {
        layerGroup.rotation.y += 0.004;
      }

      if (thermalActive) {
        layerMeshes.forEach((mesh, i) => {
          const pulse = (Math.sin(elapsed * 3 + i * 0.6) + 1) / 2;
          mesh.material.emissiveIntensity = 0.4 + (LAYERS.length - i) * 0.1 * pulse;
          mesh.material.emissive.setRGB(
            0.6 + 0.4 * pulse,
            0.1 + 0.05 * (LAYERS.length - i),
            0
          );
        });
      }

      controls.update();
      renderer.render(scene, camera);
    })();
  }

  /* ── 2. Animation Modes ────────────────────────────────────── */
  function setMode(mode) {
    animMode = mode;

    if (mode === "idle") {
      thermalActive = false;
      resetLayerMaterials();
      setExplode(false);
    } else if (mode === "explode") {
      thermalActive = false;
      resetLayerMaterials();
      setExplode(true);
    } else if (mode === "thermal") {
      thermalActive = true;
      setExplode(false);
    }
  }

  function resetLayerMaterials() {
    layerMeshes.forEach((mesh) => {
      mesh.material.emissiveIntensity = 0.45;
      mesh.material.emissive.setHex(mesh.userData.def.emissive);
    });
  }

  function setExplode(on) {
    if (!window.gsap) return;
    layerMeshes.forEach((mesh) => {
      gsap.to(mesh.position, {
        y: on ? mesh.userData.explodeY : mesh.userData.baseY,
        duration: 1.2,
        ease: "power2.inOut",
      });
    });
  }

  /* ── 3. Layer Focus ────────────────────────────────────────── */
  function focusLayer(layerNum) {
    const idx = layerNum - 1;
    layerMeshes.forEach((mesh, i) => {
      if (!window.gsap) return;
      gsap.to(mesh.material, {
        opacity: i === idx ? 1.0 : 0.12,
        duration: 0.5,
      });
    });
    if (controls && layerMeshes[idx]) {
      const target = layerMeshes[idx].position;
      if (window.gsap) {
        gsap.to(controls.target, {
          y: target.y,
          duration: 1.0,
          ease: "power2.inOut",
          onUpdate: () => controls.update(),
        });
      }
    }
  }

  function resetLayerFocus() {
    layerMeshes.forEach((mesh) => {
      if (window.gsap) gsap.to(mesh.material, { opacity: 0.93, duration: 0.4 });
    });
  }

  /* ── 4. Accordion UI ───────────────────────────────────────── */
  function updateAccordionHeights() {
    document.querySelectorAll(".apux-card").forEach((card) => {
      const body = card.querySelector(".apux-card-body");
      if (!body) return;
      if (card.classList.contains("active")) {
        body.style.height = "auto";
        body.style.height = body.scrollHeight + "px";
      } else {
        body.style.height = "0px";
      }
    });
  }

  function updateCardViews() {
    document.querySelectorAll(".apux-card-body").forEach((body) => {
      const t = body.querySelector(".apux-view-technical");
      const l = body.querySelector(".apux-view-layman");
      if (t && l) {
        t.classList.toggle("active-view", viewMode === "technical");
        l.classList.toggle("active-view", viewMode === "layman");
      }
    });
    requestAnimationFrame(updateAccordionHeights);
  }

  /* ── 5. UI Interactions ────────────────────────────────────── */
  function initUI() {
    /* Mode buttons */
    document.querySelectorAll(".apux-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".apux-btn").forEach((b) => b.classList.remove("apux-btn-active"));
        btn.classList.add("apux-btn-active");
        setMode(btn.dataset.mode);
        document.querySelectorAll(".apux-card").forEach((c) => c.classList.remove("active"));
        resetLayerFocus();
        updateAccordionHeights();
      });
    });

    /* Tech / Layman toggle */
    const toggleBtn = document.getElementById("apux-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        viewMode = viewMode === "technical" ? "layman" : "technical";
        toggleBtn.setAttribute("aria-pressed", viewMode === "layman");
        toggleBtn.querySelectorAll(".pmm-toggle-option").forEach((opt) => {
          opt.classList.toggle("pmm-toggle-active", opt.dataset.mode === viewMode);
        });
        updateCardViews();
      });
    }

    /* Accordion cards */
    document.querySelectorAll(".apux-card").forEach((card) => {
      const header = card.querySelector(".apux-card-header");
      if (!header) return;
      header.addEventListener("click", () => {
        const wasActive = card.classList.contains("active");
        document.querySelectorAll(".apux-card").forEach((c) => c.classList.remove("active"));
        resetLayerFocus();
        if (!wasActive) {
          card.classList.add("active");
          const layerNum = parseInt(card.dataset.layer, 10);
          if (layerNum) focusLayer(layerNum);
        }
        updateAccordionHeights();
      });
    });

    updateCardViews();
  }

  /* ── 6. Scroll pin ─────────────────────────────────────────── */
  function initScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: "#slide-04",
      pin: true,
      start: "top top",
      end: "+=100%",
      anticipatePin: 1,
    });
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    initThreeScene();
    initUI();
    initScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
