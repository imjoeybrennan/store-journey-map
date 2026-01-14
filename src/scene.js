/**
 * Scene creation module
 * Creates the Sam's Club store environment with geometry, paths, and shopper
 * Layout matches Store Journey-top-down.png exactly
 */

import * as THREE from 'three';

// ============================================
// Constants - Sam's Club Blue (matching logo SVG exactly)
// ============================================
const SAMS_BLUE = 0x0062AD;
const SAMS_BLUE_HEX = '#0062AD';
// Alternative blues from marker gradient: #3D90EC (light) to #235286 (dark)

// Store dimensions - wider to accommodate all elements without overlap
const STORE_WIDTH = 68;
const STORE_DEPTH = 46;
const WALL_HEIGHT = 5;
const AISLE_SHELF_HEIGHT = 2.8;
const BIN_HEIGHT = 1.6;

// Colors matching 3D Map Style Reference.png (lighter)
const FLOOR_COLOR = 0xEEEBE6;      // 5% darker than background (#FAF7F2)
const WALL_COLOR = 0xFAF8F5;       // Almost white cream walls
const SHELF_COLOR = 0x7AABD1;      // Medium blue shelves
const BIN_COLOR = 0x7AABD1;        // Medium blue bins (same as shelves)

// ============================================
// Helper: Create text texture for shelf labels
// ============================================
function createLabelTexture(letter, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(245, 245, 245, 0.95)';
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = SAMS_BLUE_HEX;
  ctx.font = `bold ${size * 0.55}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// ============================================
// Helper: Create section label with text shadow (floating above geometry)
// ============================================
function createSectionLabel(text, fontSize = 1.5) {
  const canvas = document.createElement('canvas');
  const scale = 4; // High resolution
  const padding = 20;
  const lineHeight = fontSize * 45 * scale;
  
  // Split text by newlines
  const lines = text.split('\n');
  
  // Measure text
  const tempCtx = canvas.getContext('2d');
  tempCtx.font = `bold ${fontSize * 40 * scale}px Arial, sans-serif`;
  
  let maxWidth = 0;
  lines.forEach(line => {
    const metrics = tempCtx.measureText(line);
    maxWidth = Math.max(maxWidth, metrics.width);
  });
  
  canvas.width = maxWidth + padding * 2 * scale;
  canvas.height = lineHeight * lines.length + padding * scale;
  
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize * 40 * scale}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw each line
  lines.forEach((line, i) => {
    const y = (i + 0.5) * lineHeight + padding * scale / 2;
    
    // Text shadow (dark, offset)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(line, canvas.width / 2 + 3 * scale, y + 3 * scale);
    
    // Main text (white)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, canvas.width / 2, y);
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  const aspect = canvas.width / canvas.height;
  const height = fontSize * 2 * lines.length;
  const geometry = new THREE.PlaneGeometry(height * aspect, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    toneMapped: false,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 50;
  
  return mesh;
}

// ============================================
// Helper: Create pin texture (normal or done state)
// ============================================
function createPinTexture(label, isDone = false) {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size * 1.2;
  const ctx = canvas.getContext('2d');
  
  const cx = size / 2;
  const pinTop = 10;
  const circleRadius = size / 2 - 20;
  const circleY = pinTop + circleRadius + 10;
  
  // Shadow behind entire pin
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 8;
  
  // Pin body (white teardrop shape)
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, circleY, circleRadius + 5, Math.PI * 0.8, Math.PI * 0.2, false);
  ctx.quadraticCurveTo(cx + 20, circleY + circleRadius + 30, cx, canvas.height - 30);
  ctx.quadraticCurveTo(cx - 20, circleY + circleRadius + 30, cx - (circleRadius + 5) * Math.sin(Math.PI * 0.3), circleY + (circleRadius + 5) * Math.cos(Math.PI * 0.3));
  ctx.closePath();
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Circle inside (blue or green)
  ctx.fillStyle = isDone ? '#2A8703' : '#004F9A';
  ctx.beginPath();
  ctx.arc(cx, circleY, circleRadius - 5, 0, Math.PI * 2);
  ctx.fill();
  
  // White stroke around circle
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // Bottom shadow ellipse
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, canvas.height - 15, 30, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  if (isDone) {
    // Draw checkmark
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 35, circleY);
    ctx.lineTo(cx - 10, circleY + 25);
    ctx.lineTo(cx + 40, circleY - 25);
    ctx.stroke();
  } else {
    // Label text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${circleRadius * 0.7}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, circleY);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return texture;
}

// ============================================
// Helper: Create heart pin texture (normal or done/checked state)
// ============================================
function createHeartTexture(heartTexture, isDone = false) {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size * 1.15;
  const ctx = canvas.getContext('2d');
  
  // Draw heart from texture if available
  const heartWidth = 420;
  const heartHeight = heartWidth * (101 / 117); // Maintain aspect ratio
  const heartX = (size - heartWidth) / 2;
  const heartY = 20;
  const heartBottom = heartY + heartHeight;
  
  // Draw bottom shadow ellipse - positioned to barely intersect with heart's point
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(size / 2, heartBottom - 8, 50, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw heart on top
  if (heartTexture && heartTexture.image) {
    // Add drop shadow behind heart
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 12;
    
    if (isDone) {
      // Draw green tinted heart for done state
      ctx.filter = 'hue-rotate(100deg) saturate(1.2)';
    }
    
    ctx.drawImage(heartTexture.image, heartX, heartY, heartWidth, heartHeight);
    
    // Reset filter and shadow
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw checkmark if done
    if (isDone) {
      const cx = size / 2;
      const cy = heartY + heartHeight * 0.4;
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy);
      ctx.lineTo(cx - 15, cy + 45);
      ctx.lineTo(cx + 70, cy - 45);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  
  return { texture, width: canvas.width, height: canvas.height };
}

// ============================================
// Helper: Create heart pin (for favorited items)
// ============================================
function createHeartPin(pinSize = 3, heartTexture = null) {
  const group = new THREE.Group();
  group.userData.isBillboard = true;
  group.userData.isHeart = true;
  group.userData.isDone = false;
  
  // Create normal and done textures
  const normalTex = createHeartTexture(heartTexture, false);
  const doneTex = createHeartTexture(heartTexture, true);
  
  // Maintain proper aspect ratio based on canvas dimensions
  const aspect = normalTex.width / normalTex.height;
  const geometry = new THREE.PlaneGeometry(pinSize * aspect, pinSize);
  const material = new THREE.MeshBasicMaterial({
    map: normalTex.texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    toneMapped: false,
  });
  
  const pinMesh = new THREE.Mesh(geometry, material);
  pinMesh.renderOrder = 100;
  pinMesh.userData.normalTexture = normalTex.texture;
  pinMesh.userData.doneTexture = doneTex.texture;
  group.add(pinMesh);
  group.userData.pinMesh = pinMesh;
  
  return group;
}

// ============================================
// Helper: Create pin component with shadow and text
// ============================================
function createPin(label, pinSize = 3, itemTexture = null, gsapRef = null) {
  const normalTexture = createPinTexture(label, false);
  const doneTexture = createPinTexture(label, true);
  
  const group = new THREE.Group();
  group.userData.isBillboard = true;
  group.userData.label = label;
  group.userData.isDone = false;
  
  // Main pin mesh
  const aspect = 256 / (256 * 1.2);
  const geometry = new THREE.PlaneGeometry(pinSize * aspect, pinSize);
  const material = new THREE.MeshBasicMaterial({
    map: normalTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    toneMapped: false,
  });
  
  const pinMesh = new THREE.Mesh(geometry, material);
  pinMesh.renderOrder = 100;
  pinMesh.userData.normalTexture = normalTexture;
  pinMesh.userData.doneTexture = doneTexture;
  group.add(pinMesh);
  group.userData.pinMesh = pinMesh;
  
  // Item image with circular mask (positioned inside the blue circle)
  if (itemTexture) {
    // Create circular masked texture
    const itemCanvas = document.createElement('canvas');
    const itemSize = 256;
    itemCanvas.width = itemSize;
    itemCanvas.height = itemSize;
    const itemCtx = itemCanvas.getContext('2d');
    
    // Create circular clipping path
    itemCtx.beginPath();
    itemCtx.arc(itemSize / 2, itemSize / 2, itemSize / 2 - 10, 0, Math.PI * 2);
    itemCtx.closePath();
    itemCtx.clip();
    
    // Draw the item image
    if (itemTexture.image) {
      itemCtx.drawImage(itemTexture.image, 0, 0, itemSize, itemSize);
    }
    
    const itemCanvasTexture = new THREE.CanvasTexture(itemCanvas);
    itemCanvasTexture.colorSpace = THREE.SRGBColorSpace;
    itemCanvasTexture.needsUpdate = true;
    
    const itemGeometry = new THREE.PlaneGeometry(pinSize * 0.75, pinSize * 0.75);
    const itemMaterial = new THREE.MeshBasicMaterial({
      map: itemCanvasTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      toneMapped: false,
      opacity: 0,  // Start invisible
    });
    
    const itemMesh = new THREE.Mesh(itemGeometry, itemMaterial);
    itemMesh.position.y = pinSize * 0.08;  // Centered on blue circle
    itemMesh.position.z = 0.01;  // Slightly in front of pin
    itemMesh.renderOrder = 101;
    group.add(itemMesh);
    group.userData.itemMesh = itemMesh;
    
    // Start looping animation if gsap is available
    if (gsapRef) {
      const animateItem = () => {
        if (group.userData.isDone) return;  // Stop if done
        
        gsapRef.timeline()
          .to(itemMaterial, { opacity: 1, duration: 0.3, ease: 'power1.inOut' })
          .to({}, { duration: 1.0 })  // Hold visible (1000ms)
          .to(itemMaterial, { opacity: 0, duration: 0.3, ease: 'power1.inOut' })
          .to({}, { duration: 2, onComplete: animateItem });  // Wait then repeat
      };
      
      // Start the animation loop
      group.userData.startItemAnimation = animateItem;
      animateItem();
    }
  }
  
  return group;
}

// ============================================
// Helper: Create a shelf/bin block
// ============================================
function createShelfBlock(width, depth, height, color = null) {
  const group = new THREE.Group();
  
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: color || SHELF_COLOR,
    roughness: 0.7,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  
  return group;
}

// ============================================
// Helper: Create aisle shelf pair with labels (no poles)
// ============================================
function createAisleShelfPair(letter1, letter2, x, z, shelfWidth = 1.3, shelfDepth = 8, gap = 1.8) {
  const group = new THREE.Group();
  
  // Left shelf
  const leftShelf = createShelfBlock(shelfWidth, shelfDepth, AISLE_SHELF_HEIGHT);
  leftShelf.position.x = -gap / 2 - shelfWidth / 2;
  group.add(leftShelf);
  
  // Right shelf
  const rightShelf = createShelfBlock(shelfWidth, shelfDepth, AISLE_SHELF_HEIGHT);
  rightShelf.position.x = gap / 2 + shelfWidth / 2;
  group.add(rightShelf);
  
  // Labels at front (south side)
  const labelSize = 0.7;
  const labelGeometry = new THREE.PlaneGeometry(labelSize, labelSize);
  
  // Left label
  const leftLabelTexture = createLabelTexture(letter1);
  const leftLabelMaterial = new THREE.MeshBasicMaterial({ map: leftLabelTexture, transparent: true, toneMapped: false });
  const leftLabel = new THREE.Mesh(labelGeometry, leftLabelMaterial);
  leftLabel.position.set(-gap / 2 - shelfWidth / 2, AISLE_SHELF_HEIGHT + 0.4, shelfDepth / 2 + 0.1);
  group.add(leftLabel);
  
  // Right label
  const rightLabelTexture = createLabelTexture(letter2);
  const rightLabelMaterial = new THREE.MeshBasicMaterial({ map: rightLabelTexture, transparent: true, toneMapped: false });
  const rightLabel = new THREE.Mesh(labelGeometry, rightLabelMaterial);
  rightLabel.position.set(gap / 2 + shelfWidth / 2, AISLE_SHELF_HEIGHT + 0.4, shelfDepth / 2 + 0.1);
  group.add(rightLabel);
  
  group.position.set(x, 0, z);
  return group;
}

// ============================================
// Helper: Create path with rounded corners
// ============================================
function createRoundedPath(waypoints, cornerRadius = 1.0) {
  const points = [];
  
  for (let i = 0; i < waypoints.length; i++) {
    const current = waypoints[i];
    
    if (i === 0 || i === waypoints.length - 1) {
      // Start and end points
      points.push(new THREE.Vector3(current.x, 0, current.z));
    } else {
      const prev = waypoints[i - 1];
      const next = waypoints[i + 1];
      
      // Calculate segment lengths
      const distToPrev = Math.sqrt(
        Math.pow(current.x - prev.x, 2) + Math.pow(current.z - prev.z, 2)
      );
      const distToNext = Math.sqrt(
        Math.pow(next.x - current.x, 2) + Math.pow(next.z - current.z, 2)
      );
      
      // Clamp corner radius to prevent overlapping (max 40% of shorter segment)
      const maxRadius = Math.min(distToPrev, distToNext) * 0.4;
      const actualRadius = Math.min(cornerRadius, maxRadius);
      
      const dirFromPrev = new THREE.Vector2(
        (current.x - prev.x) / distToPrev,
        (current.z - prev.z) / distToPrev
      );
      const dirToNext = new THREE.Vector2(
        (next.x - current.x) / distToNext,
        (next.z - current.z) / distToNext
      );
      
      const beforeCorner = {
        x: current.x - dirFromPrev.x * actualRadius,
        z: current.z - dirFromPrev.y * actualRadius
      };
      const afterCorner = {
        x: current.x + dirToNext.x * actualRadius,
        z: current.z + dirToNext.y * actualRadius
      };
      
      points.push(new THREE.Vector3(beforeCorner.x, 0, beforeCorner.z));
      
      // Smooth Bezier arc for corner (more points = smoother)
      const arcPoints = 16;
      for (let j = 1; j < arcPoints; j++) {
        const t = j / arcPoints;
        // Quadratic Bezier curve
        const px = (1 - t) * (1 - t) * beforeCorner.x + 2 * (1 - t) * t * current.x + t * t * afterCorner.x;
        const pz = (1 - t) * (1 - t) * beforeCorner.z + 2 * (1 - t) * t * current.z + t * t * afterCorner.z;
        points.push(new THREE.Vector3(px, 0, pz));
      }
      
      points.push(new THREE.Vector3(afterCorner.x, 0, afterCorner.z));
    }
  }
  
  // Use centripetal parameterization for uniform speed
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
}

// ============================================
// Create Shopper Marker (exact Marker.svg design)
// ============================================
function createShopperMarker() {
  const group = new THREE.Group();
  group.name = 'Shopper';
  
  const markerSize = 4.0;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1024;  // High resolution for crisp rendering
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  const cx = 512, cy = 512;
  const scale = 8.5;  // Scale up for 1024px canvas (original SVG is 120x120)
  
  // Outer white circle
  ctx.beginPath();
  ctx.arc(cx, cy, 60 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  
  // Blue gradient inner circle
  const gradient = ctx.createLinearGradient(cx, 10 * scale, cx, 110 * scale);
  gradient.addColorStop(0, '#3D90EC');
  gradient.addColorStop(1, '#235286');
  ctx.beginPath();
  ctx.arc(cx, cy, 50 * scale, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // White location cursor (exact path from Marker.svg, scaled and centered)
  ctx.fillStyle = 'white';
  ctx.save();
  ctx.translate(cx - 60 * scale, cy - 60 * scale);  // Center the path
  ctx.beginPath();
  ctx.moveTo(67.1985 * scale, 37.8469 * scale);
  ctx.bezierCurveTo(64.8913 * scale, 33.0884 * scale, 63.7377 * scale, 30.7091 * scale, 62.1646 * scale, 29.9536 * scale);
  ctx.bezierCurveTo(60.7964 * scale, 29.2964 * scale, 59.2036 * scale, 29.2964 * scale, 57.8354 * scale, 29.9536 * scale);
  ctx.bezierCurveTo(56.2623 * scale, 30.7091 * scale, 55.1087 * scale, 33.0884 * scale, 52.8015 * scale, 37.8469 * scale);
  ctx.lineTo(37.9102 * scale, 68.5602 * scale);
  ctx.bezierCurveTo(34.8692 * scale, 74.8323 * scale, 33.3487 * scale, 77.9684 * scale, 33.8987 * scale, 79.826 * scale);
  ctx.bezierCurveTo(34.3748 * scale, 81.434 * scale, 35.6253 * scale, 82.6962 * scale, 37.2287 * scale, 83.1873 * scale);
  ctx.bezierCurveTo(39.0811 * scale, 83.7546 * scale, 42.2313 * scale, 82.2635 * scale, 48.5315 * scale, 79.2812 * scale);
  ctx.lineTo(56.5772 * scale, 75.4727 * scale);
  ctx.bezierCurveTo(57.8349 * scale, 74.8773 * scale, 58.4637 * scale, 74.5797 * scale, 59.1204 * scale, 74.4623 * scale);
  ctx.bezierCurveTo(59.7022 * scale, 74.3584 * scale, 60.2978 * scale, 74.3584 * scale, 60.8796 * scale, 74.4623 * scale);
  ctx.bezierCurveTo(61.5363 * scale, 74.5797 * scale, 62.1651 * scale, 74.8773 * scale, 63.4228 * scale, 75.4727 * scale);
  ctx.lineTo(71.4685 * scale, 79.2812 * scale);
  ctx.bezierCurveTo(77.7687 * scale, 82.2635 * scale, 80.9189 * scale, 83.7546 * scale, 82.7713 * scale, 83.1873 * scale);
  ctx.bezierCurveTo(84.3747 * scale, 82.6962 * scale, 85.6252 * scale, 81.434 * scale, 86.1013 * scale, 79.826 * scale);
  ctx.bezierCurveTo(86.6513 * scale, 77.9684 * scale, 85.1308 * scale, 74.8323 * scale, 82.0898 * scale, 68.5602 * scale);
  ctx.lineTo(67.1985 * scale, 37.8469 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;  // Preserve exact colors
  texture.needsUpdate = true;
  
  const geometry = new THREE.PlaneGeometry(markerSize, markerSize);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  // Rotate 180° so arrow points toward path (into store, -Z direction)
  plane.rotation.z = Math.PI;
  plane.position.y = 0.5;
  plane.renderOrder = 10;
  group.add(plane);
  
  // Shadow
  const shadowGeometry = new THREE.CircleGeometry(markerSize * 0.4, 32);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.12,
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  
  return group;
}

// ============================================
// Create Sam's Club Logo
// ============================================
function createLogo(assets) {
  const logoWidth = 18;
  const logoHeight = logoWidth * (80 / 477);
  const geometry = new THREE.PlaneGeometry(logoWidth, logoHeight);
  
  let material;
  if (assets && assets.wordmarkTexture) {
    // Ensure crisp rendering and exact colors
    assets.wordmarkTexture.minFilter = THREE.LinearFilter;
    assets.wordmarkTexture.magFilter = THREE.LinearFilter;
    assets.wordmarkTexture.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshBasicMaterial({
      map: assets.wordmarkTexture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 1908;  // 2x resolution for crisp fallback
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = SAMS_BLUE_HEX;
    ctx.font = "bold 180px 'Arial', sans-serif";  // 2x scale
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("sam's club", 760, 160);  // 2x positions
    
    const dx = 1640, dy = 160, ds = 90;  // 2x scale
    ctx.strokeStyle = SAMS_BLUE_HEX;
    ctx.lineWidth = 16;  // 2x
    
    ctx.beginPath();
    ctx.moveTo(dx, dy - ds);
    ctx.lineTo(dx + ds, dy);
    ctx.lineTo(dx, dy + ds);
    ctx.lineTo(dx - ds, dy);
    ctx.closePath();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(dx, dy - ds * 0.5);
    ctx.lineTo(dx + ds * 0.5, dy);
    ctx.lineTo(dx, dy + ds * 0.5);
    ctx.lineTo(dx - ds * 0.5, dy);
    ctx.closePath();
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    
    material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }
  
  return new THREE.Mesh(geometry, material);
}

// ============================================
// Main: Create Store Scene
// ============================================
export function createStoreScene(scene, assets) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'StoreWorld';
  scene.add(worldGroup);
  
  const shelfMap = {};
  
  // ============================================
  // Lighting (bright to match 3D Map Style Reference)
  // ============================================
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.6);
  directionalLight.position.set(15, 40, 25);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight.position.set(-20, 25, -15);
  scene.add(fillLight);
  
  // ============================================
  // Floor (warm beige/cream)
  // ============================================
  const floorGeometry = new THREE.PlaneGeometry(STORE_WIDTH, STORE_DEPTH);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: FLOOR_COLOR,
    toneMapped: false,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  worldGroup.add(floor);
  
  // ============================================
  // Walls (light cream)
  // ============================================
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.85,
  });
  
  const wallThickness = 1.2;
  
  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(STORE_WIDTH, WALL_HEIGHT, wallThickness),
    wallMaterial
  );
  backWall.position.set(0, WALL_HEIGHT / 2, -STORE_DEPTH / 2 + wallThickness / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  worldGroup.add(backWall);
  
  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, STORE_DEPTH),
    wallMaterial
  );
  leftWall.position.set(-STORE_WIDTH / 2 + wallThickness / 2, WALL_HEIGHT / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  worldGroup.add(leftWall);
  
  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, WALL_HEIGHT, STORE_DEPTH),
    wallMaterial
  );
  rightWall.position.set(STORE_WIDTH / 2 - wallThickness / 2, WALL_HEIGHT / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  worldGroup.add(rightWall);
  
  // Front walls
  const frontWallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(STORE_WIDTH / 2 - 6, WALL_HEIGHT * 0.35, wallThickness),
    wallMaterial
  );
  frontWallLeft.position.set(-STORE_WIDTH / 4 - 3, WALL_HEIGHT * 0.175, STORE_DEPTH / 2 - wallThickness / 2);
  frontWallLeft.castShadow = true;
  worldGroup.add(frontWallLeft);
  
  const frontWallRight = new THREE.Mesh(
    new THREE.BoxGeometry(STORE_WIDTH / 2 - 6, WALL_HEIGHT * 0.35, wallThickness),
    wallMaterial
  );
  frontWallRight.position.set(STORE_WIDTH / 4 + 3, WALL_HEIGHT * 0.175, STORE_DEPTH / 2 - wallThickness / 2);
  frontWallRight.castShadow = true;
  worldGroup.add(frontWallRight);
  
  // ============================================
  // Sam's Club Logo (above back wall)
  // ============================================
  const logo = createLogo(assets);
  logo.position.set(0, WALL_HEIGHT + 1.5, -STORE_DEPTH / 2 - 2);
  worldGroup.add(logo);
  
  // ============================================
  // BACK WALL AREA: Single horizontal row of shelves
  // ============================================
  const backRowZ = -STORE_DEPTH / 2 + 4;
  const backShelfCount = 14;
  const backShelfWidth = 4;
  const backShelfGap = 0.5;
  const totalBackWidth = backShelfCount * backShelfWidth + (backShelfCount - 1) * backShelfGap;
  const backStartX = -totalBackWidth / 2 + backShelfWidth / 2;
  
  for (let i = 0; i < backShelfCount; i++) {
    const x = backStartX + i * (backShelfWidth + backShelfGap);
    const shelf = createShelfBlock(backShelfWidth, 2.5, AISLE_SHELF_HEIGHT + 0.5);
    shelf.position.set(x, 0, backRowZ);
    worldGroup.add(shelf);
  }
  
  // ============================================
  // BINS: Row between back shelves and aisle shelves
  // ============================================
  const binRowZ = -STORE_DEPTH / 2 + 9;
  
  // Left side bins (under A-B area)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(-26 + col * 3, 0, binRowZ + row * 3);
      worldGroup.add(bin);
    }
  }
  
  // Center-left bins (under C-D, E-F area)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(-16 + col * 3, 0, binRowZ + row * 3);
      worldGroup.add(bin);
    }
  }
  
  // Center-right bins (under G-H, I-J area)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(6 + col * 3, 0, binRowZ + row * 3);
      worldGroup.add(bin);
    }
  }
  
  // Right side bins (under K-L area) - reduced to 3 columns
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(22 + col * 3, 0, binRowZ + row * 3);
      worldGroup.add(bin);
    }
  }
  
  // ============================================
  // MAIN AISLE SHELVES: 7 pairs (A-B, C-D, E-F, G-H, I-J, K-L, M-N)
  // Gap within pair: 0.25 unit, Gap between pairs: 6 units
  // ============================================
  const mainAisleZ = 5;  // Center Z for main aisle shelves
  const pairGap = 0.25;  // Gap within each pair
  const pairSpacing = 6; // Gap between pairs
  
  // LEFT GROUP: A-B, C-D, E-F (3 pairs) - positioned between left bins and center bins
  const leftGroupStartX = -20;
  
  const abShelves = createAisleShelfPair('A', 'B', leftGroupStartX, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(abShelves);
  shelfMap['A'] = abShelves; shelfMap['B'] = abShelves;
  
  const cdShelves = createAisleShelfPair('C', 'D', leftGroupStartX + pairSpacing, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(cdShelves);
  shelfMap['C'] = cdShelves; shelfMap['D'] = cdShelves;
  
  const efShelves = createAisleShelfPair('E', 'F', leftGroupStartX + pairSpacing * 2, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(efShelves);
  shelfMap['E'] = efShelves; shelfMap['F'] = efShelves;
  
  // CENTER BINS: 2 groups of 2x3 bins between E-F and G-H
  const centerBinZ = mainAisleZ;
  // First bin group
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(-2 + col * 3, 0, centerBinZ - 3 + row * 3);
      worldGroup.add(bin);
    }
  }
  // Second bin group
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(6 + col * 3, 0, centerBinZ - 3 + row * 3);
      worldGroup.add(bin);
    }
  }
  
  // RIGHT GROUP: G-H, I-J, K-L, M-N (4 pairs)
  const rightGroupStartX = 16;
  
  const ghShelves = createAisleShelfPair('G', 'H', rightGroupStartX, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(ghShelves);
  shelfMap['G'] = ghShelves; shelfMap['H'] = ghShelves;
  
  const ijShelves = createAisleShelfPair('I', 'J', rightGroupStartX + pairSpacing, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(ijShelves);
  shelfMap['I'] = ijShelves; shelfMap['J'] = ijShelves;
  
  const klShelves = createAisleShelfPair('K', 'L', rightGroupStartX + pairSpacing * 2, mainAisleZ, 1.3, 16, pairGap);
  worldGroup.add(klShelves);
  shelfMap['K'] = klShelves; shelfMap['L'] = klShelves;
  
  // ============================================
  // LEFT SIDE: Pallet bins (Deli)
  // ============================================
  const leftBinX = -STORE_WIDTH / 2 + 5;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const bin = createShelfBlock(2.5, 2.5, BIN_HEIGHT, BIN_COLOR);
      bin.position.set(leftBinX + col * 3, 0, 8 + row * 3.5);
      worldGroup.add(bin);
    }
  }
  
  // Left side vertical shelf (Dairy)
  const leftVertShelf = createShelfBlock(2.5, 8, AISLE_SHELF_HEIGHT);
  leftVertShelf.position.set(-STORE_WIDTH / 2 + 5, 0, 1);
  worldGroup.add(leftVertShelf);
  
  // RIGHT SIDE: (horizontal shelves removed)
  
  // ============================================
  // BOTTOM: Entrance area shelves
  // ============================================
  const bottomLeftShelf = createShelfBlock(12, 2, BIN_HEIGHT + 0.3);
  bottomLeftShelf.position.set(-18, 0, STORE_DEPTH / 2 - 4);
  worldGroup.add(bottomLeftShelf);
  
  const bottomRightShelf = createShelfBlock(14, 2, BIN_HEIGHT + 0.3);
  bottomRightShelf.position.set(18, 0, STORE_DEPTH / 2 - 4);
  worldGroup.add(bottomRightShelf);
  
  // ============================================
  // NAVIGATION PATHS (flat 2D ribbons, avoid all geometry by ~2 units)
  // ============================================
  
  // Path 1: Simple loop around store perimeter
  const path1Waypoints = [
    { x: -4, z: 26 },      // Start (outside store)
    { x: -4, z: 16 },      // First turn point
    { x: -17, z: 16 },     // Turn into left aisle
    { x: -17, z: -6 },     // Turn at back of store
    { x: 19, z: -6 },      // Across back aisle
    { x: 19, z: 16 },      // Turn down right aisle
    { x: 14, z: 16 },      // Turn toward exit
    { x: 14, z: 21 },      // End (exit)
  ];
  
  // Path 2: Complex zigzag through all aisles
  // Follows description: enters left side, zigzags through shelf gaps,
  // crosses back, zigzags through right side, exits
  const path2Waypoints = [
    // Start and enter store (same as Path 1)
    { x: -4, z: 26 },       // Start (outside)
    { x: -4, z: 16 },       // Enter store
    { x: -17, z: 16 },      // Turn left toward Produce (same as Path 1)
    
    // 3. Turn right between Shelf A and Deli bins
    { x: -24, z: 16 },      // West of Shelf A
    
    // 4. Turn right after Shelf A's end (north end)
    { x: -24, z: -5 },      // Past A's north end
    
    // 5. Turn right down aisle between Shelves B & C
    { x: -17, z: -5 },      // Into B-C gap
    { x: -17, z: 15 },      // South to C's end
    
    // 6. Turn left after Shelf C's end
    // 7. Turn left down aisle between Shelves D & E
    { x: -11, z: 15 },      // East to D-E gap
    { x: -11, z: -5 },      // North through D-E gap
    
    // 8. Turn right after Shelf E's end
    { x: -2, z: -5 },       // East past Electronics
    
    // 9. Turn left after Frozen Food bins
    { x: -2, z: -10 },      // North past Frozen Food
    
    // 10. Turn right before back shelves (Bikes)
    { x: 6, z: -10 },       // East along back
    
    // 11. Turn right before Kid's Clothing bins
    { x: 6, z: -5 },        // South past back bins
    
    // 12. Turn left after Kid's Clothing bins
    { x: 25, z: -5 },       // East to J-K gap area
    
    // 13. Turn right down aisle between Shelves J & K
    { x: 25, z: 15 },       // South through J-K gap
    
    // 14. Turn right after Shelf I's end
    // 15. Turn right down aisle between H & I
    { x: 19, z: 15 },       // West to H-I gap
    { x: 19, z: -5 },       // North through H-I gap
    
    // 16. Turn left after Shelf H's end
    // 17. Turn left down aisle between Ladies' Clothing & Shelf H
    { x: 12, z: -5 },       // West to Ladies'-H gap
    { x: 12, z: 15 },       // South through gap
    
    // 18. Turn left after Shelf H's other end
    { x: 14, z: 15 },       // East toward exit
    
    // 19. Turn right toward exit (same end as Path 1)
    { x: 14, z: 21 },       // Exit
  ];
  
  // Path 3: Start inside store facing West, go through Home aisle,
  // turn left after C10, around Snacks, across back, down Shoes/Seasonal aisle
  const path3Waypoints = [
    // 1. Start inside store pointing West
    { x: -4, z: 16 },       // Start position inside store
    
    // Turn 1: Go West toward B-C aisle
    { x: -17, z: 16 },      // Turn 1 (90°) - turn North
    
    // Turn 2: Go North (up) through B-C aisle
    { x: -17, z: -5 },      // Turn 2 (90°) - turn West toward Dairy
    
    // Turn 3: Go West above Dairy
    { x: -30, z: -5 },      // Turn 3 (90°) - turn North
    
    // Turn 4: Go North past Snacks (moved up 0.5)
    { x: -30, z: -16.5 },   // Turn 4 (90°) - turn East
    
    // Turn 5: Go East along back (moved up 0.5)
    { x: 2, z: -16.5 },     // Turn 5 (90°) - turn South
    
    // Turn 6: Go South past Kid's Clothing
    { x: 2, z: -5 },        // Turn 6 (90°) - turn East
    
    // Turn 7: Go East to Shoes/Seasonal aisle
    { x: 19, z: -5 },       // Turn 7 (90°) - turn South
    
    // End: Go South down Shoes/Seasonal aisle
    { x: 19, z: 18 },       // Stop just before Vision Center
  ];
  
  // Store all path definitions
  const pathDefinitions = {
    path1: path1Waypoints,
    path2: path2Waypoints,
    path3: path3Waypoints
  };
  
  // Create default path curve (Path 3)
  let currentPathId = 'path3';
  let pathCurve = createRoundedPath(path3Waypoints, 3.0);
  
  // Helper function to create ribbon geometry from a path curve
  function createRibbonGeometry(curve) {
    const pathWidth = 0.9;
    const numSamples = 600;
    
    const ribbonVertices = [];
    const ribbonIndices = [];
    const ribbonUVs = [];
    const ribbonProgress = [];
    
    // Use arc-length parameterization for uniform sampling
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      
      // Perpendicular direction (rotate tangent 90 degrees in XZ plane)
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      const left = new THREE.Vector3(
        point.x - perp.x * pathWidth / 2,
        0.02,
        point.z - perp.z * pathWidth / 2
      );
      const right = new THREE.Vector3(
        point.x + perp.x * pathWidth / 2,
        0.02,
        point.z + perp.z * pathWidth / 2
      );
      
      ribbonVertices.push(left.x, left.y, left.z);
      ribbonVertices.push(right.x, right.y, right.z);
      
      ribbonUVs.push(0, t);
      ribbonUVs.push(1, t);
      
      // Progress attribute for shader-based erasure
      ribbonProgress.push(t);
      ribbonProgress.push(t);
      
      if (i < numSamples) {
        const base = i * 2;
        ribbonIndices.push(base, base + 1, base + 2);
        ribbonIndices.push(base + 1, base + 3, base + 2);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUVs, 2));
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(ribbonProgress, 1));
    geometry.setIndex(ribbonIndices);
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  // Create initial ribbon geometry
  const ribbonGeometry = createRibbonGeometry(pathCurve);
  
  // Custom shader material for dynamic path erasure and draw animation
  // Pass color directly as sRGB values (shader outputs directly, no conversion)
  const ribbonMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Vector3(0x00 / 255, 0x62 / 255, 0xAD / 255) },
      uProgress: { value: 0.0 },      // Erasure progress (behind marker)
      uDrawProgress: { value: 0.0 },  // Draw animation progress (0 = hidden, 1 = fully drawn)
      uOpacity: { value: 1.0 },
      uVisible: { value: 0.0 }        // Overall visibility (0 = hidden, 1 = visible)
    },
    vertexShader: `
      attribute float aProgress;
      varying float vProgress;
      
      void main() {
        vProgress = aProgress;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uProgress;
      uniform float uDrawProgress;
      uniform float uOpacity;
      uniform float uVisible;
      varying float vProgress;
      
      void main() {
        // Hide if not visible
        if (uVisible < 0.01) {
          discard;
        }
        
        // Hide path that hasn't been "drawn" yet
        if (vProgress > uDrawProgress + 0.01) {
          discard;
        }
        
        // Hide path behind the marker (erased portion)
        if (vProgress < uProgress - 0.005) {
          discard;
        }
        
        // Smooth fade at draw edge
        float alpha = uOpacity;
        if (vProgress > uDrawProgress - 0.02) {
          alpha *= smoothstep(uDrawProgress + 0.01, uDrawProgress - 0.02, vProgress);
        }
        
        // Smooth fade at erasure edge
        if (vProgress < uProgress + 0.015) {
          alpha *= smoothstep(uProgress - 0.005, uProgress + 0.015, vProgress);
        }
        
        // Output exact sRGB color #0062AD = rgb(0, 98, 173)
        gl_FragColor = vec4(0.0, 0.384, 0.678, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  
  const pathMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
  pathMesh.name = 'NavigationPath';
  worldGroup.add(pathMesh);
  
  // ============================================
  // Shopper Marker (above path, pointing toward path)
  // ============================================
  const shopper = createShopperMarker();
  const startPoint = pathCurve.getPoint(0);
  shopper.position.set(startPoint.x, 0, startPoint.z);
  // Set initial rotation to face West (for Path 3 starting direction)
  shopper.rotation.y = Math.PI / 2;
  worldGroup.add(shopper);
  
  // ============================================
  // SECTION LABELS (floating above bins/shelves)
  // ============================================
  const sectionLabelsGroup = new THREE.Group();
  sectionLabelsGroup.name = 'SectionLabels';
  
  // Section label data: { text, x, z, rotate } - rotate = true for 90 degree rotation
  const sectionLabels = [
    // Row 1: Back wall shelves - down 2 units
    { text: 'Produce', x: -20, z: -19 },
    { text: 'Electronics', x: 0, z: -19 },
    { text: 'Hardware', x: 18, z: -19 },
    
    // Row 2: Bins row - down 2 units
    { text: 'Snacks &\nBeverages', x: -22, z: -12, fontSize: 0.9 },
    { text: 'Frozen Food', x: -11.5, z: -12 },
    { text: "Kid's Clothing", x: 10.5, z: -12 },
    { text: 'Office', x: 24, z: -12 },
    
    // Row 3: Dairy (left wall, rotated)
    { text: 'Dairy', x: -28.5, z: 1, rotate: true },
    
    // Row 4: Deli
    { text: 'Deli', x: -27, z: 12 },
    
    // Row 5: Center bins - Men's left 1
    { text: "Men's\nClothing", x: -0.5, z: 5, fontSize: 0.9 },
    { text: "Ladies'\nClothing", x: 7.5, z: 5, fontSize: 0.9 },
    
    // Aisle shelf pairs (rotated 90°)
    { text: 'Dry Grocery', x: -20, z: 5, rotate: true },
    { text: 'Home', x: -14, z: 5, rotate: true },
    { text: 'Bikes', x: -8, z: 5, rotate: true },
    { text: 'Shoes', x: 16, z: 5, rotate: true },
    { text: 'Seasonal', x: 22, z: 5, rotate: true },
    { text: 'Health & Beauty', x: 28, z: 5, rotate: true },
    
    // Row 6: Bottom entrance area
    { text: 'Checkout', x: -18, z: 19 },
    { text: 'Vision Center', x: 18, z: 19 },
  ];
  
  sectionLabels.forEach(({ text, x, z, rotate, fontSize }) => {
    const label = createSectionLabel(text, fontSize || 1.0);
    label.position.set(x, 4, z);
    if (rotate) {
      label.rotation.z = Math.PI / 2; // Rotate 90 degrees
    }
    sectionLabelsGroup.add(label);
  });
  
  worldGroup.add(sectionLabelsGroup);
  
  // ============================================
  // PINS (location markers with section labels)
  // ============================================
  const pinsGroup = new THREE.Group();
  pinsGroup.name = 'Pins';
  
  // Pin data: { label, x, z, y, hidden, revealAfter }
  // hidden = start hidden (scale 0), revealAfter = which pin triggers reveal
  const pinsData = [
    { label: 'M1', x: -24, z: -19, y: AISLE_SHELF_HEIGHT + 1.5 },  // Produce section back left
    { label: 'C4', x: -15, z: 9, y: BIN_HEIGHT + 1 },  // 8 units above A1, 1 unit right
    { label: 'C10', x: -14, z: -1, y: AISLE_SHELF_HEIGHT + 1 },
    { label: 'N8', x: -5, z: -19, y: AISLE_SHELF_HEIGHT + 1 },  // Electronics section
    { label: 'F7', x: -9, z: -13.5, y: BIN_HEIGHT + 1 },
    { label: 'G4', x: 12, z: -12, y: BIN_HEIGHT + 1 },  // Kid's Clothing area
    { label: 'H20', x: 17, z: 9, y: AISLE_SHELF_HEIGHT + 1 },  // Above H shelf
    { label: 'I9', x: 21, z: 3, y: AISLE_SHELF_HEIGHT + 1 },
  ];
  
  const pinsMap = {};
  pinsData.forEach(({ label, x, z, y, hidden, revealAfter, revealAfterDelay }) => {
    const itemTexture = assets.itemTextures ? assets.itemTextures[label] : null;
    const pin = createPin(label, 4, itemTexture, assets.gsap);
    pin.position.set(x, y, z);
    pin.userData.worldX = x;
    pin.userData.worldZ = z;
    if (hidden) {
      pin.scale.set(0, 0, 0);
      pin.userData.isHidden = true;
    }
    if (revealAfter) {
      pin.userData.revealAfter = revealAfter;
    }
    if (revealAfterDelay) {
      pin.userData.revealAfterDelay = revealAfterDelay;
    }
    pinsGroup.add(pin);
    pinsMap[label] = pin;
  });
  
  worldGroup.add(pinsGroup);
  
  // ============================================
  // Reference Overlay Method
  // ============================================
  let referenceOverlayMesh = null;
  
  scene.showReferenceOverlay = (visible) => {
    if (visible && assets.journeyTexture) {
      if (!referenceOverlayMesh) {
        const overlayGeometry = new THREE.PlaneGeometry(STORE_WIDTH + 10, STORE_DEPTH + 10);
        const overlayMaterial = new THREE.MeshBasicMaterial({
          map: assets.journeyTexture,
          transparent: true,
          opacity: 0.5,
          depthTest: false,
        });
        referenceOverlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
        referenceOverlayMesh.rotation.x = -Math.PI / 2;
        referenceOverlayMesh.position.y = 0.1;
        referenceOverlayMesh.renderOrder = 999;
        worldGroup.add(referenceOverlayMesh);
      }
      referenceOverlayMesh.visible = true;
    } else if (referenceOverlayMesh) {
      referenceOverlayMesh.visible = false;
    }
  };
  
  // ============================================
  // Visibility Toggle Methods
  // ============================================
  scene.toggleSectionLabels = (visible) => {
    sectionLabelsGroup.visible = visible;
  };
  
  scene.togglePins = (visible) => {
    if (visible) {
      pinsGroup.visible = true;
      // Animate each pin with a spring scale (except heart which may already be showing)
      let animIndex = 0;
      pinsGroup.children.forEach((pin) => {
        // Skip the heart pin if it's already visible and scaled
        if (pin.userData.isHeart && pin.visible && pin.scale.x > 0.9) {
          return;
        }
        
        // Make regular pins visible (they may have been hidden by showHeartOnly)
        pin.visible = true;
        
        if (assets.gsap) {
          pin.scale.set(0, 0, 0);
          assets.gsap.to(pin.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.5,
            delay: animIndex * 0.05, // Stagger the animations
            ease: 'elastic.out(1, 0.5)'
          });
          animIndex++;
        }
      });
      
      // Hide the original N8 pin if heart is showing
      if (n8IsHearted && pinsMap['N8']) {
        pinsMap['N8'].visible = false;
      }
    } else {
      pinsGroup.visible = false;
    }
  };
  
  // ============================================
  // Heart Pin Toggle for N8
  // ============================================
  let n8HeartPin = null;
  let n8IsHearted = false;
  
  scene.toggleHeartN8 = () => {
    const n8Pin = pinsMap['N8'];
    if (!n8Pin) return false;
    
    n8IsHearted = !n8IsHearted;
    
    if (n8IsHearted) {
      // Hide regular pin, show heart pin
      n8Pin.visible = false;
      
      if (!n8HeartPin) {
        // Create heart pin at same position using loaded Heart.svg
        n8HeartPin = createHeartPin(5, assets.heartTexture);
        n8HeartPin.position.copy(n8Pin.position);
        n8HeartPin.position.z += 1; // Move down 1 unit
        n8HeartPin.userData.worldX = n8Pin.userData.worldX;
        n8HeartPin.userData.worldZ = n8Pin.userData.worldZ;
        pinsGroup.add(n8HeartPin);
      }
      n8HeartPin.visible = true;
      
      // Bounce animation when hearted
      if (assets.gsap) {
        n8HeartPin.scale.set(0.5, 0.5, 0.5);
        assets.gsap.to(n8HeartPin.scale, {
          x: 1, y: 1, z: 1,
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)'
        });
      }
    } else {
      // Show regular pin, hide heart pin
      n8Pin.visible = true;
      if (n8HeartPin) {
        n8HeartPin.visible = false;
      }
    }
    
    return n8IsHearted;
  };
  
  scene.isN8Hearted = () => n8IsHearted;
  
  // Show just the heart pin even if pins group is hidden
  scene.showHeartOnly = () => {
    if (n8HeartPin) {
      // Temporarily make pins group visible but hide all pins except heart
      pinsGroup.visible = true;
      pinsGroup.children.forEach(pin => {
        if (pin !== n8HeartPin) {
          pin.visible = false;
        }
      });
    }
  };
  
  // ============================================
  // Path Switching Function
  // ============================================
  function switchPath(pathId) {
    if (!pathDefinitions[pathId]) {
      console.warn('Unknown path:', pathId);
      return null;
    }
    
    currentPathId = pathId;
    const waypoints = pathDefinitions[pathId];
    pathCurve = createRoundedPath(waypoints, 3.0);
    
    // Update mesh geometry
    const newGeometry = createRibbonGeometry(pathCurve);
    pathMesh.geometry.dispose();
    pathMesh.geometry = newGeometry;
    
    console.log('Switched to', pathId);
    return pathCurve;
  }
  
  // ============================================
  // Done
  // ============================================
  console.log('store scene created');
  
  return {
    worldGroup,
    pathCurve,
    pathMesh,
    shopper,
    shelfMap,
    sectionLabelsGroup,
    pinsGroup,
    pinsMap,
    pathDefinitions,
    switchPath,
    getCurrentPathCurve: () => pathCurve
  };
}
