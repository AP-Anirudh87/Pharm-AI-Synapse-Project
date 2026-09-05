import React, { useEffect, useRef, useState, useCallback } from 'react';
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
      onStructureChange(`${smiles}+[${activeGroup || 'MOD'}]`, {
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
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              showReceptor ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 3D Receptor Pocket cavity"
          >
            Receptor: {showReceptor ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              autoRotate ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {autoRotate ? '⏸ Pause' : '▶ Spin'}
          </button>
          {(['ball-stick', 'space-fill', 'wireframe'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setRenderStyle(style)}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                renderStyle === style ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
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
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeGroup === g.name
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
            {selectedAtomId !== null ? `Target Atom #${selectedAtomId} selected` : 'Click any atom to synthesize branch'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CADMolecularEditor;
