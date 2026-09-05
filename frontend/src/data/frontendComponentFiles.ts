/**
 * Unabridged source code for all 12 frontend UI components in Pharm AI Synapse.
 * 100% complete — zero lines truncated.
 */

export const FRONTEND_COMPONENT_FILES: Record<string, { language: string; desc: string; metrics: string; code: string }> = {
  'frontend/src/components/CADMolecularEditor.tsx': {
    language: 'TypeScript / React',
    desc: 'Interactive Three.js 3D CAD editor with Ghost Hypothesis isomer branching & atom manipulator.',
    metrics: '693 lines • Three.js CAD Editor • Ghost Hypothesis',
    code: `import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Conformer3D, Atom3D } from '../types/molecule';

interface CADMolecularEditorProps {
  initialConformer?: Conformer3D | null;
  smiles?: string;
  name?: string;
  onStructureChange?: (newSmiles: string, conformer: Conformer3D) => void;
  showReceptorPocket?: boolean;
  isSideBySide?: boolean;
  parentConformer?: Conformer3D | null;
  conformerVersion?: number;
  pendingGhostAction?: { targetAtomId: number; groupName: string } | null;
  onAtomClick?: (atomId: number, element: string) => void;
}

const ELEMENT_PALETTE = [
  { symbol: 'C', name: 'Carbon', color: 0x334155, radius: 0.77 },
  { symbol: 'N', name: 'Nitrogen', color: 0x3b82f6, radius: 0.71 },
  { symbol: 'O', name: 'Oxygen', color: 0xef4444, radius: 0.66 },
  { symbol: 'S', name: 'Sulfur', color: 0xeab308, radius: 1.04 },
  { symbol: 'F', name: 'Fluorine', color: 0x10b981, radius: 0.64 },
  { symbol: 'Cl', name: 'Chlorine', color: 0x22c55e, radius: 0.99 },
  { symbol: 'P', name: 'Phosphorus', color: 0xf97316, radius: 1.10 },
  { symbol: 'H', name: 'Hydrogen', color: 0xe2e8f0, radius: 0.37 },
  { symbol: 'Br', name: 'Bromine', color: 0x9333ea, radius: 1.14 },
  { symbol: 'I', name: 'Iodine', color: 0xa855f7, radius: 1.33 },
];

const DEFAULT_ELEMENT = { symbol: '?', name: 'Unknown', color: 0x94a3b8, radius: 0.7 };

const FUNCTIONAL_GROUPS = [
  { name: '-OH (Hydroxyl)', desc: 'Improves aqueous solubility', elements: ['O', 'H'] },
  { name: '-NH2 (Amine)', desc: 'Hydrogen bond donor', elements: ['N', 'H', 'H'] },
  { name: '-COOH (Carboxyl)', desc: 'Pharmacophore binding site', elements: ['C', 'O', 'O', 'H'] },
  { name: '-POM (Prodrug Ester)', desc: 'Pivampicillin esterification for oral bioavailability', elements: ['C', 'O', 'C', 'O', 'C'] },
  { name: '-CF3 (Trifluoromethyl)', desc: 'Lipophilicity & metabolic stability', elements: ['C', 'F', 'F', 'F'] },
];

const getElementData = (symbol: string) =>
  ELEMENT_PALETTE.find((e) => e.symbol === symbol) || DEFAULT_ELEMENT;

export const CADMolecularEditor: React.FC<CADMolecularEditorProps> = ({
  initialConformer,
  smiles = 'CC1(C)SC2C(NC(=O)C(N)c3ccccc3)C(=O)N2C1C(=O)O',
  name = 'Compound CAD Model',
  onStructureChange,
  showReceptorPocket: initialPocket = false,
  isSideBySide = false,
  parentConformer,
  conformerVersion = 0,
  pendingGhostAction,
  onAtomClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js refs — persist across re-renders to avoid scene rebuilds
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const molGroupRef = useRef<THREE.Group | null>(null);
  const ghostGroupRef = useRef<THREE.Group | null>(null);
  const receptorMeshRef = useRef<THREE.Mesh | null>(null);
  const animIdRef = useRef<number>(0);
  const atomMeshesRef = useRef<THREE.Mesh[]>([]);

  // Active editable conformer state
  const [atoms, setAtoms] = useState<Atom3D[]>([]);
  const [bonds, setBonds] = useState<{ source: number; target: number; order: number }[]>([]);

  // Editor modes
  const [selectedAtomId, setSelectedAtomId] = useState<number | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [ghostAtoms, setGhostAtoms] = useState<Atom3D[]>([]);
  const [ghostBonds, setGhostBonds] = useState<{ source: number; target: number; order: number }[]>([]);
  const [showReceptor, setShowReceptor] = useState<boolean>(initialPocket);
  const [renderStyle, setRenderStyle] = useState<'ball-stick' | 'space-fill' | 'wireframe'>('ball-stick');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Shared geometry refs — created once, reused for all atoms/bonds
  const sharedGeometryRef = useRef<{
    sphere: THREE.SphereGeometry | null;
    cylinder: THREE.CylinderGeometry | null;
    ghostCylinder: THREE.CylinderGeometry | null;
  }>({ sphere: null, cylinder: null, ghostCylinder: null });

  // Sync receptor pocket visibility
  useEffect(() => {
    setShowReceptor(initialPocket);
  }, [initialPocket]);

  // Generate ghost/lighter-shade hypothesis branches
  const generateGhostHypothesis = useCallback((targetAtomId: number, groupName: string, currentAtoms: Atom3D[]) => {
    const target = currentAtoms.find((a) => a.id === targetAtomId);
    if (!target) return;

    const group = FUNCTIONAL_GROUPS.find((g) => g.name === groupName) || FUNCTIONAL_GROUPS[0];
    const newGhosts: Atom3D[] = [];
    const newGhostBonds: { source: number; target: number; order: number }[] = [];

    const baseId = currentAtoms.length + 100;
    const direction = new THREE.Vector3(target.x, target.y, target.z).normalize();
    if (direction.length() === 0) direction.set(1, 0, 0);

    group.elements.forEach((el, index) => {
      const offset = direction.clone().multiplyScalar(1.5 * (index + 1));
      newGhosts.push({
        id: baseId + index,
        element: el,
        x: Number((target.x + offset.x).toFixed(3)),
        y: Number((target.y + offset.y).toFixed(3)),
        z: Number((target.z + offset.z).toFixed(3)),
        charge: 0,
      });

      if (index === 0) {
        newGhostBonds.push({ source: targetAtomId, target: baseId + index, order: 1 });
      } else {
        newGhostBonds.push({ source: baseId + index - 1, target: baseId + index, order: 1 });
      }
    });

    setGhostAtoms(newGhosts);
    setGhostBonds(newGhostBonds);
  }, []);

  // Sync external ghost hypothesis proposal
  useEffect(() => {
    if (pendingGhostAction && pendingGhostAction.targetAtomId !== undefined && atoms.length > 0) {
      setSelectedAtomId(pendingGhostAction.targetAtomId);
      setActiveGroup(pendingGhostAction.groupName);
      generateGhostHypothesis(pendingGhostAction.targetAtomId, pendingGhostAction.groupName, atoms);
    }
  }, [pendingGhostAction, atoms, generateGhostHypothesis]);

  // Initialize atoms and bonds from conformer or procedural fallback
  useEffect(() => {
    if (initialConformer && initialConformer.atoms && initialConformer.atoms.length > 0) {
      setAtoms(initialConformer.atoms);
      setBonds(initialConformer.bonds || []);
      setGhostAtoms([]);
      setGhostBonds([]);
      setSelectedAtomId(null);
    } else {
      // Procedural generation from SMILES
      const clean = smiles.replace(/[()=123456789]/g, '');
      const list = clean.match(/[A-Z][a-z]?/g) || ['C', 'C', 'N', 'O', 'S'];
      const newAtoms: Atom3D[] = [];
      const newBonds: { source: number; target: number; order: number }[] = [];

      for (let i = 0; i < Math.min(list.length, 30); i++) {
        const theta = i * 0.85;
        const phi = (i % 3) * 0.7;
        const r = 2.2 + 0.3 * i;
        newAtoms.push({
          id: i,
          element: list[i] || 'C',
          x: Number((Math.cos(theta) * r).toFixed(3)),
          y: Number((Math.sin(theta) * r).toFixed(3)),
          z: Number((Math.sin(phi) * 1.5).toFixed(3)),
          charge: 0,
        });
        if (i > 0) {
          newBonds.push({ source: i - 1, target: i, order: 1 });
        }
      }
      setAtoms(newAtoms);
      setBonds(newBonds);
    }
  }, [initialConformer, smiles]);

  // Handle selecting an atom to propose a substitution (Ghost Hypothesis)
  const handleSelectAtom = useCallback((id: number) => {
    setSelectedAtomId(id);
    setAtoms((currentAtoms) => {
      generateGhostHypothesis(id, activeGroup || '-OH (Hydroxyl)', currentAtoms);
      return currentAtoms;
    });
  }, [activeGroup, generateGhostHypothesis]);

  // Commit Hypothesis (Apply and make permanent/darker)
  const commitHypothesis = useCallback(() => {
    if (ghostAtoms.length === 0) return;

    const updatedAtoms = [...atoms, ...ghostAtoms.map((g, idx) => ({ ...g, id: atoms.length + idx }))];
    const updatedBonds = [
      ...bonds,
      ...ghostBonds.map((b) => ({
        source: b.source < 100 ? b.source : atoms.length + (b.source - (atoms.length + 100)),
        target: b.target >= 100 ? atoms.length + (b.target - (atoms.length + 100)) : b.target,
        order: b.order,
      })),
    ];

    setAtoms(updatedAtoms);
    setBonds(updatedBonds);
    setGhostAtoms([]);
    setGhostBonds([]);
    setSelectedAtomId(null);
    setHistoryCount((c) => c + 1);

    if (onStructureChange) {
      onStructureChange(\`\${smiles}+[\${activeGroup || 'MOD'}]\`, {
        atoms: updatedAtoms,
        bonds: updatedBonds,
        method: 'CAD Synthesis Modification',
      });
    }
  }, [atoms, bonds, ghostAtoms, ghostBonds, smiles, activeGroup, onStructureChange]);

  // Cancel Ghost Hypothesis
  const cancelHypothesis = useCallback(() => {
    setGhostAtoms([]);
    setGhostBonds([]);
    setSelectedAtomId(null);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // THREE.JS SCENE INITIALIZATION — runs ONCE on mount
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 430;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.7);
    rimLight.position.set(-20, -10, -20);
    scene.add(rimLight);

    // Molecule groups
    const molGroup = new THREE.Group();
    scene.add(molGroup);

    const ghostGroup = new THREE.Group();
    scene.add(ghostGroup);

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    molGroupRef.current = molGroup;
    ghostGroupRef.current = ghostGroup;

    // Shared geometries (create once)
    sharedGeometryRef.current = {
      sphere: new THREE.SphereGeometry(1, 24, 24),
      cylinder: new THREE.CylinderGeometry(0.12, 0.12, 1, 12),
      ghostCylinder: new THREE.CylinderGeometry(0.08, 0.08, 1, 10),
    };

    // Pointer Interactivity
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let dragDistance = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      dragDistance = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        dragDistance += Math.abs(dx) + Math.abs(dy);
        molGroup.rotation.y += dx * 0.008;
        molGroup.rotation.x += dy * 0.008;
        ghostGroup.rotation.y += dx * 0.008;
        ghostGroup.rotation.x += dy * 0.008;
        if (receptorMeshRef.current) {
          receptorMeshRef.current.rotation.y += dx * 0.004;
        }
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      if (dragDistance < 5) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(atomMeshesRef.current);

        if (intersects.length > 0) {
          const atomId = intersects[0].object.userData.atomId;
          if (atomId !== undefined) {
            container.dispatchEvent(new CustomEvent('atomSelected', { detail: { atomId } }));
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(8, Math.min(50, camera.position.z + e.deltaY * 0.02));
    };

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 430;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // Animation Loop — lightweight, only calls render
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      sharedGeometryRef.current.sphere?.dispose();
      sharedGeometryRef.current.cylinder?.dispose();
      sharedGeometryRef.current.ghostCylinder?.dispose();
      scene.clear();
    };
  }, []); // Empty deps — only runs once on mount

  // Listen for atom selection events from the Three.js canvas
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.atomId !== undefined) {
        handleSelectAtom(detail.atomId);
        if (onAtomClick) {
          const atom = atoms.find((a) => a.id === detail.atomId);
          onAtomClick(detail.atomId, atom?.element || '?');
        }
      }
    };
    container.addEventListener('atomSelected', handler);
    return () => container.removeEventListener('atomSelected', handler);
  }, [handleSelectAtom, onAtomClick, atoms]);

  // ═══════════════════════════════════════════════════════════════════
  // MOLECULE UPDATE — runs when atoms/bonds/style changes (NOT full rebuild)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const molGroup = molGroupRef.current;
    const ghostGroup = ghostGroupRef.current;
    if (!molGroup || !ghostGroup) return;

    const sphereGeom = sharedGeometryRef.current.sphere;
    const cylGeom = sharedGeometryRef.current.cylinder;
    if (!sphereGeom || !cylGeom) return;

    // Clear only the molecule group (preserve scene structure)
    while (molGroup.children.length > 0) {
      const child = molGroup.children[0] as THREE.Mesh;
      molGroup.remove(child);
      if (child.material) {
        (child.material as THREE.Material).dispose();
      }
    }

    const radiusScale = renderStyle === 'space-fill' ? 1.35 : renderStyle === 'wireframe' ? 0.25 : 0.52;
    const newAtomMeshes: THREE.Mesh[] = [];

    // Render Atoms
    atoms.forEach((atom) => {
      const elData = getElementData(atom.element);
      const isSelected = selectedAtomId === atom.id;

      const mat = new THREE.MeshPhysicalMaterial({
        color: isSelected ? 0xec4899 : elData.color,
        emissive: isSelected ? 0xbe185d : 0x000000,
        emissiveIntensity: isSelected ? 0.6 : 0,
        metalness: 0.2,
        roughness: 0.2,
        clearcoat: 0.8,
        wireframe: renderStyle === 'wireframe',
      });

      const mesh = new THREE.Mesh(sphereGeom, mat);
      const r = elData.radius * radiusScale;
      mesh.scale.set(r, r, r);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { atomId: atom.id, element: atom.element };

      molGroup.add(mesh);
      newAtomMeshes.push(mesh);
    });

    atomMeshesRef.current = newAtomMeshes;

    // Render Bonds
    if (renderStyle !== 'space-fill') {
      const bondMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.3, roughness: 0.4 });

      bonds.forEach((bond) => {
        const a1 = atoms.find((a) => a.id === bond.source);
        const a2 = atoms.find((a) => a.id === bond.target);
        if (!a1 || !a2) return;

        const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
        const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
        const dist = p1.distanceTo(p2);

        if (dist > 0.05 && dist < 6.0) {
          const cyl = new THREE.Mesh(cylGeom, bondMat);
          cyl.position.copy(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
          cyl.scale.set(1, dist, 1);
          const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
          if (dir.length() > 0) {
            cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          }
          molGroup.add(cyl);
        }
      });
    }

    // Handle receptor pocket
    if (showReceptor && sceneRef.current) {
      if (!receptorMeshRef.current) {
        const pocketGeom = new THREE.DodecahedronGeometry(13, 2);
        const pocketMat = new THREE.MeshPhysicalMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.12,
          roughness: 0.7,
          metalness: 0.1,
          wireframe: false,
          side: THREE.BackSide,
        });
        receptorMeshRef.current = new THREE.Mesh(pocketGeom, pocketMat);
        sceneRef.current.add(receptorMeshRef.current);
      }
    } else if (receptorMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(receptorMeshRef.current);
      receptorMeshRef.current.geometry.dispose();
      (receptorMeshRef.current.material as THREE.Material).dispose();
      receptorMeshRef.current = null;
    }
  }, [atoms, bonds, renderStyle, selectedAtomId, showReceptor]);

  // ═══════════════════════════════════════════════════════════════════
  // GHOST ATOMS UPDATE — separate effect for ghost rendering
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const ghostGroup = ghostGroupRef.current;
    if (!ghostGroup) return;

    const sphereGeom = sharedGeometryRef.current.sphere;
    const ghostCylGeom = sharedGeometryRef.current.ghostCylinder;
    if (!sphereGeom || !ghostCylGeom) return;

    // Clear ghost group
    while (ghostGroup.children.length > 0) {
      const child = ghostGroup.children[0] as THREE.Mesh;
      ghostGroup.remove(child);
      if (child.material) {
        (child.material as THREE.Material).dispose();
      }
    }

    const radiusScale = renderStyle === 'space-fill' ? 1.35 : renderStyle === 'wireframe' ? 0.25 : 0.52;

    // Render Ghost Atoms (Lighter shade, semi-transparent)
    ghostAtoms.forEach((g) => {
      const elData = getElementData(g.element);
      const ghostMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.38,
        roughness: 0.1,
        metalness: 0.8,
        wireframe: true,
      });

      const gMesh = new THREE.Mesh(sphereGeom, ghostMat);
      const r = elData.radius * radiusScale * 1.05;
      gMesh.scale.set(r, r, r);
      gMesh.position.set(g.x, g.y, g.z);
      ghostGroup.add(gMesh);
    });

    // Render Ghost Bonds
    ghostBonds.forEach((gb) => {
      const allAtoms = [...atoms, ...ghostAtoms];
      const a1 = allAtoms.find((a) => a.id === gb.source);
      const a2 = allAtoms.find((a) => a.id === gb.target);
      if (!a1 || !a2) return;

      const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
      const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
      const dist = p1.distanceTo(p2);

      const gBondMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
      const gCyl = new THREE.Mesh(ghostCylGeom, gBondMat);
      gCyl.position.copy(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
      gCyl.scale.set(1, dist, 1);
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      if (dir.length() > 0) {
        gCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
      ghostGroup.add(gCyl);
    });
  }, [ghostAtoms, ghostBonds, atoms, renderStyle]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-ROTATE — separate lightweight effect
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!autoRotate) return;

    const spin = () => {
      if (molGroupRef.current) molGroupRef.current.rotation.y += 0.005;
      if (ghostGroupRef.current) ghostGroupRef.current.rotation.y += 0.005;
      if (receptorMeshRef.current) receptorMeshRef.current.rotation.y += 0.002;
    };

    const interval = setInterval(spin, 16);
    return () => clearInterval(interval);
  }, [autoRotate]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-indigo-500/30 bg-gradient-to-b from-[#0f172a] to-[#0a0e1a] shadow-2xl">
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-600/90 text-white shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            3D Chemical CAD Studio
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40">
            {atoms.length} Atoms &bull; {bonds.length} Bonds
          </span>
        </div>

        {/* View Style & Receptor Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 pointer-events-auto">
          <button
            onClick={() => setShowReceptor(!showReceptor)}
            className={\`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer \${
              showReceptor ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }\`}
            title="Toggle 3D Receptor Pocket cavity"
          >
            Receptor: {showReceptor ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={\`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer \${
              autoRotate ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }\`}
          >
            {autoRotate ? '⏸ Pause' : '▶ Spin'}
          </button>
          {(['ball-stick', 'space-fill', 'wireframe'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setRenderStyle(style)}
              className={\`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer \${
                renderStyle === style ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }\`}
            >
              {style === 'ball-stick' ? 'Ball&Stick' : style === 'space-fill' ? 'CPK' : 'Wire'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-[430px] cursor-crosshair select-none"
      />

      {/* Bottom Floating CAD Control Deck */}
      <div className="absolute bottom-3 left-3 right-3 z-20 space-y-2 pointer-events-none">
        {/* Ghost Hypothesis Notification & Action Banner */}
        {ghostAtoms.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/50 shadow-2xl flex flex-wrap items-center justify-between gap-3 pointer-events-auto animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 text-base font-bold">
                ✨
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <span>Ghost Hypothesis Preview (Lighter Shade)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                    {ghostAtoms.length} Atoms Added
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Target Atom #{selectedAtomId} modified with <strong>{activeGroup || 'Functional Group'}</strong>. Confirm to solidify into dark chemical bond.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={commitHypothesis}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
              >
                ✓ Solidify Bond
              </button>
              <button
                onClick={cancelHypothesis}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Functional Groups & Reactive Element Palette */}
        <div className="p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mr-1 whitespace-nowrap">
              Reactive Group:
            </span>
            {FUNCTIONAL_GROUPS.map((g) => (
              <button
                key={g.name}
                onClick={() => {
                  setActiveGroup(g.name);
                  if (selectedAtomId !== null) {
                    generateGhostHypothesis(selectedAtomId, g.name, atoms);
                  }
                }}
                className={\`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap \${
                  activeGroup === g.name
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50'
                }\`}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
            {selectedAtomId !== null ? \`Target Atom #\${selectedAtomId} selected\` : 'Click any atom to synthesize branch'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CADMolecularEditor;`,
  },

  'frontend/src/components/CandidatePanel.tsx': {
    language: 'TypeScript / React',
    desc: 'Candidate inspection drawer displaying chess move annotations, 2D/3D conformer switchers, and QSAR breakdowns.',
    metrics: '200 lines • React • Chess Annotation Engine • 2D/3D Switcher',
    code: `import React, { useState } from 'react';
import { CandidateInfo } from '../types/candidate';
import Molecule3DViewer from './Molecule3DViewer';

interface CandidatePanelProps {
  candidate: CandidateInfo | null;
  onClose: () => void;
}

const CandidatePanel: React.FC<CandidatePanelProps> = ({ candidate, onClose }) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  if (!candidate) return null;

  const isKnown = candidate.evidence_status === 'EXPERIMENTALLY_REPORTED';

  // Chess-style Move Evaluation annotation
  const score = candidate.ranking_score ?? 0;
  const isProdrug = candidate.transformation.toLowerCase().includes('prodrug') || candidate.name.toLowerCase().includes('pivampicillin');
  const moveBadge = isProdrug ? {
    tag: '🌟 Brilliant Move',
    eval: '+2.85',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    desc: 'Lipophilicity esterification solves cellular barrier without impairing beta-lactam binding.',
  } : score > 0.65 ? {
    tag: '🎯 Book Move',
    eval: \`+\${(score * 2).toFixed(2)}\`,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    desc: 'High multi-objective Pareto alignment with target research objectives.',
  } : {
    tag: '⚖️ Tactical Trade-Off',
    eval: \`+\${(score * 1.5).toFixed(2)}\`,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    desc: 'Moderate property balance requiring further metabolic optimization.',
  };

  return (
    <div className="glass-card p-5 animate-slide-in space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white">{candidate.name || 'Unnamed Candidate'}</h3>
            <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold border \${moveBadge.color}\`}>
              {moveBadge.tag} {moveBadge.eval}
            </span>
          </div>
          <p className="text-xs text-mol-muted mt-0.5">{candidate.transformation}</p>
        </div>
        <button
          onClick={onClose}
          className="text-mol-subtle hover:text-mol-text p-1.5 rounded-lg bg-mol-dark/60 border border-mol-border/40 hover:bg-mol-card transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Chess Evaluation Insight */}
      <div className="p-2.5 rounded-lg bg-mol-dark/60 border border-mol-border text-xs flex items-start gap-2">
        <span className="text-base">♟️</span>
        <div>
          <span className="font-bold text-white text-[11px] block">Chemical Move Evaluation</span>
          <span className="text-[10px] text-mol-muted">{moveBadge.desc}</span>
        </div>
      </div>

      {/* Status badge */}
      <div>
        <span className={\`inline-block px-3 py-1 rounded-full text-xs font-semibold \${isKnown ? 'badge-known' : 'badge-predicted'}\`}>
          {isKnown ? '✓ Experimentally Reported Record' : '⚠ Computational Hypothesis (Unmatched in DB)'}
        </span>
      </div>

      {/* 2D vs 3D View Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-mol-text uppercase tracking-wider">Molecular Conformation</span>
          <div className="flex items-center gap-1 bg-mol-dark/90 p-0.5 rounded-lg border border-mol-border">
            <button
              onClick={() => setViewMode('3d')}
              className={\`px-2.5 py-1 rounded text-xs font-medium transition-all \${
                viewMode === '3d'
                  ? 'bg-mol-accent text-white shadow'
                  : 'text-mol-muted hover:text-mol-text'
              }\`}
            >
              🌐 3D WebGL
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={\`px-2.5 py-1 rounded text-xs font-medium transition-all \${
                viewMode === '2d'
                  ? 'bg-mol-accent text-white shadow'
                  : 'text-mol-muted hover:text-mol-text'
              }\`}
            >
              🧪 2D Sketch
            </button>
          </div>
        </div>

        {viewMode === '3d' ? (
          <Molecule3DViewer
            conformer={candidate.conformer_3d}
            smiles={candidate.smiles}
            name={candidate.name}
            height={260}
          />
        ) : (
          candidate.image_base64 && (
            <div className="bg-white rounded-xl p-3 flex justify-center shadow-inner">
              <img
                src={\`data:image/png;base64,\${candidate.image_base64}\`}
                alt={\`2D structure of \${candidate.name}\`}
                className="max-h-[220px] object-contain"
              />
            </div>
          )
        )}
      </div>

      {/* Key properties grid */}
      <div className="grid grid-cols-2 gap-2">
        <InfoRow label="SMILES" value={candidate.smiles} mono />
        <InfoRow label="Formula" value={candidate.molecular_formula} />
        <InfoRow label="Mol Weight" value={candidate.molecular_weight?.toFixed(2)} />
        <InfoRow
          label="Similarity to Parent"
          value={candidate.similarity_to_parent != null ? \`\${(candidate.similarity_to_parent * 100).toFixed(1)}%\` : null}
        />
        <InfoRow label="Method" value={candidate.generation_method} />
        <InfoRow
          label="Composite Score"
          value={candidate.ranking_score != null ? candidate.ranking_score.toFixed(4) : null}
          highlight
        />
      </div>

      {/* Predictions */}
      {candidate.predictions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-mol-text uppercase tracking-wider">QSAR Predictions</h4>
            <span className="text-[10px] text-mol-subtle">Normalized</span>
          </div>
          <div className="space-y-1.5">
            {candidate.predictions.map((pred, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-mol-dark/50 rounded-lg px-3 py-2">
                <span className="text-mol-muted capitalize">{pred.property_name}</span>
                <span className="font-mono font-medium text-mol-text">
                  {pred.value != null ? pred.value.toFixed(3) : '—'}
                  {pred.unit && <span className="text-mol-subtle ml-1 text-[10px]">{pred.unit}</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-mol-subtle mt-1.5 text-center italic">
            {candidate.predictions[0]?.method || 'Multi-Target QSAR Model'}
          </p>
        </div>
      )}

      {/* Ranking breakdown */}
      {candidate.ranking_breakdown && (
        <div>
          <h4 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-2">Objective Weight Contribution</h4>
          <div className="space-y-1">
            {Object.entries(candidate.ranking_breakdown).map(([key, item]) => (
              <div key={key} className="flex items-center justify-between text-xs px-3 py-1.5 bg-mol-dark/50 rounded-lg">
                <span className="text-mol-muted capitalize flex items-center gap-1">
                  {key}
                  {item.inverted && <span className="text-[9px] text-mol-subtle">(inv)</span>}
                </span>
                <span className="font-mono text-mol-text">
                  {item.score != null ? item.score.toFixed(3) : '—'} × {item.weight.toFixed(2)} = <span className="text-mol-accent font-semibold">{item.contribution.toFixed(4)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      {candidate.note && (
        <p className="text-[10px] text-mol-subtle bg-mol-dark/50 rounded-lg px-3 py-2 leading-relaxed italic">
          {candidate.note}
        </p>
      )}
    </div>
  );
};

function InfoRow({ label, value, mono, highlight }: { label: string; value?: string | null; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="bg-mol-dark/50 rounded-lg px-3 py-2 border border-mol-border/40">
      <span className="text-mol-subtle block text-[10px] uppercase tracking-wider">{label}</span>
      <span className={\`block truncate \${mono ? 'font-mono text-[10px]' : 'text-xs'} \${highlight ? 'text-mol-accent font-bold' : 'text-mol-text'}\`}>
        {value || '—'}
      </span>
    </div>
  );
}

export default CandidatePanel;`,
  },

  'frontend/src/components/ChemicalTree.tsx': {
    language: 'TypeScript / React',
    desc: 'React Flow decision-tree chemical branching canvas mapping parent molecules to synthesis candidate nodes.',
    metrics: '195 lines • @xyflow/react • Visual Decision Tree',
    code: `import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CandidateInfo } from '../types/candidate';
import { MoleculeInfo } from '../types/molecule';

// ---- Custom Node ----
interface MolNodeData {
  label: string;
  subtitle: string;
  status: 'root' | 'known' | 'predicted' | 'selected';
  similarity?: number | null;
  [key: string]: unknown;
}

function MoleculeNode({ data, selected }: NodeProps<Node<MolNodeData>>) {
  const statusColors: Record<string, { bg: string; border: string; glow: string }> = {
    root: { bg: 'from-mol-accent to-mol-accent2', border: 'border-mol-accent/50', glow: 'shadow-mol-accent/20' },
    known: { bg: 'from-emerald-600 to-emerald-500', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/20' },
    predicted: { bg: 'from-amber-600 to-amber-500', border: 'border-amber-500/50', glow: 'shadow-amber-500/20' },
    selected: { bg: 'from-blue-600 to-blue-500', border: 'border-blue-500/50', glow: 'shadow-blue-500/20' },
  };
  const s = statusColors[data.status as string] || statusColors.predicted;

  return (
    <div className={\`relative px-4 py-3 rounded-xl border bg-mol-card \${s.border} \${selected ? 'ring-2 ring-mol-accent shadow-lg ' + s.glow : ''} transition-all cursor-pointer hover:shadow-lg min-w-[140px]\`}>
      <Handle type="target" position={Position.Top} className="!bg-mol-subtle !w-2 !h-2 !border-0" />
      <div className={\`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r \${s.bg}\`} />
      <div className="text-xs font-semibold text-mol-text truncate max-w-[160px]">{data.label}</div>
      <div className="text-[10px] text-mol-muted mt-0.5 truncate max-w-[160px]">{data.subtitle}</div>
      {data.similarity != null && (
        <div className="text-[9px] text-mol-subtle mt-1 font-mono">
          Sim: {(data.similarity * 100).toFixed(1)}%
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-mol-subtle !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes = { molecule: MoleculeNode };

// ---- Main Component ----
interface ChemicalTreeProps {
  molecule: MoleculeInfo | null;
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
}

const ChemicalTree: React.FC<ChemicalTreeProps> = ({
  molecule,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<MolNodeData>[] = [];
    const edges: Edge[] = [];

    if (!molecule) return { initialNodes: nodes, initialEdges: edges };

    // Root node
    nodes.push({
      id: 'root',
      type: 'molecule',
      position: { x: 300, y: 0 },
      data: {
        label: molecule.name || 'Input Molecule',
        subtitle: molecule.molecular_formula || molecule.smiles?.slice(0, 30) || '',
        status: 'root',
      },
    });

    // Candidate nodes
    const spacing = 200;
    const startX = 300 - ((candidates.length - 1) * spacing) / 2;

    candidates.forEach((cand, i) => {
      const isKnown = cand.evidence_status === 'EXPERIMENTALLY_REPORTED';
      const isSelected = cand.id === selectedCandidateId;

      nodes.push({
        id: cand.id,
        type: 'molecule',
        position: { x: startX + i * spacing, y: 140 },
        data: {
          label: cand.name || \`Candidate \${i + 1}\`,
          subtitle: cand.transformation || cand.molecular_formula || '',
          status: isSelected ? 'selected' : isKnown ? 'known' : 'predicted',
          similarity: cand.similarity_to_parent,
        },
        selected: isSelected,
      });

      edges.push({
        id: \`e-root-\${cand.id}\`,
        source: 'root',
        target: cand.id,
        type: 'smoothstep',
        style: {
          stroke: isKnown ? '#10b981' : '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: isKnown ? undefined : '5,5',
        },
        animated: !isKnown,
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [molecule, candidates, selectedCandidateId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== 'root') {
        onSelectCandidate(node.id);
      }
    },
    [onSelectCandidate],
  );

  if (!molecule) {
    return (
      <div className="glass-card h-[350px] flex items-center justify-center">
        <p className="text-mol-subtle text-sm">Load a molecule to see the exploration tree</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden" style={{ height: 350 }}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex gap-3 bg-mol-dark/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-mol-border">
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500" />
          Known
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500" />
          Predicted
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500" />
          Selected
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as MolNodeData;
            if (d.status === 'root') return '#6366f1';
            if (d.status === 'known') return '#10b981';
            if (d.status === 'selected') return '#3b82f6';
            return '#f59e0b';
          }}
          maskColor="rgba(10,14,26,0.8)"
        />
      </ReactFlow>
    </div>
  );
};

export default ChemicalTree;`,
  },

  'frontend/src/components/EvidencePanel.tsx': {
    language: 'TypeScript / React',
    desc: 'Live database evidence triangulation display cross-referencing PubChem, ChEMBL, and BindingDB records.',
    metrics: '83 lines • Multi-DB Evidence Triangulation',
    code: `import React from 'react';
import { EvidenceRecord } from '../types/candidate';

interface EvidencePanelProps {
  evidence: EvidenceRecord[];
  candidateName: string;
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence, candidateName }) => {
  if (evidence.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Evidence for {candidateName}
        </h3>
        <p className="text-xs text-mol-subtle">No evidence records available for this compound.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Evidence for {candidateName}
      </h3>

      <div className="space-y-2">
        {evidence.map((rec, i) => (
          <div
            key={i}
            className={\`rounded-lg px-4 py-3 border transition-all \${
              rec.is_experimental
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-mol-dark/50 border-mol-border'
            }\`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={\`w-2 h-2 rounded-full \${rec.is_experimental ? 'bg-emerald-500' : 'bg-mol-subtle'}\`} />
                <span className="text-xs font-semibold text-mol-text">{rec.source}</span>
                <span className="text-[10px] text-mol-subtle">({rec.database})</span>
              </div>
              <span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${
                rec.is_experimental ? 'badge-known' : 'badge-predicted'
              }\`}>
                {rec.is_experimental ? 'Experimental' : 'No Match'}
              </span>
            </div>

            <p className="text-xs text-mol-muted leading-relaxed">{rec.description}</p>

            {rec.external_url && (
              <a
                href={rec.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-mol-accent hover:text-mol-accent2 mt-1.5 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                View in {rec.source} →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvidencePanel;`,
  },

  'frontend/src/components/GoalSelector.tsx': {
    language: 'TypeScript / React',
    desc: 'Multi-objective research priority sliders adjusting Pareto trade-offs for Activity, Absorption, Solubility, and Toxicity.',
    metrics: '114 lines • React Sliders • Multi-Objective Weighting',
    code: `import React from 'react';
import { Priorities } from '../types/molecule';

interface GoalSelectorProps {
  goal: string;
  onGoalChange: (goal: string) => void;
  priorities: Priorities;
  onPrioritiesChange: (priorities: Priorities) => void;
}

const GOALS = [
  { value: 'Improve oral absorption', label: 'Improve Absorption', icon: '💊' },
  { value: 'Improve activity', label: 'Improve Activity', icon: '🎯' },
  { value: 'Reduce toxicity', label: 'Reduce Toxicity', icon: '🛡️' },
  { value: 'Improve solubility', label: 'Improve Solubility', icon: '💧' },
  { value: 'Custom goal', label: 'Custom Goal', icon: '⚙️' },
];

const PRIORITY_CONFIGS = [
  { key: 'activity' as const, label: 'Activity', color: '#6366f1' },
  { key: 'absorption' as const, label: 'Absorption', color: '#10b981' },
  { key: 'solubility' as const, label: 'Solubility', color: '#06b6d4' },
  { key: 'toxicity' as const, label: 'Toxicity', color: '#ef4444' },
];

const GoalSelector: React.FC<GoalSelectorProps> = ({
  goal,
  onGoalChange,
  priorities,
  onPrioritiesChange,
}) => {
  const handlePriorityChange = (key: keyof Priorities, value: number) => {
    onPrioritiesChange({ ...priorities, [key]: value });
  };

  const total = priorities.activity + priorities.absorption + priorities.solubility + priorities.toxicity;

  return (
    <div className="space-y-4">
      {/* Goal Selection */}
      <div>
        <h2 className="text-sm font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-green">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          Research Goal
        </h2>
        <div className="space-y-1.5">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => onGoalChange(g.value)}
              className={\`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2
                \${goal === g.value
                  ? 'bg-mol-accent/15 text-mol-accent border border-mol-accent/30'
                  : 'text-mol-muted hover:text-mol-text hover:bg-mol-card border border-transparent'
                }\`}
            >
              <span>{g.icon}</span>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Sliders */}
      <div>
        <h2 className="text-sm font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          </svg>
          Priority Weights
        </h2>

        <div className="space-y-3">
          {PRIORITY_CONFIGS.map(({ key, label, color }) => {
            const pct = total > 0 ? Math.round((priorities[key] / total) * 100) : 25;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-mol-muted">{label}</span>
                  <span className="text-xs font-mono font-medium" style={{ color }}>
                    {priorities[key]}% <span className="text-mol-subtle">({pct}% eff.)</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={priorities[key]}
                  onChange={e => handlePriorityChange(key, Number(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: color,
                    background: \`linear-gradient(to right, \${color}44 0%, \${color}44 \${priorities[key]}%, #1e293b \${priorities[key]}%, #1e293b 100%)\`,
                  }}
                />
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-mol-subtle mt-2 text-center">
          Weights are normalized to 100% before ranking.
        </p>
      </div>
    </div>
  );
};

export default GoalSelector;`,
  },

  'frontend/src/components/Header.tsx': {
    language: 'TypeScript / React',
    desc: 'Application navigation header featuring A.P. Anirudh attribution, live status badges, and resume modal trigger.',
    metrics: '97 lines • Glassmorphic Top Bar • AP-Anirudh87 Attribution',
    code: `import React from 'react';

interface HeaderProps {
  demoMode?: boolean;
  onOpenDossier: () => void;
  background3DEnabled?: boolean;
  onToggleBackground3D?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  demoMode = true,
  onOpenDossier,
  background3DEnabled = true,
  onToggleBackground3D,
}) => {
  return (
    <header className="border-b border-mol-border/80 bg-mol-darker/90 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-xl">
      <div className="flex flex-wrap items-center justify-between px-6 py-3 gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="6" r="2" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="5" cy="18" r="2" />
              <circle cx="19" cy="18" r="2" />
              <line x1="7" y1="7" x2="10" y2="10" />
              <line x1="14" y1="10" x2="17" y2="7" />
              <line x1="7" y1="17" x2="10" y2="14" />
              <line x1="14" y1="14" x2="17" y2="17" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                PHARM AI SYNAPSE
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                3D Engine
              </span>
            </div>
            <p className="text-xs text-mol-muted">
              Autonomous Molecular Evolution & Multi-Objective Evidence Platform
            </p>
          </div>
        </div>

        {/* Lead Engineer / Resume Attribution & Controls */}
        <div className="flex items-center gap-3">
          {/* Author Badge that opens the Resume Dossier Modal */}
          <button
            onClick={onOpenDossier}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-indigo-900/60 border border-indigo-500/40 text-indigo-200 hover:text-white hover:border-indigo-400 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            title="Click to view full architecture & resume credentials"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Architect: <strong className="text-white font-bold">A.P. Anirudh</strong></span>
            <span className="text-[10px] text-indigo-300 ml-1 underline underline-offset-2">Resume Dossier ↗</span>
          </button>

          {/* 3D Background Toggle */}
          {onToggleBackground3D && (
            <button
              onClick={onToggleBackground3D}
              className={\`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all \${
                background3DEnabled
                  ? 'bg-mol-card/80 border-cyan-500/30 text-cyan-300 shadow-sm'
                  : 'bg-mol-card/40 border-mol-border text-mol-subtle hover:text-mol-text'
              }\`}
              title="Toggle 3D Synaptic Mesh in background"
            >
              🌐 3D Synapse: {background3DEnabled ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Status indicators */}
          {demoMode && (
            <span className="px-3 py-1 rounded-full text-xs font-medium badge-predicted">
              QSAR Active
            </span>
          )}
        </div>
      </div>

      {/* Scientific Transparency Disclaimer */}
      <div className="px-6 pb-2">
        <div className="disclaimer-banner text-center text-[11px]">
          ⚠️ <strong>Research Prototype</strong>: Computational predictions are heuristic estimations calibrated for molecular evolution, not clinical medical advice or proof of in vitro drug efficacy.
        </div>
      </div>
    </header>
  );
};

export default Header;`,
  },

  'frontend/src/components/Molecule3DViewer.tsx': {
    language: 'TypeScript / React',
    desc: 'Hardware-accelerated Three.js 3D WebGL conformer simulator with CPK coloring and active-site pocket.',
    metrics: '394 lines • Three.js WebGL • 3D Spatial Simulator',
    code: `import React, { useEffect, useRef, useState, useMemo } from 'react';
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
              className={\`px-2 py-1 text-[10px] font-medium rounded transition-all \${
                styleMode === 'ball-stick'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }\`}
            >
              Ball & Stick
            </button>
            <button
              onClick={() => setStyleMode('space-fill')}
              title="Space-Filling CPK"
              className={\`px-2 py-1 text-[10px] font-medium rounded transition-all \${
                styleMode === 'space-fill'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }\`}
            >
              CPK Spheres
            </button>
            <button
              onClick={() => setStyleMode('wireframe')}
              title="Neon Wireframe"
              className={\`px-2 py-1 text-[10px] font-medium rounded transition-all \${
                styleMode === 'wireframe'
                  ? 'bg-mol-accent text-white shadow-md'
                  : 'text-mol-muted hover:text-mol-text'
              }\`}
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
            className={\`px-2.5 py-1 text-[10px] font-medium rounded-md border backdrop-blur-md transition-all \${
              autoRotate
                ? 'bg-mol-accent/20 border-mol-accent/50 text-mol-accent'
                : 'bg-mol-dark/80 border-mol-border text-mol-muted hover:text-mol-text'
            }\`}
          >
            {autoRotate ? '⏸ Pause Spin' : '▶ Spin 3D'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Molecule3DViewer;`,
  },

  'frontend/src/components/MoleculeInput.tsx': {
    language: 'TypeScript / React',
    desc: 'Compound resolver input supporting drug names, SMILES strings, and 1-click presets.',
    metrics: '110 lines • SMILES / Compound Name Resolver',
    code: `import React, { useState } from 'react';

interface MoleculeInputProps {
  onSubmit: (name: string, smiles: string) => void;
  loading?: boolean;
}

const PRESETS = [
  { name: 'Ampicillin', smiles: 'CC1(C)SC2C(NC(=O)C(N)c3ccccc3)C(=O)N2C1C(=O)O', desc: 'Oral Bioavailability Prodrug' },
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', desc: 'Anti-Inflammatory Analgesic' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(C(C)C(=O)O)cc1', desc: 'Gastric Tolerance Optimization' },
  { name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1', desc: 'Hepatotoxicity Mitigation' },
];

const MoleculeInput: React.FC<MoleculeInputProps> = ({ onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [smiles, setSmiles] = useState('');

  const handleSubmit = () => {
    if (!name.trim() && !smiles.trim()) return;
    onSubmit(name.trim(), smiles.trim());
  };

  const handleSelectPreset = (presetName: string, presetSmiles: string) => {
    setName(presetName);
    setSmiles(presetSmiles);
    onSubmit(presetName, presetSmiles);
  };

  return (
    <div className="space-y-3.5">
      <h2 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-mol-accent">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Target Compound
      </h2>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-medium text-mol-muted mb-1">Compound Name</label>
          <input
            id="molecule-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ampicillin"
            className="w-full px-3 py-2 bg-mol-dark/80 border border-mol-border rounded-lg text-xs text-mol-text placeholder-mol-subtle focus:border-mol-accent focus:ring-1 focus:ring-mol-accent/40 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-mol-muted mb-1">SMILES Representation</label>
          <input
            id="molecule-smiles-input"
            type="text"
            value={smiles}
            onChange={e => setSmiles(e.target.value)}
            placeholder="e.g. CC1(C)SC2C(NC(=O)..."
            className="w-full px-3 py-2 bg-mol-dark/80 border border-mol-border rounded-lg text-[11px] text-mol-text font-mono placeholder-mol-subtle focus:border-mol-accent focus:ring-1 focus:ring-mol-accent/40 outline-none transition-all"
            disabled={loading}
          />
        </div>
      </div>

      <button
        id="load-molecule-btn"
        onClick={handleSubmit}
        disabled={loading || (!name.trim() && !smiles.trim())}
        className="w-full py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-mol-accent via-indigo-500 to-purple-600 text-white shadow-lg shadow-mol-accent/20 hover:shadow-mol-accent/35 active:scale-[0.98] cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating 3D Simulation…
          </span>
        ) : (
          '⚡ Analyze & Synthesize Branches'
        )}
      </button>

      {/* Fast Compound Presets */}
      <div className="pt-2 border-t border-mol-border/60">
        <label className="block text-[10px] font-semibold text-mol-subtle uppercase tracking-wider mb-2">
          One-Click Research Presets
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p.name, p.smiles)}
              disabled={loading}
              className="text-left p-2 rounded-lg bg-mol-card/60 hover:bg-mol-card border border-mol-border/80 hover:border-indigo-500/40 text-mol-muted hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            >
              <div className="text-[11px] font-bold text-indigo-300">{p.name}</div>
              <div className="text-[9px] text-mol-subtle truncate">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoleculeInput;`,
  },

  'frontend/src/components/PropertyChart.tsx': {
    language: 'TypeScript / React',
    desc: 'Recharts multi-dimensional radar and bar charts visualizing QSAR predictions across candidates.',
    metrics: '125 lines • Recharts Radar & Bar Charts • QSAR Comparison',
    code: `import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CandidateInfo } from '../types/candidate';

interface PropertyChartProps {
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const PropertyChart: React.FC<PropertyChartProps> = ({ candidates, selectedCandidateId }) => {
  if (candidates.length === 0) {
    return (
      <div className="glass-card p-4 h-[280px] flex items-center justify-center">
        <p className="text-mol-subtle text-sm">No candidates to compare</p>
      </div>
    );
  }

  // Build radar data
  const properties = ['activity', 'absorption', 'solubility', 'toxicity'];
  const radarData = properties.map(prop => {
    const entry: Record<string, unknown> = { property: prop.charAt(0).toUpperCase() + prop.slice(1) };
    candidates.slice(0, 5).forEach((cand, i) => {
      const pred = cand.predictions.find(p => p.property_name === prop);
      let val = 0;
      if (pred?.value != null) {
        if (prop === 'absorption') val = pred.value / 100;
        else if (prop === 'solubility') val = Math.max(0, (pred.value + 6) / 6);
        else if (prop === 'toxicity') val = 1 - pred.value; // Invert
        else val = pred.value;
      }
      entry[cand.name || \`C\${i + 1}\`] = Math.max(0, Math.min(1, val));
    });
    return entry;
  });

  // Build bar data for ranking
  const barData = candidates.slice(0, 6).map((cand, i) => ({
    name: cand.name?.length > 15 ? cand.name.slice(0, 15) + '…' : (cand.name || \`C\${i + 1}\`),
    score: cand.ranking_score ?? 0,
    fill: cand.id === selectedCandidateId ? '#3b82f6' :
      cand.evidence_status === 'EXPERIMENTALLY_REPORTED' ? '#10b981' : '#f59e0b',
  }));

  const candidateNames = candidates.slice(0, 5).map((c, i) => c.name || \`C\${i + 1}\`);

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-accent">
          <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
        </svg>
        Property Comparison
      </h3>

      <div className="disclaimer-banner text-[10px] mb-3">
        ⚠ All values are computational predictions from a demonstration model — not experimentally validated.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div>
          <p className="text-[10px] text-mol-muted mb-1 text-center">Normalized Properties (0–1 scale)</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="property" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 8 }} />
              {candidateNames.map((name, i) => (
                <Radar
                  key={name}
                  name={name}
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <p className="text-[10px] text-mol-muted mb-1 text-center">Overall Ranking Score</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {barData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PropertyChart;`,
  },

  'frontend/src/components/RankingTable.tsx': {
    language: 'TypeScript / React',
    desc: 'Interactive Pareto ranking table displaying weighted composite scores and experimental status flags.',
    metrics: '99 lines • Pareto Table • Candidate Sorting',
    code: `import React from 'react';
import { CandidateInfo } from '../types/candidate';

interface RankingTableProps {
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
}

const RankingTable: React.FC<RankingTableProps> = ({ candidates, selectedCandidateId, onSelectCandidate }) => {
  if (candidates.length === 0) {
    return (
      <div className="glass-card p-4 flex items-center justify-center h-[200px]">
        <p className="text-mol-subtle text-sm">No candidates to rank</p>
      </div>
    );
  }

  const getPredValue = (cand: CandidateInfo, prop: string): string => {
    const pred = cand.predictions.find(p => p.property_name === prop);
    if (!pred || pred.value == null) return '—';
    return pred.value.toFixed(3);
  };

  // Sort by ranking_score descending
  const sorted = [...candidates].sort((a, b) => (b.ranking_score ?? 0) - (a.ranking_score ?? 0));

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 pb-2">
        <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-accent">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Candidate Ranking
        </h3>
        <p className="text-[10px] text-mol-subtle mt-1">
          Rankings based on weighted computational predictions. Not clinical recommendations.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-mol-border text-mol-subtle">
              <th className="text-left py-2 px-4 font-medium">#</th>
              <th className="text-left py-2 px-4 font-medium">Candidate</th>
              <th className="text-left py-2 px-4 font-medium">Status</th>
              <th className="text-right py-2 px-4 font-medium">Activity</th>
              <th className="text-right py-2 px-4 font-medium">Absorption</th>
              <th className="text-right py-2 px-4 font-medium">Solubility</th>
              <th className="text-right py-2 px-4 font-medium">Toxicity</th>
              <th className="text-right py-2 px-4 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cand, i) => {
              const isKnown = cand.evidence_status === 'EXPERIMENTALLY_REPORTED';
              const isSelected = cand.id === selectedCandidateId;

              return (
                <tr
                  key={cand.id}
                  onClick={() => onSelectCandidate(cand.id)}
                  className={\`border-b border-mol-border/50 cursor-pointer transition-colors
                    \${isSelected ? 'bg-mol-accent/10' : 'hover:bg-mol-card/80'}\`}
                >
                  <td className="py-2.5 px-4 font-bold text-mol-accent">{i + 1}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-mol-text">{cand.name || \`Candidate \${i + 1}\`}</div>
                    <div className="text-[10px] text-mol-subtle truncate max-w-[180px]">{cand.transformation}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={\`px-2 py-0.5 rounded-full text-[10px] font-semibold \${isKnown ? 'badge-known' : 'badge-predicted'}\`}>
                      {isKnown ? 'Known' : 'Predicted'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'activity')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'absorption')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'solubility')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'toxicity')}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="font-mono font-bold text-mol-accent">
                      {cand.ranking_score?.toFixed(4) ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingTable;`,
  },

  'frontend/src/components/ResumeDossierModal.tsx': {
    language: 'TypeScript / React',
    desc: 'Executive portfolio credentials modal detailing technical achievements and architecture by A.P. Anirudh.',
    metrics: '158 lines • Portfolio Modal • 1-Click Clipboard',
    code: `import React, { useState } from 'react';

interface ResumeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESUME_BULLETS = [
  "Engineered 'Pharm AI Synapse', a full-stack AI-driven chemical exploration platform featuring real-time 3D conformer simulation, multi-objective QSAR scoring, and automated PubChem/ChEMBL/BindingDB evidence verification.",
  "Designed an interactive 3D WebGL molecular simulation and decision-tree architecture ('Chess.com for chemical synthesis') enabling researchers to navigate chemical modification spaces with real-time Pareto optimization.",
  "Implemented high-throughput Cheminformatics pipelines using RDKit (ETKDGv3 distance geometry & MMFF94 force-field energy minimization) and Scikit-Learn QSAR models with Morgan fingerprint featurization.",
  "Architected concurrent asynchronous backend services with FastAPI, SQLAlchemy ORM, and resilient fallback mechanisms for offline drug research and zero-downtime exploration."
];

export const ResumeDossierModal: React.FC<ResumeDossierModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(RESUME_BULLETS.join('\\n\\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-mol-darker border border-mol-accent/40 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-mol-card text-mol-muted hover:text-white hover:bg-mol-card/80 transition-colors"
        >
          ✕
        </button>

        {/* Header Profile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mol-border pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/25">
              AP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-white">A.P. Anirudh</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-mol-accent/20 text-mol-accent border border-mol-accent/40">
                  Lead Architect
                </span>
              </div>
              <p className="text-sm text-mol-cyan font-medium mt-0.5">
                AI Drug Discovery & Full-Stack Systems Engineer
              </p>
              <p className="text-xs text-mol-muted mt-1">
                Project: <strong className="text-white">Pharm AI Synapse</strong> — Autonomous Molecular Evolution Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-mol-accent to-mol-accent2 text-white shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2"
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Resume Bullets'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-mol-card border border-mol-border text-mol-muted hover:text-white transition-all"
              title="Print or Save as PDF"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Tech Stack Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mol-cyan" />
            Core Engineering Stack
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Python 3.13',
              'FastAPI',
              'RDKit (ETKDGv3 3D & MMFF94)',
              'Three.js (Hardware WebGL)',
              'React 18 + TypeScript',
              'Scikit-Learn QSAR',
              'React Flow (Heuristic Trees)',
              'Recharts (Pareto Radars)',
              'SQLite & SQLAlchemy ORM',
              'PubChem / ChEMBL APIs',
              'TailwindCSS 3',
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-mol-card/80 text-mol-muted border border-mol-border hover:border-mol-accent/40 hover:text-white transition-all"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Executive Highlights (Resume Ready) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mol-accent" />
            Key Research & Engineering Accomplishments
          </h3>
          <div className="space-y-3">
            {RESUME_BULLETS.map((bullet, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-mol-dark/60 border border-mol-border/60 hover:border-mol-accent/30 transition-all text-xs text-mol-muted leading-relaxed flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-md bg-mol-accent/15 text-mol-accent font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  {idx + 1}
                </span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Theoretical Framework & Scientific Honesty Statement */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/40 border border-indigo-500/20 text-xs space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <span>🔬</span>
            Scientific Rigor & Validation Protocol
          </div>
          <p className="text-mol-muted text-[11px] leading-relaxed">
            All computational hypotheses generated by <em>Pharm AI Synapse</em> adhere to strict biomedical transparency. Candidate scores represent multi-objective heuristic estimations (Oral Absorption, Target Affinity, Solubility, and Cytotoxicity Penalties) calibrated against known historical prodrug modifications (such as the Ampicillin → Pivampicillin pathway) without claiming unverified in vitro discovery.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-mol-subtle pt-2 border-t border-mol-border/60">
          <span>Candidate Portfolio Dossier • A.P. Anirudh</span>
          <button
            onClick={onClose}
            className="text-mol-accent hover:underline font-semibold"
          >
            Back to Simulation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDossierModal;`,
  },

  'frontend/src/components/Synaptic3DBackground.tsx': {
    language: 'TypeScript / React',
    desc: 'Ambient Three.js WebGL synaptic particle field simulating neural network connections and molecular lattices.',
    metrics: '178 lines • Three.js WebGL • Ambient Synaptic Field',
    code: `import React, { useEffect, useRef } from 'react';
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

export default Synaptic3DBackground;`,
  },
};
