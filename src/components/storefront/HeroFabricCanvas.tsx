"use client";

/**
 * HeroFabricCanvas — a real WebGL hero background.
 *
 * Renders an animated "silk" cloth: a high-segment plane displaced by layered
 * sine waves in a custom GLSL shader, lit with analytic normals and finished
 * with a gold fresnel sheen over the brand's ink→plum→navy gradient. A drifting
 * particle field sits in front for depth, and the whole thing reacts to the
 * pointer with smooth parallax.
 *
 * - Lazy-imports three.js (kept out of the main bundle).
 * - Respects prefers-reduced-motion (renders a single static frame, no RAF).
 * - Pauses when scrolled out of view to save the GPU.
 * - Cleans up the WebGL context, geometry, and listeners on unmount.
 */

import { useEffect, useRef } from "react";

export default function HeroFabricCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mount) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Device-adaptive quality: phones/low-power devices get a lighter mesh,
      // no antialiasing, a capped pixel ratio, and fewer particles. This roughly
      // halves the per-frame GPU/CPU cost while keeping the same look.
      const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
      const lowPower =
        window.matchMedia("(max-width: 1023px)").matches ||
        nav.connection?.saveData === true ||
        (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4);

      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.set(0, 0, 7);

      // ── Silk cloth ───────────────────────────────────────────
      const geo = lowPower
        ? new THREE.PlaneGeometry(16, 11, 90, 62)
        : new THREE.PlaneGeometry(16, 11, 160, 110);

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uInk: { value: new THREE.Color(0x0b0b14) },
        uPlum: { value: new THREE.Color(0x1a0d2e) },
        uNavy: { value: new THREE.Color(0x2c2178) },
        uGold: { value: new THREE.Color(0xc9a84c) },
      };

      const vertexShader = /* glsl */ `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;

        // Layered sine "cloth" displacement.
        float wave(vec2 p, float t) {
          float h = 0.0;
          h += sin(p.x * 0.7 + t * 0.8) * 0.55;
          h += sin(p.y * 0.9 - t * 0.6) * 0.45;
          h += sin((p.x + p.y) * 0.6 + t * 1.1) * 0.30;
          h += sin((p.x * 1.7 - p.y * 1.2) + t * 0.5) * 0.18;
          return h;
        }

        void main() {
          vUv = uv;
          vec3 pos = position;
          // pointer adds a gentle directional swell
          vec2 p = pos.xy + uMouse * 1.4;
          float t = uTime;
          float e = 0.15;
          float h  = wave(p, t);
          float hx = wave(p + vec2(e, 0.0), t);
          float hy = wave(p + vec2(0.0, e), t);
          pos.z += h;
          vHeight = h;
          // analytic normal from neighbouring heights
          vec3 dx = vec3(e, 0.0, hx - h);
          vec3 dy = vec3(0.0, e, hy - h);
          vNormal = normalize(cross(dx, dy));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `;

      const fragmentShader = /* glsl */ `
        precision highp float;
        uniform vec3 uInk;
        uniform vec3 uPlum;
        uniform vec3 uNavy;
        uniform vec3 uGold;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          // diagonal brand gradient
          float g = clamp((vUv.x * 0.5 + vUv.y * 0.5), 0.0, 1.0);
          vec3 base = mix(uInk, uPlum, smoothstep(0.0, 0.6, g));
          base = mix(base, uNavy, smoothstep(0.55, 1.0, g));

          // simple lambert from a key light
          vec3 lightDir = normalize(vec3(0.4, 0.7, 0.8));
          float diff = clamp(dot(normalize(vNormal), lightDir), 0.0, 1.0);

          // gold fresnel sheen on the wave crests / grazing angles
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          float fres = pow(1.0 - clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0), 2.2);
          float crest = smoothstep(0.1, 0.7, vHeight);
          vec3 sheen = uGold * (fres * 0.7 + crest * 0.35);

          vec3 col = base * (0.62 + diff * 0.8) + sheen;

          // vignette so edges fall into the page
          float vig = smoothstep(1.2, 0.2, distance(vUv, vec2(0.5)));
          col *= mix(0.45, 1.05, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
      const cloth = new THREE.Mesh(geo, material);
      cloth.rotation.x = -0.55;
      cloth.position.y = -0.6;
      scene.add(cloth);

      // ── Particle dust ────────────────────────────────────────
      const COUNT = lowPower ? 90 : 220;
      const pos = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
        pos[i * 3 + 2] = Math.random() * 4 + 1;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.025, transparent: true, opacity: 0.5, sizeAttenuation: true });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // ── Pointer parallax ─────────────────────────────────────
      const target = new THREE.Vector2(0, 0);
      const current = new THREE.Vector2(0, 0);
      function onMove(e: MouseEvent) {
        target.set((e.clientX / window.innerWidth - 0.5) * 2, -(e.clientY / window.innerHeight - 0.5) * 2);
      }
      if (!reduceMotion) window.addEventListener("mousemove", onMove, { passive: true });

      function onResize() {
        const nw = mount?.clientWidth || window.innerWidth;
        const nh = mount?.clientHeight || window.innerHeight;
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", onResize);

      // Pause rendering when the hero scrolls off screen.
      let visible = true;
      const io = new IntersectionObserver(
        ([entry]) => { visible = entry.isIntersecting; },
        { threshold: 0 }
      );
      io.observe(mount);

      let raf = 0;
      const clock = new THREE.Clock();

      function frame() {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;
        current.lerp(target, 0.04);
        uniforms.uMouse.value.set(current.x, current.y);
        cloth.rotation.z = current.x * 0.06;
        camera.position.x = current.x * 0.5;
        camera.position.y = current.y * 0.35;
        camera.lookAt(0, -0.4, 0);
        particles.rotation.y = t * 0.02;
        particles.position.x = -current.x * 0.4;
        renderer.render(scene, camera);
      }

      if (reduceMotion) {
        uniforms.uTime.value = 1.2;
        renderer.render(scene, camera);
      } else {
        frame();
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("resize", onResize);
        geo.dispose();
        material.dispose();
        pGeo.dispose();
        pMat.dispose();
        renderer.dispose();
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
