import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HeroThreeDViewer = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasError || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene & WebGL Renderer
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.2, 3.0);

    // 3. Model Parent Group
    const dressGroup = new THREE.Group();
    scene.add(dressGroup);

    // 4. Professional Studio Lighting Rig (Sophisticated Fashion Portraiture style)
    const ambientLight = new THREE.AmbientLight(0x1a1525, 0.9); // Deep purple softbox ambient fill
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xfffaee, 1.8); // Primary softbox light (upper-left)
    keyLight.position.set(-4, 7, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0xdbe7ff, 0.9); // Secondary cool fill light (front-right)
    fillLight.position.set(4, 3, 4);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xff7bb0, 2.5); // Soft pink rim spotlight from behind for silhouette
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);
    
    const topLight = new THREE.DirectionalLight(0x8b7cff, 0.7); // Subtle overhead purple/blue gradient highlight
    topLight.position.set(0, 8, 0);
    scene.add(topLight);

    // 5. Drop Shadow Floor Plane
    const shadowGeo = new THREE.PlaneGeometry(3.0, 3.0);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext('2d');
    const grad = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(10, 8, 16, 0.6)');
    grad.addColorStop(0.5, 'rgba(10, 8, 16, 0.2)');
    grad.addColorStop(1, 'rgba(10, 8, 16, 0)');
    shadowCtx.fillStyle = grad;
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

    // 6. Load Realistic GLB Gown Model
    const loader = new GLTFLoader();
    loader.load(
      '/models/burgundy-gown.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Normalize size and center the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y) - 0.08; // fit nicely above pedestal
        model.position.z += (model.position.z - center.z);
        
        // Scale to a natural height of ~2.1 Three.js units
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 2.1 / maxDim;
        model.scale.setScalar(scaleFactor);
        
        // Configure textures and realistic satin materials
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
            // Adjust materials to communicate premium satin/silk fabric feel
            if (node.material) {
              node.material.roughness = Math.max(node.material.roughness, 0.22);
              node.material.metalness = Math.min(node.material.metalness, 0.1);
              node.material.clearcoat = 1.0;
              node.material.clearcoatRoughness = 0.15;
              
              // Enable fabric grazing sheen highlights if supported by the model
              if (node.material.sheen !== undefined) {
                node.material.sheen = 1.0;
                node.material.sheenColor = new THREE.Color(0xe07a9b);
                node.material.sheenRoughness = 0.25;
              }
            }
          }
        });
        
        dressGroup.add(model);
        setLoading(false);
      },
      undefined,
      (error) => {
        console.warn('GLB asset not found or failed to load. Displaying unavailable state.', error);
        setHasError(true);
        setLoading(false);
      }
    );

    // 7. Interactive Controls (OrbitControls)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 5.0;
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI * 0.65; // Lock camera from going below floor

    // 8. Render Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 10. Cleanup Resources
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      controls.dispose();
      
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
  }, [hasError]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!hasError && (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', zIndex: 5, position: 'relative' }}></canvas>
      )}
      {loading && !hasError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-serif)',
          fontSize: '1.2rem',
          color: 'var(--primary)',
          pointerEvents: 'none',
          zIndex: 6
        }}>
          Loading 3D Model...
        </div>
      )}
    </div>
  );
};

export default HeroThreeDViewer;
