import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AvatarCanvasHandle {
  applyViseme: (id: number, atMs?: number) => void;
}

interface AvatarCanvasProps {
  modelUrl?: string;
  onReady?: () => void;
  pixelRatio?: number;
  debug?: boolean;
}

// A lightweight Three.js canvas that loads a GLB avatar and exposes applyViseme(id)
const AvatarCanvas = forwardRef<AvatarCanvasHandle, AvatarCanvasProps>((props, ref) => {
  const { modelUrl = '/avatar.glb', onReady, pixelRatio = window.devicePixelRatio || 1, debug = false } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Mouth blendshape references
  const mouthMeshRef = useRef<THREE.Mesh | null>(null);
  const morphDictRef = useRef<Record<string, number> | undefined>();
  const morphInfluencesRef = useRef<number[] | undefined>();

  // Smooth interpolation for viseme transitions (80-120ms)
  const currentVisemeRef = useRef<{ id: number; targetWeight: number; startTime: number } | null>(null);
  
  const decayOthers = () => {
    const influences = morphInfluencesRef.current;
    if (!influences) return;
    for (let i = 0; i < influences.length; i++) {
      influences[i] *= 0.85;
      if (influences[i] < 0.01) influences[i] = 0;
    }
  };

  const interpolateViseme = (deltaTime: number) => {
    const current = currentVisemeRef.current;
    if (!current) return;
    
    const elapsed = deltaTime - current.startTime;
    const duration = 100; // 100ms transition
    
    if (elapsed >= duration) {
      // Transition complete
      if (morphInfluencesRef.current && morphDictRef.current) {
        const dict = morphDictRef.current;
        const influences = morphInfluencesRef.current;
        const targetName = mapVisemeToMorphName(current.id, Object.keys(dict));
        if (targetName && typeof dict[targetName] === 'number') {
          influences[dict[targetName]] = current.targetWeight;
        }
      }
      currentVisemeRef.current = null;
    } else {
      // Interpolate
      const progress = elapsed / duration;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease-out
      
      if (morphInfluencesRef.current && morphDictRef.current) {
        const dict = morphDictRef.current;
        const influences = morphInfluencesRef.current;
        const targetName = mapVisemeToMorphName(current.id, Object.keys(dict));
        if (targetName && typeof dict[targetName] === 'number') {
          influences[dict[targetName]] = current.targetWeight * easeProgress;
        }
      }
    }
  };

  // Mapping from Azure viseme id (0-21) to likely blendshape names
  // This is heuristic; adjust to match your model. We'll log available keys once the avatar loads.
  const mapVisemeToMorphName = (id: number, available: string[]): string | undefined => {
    // Common ARKit-like viseme names; adapt as needed
    const guessMap: Record<number, string[]> = {
      0: ['viseme_sil', 'mouthClose', 'sil'],
      1: ['viseme_ee', 'mouthWide', 'EE'],
      2: ['viseme_ih', 'IH'],
      3: ['viseme_aa', 'AA', 'A'],
      4: ['viseme_ou', 'OU', 'O'],
      5: ['viseme_oh', 'OH'],
      6: ['viseme_ao', 'AO'],
      7: ['viseme_uh', 'UH'],
      8: ['viseme_fv', 'FV', 'F'],
      9: ['viseme_th', 'TH'],
      10: ['viseme_dd', 'DD', 'D'],
      11: ['viseme_kk', 'KK', 'K'],
      12: ['viseme_ch', 'CH', 'TCH'],
      13: ['viseme_ss', 'SS', 'S'],
      14: ['viseme_nn', 'NN', 'N'],
      15: ['viseme_rr', 'RR', 'R'],
      16: ['viseme_zh', 'ZH', 'JH'],
      17: ['viseme_aa2', 'AA2'],
      18: ['viseme_ey', 'EY'],
      19: ['viseme_ay', 'AY'],
      20: ['viseme_ow', 'OW'],
      21: ['viseme_aw', 'AW']
    };

    const candidates = guessMap[id] || [];
    for (const name of candidates) {
      const found = available.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }

    // Fallback: pick something vowel-like for visible movement
    const vowelFallback = available.find(k => /aa|ah|ao|oh|ou|ow|uh|ee|ih/i.test(k));
    return vowelFallback || available[0];
  };

  useImperativeHandle(ref, () => ({
    applyViseme: (id: number, _atMs?: number) => {
      const dict = morphDictRef.current;
      const influences = morphInfluencesRef.current;
      if (!dict || !influences) return;

      const keys = Object.keys(dict);
      const targetName = mapVisemeToMorphName(id, keys);
      if (!targetName) return;

      decayOthers();

      // Start interpolation
      const currentTime = clockRef.current ? clockRef.current.getElapsedTime() * 1000 : 0;
      currentVisemeRef.current = {
        id,
        targetWeight: 1.0,
        startTime: currentTime
      };

      // Apply immediate weight for responsive feel
      const idx = dict[targetName];
      if (typeof idx === 'number') {
        influences[idx] = 0.3; // Start with partial weight
      }
    }
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.6, 2.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace as any;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((obj: THREE.Object3D) => {
          if ((obj as any).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.frustumCulled = false;
            if ((mesh.morphTargetInfluences && mesh.morphTargetInfluences.length) || (mesh as any).morphTargetDictionary) {
              // Heuristically assume head/face mesh is the first with morph targets
              if (!mouthMeshRef.current) {
                mouthMeshRef.current = mesh;
                morphDictRef.current = (mesh as any).morphTargetDictionary as Record<string, number> | undefined;
                morphInfluencesRef.current = mesh.morphTargetInfluences || undefined;
              }
            }
          }
        });

        if (gltf.animations && gltf.animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(root);
          const clip = gltf.animations[0];
          const action = mixerRef.current.clipAction(clip);
          action.play();
        }

        scene.add(root);

        if (morphDictRef.current) {
          // Log available morph targets to help mapping
          // eslint-disable-next-line no-console
          console.log('Avatar morph targets:', Object.keys(morphDictRef.current));
        }

        onReady && onReady();
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load avatar model:', err);
      }
    );

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const { clientWidth, clientHeight } = container;
      rendererRef.current.setSize(clientWidth, clientHeight);
      cameraRef.current.aspect = clientWidth / Math.max(1, clientHeight);
      cameraRef.current.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    clockRef.current = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const delta = clockRef.current ? clockRef.current.getDelta() : 0.016;
      if (mixerRef.current) mixerRef.current.update(delta);

      // Update viseme interpolation
      const currentTime = clockRef.current ? clockRef.current.getElapsedTime() * 1000 : 0;
      interpolateViseme(currentTime);

      // Slight idle decay so visemes relax over time
      decayOthers();

      renderer.render(scene, camera);
    };
    animate();

    onResize();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = rendererRef.current.domElement;
        canvas.parentElement && canvas.parentElement.removeChild(canvas);
      }
      mixerRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [modelUrl, onReady, pixelRatio]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }} />
      {debug && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>Viseme: {currentVisemeRef.current?.id ?? 'none'}</div>
          <div>Weight: {currentVisemeRef.current?.targetWeight?.toFixed(2) ?? '0.00'}</div>
          <div>Morphs: {morphDictRef.current ? Object.keys(morphDictRef.current).length : 0}</div>
        </div>
      )}
    </div>
  );
});

export default AvatarCanvas;


