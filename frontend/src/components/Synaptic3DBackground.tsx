import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Synaptic3DBackgroundProps {
  enabled?: boolean;
}

const Synaptic3DBackground: React.FC<Synaptic3DBackgroundProps> = ({ enabled = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 120;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Particle nodes (atoms / synaptic junctions)
    const particleCount = 85;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    const spreadX = 220;
    const spreadY = 140;
    const spreadZ = 90;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;

      velocities.push({
        x: (Math.random() - 0.5) * 0.12,
        y: (Math.random() - 0.5) * 0.12,
        z: (Math.random() - 0.5) * 0.08,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material with soft cyan/indigo glow
    const pMaterial = new THREE.PointsMaterial({
      color: 0x6366f1,
      size: 3.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // Dynamic synaptic line connections
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
    });

    let linesMesh: THREE.LineSegments | null = null;

    // Mouse tracking for subtle 3D parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let animId: number;
    const maxDistance = 38;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Parallax camera lerp
      camera.position.x += (mouseX - camera.position.x) * 0.02;
      camera.position.y += (-mouseY - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      const pos = geometry.attributes.position.array as Float32Array;

      // Update positions
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Bounce within boundaries
        if (Math.abs(pos[i * 3]) > spreadX / 2) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > spreadY / 2) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > spreadZ / 2) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      // Update synaptic line connections
      if (linesMesh) {
        scene.remove(linesMesh);
        linesMesh.geometry.dispose();
      }

      const linePositions: number[] = [];
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDistance) {
            linePositions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
            linePositions.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
          }
        }
      }

      if (linePositions.length > 0) {
        const lineGeom = new THREE.BufferGeometry();
        lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        linesMesh = new THREE.LineSegments(lineGeom, lineMaterial);
        scene.add(linesMesh);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      pMaterial.dispose();
      lineMaterial.dispose();
    };
  }, [enabled]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40"
      style={{ background: 'transparent' }}
    />
  );
};

export default Synaptic3DBackground;
