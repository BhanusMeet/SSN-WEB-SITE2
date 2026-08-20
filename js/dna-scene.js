/* ============================================
   SSN ELITE — Real-time 3D DNA Engine & WebGL Scroll Controller
   Powered by Three.js
   ============================================ */

class SSNDNAScene {
  constructor() {
    this.canvas = document.getElementById('dna-canvas');
    if (!this.canvas) return;

    this.container = document.body;
    this.overlayContainer = document.getElementById('dna-overlay-layer');
    if (!this.overlayContainer) {
      this.overlayContainer = document.createElement('div');
      this.overlayContainer.id = 'dna-overlay-layer';
      document.body.appendChild(this.overlayContainer);
    }

    // Colors
    this.themeColors = {
      blue: { primary: 0x0A2FFF, glow: 0x3D5AFF, secondary: 0xFFFFFF },
      purple: { primary: 0x7C3AED, glow: 0x9F67FF, secondary: 0xFFFFFF },
      green: { primary: 0x059669, glow: 0x34D399, secondary: 0xFFFFFF },
      amber: { primary: 0xD97706, glow: 0xFBBF24, secondary: 0xFFFFFF }
    };
    this.currentTheme = this.canvas.dataset.theme || 'blue';
    this.activeColors = this.themeColors[this.currentTheme] || this.themeColors.blue;

    // Scroll state & smooth lerp targets
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;

    // Node Callout Definitions
    this.nodes = [
      { id: 'wpc', labelCode: 'MOL-01 // SOURCE', labelTitle: 'WHEY PROTEIN CONCENTRATE', strandIndex: 6, step: 0.15 },
      { id: 'protein', labelCode: 'MOL-02 // MATRIX', labelTitle: '24G PROTEIN / SERVING', strandIndex: 14, step: 0.32 },
      { id: 'bcaa', labelCode: 'MOL-03 // AMINO', labelTitle: 'BCAA + SILK AMINO BLEND', strandIndex: 22, step: 0.48 },
      { id: 'eaa', labelCode: 'MOL-04 // ESSENTIAL', labelTitle: 'EAA & SILK AMINO COMPLEX', strandIndex: 30, step: 0.62 },
      { id: 'glutamine', labelCode: 'MOL-05 // RECOVERY', labelTitle: 'GLUTAMINE + DIGESTIVE ENZYMES', strandIndex: 38, step: 0.80 }
    ];

    this.initScene();
    this.buildDNAStructure();
    this.buildNodeMarkers();
    this.bindEvents();
    this.animate();
  }

  initScene() {
    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    // 3. Scene Setup
    this.scene = new THREE.Scene();

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(20, 40, 30);
    this.scene.add(mainLight);

    const blueLight = new THREE.PointLight(this.activeColors.primary, 3, 50);
    blueLight.position.set(-10, 10, 15);
    this.scene.add(blueLight);

    const rimLight = new THREE.PointLight(0xffffff, 2, 40);
    rimLight.position.set(15, -20, -10);
    this.scene.add(rimLight);

    // Dynamic stage group
    this.dnaGroup = new THREE.Group();
    this.scene.add(this.dnaGroup);
  }

  buildDNAStructure() {
    const isMobile = window.innerWidth <= 768;
    this.numPairs = isMobile ? 36 : 52;
    this.helixRadius = 3.5;
    this.helixHeight = 48;
    this.turns = 3.5;

    // Materials
    this.sphereMat1 = new THREE.MeshPhongMaterial({
      color: this.activeColors.primary,
      emissive: this.activeColors.primary,
      emissiveIntensity: 0.3,
      shininess: 90,
      specular: 0xffffff
    });

    this.sphereMat2 = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1
    });

    this.rungMat = new THREE.MeshStandardMaterial({
      color: 0xE0E0EC,
      roughness: 0.3,
      transparent: true,
      opacity: 0.6
    });

    this.glowNodeMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: this.activeColors.primary,
      emissiveIntensity: 0.8,
      shininess: 100
    });

    const sphereGeom = new THREE.SphereGeometry(0.38, 16, 16);
    const rungGeom = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);

    this.strand1Nodes = [];
    this.strand2Nodes = [];

    // Construct Double Helix Nodes & Cross Rungs
    for (let i = 0; i < this.numPairs; i++) {
      const progress = i / (this.numPairs - 1);
      const angle = progress * Math.PI * 2 * this.turns;
      const y = (progress - 0.5) * this.helixHeight;

      const x1 = Math.cos(angle) * this.helixRadius;
      const z1 = Math.sin(angle) * this.helixRadius;

      const x2 = Math.cos(angle + Math.PI) * this.helixRadius;
      const z2 = Math.sin(angle + Math.PI) * this.helixRadius;

      // Strand 1 Sphere
      const mesh1 = new THREE.Mesh(sphereGeom, i % 3 === 0 ? this.glowNodeMat : this.sphereMat1);
      mesh1.position.set(x1, y, z1);
      this.dnaGroup.add(mesh1);
      this.strand1Nodes.push(mesh1);

      // Strand 2 Sphere
      const mesh2 = new THREE.Mesh(sphereGeom, this.sphereMat2);
      mesh2.position.set(x2, y, z2);
      this.dnaGroup.add(mesh2);
      this.strand2Nodes.push(mesh2);

      // Connecting Rung
      const rung = new THREE.Mesh(rungGeom, this.rungMat);
      const p1 = new THREE.Vector3(x1, y, z1);
      const p2 = new THREE.Vector3(x2, y, z2);
      const distance = p1.distanceTo(p2);

      rung.scale.set(1, distance, 1);
      rung.position.copy(p1.clone().add(p2).multiplyScalar(0.5));
      rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      this.dnaGroup.add(rung);
    }

    // Molecular Ambient Particle Cloud
    this.buildParticleCloud();
  }

  buildParticleCloud() {
    const particleCount = window.innerWidth <= 768 ? 120 : 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      scales[i] = Math.random() * 0.15 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMaterial = new THREE.PointsMaterial({
      color: this.activeColors.primary,
      size: 0.25,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, pMaterial);
    this.dnaGroup.add(this.particles);
  }

  buildNodeMarkers() {
    this.overlayContainer.innerHTML = '';
    this.nodeElements = [];

    this.nodes.forEach(node => {
      const el = document.createElement('div');
      el.className = 'dna-node-marker';
      el.dataset.id = node.id;
      el.dataset.theme = this.currentTheme;

      const dot = document.createElement('div');
      dot.className = 'dna-node-dot';

      const tag = document.createElement('div');
      tag.className = 'dna-node-tag';

      const code = document.createElement('span');
      code.className = 'dna-node-tag-code';
      code.textContent = node.labelCode;

      const title = document.createElement('span');
      title.className = 'dna-node-tag-title';
      title.textContent = node.labelTitle;

      tag.appendChild(code);
      tag.appendChild(title);
      el.appendChild(dot);
      el.appendChild(tag);

      this.overlayContainer.appendChild(el);
      this.nodeElements.push({ data: node, element: el });
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onWindowResize(), { passive: true });
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.onScroll();
  }

  onScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.targetScrollProgress = Math.min(1, Math.max(0, scrollY / maxScroll));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Smooth scroll interpolation (Lerp)
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.06;

    const p = this.scrollProgress;

    // ── SCROLL-DRIVEN CAMERA MOTION PATH ──
    // Continuous dynamic 3D journey through the structure
    const isMobile = window.innerWidth <= 768;

    // Orbital distance, height, and side movement along scroll
    const radius = isMobile ? (14 + Math.sin(p * Math.PI * 2) * 4) : (11 + Math.sin(p * Math.PI * 3) * 3);
    const cameraAngle = p * Math.PI * 4; // 2 full revolutions as user scrolls top to bottom
    const cameraY = (0.5 - p) * 36 + Math.sin(p * Math.PI * 2) * 4;
    const cameraX = Math.cos(cameraAngle) * radius + (Math.sin(p * Math.PI) * (isMobile ? 1 : 4));
    const cameraZ = Math.sin(cameraAngle) * radius;

    this.camera.position.set(cameraX, cameraY, cameraZ);
    this.cameraTarget.set(0, (0.5 - p) * 30, 0);
    this.camera.lookAt(this.cameraTarget);

    // ── DNA GROUP ROTATION & FLEX ──
    this.dnaGroup.rotation.y = p * Math.PI * 3;
    this.dnaGroup.rotation.z = Math.sin(p * Math.PI * 2) * 0.2;

    if (this.particles) {
      this.particles.rotation.y = p * 0.5;
    }

    // ── UPDATE NODE MARKER PROJECTIONS ──
    this.updateNodeProjections();

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateNodeProjections() {
    const tempVec = new THREE.Vector3();

    this.nodeElements.forEach(item => {
      const nodeData = item.data;
      const el = item.element;

      // Select corresponding 3D node mesh from strand
      const targetMesh = this.strand1Nodes[nodeData.strandIndex];
      if (!targetMesh) return;

      // Get world position of 3D node
      targetMesh.getWorldPosition(tempVec);

      // Check distance to scroll keyframe step
      const stepDiff = Math.abs(this.scrollProgress - nodeData.step);
      const isVisibleStep = stepDiff < 0.12;

      // Project 3D coordinate to 2D screen coordinate
      tempVec.project(this.camera);

      // Verify node is inside front frustum clip plane (-1 to 1)
      const isInsideView = tempVec.z < 1 && Math.abs(tempVec.x) < 1.1 && Math.abs(tempVec.y) < 1.1;

      if (isVisibleStep && isInsideView) {
        const x = (tempVec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-tempVec.y * 0.5 + 0.5) * window.innerHeight;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Add canvas element dynamically if not present
  if (!document.getElementById('dna-canvas')) {
    const canvas = document.createElement('canvas');
    canvas.id = 'dna-canvas';
    document.body.prepend(canvas);
  }

  window.ssnDNAScene = new SSNDNAScene();
});
