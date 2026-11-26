"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";

export type Food3DApi = { exportGLB: () => Promise<Blob> };
export type ViewName = "angle" | "top" | "side";

const VIEWS: Record<ViewName, [number, number, number]> = { angle: [2.3, 1.9, 2.7], top: [0, 4.2, 0.01], side: [0, 0.7, 4] };

/* ───────── helpers ───────── */
function scatter(n: number, radius: number, seed = 1) {
  const out: { x: number; z: number; r: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const rr = radius * Math.sqrt((i + 0.5) / n);
    const th = i * 2.39996 + seed * 1.7;
    out.push({ x: Math.cos(th) * rr, z: Math.sin(th) * rr, r: (i * 1.3 + seed) % (Math.PI * 2), s: 0.85 + ((i * 37 + seed * 11) % 30) / 100 });
  }
  return out;
}

/** Scale-in animation so ingredients visibly pop on and off the dish. */
function Pop({ on, children }: { on: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const t = on ? 1 : 0;
    const cur = o.scale.x;
    if (Math.abs(t - cur) > 0.005) {
      const s = cur + (t - cur) * Math.min(1, dt * 9);
      o.scale.setScalar(Math.max(0.0001, s));
      o.position.y = (1 - s) * 0.5;
      invalidate();
    }
    o.visible = cur > 0.02 || on;
  });
  return (
    <group ref={g} scale={0.0001} visible={false}>
      {children}
    </group>
  );
}

const M = ({ c, r = 0.7, m = 0, o = 1, e }: { c: string; r?: number; m?: number; o?: number; e?: string }) => (
  <meshStandardMaterial color={c} roughness={r} metalness={m} transparent={o < 1} opacity={o} emissive={e ?? "#000"} emissiveIntensity={e ? 0.35 : 0} />
);

type Has = (k: string) => boolean;

/* ───────── pizza ───────── */
function Pizza({ has }: { has: Has }) {
  const burst = has("crust:cheeseburst");
  const thin = has("crust:thin");
  const white = has("layer:sauce_white");
  const T = (k: string, node: ReactNode) => (
    <Pop on={has("layer:" + k)} key={k}>
      {node}
    </Pop>
  );
  return (
    <group>
      {/* Hand-finished ceramic plate: layered rim, foot ring and subtle glaze */}
      <mesh position-y={-0.045} castShadow receiveShadow>
        <cylinderGeometry args={[1.22, 1.18, 0.075, 96]} />
        <meshPhysicalMaterial color="#e9e0d2" roughness={0.19} metalness={0.03} clearcoat={0.7} clearcoatRoughness={0.16} />
      </mesh>
      <mesh position-y={-0.004} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.08, 0.025, 12, 96]} />
        <meshStandardMaterial color="#b99b72" roughness={0.32} metalness={0.28} />
      </mesh>
      <mesh position-y={0.005}>
        <cylinderGeometry args={[1.04, 1.04, 0.012, 96]} />
        <meshStandardMaterial color="#f3ece1" roughness={0.24} />
      </mesh>
      <mesh position-y={0.05} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, thin ? 0.06 : 0.1, 56]} />
        <M c="#d9a05b" r={0.9} />
      </mesh>
      <mesh position-y={thin ? 0.07 : 0.1} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.97, burst ? 0.17 : thin ? 0.05 : 0.11, 16, 56]} />
        <M c={burst ? "#e0a050" : "#c98a45"} r={0.85} />
      </mesh>
      {burst &&
        scatter(18, 0.97, 3).map((p, i) => (
          <mesh key={i} position={[Math.cos(i * 0.349) * 0.97, 0.2, Math.sin(i * 0.349) * 0.97]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <M c="#ffe08a" r={0.4} />
          </mesh>
        ))}
      <mesh position-y={0.112}>
        <cylinderGeometry args={[0.87, 0.87, 0.02, 56]} />
        <M c={white ? "#f4e6c8" : "#b0281d"} r={0.5} />
      </mesh>
      <mesh position-y={0.13}>
        <cylinderGeometry args={[0.85, 0.85, 0.03, 56]} />
        <M c="#f6d36b" r={0.45} />
      </mesh>
      <group position-y={0.17}>
        {T("pepperoni", <>{scatter(10, 0.7, 1).map((p, i) => <mesh key={i} position={[p.x, 0, p.z]} scale={p.s}><cylinderGeometry args={[0.13, 0.13, 0.025, 20]} /><M c="#a4231b" r={0.5} /></mesh>)}</>)}
        {T("mushroom", <>{scatter(9, 0.72, 2).map((p, i) => <mesh key={i} position={[p.x, 0.02, p.z]} rotation-y={p.r} scale={[p.s * 1.2, 0.55, p.s]}><sphereGeometry args={[0.09, 12, 8]} /><M c="#e9dcc6" r={0.8} /></mesh>)}</>)}
        {T("olive", <>{scatter(14, 0.74, 3).map((p, i) => <mesh key={i} position={[p.x, 0.01, p.z]} rotation-x={Math.PI / 2}><torusGeometry args={[0.045, 0.02, 8, 14]} /><M c="#1c1c1c" r={0.4} /></mesh>)}</>)}
        {T("onion", <>{scatter(11, 0.74, 4).map((p, i) => <mesh key={i} position={[p.x, 0.005, p.z]} rotation={[Math.PI / 2, 0, p.r]}><torusGeometry args={[0.07, 0.012, 6, 16, 4.5]} /><M c="#b36bb0" r={0.6} /></mesh>)}</>)}
        {T("pepper", <>{scatter(10, 0.74, 5).map((p, i) => <mesh key={i} position={[p.x, 0.01, p.z]} rotation-y={p.r} scale={p.s}><boxGeometry args={[0.16, 0.025, 0.05]} /><M c={i % 2 ? "#3d9b3a" : "#e0a21a"} r={0.5} /></mesh>)}</>)}
        {T("jalapeno", <>{scatter(8, 0.72, 6).map((p, i) => <mesh key={i} position={[p.x, 0.012, p.z]} scale={p.s}><cylinderGeometry args={[0.07, 0.07, 0.022, 14]} /><M c="#6bb23a" r={0.4} /></mesh>)}</>)}
        {T("corn", <>{scatter(26, 0.76, 7).map((p, i) => <mesh key={i} position={[p.x, 0.01, p.z]}><sphereGeometry args={[0.04, 8, 6]} /><M c="#ffd23a" r={0.4} /></mesh>)}</>)}
        {T("basil", <>{scatter(6, 0.65, 8).map((p, i) => <mesh key={i} position={[p.x, 0.02, p.z]} rotation={[-Math.PI / 2, 0, p.r]} scale={[1.6, 1, 1]}><circleGeometry args={[0.1, 12]} /><meshStandardMaterial color="#2f8a3b" side={THREE.DoubleSide} roughness={0.6} /></mesh>)}</>)}
        {T("cheese", <>{scatter(14, 0.7, 9).map((p, i) => <mesh key={i} position={[p.x, 0.0, p.z]} scale={[p.s * 1.4, 0.4, p.s * 1.2]}><sphereGeometry args={[0.1, 10, 6]} /><M c="#fff2c4" r={0.35} /></mesh>)}</>)}
      </group>
    </group>
  );
}

/* ───────── burger ───────── */
function Burger({ has }: { has: Has }) {
  const patties = 1 + (has("add:extra-patty") ? 1 : 0) + 1; // base burger is a double
  const rows: { h: number; node: ReactNode; key: string }[] = [];
  rows.push({ key: "bun-b", h: 0.24, node: <mesh><cylinderGeometry args={[0.88, 0.8, 0.24, 40]} /><M c="#d28a3c" r={0.7} /></mesh> });
  if (!has("remove:lettuce")) rows.push({ key: "lettuce", h: 0.08, node: <mesh scale={[1, 0.5, 1]}><torusGeometry args={[0.86, 0.1, 10, 40]} /><M c="#5fb04a" r={0.6} /></mesh> });
  for (let i = 0; i < patties; i++) {
    rows.push({ key: "p" + i, h: 0.2, node: <mesh><cylinderGeometry args={[0.9, 0.9, 0.2, 40]} /><M c="#4a2818" r={0.9} /></mesh> });
    rows.push({ key: "c" + i, h: 0.04, node: <mesh rotation-y={Math.PI / 4}><boxGeometry args={[1.45, 0.04, 1.45]} /><M c="#f2b632" r={0.4} /></mesh> });
  }
  if (has("add:extra-cheese")) rows.push({ key: "xc", h: 0.04, node: <mesh rotation-y={0.2}><boxGeometry args={[1.4, 0.04, 1.4]} /><M c="#f7c548" r={0.4} /></mesh> });
  if (has("add:crispy-bacon")) rows.push({ key: "bacon", h: 0.06, node: <group>{[-0.3, 0, 0.3].map((z) => <mesh key={z} position={[0, 0, z]} rotation-y={0.3}><boxGeometry args={[1.3, 0.04, 0.22]} /><M c="#a1302a" r={0.6} /></mesh>)}</group> });
  if (has("add:fried-egg")) rows.push({ key: "egg", h: 0.06, node: <group><mesh><cylinderGeometry args={[0.6, 0.6, 0.04, 28]} /><M c="#fffaf0" r={0.4} /></mesh><mesh position-y={0.05}><sphereGeometry args={[0.2, 14, 10]} /><M c="#f4b400" r={0.3} /></mesh></group> });
  if (has("add:avocado")) rows.push({ key: "avo", h: 0.06, node: <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.55, 0.07, 8, 28]} /><M c="#9bc34a" r={0.5} /></mesh> });
  if (!has("remove:tomato")) rows.push({ key: "tom", h: 0.07, node: <mesh><cylinderGeometry args={[0.78, 0.78, 0.07, 32]} /><M c="#d1342a" r={0.4} /></mesh> });
  if (!has("remove:onion")) rows.push({ key: "on", h: 0.04, node: <mesh rotation-x={Math.PI / 2}><torusGeometry args={[0.55, 0.03, 6, 28]} /><M c="#c779c0" r={0.5} /></mesh> });
  if (!has("remove:pickles")) rows.push({ key: "pk", h: 0.04, node: <group>{[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos(i * 1.57) * 0.5, 0, Math.sin(i * 1.57) * 0.5]}><cylinderGeometry args={[0.17, 0.17, 0.03, 16]} /><M c="#6e9a2e" r={0.4} /></mesh>)}</group> });
  let y = 0;
  const placed = rows.map((r) => {
    const pos = y + r.h / 2;
    y += r.h;
    return { ...r, pos };
  });
  const total = y;
  return (
    <group position-y={-total / 2 + 0.1}>
      {placed.map((r) => (
        <group key={r.key} position-y={r.pos}>
          {r.node}
        </group>
      ))}
      <group position-y={total + 0.02}>
        <mesh scale={[1, 0.85, 1]}>
          <sphereGeometry args={[0.92, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <M c="#d58a34" r={0.55} />
        </mesh>
        {scatter(16, 0.55, 2).map((p, i) => (
          <mesh key={i} position={[p.x, 0.62 - (p.x * p.x + p.z * p.z) * 0.6, p.z]} rotation-z={p.r} scale={[1.6, 0.8, 1]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <M c="#f6e7bf" r={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ───────── drink ───────── */
function Drink({ has }: { has: Has }) {
  const large = has("choice:large");
  return (
    <group scale={large ? 1.15 : 1} position-y={-0.2}>
      <mesh position-y={0.7}>
        <cylinderGeometry args={[0.52, 0.42, 1.4, 36, 1, true]} />
        <M c="#cfe8ff" o={0.22} r={0.1} />
      </mesh>
      <mesh position-y={0.62}>
        <cylinderGeometry args={[0.49, 0.4, 1.12, 32]} />
        <M c="#7a4b2c" r={0.35} />
      </mesh>
      <mesh position-y={1.12}>
        <cylinderGeometry args={[0.5, 0.49, 0.18, 32]} />
        <M c="#f1e2cb" r={0.4} />
      </mesh>
      {[[-0.18, 0.95, 0.1], [0.2, 0.85, -0.12], [0.05, 0.6, 0.22], [-0.2, 0.5, -0.15], [0.22, 0.38, 0.1]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[i, i * 2, i * 0.5]}>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <M c="#dff1ff" o={has("choice:no-ice") ? 0 : 0.55} r={0.1} />
        </mesh>
      ))}
      <mesh position={[0.15, 0.95, 0]} rotation-z={-0.12}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
        <M c="#ffffff" r={0.5} />
      </mesh>
      <Pop on={has("add:whipped-cream")}>
        <mesh position-y={1.28}>
          <coneGeometry args={[0.32, 0.4, 20]} />
          <M c="#fff8ee" r={0.5} />
        </mesh>
      </Pop>
    </group>
  );
}

/* ───────── dessert ───────── */
function Dessert({ has }: { has: Has }) {
  return (
    <group position-y={-0.2}>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[1.25, 1.1, 0.06, 48]} />
        <M c="#f3f0ea" r={0.2} />
      </mesh>
      <mesh position={[-0.12, 0.3, 0]}>
        <cylinderGeometry args={[0.52, 0.56, 0.5, 36]} />
        <M c="#3a1c10" r={0.7} />
      </mesh>
      <mesh position={[-0.12, 0.56, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.4, 0.07, 10, 30]} />
        <M c="#2b140b" r={0.4} />
      </mesh>
      <mesh position={[-0.12, 0.6, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <M c="#f5c542" m={0.9} r={0.2} />
      </mesh>
      <Pop on={has("add:vanilla-ice-cream")}>
        <mesh position={[0.65, 0.3, 0.1]}>
          <sphereGeometry args={[0.3, 24, 18]} />
          <M c="#fff1cf" r={0.6} />
        </mesh>
      </Pop>
      <Pop on={has("add:hot-fudge")}>
        <mesh position={[-0.12, 0.62, 0]}>
          <cylinderGeometry args={[0.44, 0.5, 0.05, 24]} />
          <M c="#1d0d06" r={0.2} />
        </mesh>
      </Pop>
      <Pop on={has("add:fresh-berries")}>
        <group>
          {scatter(7, 0.9, 2).map((p, i) => (
            <mesh key={i} position={[p.x, 0.12, p.z]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <M c={i % 2 ? "#b01e3c" : "#4b2a7a"} r={0.3} />
            </mesh>
          ))}
        </group>
      </Pop>
    </group>
  );
}

/* ───────── pasta / generic ───────── */
function Pasta({ has }: { has: Has }) {
  return (
    <group position-y={-0.15}>
      <mesh position-y={0.28} rotation-x={Math.PI}>
        <sphereGeometry args={[1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position-y={0.32 + i * 0.045} rotation={[Math.PI / 2 + i * 0.07, i * 0.4, i * 0.9]}>
          <torusGeometry args={[0.55 - i * 0.04, 0.07, 8, 28]} />
          <M c={has("choice:penne") ? "#e6c26a" : "#f1d58a"} r={0.6} />
        </mesh>
      ))}
      <mesh position-y={0.56}>
        <cylinderGeometry args={[0.5, 0.5, 0.03, 28]} />
        <M c="#f5ead0" r={0.5} />
      </mesh>
      <Pop on={has("add:shaved-truffle")}>
        <group>{scatter(8, 0.4, 3).map((p, i) => <mesh key={i} position={[p.x, 0.6, p.z]} scale={[1.4, 0.6, 1]}><sphereGeometry args={[0.04, 6, 6]} /><M c="#161010" r={0.6} /></mesh>)}</group>
      </Pop>
      <Pop on={has("add:grilled-chicken")}>
        <group>{scatter(5, 0.4, 5).map((p, i) => <mesh key={i} position={[p.x, 0.62, p.z]} rotation-y={p.r}><boxGeometry args={[0.2, 0.08, 0.12]} /><M c="#c28a4a" r={0.7} /></mesh>)}</group>
      </Pop>
    </group>
  );
}

function Generic() {
  return (
    <group position-y={-0.1}>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[1.1, 1, 0.06, 48]} />
        <M c="#efece6" r={0.2} />
      </mesh>
      <mesh position-y={0.35} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.6, 32, 18]} />
        <M c="#d9a441" m={0.6} r={0.3} />
      </mesh>
    </group>
  );
}

/* ───────── GLB ───────── */
function Glb({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z || 1);
    c.position.sub(center);
    const g = new THREE.Group();
    g.add(c);
    g.scale.setScalar(s);
    return g;
  }, [scene]);
  return <primitive object={obj} />;
}

/* ───────── camera rig ───────── */
function Rig({ view }: { view: ViewName }) {
  const { camera, invalidate } = useThree();
  const target = useRef(new THREE.Vector3(...VIEWS[view]));
  const frames = useRef(0);
  useEffect(() => {
    target.current.set(...VIEWS[view]);
    frames.current = 60;
    invalidate();
  }, [view, invalidate]);
  useFrame(() => {
    if (frames.current > 0) {
      camera.position.lerp(target.current, 0.12);
      camera.lookAt(0, 0.3, 0);
      frames.current--;
      invalidate();
    }
  });
  return null;
}

function Scene({ visual, has, scale, modelUrl, onReady }: { visual: string; has: Has; scale: number; modelUrl?: string | null; onReady?: (a: Food3DApi) => void }) {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    onReady?.({
      exportGLB: async () => {
        const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
        const ex = new GLTFExporter();
        const root = group.current!;
        return new Promise<Blob>((resolve, reject) => {
          ex.parse(root, (res) => resolve(new Blob([res as ArrayBuffer], { type: "model/gltf-binary" })), reject, { binary: true, onlyVisible: true });
        });
      },
    });
  }, [onReady]);
  return (
    <group ref={group} scale={scale}>
      {modelUrl ? (
        <Suspense fallback={null}>
          <Glb url={modelUrl} />
        </Suspense>
      ) : visual === "pizza" ? (
        <Pizza has={has} />
      ) : visual === "burger" ? (
        <Burger has={has} />
      ) : visual === "drink" ? (
        <Drink has={has} />
      ) : visual === "dessert" ? (
        <Dessert has={has} />
      ) : visual === "pasta" ? (
        <Pasta has={has} />
      ) : (
        <Generic />
      )}
    </group>
  );
}

export default function Food3D({
  visual,
  layers,
  scale = 1,
  view = "angle",
  modelUrl,
  lite,
  onReady,
}: {
  visual: string;
  layers: string[];
  scale?: number;
  view?: ViewName;
  modelUrl?: string | null;
  lite?: boolean;
  onReady?: (a: Food3DApi) => void;
}) {
  const set = useMemo(() => new Set(layers), [layers]);
  const has = useMemo<Has>(() => (k) => set.has(k), [set]);
  return (
    <Canvas dpr={lite ? 1 : [1, 1.8]} frameloop={lite ? "demand" : "always"} camera={{ position: VIEWS.angle, fov: 38 }} gl={{ antialias: !lite, powerPreference: "high-performance" }} style={{ touchAction: "pan-y" }}>
      <ambientLight intensity={0.32} />
      <hemisphereLight args={["#fff1dc", "#24130b", 0.8]} />
      <directionalLight castShadow position={[3.5, 6, 4]} intensity={2.6} color="#fff0d5" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 2, -3]} intensity={1.05} color="#ff9b50" />
      <pointLight position={[0, 2.5, 3]} intensity={9} distance={8} decay={2} color="#ffe0b0" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3.2} position={[0, 5, 3]} scale={[7, 2, 1]} color="#fff0d8" />
        <Lightformer form="rect" intensity={1.8} position={[-4, 1, -2]} scale={[2, 4, 1]} color="#ffad64" />
        <Lightformer form="ring" intensity={1.1} position={[3, 1, -4]} scale={[3, 3, 1]} color="#f6d4a4" />
      </Environment>
      <Scene visual={visual} has={has} scale={scale} modelUrl={modelUrl} onReady={onReady} />
      {!lite && <ContactShadows position={[0, -0.32, 0]} opacity={0.55} scale={6} blur={2.6} far={2} />}
      <Rig view={view} />
      <OrbitControls enablePan={false} minDistance={1.8} maxDistance={7} autoRotate={!lite} autoRotateSpeed={1.1} enableDamping dampingFactor={0.08} target={[0, 0.2, 0]} />
    </Canvas>
  );
}
