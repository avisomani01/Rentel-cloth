import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';

// Three.js Imports
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// GSAP Imports
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const DressShowcase = () => {
  const { dressId } = useParams();
  const navigate = useNavigate();
  const [dress, setDress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Keep references to clean up in useEffect return
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const dressGroupRef = useRef(null);
  const lightsRef = useRef({});
  const scrollTriggerRef = useRef(null);

  // Fetch dress details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/dresses/${dressId}`);
        if (response.data.success) {
          setDress(response.data.data);
        } else {
          setError(response.data.message || 'Garment details not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading garment details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [dressId]);

  // Synchronize CSS attributes with local state theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Three.js scene setup and rendering
  useEffect(() => {
    if (loading || error || !dress || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene & Renderer setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // 2. Camera setup
    const cameraTarget = new THREE.Vector3(0, 0.1, 0);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.1, 3.8);
    camera.lookAt(cameraTarget);
    cameraRef.current = camera;

    // 3. Group for model orientation
    const dressGroup = new THREE.Group();
    scene.add(dressGroup);
    dressGroupRef.current = dressGroup;

    // 4. Lights config
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.4 : 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, theme === 'dark' ? 1.4 : 1.1);
    dirLight1.position.set(5, 5, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.bias = -0.001;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe8f4ff, theme === 'dark' ? 1.0 : 0.6);
    dirLight2.position.set(-5, 3, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xfff0dd, theme === 'dark' ? 1.8 : 1.2, 10);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);

    lightsRef.current = { ambientLight, dirLight1, dirLight2, pointLight };

    // 5. Drop shadow plane
    const shadowGeo = new THREE.PlaneGeometry(3, 3);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext('2d');
    const gradient = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowCtx.fillStyle = gradient;
    shadowCtx.fillRect(0, 0, 128, 128);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.15;
    scene.add(shadowMesh);

    // Color shift helper mapping for css filters
    const parseCssFilterForColor = () => {
      if (!dress.css_filter) return 0;
      const match = dress.css_filter.match(/hue-rotate\((-?\d+)deg\)/);
      return match ? parseInt(match[1]) : 0;
    };

    const applyHueShiftToColor = (hexColor, hueDegrees) => {
      const color = new THREE.Color(hexColor);
      const hsl = {};
      color.getHSL(hsl);
      let newHue = (hsl.h + (hueDegrees / 360)) % 1.0;
      if (newHue < 0) newHue += 1.0;
      color.setHSL(newHue, hsl.s, hsl.l);
      return color;
    };

    // Procedural fallback construction
    const buildProceduralDress = () => {
      const modelGroup = new THREE.Group();

      // Brass metal stand parts
      const brassMat = new THREE.MeshPhysicalMaterial({
        color: 0xd4af37,
        roughness: 0.12,
        metalness: 0.9,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1
      });

      const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.05, 32);
      const standBase = new THREE.Mesh(baseGeo, brassMat);
      standBase.position.y = -1.1;
      standBase.castShadow = true;
      standBase.receiveShadow = true;
      modelGroup.add(standBase);

      const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.1, 16);
      const standPole = new THREE.Mesh(poleGeo, brassMat);
      standPole.position.y = 0.0;
      standPole.castShadow = true;
      modelGroup.add(standPole);

      const hangerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 16);
      const standHanger = new THREE.Mesh(hangerGeo, brassMat);
      standHanger.rotation.z = Math.PI / 2;
      standHanger.position.y = 0.85;
      standHanger.castShadow = true;
      modelGroup.add(standHanger);

      // Mannequin Torso core
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0x1c1b22,
        roughness: 0.4,
        metalness: 0.2,
        clearcoat: 0.1
      });
      const torsoGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.6, 24);
      const torso = new THREE.Mesh(torsoGeo, bodyMat);
      torso.position.y = 0.55;
      torso.castShadow = true;
      modelGroup.add(torso);

      const bustGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const bust = new THREE.Mesh(bustGeo, bodyMat);
      bust.scale.set(1, 0.8, 1.1);
      bust.position.set(0, 0.72, 0.02);
      bust.castShadow = true;
      modelGroup.add(bust);

      // Cascading gown mesh
      let baseHexColor = 0xd4af37;
      const hueShift = parseCssFilterForColor();
      if (hueShift !== 0) {
        baseHexColor = applyHueShiftToColor(baseHexColor, hueShift).getHex();
      } else {
        const name = dress.name.toLowerCase();
        if (name.includes('hybrid')) baseHexColor = 0x0f1c3f;
        else if (name.includes('emerald')) baseHexColor = 0x097969;
        else if (name.includes('midnight') || name.includes('indigo') || name.includes('sapphire')) baseHexColor = 0x1d2951;
        else if (name.includes('crimson') || name.includes('ruby')) baseHexColor = 0x9b111e;
        else if (name.includes('rose')) baseHexColor = 0xb76e79;
        else if (name.includes('charcoal')) baseHexColor = 0x36454f;
      }

      const dressMat = new THREE.MeshPhysicalMaterial({
        color: baseHexColor,
        roughness: 0.22,
        metalness: 0.1,
        clearcoat: 0.4,
        sheen: 1.0,
        sheenRoughness: 0.4,
        sheenColor: 0xffffff,
        side: THREE.DoubleSide
      });

      const skirtGeom = new THREE.CylinderGeometry(0.13, 0.95, 1.6, 64, 40, true);
      const pos = skirtGeom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const angle = Math.atan2(z, x);
        const currentRadius = Math.sqrt(x*x + z*z);
        const heightFactor = (0.8 - y) / 1.6;
        const wave = Math.sin(angle * 12 + y * 2) * 0.09 * heightFactor;
        const newRadius = currentRadius + wave;
        pos.setX(i, Math.cos(angle) * newRadius);
        pos.setZ(i, Math.sin(angle) * newRadius);
      }
      skirtGeom.computeVertexNormals();

      const skirtMesh = new THREE.Mesh(skirtGeom, dressMat);
      skirtMesh.position.y = -0.15;
      skirtMesh.castShadow = true;
      skirtMesh.receiveShadow = true;
      modelGroup.add(skirtMesh);

      const bodiceGeom = new THREE.CylinderGeometry(0.18, 0.14, 0.45, 32, 10, true);
      const posBodice = bodiceGeom.attributes.position;
      for (let i = 0; i < posBodice.count; i++) {
        const x = posBodice.getX(i);
        const y = posBodice.getY(i);
        const z = posBodice.getZ(i);
        const angle = Math.atan2(z, x);
        const currentRadius = Math.sqrt(x*x + z*z);
        const corsetDetail = Math.sin(angle * 16) * 0.008;
        const newRadius = currentRadius + corsetDetail;
        posBodice.setX(i, Math.cos(angle) * newRadius);
        posBodice.setZ(i, Math.sin(angle) * newRadius);
      }
      bodiceGeom.computeVertexNormals();

      const bodiceMesh = new THREE.Mesh(bodiceGeom, dressMat);
      bodiceMesh.position.y = 0.58;
      bodiceMesh.castShadow = true;
      modelGroup.add(bodiceMesh);

      // Check for hybrid tuxedo gown details
      const nameLower = dress.name.toLowerCase();
      if (nameLower.includes('hybrid') || nameLower.includes('tuxedo')) {
        const shirtMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3 });
        const shirtGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.35, 16, 1, false, -Math.PI/4, Math.PI/2);
        const shirt = new THREE.Mesh(shirtGeo, shirtMat);
        shirt.position.set(0, 0.62, 0.05);
        modelGroup.add(shirt);
        
        const tieMat = new THREE.MeshPhysicalMaterial({ color: 0x080f25, roughness: 0.4 });
        const tieGeo = new THREE.BoxGeometry(0.12, 0.04, 0.03);
        const bowTie = new THREE.Mesh(tieGeo, tieMat);
        bowTie.position.set(0, 0.76, 0.16);
        modelGroup.add(bowTie);
        
        const innerGoldMat = new THREE.MeshPhysicalMaterial({
          color: 0xd4af37,
          metalness: 0.85,
          roughness: 0.2,
          side: THREE.BackSide
        });
        const innerGoldSkirt = new THREE.Mesh(skirtGeom, innerGoldMat);
        innerGoldSkirt.position.y = -0.15;
        innerGoldSkirt.scale.set(0.98, 0.98, 0.98);
        modelGroup.add(innerGoldSkirt);
      }

      const beltGeom = new THREE.TorusGeometry(0.142, 0.015, 16, 40);
      const belt = new THREE.Mesh(beltGeom, brassMat);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.38;
      belt.scale.set(1.0, 1.1, 1.0);
      modelGroup.add(belt);

      dressGroup.add(modelGroup);
    };

    // Load actual asset with GLTFLoader
    const loader = new GLTFLoader();
    loader.load(
      '/models/Corset.glb',
      (gltf) => {
        const loadedModel = gltf.scene;

        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        loadedModel.position.x += (loadedModel.position.x - center.x);
        loadedModel.position.y += (loadedModel.position.y - center.y);
        loadedModel.position.z += (loadedModel.position.z - center.z);

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetHeight = 1.8;
        const scaleFactor = targetHeight / maxDim;
        loadedModel.scale.setScalar(scaleFactor);

        const scaledBox = new THREE.Box3().setFromObject(loadedModel);
        const bottomY = scaledBox.min.y;
        loadedModel.position.y -= (bottomY + 1.0);

        const hueShift = parseCssFilterForColor();
        loadedModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              if (hueShift !== 0 && child.material.color) {
                child.material.color = applyHueShiftToColor(child.material.color.getHex(), hueShift);
              }
              child.material.roughness = 0.35;
              child.material.metalness = 0.15;
              if (child.material.isMeshStandardMaterial) {
                child.material.sheen = 1.0;
                child.material.sheenRoughness = 0.4;
                child.material.sheenColor = new THREE.Color(0xd4af37);
              }
            }
          }
        });

        dressGroup.add(loadedModel);
        setupGSAP();
      },
      undefined,
      (err) => {
        console.warn("GLTF loader failed. Generating procedural fallback dress: ", err);
        buildProceduralDress();
        setupGSAP();
      }
    );

    // Setup GSAP scroll timeline
    const setupGSAP = () => {
      gsap.set(dressGroup.rotation, { y: 0.2 });
      gsap.set(camera.position, { x: 0, y: 0.1, z: 3.8 });
      cameraTarget.set(0, 0.1, 0);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".scroll-wrapper",
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
          invalidateOnRefresh: true
        }
      });
      scrollTriggerRef.current = tl;

      tl
        // 1. Neckline Close-up
        .to(camera.position, { x: 0.3, y: 0.6, z: 1.5, duration: 1.5 })
        .to(cameraTarget, { x: 0, y: 0.65, z: 0, duration: 1.5 }, "<")
        .to(dressGroup.rotation, { y: Math.PI * 0.4, duration: 1.5 }, "<")

        // 2. Waist Close-up
        .to(camera.position, { x: -0.4, y: 0.2, z: 1.5, duration: 2.0 })
        .to(cameraTarget, { x: 0, y: 0.25, z: 0, duration: 2.0 }, "<")
        .to(dressGroup.rotation, { y: Math.PI * 1.1, duration: 2.0 }, "<")

        // 3. Hem Focus
        .to(camera.position, { x: 0.0, y: -0.6, z: 1.6, duration: 2.0 })
        .to(cameraTarget, { x: 0, y: -0.55, z: 0, duration: 2.0 }, "<")
        .to(dressGroup.rotation, { y: Math.PI * 1.7, duration: 2.0 }, "<")

        // 4. Zoom out CTA
        .to(camera.position, { x: 0.0, y: 0.0, z: 3.5, duration: 1.8 })
        .to(cameraTarget, { x: 0, y: 0.0, z: 0, duration: 1.8 }, "<")
        .to(dressGroup.rotation, { y: Math.PI * 2.2, duration: 1.8 }, "<");
    };

    // Render loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      camera.lookAt(cameraTarget);
      
      const time = Date.now() * 0.001;
      dressGroup.position.y = Math.sin(time) * 0.03;
      
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup logic
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      
      // Kill ScrollTrigger
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.scrollTrigger?.kill();
        scrollTriggerRef.current.kill();
      }

      // Dispose Three assets to free memory
      scene.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      });
      
      renderer.dispose();
    };
  }, [loading, error, dress]);

  // Adjust lights when local theme switches
  useEffect(() => {
    const lights = lightsRef.current;
    if (!lights.ambientLight) return;
    
    if (theme === 'dark') {
      lights.ambientLight.intensity = 0.4;
      lights.dirLight1.intensity = 1.4;
      lights.dirLight2.intensity = 1.0;
      lights.pointLight.intensity = 1.8;
    } else {
      lights.ambientLight.intensity = 0.8;
      lights.dirLight1.intensity = 1.1;
      lights.dirLight2.intensity = 0.6;
      lights.pointLight.intensity = 1.2;
    }
  }, [theme]);

  if (loading) {
    return <div style={{ paddingTop: '150px' }}><Loading /></div>;
  }

  if (error || !dress) {
    return (
      <div style={{ paddingTop: '150px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
        <div style={{ background: 'var(--white)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '3rem 2rem', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: 'var(--card-shadow)' }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>Error</h2>
          <p style={{ color: '#606070', marginBottom: '2rem' }}>{error || 'Garment not found.'}</p>
          <Link to="/collection" className="btn btn-primary" style={{ borderRadius: '12px', color: 'white' }}>Return to Collection</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade-in" style={{ position: 'relative' }}>
      <style>{`
        :root {
          --primary-gold: #d4af37;
          --dark-slate: #1a1a24;
          --editorial-bg: linear-gradient(180deg, #fbfbfa 0%, #f4f3ef 100%);
          --text-dark: #101016;
          --text-muted: #606070;
          --card-bg: rgba(255, 255, 255, 0.85);
          --card-border: rgba(212, 175, 55, 0.25);
          --font-sans: 'Outfit', sans-serif;
          --font-serif: 'Playfair Display', serif;
        }

        [data-theme="dark"] {
          --editorial-bg: linear-gradient(180deg, #09090d 0%, #12121a 100%);
          --text-dark: #f3f3f5;
          --text-muted: #a9a6b9;
          --card-bg: rgba(20, 20, 28, 0.85);
          --card-border: rgba(212, 175, 55, 0.15);
        }

        body {
          background: var(--editorial-bg) !important;
          color: var(--text-dark) !important;
          transition: background 0.3s, color 0.3s;
        }

        .showcase-container {
          position: relative;
          background: var(--editorial-bg);
          color: var(--text-dark);
          min-height: 100vh;
        }

        #canvas-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
          pointer-events: none;
        }

        .showcase-nav {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          padding: 1.5rem 6%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--card-border);
          background: rgba(251, 251, 250, 0.4);
        }
        [data-theme="dark"] .showcase-nav {
          background: rgba(9, 9, 13, 0.4);
        }

        .back-btn {
          text-decoration: none;
          color: var(--text-dark);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 1px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: color 0.3s;
        }
        .back-btn:hover {
          color: var(--primary-gold);
        }

        .nav-title {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .theme-toggle-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--text-dark);
        }

        .scroll-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .scroll-sections {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .scroll-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          padding: 100px 0;
        }

        .scroll-section.left { justify-content: flex-start; }
        .scroll-section.right { justify-content: flex-end; }
        .scroll-section.center { justify-content: center; text-align: center; }

        .content-panel {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          padding: 3rem;
          max-width: 450px;
          width: 100%;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          pointer-events: auto;
        }

        .scroll-section.center .content-panel {
          max-width: 600px;
        }

        .panel-tag {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--primary-gold);
          margin-bottom: 0.75rem;
        }

        .panel-title {
          font-family: var(--font-serif);
          font-size: 2.2rem;
          line-height: 1.2;
          color: var(--text-dark);
          margin-bottom: 1.2rem;
        }

        .panel-desc {
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--text-muted);
          margin-bottom: 1.8rem;
        }

        .panel-details {
          border-top: 1px solid var(--card-border);
          padding-top: 1.2rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          text-align: left;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .detail-label {
          font-weight: 600;
          color: var(--text-dark);
        }

        .detail-value {
          color: var(--text-muted);
        }

        .btn-gold {
          background: linear-gradient(135deg, var(--primary-gold), #b3922e);
          color: #ffffff;
          box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
          border-radius: 30px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.85rem;
          text-decoration: none;
          display: inline-block;
          padding: 0.9rem 2.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .btn-gold:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.45);
        }

        @media (max-width: 768px) {
          .scroll-section {
            justify-content: center !important;
            padding: 60px 0;
          }
          .content-panel {
            padding: 2rem;
          }
          .panel-title {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="showcase-container">
        {/* Navigation */}
        <header className="showcase-nav">
          <div className="nav-title">{dress.name} Virtual Tour</div>
          <button 
            className="theme-toggle-btn" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        {/* 3D Canvas */}
        <div id="canvas-container" ref={containerRef}>
          <canvas id="webgl-canvas" ref={canvasRef}></canvas>
        </div>

        {/* Scrollytelling Panels */}
        <div className="scroll-wrapper">
          <div className="scroll-sections">
            
            {/* Section 1: Silhouette */}
            <section className="scroll-section left">
              <div className="content-panel">
                <div className="panel-tag">Overview</div>
                <h2 className="panel-title">The Silhouette</h2>
                <p class="panel-desc">
                  Expertly sculpted to define elegance. Features a flowing drape that balances structured tailored lines with comfortable, premium movement.
                </p>
                <div className="panel-details">
                  <div className="detail-row">
                    <span className="detail-label">Design Category</span>
                    <span className="detail-value">Formal Couture</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Silhouette Type</span>
                    <span className="detail-value">Structured & Flowing</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Neckline */}
            <section className="scroll-section right">
              <div className="content-panel">
                <div className="panel-tag">Detail Focus</div>
                <h2 className="panel-title">The Collar & Neckline</h2>
                <p className="panel-desc">
                  A masterclass in upper-bodice framing. The design outlines the shoulders with symmetrical curves, establishing a high-end luxury focal point.
                </p>
                <div className="panel-details">
                  <div className="detail-row">
                    <span className="detail-label">Neck Styling</span>
                    <span className="detail-value">Elegant High Collar / Sweetheart</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Embellishments</span>
                    <span className="detail-value">Invisible Hand-stitched Finish</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Waist Corset */}
            <section className="scroll-section left">
              <div className="content-panel">
                <div className="panel-tag">Structure</div>
                <h2 className="panel-title">Cinched Waistline</h2>
                <p className="panel-desc">
                  Structured corset ribbing designed to highlight contours. Gently cinched to anchor the garment weight while transitioning into cascading fabric folds.
                </p>
                <div className="panel-details">
                  <div className="detail-row">
                    <span className="detail-label">Structure Core</span>
                    <span className="detail-value">Hidden Boning & Ribbing</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Material Adaptability</span>
                    <span className="detail-value">Flexible Breathable Satin Layer</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Fabric / Hem */}
            <section className="scroll-section right">
              <div className="content-panel">
                <div className="panel-tag">Texture</div>
                <h2 className="panel-title">Cascading Hem</h2>
                <p className="panel-desc">
                  The dress finishes with a dramatic flowing hemline. The fabric is weighted to sway gracefully in motion, reflecting studio lights with satin shimmer.
                </p>
                <div className="panel-details">
                  <div className="detail-row">
                    <span className="detail-label">Fabric Composition</span>
                    <span className="detail-value">Silk Satin & Viscose Blend</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Skirt Cut</span>
                    <span className="detail-value">Gently Pleated A-line</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: CTA */}
            <section className="scroll-section center">
              <div className="content-panel">
                <div className="panel-tag">Experience complete</div>
                <h2 className="panel-title">Ready to Wear?</h2>
                <p className="panel-desc" style={{ marginBottom: '2rem' }}>
                  This exclusive piece is ready for your special event. Reserve it now for an unforgettable entrance.
                </p>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-gold)', marginBottom: '1.5rem' }}>
                  ₹{dress.price_per_day} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ day</span>
                </div>
                <Link to={`/dress/${dress.id}`} className="btn-gold" style={{ width: '100%' }}>
                  Book Rental
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DressShowcase;
