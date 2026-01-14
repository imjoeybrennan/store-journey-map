/**
 * Main entry point for Three.js Store Journey
 * Creates renderer, scene, and camera with intro animation
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

import { createStoreScene } from './scene.js';
import { 
  initAnimator, 
  updateAnimator, 
  startFullAnimation,
  setCameraToZenith,
  resetJourney,
  getAnimatorState,
  setCompassMode,
  getCompassMode,
  setPathVisible,
  getPathVisible,
  switchPath
} from './animator.js';
import { createUI } from './ui.js';

// ============================================
// Renderer Setup
// ============================================
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xFAF7F2); // Very light warm beige background
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping; // Ensure no color modification
container.appendChild(renderer.domElement);

// ============================================
// Scene Setup
// ============================================
const scene = new THREE.Scene();

// ============================================
// Perspective Camera
// Start in zenith (top-down) position
// ============================================
const camera = new THREE.PerspectiveCamera(
  45, // FOV
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

// Initial position: Zenith (top-down) view
camera.position.set(0, 80, 0.001); // Slight Z offset to avoid gimbal lock
camera.lookAt(0, 0, 0);

// ============================================
// Orbit Controls (disabled during animations)
// ============================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI / 2.2;
controls.minDistance = 15;
controls.maxDistance = 150;
controls.enabled = false; // Disabled initially for intro animation
controls.update();

// ============================================
// Assets container
// ============================================
const assets = {
  startTexture: null,
  endTexture: null,
  journeyTexture: null,
  wordmarkTexture: null,
  itemTextures: {},  // Pin item images
  gltfLoader: new GLTFLoader(),
  gsap: gsap
};

// ============================================
// Helper to load SVG as texture
// ============================================
function loadSvgAsTexture(url, width, height) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;  // Preserve exact colors
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = (err) => {
      console.warn('Failed to load SVG:', url, err);
      resolve(null);
    };
    img.src = url;
  });
}

// ============================================
// Load all assets, then initialize scene
// ============================================
const textureLoader = new THREE.TextureLoader();

async function loadAllAssets() {
  // Load PNG textures
  const pngPromises = [
    new Promise((resolve) => {
      textureLoader.load('assets/Start.png', (tex) => {
        assets.startTexture = tex;
        resolve();
      }, undefined, () => resolve());
    }),
    new Promise((resolve) => {
      textureLoader.load('assets/End.png', (tex) => {
        assets.endTexture = tex;
        resolve();
      }, undefined, () => resolve());
    }),
    new Promise((resolve) => {
      textureLoader.load('assets/Story Journey.png', (tex) => {
        assets.journeyTexture = tex;
        resolve();
      }, undefined, () => resolve());
    })
  ];
  
  // Load SVG textures at high resolution for crisp rendering
  const svgPromises = [
    loadSvgAsTexture('assets/[WCP] Sam\'s Club Wordmark.svg', 1908, 320).then(tex => {
      assets.wordmarkTexture = tex;
      if (tex) {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      console.log('Wordmark loaded:', tex ? 'OK' : 'FAILED');
    })
  ];
  
  // Load item images for pins
  const pinLabels = ['A1', 'C4', 'C10', 'F7', 'G4', 'H20', 'I9'];
  const itemPromises = pinLabels.map(label => {
    return new Promise((resolve) => {
      textureLoader.load(`assets/items/${label}.png`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        assets.itemTextures[label] = tex;
        console.log(`Item ${label} loaded`);
        resolve();
      }, undefined, () => {
        console.warn(`Item ${label} not found`);
        resolve();
      });
    });
  });
  
  await Promise.all([...pngPromises, ...svgPromises, ...itemPromises]);
  console.log('All assets loaded');
}

// ============================================
// Initialize everything after assets load
// ============================================
let storeData = null;
let animationStarted = false;

loadAllAssets().then(() => {
  // Create Store Scene with loaded assets
  storeData = createStoreScene(scene, assets);
  
  // Initialize Animator
  initAnimator({
    scene,
    camera,
    renderer,
    worldGroup: storeData.worldGroup,
    pathCurve: storeData.pathCurve,
    pathMesh: storeData.pathMesh,
    shopper: storeData.shopper,
    shelfMap: storeData.shelfMap,
    pinsGroup: storeData.pinsGroup,
    pinsMap: storeData.pinsMap,
    gsap
  });
  
  // Set camera to initial zenith view
  setCameraToZenith();
  
  // Setup toggle buttons
  setupToggleButtons();
  
  console.log('Scene initialized - Press SPACE to start animation');
});

// ============================================
// Toggle Buttons Setup
// ============================================
function setupToggleButtons() {
  const labelsBtn = document.getElementById('toggle-labels');
  const pinsBtn = document.getElementById('toggle-pins');
  const compassBtn = document.getElementById('toggle-compass');
  
  let labelsVisible = true;
  let pinsVisible = true;
  
  labelsBtn.addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    labelsBtn.classList.toggle('active', labelsVisible);
    if (scene.toggleSectionLabels) {
      scene.toggleSectionLabels(labelsVisible);
    }
  });
  
  pinsBtn.addEventListener('click', () => {
    pinsVisible = !pinsVisible;
    pinsBtn.classList.toggle('active', pinsVisible);
    if (scene.togglePins) {
      scene.togglePins(pinsVisible);
    }
  });
  
  // Path selector: dropdown to choose path or hide
  const pathSelector = document.getElementById('path-selector');
  if (pathSelector && storeData) {
    pathSelector.addEventListener('change', (e) => {
      const value = e.target.value;
      
      if (value === 'none') {
        // Hide path
        setPathVisible(false);
      } else {
        // Switch to selected path and show with animation
        switchPath(value, storeData.switchPath);
        setPathVisible(true);
      }
    });
  }
  
  // Compass mode toggle: ON = North-up (Sam's logo at top), OFF = marker always faces forward
  if (compassBtn) {
    const updateCompassButtonText = () => {
      const isNorthUp = getCompassMode();
      compassBtn.textContent = isNorthUp ? '🧭 North-up' : '📍 Follow';
      compassBtn.classList.toggle('active', isNorthUp);
    };
    
    compassBtn.addEventListener('click', () => {
      const currentMode = getCompassMode();
      setCompassMode(!currentMode);
      updateCompassButtonText();
    });
  }
}

// ============================================
// Create UI
// ============================================
const uiContainer = document.getElementById('ui-container');
createUI(uiContainer);

// ============================================
// Keyboard Controls
// ============================================
const referenceOverlay = document.getElementById('reference-overlay');
let overlayVisible = false;

document.addEventListener('keydown', (event) => {
  // R key: Toggle reference overlay
  if (event.key === 'r' || event.key === 'R') {
    overlayVisible = !overlayVisible;
    referenceOverlay.classList.toggle('hidden');
    if (scene.showReferenceOverlay) {
      scene.showReferenceOverlay(overlayVisible);
    }
  }
  
  // SPACE key: Start/restart animation
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (storeData) {
      // Disable orbit controls during animation
      controls.enabled = false;
      animationStarted = true;
      startFullAnimation();
      console.log('Animation started!');
    }
  }
  
  // O key: Toggle orbit controls (for debugging/manual camera)
  if (event.key === 'o' || event.key === 'O') {
    controls.enabled = !controls.enabled;
    console.log('Orbit controls:', controls.enabled ? 'enabled' : 'disabled');
    if (controls.enabled) {
      // Update controls target to current camera look-at point
      controls.target.copy(camera.position).add(
        new THREE.Vector3(0, -1, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(30)
      );
      controls.update();
    }
  }
  
  // Escape key: Reset animation
  if (event.key === 'Escape') {
    resetJourney();
    animationStarted = false;
    console.log('Animation reset - Press SPACE to restart');
  }
  
  // Period key: Toggle UI visibility
  if (event.key === '.') {
    const uiContainer = document.getElementById('ui-container');
    if (uiContainer) {
      uiContainer.style.display = uiContainer.style.display === 'none' ? 'flex' : 'none';
    }
  }
});

// ============================================
// Window Resize Handler
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// Animation Loop
// ============================================
function animate() {
  requestAnimationFrame(animate);
  
  // Only update orbit controls if enabled and animation not playing
  if (controls.enabled) {
    controls.update();
  }
  
  updateAnimator();
  renderer.render(scene, camera);
}

animate();

// ============================================
// Ready!
// ============================================
console.log('Store Journey ready');
