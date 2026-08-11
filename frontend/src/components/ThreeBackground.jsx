import React, { useEffect, useRef } from 'react';

const ThreeBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Color palettes matching active themes
    const darkColors = [
      'rgba(212, 175, 55, ',  // Champagne Gold
      'rgba(35, 30, 61, ',    // Deep Space Indigo
      'rgba(197, 168, 128, ', // Muted Warm Gold
    ];

    const lightColors = [
      'rgba(108, 99, 255, ',  // Indigo
      'rgba(255, 107, 157, ', // Coral Pink
      'rgba(0, 194, 168, ',   // Mint/Teal
    ];

    // Particle settings
    const particleCount = 100;
    const particles = [];
    const perspective = 300;
    const maxDepth = 1000;

    // Mouse movement parallax state
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Nebula blob settings (for background gradient light)
    const blobs = [
      { x: width * 0.2, y: height * 0.3, radius: 300, vx: 0.2, vy: 0.15 },
      { x: width * 0.8, y: height * 0.7, radius: 350, vx: -0.15, vy: -0.2 },
      { x: width * 0.5, y: height * 0.5, radius: 250, vx: 0.1, vy: -0.1 },
    ];

    class Particle {
      constructor() {
        this.reset();
        // Distribute initially along Z axis
        this.z = Math.random() * maxDepth;
      }

      reset() {
        this.x = (Math.random() - 0.5) * width * 1.5;
        this.y = (Math.random() - 0.5) * height * 1.5;
        this.z = maxDepth;
        this.size = Math.random() * 1.2 + 0.6; // Smaller stars for luxury feel
        this.colorIndex = Math.floor(Math.random() * darkColors.length);
        this.speed = Math.random() * 0.4 + 0.15; // Slower velocity for calming shimmers
      }

      update() {
        // Move towards the screen
        this.z -= this.speed;
        if (this.z <= -perspective) {
          this.reset();
        }
      }

      draw(isDark) {
        const colors = isDark ? darkColors : lightColors;
        
        // Calculate 3D perspective projection
        const scale = perspective / (perspective + this.z);
        const pX = width / 2 + this.x * scale;
        const pY = height / 2 + this.y * scale;

        // Parallax offset from mouse movement
        const offsetX = (mouseX - width / 2) * (1 - scale) * 0.05;
        const offsetY = (mouseY - height / 2) * (1 - scale) * 0.05;

        const finalX = pX + offsetX;
        const finalY = pY + offsetY;

        // Fade in from distance, fade out when getting very close to screen
        let opacity = 1;
        if (this.z > maxDepth * 0.8) {
          opacity = (maxDepth - this.z) / (maxDepth * 0.2);
        } else if (this.z < 0) {
          opacity = this.z / -perspective;
          opacity = 1 - opacity;
        }

        if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height && opacity > 0) {
          ctx.beginPath();
          ctx.arc(finalX, finalY, this.size * scale * 2, 0, Math.PI * 2);
          ctx.fillStyle = colors[this.colorIndex] + opacity + ')';
          ctx.shadowColor = colors[this.colorIndex] + opacity + ')';
          ctx.shadowBlur = isDark ? 8 * scale : 3 * scale;
          ctx.fill();
        }
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      
      // Clear canvas with a solid background matching active theme
      ctx.fillStyle = isDark ? '#060609' : '#f8f7ff';
      ctx.shadowBlur = 0;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw and move Nebula gradients
      blobs.forEach((blob, idx) => {
        // Move blobs slowly
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce blobs off walls
        if (blob.x - blob.radius < 0 || blob.x + blob.radius > width) blob.vx *= -1;
        if (blob.y - blob.radius < 0 || blob.y + blob.radius > height) blob.vy *= -1;

        // Dynamic blob colors based on theme
        let blobColor;
        if (isDark) {
          if (idx === 0) blobColor = 'rgba(212, 175, 55, 0.04)';    // Gold ambient
          else if (idx === 1) blobColor = 'rgba(35, 30, 61, 0.06)';   // Indigo ambient
          else blobColor = 'rgba(197, 168, 128, 0.03)';
        } else {
          if (idx === 0) blobColor = 'rgba(108, 99, 255, 0.06)';
          else if (idx === 1) blobColor = 'rgba(255, 107, 157, 0.05)';
          else blobColor = 'rgba(0, 194, 168, 0.04)';
        }

        // Create gradient
        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, blobColor);
        gradient.addColorStop(1, isDark ? 'rgba(6, 6, 9, 0)' : 'rgba(248, 247, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });

      // Smooth mouse coordinates for momentum-based parallax
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      // 2. Draw stars/particles
      particles.forEach((p) => {
        p.update();
        p.draw(isDark);
      });

      // 3. Draw connection lines between close particles
      ctx.shadowBlur = 0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];

          // Project locations to calculate distance
          const scale1 = perspective / (perspective + p1.z);
          const pX1 = width / 2 + p1.x * scale1 + (mouseX - width / 2) * (1 - scale1) * 0.05;
          const pY1 = height / 2 + p1.y * scale1 + (mouseY - height / 2) * (1 - scale1) * 0.05;

          const scale2 = perspective / (perspective + p2.z);
          const pX2 = width / 2 + p2.x * scale2 + (mouseX - width / 2) * (1 - scale2) * 0.05;
          const pY2 = height / 2 + p2.y * scale2 + (mouseY - height / 2) * (1 - scale2) * 0.05;

          const dist = Math.hypot(pX1 - pX2, pY1 - pY2);
          if (dist < 100) {
            // Lines only connect if particles are also close in Z coordinate (depth)
            const zDist = Math.abs(p1.z - p2.z);
            if (zDist < 120) {
              const alpha = (1 - dist / 100) * 0.1 * (1 - zDist / 120);
              ctx.beginPath();
              ctx.moveTo(pX1, pY1);
              ctx.lineTo(pX2, pY2);
              
              // Dark mode uses soft gold lines, light mode uses soft indigo lines
              ctx.strokeStyle = isDark ? `rgba(212, 175, 55, ${alpha * 0.4})` : `rgba(108, 99, 255, ${alpha})`;
              ctx.lineWidth = 0.5 * scale1;
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
};

export default ThreeBackground;
