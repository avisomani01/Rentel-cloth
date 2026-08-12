import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const HeroThreeDViewer = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    // 3. Group
    const dressGroup = new THREE.Group();
    scene.add(dressGroup);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaee, 1.2);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe5f0ff, 0.6);
    fillLight.position.set(-5, 2, -5);
    scene.add(fillLight);

    const pointLight = new THREE.PointLight(0xfff3e0, 1.0, 10);
    pointLight.position.set(0, 1.5, 2);
    scene.add(pointLight);

    // 5. Drop Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const shadowCtx = shadowCanvas.getContext('2d');
    const grad = shadowCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowCtx.fillStyle = grad;
    shadowCtx.fillRect(0, 0, 64, 64);
    
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

    // 6. Interactive Mouse Tracker
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const handleMouseMove = (e) => {
      targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 7. Real 3D Volumetric Geometric Mesh Gown Construction on Mannequin
    const buildProcedural = () => {
      const model = new THREE.Group();

      // 1. Square Dark Marble Display Pedestal Base
      const marbleMat = new THREE.MeshPhysicalMaterial({
        color: 0x1c2028,
        roughness: 0.12,
        metalness: 0.3,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08
      });
      const pedestalGeo = new THREE.BoxGeometry(1.3, 0.16, 1.3);
      const pedestal = new THREE.Mesh(pedestalGeo, marbleMat);
      pedestal.position.y = -1.1;
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      model.add(pedestal);

      // Ornate Royal Gold Accent Rim
      const brass = new THREE.MeshPhysicalMaterial({ color: 0xd4af37, roughness: 0.12, metalness: 0.95 });
      const rimGeo = new THREE.BoxGeometry(1.32, 0.02, 1.32);
      const rim = new THREE.Mesh(rimGeo, brass);
      rim.position.y = -1.02;
      model.add(rim);

      // Stand Support Rod
      const poleGeo = new THREE.CylinderGeometry(0.018, 0.018, 2.2, 16);
      const pole = new THREE.Mesh(poleGeo, brass);
      pole.position.y = -0.05;
      model.add(pole);

      // 2. Mannequin Form Core
      const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x14151a, roughness: 0.4, metalness: 0.2 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.58, 32), bodyMat);
      torso.position.y = 0.5;
      model.add(torso);
      
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 32), bodyMat);
      bust.scale.set(1, 0.8, 1.1);
      bust.position.set(0, 0.68, 0.02);
      model.add(bust);

      // 3. Royal Crimson Velvet Tuxedo Jacket Bodice
      const dressMat = new THREE.MeshPhysicalMaterial({
        color: 0x8b1227,
        roughness: 0.35,
        metalness: 0.1,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide
      });

      // Tailored Jacket Sleeves
      const sleeveGeo = new THREE.CylinderGeometry(0.048, 0.038, 0.56, 24);
      const leftSleeve = new THREE.Mesh(sleeveGeo, dressMat);
      leftSleeve.position.set(-0.23, 0.45, 0);
      leftSleeve.rotation.z = 0.22;
      model.add(leftSleeve);

      const rightSleeve = new THREE.Mesh(sleeveGeo, dressMat);
      rightSleeve.position.set(0.23, 0.45, 0);
      rightSleeve.rotation.z = -0.22;
      model.add(rightSleeve);

      // Ornate Royal Gold Cuffs
      const cuffGeo = new THREE.CylinderGeometry(0.042, 0.043, 0.1, 24);
      const leftCuff = new THREE.Mesh(cuffGeo, brass);
      leftCuff.position.set(-0.28, 0.2, 0);
      leftCuff.rotation.z = 0.22;
      model.add(leftCuff);

      const rightCuff = new THREE.Mesh(cuffGeo, brass);
      rightCuff.position.set(0.28, 0.2, 0);
      rightCuff.rotation.z = -0.22;
      model.add(rightCuff);

      // 4. Volumetric Cascading High-Low Skirt with Rear Train
      const skirtGeom = new THREE.CylinderGeometry(0.12, 0.95, 1.58, 64, 40, true);
      const pos = skirtGeom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const angle = Math.atan2(z, x);
        const r = Math.sqrt(x*x + z*z);
        const heightFactor = (0.79 - y) / 1.58;
        const wave = Math.sin(angle * 14 + y * 2.5) * 0.11 * heightFactor;
        const trainFactor = (z < 0) ? Math.abs(z) * 0.48 * heightFactor : 0;
        pos.setX(i, Math.cos(angle) * (r + wave));
        pos.setZ(i, Math.sin(angle) * (r + wave) - trainFactor);
      }
      skirtGeom.computeVertexNormals();
      const skirtMesh = new THREE.Mesh(skirtGeom, dressMat);
      skirtMesh.position.y = -0.2;
      skirtMesh.castShadow = true;
      skirtMesh.receiveShadow = true;
      model.add(skirtMesh);

      // 5. Metallic Gold Inner Skirt Lining (High-Low Layer)
      const innerGoldMat = new THREE.MeshPhysicalMaterial({
        color: 0xd4af37,
        metalness: 0.95,
        roughness: 0.14,
        clearcoat: 0.7,
        side: THREE.BackSide
      });
      const innerGoldSkirt = new THREE.Mesh(skirtGeom, innerGoldMat);
      innerGoldSkirt.position.y = -0.2;
      innerGoldSkirt.scale.set(0.98, 0.98, 0.98);
      model.add(innerGoldSkirt);

      // 6. Jacket Bodice Outer Layer
      const bodiceGeom = new THREE.CylinderGeometry(0.17, 0.135, 0.46, 32, 10, true);
      const posB = bodiceGeom.attributes.position;
      for (let i = 0; i < posB.count; i++) {
        const x = posB.getX(i);
        const y = posB.getY(i);
        const z = posB.getZ(i);
        const angle = Math.atan2(z, x);
        const r = Math.sqrt(x*x + z*z);
        const wave = Math.sin(angle * 16) * 0.007;
        posB.setX(i, Math.cos(angle) * (r + wave));
        posB.setZ(i, Math.sin(angle) * (r + wave));
      }
      bodiceGeom.computeVertexNormals();
      const bodiceMesh = new THREE.Mesh(bodiceGeom, dressMat);
      bodiceMesh.position.y = 0.53;
      bodiceMesh.castShadow = true;
      model.add(bodiceMesh);

      // 7. Gold Peak Lapels & Filigree Accents
      const lapelMat = new THREE.MeshPhysicalMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.12 });
      const lapelGeo = new THREE.BoxGeometry(0.045, 0.42, 0.028);
      const leftLapel = new THREE.Mesh(lapelGeo, lapelMat);
      leftLapel.position.set(-0.068, 0.59, 0.13);
      leftLapel.rotation.z = -0.32;
      model.add(leftLapel);

      const rightLapel = new THREE.Mesh(lapelGeo, lapelMat);
      rightLapel.position.set(0.068, 0.59, 0.13);
      rightLapel.rotation.z = 0.32;
      model.add(rightLapel);

      // 8. Crisp White Shirt Insert & Gold Buttons
      const shirtMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3 });
      const shirtGeo = new THREE.CylinderGeometry(0.115, 0.09, 0.38, 16, 1, false, -Math.PI/4, Math.PI/2);
      const shirt = new THREE.Mesh(shirtGeo, shirtMat);
      shirt.position.set(0, 0.59, 0.05);
      model.add(shirt);

      // Shirt Buttons
      for (let yPos of [0.66, 0.59, 0.52]) {
        const buttonGeo = new THREE.SphereGeometry(0.011, 12, 12);
        const button = new THREE.Mesh(buttonGeo, lapelMat);
        button.position.set(0, yPos, 0.14);
        model.add(button);
      }

      // 9. Navy Bow Tie
      const tieMat = new THREE.MeshPhysicalMaterial({ color: 0x040818, roughness: 0.4 });
      const tieGeo = new THREE.BoxGeometry(0.12, 0.04, 0.035);
      const bowTie = new THREE.Mesh(tieGeo, tieMat);
      bowTie.position.set(0, 0.73, 0.16);
      model.add(bowTie);

      // 10. Royal Gold Embroidered Waist Belt
      const beltGeom = new THREE.TorusGeometry(0.145, 0.018, 16, 40);
      const belt = new THREE.Mesh(beltGeom, brass);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = 0.35;
      belt.scale.set(1.0, 1.1, 1.0);
      model.add(belt);

      dressGroup.add(model);
      setLoading(false);
    };

    // Render Royal Hybrid Tuxedo Gown directly
    buildProcedural();

    // 8. Manual Drag-to-Rotate Interaction (NO Automatic Rotation/Floating)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      previousMousePosition = {
        x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
        y: e.clientY || (e.touches && e.touches[0].clientY) || 0
      };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const currentY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const deltaX = currentX - previousMousePosition.x;
      const deltaY = currentY - previousMousePosition.y;

      targetRotationY += deltaX * 0.008;
      targetRotationX += deltaY * 0.005;

      targetRotationX = Math.max(-0.4, Math.min(0.4, targetRotationX));

      previousMousePosition = { x: currentX, y: currentY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    canvas.style.cursor = 'grab';
    const handleMouseDown = (e) => { canvas.style.cursor = 'grabbing'; onPointerDown(e); };
    const handleMouseUp = () => { canvas.style.cursor = 'grab'; onPointerUp(); };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: true });

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', onPointerUp);

    // 9. Render Loop (Zero Automatic Movement)
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      
      // Smooth damping towards manual drag coordinates
      dressGroup.rotation.y += (targetRotationY - dressGroup.rotation.y) * 0.1;
      dressGroup.rotation.x += (targetRotationX - dressGroup.rotation.x) * 0.1;
      
      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize listener
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(reqId);
      
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
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', zIndex: 5, position: 'relative' }}></canvas>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-serif)',
          fontSize: '1.2rem',
          color: 'var(--primary)',
          pointerEvents: 'none',
          zIndex: 1
        }}>
          Loading 3D Model...
        </div>
      )}
    </div>
  );
};

export default HeroThreeDViewer;
