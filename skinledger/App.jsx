import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Camera, Sparkles, Wallet, Scan, Heart, Plus, Trash2, Pencil, Check, X,
  AlertTriangle, Clock, CheckCircle2, ChevronDown, FlaskConical, ShieldCheck, ListChecks, User,
} from "lucide-react";

/* ============================== reference data ============================== */

const SKIN_TYPES = ["Oily", "Dry", "Combination", "Normal"];
const CATEGORIES = ["Cleanser", "Serum", "Moisturizer", "Sunscreen", "Toner", "Lip", "Foundation", "Other"];

const CATALOG = [
  { name: "Minimalist 10% Niacinamide Serum", category: "Serum", price: 499, skinTypes: ["Oily", "Combination"] },
  { name: "Re'equil Ultra Matte Sunscreen", category: "Sunscreen", price: 475, skinTypes: ["Oily"] },
  { name: "Plum Green Tea Toner", category: "Toner", price: 395, skinTypes: ["Oily", "Combination"] },
  { name: "Simple Kind To Skin Moisturizer", category: "Moisturizer", price: 399, skinTypes: ["Dry", "Normal"] },
  { name: "Cetaphil Gentle Cleanser", category: "Cleanser", price: 550, skinTypes: ["Dry", "Normal"] },
  { name: "The Ordinary Hyaluronic Acid", category: "Serum", price: 720, skinTypes: ["Dry", "Normal"] },
  { name: "Neutrogena Hydro Boost Gel", category: "Moisturizer", price: 699, skinTypes: ["Oily", "Combination"] },
  { name: "Dot & Key Watermelon Sunscreen", category: "Sunscreen", price: 595, skinTypes: ["Oily", "Combination", "Normal"] },
  { name: "Bioderma Sensibio Micellar Water", category: "Cleanser", price: 750, skinTypes: ["Dry", "Normal", "Combination"] },
  { name: "Innisfree Retinol Cica Serum", category: "Serum", price: 890, skinTypes: ["Combination", "Normal"] },
];

const seedProducts = [
  { id: 1, name: "Minimalist Niacinamide Serum", category: "Serum", price: 499, purchaseDate: "2026-02-01", lastUsedDate: "2026-07-15", timesUsed: 40, improvementPct: 11, skinTypeTag: "Oily", matchTag: "brightening" },
  { id: 2, name: "Glow Boost Vitamin C Serum", category: "Serum", price: 1200, purchaseDate: "2026-04-10", lastUsedDate: "2026-05-01", timesUsed: 6, improvementPct: 2, skinTypeTag: "Oily", matchTag: "brightening" },
  { id: 3, name: "MAC Ruby Woo Lipstick", category: "Lip", price: 1900, purchaseDate: "2025-12-05", lastUsedDate: "2026-07-10", timesUsed: 20, improvementPct: 0, skinTypeTag: "Normal", matchTag: "red-classic" },
  { id: 4, name: "Maybelline Pioneer Lipstick", category: "Lip", price: 799, purchaseDate: "2026-01-15", lastUsedDate: "2026-01-20", timesUsed: 1, improvementPct: 0, skinTypeTag: "Normal", matchTag: "red-classic" },
  { id: 5, name: "Dot & Key Watermelon Sunscreen", category: "Sunscreen", price: 595, purchaseDate: "2026-03-01", lastUsedDate: "2026-07-17", timesUsed: 60, improvementPct: 5, skinTypeTag: "Oily", matchTag: "daily-spf" },
];

const EVIDENCE = {
  Oily: ["High reflectance across the central T-zone sample", "Elevated colour saturation consistent with surface oil", "Narrow shadow variance around pore-dense regions"],
  Dry: ["Lower average brightness across the sampled region", "Reduced light scatter consistent with a flatter surface", "Tight saturation range across sampled pixels"],
  Combination: ["Mixed brightness readings between centre and outer zones", "Moderate saturation suggesting localised T-zone oil", "Balanced shadow pattern outside the T-zone"],
  Normal: ["Even brightness distribution across the sampled region", "Low-to-moderate saturation, no oil or dryness extremes", "Stable pixel variance suggesting balanced texture"],
};
const HEALTH_BASE = { Oily: 68, Dry: 66, Combination: 75, Normal: 83 };
const HOTSPOTS = {
  Oily: [{ x: 50, y: 34, r: 22 }],
  Dry: [{ x: 28, y: 55, r: 18 }, { x: 72, y: 55, r: 18 }],
  Combination: [{ x: 50, y: 32, r: 16 }, { x: 26, y: 58, r: 14 }, { x: 74, y: 58, r: 14 }],
  Normal: [{ x: 50, y: 45, r: 30 }],
};

/* ================================= helpers ================================= */

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86400000);
}
function currency(n) { return "₹" + Math.round(n || 0).toLocaleString("en-IN"); }
function emptyDraft() {
  return { name: "", category: "Serum", price: "", purchaseDate: "", lastUsedDate: "", timesUsed: "", improvementPct: "", skinTypeTag: "Normal", matchTag: "" };
}

function analyzeImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Could not read that image"));
    img.onload = () => {
      const size = 80;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const start = Math.floor(size * 0.25), crop = Math.floor(size * 0.5);
      const data = ctx.getImageData(start, start, crop, crop).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
      r /= count; g /= count; b /= count;
      const brightness = (r + g + b) / 3;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      let type;
      if (brightness >= 150 && saturation >= 0.25) type = "Oily";
      else if (brightness < 100) type = "Dry";
      else if (saturation < 0.15) type = "Normal";
      else type = "Combination";
      const confidence = Math.max(65, Math.min(96, Math.round(68 + saturation * 80)));
      const healthScore = Math.max(0, Math.min(100, Math.round(HEALTH_BASE[type] + (confidence - 80) / 3)));
      resolve({ type, confidence, healthScore, brightness: Math.round(brightness), saturation: Math.round(saturation * 100), evidence: EVIDENCE[type] });
    };
    img.src = dataURL;
  });
}

function compressImage(dataURL, maxDim = 480, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Could not read that image"));
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
      else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataURL;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setInView(true); });
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCountUp(target, active, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf, start;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return val;
}

// Generic persisted-state hook backed by the browser's localStorage.
function usePersisted(key, initial, onError) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
      return initial;
    }
  });
  const [loaded] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      onError && onError("Couldn't save your changes — they'll only last this session.");
    }
  }, [value, key, onError]);
  return [value, setValue, loaded];
}

/* ============================== particle heart =============================== */

function ParticleHeart({ height = "100vh", density = 9000, label }) {
  const mountRef = useRef(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let width = mount.clientWidth, ht = mount.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / ht, 0.1, 1000);
    camera.position.z = 34;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, ht);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const COUNT = density;
    const positions = new Float32Array(COUNT * 3);
    const basePositions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    function heartPoint(t) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return [x, y];
    }

    for (let i = 0; i < COUNT; i++) {
      const t = Math.random() * Math.PI * 2;
      const [bx, by] = heartPoint(t);
      const edgeBias = Math.pow(Math.random(), 0.35);
      const jitter = (1 - edgeBias) * 3.4 + 0.25;
      const angle = Math.random() * Math.PI * 2;
      const jr = Math.random() * jitter;
      const x = bx * edgeBias + Math.cos(angle) * jr;
      const y = by * edgeBias + Math.sin(angle) * jr;
      const z = (Math.random() - 0.5) * 5;
      const idx = i * 3;
      positions[idx] = x * 0.85; positions[idx + 1] = y * 0.85 + 1.5; positions[idx + 2] = z;
      basePositions[idx] = positions[idx]; basePositions[idx + 1] = positions[idx + 1]; basePositions[idx + 2] = positions[idx + 2];
      const c = new THREE.Color().setHSL(0.93 - Math.random() * 0.05, 0.85, 0.42 + Math.random() * 0.28);
      colors[idx] = c.r; colors[idx + 1] = c.g; colors[idx + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = { x: 0, y: 0, active: false };
    let exploded = false, explodeStart = 0;

    function onMove(e) {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.active = true;
    }
    function onLeave() { mouse.active = false; }
    function onClick() {
      exploded = true;
      explodeStart = performance.now();
      for (let i = 0; i < COUNT; i++) {
        const idx = i * 3;
        const dx = positions[idx], dy = positions[idx + 1], dz = positions[idx + 2];
        const len = Math.max(Math.hypot(dx, dy, dz), 0.01);
        const force = 0.35 + Math.random() * 0.95;
        velocities[idx] = (dx / len) * force;
        velocities[idx + 1] = (dy / len) * force;
        velocities[idx + 2] = (dz / len) * force + (Math.random() - 0.5) * 0.5;
      }
    }
    mount.addEventListener("mousemove", onMove);
    mount.addEventListener("mouseleave", onLeave);
    mount.addEventListener("click", onClick);

    let raf;
    const start = performance.now();
    function animate() {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const t = (now - start) / 1000;
      const beat = Math.pow(Math.max(0, Math.sin(t * 1.6)), 6) * 0.14 + Math.pow(Math.max(0, Math.sin(t * 1.6 - 0.35)), 8) * 0.09;
      const scale = 1 + beat;
      points.scale.set(scale, scale, scale);
      points.rotation.y = Math.sin(t * 0.15) * 0.22;

      const posAttr = geometry.attributes.position;
      const arr = posAttr.array;

      if (exploded) {
        const elapsed = (now - explodeStart) / 1000;
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          if (elapsed < 0.9) {
            arr[idx] += velocities[idx] * 0.6;
            arr[idx + 1] += velocities[idx + 1] * 0.6;
            arr[idx + 2] += velocities[idx + 2] * 0.6;
            velocities[idx] *= 0.96; velocities[idx + 1] *= 0.96; velocities[idx + 2] *= 0.96;
          } else {
            arr[idx] += (basePositions[idx] - arr[idx]) * 0.06;
            arr[idx + 1] += (basePositions[idx + 1] - arr[idx + 1]) * 0.06;
            arr[idx + 2] += (basePositions[idx + 2] - arr[idx + 2]) * 0.06;
            if (elapsed > 2.2) exploded = false;
          }
        }
      } else if (mouse.active) {
        const mx = mouse.x * 18, my = mouse.y * 14;
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          const dx = arr[idx] - mx, dy = arr[idx + 1] - my;
          const d = Math.hypot(dx, dy);
          if (d < 6) {
            const f = ((6 - d) / 6) * 0.55;
            arr[idx] += (dx / (d || 1)) * f;
            arr[idx + 1] += (dy / (d || 1)) * f;
          } else {
            arr[idx] += (basePositions[idx] - arr[idx]) * 0.035;
            arr[idx + 1] += (basePositions[idx + 1] - arr[idx + 1]) * 0.035;
          }
        }
      } else {
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          arr[idx] += (basePositions[idx] - arr[idx]) * 0.035;
          arr[idx + 1] += (basePositions[idx + 1] - arr[idx + 1]) * 0.035;
          arr[idx + 2] += (basePositions[idx + 2] - arr[idx + 2]) * 0.035;
        }
      }
      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      width = mount.clientWidth; ht = mount.clientHeight;
      camera.aspect = width / ht; camera.updateProjectionMatrix();
      renderer.setSize(width, ht);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("mousemove", onMove);
      mount.removeEventListener("mouseleave", onLeave);
      mount.removeEventListener("click", onClick);
      renderer.dispose(); geometry.dispose(); material.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [density]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "pointer" }} />
      {label && <div className="heart-caption"><span className="eyebrow">{label}</span></div>}
    </div>
  );
}

function AmbientParticles() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const COLORS = ["255,61,129", "34,211,238", "139,92,246"];
    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.5 + 0.6, c: COLORS[Math.floor(Math.random() * COLORS.length)],
      a: Math.random() * 0.3 + 0.12,
    }));
    let raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c},${d.a})`;
        ctx.fill();
      });
    }
    loop();
    function onResize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} className="ambient-canvas" />;
}

/* ================================ small UI bits ================================ */

function Eyebrow({ children }) { return <div className="eyebrow">{children}</div>; }

function DotLeader({ label, value, tone }) {
  return (
    <div className="ledger-row">
      <span className="ledger-label">{label}</span>
      <span className="ledger-dots" />
      <span className={"ledger-value" + (tone ? " tone-" + tone : "")}>{value}</span>
    </div>
  );
}
function Stamp({ icon: Icon, text, tone = "cyan" }) {
  return <span className={"stamp stamp-" + tone}>{Icon && <Icon size={11} strokeWidth={2.5} />} {text}</span>;
}
function EmptyState({ icon: Icon, text, action }) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <p>{text}</p>
      {action}
    </div>
  );
}

function ScoreGauge({ score, size = 220 }) {
  const r = 84, c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3D81" /><stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle cx="100" cy="100" r={r} fill="none" stroke="url(#scoreGrad)" strokeWidth="12"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={c - pct * c} strokeLinecap="round"
        transform="rotate(-90 100 100)" style={{ filter: "drop-shadow(0 0 10px rgba(255,61,129,0.55))" }} />
      <text x="100" y="96" textAnchor="middle" fontSize="42" fontWeight="700" fill="#F3F3F8" fontFamily="Space Grotesk, sans-serif">{score == null ? "—" : Math.round(score)}</text>
      <text x="100" y="120" textAnchor="middle" fontSize="10" letterSpacing="2" fill="#8D8DA3">SKINLEDGER SCORE</text>
    </svg>
  );
}

function SectionShell({ id, eyebrow, title, sub, children }) {
  const [ref, inView] = useInView(0.12);
  return (
    <section id={id} ref={ref} className="snap-section">
      <div className={"reveal" + (inView ? " reveal-in" : "")}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
        <div className="section-body">{children}</div>
      </div>
    </section>
  );
}

/* ================================ navigation + profile ================================ */

const NAV_LINKS = [
  { id: "scan", label: "Scan" }, { id: "progress", label: "Progress" }, { id: "audit", label: "Ledger" },
  { id: "routines", label: "Routines" }, { id: "finance", label: "Finance" }, { id: "recs", label: "Recs" },
  { id: "score", label: "Score" }, { id: "research", label: "Research" },
];

function NavBar({ profile, onOpenProfile }) {
  return (
    <nav className="site-nav">
      <span className="nav-logo"><Heart size={14} /> SkinLedger</span>
      <div className="nav-links">{NAV_LINKS.map((l) => <a key={l.id} href={"#" + l.id}>{l.label}</a>)}</div>
      <button className="btn btn-outline btn-sm" onClick={onOpenProfile}>
        <User size={13} /> {profile ? profile.name : "Set up profile"}
      </button>
    </nav>
  );
}

function ProfilePanel({ open, profile, onSave, onClose }) {
  const [name, setName] = useState(profile?.name || "");
  const [skinType, setSkinType] = useState(profile?.skinType || "Normal");
  useEffect(() => { setName(profile?.name || ""); setSkinType(profile?.skinType || "Normal"); }, [profile, open]);
  if (!open) return null;
  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel glass-card p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title" style={{ fontSize: "1.3rem" }}>Your profile</h3>
        <p className="text-xs text-muted mb-4">Saved to this device only — a lightweight local profile, not a secured multi-device account.</p>
        <label className="field-label">Display name</label>
        <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha" />
        <label className="field-label">Skin type preference</label>
        <select className="input mb-4" value={skinType} onChange={(e) => setSkinType(e.target.value)}>
          {SKIN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave({ name: name.trim() || "Guest", skinType }); onClose(); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <AlertTriangle size={14} /> {message}
      <button onClick={onDismiss}><X size={13} /></button>
    </div>
  );
}

/* =================================== sections =================================== */

function SkinScanSection({ onResult, savedAnalysis }) {
  const [selfie, setSelfie] = useState(null);
  const [analysis, setAnalysis] = useState(savedAnalysis || null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function handleSelfie(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(null);
    try {
      const raw = await readFile(file);
      setSelfie(raw);
      setAnalysis(null);
    } catch (err) {
      setError("Couldn't load that photo — try a different file.");
    }
  }

  async function runAnalysis() {
    if (!selfie) return;
    setScanning(true); setError(null);
    try {
      const result = await analyzeImage(selfie);
      await new Promise((r) => setTimeout(r, 1100)); // lets the scan-line animation read as real work
      setAnalysis(result);
      onResult(result);
    } catch (err) {
      setError("Scan failed on that image — try a clearer, front-facing photo.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <SectionShell id="scan" eyebrow="Skin Intelligence" title="A scan that shows its work" sub="Explainable AI: every prediction ships with a confidence score and the visual evidence behind it — no black box.">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="scan-frame">
            {selfie ? <img src={selfie} alt="Uploaded selfie" className="scan-image" /> : (
              <div className="scan-placeholder" onClick={() => fileRef.current.click()}>
                <Camera size={26} /><p>Upload a front-facing photo</p>
              </div>
            )}
            {scanning && <div className="scan-line" />}
            {analysis && !scanning && HOTSPOTS[analysis.type].map((h, i) => (
              <div key={i} className="hotspot" style={{ left: h.x + "%", top: h.y + "%", width: h.r * 2, height: h.r * 2 }} />
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleSelfie} style={{ display: "none" }} />
          <div className="flex gap-3 mt-4">
            <button className="btn btn-outline" onClick={() => fileRef.current.click()}>{selfie ? "Change photo" : "Upload photo"}</button>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={!selfie || scanning}>{scanning ? "Scanning…" : "Run scan"}</button>
          </div>
          {error && <p className="field-error">{error}</p>}
          <p className="demo-note"><FlaskConical size={12} /> Demo Mode — pixel brightness/saturation heuristic standing in for a trained CNN + Grad-CAM. Production path: <code>/api/analyze-skin</code> → hosted classifier → heatmap overlay, same UI contract.</p>
        </div>

        <div className="glass-card p-6">
          {!analysis ? (
            <EmptyState icon={Scan} text="Run a scan to see your skin profile here." />
          ) : (
            <div>
              <div className="flex gap-2 mb-4">
                <Stamp icon={Scan} text={analysis.type} tone="pink" />
                <Stamp text={analysis.confidence + "% confidence"} tone="gold" />
              </div>
              <DotLeader label="Skin Health Score" value={analysis.healthScore} />
              <DotLeader label="Brightness reading" value={analysis.brightness + " / 255"} />
              <DotLeader label="Saturation reading" value={analysis.saturation + "%"} />
              <h4 className="mini-heading">Evidence behind this prediction</h4>
              <ul className="evidence-list">{analysis.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function ProgressSection({ entries, addEntry, removeEntry, loaded }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPending(true); setError(null);
    try {
      const raw = await readFile(file);
      const compressed = await compressImage(raw);
      const analysis = await analyzeImage(compressed);
      addEntry({ id: Date.now(), date: new Date().toISOString().slice(0, 10), image: compressed, ...analysis });
    } catch (err) {
      setError("Couldn't process that photo — try a smaller or clearer image.");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const chartData = entries.map((e, i) => ({ index: i + 1, date: e.date, score: e.healthScore }));

  return (
    <SectionShell id="progress" eyebrow="Progress" title="Skin Score over time" sub="Upload a new photo whenever you like — every entry is scored the same way, so the trend actually means something.">
      <div className="glass-card p-5 mb-6 flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={pending}>
          {pending ? "Processing…" : "Upload progress photo"}
        </button>
        {error && <span className="field-error" style={{ margin: 0 }}>{error}</span>}
      </div>

      {!loaded ? (
        <p className="text-muted text-sm">Loading your history…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={Camera} text="No progress photos yet — upload your first one to start a timeline." />
      ) : (
        <>
          <div className="glass-card p-6 mb-6">
            <h4 className="mini-heading mb-2">Skin Health Score trend</h4>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8D8DA3" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8D8DA3" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0B0B14", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, borderRadius: 6, color: "#F3F3F8" }} />
                  <Line type="monotone" dataKey="score" stroke="#FF3D81" strokeWidth={2} dot={{ r: 4, fill: "#22D3EE" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="progress-grid">
            {entries.slice().reverse().map((e) => (
              <div key={e.id} className="progress-card">
                <img src={e.image} alt={"Progress photo from " + e.date} />
                <div className="p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">{e.date}</span>
                    <button className="icon-btn" onClick={() => removeEntry(e.id)}><Trash2 size={13} /></button>
                  </div>
                  <DotLeader label="Skin Health" value={e.healthScore} />
                  <Stamp text={e.type} tone="pink" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionShell>
  );
}

function VanityAuditSection({ products, setProducts, dupIds, unusedIds, loaded }) {
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [formError, setFormError] = useState(null);

  function addProduct() {
    if (!draft.name.trim() || !draft.price) { setFormError("Name and price are required."); return; }
    setFormError(null);
    setProducts((prev) => [...prev, { ...draft, id: Date.now(), price: Number(draft.price) || 0, timesUsed: Number(draft.timesUsed) || 0, improvementPct: Number(draft.improvementPct) || 0 }]);
    setDraft(emptyDraft());
  }
  function removeProduct(id) { setProducts((prev) => prev.filter((p) => p.id !== id)); if (editingId === id) setEditingId(null); }
  function startEdit(p) { setEditingId(p.id); setEditDraft({ ...p }); }
  function saveEdit() {
    setProducts((prev) => prev.map((p) => p.id === editingId ? { ...editDraft, id: editingId, price: Number(editDraft.price) || 0, timesUsed: Number(editDraft.timesUsed) || 0, improvementPct: Number(editDraft.improvementPct) || 0 } : p));
    setEditingId(null); setEditDraft(null);
  }
  function cancelEdit() { setEditingId(null); setEditDraft(null); }

  return (
    <SectionShell id="audit" eyebrow="AI Vanity Audit" title="Your shelf, accounted for" sub="Every product logged against purchase date, last use, and a shade/purpose tag — so duplicates and dead stock surface on their own.">
      <div className="glass-card p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-3">
          <input className="input" placeholder="Product name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <input className="input" type="number" placeholder="Price (₹)" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          <select className="input" value={draft.skinTypeTag} onChange={(e) => setDraft({ ...draft, skinTypeTag: e.target.value })}>{SKIN_TYPES.map((s) => <option key={s} value={s}>Suits: {s}</option>)}</select>
          <input className="input" type="date" value={draft.purchaseDate} onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })} />
          <input className="input" type="date" value={draft.lastUsedDate} onChange={(e) => setDraft({ ...draft, lastUsedDate: e.target.value })} />
          <input className="input" type="number" placeholder="Times used" value={draft.timesUsed} onChange={(e) => setDraft({ ...draft, timesUsed: e.target.value })} />
          <input className="input" type="number" placeholder="Improvement %" value={draft.improvementPct} onChange={(e) => setDraft({ ...draft, improvementPct: e.target.value })} />
          <input className="input md:col-span-3" placeholder="Shade / purpose tag (for duplicate matching)" value={draft.matchTag} onChange={(e) => setDraft({ ...draft, matchTag: e.target.value })} />
          <button className="btn btn-primary flex items-center justify-center gap-1" onClick={addProduct}><Plus size={15} /> Add</button>
        </div>
        {formError && <p className="field-error">{formError}</p>}
      </div>

      {!loaded ? (
        <p className="text-muted text-sm">Loading your ledger…</p>
      ) : products.length === 0 ? (
        <EmptyState icon={Wallet} text="Nothing logged yet — add your first product above." />
      ) : (
        <div className="shelf-grid">
          {products.map((p, i) => {
            const isDup = dupIds.has(p.id), isUnused = unusedIds.has(p.id);
            const costPerUse = p.price / Math.max(Number(p.timesUsed) || 1, 1);
            const editing = editingId === p.id;
            return (
              <div key={p.id} className="shelf-card" style={{ animationDelay: i * 0.05 + "s" }}>
                {editing ? (
                  <div className="flex flex-col gap-2">
                    <input className="input" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                    <input className="input" type="number" value={editDraft.price} onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })} />
                    <input className="input" type="number" placeholder="Times used" value={editDraft.timesUsed} onChange={(e) => setEditDraft({ ...editDraft, timesUsed: e.target.value })} />
                    <input className="input" type="date" value={editDraft.lastUsedDate} onChange={(e) => setEditDraft({ ...editDraft, lastUsedDate: e.target.value })} />
                    <div className="flex gap-2 justify-end mt-1">
                      <button className="icon-btn" onClick={cancelEdit}><X size={15} /></button>
                      <button className="icon-btn" style={{ color: "var(--cyan)" }} onClick={saveEdit}><Check size={15} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-muted">{p.category}</p></div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(p)} className="icon-btn"><Pencil size={13} /></button>
                        <button onClick={() => removeProduct(p.id)} className="icon-btn"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <DotLeader label="Price" value={currency(p.price)} />
                    <DotLeader label="Cost / use" value={currency(costPerUse)} />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {isDup && <Stamp icon={AlertTriangle} text="Duplicate" tone="rust" />}
                      {isUnused && <Stamp icon={Clock} text="Unused 30+ days" tone="rust" />}
                      {!isDup && !isUnused && <Stamp icon={CheckCircle2} text="Active" tone="cyan" />}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

function RoutinesSection({ products, routines, setRoutines, loaded }) {
  const [name, setName] = useState("");
  function addRoutine() {
    if (!name.trim()) return;
    setRoutines((prev) => [...prev, { id: Date.now(), name: name.trim(), steps: [] }]);
    setName("");
  }
  function removeRoutine(id) { setRoutines((prev) => prev.filter((r) => r.id !== id)); }
  function addStep(routineId, productId) { setRoutines((prev) => prev.map((r) => r.id === routineId ? { ...r, steps: [...r.steps, { productId }] } : r)); }
  function removeStep(routineId, idx) { setRoutines((prev) => prev.map((r) => r.id === routineId ? { ...r, steps: r.steps.filter((_, i) => i !== idx) } : r)); }
  function moveStep(routineId, idx, dir) {
    setRoutines((prev) => prev.map((r) => {
      if (r.id !== routineId) return r;
      const steps = [...r.steps]; const target = idx + dir;
      if (target < 0 || target >= steps.length) return r;
      [steps[idx], steps[target]] = [steps[target], steps[idx]];
      return { ...r, steps };
    }));
  }

  return (
    <SectionShell id="routines" eyebrow="Routines" title="Morning, evening, whatever works" sub="Build ordered routines from products already in your ledger.">
      <div className="glass-card p-5 mb-6 flex flex-wrap gap-3">
        <input className="input" style={{ maxWidth: 260 }} placeholder="Routine name (e.g. Morning)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" onClick={addRoutine}><Plus size={15} /> Add routine</button>
      </div>

      {!loaded ? (
        <p className="text-muted text-sm">Loading your routines…</p>
      ) : routines.length === 0 ? (
        <EmptyState icon={ListChecks} text="No routines yet — name one above to get started." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {routines.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">{r.name}</h4>
                <button className="icon-btn" onClick={() => removeRoutine(r.id)}><Trash2 size={14} /></button>
              </div>
              {r.steps.length === 0 && <p className="text-xs text-muted mb-3">No steps yet.</p>}
              <ol className="routine-steps">
                {r.steps.map((s, idx) => {
                  const product = products.find((p) => p.id === s.productId);
                  return (
                    <li key={idx}>
                      <span>{idx + 1}. {product ? product.name : "Removed product"}</span>
                      <span className="step-actions">
                        <button className="icon-btn" onClick={() => moveStep(r.id, idx, -1)}>↑</button>
                        <button className="icon-btn" onClick={() => moveStep(r.id, idx, 1)}>↓</button>
                        <button className="icon-btn" onClick={() => removeStep(r.id, idx)}><Trash2 size={12} /></button>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {products.length > 0 ? (
                <select className="input mt-2" value="" onChange={(e) => { if (e.target.value) addStep(r.id, Number(e.target.value)); }}>
                  <option value="">+ Add step from your ledger…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : <p className="text-xs text-muted mt-2">Add products to your ledger first.</p>}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function FinanceSection({ products, budget, setBudget, totalSpend, unusedValue, duplicateLoss, categorySpend }) {
  const [ref, inView] = useInView(0.2);
  const spendVal = useCountUp(totalSpend, inView);
  const unusedVal = useCountUp(unusedValue, inView);
  const dupVal = useCountUp(duplicateLoss, inView);

  return (
    <SectionShell id="finance" eyebrow="Beauty Finance Analytics" title="Where the money actually goes" sub="Cost per use, cost per visible improvement, and money quietly tied up in things you're not using.">
      <div className="grid md:grid-cols-3 gap-4 mb-6" ref={ref}>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="mini-heading">Monthly budget</span>
            <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} className="budget-input" />
          </div>
          <p className="stat-number">{currency(spendVal)}</p>
          <p className="text-xs" style={{ color: totalSpend > budget ? "#FF6B6B" : "#8D8DA3" }}>
            {totalSpend > budget ? `${currency(totalSpend - budget)} over budget` : `${currency(budget - totalSpend)} remaining`}
          </p>
        </div>
        <div className="glass-card p-5"><span className="mini-heading">Value sitting unused</span><p className="stat-number tone-rust-text">{currency(unusedVal)}</p><p className="text-xs text-muted">No use logged in 30+ days</p></div>
        <div className="glass-card p-5"><span className="mini-heading">Lost to duplicates</span><p className="stat-number tone-rust-text">{currency(dupVal)}</p><p className="text-xs text-muted">Later purchase of an owned match</p></div>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Wallet} text="Log products in the Ledger section to see analytics here." />
      ) : (
        <>
          <div className="glass-card p-6 mb-6">
            <h4 className="mini-heading mb-3">Spend by category</h4>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={categorySpend}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#8D8DA3" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8D8DA3" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => currency(v)} contentStyle={{ background: "#0B0B14", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, borderRadius: 6, color: "#F3F3F8" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#barGrad)" />
                  <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF3D81" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-6 overflow-x-auto">
            <h4 className="mini-heading mb-3">Cost per use / ROI</h4>
            <table className="ledger-table">
              <thead><tr><th>Product</th><th>Cost / use</th><th>Cost / % improvement</th><th>Beauty ROI</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const cpu = p.price / Math.max(Number(p.timesUsed) || 1, 1);
                  const cpi = p.improvementPct > 0 ? p.price / p.improvementPct : null;
                  const roi = p.improvementPct > 0 ? (p.improvementPct / p.price) * 1000 : null;
                  return (<tr key={p.id}><td>{p.name}</td><td className="mono">{currency(cpu)}</td><td className="mono">{cpi ? currency(cpi) : "—"}</td><td className="mono">{roi ? roi.toFixed(2) : "—"}</td></tr>);
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionShell>
  );
}

function RecommendationsSection({ analysis, recommendations }) {
  const [ref, inView] = useInView(0.2);
  return (
    <SectionShell id="recs" eyebrow="Recommendation Engine" title="Matched to your skin, not your feed" sub="Content-based filtering: skin type, remaining budget, and what you already own.">
      <div ref={ref} className="rec-network">
        <div className="rec-center"><Sparkles size={20} /><span>{analysis ? analysis.type : "Run a scan"}</span></div>
        {!analysis ? (
          <p className="text-muted text-sm mt-6">Recommendations activate once your skin type is known — see the Skin Intelligence section above.</p>
        ) : recommendations.length === 0 ? (
          <p className="text-muted text-sm mt-6">Nothing suits your {analysis.type.toLowerCase()} skin within your remaining budget right now — free up budget in the Finance section.</p>
        ) : (
          <div className="rec-grid">
            {recommendations.map((c, i) => (
              <div key={i} className={"rec-card" + (inView ? " rec-card-in" : "")} style={{ transitionDelay: i * 0.08 + "s" }}>
                <div className="rec-line" />
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-muted">{c.category}</p>
                <DotLeader label="Price" value={currency(c.price)} />
                <Stamp text={"Suits " + analysis.type} tone="cyan" />
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

function ScoreSection({ score, breakdown }) {
  const [ref, inView] = useInView(0.3);
  const animatedScore = useCountUp(score || 0, inView && score != null, 1600);
  return (
    <SectionShell id="score" eyebrow="SkinLedger Score" title="One number, four inputs" sub="Skin Health (40%) + Routine Consistency (20%) + Budget Efficiency (20%) + Product Suitability (20%).">
      <div ref={ref} className="grid md:grid-cols-2 gap-8 items-center">
        <div className="flex justify-center"><ScoreGauge score={score == null ? null : animatedScore} /></div>
        <div className="glass-card p-6">
          <DotLeader label="Skin Health (40%)" value={breakdown.health ?? "—"} />
          <DotLeader label="Routine Consistency (20%)" value={breakdown.routine} />
          <DotLeader label="Budget Efficiency (20%)" value={breakdown.budget} tone={breakdown.budget < 60 ? "rust" : undefined} />
          <DotLeader label="Product Suitability (20%)" value={breakdown.suitability ?? "—"} />
        </div>
      </div>
    </SectionShell>
  );
}

function ResearchSection() {
  return (
    <SectionShell id="research" eyebrow="Research Population" title="Built for everyone, validated with students" sub="College students form the survey and evaluation population; the platform itself targets any beauty-product consumer.">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-card p-5"><ShieldCheck size={18} /><p className="mini-heading mt-2">Survey + interviews</p><p className="text-sm text-muted">30–40 respondents, spending patterns and product wastage.</p></div>
        <div className="glass-card p-5"><Scan size={18} /><p className="mini-heading mt-2">Observation</p><p className="text-sm text-muted">Direct shelf review to estimate real unused/duplicate stock.</p></div>
        <div className="glass-card p-5"><FlaskConical size={18} /><p className="mini-heading mt-2">Literature review</p><p className="text-sm text-muted">Grad-CAM explainability, skin classification benchmarks.</p></div>
      </div>
    </SectionShell>
  );
}

/* =================================== app root =================================== */

export default function SkinLedgerExperience() {
  const [error, setError] = useState(null);
  const onError = useCallback((msg) => setError(msg), []);

  const [budget, setBudget, budgetLoaded] = usePersisted("skinledger:budget", 3000, onError);
  const [products, setProducts, productsLoaded] = usePersisted("skinledger:products", seedProducts, onError);
  const [progress, setProgress, progressLoaded] = usePersisted("skinledger:progress", [], onError);
  const [routines, setRoutines, routinesLoaded] = usePersisted("skinledger:routines", [], onError);
  const [profile, setProfile, profileLoaded] = usePersisted("skinledger:profile", null, onError);
  const [profileOpen, setProfileOpen] = useState(false);

  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (progress.length > 0 && !analysis) setAnalysis(progress[progress.length - 1]);
  }, [progressLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function addProgressEntry(entry) { setProgress((prev) => [...prev, entry]); setAnalysis(entry); }
  function removeProgressEntry(id) { setProgress((prev) => prev.filter((e) => e.id !== id)); }

  const totalSpend = useMemo(() => products.reduce((s, p) => s + Number(p.price || 0), 0), [products]);
  const categorySpend = useMemo(() => {
    const map = {};
    products.forEach((p) => { map[p.category] = (map[p.category] || 0) + Number(p.price || 0); });
    return Object.entries(map).map(([category, value]) => ({ category, value }));
  }, [products]);
  const { dupIds, duplicateLoss } = useMemo(() => {
    const groups = {};
    products.forEach((p) => {
      if (!p.matchTag) return;
      const key = p.category + "::" + p.matchTag.toLowerCase().trim();
      (groups[key] = groups[key] || []).push(p);
    });
    const ids = new Set(); let loss = 0;
    Object.values(groups).forEach((group) => {
      if (group.length > 1) {
        const sorted = [...group].sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
        sorted.slice(1).forEach((p) => { ids.add(p.id); loss += Number(p.price || 0); });
      }
    });
    return { dupIds: ids, duplicateLoss: loss };
  }, [products]);
  const unusedIds = useMemo(() => new Set(products.filter((p) => daysSince(p.lastUsedDate) > 30).map((p) => p.id)), [products]);
  const unusedValue = useMemo(() => products.filter((p) => unusedIds.has(p.id)).reduce((s, p) => s + Number(p.price || 0), 0), [products, unusedIds]);
  const routineConsistency = useMemo(() => {
    if (products.length === 0) return 0;
    const recent = products.filter((p) => daysSince(p.lastUsedDate) <= 7).length;
    return Math.round((recent / products.length) * 100);
  }, [products]);
  const budgetEfficiency = useMemo(() => {
    if (budget <= 0) return 0;
    const over = Math.max(0, (totalSpend - budget) / budget);
    return Math.max(0, Math.round(100 - over * 100));
  }, [totalSpend, budget]);
  const suitability = useMemo(() => {
    if (!analysis || products.length === 0) return null;
    const matching = products.filter((p) => p.skinTypeTag === analysis.type).length;
    return Math.round((matching / products.length) * 100);
  }, [analysis, products]);
  const skinLedgerScore = useMemo(() => {
    if (!analysis) return null;
    const suit = suitability ?? 50;
    return Math.round(analysis.healthScore * 0.4 + routineConsistency * 0.2 + budgetEfficiency * 0.2 + suit * 0.2);
  }, [analysis, routineConsistency, budgetEfficiency, suitability]);
  const recommendations = useMemo(() => {
    if (!analysis) return [];
    const remaining = totalSpend < budget ? budget - totalSpend : 500;
    const owned = new Set(products.map((p) => p.name.toLowerCase()));
    return CATALOG.filter((c) => c.skinTypes.includes(analysis.type) && c.price <= remaining && !owned.has(c.name.toLowerCase())).sort((a, b) => a.price - b.price).slice(0, 6);
  }, [analysis, totalSpend, budget, products]);

  return (
    <div className="sl-app">
      <GlobalStyles />
      <AmbientParticles />
      <div className="top-banner"><FlaskConical size={13} /> Demo Mode — simulated skin classifier · real persistent data on this device</div>
      <NavBar profile={profile} onOpenProfile={() => setProfileOpen(true)} />
      <ProfilePanel open={profileOpen} profile={profile} onSave={setProfile} onClose={() => setProfileOpen(false)} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <section className="snap-section hero">
        <ParticleHeart height="100%" label="Move your cursor · click to explode the heart" />
        <div className="hero-overlay">
          <Eyebrow>SkinLedger</Eyebrow>
          <h1 className="hero-title">Skin intelligence, <span className="grad-text">priced honestly.</span></h1>
          <p className="hero-sub">An AI platform that reads your skin and your spending in the same breath — explainable scans, an automated vanity audit, and one score that ties it together.</p>
          <a href="#scan" className="btn btn-primary btn-lg">Start the scan <ChevronDown size={16} /></a>
        </div>
      </section>

      <SkinScanSection onResult={(r) => setAnalysis(r)} savedAnalysis={analysis} />
      <ProgressSection entries={progress} addEntry={addProgressEntry} removeEntry={removeProgressEntry} loaded={progressLoaded} />
      <VanityAuditSection products={products} setProducts={setProducts} dupIds={dupIds} unusedIds={unusedIds} loaded={productsLoaded} />
      <RoutinesSection products={products} routines={routines} setRoutines={setRoutines} loaded={routinesLoaded} />
      <FinanceSection products={products} budget={budget} setBudget={setBudget} totalSpend={totalSpend} unusedValue={unusedValue} duplicateLoss={duplicateLoss} categorySpend={categorySpend} />
      <RecommendationsSection analysis={analysis} recommendations={recommendations} />
      <ScoreSection score={skinLedgerScore} breakdown={{ health: analysis?.healthScore, routine: routineConsistency, budget: budgetEfficiency, suitability }} />
      <ResearchSection />

      <section className="snap-section closer">
        <ParticleHeart height="70%" density={5000} label="SkinLedger — Semester III Mini Project prototype" />
        <div className="closer-caption"><Heart size={16} /> Every scan, every logged product, makes the next recommendation sharper.</div>
      </section>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

      .sl-app {
        --bg:#05060A; --bg2:#0B0B14; --pink:#FF3D81; --violet:#8B5CF6; --cyan:#22D3EE; --gold:#F5C451;
        --text:#F3F3F8; --muted:#8D8DA3; --line:rgba(255,255,255,0.09); --glass:rgba(255,255,255,0.035);
        background: var(--bg); color: var(--text); font-family:'Inter',sans-serif; position:relative;
        scroll-snap-type: y proximity; overflow-y: auto; height: 100vh;
      }
      .sl-app * { box-sizing: border-box; }
      .ambient-canvas { position: fixed; inset:0; z-index:0; pointer-events:none; opacity:0.8; }
      .snap-section { scroll-snap-align: start; min-height: 100vh; padding: 90px 6vw 70px; position: relative; z-index:1; }
      .hero { padding: 0; display:flex; align-items:center; justify-content:center; }
      .hero-overlay { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; pointer-events:none; padding: 0 6vw; }
      .hero-overlay .btn { pointer-events:auto; }
      .hero-title { font-family:'Space Grotesk',sans-serif; font-size: clamp(2.2rem, 6vw, 4.2rem); font-weight:700; line-height:1.05; margin:14px 0; text-shadow: 0 0 40px rgba(255,61,129,0.25); }
      .grad-text { background: linear-gradient(90deg, var(--pink), var(--cyan)); -webkit-background-clip:text; background-clip:text; color:transparent; }
      .hero-sub { max-width: 560px; color: var(--muted); font-size: 1rem; margin-bottom: 22px; }
      .heart-caption { position:absolute; bottom:18px; left:0; right:0; text-align:center; pointer-events:none; }

      .eyebrow { font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color: var(--cyan); }
      .section-title { font-family:'Space Grotesk',sans-serif; font-size: clamp(1.6rem, 3.4vw, 2.4rem); font-weight:700; margin: 8px 0 10px; }
      .section-sub { color: var(--muted); max-width: 620px; margin-bottom: 30px; }
      .section-body { position: relative; z-index: 1; }
      .reveal { opacity:0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
      .reveal-in { opacity:1; transform: translateY(0); }

      .glass-card { background: var(--glass); border:1px solid var(--line); border-radius: 14px; backdrop-filter: blur(6px); }
      .mini-heading { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color: var(--muted); display:block; margin-bottom:10px; }
      .field-label { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color: var(--muted); display:block; margin-bottom:4px; }
      .stat-number { font-family:'Space Grotesk',sans-serif; font-size:2rem; font-weight:700; margin: 2px 0; }
      .tone-rust-text { color:#FF6B6B; }
      .text-muted { color: var(--muted); }
      .field-error { color:#FF6B6B; font-size:12px; margin-top:8px; }

      .ledger-row { display:flex; align-items:baseline; gap:6px; padding:6px 0; }
      .ledger-label { color: var(--muted); font-size:13px; white-space:nowrap; }
      .ledger-dots { flex:1; border-bottom:1px dotted var(--line); margin-bottom:3px; }
      .ledger-value { font-family:'JetBrains Mono',monospace; font-weight:600; font-size:14px; color: var(--text); }
      .ledger-value.tone-rust { color:#FF6B6B; }

      .stamp { display:inline-flex; align-items:center; gap:4px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.06em; text-transform:uppercase; padding:3px 8px; border-radius:20px; font-weight:600; border:1px solid currentColor; }
      .stamp-pink { color: var(--pink); } .stamp-cyan { color: var(--cyan); } .stamp-gold { color: var(--gold); } .stamp-rust { color: #FF6B6B; }

      .btn { font-family:'Inter',sans-serif; font-weight:600; font-size:14px; padding:11px 20px; border-radius:30px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition: transform .15s, box-shadow .15s; border:none; }
      .btn:hover { transform: translateY(-1px); }
      .btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
      .btn-primary { background: linear-gradient(90deg, var(--pink), var(--violet)); color:#fff; box-shadow: 0 6px 24px rgba(255,61,129,0.35); }
      .btn-outline { background: transparent; color: var(--text); border:1px solid var(--line); }
      .btn-sm { font-size:12px; padding:7px 14px; }
      .btn-lg { font-size:15px; padding:14px 26px; }
      .icon-btn { background:none; border:none; color: var(--muted); cursor:pointer; }
      .icon-btn:hover { color: var(--cyan); }

      .input { background: rgba(255,255,255,0.04); border:1px solid var(--line); border-radius:8px; padding:9px 11px; font-size:13px; color: var(--text); width:100%; font-family:'Inter',sans-serif; }
      .input:focus-visible, .btn:focus-visible, a:focus-visible { outline:2px solid var(--cyan); outline-offset:2px; }
      .budget-input { background:transparent; border:none; border-bottom:1px solid var(--line); color:var(--text); font-family:'JetBrains Mono',monospace; width:80px; text-align:right; }

      .scan-frame { position:relative; height:320px; border-radius:12px; overflow:hidden; border:1px solid var(--line); background: rgba(255,255,255,0.02); }
      .scan-image { width:100%; height:100%; object-fit:cover; }
      .scan-placeholder { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color: var(--muted); cursor:pointer; }
      .scan-line { position:absolute; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, var(--cyan), transparent); box-shadow: 0 0 16px var(--cyan); animation: scanmove 1.4s linear infinite; }
      @keyframes scanmove { 0% { top:0; } 100% { top:100%; } }
      .hotspot { position:absolute; transform: translate(-50%,-50%); border-radius:50%; background: radial-gradient(circle, rgba(255,61,129,0.45), transparent 70%); animation: pulse 1.8s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { opacity:0.55; } 50% { opacity:1; } }
      .demo-note { font-size:11.5px; color: var(--muted); margin-top:14px; display:flex; gap:6px; align-items:flex-start; }
      .demo-note code { color: var(--cyan); }
      .evidence-list { font-size:13px; color: var(--text); list-style:none; padding:0; display:flex; flex-direction:column; gap:6px; }
      .evidence-list li:before { content:"▸ "; color: var(--cyan); }

      .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:44px 20px; color: var(--muted); text-align:center; border:1px dashed var(--line); border-radius:14px; }

      .shelf-grid, .progress-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); gap:16px; }
      .shelf-card { background: var(--glass); border:1px solid var(--line); border-radius:12px; padding:16px; opacity:0; transform: translateY(16px) rotateX(6deg); animation: cardIn .6s ease forwards; }
      @keyframes cardIn { to { opacity:1; transform: translateY(0) rotateX(0); } }
      .progress-card { background: var(--glass); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
      .progress-card img { width:100%; height:150px; object-fit:cover; display:block; }

      table.ledger-table { width:100%; border-collapse:collapse; font-size:13px; }
      table.ledger-table th { text-align:left; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color: var(--muted); padding:8px 10px; border-bottom:1px solid var(--line); }
      table.ledger-table td { padding:9px 10px; border-bottom:1px solid var(--line); }
      .mono { font-family:'JetBrains Mono',monospace; }

      .rec-network { text-align:center; }
      .rec-center { display:inline-flex; flex-direction:column; align-items:center; gap:6px; width:110px; height:110px; border-radius:50%; background: radial-gradient(circle, rgba(255,61,129,0.18), transparent 70%); border:1px solid var(--pink); color: var(--pink); justify-content:center; font-size:12px; font-weight:600; margin-bottom: 30px; box-shadow: 0 0 30px rgba(255,61,129,0.25); }
      .rec-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:16px; text-align:left; }
      .rec-card { position:relative; background: var(--glass); border:1px solid var(--line); border-radius:12px; padding:16px; opacity:0; transform: translateY(18px); transition: opacity .5s ease, transform .5s ease; }
      .rec-card-in { opacity:1; transform: translateY(0); }
      .rec-line { position:absolute; top:-14px; left:50%; width:1px; height:14px; background: repeating-linear-gradient(to bottom, var(--cyan) 0 4px, transparent 4px 8px); }

      .routine-steps { list-style:none; padding:0; display:flex; flex-direction:column; gap:6px; font-size:13px; }
      .routine-steps li { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:5px; }
      .step-actions { display:flex; gap:4px; }
      .step-actions button { font-size:11px; }

      .top-banner { position:sticky; top:0; z-index:60; background: rgba(11,11,20,0.92); backdrop-filter: blur(6px); border-bottom:1px solid var(--line); color: var(--cyan); font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.05em; padding:7px 16px; display:flex; align-items:center; gap:6px; justify-content:center; text-align:center; }
      .site-nav { position:sticky; top:29px; z-index:55; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 6vw; background: rgba(5,6,10,0.75); backdrop-filter: blur(10px); border-bottom:1px solid var(--line); flex-wrap:wrap; }
      .nav-logo { font-family:'Space Grotesk',sans-serif; font-weight:700; display:flex; align-items:center; gap:6px; color: var(--pink); font-size:14px; }
      .nav-links { display:flex; gap:16px; flex-wrap:wrap; }
      .nav-links a { color: var(--muted); font-size:13px; text-decoration:none; transition: color .15s; }
      .nav-links a:hover { color: var(--text); }

      .profile-overlay { position:fixed; inset:0; z-index:80; background:rgba(5,6,10,0.7); display:flex; align-items:center; justify-content:center; padding:20px; }
      .profile-panel { width:100%; max-width:360px; }
      .error-banner { position:sticky; top:76px; z-index:70; margin:0 6vw; background: rgba(166,71,43,0.18); border:1px solid #FF6B6B; color:#FF6B6B; font-size:12.5px; padding:9px 14px; border-radius:10px; display:flex; align-items:center; gap:8px; }
      .error-banner button { margin-left:auto; background:none; border:none; color:#FF6B6B; cursor:pointer; }

      .closer { display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .closer-caption { display:flex; align-items:center; gap:8px; color: var(--muted); font-size:13px; margin-top: -40px; }

      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      @media (max-width: 768px) {
        .snap-section { padding: 70px 5vw 50px; }
        .nav-links { display:none; }
      }
    `}</style>
  );
}
