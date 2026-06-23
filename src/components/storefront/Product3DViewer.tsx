"use client";

/**
 * Product3DViewer — a real, draggable WebGL garment.
 *
 * A studio-lit, extruded 3D t-shirt the shopper can spin with the pointer.
 * The mesh colour swaps live with the selected variant colour, so picking
 * "Olive" actually re-colours the 3D garment. Idle auto-rotate, drag inertia,
 * reduced-motion aware, lazy three.js, full cleanup on unmount.
 */

import { useEffect, useRef } from "react";

// Map brand colour names → a believable fabric hex.
const COLOR_HEX: Record<string, number> = {
  black: 0x1c1c20,
  white: 0xf1efe8,
  ivory: 0xf1efe8,
  navy: 0x29304a,
  beige: 0xd3b894,
  olive: 0x5f6038,
  gray: 0x8b8b8b,
  grey: 0x8b8b8b,
  charcoal: 0x35353b,
  maroon: 0x5e2b2f,
  teal: 0x2f6b6b,
};

function hexForColor(name: string | null | undefined): number {
  if (!name) return 0x29304a;
  return COLOR_HEX[name.toLowerCase()] ?? 0x29304a;
}

export default function Product3DViewer({ color }: { color: string | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<number>(hexForColor(color));

  // Keep latest colour available to the render loop.
  const setColorRef = useRef<(hex: number) => void>(() => {});
  useEffect(() => {
    const hex = hexForColor(color);
    colorRef.current = hex;
    setColorRef.current(hex);
  }, [color]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mount) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const w = mount.clientWidth || 400;
      const h = mount.clientHeight || 500;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.cursor = "grab";
      renderer.domElement.style.touchAction = "pan-y";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
      camera.position.set(0, 0, 5.2);

      // ── Lights — soft studio setup ───────────────────────────
      scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2540, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xc9a84c, 0.9);
      rim.position.set(-4, 1, -3);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0x9f97ff, 0.5);
      fill.position.set(-3, -2, 4);
      scene.add(fill);

      // ── Build the t-shirt silhouette (matches the hero motif) ─
      const S = 1 / 70;
      const px = (x: number) => (x - 110) * S;
      const py = (y: number) => (100 - y) * S;

      const shape = new THREE.Shape();
      shape.moveTo(px(55), py(30));
      shape.lineTo(px(30), py(70));
      shape.lineTo(px(65), py(80));
      shape.lineTo(px(65), py(170));
      shape.lineTo(px(155), py(170));
      shape.lineTo(px(155), py(80));
      shape.lineTo(px(190), py(70));
      shape.lineTo(px(165), py(30));
      shape.lineTo(px(140), py(50));
      shape.bezierCurveTo(px(135), py(60), px(130), py(65), px(110), py(65));
      shape.bezierCurveTo(px(90), py(65), px(85), py(60), px(80), py(50));
      shape.lineTo(px(55), py(30));

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.1,
        bevelSegments: 4,
        steps: 1,
      });
      geo.center();

      const material = new THREE.MeshStandardMaterial({
        color: colorRef.current,
        roughness: 0.82,
        metalness: 0.04,
        flatShading: false,
      });
      const shirt = new THREE.Mesh(geo, material);
      scene.add(shirt);

      // expose live colour setter
      setColorRef.current = (hex: number) => material.color.setHex(hex);

      // soft contact shadow to ground the garment on the light studio backdrop
      const glowGeo = new THREE.CircleGeometry(1.7, 48);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x0b0b14, transparent: true, opacity: 0.14 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0, -1.55, -0.5);
      glow.scale.set(1.3, 0.4, 1);
      scene.add(glow);

      // ── Drag to rotate ───────────────────────────────────────
      const rot = { x: -0.05, y: 0.5 };
      const vel = { x: 0, y: 0 };
      let dragging = false;
      let lastX = 0, lastY = 0;

      function onDown(e: PointerEvent) {
        dragging = true;
        lastX = e.clientX; lastY = e.clientY;
        renderer.domElement.style.cursor = "grabbing";
        renderer.domElement.setPointerCapture(e.pointerId);
      }
      function onMoveP(e: PointerEvent) {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        vel.y = dx * 0.01;
        vel.x = dy * 0.01;
        rot.y += vel.y;
        rot.x += vel.x;
        rot.x = Math.max(-0.9, Math.min(0.9, rot.x));
      }
      function onUp(e: PointerEvent) {
        dragging = false;
        renderer.domElement.style.cursor = "grab";
        try { renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
      const el = renderer.domElement;
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMoveP);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointerleave", onUp);

      function onResize() {
        const nw = mount?.clientWidth || w;
        const nh = mount?.clientHeight || h;
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", onResize);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
      io.observe(mount);

      let raf = 0;
      function frame() {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        if (!dragging) {
          // inertia, then gentle idle auto-rotate
          vel.y *= 0.94;
          vel.x *= 0.9;
          rot.y += vel.y;
          rot.x += vel.x;
          if (!reduceMotion && Math.abs(vel.y) < 0.0015) rot.y += 0.0035;
        }
        shirt.rotation.y = rot.y;
        shirt.rotation.x = rot.x;
        renderer.render(scene, camera);
      }
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMoveP);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointerleave", onUp);
        window.removeEventListener("resize", onResize);
        geo.dispose();
        material.dispose();
        glowGeo.dispose();
        glowMat.dispose();
        renderer.dispose();
        setColorRef.current = () => {};
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" aria-hidden />;
}
