/* Premium hero: slow-rotating silver data globe (three.js). Decorative only; degrades to nothing without WebGL. */
(async () => {
  const host = document.getElementById('heroScene');
  if (!host) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const t = document.createElement('canvas');
    if (!(t.getContext('webgl2') || t.getContext('webgl'))) return;
  } catch (e) { return; }

  let THREE;
  try { THREE = await import('./vendor/three.module.min.js'); } catch (e) { return; }

  const small = innerWidth < 760;
  const SILVER = 0xc3c7cf, WHITE = 0xffffff;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.z = 5.6;
  const globe = new THREE.Group();
  globe.rotation.x = 0.32;
  scene.add(globe);

  const R = 1.55;
  // latitude / longitude wireframe
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 30, 20)),
    new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0.085 })
  );
  globe.add(wire);

  // dotted surface (fibonacci sphere)
  const N = small ? 700 : 1500, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
    pos.set([Math.cos(th) * r * R * 1.004, y * R * 1.004, Math.sin(th) * r * R * 1.004], i * 3);
    const b = 0.35 + Math.random() * 0.65; col.set([b, b, b], i * 3);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  globe.add(new THREE.Points(dg, new THREE.PointsMaterial({ size: small ? 0.022 : 0.02, vertexColors: true, color: SILVER, transparent: true, opacity: 0.8, depthWrite: false })));

  // data nodes + arcs + travelling pulses
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const nodes = [];
  for (let i = 0; i < 12; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    nodes.push(new THREE.Vector3(Math.cos(th) * r, u, Math.sin(th) * r).multiplyScalar(R * 1.01));
  }
  const ng = new THREE.BufferGeometry().setFromPoints(nodes);
  globe.add(new THREE.Points(ng, new THREE.PointsMaterial({ size: small ? 0.07 : 0.06, color: WHITE, transparent: true, opacity: 0.95, depthWrite: false })));

  const curves = [], pulses = [];
  const used = new Set();
  for (let k = 0; k < 9; k++) {
    let a = Math.floor(Math.random() * nodes.length), b = Math.floor(Math.random() * nodes.length);
    if (a === b || used.has(a + '-' + b)) continue; used.add(a + '-' + b);
    const A = nodes[a], B = nodes[b], mid = A.clone().add(B).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(R + A.distanceTo(B) * 0.42);
    const c = new THREE.QuadraticBezierCurve3(A, mid, B);
    curves.push(c);
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(60)),
      new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0.32 })));
    const pg = new THREE.BufferGeometry().setFromPoints([A]);
    const pm = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.075, color: WHITE, transparent: true, opacity: 1, depthWrite: false }));
    globe.add(pm); pulses.push({ pm, c, t: Math.random(), s: 0.0016 + Math.random() * 0.002 });
  }

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  size();
  new ResizeObserver(size).observe(host);

  let mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0;
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - 0.5); my = (e.clientY / innerHeight - 0.5); }, { passive: true });
  }
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    globe.rotation.y += 0.0014;
    tx += (mx * 0.28 - tx) * 0.04; ty += (my * 0.18 - ty) * 0.04;
    globe.rotation.x = 0.32 + ty; globe.position.x = tx * 0.25;
    for (const p of pulses) {
      p.t += p.s; if (p.t > 1) p.t = 0;
      const v = p.c.getPoint(p.t), a = p.pm.geometry.attributes.position;
      a.setXYZ(0, v.x, v.y, v.z); a.needsUpdate = true;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !reduce) raf = requestAnimationFrame(frame); };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(host);
  document.addEventListener('visibilitychange', kick);
  host.classList.add('ready');
  renderer.render(scene, camera);
  kick();
})();
