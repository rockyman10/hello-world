/*
 * STARFALL — Character Showcase (banner-quality hero render).
 * A high-fidelity procedural build of Kaelis Vantar, the featured Prime:
 * layered cloak, gold-trimmed void armor, crowned helm, a floating void-edge
 * greatsword, orbiting shards, rising embers — staged with a three-light
 * hero rig and faked bloom (additive glow sprites). This is the fidelity the
 * graybox battle figures upgrade toward; the visual pitch for the banner.
 */
window.Showcase = (function () {
  let renderer, scene, camera, canvas, hero, running = false, t = 0;
  let orbiters = [], embers = null, sword = null, auraPulse = [];

  function supported() { return typeof THREE !== 'undefined'; }

  // Radial-gradient sprite texture for cheap bloom/aura glows.
  function glowTexture(hex) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const col = '#' + hex.toString(16).padStart(6, '0');
    grd.addColorStop(0, col); grd.addColorStop(0.25, col + 'cc');
    grd.addColorStop(0.6, col + '30'); grd.addColorStop(1, col + '00');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.Texture(c); tex.needsUpdate = true; return tex;
  }
  const GLOW = {};
  function glowSprite(hex, size) {
    if (!GLOW[hex]) GLOW[hex] = glowTexture(hex);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW[hex], color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(size);
    return s;
  }

  const MAT = () => ({
    armor: new THREE.MeshStandardMaterial({ color: 0x17131f, metalness: 0.9, roughness: 0.34 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x2b2440, metalness: 0.85, roughness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffcf6a, metalness: 1.0, roughness: 0.22, emissive: 0x241700, emissiveIntensity: 0.6 }),
    void: new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0xb060ff, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.3 }),
    cloak: new THREE.MeshStandardMaterial({ color: 0x0c0a15, metalness: 0.2, roughness: 0.85, side: THREE.DoubleSide }),
    lining: new THREE.MeshStandardMaterial({ color: 0x3a1f66, emissive: 0x25103f, emissiveIntensity: 0.7, side: THREE.DoubleSide, roughness: 0.6 }),
  });

  function cyl(rt, rb, h, mat, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), mat); }
  function sph(r, mat, s) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, s || 16, s || 16), mat); return m; }
  function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function torus(r, tube, mat) { return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40), mat); }

  function buildKaelis() {
    const g = new THREE.Group();
    const m = MAT();

    // ---- legs ----
    for (const s of [-1, 1]) {
      const boot = cyl(0.19, 0.26, 0.4, m.plate); boot.position.set(0.24 * s, 0.2, 0.05); g.add(boot);
      const shin = cyl(0.15, 0.19, 0.75, m.armor); shin.position.set(0.24 * s, 0.72, 0); g.add(shin);
      const knee = sph(0.16, m.plate); knee.position.set(0.24 * s, 1.08, 0.04); g.add(knee);
      const thigh = cyl(0.19, 0.16, 0.6, m.armor); thigh.position.set(0.26 * s, 1.42, 0); g.add(thigh);
    }
    // ---- hips / abdomen ----
    const pelvis = box(0.62, 0.34, 0.42, m.plate); pelvis.position.y = 1.72; g.add(pelvis);
    const beltT = torus(0.34, 0.05, m.gold); beltT.rotation.x = Math.PI / 2; beltT.position.y = 1.72; beltT.scale.z = 0.7; g.add(beltT);
    // hanging faulds (armored skirt panels)
    for (let i = -2; i <= 2; i++) {
      const f = box(0.18, 0.44, 0.06, m.armor); f.position.set(i * 0.15, 1.5, 0.24); f.rotation.x = 0.15; g.add(f);
    }

    // ---- torso ----
    const abdomen = cyl(0.3, 0.34, 0.45, m.armor); abdomen.position.y = 2.05; g.add(abdomen);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), m.plate);
    chest.scale.set(1.15, 1.0, 0.85); chest.position.y = 2.45; g.add(chest);
    // gold sternum trim + void heart-core
    const vGold = box(0.1, 0.5, 0.06, m.gold); vGold.position.set(0, 2.45, 0.36); vGold.rotation.z = 0; g.add(vGold);
    const core = sph(0.13, m.void); core.position.set(0, 2.5, 0.4); g.add(core);
    core.add(glowSprite(0xc084fc, 1.6)); auraPulse.push(core);
    // collar
    const collar = torus(0.26, 0.05, m.gold); collar.rotation.x = Math.PI / 2; collar.position.y = 2.78; collar.scale.set(1, 0.75, 1); g.add(collar);

    // ---- shoulders (pauldrons) ----
    for (const s of [-1, 1]) {
      const paul = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.8), m.plate);
      paul.position.set(0.5 * s, 2.68, 0); paul.scale.set(1.1, 1, 1.1); g.add(paul);
      const rim = torus(0.24, 0.035, m.gold); rim.position.set(0.5 * s, 2.55, 0); rim.rotation.x = Math.PI / 2.2; g.add(rim);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 8), m.void);
      spike.position.set(0.6 * s, 2.92, 0); spike.rotation.z = 0.3 * s; g.add(spike);
      // ---- arms ----
      const uArm = cyl(0.12, 0.13, 0.55, m.armor); uArm.position.set(0.52 * s, 2.3, 0); uArm.rotation.z = 0.12 * s; g.add(uArm);
      const elbow = sph(0.12, m.plate); elbow.position.set(0.57 * s, 2.0, 0); g.add(elbow);
      const fArm = cyl(0.1, 0.12, 0.5, m.armor); fArm.position.set(0.6 * s, 1.72, 0.02); fArm.rotation.z = 0.05 * s; g.add(fArm);
      const gaunt = box(0.2, 0.22, 0.22, m.plate); gaunt.position.set(0.62 * s, 1.46, 0.03); g.add(gaunt);
      const knuck = torus(0.09, 0.03, m.gold); knuck.position.set(0.62 * s, 1.42, 0.14); g.add(knuck);
    }

    // ---- head + crowned helm ----
    const neck = cyl(0.1, 0.12, 0.16, m.armor); neck.position.y = 2.86; g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 18), m.armor);
    head.scale.set(0.92, 1.05, 0.95); head.position.y = 3.06; g.add(head);
    // faceplate + glowing visor slit
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14, -Math.PI / 3, Math.PI / 1.5, Math.PI / 3, Math.PI / 2.4), m.plate);
    face.position.set(0, 3.04, 0.05); g.add(face);
    const visor = box(0.3, 0.055, 0.05, m.void); visor.position.set(0, 3.08, 0.24); g.add(visor);
    visor.add(glowSprite(0xc084fc, 1.1)); auraPulse.push(visor);
    // crown of void-blades (gold base, purple tips) sweeping back
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 1.5;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5 + Math.abs(a) * 0.15, 6), i % 2 ? m.gold : m.void);
      blade.position.set(Math.sin(a) * 0.22, 3.32, -0.05 - Math.cos(a) * 0.08);
      blade.rotation.set(-0.5, a, Math.sin(a) * 0.4);
      g.add(blade);
    }

    // ---- cloak (outer shell + inner lining) flowing wide to the floor ----
    const cloakGeo = new THREE.CylinderGeometry(0.6, 1.5, 2.95, 28, 6, true, Math.PI * 0.5, Math.PI * 1.0);
    const cloak = new THREE.Mesh(cloakGeo, m.cloak); cloak.position.set(0, 1.5, -0.18); g.add(cloak);
    const lineGeo = new THREE.CylinderGeometry(0.56, 1.42, 2.9, 28, 6, true, Math.PI * 0.53, Math.PI * 0.94);
    const lining = new THREE.Mesh(lineGeo, m.lining); lining.position.set(0, 1.5, -0.14); g.add(lining);
    // gold cloak hem
    const hem = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.03, 8, 40, Math.PI * 0.94), m.gold);
    hem.rotation.x = Math.PI / 2; hem.rotation.z = Math.PI * 0.53; hem.position.set(0, 0.08, -0.14); g.add(hem);
    // cloak clasp
    const clasp = sph(0.09, m.gold); clasp.position.set(0, 2.75, -0.18); g.add(clasp);

    // ---- the floating void-edge greatsword (his "unwritten blade") ----
    sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.03), m.plate); blade.position.y = 0.5; sword.add(blade);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.92, 0.06), m.void);
    edge.material = m.void.clone(); edge.material.transparent = true; edge.material.opacity = 0.55; edge.position.y = 0.5; sword.add(edge);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), m.plate); tip.position.y = 1.6; sword.add(tip);
    const guard = box(0.5, 0.08, 0.1, m.gold); guard.position.y = -0.5; sword.add(guard);
    const grip = cyl(0.04, 0.04, 0.35, m.armor); grip.position.y = -0.68; sword.add(grip);
    const pommel = sph(0.08, m.void); pommel.position.y = -0.9; sword.add(pommel);
    for (let i = 0; i < 3; i++) sword.add((() => { const s = glowSprite(0xc084fc, 0.9); s.position.y = i * 0.7; return s; })());
    sword.position.set(1.05, 1.5, 0.2); sword.rotation.z = -0.28;
    g.add(sword);

    // ---- orbiting shards ----
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.05), m.void);
      g.add(shard);
      orbiters.push({ mesh: shard, phase: (i / 6) * Math.PI * 2, rad: 1.3 + (i % 3) * 0.25, y: 1.2 + i * 0.28, spd: 0.6 + (i % 3) * 0.2 });
    }

    hero = g;
    return g;
  }

  function init(canvasEl) {
    if (!supported()) return false;
    if (renderer) return true;
    canvas = canvasEl;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch (e) { return false; }
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0716, 0.03);
    camera = new THREE.PerspectiveCamera(38, 1.5, 0.1, 100);

    // Hero three-point rig + purple back-rim (House Vantar / Umbral).
    scene.add(new THREE.AmbientLight(0x2a2a4a, 0.7));
    const key = new THREE.DirectionalLight(0xbcd0ff, 2.0); key.position.set(-5, 9, 7); scene.add(key);
    const rim = new THREE.PointLight(0xc060ff, 3.2, 40); rim.position.set(1.5, 5, -6); scene.add(rim);
    const warm = new THREE.PointLight(0xff8a4a, 1.4, 30); warm.position.set(6, 2.5, 3); scene.add(warm);
    const top = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI / 5, 0.5); top.position.set(0, 14, 2); scene.add(top);

    // Stage: dark reflective disc + glowing rune circle.
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a0812, metalness: 0.8, roughness: 0.4 }));
    disc.rotation.x = -Math.PI / 2; scene.add(disc);
    const rune1 = torus(3.4, 0.02, new THREE.MeshBasicMaterial({ color: 0xc084fc }));
    rune1.rotation.x = Math.PI / 2; rune1.position.y = 0.02; scene.add(rune1);
    const rune2 = torus(2.8, 0.05, new THREE.MeshBasicMaterial({ color: 0x7d3fd6 }));
    rune2.rotation.x = Math.PI / 2; rune2.position.y = 0.015; scene.add(rune2);
    for (let i = 0; i < 24; i++) {
      const tick = box(0.05, 0.02, 0.3, new THREE.MeshBasicMaterial({ color: 0x9a5fe0 }));
      const a = (i / 24) * Math.PI * 2; tick.position.set(Math.cos(a) * 3.1, 0.02, Math.sin(a) * 3.1); tick.rotation.y = -a; scene.add(tick);
    }
    // big aura glow behind the hero + ground pool
    const aura = glowSprite(0x6a30b0, 9); aura.position.set(0, 2.6, -2.5); scene.add(aura);
    const pool = glowSprite(0xc084fc, 5); pool.position.set(0, 0.05, 0); pool.material.rotation = 0; scene.add(pool);

    // Rising ember motes.
    const eg = new THREE.BufferGeometry();
    const N = 90, pos = new Float32Array(N * 3), spd = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 3;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 5; pos[i * 3 + 2] = Math.sin(a) * r;
      spd.push(0.004 + Math.random() * 0.012);
    }
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xc9a2ff, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    embers.userData.spd = spd; scene.add(embers);

    // Starfield backdrop.
    const sg = new THREE.BufferGeometry(); const sp = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) { sp[i*3]=(Math.random()-0.5)*60; sp[i*3+1]=Math.random()*30; sp[i*3+2]=-8-Math.random()*40; }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8899cc, size: 0.15 })));

    buildKaelis();
    scene.add(hero);
    return true;
  }

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    t += 0.01;

    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    }

    // Slow hero-shot turntable, gentle bob, framed full-figure with headroom.
    hero.rotation.y = Math.sin(t * 0.35) * 0.5;
    hero.position.y = 0.1 + Math.sin(t * 0.8) * 0.04;
    camera.position.set(0, 2.7, 8.2);
    camera.lookAt(0, 1.95, 0);

    for (const o of orbiters) {
      const a = t * o.spd + o.phase;
      o.mesh.position.set(Math.cos(a) * o.rad, o.y + Math.sin(a * 1.5) * 0.2, Math.sin(a) * o.rad);
      o.mesh.rotation.x += 0.03; o.mesh.rotation.y += 0.025;
    }
    if (sword) { sword.position.y = 1.5 + Math.sin(t * 1.3) * 0.08; sword.rotation.z = -0.28 + Math.sin(t) * 0.03; }
    for (const p of auraPulse) { const s = 1 + Math.sin(t * 3) * 0.12; if (p.children[0]) p.children[0].scale.setScalar((p === auraPulse[0] ? 1.1 : 0.75) * s); }
    if (embers) {
      const pos = embers.geometry.attributes.position, spd = embers.userData.spd;
      for (let i = 0; i < spd.length; i++) { pos.array[i*3+1] += spd[i]; if (pos.array[i*3+1] > 5) pos.array[i*3+1] = 0; }
      pos.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function start() { if (renderer && !running) { running = true; animate(); } }
  function stop() { running = false; }

  return { supported, init, start, stop };
})();
