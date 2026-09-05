import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Conformer3D, Atom3D } from '../types/molecule';

interface Molecule3DViewerProps {
  conformer?: Conformer3D | null;
  smiles?: string;
  name?: string;
  height?: number | string;
  allowToggleMode?: boolean;
}

// CPK Color Scheme + Element Radii (van der Waals)
const ELEMENT_DATA: Record<string, { color: number; radius: number; name: string }> = {
  C: { color: 0x334155, radius: 0.77, name: 'Carbon' },
  H: { color: 0xe2e8f0, radius: 0.37, name: 'Hydrogen' },
  O: { color: 0xef4444, radius: 0.66, name: 'Oxygen' },
  N: { color: 0x3b82f6, radius: 0.71, name: 'Nitrogen' },
  S: { color: 0xeab308, radius: 1.04, name: 'Sulfur' },
  P: { color: 0xf97316, radius: 1.10, name: 'Phosphorus' },
  F: { color: 0x10b981, radius: 0.64, name: 'Fluorine' },
  Cl: { color: 0x22c55e, radius: 0.99, name: 'Chlorine' },
  Br: { color: 0x9333ea, radius: 1.14, name: 'Bromine' },
  I: { color: 0xa855f7, radius: 1.33, name: 'Iodine' },
};

const DEFAULT_ELEMENT = { color: 0x94a3b8, radius: 0.7, name: 'Unknown' };

export const Molecule3DViewer: React.FC<Molecule3DViewerProps> = ({
  conformer,
  smiles,
  name,
  height = 340,
  allowToggleMode = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [styleMode, setStyleMode] = useState<'ball-stick' | 'space-fill' | 'wireframe'>('ball-stick');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredAtom, setHoveredAtom] = useState<Atom3D | null>(null);

  // Fallback 3D coordinates generator if conformer data is not yet computed
  const activeConformer = useMemo<Conformer3D>(() => {
    if (conformer && conformer.atoms && conformer.atoms.length > 0) {
      return conformer;
    }

    // Procedural pseudo-3D coordinate estimation from SMILES for instant visual feedback
    if (!smiles) return { atoms: [], bonds: [] };

    const cleanSmiles = smiles.trim();
    const regex = /Cl|Br|[A-Z][a-z]?/g;
    const matches = cleanSmiles.match(regex) || ['C', 'C', 'O'];

    const atoms: Atom3D[] = [];
    const count = Math.min(matches.length, 36);

    for (let i = 0; i < count; i++) {
      const theta = i * 0.95;
      const phi = (i % 4) * 0.78;
      const r = 2.4 + 0.35 * i;
      atoms.push({
        id: i,
        element: matches[i] || 'C',
        x: Number((Math.cos(theta) * Math.sin(phi) * r).toFixed(3)),
        y: Number((Math.sin(theta) * Math.sin(phi) * r).toFixed(3)),
        z: Number((Math.cos(phi) * (r * 0.7) - 1.5).toFixed(3)),
        charge: 0,
      });
    }

    const bonds = [];
    for (let i = 0; i < atoms.length - 1; i++) {
      bonds.push({ source: i, target: i + 1, order: 1 });
    }

    return {
      atoms,
      bonds,
      method: 'Procedural 3D Projection',
    };
  }, [conformer, smiles]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const viewHeight = typeof height === 'number' ? height : parseInt(height, 10) || 340;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / viewHeight, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, viewHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(20, 30, 25);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6366f1, 0.8);
    rimLight.position.set(-20, -15, -20);
    scene.add(rimLight);

    const cyanBounce = new THREE.PointLight(0x38bdf8, 0.6, 50);
    cyanBounce.position.set(0, -10, 15);
    scene.add(cyanBounce);

    // Molecule group
    const molGroup = new THREE.Group();
    scene.add(molGroup);

    const atomMeshes: { mesh: THREE.Mesh; atom: Atom3D }[] = [];

    // Scale factors per mode
    const isSpaceFill = styleMode === 'space-fill';
    const isWireframe = styleMode === 'wireframe';

    const sphereGeom = new THREE.SphereGeometry(1, 28, 28);
    const atomRadiusScale = isSpaceFill ? 1.4 : isWireframe ? 0.22 : 0.48;

    // Create Atoms
    activeConformer.atoms.forEach(atom => {
      const elInfo = ELEMENT_DATA[atom.element] || DEFAULT_ELEMENT;
      const radius = elInfo.radius * atomRadiusScale;

      const material = new THREE.MeshPhysicalMaterial({
        color: elInfo.color,
        metalness: 0.15,
        roughness: 0.25,
        clearcoat: 0.6,
        clearcoatRoughness: 0.15,
        wireframe: isWireframe,
      });

      const sphere = new THREE.Mesh(sphereGeom, material);
      sphere.scale.set(radius, radius, radius);
      sphere.position.set(atom.x, atom.y, atom.z);
      sphere.userData = { atom };

      molGroup.add(sphere);
      atomMeshes.push({ mesh: sphere, atom });
    });

    // Create Bonds (Cylinders)
    if (!isSpaceFill) {
      const bondRadius = isWireframe ? 0.05 : 0.12;
      const cylGeom = new THREE.CylinderGeometry(bondRadius, bondRadius, 1, 16);
      const bondMaterial = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.3,
        roughness: 0.4,
      });

      activeConformer.bonds.forEach(bond => {
        const atom1 = activeConformer.atoms.find(a => a.id === bond.source);
        const atom2 = activeConformer.atoms.find(a => a.id === bond.target);
        if (!atom1 || !atom2) return;

        const p1 = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
        const p2 = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
        const distance = p1.distanceTo(p2);

        if (distance > 0.01 && distance < 6.0) {
          const cylinder = new THREE.Mesh(cylGeom, bondMaterial);
          const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          cylinder.position.copy(midPoint);
          cylinder.scale.set(1, distance, 1);

          // Rotate cylinder to point from p1 to p2
          const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
          const axis = new THREE.Vector3(0, 1, 0);
          cylinder.quaternion.setFromUnitVectors(axis, direction);

          molGroup.add(cylinder);
        }
      });
    }

    // Interactive mouse drag rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        rotationVelocityY = deltaX * 0.008;
        rotationVelocityX = deltaY * 0.008;
        molGroup.rotation.y += rotationVelocityY;
        molGroup.rotation.x += rotationVelocityX;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }

      // Raycasting for atom hover inspector
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atomMeshes.map(m => m.mesh));

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        setHoveredAtom(hit.userData.atom || null);
      } else {
        setHoveredAtom(null);
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    // Zoom on wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(6, Math.min(45, camera.position.z + e.deltaY * 0.025));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Resize handler
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      camera.aspect = w / viewHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(w, viewHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      if (autoRotate && !isDragging) {
        molGroup.rotation.y += 0.008;
        molGroup.rotation.x += 0.002;
      } else if (!isDragging) {
        // Inertia damping
        molGroup.rotation.y += rotationVelocityY;
        molGroup.rotation.x += rotationVelocityX;
        rotationVelocityX *= 0.92;
        rotationVelocityY *= 0.92;
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sphereGeom.dispose();
      scene.clear();
    };
  }, [activeConformer, styleMode, autoRotate, height]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-mol-border/60 bg-gradient-to-b from-mol-dark/95 to-mol-darker/95 shadow-2xl backdrop-blur-md">
      {/* 3D Canvas container */}
      <div
        ref={mountRef}
        className="w-full cursor-grab active:cursor-grabbing select-none"
        style={{ height }}
      />

      {/* Top HUD: Controls & Info */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-mol-dark/80 backdrop-blur-md text-mol-accent border border-mol-accent/30 shadow-lg">
            3D WebGL Conformation
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-mol-subtle bg-mol-dark/70 border border-mol-border">
            {activeConformer.method || 'RDKit ETKDGv3'}
          </span>
        </div>

        {/* Style Mode Switcher */}
        {allowToggleMode && (
          <div className="flex items-center gap-1 bg-mol-dark/85 backdrop-blur-md p-1 rounded-lg border border-mol-border pointer-events-auto shadow-lg">
            <button
              onClick={() => setStyleMode('ball-stick')}
              title="Ball & Stick"
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                styleMode === 'ball-stick'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }`}
            >
              Ball & Stick
            </button>
            <button
              onClick={() => setStyleMode('space-fill')}
              title="Space-Filling CPK"
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                styleMode === 'space-fill'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }`}
            >
              CPK Spheres
            </button>
            <button
              onClick={() => setStyleMode('wireframe')}
              title="Neon Wireframe"
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                styleMode === 'wireframe'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }`}
            >
              Wireframe
            </button>
          </div>
        )}
      </div>

      {/* Bottom HUD: Atom Hover Inspector & Rotation Toggle */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
        {/* Atom Inspector Tooltip */}
        <div className="pointer-events-auto min-h-[32px]">
          {hoveredAtom ? (
            <div className="flex items-center gap-2 bg-mol-darker/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-mol-accent/40 text-xs shadow-xl animate-fade-in">
              <span
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: '#' + ((ELEMENT_DATA[hoveredAtom.element]?.color || 0x94a3b8).toString(16).padStart(6, '0')) }}
              />
              <span className="font-bold text-white">
                {ELEMENT_DATA[hoveredAtom.element]?.name || hoveredAtom.element} ({hoveredAtom.element})
              </span>
              <span className="text-[10px] font-mono text-mol-subtle">
                [X: {hoveredAtom.x.toFixed(2)}, Y: {hoveredAtom.y.toFixed(2)}, Z: {hoveredAtom.z.toFixed(2)}]
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-mol-subtle bg-mol-dark/60 backdrop-blur-sm px-2.5 py-1 rounded border border-mol-border/40">
              Drag to rotate 3D • Scroll to zoom • Hover atoms to inspect
            </div>
          )}
        </div>

        {/* Auto-rotate & camera controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md border backdrop-blur-md transition-all ${
              autoRotate
                ? 'bg-mol-accent/20 border-mol-accent/50 text-mol-accent'
                : 'bg-mol-dark/80 border-mol-border text-mol-muted hover:text-mol-text'
            }`}
          >
            {autoRotate ? '⏸ Pause Spin' : '▶ Spin 3D'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Molecule3DViewer;
