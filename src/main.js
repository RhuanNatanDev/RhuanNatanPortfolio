import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import * as THREE from 'three';
import { initI18n, scrambleText } from './i18n/i18n.js';

gsap.registerPlugin(ScrollTrigger);

// ===== LOADING SCREEN =====
const loader = document.getElementById('loader');
const loaderText = document.querySelector('.loader-text');
const loaderProgress = document.querySelector('.loader-progress');
let loadCount = 0;

const loadInterval = setInterval(() => {
  loadCount += Math.floor(Math.random() * 15) + 5;
  if (loadCount >= 100) {
    loadCount = 100;
    clearInterval(loadInterval);
    
    loaderText.innerText = "SYSTEM.READY()"; // More software engineer theme
    
    setTimeout(() => {
      const exitTl = gsap.timeline({
        onComplete: () => {
          loader.style.display = 'none';
          heroTl.play();
          // Scramble hero text on initial load, delayed so it happens *while* they fade in
          document.querySelectorAll('.hero-word').forEach((word, index) => {
            setTimeout(() => {
              scrambleText(word, null, 1500);
            }, index * 200 + 400); // Stagger matches the gsap stagger
          });
        }
      });
      
      exitTl
        .to('.loader-content', { opacity: 0, duration: 0.3 })
        .to('.loader-panel-left', { xPercent: -100, duration: 1.2, ease: 'power4.inOut' }, 0.2)
        .to('.loader-panel-right', { xPercent: 100, duration: 1.2, ease: 'power4.inOut' }, 0.2);
    }, 500);
  }
  
  loaderProgress.innerText = loadCount < 10 ? `0${loadCount}%` : `${loadCount}%`;
  
  if (loadCount < 100) {
    loaderText.innerText = "INITIALIZING SYSTEM";
  }
}, 100);

// ===== I18N INITIALIZATION =====
initI18n();

// ===== SMOOTH SCROLLING =====
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Sync Lenis with GSAP ScrollTrigger
lenis.on('scroll', (e) => {
  ScrollTrigger.update();
  
  // Velocity-based skew effect
  const velocity = e.velocity;
  const skew = velocity * 0.05;
  
  gsap.to('.about-main, .work-card', {
    skewY: skew,
    duration: 0.5,
    ease: 'power3.out',
    overwrite: true
  });
});

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ===== THREE.JS WEBGL BACKGROUND =====

// Vertex Shader — creates a full-screen quad and passes UVs to the fragment shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Fragment Shader — the "brain" that creates the visual effect on the GPU
const fragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uScrollVelocity;
  uniform float uTheme;
  
  varying vec2 vUv;
  
  // Simplex noise function for organic movement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
      + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // Grid line function
  float gridLine(float coord, float thickness) {
    float line = abs(fract(coord) - 0.5);
    return smoothstep(thickness, thickness + 0.002, line);
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 st = uv * aspect;
    
    // Mouse influence — creates a "gravity well" effect around cursor
    vec2 mouseNorm = uMouse;
    mouseNorm.y = 1.0 - mouseNorm.y; // flip Y for shader coords
    vec2 mouseAspect = mouseNorm * aspect;
    float mouseDist = distance(st, mouseAspect);
    float mouseInfluence = smoothstep(0.6, 0.0, mouseDist);
    
    // Noise-based distortion field
    float t = uTime * 0.3;
    float n1 = snoise(st * 2.0 + t * 0.5) * 0.04;
    float n2 = snoise(st * 4.0 - t * 0.3) * 0.02;
    float n3 = snoise(st * 1.5 + vec2(t * 0.2, -t * 0.1)) * 0.06;
    
    // Combine noise with mouse for distortion
    vec2 distortion = vec2(n1 + n2, n3 + n2) * (1.0 + mouseInfluence * 3.0);
    
    // Add scroll velocity ripple
    float scrollEffect = abs(uScrollVelocity) * 0.0003;
    distortion.y += sin(uv.x * 20.0 + uTime * 2.0) * scrollEffect;
    
    vec2 distortedUv = uv + distortion;
    
    // Create the grid with distortion
    float gridDensityH = 50.0;
    float gridDensityV = 30.0;
    
    float hLine = gridLine(distortedUv.y * gridDensityH, 0.48);
    float vLine = gridLine(distortedUv.x * gridDensityV, 0.48);
    
    float grid = min(hLine, vLine);
    
    // Glow around mouse position
    float glow = mouseInfluence * 0.15;
    
    // Radial gradient from center
    float centerDist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.0, 1.2, centerDist);
    
    // Base colors — navy blue palette (dark mode) vs light palette (light mode)
    vec3 darkBg = vec3(0.059, 0.153, 0.267);      // #0f2744
    vec3 darkLine = vec3(0.290, 0.620, 0.929);     // #4a9eed
    
    vec3 lightBg = vec3(0.972, 0.984, 0.996);     // #f8fafc
    vec3 lightLine = vec3(0.145, 0.388, 0.922);    // #2563eb
    
    vec3 bgColor = mix(darkBg, lightBg, uTheme);
    vec3 lineColor = mix(darkLine, lightLine, uTheme);
    vec3 glowColor = lineColor;
    
    // Compose final color
    float lineAlpha = (1.0 - grid) * (0.08 + mouseInfluence * 0.15);
    
    // Subtle animated pulse on grid brightness
    float pulse = sin(uTime * 0.5) * 0.02 + 0.02;
    lineAlpha += pulse * (1.0 - grid);
    
    vec3 color = bgColor;
    color = mix(color, lineColor, lineAlpha);
    color += glowColor * glow;
    
    // Slight vignette darkening
    color *= 1.0 - vignette * 0.3;
    
    // Subtle chromatic aberration near mouse
    float chromaStrength = mouseInfluence * 0.003;
    vec2 chromaOffset = normalize(st - mouseAspect + 0.001) * chromaStrength;
    float redShift = snoise((distortedUv + chromaOffset) * 30.0);
    float blueShift = snoise((distortedUv - chromaOffset) * 30.0);
    color.r += redShift * 0.008 * mouseInfluence;
    color.b += blueShift * 0.008 * mouseInfluence;
    
    // Film grain
    float grain = fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.015;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Three.js setup
const canvas = document.getElementById('wave-canvas');
const renderer = new THREE.WebGLRenderer({ 
  canvas, 
  antialias: true,
  alpha: false 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Uniforms — data we send to the GPU every frame
const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uScrollVelocity: { value: 0 },
  uTheme: { value: 0.0 }
};

// Create full-screen shader mesh
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Mouse tracking with smooth lerp
let targetMouse = { x: 0.5, y: 0.5 };
let currentMouse = { x: 0.5, y: 0.5 };
let scrollVelocity = 0;

document.addEventListener('mousemove', (e) => {
  targetMouse.x = e.clientX / window.innerWidth;
  targetMouse.y = e.clientY / window.innerHeight;
});

// Track scroll velocity for shader
lenis.on('scroll', (e) => {
  scrollVelocity = e.velocity;
});

// Resize handler
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();

function renderWebGL() {
  const elapsed = clock.getElapsedTime();
  
  // Smooth mouse interpolation (lerp)
  currentMouse.x += (targetMouse.x - currentMouse.x) * 0.05;
  currentMouse.y += (targetMouse.y - currentMouse.y) * 0.05;
  
  // Decay scroll velocity
  scrollVelocity *= 0.95;
  
  // Update uniforms
  uniforms.uTime.value = elapsed;
  uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
  uniforms.uScrollVelocity.value = scrollVelocity;
  
  renderer.render(scene, camera);
  requestAnimationFrame(renderWebGL);
}
requestAnimationFrame(renderWebGL);

// ===== CUSTOM CURSOR =====
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursor-follower');
let posX = 0, posY = 0;
let mouseX = 0, mouseY = 0;

gsap.to({}, 0.016, {
  repeat: -1,
  onRepeat: function() {
    posX += (mouseX - posX) / 9;
    posY += (mouseY - posY) / 9;
    
    gsap.set(follower, { css: { left: posX, top: posY } });
    gsap.set(cursor, { css: { left: mouseX, top: mouseY } });
  }
});

document.addEventListener('mousemove', function(e) {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Cursor Hover
const hoverEls = document.querySelectorAll('a, button, [data-magnetic]');
hoverEls.forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.classList.add('hovered');
    follower.classList.add('hovered');
  });
  el.addEventListener('mouseleave', () => {
    cursor.classList.remove('hovered');
    follower.classList.remove('hovered');
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
  });

  // Magnetic effect
  if (el.hasAttribute('data-magnetic')) {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * 0.35,
        y: y * 0.35,
        duration: 0.4,
        ease: 'power2.out'
      });
    });
  }
});

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

function updateTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    gsap.to(uniforms.uTheme, { value: 1.0, duration: 1 });
  } else {
    document.body.classList.remove('light-mode');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
    gsap.to(uniforms.uTheme, { value: 0.0, duration: 1 });
  }
}

// ALWAYS default to dark mode on page load as requested
updateTheme(false);

themeToggle.addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light-mode');
  updateTheme(isLight);
});

// Nav Link Scramble Animation
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (targetId && targetId !== '#') {
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        const label = targetSection.querySelector('.section-label span') || targetSection.querySelector('h3');
        if (label) scrambleText(label, null, 1000);
      }
    }
  });
});

// ===== HERO ENTRY ANIMATION =====
const heroTl = gsap.timeline();

gsap.set('.hero-word', { y: '110%', opacity: 0, rotationZ: 3 });
gsap.set('.hero-star', { scale: 0, opacity: 0 });
gsap.set('.hero-binary-strip', { opacity: 0 });
gsap.set('.nav', { y: -60, opacity: 0 });

heroTl.pause(); // Pause initially for loader

heroTl
  .to('.hero-word', {
    y: '0%',
    opacity: 1,
    rotationZ: 0,
    duration: 1.4,
    stagger: 0.15,
    ease: 'power4.out',
    delay: 0.3
  })
  .to('.hero-star', {
    scale: 1,
    opacity: 1,
    duration: 0.8,
    ease: 'back.out(2)'
  }, '-=0.8')
  .to('.hero-binary-strip', {
    opacity: 1,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power2.out'
  }, '-=0.6')
  .to('.nav', {
    y: 0,
    opacity: 1,
    duration: 1.2,
    ease: 'power3.out'
  }, '-=1');

// ===== SCROLL ANIMATIONS =====

// About section
gsap.from('.about-main', {
  scrollTrigger: {
    trigger: '.about-content',
    start: 'top 80%',
  },
  y: 60,
  opacity: 0,
  duration: 1.2,
  ease: 'power4.out'
});

gsap.from('.about-secondary', {
  scrollTrigger: {
    trigger: '.about-secondary',
    start: 'top 85%',
  },
  y: 40,
  opacity: 0,
  duration: 1.2,
  ease: 'power3.out'
});

// Skill cards stagger
gsap.utils.toArray('.skill-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: '.skills-grid',
      start: 'top 85%',
    },
    y: 40,
    opacity: 0,
    duration: 0.8,
    delay: i * 0.08,
    ease: 'power3.out'
  });
});

// Work section bg text parallax
gsap.to('.work-bg-text', {
  scrollTrigger: {
    trigger: '.work',
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1,
  },
  y: -100,
});

// Work cards entrance
gsap.utils.toArray('.work-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: card,
      start: 'top 90%',
    },
    y: 100,
    opacity: 0,
    rotation: i % 2 === 0 ? -3 : 3,
    duration: 1,
    ease: 'power4.out'
  });
});

// Contact email
gsap.from('.contact-email', {
  scrollTrigger: {
    trigger: '.contact',
    start: 'top 70%',
  },
  y: 80,
  opacity: 0,
  duration: 1.2,
  ease: 'power4.out'
});

// Section labels
gsap.utils.toArray('.section-label').forEach(label => {
  gsap.from(label, {
    scrollTrigger: {
      trigger: label,
      start: 'top 90%',
    },
    scaleX: 0,
    transformOrigin: 'left center',
    duration: 0.8,
    ease: 'power3.out'
  });
});

// ===== BINARY STRIP DUPLICATE FOR INFINITE SCROLL =====
document.querySelectorAll('.binary-text').forEach(el => {
  el.innerHTML = el.innerHTML + '&nbsp;&nbsp;&nbsp;&nbsp;' + el.innerHTML;
});

// ===== PARTICLES NETWORK (LINES CONNECTED TO MOUSE) =====
const pCanvas = document.createElement('canvas');
pCanvas.id = 'particles-canvas';
pCanvas.style.position = 'absolute';
pCanvas.style.top = '0';
pCanvas.style.left = '0';
pCanvas.style.width = '100%';
pCanvas.style.height = '100%';
pCanvas.style.zIndex = '4'; // Between wave-canvas and the text
pCanvas.style.pointerEvents = 'none';
document.querySelector('#hero').appendChild(pCanvas);
const pCtx = pCanvas.getContext('2d');

let particles = [];
const particleCount = window.innerWidth < 768 ? 40 : 100;

function resizeParticles() {
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeParticles);
resizeParticles();

function getParticleColor(alpha) {
  return document.body.classList.contains('light-mode') 
    ? `rgba(37, 99, 235, ${alpha})`
    : `rgba(74, 158, 237, ${alpha})`;
}

class Particle {
  constructor() {
    this.x = Math.random() * pCanvas.width;
    this.y = Math.random() * pCanvas.height;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.radius = Math.random() * 1.5 + 0.5;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > pCanvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > pCanvas.height) this.vy *= -1;
  }
  draw() {
    pCtx.beginPath();
    pCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    pCtx.fillStyle = getParticleColor(0.6);
    pCtx.fill();
  }
}

for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle());
}

function animateParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  
  particles.forEach((p, index) => {
    p.update();
    p.draw();
    
    // Connect particles to each other
    for (let j = index + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx = p.x - p2.x;
      const dy = p.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 150) {
        pCtx.beginPath();
        pCtx.strokeStyle = getParticleColor(0.15 - dist/150 * 0.15);
        pCtx.lineWidth = 0.8;
        pCtx.moveTo(p.x, p.y);
        pCtx.lineTo(p2.x, p2.y);
        pCtx.stroke();
      }
    }
    
    // Connect particles to mouse
    const dxMouse = p.x - mouseX;
    const dyMouse = p.y - mouseY; 
    const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
    
    if (distMouse < 250) {
      pCtx.beginPath();
      pCtx.strokeStyle = getParticleColor(0.5 - distMouse/250 * 0.5);
      pCtx.lineWidth = 1.2;
      pCtx.moveTo(p.x, p.y);
      pCtx.lineTo(mouseX, mouseY);
      pCtx.stroke();
      
      // Magnetic pull slightly to mouse
      if (distMouse < 150) {
        p.x -= dxMouse * 0.015;
        p.y -= dyMouse * 0.015;
      }
    }
  });
  
  requestAnimationFrame(animateParticles);
}
animateParticles();
