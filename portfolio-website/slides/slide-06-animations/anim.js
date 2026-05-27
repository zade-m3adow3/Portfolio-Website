/**
 * anim.js — Slide 06
 * GIM Rollback, DASM, and Thermal Heatmap animations
 */

(function () {
  "use strict";

  // KaTeX render
  function renderEquations() {
    if (typeof katex === 'undefined') return;
    document.querySelectorAll('[data-katex]').forEach(el => {
      const tex = el.dataset.katex;
      if (tex) katex.render(tex, el, { displayMode: true, throwOnError: false, output: 'html' });
    });
  }

  // --- Web Audio Context ---
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playAlertTone() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {
      console.warn("Audio not initialized");
    }
  }
  
  document.addEventListener('click', () => { getAudioContext(); }, {once: true});

  // --- Animation 1: GIM ---
  function initGIM() {
    const canvas = document.getElementById('canvas-gim');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let isPlaying = false;
    let time = 0; // seconds
    let phase = 0; 
    let lastTime = 0;
    
    const nodes = [
      { id: 'I_neural', a: -Math.PI/2 },
      { id: 'I_spectral', a: -Math.PI/2 + Math.PI*2/7 },
      { id: 'I_symbolic', a: -Math.PI/2 + Math.PI*4/7 },
      { id: 'I_capability', a: -Math.PI/2 + Math.PI*6/7 },
      { id: 'I_load', a: -Math.PI/2 + Math.PI*8/7 },
      { id: 'I_physical', a: -Math.PI/2 + Math.PI*10/7 },
      { id: 'I_ethical', a: -Math.PI/2 + Math.PI*12/7 },
    ];
    
    const cx = 400;
    const cy = 200;
    const rOuter = 150;
    
    const statusText = document.getElementById('gim-status-text');
    const counterText = document.getElementById('gim-eigengap');
    const wrap = document.getElementById('gim-canvas-wrap');
    
    let spectralState = 0; // 0=green, 1=yellow, 2=red
    let dasmBeamY = 400;
    let allRed = false;
    let recovering = false;
    let flashIndices = [];

    function drawGIM(dt) {
      ctx.clearRect(0, 0, 800, 400);
      
      if(time >= 0 && time < 3) { phase = 0; }
      else if(time >= 3 && time < 5) { phase = 1; }
      else if(time >= 5 && time < 5.5) { phase = 2; }
      else if(time >= 5.5 && time < 7) { phase = 3; }
      else if(time >= 7 && time < 9) { phase = 4; }
      else if(time >= 9 && time < 11) { phase = 5; } // 2s pause
      else if(time >= 11) { time = 0; phase = 0; } // loop
      
      // Transitions logic
      if (phase === 0) {
        spectralState = 0;
        allRed = false;
        recovering = false;
        dasmBeamY = 400;
        flashIndices = [];
        statusText.innerText = 'I(t) = TRUE · AUTONOMOUS EXECUTION ENABLED';
        statusText.style.color = 'var(--neural-green)';
        counterText.innerText = 'δ̂_k = 2.84';
        wrap.classList.remove('gim-fail');
      } 
      else if (phase === 1) {
        // Oscillation logic
        let p = (time - 3) / 2; // 0 to 1
        if (p < 0.5) spectralState = 1; // yellow
        else spectralState = 2; // red
        
        let eg = 2.84 - p * (2.84 - 0.05);
        counterText.innerText = `δ̂_k = ${Math.max(0.05, eg).toFixed(2)}`;
      }
      else if (phase === 2) {
        if (!allRed) {
          allRed = true;
          statusText.innerText = 'I(t) = FALSE · HALT ALL AUTONOMOUS ACTIONS';
          statusText.style.color = 'var(--rollback-red)';
          wrap.classList.add('gim-fail');
          playAlertTone();
        }
        counterText.innerText = 'FAIL';
      }
      else if (phase === 3) {
        if (!recovering) {
          recovering = true;
          counterText.innerText = 'θ_{t+1} ← θ_snapshot';
          wrap.classList.remove('gim-fail');
        }
        dasmBeamY -= (dt * 300); // beam moves up
        if (dasmBeamY < cy) dasmBeamY = cy;
      }
      else if (phase === 4) {
        let p = (time - 7) / 2;
        let numRecovered = Math.floor(p * 8);
        flashIndices = Array.from({length: Math.min(7, numRecovered)}, (_, i) => i);
        if (p > 0.8) {
          statusText.innerText = 'I(t) = TRUE · ROLLBACK COMPLETE · EXECUTION RESUMED';
          statusText.style.color = 'var(--neural-green)';
          counterText.innerText = 'δ̂_k = 2.84';
        } else {
          counterText.innerText = 'RECOVERING...';
        }
      }

      // Draw DASM register & beam in Phase 3
      if (phase === 3 || (phase === 4 && dasmBeamY <= cy)) {
        ctx.fillStyle = 'var(--spectral-1)';
        ctx.fillRect(cx - 40, dasmBeamY, 80, 400 - dasmBeamY);
        
        ctx.fillStyle = 'rgba(0,200,255,0.2)';
        ctx.fillRect(cx - 100, 350, 200, 50);
        ctx.fillStyle = 'var(--spectral-1)';
        ctx.font = '12px "IBM Plex Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('DASM SRAM', cx, 380);
      }
      
      const opacity = (phase === 3 && dasmBeamY > cy) ? 0.2 : 1.0;
      ctx.globalAlpha = opacity;

      // Draw Lines & Dots
      nodes.forEach((n, i) => {
        let nx = cx + Math.cos(n.a) * rOuter;
        let ny = cy + Math.sin(n.a) * rOuter;
        
        let isRedLine = (phase === 2) || (phase === 1 && i === 1 && spectralState === 2);
        let isYellowLine = (phase === 1 && i === 1 && spectralState === 1);
        
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(cx, cy);
        
        if (isRedLine) ctx.strokeStyle = 'var(--rollback-red)';
        else if (isYellowLine) ctx.strokeStyle = '#e8c547';
        else ctx.strokeStyle = 'rgba(10,245,160,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dots flowing
        if (phase < 2 || phase === 4) {
          let numDots = 3;
          for(let d=0; d<numDots; d++) {
            let offset = (time * 0.5 + d/numDots) % 1.0; 
            // 0 is outer, 1 is center
            let dx = nx + (cx - nx) * offset;
            let dy = ny + (cy - ny) * offset;
            
            ctx.beginPath();
            ctx.arc(dx, dy, 2, 0, Math.PI*2);
            ctx.fillStyle = 'var(--neural-green)';
            ctx.fill();
          }
        }
      });

      // Draw Nodes
      nodes.forEach((n, i) => {
        let nx = cx + Math.cos(n.a) * rOuter;
        let ny = cy + Math.sin(n.a) * rOuter;
        
        let fillColor = '#0af5a0'; // green
        
        if (phase === 1 && i === 1) {
          if (spectralState === 1) fillColor = '#e8c547';
          if (spectralState === 2) fillColor = '#ff3864';
        } else if (phase === 2) {
          fillColor = '#ff3864';
        } else if (phase === 3) {
          fillColor = 'rgba(10,245,160,0.2)';
        } else if (phase === 4) {
          if (!flashIndices.includes(i)) fillColor = 'rgba(10,245,160,0.2)';
        }
        
        ctx.beginPath();
        ctx.arc(nx, ny, 18, 0, Math.PI*2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px "IBM Plex Mono"';
        ctx.textAlign = 'center';
        
        // Push label out
        let lx = cx + Math.cos(n.a) * (rOuter + 35);
        let ly = cy + Math.sin(n.a) * (rOuter + 35);
        ctx.fillText(n.id, lx, ly);
      });

      // Center GIM Node
      ctx.beginPath();
      ctx.arc(cx, cy, 36, 0, Math.PI*2);
      ctx.fillStyle = '#05050c';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = phase === 2 ? '#ff3864' : '#0af5a0';
      ctx.stroke();
      
      ctx.fillStyle = phase === 2 ? '#ff3864' : '#0af5a0';
      ctx.font = '14px "Bebas Neue"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(phase === 2 ? 'FAIL' : 'GIM', cx, cy);

      ctx.globalAlpha = 1.0;
    }

    function loop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      let dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      
      if (isPlaying) {
        time += dt;
        drawGIM(dt);
      }
      requestAnimationFrame(loop);
    }
    
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        isPlaying = entry.isIntersecting;
      });
    }, { threshold: 0.3 });
    observer.observe(document.getElementById('anim-gim-block'));
    
    requestAnimationFrame(loop);
  }

  // --- Animation 2: DASM ---
  function initDASM() {
    const cA = document.getElementById('canvas-dasm-analog');
    const cD = document.getElementById('canvas-dasm-digital');
    if(!cA || !cD) return;
    
    const ctxA = cA.getContext('2d');
    const ctxD = cD.getContext('2d');
    
    const w = 350, h = 250;
    let time = 0;
    let isPlaying = false;
    let lastTime = 0;
    
    let isDrifting = false;
    let driftTimer = 0;
    let driftAccumulator = 0;
    
    const btnSim = document.getElementById('btn-sim-drift');
    const lblAnalog = document.getElementById('dasm-analog-label');
    const lblDigital = document.getElementById('dasm-digital-label');
    
    btnSim.addEventListener('click', () => {
      isDrifting = true;
      driftTimer = 0;
      driftAccumulator = 0;
      btnSim.disabled = true;
      btnSim.innerText = 'DRIFTING...';
    });

    function drawDASM(dt) {
      // Analog Domain
      ctxA.clearRect(0,0,w,h);
      ctxA.strokeStyle = 'rgba(255,255,255,0.1)';
      ctxA.beginPath(); ctxA.moveTo(0,h/2); ctxA.lineTo(w,h/2); ctxA.stroke();
      
      ctxA.beginPath();
      for(let x=0; x<w; x++) {
        let baseY = Math.sin((x/30) + time*2) * 40;
        let noise = (Math.random()-0.5) * 5;
        let drift = isDrifting ? driftAccumulator * (x/w) : 0;
        
        let y = (h/2) + baseY + noise + drift;
        if(x===0) ctxA.moveTo(x,y);
        else ctxA.lineTo(x,y);
      }
      ctxA.strokeStyle = isDrifting ? '#ff3864' : '#00c8ff';
      ctxA.lineWidth = 2;
      ctxA.stroke();
      
      // Digital Domain
      ctxD.clearRect(0,0,w,h);
      const numBars = 16;
      const barW = (w - 40) / numBars;
      for(let i=0; i<numBars; i++) {
        // Hash from time (discretized for "snapshot")
        let discreteTime = Math.floor(time * 4); // update 4x a sec
        // During drift, digital STAYS FROZEN
        if(isDrifting) discreteTime = Math.floor((time - driftTimer) * 4); 
        
        let bit = (Math.sin(discreteTime + i*1.3) > 0) ? 1 : 0;
        
        let bx = 20 + i*barW;
        let by = bit ? (h/2 - 40) : (h/2 + 10);
        
        ctxD.fillStyle = bit ? '#0af5a0' : '#05050c';
        ctxD.strokeStyle = 'rgba(10,245,160,0.3)';
        ctxD.fillRect(bx+2, by, barW-4, 30);
        ctxD.strokeRect(bx+2, by, barW-4, 30);
      }
      
      // Logic
      if(isDrifting) {
        driftTimer += dt;
        driftAccumulator += (dt * 50); // grow drift
        
        if (driftTimer > 2) {
          lblAnalog.innerText = 'WARNING: DRIFT EXCEEDS THRESHOLD';
          lblAnalog.style.color = 'var(--rollback-red)';
        }
        
        if (driftTimer > 4) {
          // Restore
          isDrifting = false;
          driftAccumulator = 0;
          btnSim.disabled = false;
          btnSim.innerText = 'SIMULATE DRIFT';
          lblAnalog.innerText = 'Analog weights restored from snapshot';
          lblAnalog.style.color = 'var(--neural-green)';
          setTimeout(() => {
            lblAnalog.innerText = 'Analog weights: normal operation';
            lblAnalog.style.color = 'var(--text-muted)';
          }, 2000);
          
          // Flash digital side
          ctxD.fillStyle = 'rgba(10,245,160,0.2)';
          ctxD.fillRect(0,0,w,h);
        }
      }
    }
    
    function loop(ts) {
      if(!lastTime) lastTime = ts;
      let dt = (ts - lastTime)/1000;
      lastTime = ts;
      
      if(isPlaying) {
        time += dt;
        drawDASM(dt);
      }
      requestAnimationFrame(loop);
    }
    
    const obs = new IntersectionObserver(e => {
      e.forEach(ent => isPlaying = ent.isIntersecting);
    }, {threshold:0.3});
    obs.observe(document.getElementById('anim-dasm-block'));
    
    requestAnimationFrame(loop);
  }

  // --- Animation 3: Thermal ---
  function initThermal() {
    const cT = document.getElementById('canvas-thermal-top');
    const cS = document.getElementById('canvas-thermal-side');
    if(!cT || !cS) return;
    const ctxT = cT.getContext('2d');
    const ctxS = cS.getContext('2d');
    
    let isPlaying = false;
    let time = 0;
    let lastTime = 0;
    
    let isHighLoad = false;
    let loadTimer = 0;
    const btnLoad = document.getElementById('btn-high-load');
    btnLoad.addEventListener('click', () => {
      isHighLoad = true;
      loadTimer = 2; // 2 seconds of high load
    });
    
    // interpolate #00c8ff to #ff3864
    function getTempColor(t) {
      // t is 0.0 to 1.0
      t = Math.max(0, Math.min(1, t));
      let r = Math.floor(0 + t * (255 - 0));
      let g = Math.floor(200 - t * (200 - 56));
      let b = Math.floor(255 - t * (255 - 100));
      return `rgb(${r},${g},${b})`;
    }

    function drawThermal(dt) {
      if(isHighLoad) {
        loadTimer -= dt;
        if(loadTimer <= 0) isHighLoad = false;
      }
      
      // Top down 16x16
      const tw = 320, th = 320;
      ctxT.clearRect(0,0,tw,th);
      
      const cols = 16, rows = 16;
      const cellW = tw/cols, cellH = th/rows;
      
      for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
          let baseTemp = 0.2 + 0.1 * Math.sin(time + r*0.5 + c*0.5);
          
          if(isHighLoad) {
            // center cluster gets hot
            let dist = Math.abs(r-8) + Math.abs(c-8);
            if(dist < 4) {
              baseTemp += (1.0 - (dist/4)) * 0.7 * (loadTimer/2);
            }
          }
          
          ctxT.fillStyle = getTempColor(baseTemp);
          ctxT.fillRect(c*cellW, r*cellH, cellW-1, cellH-1);
        }
      }
      
      // Side cross section
      const sw = 400, sh = 320;
      ctxS.clearRect(0,0,sw,sh);
      
      const layerH = sh / 7;
      const layers = [
        "Layer 7 (Verification)",
        "Layer 6 (DASM SRAM)",
        "Layer 5 (SOT-MRAM)",
        "Layer 4 (CHS Graphene)",
        "Layer 3 (CNT Pillars)",
        "Layer 2 (Analog Core)",
        "Layer 1 (Silicon Base)"
      ];
      
      for(let i=0; i<7; i++) {
        ctxS.fillStyle = i%2===0 ? '#0d0d1a' : '#141424';
        ctxS.fillRect(0, i*layerH, sw, layerH);
        
        ctxS.fillStyle = 'rgba(255,255,255,0.3)';
        ctxS.font = '10px "IBM Plex Mono"';
        ctxS.fillText(layers[i], 10, i*layerH + 20);
      }
      
      // CNT pillars in Layer 3 (i=4)
      let l3y = 4 * layerH;
      for(let p=0; p<8; p++) {
        let px = 50 + p * 40;
        ctxS.strokeStyle = 'rgba(0,200,255,0.3)';
        ctxS.lineWidth = 4;
        ctxS.beginPath();
        ctxS.moveTo(px, l3y);
        ctxS.lineTo(px, l3y + layerH);
        ctxS.stroke();
        
        // Heat particles moving UP (decreasing Y)
        for(let pidx=0; pidx<3; pidx++) {
          let offset = (time * 0.8 + pidx*0.33) % 1.0; 
          let py = (l3y + layerH) - (layerH * offset); // moves up
          let pTemp = 1.0 - offset; // hotter at bottom
          
          if(isHighLoad) pTemp = 1.0;
          
          ctxS.fillStyle = getTempColor(pTemp);
          ctxS.beginPath();
          ctxS.arc(px, py, 3, 0, Math.PI*2);
          ctxS.fill();
        }
      }
    }
    
    function loop(ts) {
      if(!lastTime) lastTime = ts;
      let dt = (ts - lastTime)/1000;
      lastTime = ts;
      
      if(isPlaying) {
        time += dt;
        drawThermal(dt);
      }
      requestAnimationFrame(loop);
    }
    
    const obs = new IntersectionObserver(e => {
      e.forEach(ent => isPlaying = ent.isIntersecting);
    }, {threshold:0.3});
    obs.observe(document.getElementById('anim-thermal-block'));
    
    requestAnimationFrame(loop);
  }

  // --- Init ---
  function init() {
    renderEquations();
    initGIM();
    initDASM();
    initThermal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
