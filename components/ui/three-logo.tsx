'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  interactive?: boolean;
  glow?: boolean;
  showText?: boolean;
  onClick?: () => void;
}

export function ThreeLogo({
  size = 'md',
  className = '',
  interactive = true,
  glow = true,
  showText = false,
  onClick
}: ThreeLogoProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Dimension mapping
  const sizeMap = {
    xs: { px: 28, cameraZ: 4.8 },
    sm: { px: 36, cameraZ: 4.6 },
    md: { px: 56, cameraZ: 4.5 },
    lg: { px: 96, cameraZ: 4.4 },
    xl: { px: 130, cameraZ: 4.2 },
  };

  const { px, cameraZ } = sizeMap[size] || sizeMap.md;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvasTest = document.createElement('canvas');
      const gl = canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl');
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch {
      setWebGLSupported(false);
      return;
    }

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = cameraZ;

    // 2. Renderer with High DPI and Alpha transparency
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(px, px);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Central Master Pivot Group
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // --- INNER CORE: Octahedral/Icosahedral Database Crystal ---
    const coreGeo = new THREE.OctahedronGeometry(0.85, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald 500
      emissive: 0x047857,
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.15,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    masterGroup.add(coreMesh);

    // Glowing Wireframe Facet Lattice
    const wireGeo = new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.88, 0));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x34d399, // Emerald 400
      transparent: true,
      opacity: 0.9,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    masterGroup.add(wireMesh);

    // --- MIDDLE LAYER: Database Disk Platter (Torus 1) ---
    const platterGeo = new THREE.TorusGeometry(1.3, 0.08, 16, 48);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan 500
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1,
    });
    const platterMesh = new THREE.Mesh(platterGeo, platterMat);
    platterMesh.rotation.x = Math.PI / 2.3;
    masterGroup.add(platterMesh);

    // --- OUTER LAYER: Gyro Orbital Ring (Torus 2) ---
    const gyroGeo = new THREE.TorusGeometry(1.7, 0.04, 16, 64);
    const gyroMat = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7, // Emerald 300
      transparent: true,
      opacity: 0.75,
      wireframe: true,
    });
    const gyroMesh = new THREE.Mesh(gyroGeo, gyroMat);
    gyroMesh.rotation.y = Math.PI / 3;
    gyroMesh.rotation.x = Math.PI / 6;
    masterGroup.add(gyroMesh);

    // --- AMBIENT DATA PARTICLES (Cloud Database Nodes) ---
    const particleCount = 28;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.35 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8, // Sky 400
      size: 0.09,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    masterGroup.add(particles);

    // --- 4. Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 4, 10);
    emeraldLight.position.set(2, 3, 3);
    scene.add(emeraldLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3, 10);
    cyanLight.position.set(-2, -2, 2);
    scene.add(cyanLight);

    // --- 5. Mouse Parallax & Interaction Coordinates ---
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseSpeedMultiplier = 1;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.8;
      targetRotationX = -y * 0.8;
    };

    const handleMouseEnter = () => {
      mouseSpeedMultiplier = 2.4;
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      targetRotationX = 0;
      targetRotationY = 0;
      mouseSpeedMultiplier = 1;
      setIsHovered(false);
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // --- 6. Render & Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous rotations with speed boost on hover
      const speed = 0.8 * mouseSpeedMultiplier;
      coreMesh.rotation.y = elapsedTime * speed;
      coreMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.3;
      wireMesh.rotation.y = elapsedTime * speed;
      wireMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.3;

      // Pulse breathing scale
      const pulse = 1 + Math.sin(elapsedTime * 3) * 0.04;
      coreMesh.scale.set(pulse, pulse, pulse);
      wireMesh.scale.set(pulse, pulse, pulse);

      // Rotate orbiting platter disk
      platterMesh.rotation.z = -elapsedTime * speed * 0.9;
      platterMesh.rotation.y = Math.cos(elapsedTime * 0.4) * 0.2;

      // Rotate outer gyro ring
      gyroMesh.rotation.x = elapsedTime * speed * 0.6;
      gyroMesh.rotation.y = elapsedTime * speed * 0.4;

      // Orbit particles
      particles.rotation.y = -elapsedTime * speed * 0.3;

      // Smooth dampening to mouse parallax
      masterGroup.rotation.y += (targetRotationY - masterGroup.rotation.y) * 0.08;
      masterGroup.rotation.x += (targetRotationX - masterGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // --- 7. Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      platterGeo.dispose();
      platterMat.dispose();
      gyroGeo.dispose();
      gyroMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [px, cameraZ, interactive]);

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title="AetherDB Three.js Core Engine"
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient Glow Aura */}
        {glow && (
          <div
            className={`absolute rounded-full transition-all duration-500 pointer-events-none ${
              isHovered
                ? 'bg-emerald-500/35 blur-xl scale-125'
                : 'bg-emerald-500/15 blur-lg scale-100'
            }`}
            style={{ width: `${px * 0.9}px`, height: `${px * 0.9}px` }}
          />
        )}

        {/* Three.js Canvas Container */}
        {webGLSupported ? (
          <div
            ref={mountRef}
            style={{ width: `${px}px`, height: `${px}px` }}
            className="relative z-10 flex items-center justify-center transition-transform duration-300"
          />
        ) : (
          /* High-Fidelity SVG Fallback */
          <div
            style={{ width: `${px}px`, height: `${px}px` }}
            className="relative z-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400"
          >
            <svg
              className="w-3/5 h-3/5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white leading-none">
            <span className="text-emerald-400">Aether</span>
            <span className="text-zinc-100">DB</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
              3D
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono mt-0.5">Cloud Database Studio</span>
        </div>
      )}
    </div>
  );
}
