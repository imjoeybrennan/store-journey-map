/**
 * Animator module
 * Handles intro transition and journey animations
 */

import * as THREE from 'three';

let animatorState = {
  scene: null,
  camera: null,
  renderer: null,
  worldGroup: null,
  pathCurve: null,
  pathMesh: null,
  shopper: null,
  shelfMap: null,
  pinsGroup: null,
  pinsMap: null,
  gsap: null,
  isPlaying: false,
  progress: 0,
  timeline: null,
  introComplete: false,
  followingMarker: false,
  // Camera animation state
  cameraTarget: new THREE.Vector3(0, 0, 0),
  cameraOffset: new THREE.Vector3(0, 37.5, 30),
  // Pin state tracking
  pinDoneTimers: {},
  // Compass mode: true = North-up (map fixed), false = marker always faces forward
  compassMode: true,
  currentMarkerAngle: 0,
  worldRotation: 0,
  targetWorldRotation: 0,
  // Path visibility
  pathVisible: false,
  pathDrawTimeline: null,
};

// Camera settings for different views
const CAMERA_VIEWS = {
  // Top-down orthographic zenith view (zoomed in 25%, centered)
  zenith: {
    position: { x: 0, y: 90, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    fov: 45,
  },
  // 45-degree isometric follow view (1.5x from original)
  isometric: {
    offsetY: 37.5,    // Height above marker (1.5x of 25)
    offsetZ: 30,      // Distance behind marker (1.5x of 20)
    fov: 50,
  }
};

/**
 * Initialize the animator with scene references
 */
export function initAnimator(config) {
  animatorState = {
    ...animatorState,
    ...config
  };
  
  // Set initial camera to zenith view
  if (animatorState.camera && animatorState.pathCurve) {
    const startPoint = animatorState.pathCurve.getPointAt(0);
    animatorState.cameraTarget.set(startPoint.x, 0, startPoint.z);
  }
  
  // Start delay-based pin reveals on load
  if (animatorState.pinsGroup && animatorState.gsap) {
    animatorState.pinsGroup.children.forEach((pin) => {
      if (pin.userData && pin.userData.revealAfterDelay && pin.userData.isHidden) {
        const delayTimer = setTimeout(() => {
          pin.userData.isHidden = false;
          // Spring animation to reveal
          animatorState.gsap.to(pin.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)'
          });
          // Start item animation if available
          if (pin.userData.startItemAnimation) {
            pin.userData.startItemAnimation();
          }
          console.log(pin.userData.label + ' revealed after ' + pin.userData.revealAfterDelay + 'ms delay');
        }, pin.userData.revealAfterDelay);
        
        // Store timer for cleanup
        animatorState.pinDoneTimers['delay_' + pin.userData.label] = delayTimer;
      }
    });
  }
  
  console.log('Animator initialized');
}

/**
 * Update function called each frame
 */
export function updateAnimator() {
  if (!animatorState.pathCurve || !animatorState.shopper) return;
  
  // Update shopper position along path based on progress
  // Use getPointAt() for arc-length parameterization (uniform speed)
  const point = animatorState.pathCurve.getPointAt(animatorState.progress);
  animatorState.shopper.position.x = point.x;
  animatorState.shopper.position.z = point.z;
  
  // Orient shopper to face direction of travel using arc-length tangent
  if (animatorState.progress < 0.995) {
    // Get tangent at current position for smooth rotation
    const tangent = animatorState.pathCurve.getTangentAt(animatorState.progress);
    const angle = Math.atan2(tangent.x, tangent.z);
    animatorState.currentMarkerAngle = angle;
    animatorState.shopper.rotation.y = angle;
  }
  
  // Compass mode: rotate world so marker always faces forward (up on screen)
  if (animatorState.worldGroup) {
    if (!animatorState.compassMode) {
      // Follow mode: negate the marker angle + 180° so marker points UP (toward top of screen)
      animatorState.targetWorldRotation = -animatorState.currentMarkerAngle + Math.PI;
    } else {
      // Compass/North-up mode: world stays fixed
      animatorState.targetWorldRotation = 0;
    }
    
    // Smoothly interpolate world rotation, taking the shortest path
    // This prevents 360° spins when crossing the ±π boundary
    // Slower factor (0.027) for seamless transition after zenith to 45° change
    const rotationLerpFactor = 0.027;
    let delta = animatorState.targetWorldRotation - animatorState.worldRotation;
    
    // Normalize delta to [-π, π] to always take the shortest rotation path
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    
    animatorState.worldRotation += delta * rotationLerpFactor;
    animatorState.worldGroup.rotation.y = animatorState.worldRotation;
  }
  
  // Update path erasure shader
  if (animatorState.pathMesh && animatorState.pathMesh.material.uniforms) {
    animatorState.pathMesh.material.uniforms.uProgress.value = animatorState.progress;
  }
  
  // If following marker, update camera position smoothly
  if (animatorState.followingMarker && animatorState.camera) {
    // Get marker's world position (accounts for worldGroup rotation)
    const markerWorldPos = new THREE.Vector3();
    animatorState.shopper.getWorldPosition(markerWorldPos);
    
    // Smoothly interpolate camera target to marker world position
    animatorState.cameraTarget.lerp(
      new THREE.Vector3(markerWorldPos.x, 0, markerWorldPos.z),
      0.05
    );
    
    // Camera offset stays fixed - in Follow mode, the world rotates, not the camera
    // This keeps the camera "behind" the marker in screen space
    animatorState.camera.position.x = animatorState.cameraTarget.x + animatorState.cameraOffset.x;
    animatorState.camera.position.y = animatorState.cameraOffset.y;
    animatorState.camera.position.z = animatorState.cameraTarget.z + animatorState.cameraOffset.z;
    
    animatorState.camera.lookAt(animatorState.cameraTarget);
  }
  
  // Billboarding: Make pins always face the camera
  // Must account for worldGroup rotation since pins are children of it
  if (animatorState.pinsGroup && animatorState.camera) {
    // Get the inverse of the worldGroup's rotation to compensate
    const worldQuatInverse = new THREE.Quaternion();
    animatorState.worldGroup.getWorldQuaternion(worldQuatInverse);
    worldQuatInverse.invert();
    
    animatorState.pinsGroup.children.forEach((pin) => {
      if (pin.userData && pin.userData.isBillboard) {
        // Calculate local quaternion that results in facing camera in world space
        // localQuat = worldGroupInverse * cameraQuat
        const localQuat = worldQuatInverse.clone().multiply(animatorState.camera.quaternion);
        pin.quaternion.copy(localQuat);
      }
    });
  }
  
  // Check distance to pins and trigger done state
  if (animatorState.pinsGroup && animatorState.shopper && animatorState.gsap) {
    const shopperX = animatorState.shopper.position.x;
    const shopperZ = animatorState.shopper.position.z;
    
    animatorState.pinsGroup.children.forEach((pin) => {
      if (!pin.userData || pin.userData.isDone || pin.userData.isHidden) return;
      
      const pinX = pin.position.x;
      const pinZ = pin.position.z;
      const dx = shopperX - pinX;
      const dz = shopperZ - pinZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // If within 7 units and not already timing
      if (distance <= 7 && !animatorState.pinDoneTimers[pin.userData.label]) {
        animatorState.pinDoneTimers[pin.userData.label] = setTimeout(() => {
          // Mark as done and swap texture
          pin.userData.isDone = true;
          
          // Get the pin mesh (might be group or direct mesh)
          const pinMesh = pin.userData.pinMesh || pin;
          if (pinMesh.material && pinMesh.userData.doneTexture) {
            pinMesh.material.map = pinMesh.userData.doneTexture;
            pinMesh.material.needsUpdate = true;
          }
          
          // Hide item image when done
          if (pin.userData.itemMesh) {
            pin.userData.itemMesh.material.opacity = 0;
          }
          
          // Subtle bounce animation on done
          animatorState.gsap.fromTo(pin.scale, 
            { x: 1, y: 1, z: 1 },
            { 
              x: 1.15, y: 1.15, z: 1.15, 
              duration: 0.15,
              ease: 'power2.out',
              yoyo: true,
              repeat: 1
            }
          );
          
          console.log('Pin done:', pin.userData.label);
          
          // Check if any hidden pins should be revealed after this pin
          if (animatorState.pinsMap) {
            Object.values(animatorState.pinsMap).forEach((otherPin) => {
              if (otherPin.userData.isHidden && otherPin.userData.revealAfter === pin.userData.label) {
                otherPin.userData.isHidden = false;
                // Spring animation to reveal
                animatorState.gsap.to(otherPin.scale, {
                  x: 1,
                  y: 1,
                  z: 1,
                  duration: 0.6,
                  ease: 'elastic.out(1, 0.5)'
                });
                console.log(otherPin.userData.label + ' revealed after ' + pin.userData.label);
              }
            });
          }
        }, 800);
      }
    });
  }
}

/**
 * Play the intro transition animation
 * Transitions from zenith view to isometric follow view
 * Camera moves like a bird backing away - no Z-axis rotation
 */
export function playIntroTransition(onComplete) {
  if (!animatorState.gsap || !animatorState.camera || !animatorState.shopper) {
    console.warn('Cannot play intro: missing dependencies');
    return;
  }
  
  const gsap = animatorState.gsap;
  const camera = animatorState.camera;
  
  // Get marker starting position (use arc-length parameterization)
  const startPoint = animatorState.pathCurve.getPointAt(0);
  
  console.log('Playing intro transition...');
  
  // Store start and end camera states
  // Start: centered, zoomed in 25%
  const startCamPos = { x: 0, y: 90, z: 0 };
  const endCamPos = { 
    x: startPoint.x, 
    y: CAMERA_VIEWS.isometric.offsetY, 
    z: startPoint.z + CAMERA_VIEWS.isometric.offsetZ 
  };
  
  // Start lookAt centered, end centered on marker
  const startLookAt = { x: 0, y: 0, z: 0 };
  const endLookAt = { x: startPoint.x, y: 0, z: startPoint.z };
  
  // Animation progress object
  const anim = { progress: 0 };
  
  // Create intro timeline
  const introTimeline = gsap.timeline({
    onComplete: () => {
      animatorState.introComplete = true;
      animatorState.followingMarker = true;
      animatorState.cameraOffset.set(0, CAMERA_VIEWS.isometric.offsetY, CAMERA_VIEWS.isometric.offsetZ);
      
      // Set camera target to marker's current world position for seamless handoff
      const markerWorldPos = new THREE.Vector3();
      animatorState.shopper.getWorldPosition(markerWorldPos);
      animatorState.cameraTarget.set(markerWorldPos.x, 0, markerWorldPos.z);
      
      // Also set camera position to match exactly where it should be
      camera.position.x = markerWorldPos.x + animatorState.cameraOffset.x;
      camera.position.y = animatorState.cameraOffset.y;
      camera.position.z = markerWorldPos.z + animatorState.cameraOffset.z;
      camera.lookAt(markerWorldPos.x, 0, markerWorldPos.z);
      
      console.log('Intro transition complete');
      if (onComplete) onComplete();
    }
  });
  
  // Phase 1: Hold on zenith view (0.5s)
  introTimeline.to({}, { duration: 0.5 });
  
  // Phase 2: Smooth transition using single progress value (2.5s)
  // Also transition from North-up to Follow mode
  introTimeline.to(anim, {
    progress: 1,
    duration: 2.5,
    ease: 'power2.inOut',
    onStart: () => {
      // Start transitioning to Follow mode (world will smoothly rotate)
      animatorState.compassMode = false;
    },
    onUpdate: () => {
      const t = anim.progress;
      
      // Get marker's current world position (accounts for world rotation in Follow mode)
      const markerWorldPos = new THREE.Vector3();
      animatorState.shopper.getWorldPosition(markerWorldPos);
      
      // Interpolate end position to marker's world position for smooth tracking
      const currentEndPos = {
        x: markerWorldPos.x,
        y: CAMERA_VIEWS.isometric.offsetY,
        z: markerWorldPos.z + CAMERA_VIEWS.isometric.offsetZ
      };
      const currentEndLookAt = {
        x: markerWorldPos.x,
        y: 0,
        z: markerWorldPos.z
      };
      
      // Interpolate camera position
      camera.position.x = startCamPos.x + (currentEndPos.x - startCamPos.x) * t;
      camera.position.y = startCamPos.y + (currentEndPos.y - startCamPos.y) * t;
      camera.position.z = startCamPos.z + (currentEndPos.z - startCamPos.z) * t;
      
      // Interpolate look-at target
      const lookX = startLookAt.x + (currentEndLookAt.x - startLookAt.x) * t;
      const lookY = startLookAt.y + (currentEndLookAt.y - startLookAt.y) * t;
      const lookZ = startLookAt.z + (currentEndLookAt.z - startLookAt.z) * t;
      
      // Apply lookAt with consistent up vector to prevent Z rotation
      camera.up.set(0, 1, 0);
      camera.lookAt(lookX, lookY, lookZ);
    }
  });
  
  return introTimeline;
}

/**
 * Set camera to initial zenith (top-down) view
 */
export function setCameraToZenith() {
  if (!animatorState.camera) return;
  
  const camera = animatorState.camera;
  
  // Set up vector first to ensure consistent orientation
  camera.up.set(0, 0, -1); // For top-down, "up" is toward -Z (back of store)
  
  camera.position.set(0, 90, 0); // Centered, zoomed in 25%
  camera.lookAt(0, 0, 0);
  
  // Now reset up vector for the transition
  camera.up.set(0, 1, 0);
  
  animatorState.cameraOffset.set(0, 120, 15);
  animatorState.cameraTarget.set(0, 0, 0);
  animatorState.followingMarker = false;
  animatorState.introComplete = false;
  
  console.log('Camera set to zenith view');
}

/**
 * Start the full animation sequence (intro + journey)
 */
export function startFullAnimation() {
  // First set camera to zenith
  setCameraToZenith();
  
  // Reset progress
  animatorState.progress = 0;
  
  // Play intro, then start journey
  playIntroTransition(() => {
    // Small delay before starting journey
    setTimeout(() => {
      playJourney();
    }, 500);
  });
}

/**
 * Start the shopper journey animation
 * Uses linear motion with ease-out at start and ease-in at end
 * Duration scales with path length for consistent speed
 */
export function playJourney() {
  if (!animatorState.pathCurve || !animatorState.shopper || !animatorState.gsap) {
    console.warn('Cannot play journey: missing path, shopper, or gsap');
    return;
  }
  
  if (animatorState.timeline) {
    animatorState.timeline.kill();
  }
  
  animatorState.isPlaying = true;
  console.log('Journey started');
  
  // Calculate path length and scale duration for consistent speed
  const pathLength = animatorState.pathCurve.getLength();
  const baseSpeed = 2.5; // Units per second (slower pace)
  const totalDuration = pathLength / baseSpeed;
  const easeDuration = Math.min(1.5, totalDuration * 0.05); // Scale ease with duration
  
  console.log('Path length:', pathLength.toFixed(1), 'Duration:', totalDuration.toFixed(1) + 's');
  
  animatorState.timeline = animatorState.gsap.timeline({
    onComplete: () => {
      animatorState.isPlaying = false;
      console.log('Journey complete');
    }
  });
  
  // Calculate progress breakpoints for easing sections
  const easeOutEnd = easeDuration / totalDuration; // ~0.075
  const easeInStart = 1 - (easeDuration / totalDuration); // ~0.925
  
  // Phase 1: Ease out from start (accelerate)
  animatorState.timeline.to(animatorState, {
    progress: easeOutEnd,
    duration: easeDuration,
    ease: 'power2.out'
  });
  
  // Phase 2: Linear motion through middle
  animatorState.timeline.to(animatorState, {
    progress: easeInStart,
    duration: totalDuration - (easeDuration * 2),
    ease: 'none'
  });
  
  // Phase 3: Ease in to end (decelerate)
  animatorState.timeline.to(animatorState, {
    progress: 1,
    duration: easeDuration,
    ease: 'power2.in'
  });
}

/**
 * Pause the journey animation
 */
export function pauseJourney() {
  if (animatorState.timeline) {
    animatorState.timeline.pause();
  }
  animatorState.isPlaying = false;
  console.log('Journey paused');
}

/**
 * Resume the journey animation
 */
export function resumeJourney() {
  if (animatorState.timeline) {
    animatorState.timeline.resume();
  }
  animatorState.isPlaying = true;
  console.log('Journey resumed');
}

/**
 * Reset everything to beginning
 */
export function resetJourney() {
  if (animatorState.timeline) {
    animatorState.timeline.kill();
    animatorState.timeline = null;
  }
  
  animatorState.isPlaying = false;
  animatorState.progress = 0;
  animatorState.introComplete = false;
  animatorState.followingMarker = false;
  animatorState.compassMode = true; // Reset to North-up
  
  // Reset world rotation
  animatorState.worldRotation = 0;
  animatorState.targetWorldRotation = 0;
  animatorState.currentMarkerAngle = 0;
  if (animatorState.worldGroup) {
    animatorState.worldGroup.rotation.y = 0;
  }
  
  if (animatorState.pathCurve && animatorState.shopper) {
    const startPoint = animatorState.pathCurve.getPointAt(0);
    animatorState.shopper.position.set(startPoint.x, 0, startPoint.z);
    animatorState.shopper.rotation.y = 0;
  }
  
  // Reset path visibility
  if (animatorState.pathMesh && animatorState.pathMesh.material.uniforms) {
    animatorState.pathMesh.material.uniforms.uProgress.value = 0;
  }
  
  // Reset pin states
  if (animatorState.pinsGroup) {
    animatorState.pinsGroup.children.forEach((pin) => {
      if (pin.userData) {
        // Reset to normal texture
        const pinMesh = pin.userData.pinMesh || pin;
        if (pinMesh.userData && pinMesh.userData.normalTexture) {
          pin.userData.isDone = false;
          pinMesh.material.map = pinMesh.userData.normalTexture;
          pinMesh.material.needsUpdate = true;
        }
        // Reset pins with revealAfter or revealAfterDelay to hidden
        if (pin.userData.revealAfter || pin.userData.revealAfterDelay) {
          pin.scale.set(0, 0, 0);
          pin.userData.isHidden = true;
        }
        // Restart item animation if available
        if (pin.userData.startItemAnimation && !pin.userData.isHidden) {
          pin.userData.startItemAnimation();
        }
      }
    });
  }
  
  // Clear pin done timers
  Object.values(animatorState.pinDoneTimers).forEach(timer => clearTimeout(timer));
  animatorState.pinDoneTimers = {};
  
  setCameraToZenith();
  
  console.log('Journey reset');
}

/**
 * Set journey progress manually (0 to 1)
 */
export function setProgress(progress) {
  animatorState.progress = Math.max(0, Math.min(1, progress));
}

/**
 * Get current animator state
 */
export function getAnimatorState() {
  return {
    isPlaying: animatorState.isPlaying,
    progress: animatorState.progress,
    introComplete: animatorState.introComplete,
    followingMarker: animatorState.followingMarker,
    compassMode: animatorState.compassMode
  };
}

/**
 * Toggle compass mode
 * @param {boolean} enabled - true = North-up (map fixed), false = marker always faces forward
 */
export function setCompassMode(enabled) {
  animatorState.compassMode = enabled;
  console.log('Compass mode:', enabled ? 'ON (North-up)' : 'OFF (marker forward)');
}

/**
 * Get compass mode state
 */
export function getCompassMode() {
  return animatorState.compassMode;
}

/**
 * Set path visibility with draw animation
 * @param {boolean} visible - true to show (with draw animation), false to hide instantly
 */
export function setPathVisible(visible) {
  if (!animatorState.pathMesh || !animatorState.pathMesh.material.uniforms) {
    console.warn('Cannot set path visibility: path not initialized');
    return;
  }
  
  const uniforms = animatorState.pathMesh.material.uniforms;
  
  // Kill any existing animation
  if (animatorState.pathDrawTimeline) {
    animatorState.pathDrawTimeline.kill();
    animatorState.pathDrawTimeline = null;
  }
  
  animatorState.pathVisible = visible;
  
  if (visible) {
    // Show path with draw animation from start to end
    uniforms.uVisible.value = 1.0;
    uniforms.uDrawProgress.value = 0.0;
    
    if (animatorState.gsap) {
      animatorState.pathDrawTimeline = animatorState.gsap.to(uniforms.uDrawProgress, {
        value: 1.0,
        duration: 1.5,
        ease: 'power2.out',
        onComplete: () => {
          animatorState.pathDrawTimeline = null;
        }
      });
    } else {
      uniforms.uDrawProgress.value = 1.0;
    }
    console.log('Path: showing with draw animation');
  } else {
    // Hide path instantly
    uniforms.uVisible.value = 0.0;
    uniforms.uDrawProgress.value = 0.0;
    console.log('Path: hidden');
  }
}

/**
 * Get path visibility state
 */
export function getPathVisible() {
  return animatorState.pathVisible;
}

/**
 * Switch to a different path
 * @param {string} pathId - 'path1', 'path2', etc.
 * @param {Function} switchPathFn - Function from scene to switch the path geometry
 */
export function switchPath(pathId, switchPathFn) {
  if (!switchPathFn) {
    console.warn('switchPath function not provided');
    return;
  }
  
  // Switch the path geometry and get the new curve
  const newCurve = switchPathFn(pathId);
  if (newCurve) {
    animatorState.pathCurve = newCurve;
    
    // Reset progress to start
    animatorState.progress = 0;
    
    // Update shopper position to start of new path
    if (animatorState.shopper) {
      const startPoint = newCurve.getPointAt(0);
      animatorState.shopper.position.set(startPoint.x, 0, startPoint.z);
      animatorState.shopper.rotation.y = 0;
    }
    
    // Reset path shader progress
    if (animatorState.pathMesh && animatorState.pathMesh.material.uniforms) {
      animatorState.pathMesh.material.uniforms.uProgress.value = 0;
    }
    
    console.log('Animator switched to', pathId);
  }
}

/**
 * Get the path curve reference
 */
export function getPathCurve() {
  return animatorState.pathCurve;
}
