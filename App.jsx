import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useProgress } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';
import modelUrl from './porsche_gt3_rs.glb?url';

import './styles.css';

const SECTION_COUNT = 6;
const GROUND_Y = -1.05;
const TIRE_CONTACT_LIFT = 0.12;
const BASE_RIDE_HEIGHT = 0.055;

// ---- Final exact positions from C:\D\car-positions.json ----
const CAR_THRESHOLDS = [0, 0.18, 0.36, 0.56, 0.74, 0.88, 1.0];
const DEFAULT_CAR_POSES = [
  { id: 'hero', posX: 0.28, posY: 0.54, posZ: -0.58, rotX: 0.04, rotY: 0.74, rotZ: -0.01, scale: 1.26 },
  { id: 'performance', posX: -0.47, posY: 0.058, posZ: -0.6, rotX: 0, rotY: 1.89, rotZ: 0, scale: 1.24 },
  { id: 'aero', posX: 0.59, posY: 0.38, posZ: -2.31, rotX: 0, rotY: 0, rotZ: 0, scale: 1.25 },
  { id: 'track', posX: 0.24, posY: 0.25, posZ: -1.7, rotX: -0.01, rotY: 3.06, rotZ: 0, scale: 1.17 },
  { id: 'detail', posX: -1.52, posY: 0.92, posZ: 1.65, rotX: -0.26, rotY: 1.54, rotZ: 0, scale: 1.57 },
  { id: 'cta', posX: -0.01, posY: 0.24, posZ: -1.16, rotX: 0, rotY: 1.44, rotZ: 0, scale: 0.84 },
];

const sections = [
  {
    id: 'hero',
    eyebrow: 'Porsche 911 GT3 RS',
    title: ['Circuit-Bred', 'Precision'],
    body:
      'A more restrained, premium launch experience built around the car first, with each section revealing performance and engineering details without overwhelming the silhouette.',
    align: 'left',
    className: 'panel-hero',
  },
  {
    id: 'performance',
    eyebrow: 'Powertrain',
    title: ['525 HP', '9000 RPM'],
    body:
      'The 4.0-litre naturally aspirated flat-six delivers immediate response, a 3.2 second sprint to 100 km/h, and a redline that defines the car’s character.',
    align: 'right',
    className: 'panel-performance',
  },
  {
    id: 'aero',
    eyebrow: 'Aerodynamics',
    title: ['Downforce', 'Precisely Deployed'],
    body:
      'Swan-neck wing mounts, front arch vents, and active aero surfaces shape pressure and cooling with a motorsport-first sense of purpose.',
    align: 'left',
    className: 'panel-aero',
  },
  {
    id: 'track',
    eyebrow: 'Track setup',
    title: ['Driver', 'In Command'],
    body:
      'Chassis, aero, and differential settings can all be tuned around the circuit. This section shifts into a sharper, more technical presentation.',
    align: 'right',
    className: 'panel-track',
  },
  {
    id: 'detail',
    eyebrow: 'Engineering',
    title: ['Materials With', 'Purpose'],
    body:
      'Carbon ceramic braking, magnesium wheels, and extensive CFRP components underline how carefully every kilogram has been considered.',
    align: 'left',
    className: 'panel-detail',
  },
  {
    id: 'cta',
    eyebrow: '911 GT3 RS',
    title: ['Configure The', 'GT3 RS'],
    body:
      'A wider final frame keeps the car fully visible, then closes with a quieter call to action and a replay path.',
    align: 'center',
    className: 'panel-cta',
  },
];

const stats = [
  { value: '3.2s', label: '0-100 km/h' },
  { value: '525 hp', label: 'Naturally aspirated' },
  { value: '9000', label: 'RPM redline' },
];

const aeroFeatures = [
  'Swan-neck rear wing for cleaner airflow under load.',
  'Front arch vents that dump heat and calm turbulence.',
  'Up to 409 kg of downforce at 285 km/h.',
];

const telemetry = [
  ['Suspension', 'Race'],
  ['Diff', 'Attack'],
  ['DRS', 'Armed'],
  ['Temp', 'Optimal'],
];

const detailCards = [
  {
    title: 'Carbon ceramic braking',
    text: '410 mm front rotors and six-piston calipers deliver late-braking confidence lap after lap.',
  },
  {
    title: 'Magnesium wheels',
    text: 'Reduced unsprung mass sharpens turn-in and lets the chassis breathe over brutal surface changes.',
  },
  {
    title: 'CFRP everywhere',
    text: 'Roof, hood, aero pieces, and structural touches are all there to strip weight without stripping feel.',
  },
];

function smoothstep(value) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function LoadingScreen() {
  const { active, progress } = useProgress();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const timer = window.setTimeout(() => setHidden(true), 450);
      return () => window.clearTimeout(timer);
    }
    setHidden(false);
    return undefined;
  }, [active, progress]);

  if (hidden) {
    return null;
  }

  return (
    <div className={`loading-screen ${hidden ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-visual" aria-hidden="true">
          <div className="loading-ring" />
          <div className="loading-ring loading-ring-secondary" />
          <div className="loading-core">
            <span>GT3 RS</span>
          </div>
          <div className="loading-orbit" />
          <div className="loading-speedbars">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="loading-title loading-title-minimal">Loading</div>
      </div>
    </div>
  );
}

function PorscheModel({ scrollProgress, carPoses }) {
  const groupRef = useRef(null);
  const sweepLightRef = useRef(null);
  const [model, setModel] = useState(null);
  const carPosesRef = useRef(carPoses);
  useEffect(() => { carPosesRef.current = carPoses; }, [carPoses]);

  useEffect(() => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(modelUrl, (gltf) => {
      const scene = gltf.scene;

      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const maxAxis = Math.max(size.x, size.z);
      const scale = 5.0 / maxAxis;

      scene.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(scene);
      const center = scaledBox.getCenter(new THREE.Vector3());

      scene.position.x -= center.x;
      scene.position.z -= center.z;
      scene.position.y -= scaledBox.min.y - (GROUND_Y + TIRE_CONTACT_LIFT);

      scene.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 1.35;
          child.material.roughness = Math.max(0.12, child.material.roughness ?? 0.12);
          child.material.metalness = Math.max(0.3, child.material.metalness ?? 0.3);
          child.material.needsUpdate = true;
        }
      });

      setModel(scene);
    }, undefined, (err) => {
      console.error('Model load error:', err);
    });
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return;
    }

    const t = scrollProgress.current;
    const elapsed = state.clock.elapsedTime;
    const poses = carPosesRef.current;

    let rotX = -0.02;
    let rotY = Math.PI * 0.12;
    let rotZ = 0;
    let posX = 0;
    let posY = BASE_RIDE_HEIGHT;
    let posZ = 0;
    let scale = 1;

    // ---- GUI-driven automatic movement: lerp between section poses (breathing OFF) ----
    const thresholds = CAR_THRESHOLDS;
    let seg = 0;
    for (let i = 0; i < thresholds.length - 1; i += 1) {
      if (t >= thresholds[i] && t < thresholds[i + 1]) { seg = i; break; }
      if (t >= thresholds[thresholds.length - 1]) seg = thresholds.length - 2;
    }
    if (t >= 0.99) seg = thresholds.length - 2;
    const t0 = thresholds[seg];
    const t1 = thresholds[seg + 1];
    const local = t1 > t0 ? smoothstep((t - t0) / (t1 - t0)) : 0;
    const start = poses[seg] || poses[0];
    const end = poses[Math.min(seg + 1, poses.length - 1)] || start;

    // per-section small & smooth lerp (baki transitions pehle jaise)
    if (seg === 5) {
      // simple small transition only details->cta (keep minimal)
      const localCta = smoothstep((t - 0.88) / 0.12);
      rotY = THREE.MathUtils.lerp(start.rotY, start.rotY + 0.22, localCta);
      rotX = THREE.MathUtils.lerp(start.rotX, start.rotX - 0.01, localCta);
      posX = THREE.MathUtils.lerp(start.posX, start.posX - 0.01, localCta);
      posY = THREE.MathUtils.lerp(start.posY, start.posY + 0.015, localCta);
      posZ = THREE.MathUtils.lerp(start.posZ, start.posZ - 0.04, localCta);
      scale = THREE.MathUtils.lerp(start.scale, start.scale - 0.02, localCta);
    } else {
      posX = THREE.MathUtils.lerp(start.posX, end.posX, local);
      posY = THREE.MathUtils.lerp(start.posY, end.posY, local);
      posZ = THREE.MathUtils.lerp(start.posZ, end.posZ, local);
      rotX = THREE.MathUtils.lerp(start.rotX, end.rotX, local);
      rotY = THREE.MathUtils.lerp(start.rotY, end.rotY, local);
      rotZ = THREE.MathUtils.lerp(start.rotZ, end.rotZ, local);
      scale = THREE.MathUtils.lerp(start.scale, end.scale, local);
    }

    // small & smooth damp (lower lambda = smoother)
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, rotX, 2.8, delta);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, rotY, 2.8, delta);
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, rotZ, 2.8, delta);
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, posX, 3.0, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, posY, 3.0, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, posZ, 3.0, delta);
    groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, scale, 3.0, delta));

    if (sweepLightRef.current) {
      const activeSweep = t > 0.3 && t < 0.62;
      const targetIntensity = activeSweep ? 55 : 0;
      sweepLightRef.current.intensity = THREE.MathUtils.damp(
        sweepLightRef.current.intensity,
        targetIntensity,
        5,
        delta,
      );
      sweepLightRef.current.position.x = Math.sin(elapsed * 1.5) * 4.8;
      sweepLightRef.current.position.z = Math.cos(elapsed * 1.5) * 4.8;
    }
  });

  if (!model) return <group ref={groupRef} />;

  return (
    <group ref={groupRef}>
      <primitive object={model} />
      <spotLight
        ref={sweepLightRef}
        position={[4.5, 3.6, 4.5]}
        angle={0.35}
        penumbra={1}
        intensity={0}
        color="#ff7a2f"
        distance={14}
      />
    </group>
  );
}

function Atmosphere({ scrollProgress }) {
  const pointsRef = useRef(null);

  const particles = useMemo(() => {
    const count = 320;
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      positions[offset] = (Math.random() - 0.5) * 26;
      positions[offset + 1] = Math.random() * 7 - 2;
      positions[offset + 2] = (Math.random() - 0.5) * 22;

      velocity[offset] = (Math.random() - 0.5) * 0.0024;
      velocity[offset + 1] = Math.random() * 0.0012 + 0.0002;
      velocity[offset + 2] = (Math.random() - 0.5) * 0.0024;
    }

    return { count, positions, velocity };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }

    const attribute = pointsRef.current.geometry.attributes.position;
    const array = attribute.array;
    const elapsed = state.clock.elapsedTime;
    const progress = scrollProgress.current;
    const boost = progress > 0.52 && progress < 0.75 ? 2.8 : 1;
    for (let index = 0; index < particles.count; index += 1) {
      const offset = index * 3;
      array[offset] += (particles.velocity[offset] + Math.sin(elapsed * 0.3 + index) * 0.00025) * boost;
      array[offset + 1] += particles.velocity[offset + 1] + Math.cos(elapsed * 0.45 + index) * 0.0002;
      array[offset + 2] += (particles.velocity[offset + 2] + Math.cos(elapsed * 0.2 + index) * 0.00022) * boost;

      if (Math.abs(array[offset]) > 14) {
        array[offset] *= -0.45;
      }
      if (array[offset + 1] > 6) {
        array[offset + 1] = -2;
      }
      if (Math.abs(array[offset + 2]) > 12) {
        array[offset + 2] *= -0.45;
      }
    }

    attribute.needsUpdate = true;
    pointsRef.current.material.opacity = 0.08 + progress * 0.12 + (boost > 1 ? 0.08 : 0);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.024}
        color="#ff6a1b"
        transparent
        opacity={0.14}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function SceneLighting({ scrollProgress }) {
  const keyRef = useRef(null);
  const rimRef = useRef(null);
  const underglowRef = useRef(null);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    const progress = scrollProgress.current;
    if (keyRef.current) {
      const target = 44 + Math.sin(elapsed * 0.8) * 4 + (progress > 0.18 && progress < 0.38 ? 12 : 0);
      keyRef.current.intensity = THREE.MathUtils.damp(keyRef.current.intensity, target, 4, delta);
    }

    if (rimRef.current) {
      const target = 24 + progress * 20 + Math.sin(elapsed * 1.2) * 3;
      rimRef.current.intensity = THREE.MathUtils.damp(rimRef.current.intensity, target, 4, delta);
    }

    if (underglowRef.current) {
      const target = progress > 0.52 && progress < 0.75 ? 28 : 8;
      underglowRef.current.intensity = THREE.MathUtils.damp(underglowRef.current.intensity, target, 5, delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#2d3542" />
      <hemisphereLight intensity={0.25} groundColor="#0f0c0b" color="#9db0c9" />
      <spotLight
        ref={keyRef}
        position={[7, 8, 7]}
        angle={0.42}
        penumbra={1}
        intensity={46}
        color="#fff3e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      <spotLight
        ref={rimRef}
        position={[-8, 4, -6]}
        angle={0.58}
        penumbra={1}
        intensity={28}
        color="#ff4d17"
      />
      <pointLight
        ref={underglowRef}
        position={[0, -1.1, 0]}
        intensity={10}
        color="#ff3f17"
        distance={9}
      />
      <rectAreaLight position={[0, 4.8, -6]} width={12} height={6} intensity={3.5} color="#f4f2ef" />
      <rectAreaLight position={[0, 2.8, 6]} width={8} height={3.2} intensity={2.2} color="#ff8650" />
    </>
  );
}

function CameraRig({ scrollProgress }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.15, 0));

  useFrame((state, delta) => {
    const progress = scrollProgress.current;
    const elapsed = state.clock.elapsedTime;

    let x = 1.8;
    let y = 1.3;
    let z = 6.2;
    let targetY = 0.18;

    if (progress < 0.18) {
      const local = smoothstep(progress / 0.18);
      x = 2.0 - local * 0.5;
      y = 1.4 - local * 0.15;
      z = 6.5 - local * 0.8;
    } else if (progress < 0.36) {
      const local = smoothstep((progress - 0.18) / 0.18);
      x = 1.5 - local * 1.8;
      y = 1.25 - local * 0.22;
      z = 5.7 - local * 1.6;
      targetY = 0.08;
    } else if (progress < 0.56) {
      const local = smoothstep((progress - 0.36) / 0.2);
      x = -0.3 - local * 2.0;
      y = 1.03 + local * 0.9;
      z = 4.1 + local * 1.0;
      targetY = 0.12 + local * 0.18;
    } else if (progress < 0.74) {
      const local = smoothstep((progress - 0.56) / 0.18);
      const shake = local * 0.03;
      x = -2.3 + local * 3.6 + Math.sin(elapsed * 24) * shake;
      y = 1.93 - local * 1.0 + Math.cos(elapsed * 26) * shake * 0.4;
      z = 5.1 - local * 0.45;
      targetY = 0.3 - local * 0.18;
    } else if (progress < 0.88) {
      const local = smoothstep((progress - 0.74) / 0.14);
      x = 1.3 - local * 0.4;
      y = 0.93 - local * 0.52;
      z = 4.65 - local * 0.9;
      targetY = 0.06 - local * 0.28;
    } else {
      // simple small transition details -> cta (no camera inside car)
      const local = smoothstep((progress - 0.88) / 0.12);
      const startX = 0.9, startY = 0.41, startZ = 3.75, startTY = 0.06 - 0.28;
      x = THREE.MathUtils.lerp(startX, 0.45, local);
      y = THREE.MathUtils.lerp(startY, 0.72, local);
      z = THREE.MathUtils.lerp(startZ, 4.85, local);
      targetY = THREE.MathUtils.lerp(startTY, 0.16, local);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 3.4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 3.4, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 3.4, delta);

    target.current.y = THREE.MathUtils.damp(target.current.y, targetY, 3.6, delta);
    camera.lookAt(target.current);
  });

  return null;
}

function Scene({ scrollProgress, carPoses }) {
  return (
    <>
      <color attach="background" args={['#050608']} />
      <fog attach="fog" args={['#050608', 11, 18]} />
      <Environment preset="night" />
      <SceneLighting scrollProgress={scrollProgress} />
      <CameraRig scrollProgress={scrollProgress} />
      <PorscheModel scrollProgress={scrollProgress} carPoses={carPoses} />
      <Atmosphere scrollProgress={scrollProgress} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#090909" roughness={0.42} metalness={0.58} />
      </mesh>
    </>
  );
}

function ScrollRail({ activeIndex, onSelect }) {
  return (
    <div className="scroll-rail">
      {sections.map((section, index) => (
        <button
          key={section.id}
          type="button"
          className={`rail-stop ${index === activeIndex ? 'active' : ''}`}
          onClick={() => onSelect(index)}
          aria-label={`Jump to ${section.id}`}
        >
          <span className="rail-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="rail-label">{section.id}</span>
        </button>
      ))}
    </div>
  );
}

function HeroPanel({ active }) {
  return (
    <div className={`panel-shell panel-shell-left ${active ? 'is-active' : ''}`}>
      <div className="hero-topline">
        <span className="brand-mark">PORSCHE</span>
        <span className="hero-chip">Track Experience</span>
      </div>
      <div className="hero-content-block">
        <p className="eyebrow">Porsche 911 GT3 RS</p>
        <h1 className="display-title">
          <span>Circuit-Bred</span>
          <span>Precision</span>
        </h1>
        <p className="panel-body panel-body-wide">
          The layout keeps the GT3 RS as the focal point while each section introduces performance, aerodynamics, and driver-focused engineering in a more refined sequence.
        </p>
      </div>
      <div className="hero-bottomline">
        <div className="hero-spec-pill">Track-first aero</div>
        <div className="hero-spec-pill">Active downforce</div>
        <div className="hero-spec-pill">4.0L flat-six</div>
      </div>
    </div>
  );
}

function PerformancePanel({ active }) {
  return (
    <div className={`panel-shell panel-shell-right ${active ? 'is-active' : ''}`}>
      <p className="eyebrow">Powertrain</p>
      <h2 className="display-title display-title-small">
        <span>525 HP</span>
        <span>9000 RPM</span>
      </h2>
      <p className="panel-body">
        A naturally aspirated flat-six, immediate throttle response, and tightly stacked ratios define the GT3 RS as a car engineered around precision rather than excess.
      </p>
      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AeroPanel({ active }) {
  return (
    <div className={`panel-shell panel-shell-left ${active ? 'is-active' : ''}`}>
      <p className="eyebrow">Aerodynamics</p>
      <h2 className="display-title display-title-small">
        <span>Downforce</span>
        <span>Precisely Deployed</span>
      </h2>
      <p className="panel-body">
        The bodywork works as an airflow system. This section is framed higher so the wing, roofline, and venting surfaces read clearly against the silhouette.
      </p>
      <div className="feature-stack">
        {aeroFeatures.map((item, index) => (
          <div key={item} className="feature-row">
            <span className="feature-number">{String(index + 1).padStart(2, '0')}</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackPanel({ active }) {
  return (
    <div className={`panel-shell panel-shell-right ${active ? 'is-active' : ''}`}>
      <p className="eyebrow">Track setup</p>
      <h2 className="display-title display-title-small">
        <span>Driver</span>
        <span>In Command</span>
      </h2>
      <p className="panel-body">
        Differential, damping, and aero-related settings create a more technical moment in the story, supported by a subtle HUD rather than a loud interruption.
      </p>
      <div className="telemetry-grid">
        {telemetry.map(([label, value]) => (
          <div key={label} className="telemetry-card">
            <span className="telemetry-label">{label}</span>
            <span className="telemetry-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ active }) {
  return (
    <div className={`panel-shell panel-shell-left ${active ? 'is-active' : ''}`}>
      <p className="eyebrow">Engineering</p>
      <h2 className="display-title display-title-small">
        <span>Materials With</span>
        <span>Purpose</span>
      </h2>
      <p className="panel-body">
        Every visible component carries a functional reason to exist, from braking hardware to wheel material to the way weight is taken out of the upper body.
      </p>
      <div className="detail-grid">
        {detailCards.map((card) => (
          <article key={card.title} className="detail-card">
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function CtaPanel({ active, onReplay }) {
  return (
    <div className={`panel-shell panel-shell-ribbon ${active ? 'is-active' : ''}`}>
      <div className="cta-copy">
        <p className="eyebrow">911 GT3 RS</p>
        <h2 className="display-title display-title-small">
          <span>Configure The</span>
          <span>GT3 RS</span>
        </h2>
        <p className="panel-body panel-body-wide">
          The final section now stays low and wide so the complete car remains visible behind the call to action.
        </p>
      </div>
      <div className="cta-aside">
        <div className="cta-specline">
          <span>525 hp</span>
          <span>3.2s</span>
          <span>409 kg downforce</span>
        </div>
        <div className="cta-actions">
          <div className="cta-row">
            <button type="button" className="cta-primary">
              Configure Car
            </button>
            <button type="button" className="cta-secondary">
              Book a Call
            </button>
          </div>
          <button type="button" className="cta-link" onClick={onReplay}>
            Replay Experience
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionPanel({ section, index, activeIndex, onReplay }) {
  const isActive = index === activeIndex;

  if (section.id === 'hero') {
    return <HeroPanel active={isActive} />;
  }

  if (section.id === 'performance') {
    return <PerformancePanel active={isActive} />;
  }

  if (section.id === 'aero') {
    return <AeroPanel active={isActive} />;
  }

  if (section.id === 'track') {
    return <TrackPanel active={isActive} />;
  }

  if (section.id === 'detail') {
    return <DetailPanel active={isActive} />;
  }

  return <CtaPanel active={isActive} onReplay={onReplay} />;
}

export default function App() {
  const scrollRef = useRef(null);
  const scrollProgress = useRef(0);
  const targetProgress = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const carPoses = DEFAULT_CAR_POSES;

  // ---- ekdum smooth scroll + har section me thora lock ----
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      scrollProgress.current = THREE.MathUtils.damp(scrollProgress.current, targetProgress.current, 2.2, 0.016);
      if (Math.abs(scrollProgress.current - targetProgress.current) < 0.0005) scrollProgress.current = targetProgress.current;
      const sectionIndex = Math.min(SECTION_COUNT - 1, Math.round(scrollProgress.current * (SECTION_COUNT - 1)));
      setActiveIndex(prev => prev !== sectionIndex ? sectionIndex : prev);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return undefined;
    }

    const updateFromScroll = () => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      const progress = maxScroll > 0 ? element.scrollTop / maxScroll : 0;
      targetProgress.current = THREE.MathUtils.clamp(progress, 0, 1);
    };

    updateFromScroll();
    scrollProgress.current = targetProgress.current;
    element.addEventListener('scroll', updateFromScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', updateFromScroll);
    };
  }, []);

  const scrollToSection = (index) => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const startTop = element.scrollTop;
    const targetTop = index * window.innerHeight;
    const duration = 1250;
    const startTime = performance.now();
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const animate = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(p);
      element.scrollTop = startTop + (targetTop - startTop) * eased;
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 0) targetProgress.current = THREE.MathUtils.clamp(element.scrollTop / maxScroll, 0, 1);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  // section-by-section lock — jitna bhi tez scroll karo ek hi section, har section pe wait
  const isAnimatingRef = useRef(false);
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    let touchStartY = 0;
    const lockMs = 1500;
    const go = (dir) => {
      if (isAnimatingRef.current) return;
      const cur = activeIndexRef.current;
      const nxt = Math.min(SECTION_COUNT - 1, Math.max(0, cur + dir));
      if (nxt === cur) return;
      isAnimatingRef.current = true;
      scrollToSection(nxt);
      window.setTimeout(() => { isAnimatingRef.current = false; }, lockMs);
    };
    const onWheel = (e) => {
      e.preventDefault();
      if (isAnimatingRef.current) return;
      const dir = Math.sign(e.deltaY);
      if (dir !== 0) go(dir);
    };
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 28) return;
      if (isAnimatingRef.current) return;
      go(Math.sign(dy));
    };
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const replay = () => scrollToSection(0);

  return (
    <div className="app-shell">
      <LoadingScreen />

      <div className="scene-layer">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [2.0, 1.4, 6.5], fov: 34 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={null}>
            <Scene scrollProgress={scrollProgress} carPoses={carPoses} />
          </Suspense>
        </Canvas>
      </div>


      <div className="vignette-layer" />
      <div className="mesh-gradient" />
      <div className={`track-glow ${activeIndex === 3 ? 'is-live' : ''}`} />

      <header className="floating-header">
        <div className="header-brand">
          <span className="brand-mark">PORSCHE</span>
          <span className="header-model">911 GT3 RS</span>
        </div>
        <button type="button" className="header-button" onClick={() => scrollToSection(SECTION_COUNT - 1)}>
          Explore Spec
        </button>
      </header>

      <ScrollRail activeIndex={activeIndex} onSelect={scrollToSection} />

      <div className="scroll-frame" ref={scrollRef}>
        {sections.map((section, index) => (
          <section key={section.id} className={`story-panel ${section.className}`}>
            <SectionPanel section={section} index={index} activeIndex={activeIndex} onReplay={replay} />
          </section>
        ))}
      </div>

      <div className="scroll-prompt">
        <span className="scroll-prompt-line" />
        <span>Scroll to orbit the GT3 RS</span>
      </div>
    </div>
  );
}

