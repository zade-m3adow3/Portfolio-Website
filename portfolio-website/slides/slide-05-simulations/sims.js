/**
 * sims.js — Slide 05
 * Three.js Stiefel manifold, D3 Banach animation, D3 SOTA charts.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function(){
  'use strict';

  // ── KaTeX renders ──
  function renderEquations(){
    if (typeof katex === 'undefined') return;
    document.querySelectorAll('[data-katex]').forEach(el => {
      const tex = el.dataset.katex;
      if (tex) {
        katex.render(tex, el, { displayMode: true, throwOnError: false });
      }
    });
  }

  // ── PANEL A: Three.js Stiefel Manifold ──
  function initStiefel() {
    const container = document.getElementById('sims-stiefel-canvas');
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2, 1.5, 2.5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Controls (OrbitControls if available)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Sphere (wireframe)
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x7f5af0, wireframe: true, transparent: true, opacity: 0.15 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Target Vectors W*
    const wStar1 = new THREE.Vector3(0, 1, 0);
    const wStar2 = new THREE.Vector3(1, 0, 0);
    scene.add(new THREE.ArrowHelper(wStar1, new THREE.Vector3(0,0,0), 1.1, 0xff3864));
    scene.add(new THREE.ArrowHelper(wStar2, new THREE.Vector3(0,0,0), 1.1, 0xff3864));

    // Current Vectors W_t (Quicksand Oja++)
    let wt1 = new THREE.Vector3(0.5, 0.5, 0.7).normalize();
    let wt2 = new THREE.Vector3(0.7, -0.5, 0.5).normalize();
    const arrowWt1 = new THREE.ArrowHelper(wt1, new THREE.Vector3(0,0,0), 1.05, 0x00c8ff);
    const arrowWt2 = new THREE.ArrowHelper(wt2, new THREE.Vector3(0,0,0), 1.05, 0x00c8ff);
    scene.add(arrowWt1);
    scene.add(arrowWt2);

    // Trails setup
    const trailPositions = [];
    const maxTrail = 100;
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.8 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    // State
    let isAdversarial = false;
    let advTimer = 0;
    let speed = 1;
    let frame = 0;
    let dualTrailMode = false;
    
    // UI elements
    const statV = document.getElementById('stat-v');
    const statEg = document.getElementById('stat-eg');
    const statEta = document.getElementById('stat-eta');
    const statGim = document.getElementById('stat-gim');
    const statGimRow = statGim.closest('.stat-gim-row');
    const canvasWrap = document.getElementById('sims-stiefel-wrap');

    // Controls listeners
    document.getElementById('btn-noise').addEventListener('click', () => {
      isAdversarial = true;
      advTimer = 0;
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      isAdversarial = false;
      advTimer = 0;
      wt1.set(0.5, 0.5, 0.7).normalize();
      wt2.set(0.7, -0.5, 0.5).normalize();
      trailPositions.length = 0;
      statGim.innerText = 'STABLE';
      statGimRow.classList.remove('gim-fail');
      canvasWrap.style.boxShadow = '';
    });

    document.querySelectorAll('.sims-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sims-speed-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        speed = parseInt(e.target.dataset.speed);
      });
    });

    document.getElementById('toggle-dual-trail').addEventListener('change', (e) => {
      dualTrailMode = e.target.checked;
    });

    function animate() {
      requestAnimationFrame(animate);
      frame++;

      for(let s=0; s<speed; s++) {
        let eta_eff = 0.15;
        let vError = wt1.distanceTo(wStar1) + wt2.distanceTo(wStar2);

        if (isAdversarial) {
          advTimer++;
          eta_eff = 0.02; // collapse
          // Perturb randomly
          wt1.add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1)).normalize();
          wt2.add(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1)).normalize();
          
          if (advTimer > 60) { // GIM Trigger after 1 sec (at 60fps)
            statGim.innerText = 'FAIL (ROLLBACK)';
            statGimRow.classList.add('gim-fail');
            canvasWrap.style.boxShadow = 'inset 0 0 0 3px var(--rollback-red)';
            
            // Snap back
            wt1.set(0.0, 1.0, 0.1).normalize();
            wt2.set(1.0, 0.0, 0.1).normalize();
            isAdversarial = false;
            
            setTimeout(() => {
              statGim.innerText = 'STABLE (RECOVERED)';
              statGimRow.classList.remove('gim-fail');
              canvasWrap.style.boxShadow = '';
            }, 1000);
          }
        } else {
          // Normal convergence
          wt1.lerp(wStar1, eta_eff * 0.03).normalize();
          wt2.lerp(wStar2, eta_eff * 0.03).normalize();
        }

        arrowWt1.setDirection(wt1);
        arrowWt2.setDirection(wt2);

        // Update trail
        trailPositions.push(wt1.x, wt1.y, wt1.z);
        if (trailPositions.length > maxTrail * 3) {
          trailPositions.splice(0, 3);
        }
        trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));

        // Update stats UI
        if (frame % 10 === 0) {
          statV.innerText = vError.toFixed(3);
          statEg.innerText = isAdversarial ? Math.max(0.05, 2.84 - (advTimer*0.05)).toFixed(2) : '2.84';
          statEta.innerText = eta_eff.toFixed(3);
        }
      }

      if (controls) controls.update();
      else {
        // Manual rotation fallback if OrbitControls not loaded
        scene.rotation.y += 0.005 * speed;
      }

      renderer.render(scene, camera);
    }
    
    animate();

    // Touch-action: none so OrbitControls can handle touch gestures
    renderer.domElement.style.touchAction = 'none';

    // ResizeObserver: reliable resize on mobile/orientation-change
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 300;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);
  }

  // ── PANEL B: Banach D3 Animation ──
  function initBanach() {
    if (typeof d3 === 'undefined') return;
    
    const svgDiv = document.getElementById('sims-banach-svg');
    const width = svgDiv.clientWidth;
    const height = svgDiv.clientHeight;
    
    const svg = d3.select('#sims-banach-svg').append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);
      
    // Box
    svg.append('rect')
      .attr('x', 20).attr('y', 20)
      .attr('width', width-40).attr('height', height-40)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.1)');

    // Attractor star
    let attractorX = width/2;
    let attractorY = height/2;
    
    const star = svg.append('polygon')
      .attr('points', '0,-5 1,-1 5,-1 2,1 3,5 0,3 -3,5 -2,1 -5,-1 -1,-1')
      .attr('fill', '#e8c547')
      .attr('transform', `translate(${attractorX}, ${attractorY}) scale(1.5)`);

    // Particles
    const colors = ['#00c8ff', '#7f5af0', '#0af5a0', '#ff3864', '#ffffff'];
    let particlesData = Array.from({length: 5}, (_, i) => ({
      id: i,
      x: 30 + Math.random() * (width - 60),
      y: 30 + Math.random() * (height - 60),
      color: colors[i]
    }));

    const particles = svg.selectAll('.particle')
      .data(particlesData)
      .enter().append('circle')
      .attr('class', 'particle')
      .attr('r', 4)
      .attr('fill', d => d.color)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    let isPlaying = false;
    let wt = 0.15;
    let time = 0;
    
    // Line Chart
    const chartDiv = document.getElementById('sims-banach-chart');
    const cWidth = chartDiv.clientWidth;
    const cHeight = chartDiv.clientHeight;
    
    const chartSvg = d3.select('#sims-banach-chart').append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${cWidth} ${cHeight}`);
      
    const margins = {top: 10, right: 10, bottom: 20, left: 30};
    const x = d3.scaleLinear().domain([0, 100]).range([margins.left, cWidth - margins.right]);
    const y = d3.scaleLinear().domain([0, 1]).range([cHeight - margins.bottom, margins.top]);
    
    chartSvg.append('g')
      .attr('transform', `translate(0,${cHeight - margins.bottom})`)
      .call(d3.axisBottom(x).ticks(5));
      
    chartSvg.append('g')
      .attr('transform', `translate(${margins.left},0)`)
      .call(d3.axisLeft(y).ticks(4));

    const pathData = [];
    const pathLine = d3.line()
      .x(d => x(d.t))
      .y(d => y(d.val));
      
    const pathElem = chartSvg.append('path')
      .attr('fill', 'none')
      .attr('stroke', '#00c8ff')
      .attr('stroke-width', 2);

    function reset() {
      isPlaying = false;
      time = 0;
      pathData.length = 0;
      pathElem.attr('d', '');
      
      particlesData.forEach(p => {
        p.x = 30 + Math.random() * (width - 60);
        p.y = 30 + Math.random() * (height - 60);
      });
      particles.attr('cx', d => d.x).attr('cy', d => d.y);
      
      attractorX = width/2;
      attractorY = height/2;
      star.attr('transform', `translate(${attractorX}, ${attractorY}) scale(1.5)`);
    }

    document.getElementById('btn-banach-play').addEventListener('click', () => {
      isPlaying = !isPlaying;
      document.getElementById('btn-banach-play').innerText = isPlaying ? 'PAUSE' : 'PLAY';
    });
    
    document.getElementById('btn-banach-reset').addEventListener('click', reset);
    
    document.getElementById('slider-wt').addEventListener('input', (e) => {
      wt = parseFloat(e.target.value);
      document.getElementById('val-wt').innerText = wt.toFixed(2);
    });

    function step() {
      if (!isPlaying) {
        requestAnimationFrame(step);
        return;
      }

      // Move attractor slowly
      attractorX += (Math.random() - 0.5) * 2;
      attractorY += (Math.random() - 0.5) * 2;
      star.attr('transform', `translate(${attractorX}, ${attractorY}) scale(1.5)`);

      // Move particles towards attractor (contraction)
      let maxDist = 0;
      particlesData.forEach(p => {
        p.x = (1 - wt) * p.x + wt * attractorX;
        p.y = (1 - wt) * p.y + wt * attractorY;
      });
      
      // Calculate max pairwise distance for the chart
      for(let i=0; i<particlesData.length; i++) {
        for(let j=i+1; j<particlesData.length; j++) {
          let dx = particlesData[i].x - particlesData[j].x;
          let dy = particlesData[i].y - particlesData[j].y;
          let dist = Math.sqrt(dx*dx + dy*dy) / width; // normalized
          if(dist > maxDist) maxDist = dist;
        }
      }

      particles.attr('cx', d => d.x).attr('cy', d => d.y);

      // Update chart
      if (time <= 100) {
        pathData.push({t: time, val: maxDist});
        pathElem.attr('d', pathLine(pathData));
      }

      time++;
      
      // Stop condition
      if (maxDist < 0.01 && isPlaying) {
        isPlaying = false;
        document.getElementById('btn-banach-play').innerText = 'PLAY';
        // Confetti effect could go here
      }

      setTimeout(() => { requestAnimationFrame(step); }, 50);
    }
    
    requestAnimationFrame(step);
  }

  // ── PANEL C: D3 Charts ──
  function initCharts() {
    if (typeof d3 === 'undefined') return;

    // Chart 1: Convergence
    function drawConvergence() {
      const container = d3.select('#chart-convergence');
      container.selectAll('*').remove();
      
      const width = container.node().clientWidth;
      const height = container.node().clientHeight;
      const margins = {top: 10, right: 10, bottom: 20, left: 35};
      
      const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);
        
      const x = d3.scaleLinear().domain([0, 1000]).range([margins.left, width - margins.right]);
      const y = d3.scaleLog().domain([0.0001, 10]).range([height - margins.bottom, margins.top]);
      
      svg.append('g').attr('transform', `translate(0,${height - margins.bottom})`).call(d3.axisBottom(x).ticks(5));
      svg.append('g').attr('transform', `translate(${margins.left},0)`).call(d3.axisLeft(y).ticks(4, ".1e"));
      
      // Data gen
      const dataQuicksand = d3.range(0, 1000, 10).map(t => ({x: t, y: Math.max(0.0002, Math.exp(-t/100))}));
      const dataOja = d3.range(0, 1000, 10).map(t => {
        let val = Math.exp(-t/150);
        if(t > 480) val = Math.min(10, val * Math.exp((t-480)/50)); // diverge
        return {x: t, y: Math.max(0.001, val)};
      });
      const dataTheory = d3.range(0, 1000, 10).map(t => ({x: t, y: Math.max(0.0001, 0.5 * Math.exp(-t/100))}));

      const lineGen = d3.line().x(d => x(d.x)).y(d => y(d.y));

      // Streaming PCA — diverges at t=480 (blueprint requirement)
      const dataStreamingPCA = d3.range(0, 1000, 10).map(t => ({
        x: t,
        y: Math.max(0.001, t < 480 ? Math.exp(-t/180) : Math.min(10, Math.exp(-480/180) * Math.exp((t-480)/80)))
      }));

      svg.append('path').datum(dataOja)
        .attr('fill', 'none').attr('stroke', '#6b7280').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 4')
        .attr('d', lineGen);

      svg.append('path').datum(dataStreamingPCA)
        .attr('fill', 'none').attr('stroke', '#7f5af0').attr('stroke-width', 1.5).attr('stroke-dasharray', '2 4')
        .attr('d', lineGen);
        
      svg.append('path').datum(dataTheory)
        .attr('fill', 'none').attr('stroke', '#e8c547').attr('stroke-width', 1)
        .attr('d', lineGen);
        
      svg.append('path').datum(dataQuicksand)
        .attr('fill', 'none').attr('stroke', '#00c8ff').attr('stroke-width', 2)
        .attr('d', lineGen);
        
      // Adversarial injection marker
      svg.append('line')
        .attr('x1', x(480)).attr('y1', margins.top)
        .attr('x2', x(480)).attr('y2', height - margins.bottom)
        .attr('stroke', '#ff3864').attr('stroke-width', 1).attr('stroke-dasharray', '2 2');

      // Annotation: injection label
      svg.append('text')
        .attr('x', x(490)).attr('y', margins.top + 12)
        .attr('fill', '#ff3864').attr('font-size', '9px').attr('font-family', '"IBM Plex Mono", monospace')
        .text('← Adversarial Injection');

      // Annotation: QuicksandOja++ recovers
      svg.append('text')
        .attr('x', x(620)).attr('y', y(0.008))
        .attr('fill', '#00c8ff').attr('font-size', '9px').attr('font-family', '"IBM Plex Mono", monospace')
        .text('Oja++ recovers ↓');

      // Legend
      const legendData = [
        { label: 'QuicksandOja++', color: '#00c8ff', dash: null },
        { label: 'Standard Oja', color: '#6b7280', dash: '4 4' },
        { label: 'Streaming PCA', color: '#7f5af0', dash: '2 4' },
        { label: 'Theory Bound', color: '#e8c547', dash: null },
      ];
      legendData.forEach((d, i) => {
        const lx = margins.left + 4, ly = margins.top + 8 + i * 14;
        svg.append('line').attr('x1', lx).attr('y1', ly).attr('x2', lx + 14).attr('y2', ly)
          .attr('stroke', d.color).attr('stroke-width', 1.5)
          .attr('stroke-dasharray', d.dash || null);
        svg.append('text').attr('x', lx + 18).attr('y', ly + 3)
          .attr('fill', 'rgba(107,114,128,0.8)').attr('font-size', '8px').attr('font-family', '"IBM Plex Mono", monospace')
          .text(d.label);
      });
    }
    
    // Chart 2: FPR
    function drawFPR() {
      const container = d3.select('#chart-fpr');
      container.selectAll('*').remove();
      
      const width = container.node().clientWidth;
      const height = container.node().clientHeight;
      const margins = {top: 10, right: 10, bottom: 20, left: 35};
      
      const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);
        
      const x = d3.scaleLinear().domain([0, 1]).range([margins.left, width - margins.right]);
      const y = d3.scaleLinear().domain([0, 0.1]).range([height - margins.bottom, margins.top]);
      
      svg.append('g').attr('transform', `translate(0,${height - margins.bottom})`).call(d3.axisBottom(x).ticks(4));
      svg.append('g').attr('transform', `translate(${margins.left},0)`).call(d3.axisLeft(y).ticks(4, ".0%"));
      
      // Acceptable region
      svg.append('rect')
        .attr('x', margins.left).attr('y', y(0.02))
        .attr('width', width - margins.left - margins.right).attr('height', y(0) - y(0.02))
        .attr('fill', 'rgba(10,245,160,0.1)');
        
      const dataGIM = d3.range(0, 1.05, 0.05).map(s => ({x: s, y: s < 0.8 ? 0.005 : 0.005 + (s-0.8)*0.02}));
      const dataNaive = d3.range(0, 1.05, 0.05).map(s => ({x: s, y: s * 0.08}));
      
      const lineGen = d3.line().x(d => x(d.x)).y(d => y(d.y));
      
      svg.append('path').datum(dataNaive)
        .attr('fill', 'none').attr('stroke', '#ff3864').attr('stroke-width', 1.5)
        .attr('d', lineGen);
        
      svg.append('path').datum(dataGIM)
        .attr('fill', 'none').attr('stroke', '#00c8ff').attr('stroke-width', 2)
        .attr('d', lineGen);
    }
    
    // Chart 3: Scatter
    function drawScatter() {
      const container = d3.select('#chart-scatter');
      container.selectAll('*').remove();
      
      const width = container.node().clientWidth;
      const height = container.node().clientHeight;
      const margins = {top: 10, right: 10, bottom: 20, left: 35};
      
      const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);
        
      const x = d3.scaleLinear().domain([0, 3]).range([margins.left, width - margins.right]);
      const y = d3.scaleLinear().domain([0, 1]).range([height - margins.bottom, margins.top]);
      
      svg.append('g').attr('transform', `translate(0,${height - margins.bottom})`).call(d3.axisBottom(x).ticks(4));
      svg.append('g').attr('transform', `translate(${margins.left},0)`).call(d3.axisLeft(y).ticks(4, ".0%"));
      
      const points = [];
      for(let i=0; i<150; i++) {
        let gap = Math.random() * 3;
        // correlated accuracy
        let acc = 0.3 + (gap / 3) * 0.6 + (Math.random()-0.5)*0.2;
        acc = Math.max(0, Math.min(1, acc));
        points.push({x: gap, y: acc});
      }
      
      svg.selectAll('circle')
        .data(points)
        .enter().append('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 2)
        .attr('fill', 'rgba(127,90,240,0.6)');
        
      // Regression line approx
      svg.append('line')
        .attr('x1', x(0)).attr('y1', y(0.3))
        .attr('x2', x(3)).attr('y2', y(0.9))
        .attr('stroke', '#00c8ff').attr('stroke-width', 2);

      // 95% CI band (blueprint requirement)
      const ciArea = d3.area()
        .x(d => x(d))
        .y0(d => y(0.3 + (d/3)*0.6 - 0.07))
        .y1(d => y(0.3 + (d/3)*0.6 + 0.07));
      const ciDomain = d3.range(0, 3.1, 0.1);
      svg.append('path').datum(ciDomain)
        .attr('fill', 'rgba(0,200,255,0.08)')
        .attr('d', ciArea);

      // r² = 0.73 annotation (blueprint: key empirical validation)
      svg.append('text')
        .attr('x', x(1.6)).attr('y', y(0.18))
        .attr('fill', '#e8c547')
        .attr('font-size', '10px')
        .attr('font-family', '"IBM Plex Mono", monospace')
        .text('r² = 0.73, p < 0.001');
    }
    
    // Delay drawing slightly to ensure containers have dimensions
    setTimeout(() => {
      drawConvergence();
      drawFPR();
      drawScatter();
    }, 100);
    
    window.addEventListener('resize', () => {
      drawConvergence();
      drawFPR();
      drawScatter();
    });
  }

  // ── Panel D: Load actual SVG simulation outputs ──
  async function initSVGOutputs() {
    const plotEls = document.querySelectorAll('.sims-svg-output[data-svg]');
    if (!plotEls.length) return;

    for (const el of plotEls) {
      const src = el.dataset.svg;
      el.innerHTML = '<span style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px;padding:8px;">Loading…</span>';
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
          throw new Error('No SVG found');
        }
      } catch (err) {
        el.innerHTML = `<span style="color:var(--rollback-red);font-family:var(--font-mono);font-size:10px;padding:8px;">[SVG unavailable]</span>`;
      }
    }
  }

  /* ── Inspector Modal & Pyodide ──────────────────────────────────── */
  let pyodideInstance = null;
  let pyodideIsLoading = false;

  async function loadPyodideRuntime() {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideIsLoading) return new Promise(resolve => setTimeout(() => loadPyodideRuntime().then(resolve), 500));
    
    pyodideIsLoading = true;
    const terminalOutput = document.getElementById('sims-pyodide-output');
    terminalOutput.textContent += 'Initializing Pyodide WASM runtime... (this may take a moment)\n';
    
    try {
      pyodideInstance = await loadPyodide({
        stdout: (text) => {
          if (terminalOutput) {
            terminalOutput.textContent += text + '\n';
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
          }
        },
        stderr: (text) => {
          if (terminalOutput) {
            terminalOutput.textContent += 'ERROR: ' + text + '\n';
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
          }
        }
      });
      terminalOutput.textContent += 'Pyodide loaded. Installing packages: numpy, matplotlib...\n';
      await pyodideInstance.loadPackage(['numpy', 'matplotlib']);
      terminalOutput.textContent += 'Environment ready.\n\n';
      pyodideIsLoading = false;
      return pyodideInstance;
    } catch (err) {
      terminalOutput.textContent += '\nFailed to load Pyodide: ' + err.message;
      pyodideIsLoading = false;
      throw err;
    }
  }

  function initInspector() {
    const modal = document.getElementById('sims-inspector-modal');
    const closeBtn = document.getElementById('sims-modal-close');
    const codeViewer = document.getElementById('sims-modal-code');
    const filenameLabel = document.getElementById('sims-modal-filename');
    const sidebarLinks = document.querySelectorAll('.sims-sidebar-link');
    const runBtn = document.getElementById('sims-btn-run-py');
    const terminalWrap = document.getElementById('sims-pyodide-terminal');
    const terminalOutput = document.getElementById('sims-pyodide-output');
    const plotWrap = document.getElementById('sims-pyodide-plot');
    
    let currentCode = '';
    
    if (!modal) return;

    function openModal(filePath) {
      modal.classList.remove('sims-hidden');
      terminalWrap.classList.add('sims-hidden');
      terminalOutput.textContent = '';
      plotWrap.innerHTML = '';
      loadFile(filePath);
    }

    function closeModal() {
      modal.classList.add('sims-hidden');
    }

    async function loadFile(filePath) {
      filenameLabel.textContent = filePath;
      codeViewer.textContent = 'Loading...';
      codeViewer.style.color = '#a9b7c6';
      currentCode = '';
      
      // Update active state in sidebar
      sidebarLinks.forEach(l => l.classList.remove('active'));
      const activeLink = Array.from(sidebarLinks).find(l => l.dataset.path === filePath);
      if (activeLink) activeLink.classList.add('active');

      if (filePath.endsWith('.py')) {
        runBtn.classList.remove('sims-hidden');
      } else {
        runBtn.classList.add('sims-hidden');
      }

      try {
        const resp = await fetch('assets/simulations/' + filePath);
        if (!resp.ok) throw new Error(resp.statusText);
        const text = await resp.text();
        currentCode = text;
        codeViewer.textContent = text;
        
        // Basic naive syntax coloring based on extension
        if (filePath.endsWith('.py')) codeViewer.style.color = '#a9b7c6'; // Python
        else if (filePath.endsWith('.cir')) codeViewer.style.color = '#cc7832'; // SPICE
        else if (filePath.endsWith('.log')) codeViewer.style.color = '#6a8759'; // Logs
        
      } catch (err) {
        codeViewer.textContent = 'Error loading file: ' + err.message + '\n\nMake sure the file exists in assets/simulations/' + filePath;
        codeViewer.style.color = 'var(--rollback-red)';
      }
    }

    runBtn.addEventListener('click', async () => {
      terminalWrap.classList.remove('sims-hidden');
      terminalOutput.textContent = '> Running simulation...\n';
      plotWrap.innerHTML = '';
      
      try {
        const py = await loadPyodideRuntime();
        
        // We override matplotlib show() and savefig() to render to DOM
        const pycode = `
import io, base64
import matplotlib.pyplot as plt
from js import document

def custom_show(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode('utf-8')
    img_data = f"data:image/png;base64,{img_b64}"
    
    # Send to JS wrapper
    img_el = document.createElement('img')
    img_el.src = img_data
    img_el.style.maxWidth = '100%'
    document.getElementById('sims-pyodide-plot').appendChild(img_el)
    plt.clf()

plt.show = custom_show
plt.savefig = custom_show

# Execute user script
${currentCode.split('\\n').join('\\n')}
`;
        
        await py.runPythonAsync(pycode);
        terminalOutput.textContent += '\n> Execution finished.\n';
      } catch(err) {
        terminalOutput.textContent += '\nRuntime Error:\n' + err;
      }
    });

    closeBtn.addEventListener('click', closeModal);

    // Main header button
    const mainBtn = document.getElementById('sims-btn-main-inspect');
    if(mainBtn) {
      mainBtn.addEventListener('click', () => {
        openModal('python/ch3_oja_convergence/ch3_oja_convergence.py');
      });
    }


    
    // Close on overlay click
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    // Inspect buttons
    document.querySelectorAll('.sims-inspect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.file;
        if (path) openModal(path);
      });
    });

    // Sidebar links
    sidebarLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        openModal(link.dataset.path);
      });
    });
  }

  // ── Init ──
  function init(){ 
    renderEquations(); 
    initStiefel(); 
    initBanach(); 
    initCharts();
    initSVGOutputs();
    initInspector();
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
