"use client";

import { useEffect, useRef } from "react";

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const mount = mountRef.current!;
    if (!mount) return;

    let animId: number;
    let THREE: typeof import("three");

    (async () => {
      THREE = await import("three");

      const w = mount.clientWidth;
      const h = mount.clientHeight;

      // ── Renderer ─────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      // ── Scene & Camera ────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
      camera.position.set(0, 0.3, 6);

      // ── Lights ────────────────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
      keyLight.position.set(3, 5, 5);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x9f97ff, 1.2); // purple fill
      fillLight.position.set(-4, 0, 2);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x5951b4, 0.8);
      rimLight.position.set(0, -3, -4);
      scene.add(rimLight);

      // ── T-Shirt Group ─────────────────────────────────────────
      const group = new THREE.Group();
      scene.add(group);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.85,
        metalness: 0.05,
      });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.45, 4, 6, 2), mat);
      group.add(torso);

      // Neck cutout illusion — small dark box at top
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.38, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 })
      );
      neck.position.set(0, 1.55, 0);
      group.add(neck);

      // Left sleeve
      const sleeveGeo = new THREE.BoxGeometry(1.1, 0.75, 0.4, 3, 2, 1);
      const lSleeve = new THREE.Mesh(sleeveGeo, mat);
      lSleeve.position.set(-1.55, 0.95, 0);
      lSleeve.rotation.z = Math.PI / 5;
      group.add(lSleeve);

      // Right sleeve
      const rSleeve = new THREE.Mesh(sleeveGeo, mat);
      rSleeve.position.set(1.55, 0.95, 0);
      rSleeve.rotation.z = -Math.PI / 5;
      group.add(rSleeve);

      // Hem (slightly wider base)
      const hem = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.47), mat);
      hem.position.set(0, -1.48, 0);
      group.add(hem);

      // Subtle edge glow via wireframe overlay
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x5951b4,
        wireframe: true,
        transparent: true,
        opacity: 0.06,
      });
      const wireGroup = group.clone();
      wireGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) c.material = wireMat;
      });
      group.add(wireGroup);

      group.position.set(1.5, 0, 0); // offset right so hero text has space
      group.rotation.y = 0.3;

      // ── Floating particle field ───────────────────────────────
      const PARTICLE_COUNT = 280;
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 18;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x9f97ff,
        size: 0.04,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // ── Mouse parallax ────────────────────────────────────────
      let mx = 0, my = 0;
      let targetX = 0, targetY = 0;

      function onMouseMove(e: MouseEvent) {
        if (!mount) return;
        const rect = mount.getBoundingClientRect();
        mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        my = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
      window.addEventListener("mousemove", onMouseMove);

      // ── Resize ────────────────────────────────────────────────
      function onResize() {
        const nw = mount?.clientWidth ?? window.innerWidth;
        const nh = mount?.clientHeight ?? window.innerHeight;
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", onResize);

      // ── Animation loop ────────────────────────────────────────
      let t = 0;
      function animate() {
        animId = requestAnimationFrame(animate);
        t += 0.008;

        // Smooth mouse tracking
        targetX += (mx * 0.18 - targetX) * 0.05;
        targetY += (my * 0.10 - targetY) * 0.05;

        // Auto-rotate shirt + parallax tilt
        group.rotation.y = 0.3 + t * 0.4 + targetX;
        group.rotation.x = targetY * 0.5;
        group.position.y = Math.sin(t * 0.6) * 0.12;

        // Gently drift particles
        particles.rotation.y = t * 0.03;
        particles.rotation.x = t * 0.015;

        renderer.render(scene, camera);
      }
      animate();

      // Cleanup on unmount
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(animId);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      };
    })().then((cleanup) => {
      if (cleanup) {
        // store cleanup for the effect's return
        (mountRef as { current: HTMLDivElement & { _cleanup?: () => void } }).current!._cleanup = cleanup;
      }
    });

    return () => {
      cancelAnimationFrame(animId);
      const m = mount as HTMLDivElement & { _cleanup?: () => void };
      m._cleanup?.();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" aria-hidden />;
}
