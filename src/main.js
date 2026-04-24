import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import * as THREE from 'three';
import { initI18n, scrambleText } from './i18n/i18n.js';
import { init3DWorld, updateState, updateThemeColor } from './three-world.js';

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
    loaderText.innerText = "SYSTEM.READY()";
    setTimeout(() => {
      const exitTl = gsap.timeline({
        onComplete: () => {
          loader.style.display = 'none';
          heroTl.play();
        }
      });
      exitTl
        .to('.loader-content', { opacity: 0, duration: 0.3 })
        .to('.loader-panel-left', { xPercent: -100, duration: 1.2, ease: 'power4.inOut' }, 0.2)
        .to('.loader-panel-right', { xPercent: 100, duration: 1.2, ease: 'power4.inOut' }, 0.2);
    }, 500);
  }
  loaderProgress.innerText = loadCount < 10 ? `0${loadCount}%` : `${loadCount}%`;
  if (loadCount < 100) loaderText.innerText = "INITIALIZING SYSTEM";
}, 100);

// ===== I18N =====
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

function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

lenis.on('scroll', (e) => {
  ScrollTrigger.update();
  updateState('scrollY', e.animatedScroll);
  updateState('velocity', e.velocity);
  const velocity = e.velocity;
  gsap.to('.about-main, .work-card', {
    skewY: velocity * 0.05, duration: 0.5, ease: 'power3.out', overwrite: true
  });
});

gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

// ===== THREE.JS BACKGROUND SHADER =====
const vertexShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse;
  uniform float uScrollVelocity; uniform float uTheme;
  varying vec2 vUv;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1;
    i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;
    vec3 ox=floor(x+0.5);vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
  float gridLine(float coord,float thickness){float l=abs(fract(coord)-0.5);return smoothstep(thickness,thickness+0.002,l);}
  void main(){
    vec2 uv=vUv;vec2 aspect=vec2(uResolution.x/uResolution.y,1.0);vec2 st=uv*aspect;
    vec2 mouseNorm=uMouse;mouseNorm.y=1.0-mouseNorm.y;
    vec2 mouseAspect=mouseNorm*aspect;float mouseDist=distance(st,mouseAspect);
    float mouseInfluence=smoothstep(0.6,0.0,mouseDist);
    float t=uTime*0.3;
    float n1=snoise(st*2.0+t*0.5)*0.04;float n2=snoise(st*4.0-t*0.3)*0.02;
    float n3=snoise(st*1.5+vec2(t*0.2,-t*0.1))*0.06;
    vec2 distortion=vec2(n1+n2,n3+n2)*(1.0+mouseInfluence*3.0);
    float scrollEffect=abs(uScrollVelocity)*0.0003;
    distortion.y+=sin(uv.x*20.0+uTime*2.0)*scrollEffect;
    vec2 distortedUv=uv+distortion;
    float hLine=gridLine(distortedUv.y*50.0,0.48);float vLine=gridLine(distortedUv.x*30.0,0.48);
    float grid=min(hLine,vLine);float glow=mouseInfluence*0.15;
    float centerDist=distance(uv,vec2(0.5));float vignette=smoothstep(0.0,1.2,centerDist);
    vec3 darkBg=vec3(0.059,0.153,0.267);vec3 darkLine=vec3(0.290,0.620,0.929);
    vec3 lightBg=vec3(0.972,0.984,0.996);vec3 lightLine=vec3(0.145,0.388,0.922);
    vec3 bgColor=mix(darkBg,lightBg,uTheme);vec3 lineColor=mix(darkLine,lightLine,uTheme);
    float lineAlpha=(1.0-grid)*(0.08+mouseInfluence*0.15);
    float pulse=sin(uTime*0.5)*0.02+0.02;lineAlpha+=pulse*(1.0-grid);
    vec3 color=bgColor;color=mix(color,lineColor,lineAlpha);color+=lineColor*glow;
    color*=1.0-vignette*0.3;
    float chromaStrength=mouseInfluence*0.003;
    vec2 chromaOffset=normalize(st-mouseAspect+0.001)*chromaStrength;
    color.r+=snoise((distortedUv+chromaOffset)*30.0)*0.008*mouseInfluence;
    color.b+=snoise((distortedUv-chromaOffset)*30.0)*0.008*mouseInfluence;
    float grain=fract(sin(dot(uv*uTime,vec2(12.9898,78.233)))*43758.5453);
    color+=(grain-0.5)*0.015;
    gl_FragColor=vec4(color,1.0);
  }
`;

const canvas = document.getElementById('wave-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const uniforms = {
  uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uScrollVelocity: { value: 0 }, uTheme: { value: 0.0 }
};

const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }));
bgScene.add(bgMesh);

// Init 3D world (objects layer)
const world3D = init3DWorld(canvas, renderer);

// Mouse tracking
let targetMouse = { x: 0.5, y: 0.5 };
let currentMouse = { x: 0.5, y: 0.5 };
let scrollVelocity = 0;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', (e) => {
  targetMouse.x = e.clientX / window.innerWidth;
  targetMouse.y = e.clientY / window.innerHeight;
  mouseX = e.clientX; mouseY = e.clientY;
  updateState('mouseX', targetMouse.x);
  updateState('mouseY', targetMouse.y);
});

lenis.on('scroll', (e) => { scrollVelocity = e.velocity; });

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

// Render loop
const clock = new THREE.Clock();
function renderWebGL() {
  const elapsed = clock.getElapsedTime();
  currentMouse.x += (targetMouse.x - currentMouse.x) * 0.05;
  currentMouse.y += (targetMouse.y - currentMouse.y) * 0.05;
  scrollVelocity *= 0.95;
  uniforms.uTime.value = elapsed;
  uniforms.uMouse.value.set(currentMouse.x, currentMouse.y);
  uniforms.uScrollVelocity.value = scrollVelocity;

  // Pass 1: Background shader
  renderer.autoClear = true;
  renderer.render(bgScene, bgCamera);

  // Pass 2: 3D objects overlay
  world3D.render();

  requestAnimationFrame(renderWebGL);
}
requestAnimationFrame(renderWebGL);

// ===== CUSTOM CURSOR =====
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursor-follower');
let posX = 0, posY = 0;

gsap.to({}, 0.016, {
  repeat: -1,
  onRepeat: function() {
    posX += (mouseX - posX) / 9; posY += (mouseY - posY) / 9;
    gsap.set(follower, { css: { left: posX, top: posY } });
    gsap.set(cursor, { css: { left: mouseX, top: mouseY } });
  }
});

document.addEventListener('mousemove', function(e) { mouseX = e.clientX; mouseY = e.clientY; });

const hoverEls = document.querySelectorAll('a, button, [data-magnetic]');
hoverEls.forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.classList.add('hovered'); follower.classList.add('hovered'); });
  el.addEventListener('mouseleave', () => {
    cursor.classList.remove('hovered'); follower.classList.remove('hovered');
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
  });
  if (el.hasAttribute('data-magnetic')) {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - rect.left - rect.width/2) * 0.35, y: (e.clientY - rect.top - rect.height/2) * 0.35, duration: 0.4, ease: 'power2.out' });
    });
  }
});

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

function updateTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode'); sunIcon.style.display = 'none'; moonIcon.style.display = 'block';
    gsap.to(uniforms.uTheme, { value: 1.0, duration: 1 });
  } else {
    document.body.classList.remove('light-mode'); sunIcon.style.display = 'block'; moonIcon.style.display = 'none';
    gsap.to(uniforms.uTheme, { value: 0.0, duration: 1 });
  }
  updateThemeColor(isLight);
}
updateTheme(false);
themeToggle.addEventListener('click', () => updateTheme(!document.body.classList.contains('light-mode')));

// Nav link scramble
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    const targetId = link.getAttribute('href');
    if (targetId && targetId !== '#') {
      const sec = document.querySelector(targetId);
      if (sec) { const label = sec.querySelector('.section-label span') || sec.querySelector('h3'); if (label) scrambleText(label, null, 1000); }
    }
  });
});

// ===== HERO ENTRY ANIMATION =====
document.body.classList.add('no-scroll');

let heroTl;

function setupHeroAnimation() {
  const introLetters = document.querySelectorAll('.intro-letter');
  const heroWords = document.querySelectorAll('.hero-word');
  
  if (!introLetters.length || !heroWords.length) return;

  // 1. Split hero words into letters
  heroWords.forEach(word => {
    const text = word.textContent; // Use textContent as innerText might be empty for hidden elements
    word.innerHTML = '';
    text.split('').forEach(char => {
      const span = document.createElement('span');
      span.innerText = char === ' ' ? '\u00A0' : char;
      span.className = 'hero-letter';
      span.style.display = 'inline-block';
      word.appendChild(span);
    });
  });

  const allHeroLetters = document.querySelectorAll('.hero-letter');
  
  // 2. Initial state
  gsap.set('.intro-letter', { y: '-100vh', opacity: 0 });
  gsap.set('.hero-title', { y: '-35vh', scale: 1.2, autoAlpha: 0 }); // Hidden in center
  gsap.set('.hero-letter', { opacity: 0 });
  gsap.set('.hero-star', { scale: 0, opacity: 0 });
  gsap.set('.hero-binary-strip', { opacity: 0 });
  gsap.set('.nav', { y: -60, opacity: 0 });
  gsap.set('.scroll-indicator', { opacity: 0 });

  // 3. Generate Radial Explosion (True 360°)
  const introDebris = Array.from(introLetters).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 600;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      rotZ: (Math.random() - 0.5) * 1080,
      rotX: (Math.random() - 0.5) * 720,
      scale: 0.5 + Math.random() * 2
    };
  });

  // 4. Map hero letters to debris positions
  const heroSpawns = Array.from(allHeroLetters).map((_, idx) => {
    const d = introDebris[idx % introDebris.length];
    return {
      x: d.x + (Math.random() - 0.5) * 100,
      y: d.y + (Math.random() - 0.5) * 100,
      rotZ: d.rotZ + (Math.random() - 0.5) * 180,
      rotX: d.rotX + (Math.random() - 0.5) * 180,
      scale: d.scale * 0.8
    };
  });

  // Set initial spawn positions
  allHeroLetters.forEach((el, i) => {
    const s = heroSpawns[i];
    gsap.set(el, { x: s.x, y: s.y, rotationZ: s.rotZ, rotationX: s.rotX, scale: s.scale, opacity: 0 });
  });

  // 5. Build Timeline
  heroTl = gsap.timeline({
    paused: true,
    onComplete: () => {
      document.body.classList.remove('no-scroll');
    }
  });

  // Child timeline for coalescence
  const coalesceTl = gsap.timeline();
  allHeroLetters.forEach((el, i) => {
    const duration = 1.2 + Math.random() * 0.8;
    const delay = Math.random() * 0.4;
    const ease = Math.random() > 0.5 ? 'back.out(1.7)' : 'expo.out';
    
    coalesceTl.to(el, {
      x: 0, y: 0, rotationZ: 0, rotationX: 0, scale: 1, opacity: 1,
      duration: duration,
      ease: ease
    }, delay);
  });

  heroTl
    .to('.intro-letter', { y: 0, opacity: 1, duration: 1, stagger: 0.05, ease: 'expo.out', delay: 0.3 })
    .to({}, { duration: 0.5 })
    // RADIAL EXPLOSION
    .to('.intro-letter', {
      x: (i) => introDebris[i].x,
      y: (i) => introDebris[i].y,
      rotationZ: (i) => introDebris[i].rotZ,
      rotationX: (i) => introDebris[i].rotX,
      scale: (i) => introDebris[i].scale,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    })
    // DISSOLVE & REASSEMBLE
    .to('.intro-letter', { scale: 0.2, opacity: 0, duration: 0.6, ease: 'power2.in' })
    .set('.hero-title', { autoAlpha: 1 }, '<')
    .add(coalesceTl, '-=0.4')
    .fromTo('.hero-star', { scale: 0, opacity: 0, rotationZ: -360 }, { scale: 1, opacity: 1, rotationZ: 0, duration: 1, ease: 'back.out(2)' }, '-=0.8')
    .to({}, { duration: 0.4 })
    // DESCENT TO BOTTOM
    .to('.hero-title', { y: 0, scale: 1, duration: 2.0, ease: 'power4.inOut' })
    .to('.hero-binary-strip', { opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, '-=1')
    .to('.nav', { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' }, '-=1');
}

// Call setup
setupHeroAnimation();

// ===== DIMENSION GATE ANIMATION (smooth scrub) =====
gsap.from('.gate-inner', {
  scrollTrigger: { trigger: '.dimension-gate', start: 'top 90%', end: 'top 40%', scrub: 0.8 },
  scaleX: 0, opacity: 0, ease: 'none'
});

// ===== METRICS COUNTER ANIMATION =====
gsap.utils.toArray('.metric-number').forEach(el => {
  const target = parseInt(el.dataset.count);
  gsap.fromTo(el, { innerText: 0 }, {
    innerText: target, duration: 2, ease: 'power2.out', snap: { innerText: 1 },
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});
gsap.utils.toArray('.metric-item').forEach((item, i) => {
  gsap.from(item, {
    scrollTrigger: { trigger: '.metrics-grid', start: 'top 85%' },
    y: 60, opacity: 0, duration: 1, delay: i * 0.15, ease: 'power4.out'
  });
});

// ===== ABOUT SECTION (smooth reveals) =====
gsap.from('.about-main', {
  scrollTrigger: { trigger: '.about-content', start: 'top 85%', toggleActions: 'play none none reverse' },
  y: 80, opacity: 0, duration: 1.2, ease: 'power3.out'
});
gsap.from('.about-secondary', {
  scrollTrigger: { trigger: '.about-secondary', start: 'top 90%', toggleActions: 'play none none reverse' },
  y: 60, opacity: 0, duration: 1.2, ease: 'power3.out'
});

// About section parallax
gsap.to('.about-content', {
  scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
  y: -30
});

// Skill cards (staggered 3D flip)
gsap.utils.toArray('.skill-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: { trigger: '.skills-grid', start: 'top 90%', toggleActions: 'play none none reverse' },
    y: 50 + i * 10, opacity: 0, rotationX: 20, scale: 0.95,
    duration: 1, ease: 'power3.out', delay: i * 0.1
  });
});

// ===== PHILOSOPHY SECTION =====
gsap.from('.philosophy-quote-mark', {
  scrollTrigger: { trigger: '.philosophy', start: 'top 75%', toggleActions: 'play none none reverse' },
  scale: 0, opacity: 0, duration: 1.2, ease: 'back.out(2)'
});
gsap.from('.philosophy-text', {
  scrollTrigger: { trigger: '.philosophy', start: 'top 70%', toggleActions: 'play none none reverse' },
  y: 50, opacity: 0, duration: 1.4, ease: 'power4.out'
});
gsap.from('.philosophy-author', {
  scrollTrigger: { trigger: '.philosophy', start: 'top 60%', toggleActions: 'play none none reverse' },
  x: -30, opacity: 0, duration: 1, ease: 'power3.out'
});
gsap.from('.philosophy-decoration span', {
  scrollTrigger: { trigger: '.philosophy', start: 'top 55%', toggleActions: 'play none none reverse' },
  scale: 0, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'back.out(3)'
});

// ===== WORK SECTION (parallax bg + smooth card reveals) =====
// Container basic parallax
gsap.to('.work-bg-text', {
  scrollTrigger: { trigger: '.work', start: 'top bottom', end: 'bottom top', scrub: true },
  y: -200, scale: 1.05
});

// Individual letter parallax + entrance
gsap.utils.toArray('.work-bg-row').forEach((row, rowIndex) => {
  const spans = row.querySelectorAll('span');
  spans.forEach((span, i) => {
    // 1. Entrance (Fade in + scale up smoothly, NOT scrubbed)
    gsap.from(span, {
      scrollTrigger: { trigger: row, start: 'top 85%', toggleActions: 'play none none reverse' },
      opacity: 0, scale: 0.5, duration: 1.5, ease: 'power3.out', delay: i * 0.1
    });

    // 2. Parallax (Scrubbed Y movement + rotation)
    gsap.to(span, {
      scrollTrigger: { trigger: '.work', start: 'top bottom', end: 'bottom top', scrub: 1 + (i * 0.1) },
      y: -300 - (i * 30),
      rotationZ: rowIndex % 2 === 0 ? 15 : -15,
      ease: 'none'
    });
  });
});

// Work cards smooth reveals
gsap.utils.toArray('.work-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' },
    y: 100, opacity: 0, rotation: i % 2 === 0 ? -3 : 3, scale: 0.92,
    duration: 1.2, ease: 'power3.out'
  });
  // Parallax on each card while scrolling through
  gsap.to(card, {
    scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
    y: -20 * (i + 1)
  });
});

// ===== BINARY STRIP SETUP =====
function setupBinaryStrips() {
  const strips = document.querySelectorAll('.hero-binary-strip');
  const isReversed = Math.random() > 0.5;

  strips.forEach((strip, i) => {
    const textEl = strip.querySelector('.binary-text');
    if (!textEl) return;
    
    // Repeat content multiple times to ensure seamless loop
    const originalText = textEl.innerHTML;
    textEl.innerHTML = (originalText + ' ////// ').repeat(10);
    
    // Set random opposite directions
    const shouldReverse = (i === 0) ? isReversed : !isReversed;
    if (shouldReverse) {
      textEl.style.animationDirection = 'reverse';
    } else {
      textEl.style.animationDirection = 'normal';
    }
  });
}
setupBinaryStrips();

// ===== CONTACT (explode + fade on scrub) =====
gsap.fromTo('.contact-email', 
  { scale: 0, opacity: 0, y: 150, rotation: 10 },
  {
    scrollTrigger: { trigger: '.contact', start: 'top 90%', end: 'bottom bottom', scrub: 1 },
    scale: 1, opacity: 1, y: 0, rotation: 0, ease: 'power2.out'
  }
);

// Footer slide up
gsap.from('.footer', {
  scrollTrigger: { trigger: '.footer', start: 'top 95%' },
  y: 40, opacity: 0, duration: 1, ease: 'power3.out'
});
gsap.from('.footer-left a', {
  scrollTrigger: { trigger: '.footer', start: 'top 90%' },
  y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out'
});

// Section labels (smooth scrub reveal)
gsap.utils.toArray('.section-label').forEach(label => {
  gsap.from(label, {
    scrollTrigger: { trigger: label, start: 'top 95%', end: 'top 70%', scrub: 0.3 },
    scaleX: 0, transformOrigin: 'left center'
  });
});

// Binary strip duplication moved to setupBinaryStrips() function above

// ===== HERO PARTICLES NETWORK =====
const pCanvas = document.createElement('canvas');
pCanvas.id = 'particles-canvas';
Object.assign(pCanvas.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '4', pointerEvents: 'none' });
document.querySelector('#hero').appendChild(pCanvas);
const pCtx = pCanvas.getContext('2d');
let particles = [];
const particleCount = window.innerWidth < 768 ? 40 : 100;

function resizeParticles() { pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeParticles); resizeParticles();

function getParticleColor(alpha) {
  return document.body.classList.contains('light-mode') ? `rgba(37,99,235,${alpha})` : `rgba(74,158,237,${alpha})`;
}

class Particle {
  constructor() {
    this.x = Math.random() * pCanvas.width; this.y = Math.random() * pCanvas.height;
    this.vx = (Math.random() - 0.5) * 0.8; this.vy = (Math.random() - 0.5) * 0.8;
    this.radius = Math.random() * 1.5 + 0.5;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > pCanvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > pCanvas.height) this.vy *= -1;
  }
  draw() {
    pCtx.beginPath(); pCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    pCtx.fillStyle = getParticleColor(0.6); pCtx.fill();
  }
}
for (let i = 0; i < particleCount; i++) particles.push(new Particle());

function animateParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach((p, index) => {
    p.update(); p.draw();
    for (let j = index + 1; j < particles.length; j++) {
      const p2 = particles[j]; const dx = p.x - p2.x; const dy = p.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        pCtx.beginPath(); pCtx.strokeStyle = getParticleColor(0.15 - dist/150 * 0.15);
        pCtx.lineWidth = 0.8; pCtx.moveTo(p.x, p.y); pCtx.lineTo(p2.x, p2.y); pCtx.stroke();
      }
    }
    const dxM = p.x - mouseX; const dyM = p.y - mouseY;
    const distM = Math.sqrt(dxM * dxM + dyM * dyM);
    if (distM < 250) {
      pCtx.beginPath(); pCtx.strokeStyle = getParticleColor(0.5 - distM/250 * 0.5);
      pCtx.lineWidth = 1.2; pCtx.moveTo(p.x, p.y); pCtx.lineTo(mouseX, mouseY); pCtx.stroke();
      if (distM < 150) { p.x -= dxM * 0.015; p.y -= dyM * 0.015; }
    }
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();
