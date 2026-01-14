# Three.js Store Journey

A single-page Three.js visualization of a shopper's journey through a store.

## Project Structure

```
├── index.html          # Main HTML entry point
├── src/
│   ├── main.js         # Renderer, scene, camera setup
│   ├── scene.js        # Store geometry and objects
│   ├── animator.js     # Animation and tween controls
│   └── ui.js           # UI components
├── assets/
│   ├── Start.png       # Starting position reference
│   ├── End.png         # Ending position reference
│   └── Story Journey.png  # Full journey reference
└── README.md
```

## Run Instructions

Start a local HTTP server from the project root:

```bash
python -m http.server 8000
```

Then open your browser to: [http://localhost:8000](http://localhost:8000)

## Controls

- **R key**: Toggle reference image overlay (for alignment/tracing)

## Dependencies

All dependencies are loaded via unpkg CDN (no build step required):

- [Three.js](https://threejs.org/) v0.160.0 - 3D rendering
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) - Camera controls
- [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) - 3D model loading
- [GSAP](https://greensock.com/gsap/) v3.12.4 - Animation tweening

## Development

The project uses ES modules with an import map. No build step is required - simply edit the source files and refresh your browser.

### Reference Overlay

Press `R` to toggle the reference image overlay. This allows you to trace and align geometry to match the design mockups in the `assets/` folder.
