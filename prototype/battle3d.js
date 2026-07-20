/*
 * STARFALL — 3D battle arena (RAID-style diorama proof-of-concept).
 * Graybox "voidframe" figures built from primitives, staged with the
 * ART_DIRECTION two-light formula: cool key + warm rim + affinity emissive.
 * Real character models drop into buildUnit() later without touching the sync API.
 */
window.Battle3D = (function () {
  const AFF = { ion: 0x7dd3fc, cryo: 0xa5b4fc, plasma: 0xfda4af, umbral: 0xc084fc };

  let renderer = null, scene = null, camera = null, canvas = null;
  let meshes = {}, particles = [], running = false, t = 0, activeId = null, state = null;

  function supported() { return typeof THREE !== 'undefined'; }

  function init(canvasEl) {
    if (!supported()) return false;
    if (renderer) return true;
    canvas = canvasEl;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070a14, 0.028);

    camera = new THREE.PerspectiveCamera(45, 2, 0.1, 200);

    // The two-light RAID formula: cool key, warm rim, low ambient.
    scene.add(new THREE.AmbientLight(0x44507a, 1.0));
    const key = new THREE.DirectionalLight(0x99bbff, 1.4);
    key.position.set(-6, 12, 8);
    scene.add(key);
    const rim = new THREE.PointLight(0xff9955, 1.6, 60);
    rim.position.set(4, 5, -12);
    scene.add(rim);

    // Arena floor: dark disc + glowing grid.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 48),
      new THREE.MeshStandardMaterial({ color: 0x0c1122, roughness: 0.85, metalness: 0.4 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(30, 30, 0x2a3352, 0x1a2138);
    grid.position.y = 0.01;
    scene.add(grid);
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(16, 0.06, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x5ee0ff })
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.02;
    scene.add(rimRing);

    // Starfield.
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const r = 60 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 2;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaabbee, size: 0.35, sizeAttenuation: true })));

    return true;
  }

  // Graybox voidframe: body + head + shoulders + affinity core, or a titan colossus.
  function buildUnit(u) {
    const g = new THREE.Group();
    const aff = AFF[u.affinity] || 0x8899aa;
    const armor = new THREE.MeshStandardMaterial({ color: 0x55628f, roughness: 0.4, metalness: 0.65 });
    const core = new THREE.MeshStandardMaterial({ color: aff, emissive: aff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 });

    if (u.massive) {
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), armor.clone());
      body.position.y = 3.1;
      g.add(body);
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), core.clone());
      heart.position.y = 3.1;
      g.add(heart);
      for (let i = 0; i < 7; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 6), armor.clone());
        const a = (i / 7) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 2.2, 3.1 + Math.sin(i * 2.1) * 0.9, Math.sin(a) * 2.2);
        spike.lookAt(new THREE.Vector3(Math.cos(a) * 6, 3.1, Math.sin(a) * 6));
        spike.rotateX(Math.PI / 2);
        g.add(spike);
      }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.09, 8, 48), core.clone());
      halo.rotation.x = Math.PI / 2.3;
      halo.position.y = 3.1;
      g.add(halo);
      g.userData.spin = halo;
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 1.25, 10), armor.clone());
      body.position.y = 1.0;
      g.add(body);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), core.clone());
      chest.position.set(0, 1.25, 0.3);
      g.add(chest);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), armor.clone());
      head.position.y = 1.95;
      g.add(head);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), core.clone());
      visor.position.set(0, 1.95, 0.2);
      g.add(visor);
      for (const s of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), armor.clone());
        sh.position.set(0.52 * s, 1.52, 0);
        g.add(sh);
      }
    }

    // HP ring under the unit.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(u.massive ? 2.6 : 0.62, 0.07, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    g.userData.ring = ring;
    g.userData.baseY = 0;
    return g;
  }

  function layout() {
    if (!state) return;
    const sides = { hero: state.units.filter((u) => u.side === 'hero'), foe: state.units.filter((u) => u.side === 'foe') };
    for (const side of ['hero', 'foe']) {
      const list = sides[side];
      list.forEach((u, i) => {
        const m = meshes[u.id];
        if (!m) return;
        const x = (i - (list.length - 1) / 2) * (u.massive ? 3.2 : 2.4);
        const z = side === 'hero' ? 5.4 : -5.2;
        m.position.set(x, m.position.y, z);
        m.rotation.y = side === 'hero' ? Math.PI : 0;
      });
    }
  }

  function sync(bstate, currentActorId) {
    if (!renderer) return;
    if (state && state !== bstate) clear(); // new battle: drop stale meshes (ids repeat across battles)
    state = bstate;
    activeId = currentActorId || null;
    const seen = new Set();
    for (const u of bstate.units) {
      seen.add(u.id);
      if (!meshes[u.id]) {
        meshes[u.id] = buildUnit(u);
        scene.add(meshes[u.id]);
      }
      const m = meshes[u.id];
      const frac = u.hp / u.maxHp;
      const ring = m.userData.ring;
      ring.material.color.setHex(frac > 0.5 ? 0x4ade80 : frac > 0.25 ? 0xffd75e : 0xf87171);
      m.userData.dead = !u.alive;
    }
    for (const id of Object.keys(meshes)) {
      if (!seen.has(id)) { scene.remove(meshes[id]); delete meshes[id]; }
    }
    layout();
  }

  function burst(unitId, hex, count) {
    const m = meshes[unitId];
    if (!m || !scene) return;
    const geo = new THREE.BufferGeometry();
    const n = count || 22;
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = m.position.x; pos[i * 3 + 1] = m.position.y + (m.children[0] ? m.children[0].position.y : 1); pos[i * 3 + 2] = m.position.z;
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.25, (Math.random() - 0.5) * 0.3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: hex, size: 0.22, transparent: true }));
    scene.add(pts);
    particles.push({ pts, vel, life: 36 });
  }

  function events(fresh) {
    if (!renderer) return;
    for (const e of fresh) {
      if (e.type === 'hit') burst(e.target, e.crit ? 0xffd75e : 0xffffff, e.crit ? 34 : 18);
      else if (e.type === 'heal') burst(e.target, 0x4ade80, 16);
      else if (e.type === 'death') burst(e.target, 0xf87171, 44);
      else if (e.type === 'rebirth') burst(e.target, 0xff9944, 60);
    }
  }

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    t += 0.0035;

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }

    camera.position.set(Math.sin(t) * 15.5, 7.5 + Math.sin(t * 0.6) * 0.8, Math.cos(t) * 15.5);
    camera.lookAt(0, 1.6, 0);

    for (const id of Object.keys(meshes)) {
      const m = meshes[id];
      if (m.userData.dead) {
        m.scale.x = m.scale.z = Math.max(0.001, m.scale.x - 0.04);
        m.scale.y = Math.max(0.001, m.scale.y - 0.06);
      } else {
        const isActive = id === activeId;
        const bob = Math.sin(t * 9 + m.position.x) * 0.05;
        m.position.y = m.userData.baseY + bob + (isActive ? 0.35 : 0);
        const target = isActive ? 1.12 : 1;
        m.scale.setScalar(m.scale.x + (target - m.scale.x) * 0.15);
      }
      if (m.userData.spin) m.userData.spin.rotation.z += 0.01;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const pos = p.pts.geometry.attributes.position;
      for (let j = 0; j < p.vel.length; j++) {
        pos.array[j * 3] += p.vel[j].x; pos.array[j * 3 + 1] += p.vel[j].y; pos.array[j * 3 + 2] += p.vel[j].z;
        p.vel[j].y -= 0.008;
      }
      pos.needsUpdate = true;
      p.pts.material.opacity = p.life / 36;
      if (--p.life <= 0) { scene.remove(p.pts); particles.splice(i, 1); }
    }

    renderer.render(scene, camera);
  }

  function start() { if (renderer && !running) { running = true; animate(); } }
  function stop() { running = false; }
  function clear() {
    for (const id of Object.keys(meshes)) scene && scene.remove(meshes[id]);
    meshes = {};
    for (const p of particles) scene && scene.remove(p.pts);
    particles = [];
    state = null; activeId = null;
  }

  return { supported, init, sync, events, start, stop, clear };
})();
