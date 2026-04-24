import * as THREE from 'three';

// ===== 3D WORLD MODULE =====
// Floating wireframe objects that react to scroll and mouse

const STATE = { scrollY: 0, velocity: 0, mouseX: 0.5, mouseY: 0.5, theme: 0 };

// Materials
function createWireMat(color, opacity = 0.35) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function createEdgeMesh(geo, mat) {
  const edges = new THREE.EdgesGeometry(geo);
  return new THREE.LineSegments(edges, mat);
}

// Build all 3D objects
function createObjects(scene) {
  const accent = new THREE.Color(0x4a9eed);
  const objects = [];

  // --- Large Icosahedron (Right Object) ---
  const ico = createEdgeMesh(new THREE.IcosahedronGeometry(3, 1), createWireMat(accent, 0.25));
  ico.position.set(18, 5, -15); // Increased spacing
  ico.userData = { baseY: 5, speed: 0.15, rotSpeed: 0.003 };
  scene.add(ico); objects.push(ico);

  // --- Torus Knot (Left Object) ---
  const knot = createEdgeMesh(new THREE.TorusKnotGeometry(2.5, 0.4, 80, 12, 2, 3), createWireMat(accent, 0.2));
  knot.position.set(-18, 5, -15); // Increased spacing
  knot.userData = { baseY: 5, speed: 0.1, rotSpeed: 0.002 };
  scene.add(knot); objects.push(knot);

  // --- Background Octahedron ---
  const octa = createEdgeMesh(new THREE.OctahedronGeometry(1.5, 0), createWireMat(accent, 0.1));
  octa.position.set(-5, 2, -25);
  octa.userData = { baseY: 2, speed: 0.12, rotSpeed: 0.004 };
  scene.add(octa); objects.push(octa);

  // --- Background Dodecahedron ---
  const dodeca = createEdgeMesh(new THREE.DodecahedronGeometry(2, 0), createWireMat(accent, 0.1));
  dodeca.position.set(5, 8, -25);
  dodeca.userData = { baseY: 8, speed: 0.08, rotSpeed: 0.0025 };
  scene.add(dodeca); objects.push(dodeca);

  // --- PLANET WITH RINGS ---
  const planetGroup = new THREE.Group();
  
  // The Planet (Sphere)
  const sphere = createEdgeMesh(new THREE.SphereGeometry(3.5, 16, 16), createWireMat(accent, 0.3));
  planetGroup.add(sphere);
  
  // The Rings (Torus) - Increased opacity slightly for visibility
  const ring1 = createEdgeMesh(new THREE.TorusGeometry(6, 0.05, 8, 40), createWireMat(accent, 0.25));
  ring1.rotation.x = Math.PI * 0.4;
  planetGroup.add(ring1);
  
  const ring2 = createEdgeMesh(new THREE.TorusGeometry(7.5, 0.05, 8, 40), createWireMat(accent, 0.2));
  ring2.rotation.x = Math.PI * 0.45;
  ring2.rotation.y = Math.PI * 0.1;
  planetGroup.add(ring2);
  
  planetGroup.position.set(0, 5, -20);
  // Earth inclination: 23.5 degrees
  planetGroup.rotation.z = 23.5 * Math.PI / 180;
  
  planetGroup.userData = { 
    isPlanet: true, 
    planetRotSpeed: 0.008, 
    ringRotSpeed1: -0.025, // Increased speed
    ringRotSpeed2: 0.015   // Changed direction and speed
  };
  scene.add(planetGroup); objects.push(planetGroup);

  // --- Small floating tetrahedrons ---
  for (let i = 0; i < 12; i++) {
    const size = 0.5 + Math.random() * 1.2;
    const tetra = createEdgeMesh(new THREE.TetrahedronGeometry(size, 0), createWireMat(accent, 0.15 + Math.random() * 0.15));
    const x = (Math.random() - 0.5) * 40;
    const y = -2 + Math.random() * 16;
    const z = -3 - Math.random() * 15;
    tetra.position.set(x, y, z);
    tetra.userData = { baseY: y, speed: 0.05 + Math.random() * 0.1, rotSpeed: 0.002 + Math.random() * 0.005 };
    scene.add(tetra); objects.push(tetra);
  }

  // --- Particle nebula (Points) ---
  const particleCount = 1500;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = -Math.random() * 150 + 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: accent, size: 0.08, transparent: true, opacity: 0.4, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  particles.userData = { isParticles: true };
  scene.add(particles);

  return { objects, particles };
}

export function init3DWorld(canvas, renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 5, 25);

  const { objects, particles } = createObjects(scene);

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const clock = new THREE.Clock();

  function render() {
    const t = clock.getElapsedTime();
    const scrollOffset = STATE.scrollY * 0.012;
    const vel = STATE.velocity;

    // Camera follows scroll
    camera.position.y = 5 - scrollOffset;
    camera.position.x = Math.sin(t * 0.1) * 2 + (STATE.mouseX - 0.5) * 4;
    camera.lookAt(0, 5 - scrollOffset, 0);

    // Animate objects
    objects.forEach(obj => {
      const d = obj.userData;
      if (d.isPlanet) {
        // Fix to camera Y to keep it centered on screen
        obj.position.y = camera.position.y;
        
        // Planet rotates one way
        obj.children[0].rotation.y += d.planetRotSpeed;
        
        // Rings rotate and wobble slightly to make motion more apparent
        obj.children[1].rotation.z += d.ringRotSpeed1;
        obj.children[1].rotation.x = Math.PI * 0.4 + Math.sin(t * 0.5) * 0.05;
        
        obj.children[2].rotation.z += d.ringRotSpeed2;
        obj.children[2].rotation.y = Math.PI * 0.1 + Math.cos(t * 0.4) * 0.08;
      } else {
        obj.rotation.x += d.rotSpeed + Math.abs(vel) * 0.00008;
        obj.rotation.y += d.rotSpeed * 0.7;
        obj.rotation.z += d.rotSpeed * 0.3 + vel * 0.00003;
        // Floating bob
        obj.position.y = d.baseY + Math.sin(t * 0.5 + d.baseY) * 0.8;
      }
    });

    // Particles subtle drift
    if (particles) {
      particles.rotation.y = t * 0.02;
      particles.rotation.x = Math.sin(t * 0.05) * 0.1;
    }

    // Dual render pass: clear depth so 3D renders on top of background shader
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera);
  }

  return { render, scene, camera, STATE };
}

export function updateState(key, value) {
  STATE[key] = value;
}

export function updateThemeColor(isLight) {
  STATE.theme = isLight ? 1 : 0;
}
