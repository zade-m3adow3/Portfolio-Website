(function () {
  "use strict";

  function initHero() {
    const tl_s1 = gsap.timeline();

    // 1. Three.js Particle Field
    const canvasContainer = document.getElementById('hero-canvas');
    const scene = new THREE.Scene();
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 200;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.appendChild(renderer.domElement);

    // Particle geometry
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color('#00c8ff'); // spectral-1
    const color2 = new THREE.Color('#7f5af0'); // spectral-2

    for(let i = 0; i < particleCount; i++) {
        // Distribute particles in a volume
        positions[i*3] = (Math.random() - 0.5) * 400;
        positions[i*3+1] = (Math.random() - 0.5) * 400;
        positions[i*3+2] = (Math.random() - 0.5) * 200;
        
        // Interpolate colors
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i*3] = mixedColor.r;
        colors[i*3+1] = mixedColor.g;
        colors[i*3+2] = mixedColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Mouse parallax variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2);
        mouseY = (e.clientY - window.innerHeight / 2);
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const animateParticles = () => {
        requestAnimationFrame(animateParticles);
        
        // Drift
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;
        
        // Parallax easing
        targetX = mouseX * 0.05;
        targetY = mouseY * 0.05;
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (-targetY - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    };
    animateParticles();

    // 2. GSAP Animations on tl_s1
    // Setup character spans for heading
    const headings = document.querySelectorAll('.hero-heading .char-wrap');
    headings.forEach(h => {
        const text = h.textContent.trim();
        h.innerHTML = '';
        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.opacity = '0';
            span.style.display = 'inline-block';
            span.style.transform = 'translateY(30px)';
            h.appendChild(span);
        });
    });

    // Animate elements according to prompt timings
    tl_s1.to('.hero-label', { opacity: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 0.2)
         .to('.hero-heading span', { opacity: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 0.4)
         .to('.hero-subtitle', { opacity: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 0.9)
         .to('.hero-divider', { scaleX: 1, duration: 0.8, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 0.9)
         .to('.hero-tag', { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 1.1)
         .to('.hero-mission', { opacity: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 1.3)
         .to('.hero-cta', { opacity: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 1.5)
         .to('.scroll-indicator', { opacity: 1, duration: 0.6, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }, 1.5);

    // 3. Animated GIM Terminal Box
    const terminalLines = [
        "SYSTEM INIT: PMM v4.3",
        "GIM STATUS: [████████] NOMINAL",
        "I_neural:   TRUE  ✓",
        "I_spectral: TRUE  ✓",
        "I_symbolic: TRUE  ✓",
        "I_ethical:  TRUE  ✓",
        "eigengap δ_k: 2.847 (STABLE)",
        "DASM snapshot: COMMITTED",
        "APU-X substrate: ONLINE",
        "",
        "\"Trajectory stable. All predicates pass.\"",
        "AUTONOMOUS EXECUTION: ENABLED"
    ];
    
    const terminalBox = document.getElementById('hero-terminal');
    let lineIdx = 0;
    let charIdx = 0;
    let lastTime = 0;
    let started = false;

    // Start typing at 0.8s
    setTimeout(() => { 
        started = true; 
        requestAnimationFrame(typeTerminal); 
    }, 800);

    function typeTerminal(time) {
        if (!started) return;
        if (time - lastTime > 30) {
            lastTime = time;
            
            if (lineIdx < terminalLines.length) {
                if (charIdx === 0) {
                    const row = document.createElement('div');
                    row.className = 'term-line';
                    row.id = `term-line-${lineIdx}`;
                    
                    if (terminalLines[lineIdx].trim() !== "") {
                        const prefix = document.createElement('span');
                        prefix.className = 'term-prefix';
                        prefix.textContent = '> ';
                        row.appendChild(prefix);
                    }
                    
                    const content = document.createElement('span');
                    content.className = 'term-content';
                    row.appendChild(content);
                    
                    // Add blinking cursor to current line
                    const cursor = document.createElement('span');
                    cursor.className = 'term-cursor';
                    cursor.id = 'active-cursor';
                    row.appendChild(cursor);
                    
                    terminalBox.appendChild(row);
                }
                
                const contentSpan = document.getElementById(`term-line-${lineIdx}`).querySelector('.term-content');
                
                if (charIdx < terminalLines[lineIdx].length) {
                    contentSpan.textContent += terminalLines[lineIdx][charIdx];
                    charIdx++;
                } else {
                    // Remove cursor from this line
                    const activeCursor = document.getElementById('active-cursor');
                    if (activeCursor) activeCursor.remove();
                    
                    lineIdx++;
                    charIdx = 0;
                }
            } else {
                // Done typing, add final blinking cursor
                const finalRow = document.createElement('div');
                finalRow.className = 'term-line';
                finalRow.innerHTML = '<span class="term-prefix">> </span><span class="term-cursor"></span>';
                terminalBox.appendChild(finalRow);
                
                startMicroRollbacks();
                return; // Stop RAF loop
            }
        }
        requestAnimationFrame(typeTerminal);
    }

    function startMicroRollbacks() {
        const predicates = [2, 3, 4, 5]; // line indices of I_*
        setInterval(() => {
            const randomLine = predicates[Math.floor(Math.random() * predicates.length)];
            const lineEl = document.getElementById(`term-line-${randomLine}`);
            if(lineEl) {
                const contentSpan = lineEl.querySelector('.term-content');
                if (contentSpan) {
                    const origText = contentSpan.textContent;
                    contentSpan.innerHTML = origText.replace('TRUE  ✓', '<span style="color:var(--rollback-red)">FALSE ✗</span>');
                    setTimeout(() => {
                        contentSpan.textContent = origText;
                    }, 200);
                }
            }
        }, 8000);
    }
  } // <-- Added closing brace for initHero

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initHero);
    } else {
      // Small timeout to ensure GSAP is ready if dynamically loaded
      setTimeout(initHero, 100);
    }
})();
