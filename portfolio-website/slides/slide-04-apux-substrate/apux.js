/**
 * apux.js — Slide 04
 * Interactive 3D model viewer and accordion UI.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

(function () {
  "use strict";

  let viewMode = "technical"; // 'technical' | 'layman'
  
  let scene, camera, renderer, composer, mixer, controls;
  let animationMode = "idle";
  
  const layerObjects = [];
  const actionClips = {};
  let currentAction = null;

  /* ── 1. Init Three.js and load GLB ─────────────────────── */
  function initThreeScene() {
    const container = document.getElementById("apux-canvas");
    if (!container) return;

    // SCENE
    scene = new THREE.Scene();
    
    // CAMERA
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    
    // RENDERER
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.zoomSpeed = 2.5; // FIX: Increase zoom speed per user request

    // POST PROCESSING (BLOOM)
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4, // strength
      0.4, // radius
      0.7  // threshold
    );
    const outputPass = new OutputPass();

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    // LIGHTING (fallback in case GLB has none or they were excluded)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // LOAD GLB
    const loader = new GLTFLoader();
    let model; // Declare model in outer scope
    
    // Resolve path relative to index.html
    const glbPath = "slides/slide-04-apux-substrate/assets/apux_model.glb";

    loader.load(glbPath, (gltf) => {
      model = gltf.scene; // Assign to outer variable
      // Auto center and scale the model to fit perfectly
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Normalize model size to roughly 12 units
      const scale = 12 / maxDim;
      model.scale.set(scale, scale, scale);
      
      // Center the model in the world
      model.position.sub(center.multiplyScalar(scale));
      
      scene.add(model);

      // Extract layers
      const expectedNames = [
        'layer_01_base', 'layer_02_crossbar', 'layer_03_cnt_pillars',
        'layer_04_chs_shielding', 'layer_05_sot_mram', 
        'layer_06_dasm_registers', 'layer_07_shadow_worker'
      ];
      
      model.traverse((child) => {
        if (child.isMesh) {
          // Keep original material to restore later
          child.userData.originalMaterial = child.material.clone();
          child.userData.originalPosition = child.position.clone();
          layerObjects.push(child);
        }
      });
      
      // Sort layers by Y position (bottom to top)
      layerObjects.sort((a, b) => a.position.y - b.position.y);

      // ANIMATIONS
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          actionClips[clip.name] = mixer.clipAction(clip);
        });
        
        // Start default
        playAction("idle_rotate");
      }

    }, undefined, (error) => {
      console.error("Error loading GLB:", error);
    });

    // Resize handler
    window.addEventListener("resize", () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    });

    const clock = new THREE.Clock();
    window.apuxIdleRotate = true; // Start rotating by default
    
    function animate() {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      if (controls) controls.update();
      
      if (window.apuxIdleRotate && model) {
        model.rotation.y += 0.15 * delta;
      }
      
      composer.render();
    }
    animate();
  }

  function playAction(name) {
    if (!mixer || !actionClips[name]) return;
    
    // Stop all other actions
    Object.values(actionClips).forEach(action => {
      action.fadeOut(0.5);
    });

    const action = actionClips[name];
    action.reset();
    action.fadeIn(0.5);
    action.play();
    
    currentAction = action;
  }

  function setAnimationMode(mode) {
    // Reset colors and positions before applying new mode
    layerObjects.forEach((mesh, index) => {
      // Ensure material uses vertex colors if it was originally setup that way, or just reset color
      if (mesh.userData.originalMaterial) {
        mesh.material.color.copy(mesh.userData.originalMaterial.color);
      }
      if (mesh.userData.originalPosition) {
        gsap.to(mesh.position, {
          y: mesh.userData.originalPosition.y,
          duration: 1.0,
          ease: "power2.inOut"
        });
      }
    });

    window.apuxIdleRotate = false; // Turn off procedural idle by default

    if (mode === "idle") {
      playAction("idle_rotate");
      window.apuxIdleRotate = true;
    } 
    else if (mode === "explode") {
      // Procedural explode on Y-axis
      layerObjects.forEach((mesh, index) => {
        if (!mesh.userData.originalPosition) mesh.userData.originalPosition = mesh.position.clone();
        gsap.to(mesh.position, {
          y: mesh.userData.originalPosition.y + (index * 2), // separate by 2 units
          duration: 1.5,
          ease: "power2.out"
        });
      });
      playAction("explode_view");
    }
    else if (mode === "thermal") {
      // Procedural thermal coloring
      const thermalColors = [0x0000ff, 0x00ffff, 0x00ff00, 0xffff00, 0xff0000, 0xff00ff, 0xffffff];
      layerObjects.forEach((mesh, index) => {
        const color = new THREE.Color(thermalColors[index % thermalColors.length]);
        gsap.to(mesh.material.color, {
          r: color.r, g: color.g, b: color.b,
          duration: 1.0
        });
      });
      playAction("thermal_view");
      
      // Also reset position if exploded
      layerObjects.forEach(mesh => {
        if (mesh.userData.originalPosition) {
          gsap.to(mesh.position, {
            y: mesh.userData.originalPosition.y,
            duration: 1.0,
            ease: "power2.inOut"
          });
        }
      });
    }
  }

  function focusLayer(layerNum) {
    const idx = layerNum - 1;
    // Dim others
    layerObjects.forEach((mesh, i) => {
      // Ensure transparent is true for fading
      mesh.material.transparent = true;
      gsap.to(mesh.material, {
        opacity: i === idx ? 1.0 : 0.1,
        duration: 0.4
      });
    });
    
    // Stop animations to focus
    if (mixer) mixer.stopAllAction();
    
    // Orbit camera to target the layer (approximate center of bounding box)
    if (layerObjects[idx]) {
      const box = new THREE.Box3().setFromObject(layerObjects[idx]);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 2);
      
      gsap.to(controls.target, {
        x: center.x,
        y: center.y,
        z: center.z,
        duration: 1,
        ease: "power2.inOut"
      });
      
      gsap.to(camera.position, {
        x: center.x + maxDim * 1.5,
        y: center.y + maxDim * 0.5,
        z: center.z + maxDim * 1.5,
        duration: 1,
        ease: "power2.inOut"
      });
    }
  }

  /* ── 3. UI Interactions ────────────────────────────────── */
  function initUI() {
    // Viewer Buttons
    const viewBtns = document.querySelectorAll(".apux-btn");
    viewBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        viewBtns.forEach(b => b.classList.remove("apux-btn-active"));
        btn.classList.add("apux-btn-active");
        setAnimationMode(btn.dataset.mode);
        
        // Remove layer focus if a mode is clicked
        document.querySelectorAll(".apux-card").forEach(c => c.classList.remove("active"));
        updateAccordionHeights();
      });
    });

    // Toggle Switch (Tech/Layman)
    const toggleBtn = document.getElementById("apux-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        viewMode = viewMode === "technical" ? "layman" : "technical";
        toggleBtn.setAttribute("aria-pressed", viewMode === "layman");
        
        toggleBtn.querySelectorAll(".pmm-toggle-option").forEach(opt => {
          opt.classList.toggle("pmm-toggle-active", opt.dataset.mode === viewMode);
        });
        
        updateCardViews();
      });
    }

    // Accordions
    const cards = document.querySelectorAll(".apux-card");
    cards.forEach(card => {
      const header = card.querySelector(".apux-card-header");
      header.addEventListener("click", () => {
        const isActive = card.classList.contains("active");
        
        // Close all
        cards.forEach(c => c.classList.remove("active"));
        
        if (!isActive) {
          card.classList.add("active");
          // Focus the layer in 3D
          const layerNum = parseInt(card.dataset.layer, 10);
          if (layerNum) focusLayer(layerNum);
        } else {
          // Unfocus
          layerObjects.forEach(mesh => {
            gsap.to(mesh.material, { opacity: 1.0, duration: 0.4 });
          });
          // Restore idle animation
          playAction("idle_rotate_track") || playAction("idle_rotate");
        }
        
        updateAccordionHeights();
      });
    });

    updateCardViews();
  }

  function updateCardViews() {
    document.querySelectorAll(".apux-card-body").forEach(body => {
      const techView = body.querySelector(".apux-view-technical");
      const layView = body.querySelector(".apux-view-layman");
      
      if (techView && layView) {
        if (viewMode === "technical") {
          techView.classList.add("active-view");
          layView.classList.remove("active-view");
        } else {
          layView.classList.add("active-view");
          techView.classList.remove("active-view");
        }
      }
    });
    // Need to recalculate heights after view swap because content length differs
    requestAnimationFrame(updateAccordionHeights);
  }

  function updateAccordionHeights() {
    document.querySelectorAll(".apux-card").forEach(card => {
      const body = card.querySelector(".apux-card-body");
      if (card.classList.contains("active")) {
        // Temporarily set to auto to get full scrollHeight, then hardcode for transition
        body.style.height = "auto";
        const h = body.scrollHeight;
        body.style.height = h + "px";
      } else {
        body.style.height = "0px";
      }
    });
  }

  /* ── 4. Scroll Triggers ────────────────────────────────── */
  function initScroll() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: "#slide-04",
      pin: true,
      start: "top top",
      end: "+=100%",
      anticipatePin: 1
    });
  }

  /* ── 5. Math Rendering ─────────────────────────────────── */
  function renderEquations() {
    if (typeof katex === "undefined") return;
    document.querySelectorAll(".apux-katex-block").forEach(el => {
      const tex = el.getAttribute("data-katex");
      if (tex) {
        try {
          katex.render(tex, el, { displayMode: true, throwOnError: false });
        } catch (e) {
          console.error("KaTeX error:", e);
        }
      }
    });
  }

  /* ── Init ──────────────────────────────────────────────── */
  function init() {
    renderEquations();
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
