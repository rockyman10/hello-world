/*
 * STARFALL — Character Showcase (banner-quality hero renders).
 * Data-driven multi-character stage: each Prime is a high-fidelity procedural
 * build with its own idle animation, staged in a shared hero light rig whose
 * accent colour retints to the character's affinity. This is the fidelity the
 * graybox battle figures upgrade toward; the visual pitch for the banner.
 */
window.Showcase = (function () {
  let renderer, scene, camera, canvas, hero, running = false, t = 0, current = null;
  // Retintable stage pieces (recoloured per character affinity).
  let rimLight, auraSprite, poolSprite, embers, rune1, rune2, tickMats = [];
  const glbCache = {}; // key -> normalized THREE.Object3D (sculpted Blender model)

  function supported() { return typeof THREE !== 'undefined'; }

  // Decode a base64 GLB and parse it into a scene graph (no fetch → works file://).
  function loadEmbeddedModels() {
    if (typeof THREE.GLTFLoader === 'undefined' || !window.STARFALL_MODELS) return;
    const loader = new THREE.GLTFLoader();
    for (const key of Object.keys(window.STARFALL_MODELS)) {
      try {
        const bin = atob(window.STARFALL_MODELS[key]);
        const buf = new ArrayBuffer(bin.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
        loader.parse(buf, '', (gltf) => {
          glbCache[key] = gltf.scene; // cache raw; normalized per-instance
          if (current === key && hero) select(key); // hot-swap once ready
        }, () => {});
      } catch (e) { /* fall back to procedural */ }
    }
  }

  // Scale a model to target height, feet at y=0, centred, spun 180° to face the
  // +Z camera, with emissive parts boosted. Mutates `root` in place.
  function normalizeInPlace(root) {
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.setScalar(3.5 / (size.y || 1));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
    root.rotation.y = Math.PI; // Blender +Y front -> glTF -Z; face the camera
    root.traverse((o) => {
      if (o.isMesh && o.material) {
        const mm = Array.isArray(o.material) ? o.material : [o.material];
        for (const mt of mm) {
          if (mt.emissive && (mt.emissive.r + mt.emissive.g + mt.emissive.b) > 0.05) mt.emissiveIntensity = 2.6;
          mt.needsUpdate = true;
        }
      }
    });
  }

  // Wrap a sculpted model as a hero group with orbiting accent shards + a gentle idle.
  // The raw cached scene is cloned and normalized fresh each time (cloning a
  // pre-transformed object dropped its scale).
  function heroFromModel(key, accentHex) {
    const model = glbCache[key].clone(true);
    normalizeInPlace(model);
    const g = new THREE.Group();
    g.add(model);
    g.userData.shards = [];
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + (i % 3) * 0.03),
        new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 1.6, roughness: 0.3 }));
      g.add(shard);
      g.userData.shards.push({ mesh: shard, phase: (i / 6) * Math.PI * 2, rad: 1.5 + (i % 3) * 0.25, y: 1.2 + i * 0.3, spd: 0.6 + (i % 3) * 0.2 });
    }
    g.userData.idle = (tt, grp) => {
      grp.position.y = 0.05 + Math.sin(tt * 1.4) * 0.04;   // breathing bob
      grp.children[0].rotation.z = Math.sin(tt * 0.6) * 0.02; // subtle weight sway (the model root)
    };
    return g;
  }

  // One white radial-gradient texture, tinted per-use via sprite material colour.
  let _glowTex = null;
  function glowTexture() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.25, '#ffffffcc');
    grd.addColorStop(0.6, '#ffffff30'); grd.addColorStop(1, '#ffffff00');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    _glowTex = new THREE.Texture(c); _glowTex.needsUpdate = true; return _glowTex;
  }
  function glowSprite(hex, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: hex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.setScalar(size);
    return s;
  }

  // Shared material palette; `accent` is the affinity emissive colour.
  function mats(accent) {
    return {
      armor: new THREE.MeshStandardMaterial({ color: 0x17131f, metalness: 0.9, roughness: 0.34 }),
      plate: new THREE.MeshStandardMaterial({ color: 0x2b2440, metalness: 0.85, roughness: 0.3 }),
      white: new THREE.MeshStandardMaterial({ color: 0xdfe6f5, metalness: 0.4, roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffcf6a, metalness: 1.0, roughness: 0.22, emissive: 0x241700, emissiveIntensity: 0.6 }),
      accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.3 }),
      cloak: new THREE.MeshStandardMaterial({ color: 0x0c0a15, metalness: 0.2, roughness: 0.85, side: THREE.DoubleSide }),
      lining: new THREE.MeshStandardMaterial({ color: 0x3a1f66, emissive: 0x25103f, emissiveIntensity: 0.7, side: THREE.DoubleSide, roughness: 0.6 }),
    };
  }
  const cyl = (rt, rb, h, mat, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), mat);
  const sph = (r, mat, s) => new THREE.Mesh(new THREE.SphereGeometry(r, s || 16, s || 16), mat);
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const tor = (r, tube, mat, arc) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40, arc), mat);

  // ---------------------------------------------------------------- Kaelis Vantar
  function buildKaelis() {
    const g = new THREE.Group();
    const m = mats(0xc084fc);
    m.lining.color.setHex(0x3a1f66); m.lining.emissive.setHex(0x25103f);

    for (const s of [-1, 1]) {
      const boot = cyl(0.19, 0.26, 0.4, m.plate); boot.position.set(0.24 * s, 0.2, 0.05); g.add(boot);
      const shin = cyl(0.15, 0.19, 0.75, m.armor); shin.position.set(0.24 * s, 0.72, 0); g.add(shin);
      const knee = sph(0.16, m.plate); knee.position.set(0.24 * s, 1.08, 0.04); g.add(knee);
      const kSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), m.accent); kSpike.position.set(0.24 * s, 1.1, 0.18); kSpike.rotation.x = 1.2; g.add(kSpike);
      const thigh = cyl(0.19, 0.16, 0.6, m.armor); thigh.position.set(0.26 * s, 1.42, 0); g.add(thigh);
    }
    const pelvis = box(0.62, 0.34, 0.42, m.plate); pelvis.position.y = 1.72; g.add(pelvis);
    const belt = tor(0.34, 0.05, m.gold); belt.rotation.x = Math.PI / 2; belt.position.y = 1.72; belt.scale.z = 0.7; g.add(belt);
    for (let i = -2; i <= 2; i++) { const f = box(0.18, 0.44, 0.06, m.armor); f.position.set(i * 0.15, 1.5, 0.24); f.rotation.x = 0.15; g.add(f); }

    const abdomen = cyl(0.3, 0.34, 0.45, m.armor); abdomen.position.y = 2.05; g.add(abdomen);
    const torsoGrp = new THREE.Group(); g.add(torsoGrp); // breathing pivot
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 16), m.plate);
    chest.scale.set(1.15, 1.0, 0.85); chest.position.y = 2.45; torsoGrp.add(chest);
    const vGold = box(0.1, 0.5, 0.06, m.gold); vGold.position.set(0, 2.45, 0.36); torsoGrp.add(vGold);
    // House Vantar hex emblem
    const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 6), m.gold); emblem.rotation.x = Math.PI / 2; emblem.position.set(0, 2.62, 0.4); torsoGrp.add(emblem);
    const core = sph(0.12, m.accent); core.position.set(0, 2.5, 0.42); torsoGrp.add(core);
    core.add(glowSprite(0xc084fc, 1.3)); g.userData.pulse = [core];
    const collar = tor(0.26, 0.05, m.gold); collar.rotation.x = Math.PI / 2; collar.position.y = 2.78; collar.scale.set(1, 0.75, 1); torsoGrp.add(collar);

    const arms = [];
    for (const s of [-1, 1]) {
      const paul = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.8), m.plate);
      paul.position.set(0.5 * s, 2.68, 0); paul.scale.set(1.1, 1, 1.1); g.add(paul);
      const rim = tor(0.24, 0.035, m.gold); rim.position.set(0.5 * s, 2.55, 0); rim.rotation.x = Math.PI / 2.2; g.add(rim);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 8), m.accent); spike.position.set(0.6 * s, 2.92, 0); spike.rotation.z = 0.3 * s; g.add(spike);
      const arm = new THREE.Group(); arm.position.set(0.52 * s, 2.55, 0); g.add(arm);
      const uArm = cyl(0.12, 0.13, 0.55, m.armor); uArm.position.set(0, -0.25, 0); uArm.rotation.z = 0.12 * s; arm.add(uArm);
      const elbow = sph(0.12, m.plate); elbow.position.set(0.05 * s, -0.55, 0); arm.add(elbow);
      const fArm = cyl(0.1, 0.12, 0.5, m.armor); fArm.position.set(0.08 * s, -0.83, 0.02); arm.add(fArm);
      const gaunt = box(0.2, 0.22, 0.22, m.plate); gaunt.position.set(0.1 * s, -1.1, 0.03); arm.add(gaunt);
      arms.push(arm);
    }
    g.userData.arms = arms;

    const neck = cyl(0.1, 0.12, 0.16, m.armor); neck.position.y = 2.86; g.add(neck);
    const headGrp = new THREE.Group(); headGrp.position.y = 3.06; g.add(headGrp);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 18), m.armor); head.scale.set(0.92, 1.05, 0.95); headGrp.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14, -Math.PI / 3, Math.PI / 1.5, Math.PI / 3, Math.PI / 2.4), m.plate); face.position.set(0, -0.02, 0.05); headGrp.add(face);
    const visor = box(0.3, 0.055, 0.05, m.accent); visor.position.set(0, 0.02, 0.24); headGrp.add(visor);
    visor.add(glowSprite(0xc084fc, 0.9)); g.userData.pulse.push(visor);
    for (let i = 0; i < 5; i++) {
      const a = (i / 4 - 0.5) * 1.5;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5 + Math.abs(a) * 0.15, 6), i % 2 ? m.gold : m.accent);
      blade.position.set(Math.sin(a) * 0.22, 0.26, -0.05 - Math.cos(a) * 0.08); blade.rotation.set(-0.5, a, Math.sin(a) * 0.4); headGrp.add(blade);
    }
    g.userData.head = headGrp;

    // wide flaring cloak
    const cloakGrp = new THREE.Group(); cloakGrp.position.set(0, 1.5, -0.18); g.add(cloakGrp);
    const cloak = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.5, 2.95, 28, 6, true, Math.PI * 0.5, Math.PI * 1.0), m.cloak); cloakGrp.add(cloak);
    const lining = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 1.42, 2.9, 28, 6, true, Math.PI * 0.53, Math.PI * 0.94), m.lining); lining.position.z = 0.04; cloakGrp.add(lining);
    const hem = tor(1.44, 0.03, m.gold, Math.PI * 0.94); hem.rotation.x = Math.PI / 2; hem.rotation.z = Math.PI * 0.53; hem.position.set(0, -1.42, 0); cloakGrp.add(hem);
    const clasp = sph(0.09, m.gold); clasp.position.set(0, 1.25, 0); cloakGrp.add(clasp);
    g.userData.cloak = cloakGrp;

    // floating void-edge greatsword
    const sword = new THREE.Group();
    const blade = box(0.12, 1.9, 0.03, m.plate); blade.position.y = 0.5; sword.add(blade);
    const edge = box(0.14, 1.92, 0.06, m.accent.clone()); edge.material.transparent = true; edge.material.opacity = 0.55; edge.position.y = 0.5; sword.add(edge);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), m.plate); tip.position.y = 1.6; sword.add(tip);
    const guard = box(0.5, 0.08, 0.1, m.gold); guard.position.y = -0.5; sword.add(guard);
    const grip = cyl(0.04, 0.04, 0.35, m.armor); grip.position.y = -0.68; sword.add(grip);
    const pommel = sph(0.08, m.accent); pommel.position.y = -0.9; sword.add(pommel);
    for (let i = 0; i < 3; i++) { const s = glowSprite(0xc084fc, 0.85); s.position.y = i * 0.7; sword.add(s); }
    sword.position.set(1.05, 1.5, 0.2); sword.rotation.z = -0.28; g.add(sword);
    g.userData.sword = sword;

    g.userData.shards = [];
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + (i % 3) * 0.03), m.accent); g.add(shard);
      g.userData.shards.push({ mesh: shard, phase: (i / 6) * Math.PI * 2, rad: 1.35 + (i % 3) * 0.25, y: 1.2 + i * 0.28, spd: 0.6 + (i % 3) * 0.2 });
    }

    // idle: slow breathing, weight shift, head drift, cloak sway, sword bob
    g.userData.idle = (tt, grp) => {
      const u = grp.userData;
      const breath = 1 + Math.sin(tt * 1.6) * 0.02;
      // torso is the group holding chest — scale gently
      grp.position.y = 0.1 + Math.sin(tt * 0.8) * 0.04;
      u.head.rotation.x = Math.sin(tt * 0.7) * 0.05; u.head.rotation.y = Math.sin(tt * 0.5) * 0.08;
      u.head.position.y = 3.06 + Math.sin(tt * 1.6) * 0.015;
      u.cloak.rotation.z = Math.sin(tt * 0.6) * 0.05;
      u.cloak.scale.x = 1 + Math.sin(tt * 0.9) * 0.02;
      u.arms[0].rotation.z = Math.sin(tt * 0.8) * 0.04; u.arms[1].rotation.z = -Math.sin(tt * 0.8 + 1) * 0.04;
      u.sword.position.y = 1.5 + Math.sin(tt * 1.3) * 0.08; u.sword.rotation.z = -0.28 + Math.sin(tt) * 0.03;
    };
    return g;
  }

  // ---------------------------------------------------------------- Juno-9
  function buildJuno() {
    const g = new THREE.Group();
    const ION = 0x7dd3fc;
    const m = mats(ION);

    // slimmer idol build, white bodysuit + cyan seams
    for (const s of [-1, 1]) {
      const boot = cyl(0.13, 0.16, 0.55, m.white); boot.position.set(0.17 * s, 0.28, 0.03); g.add(boot);
      const bTrim = tor(0.14, 0.02, m.accent); bTrim.rotation.x = Math.PI / 2; bTrim.position.set(0.17 * s, 0.5, 0); g.add(bTrim);
      const leg = cyl(0.1, 0.13, 0.95, m.armor); leg.position.set(0.17 * s, 1.05, 0); g.add(leg);
      const thigh = cyl(0.14, 0.12, 0.55, m.white); thigh.position.set(0.18 * s, 1.5, 0); g.add(thigh);
    }
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), m.white); hips.scale.set(1.1, 0.7, 0.9); hips.position.y = 1.72; g.add(hips);
    const skirtL = box(0.2, 0.3, 0.05, m.accent.clone()); skirtL.material.opacity = 0.7; skirtL.material.transparent = true; skirtL.position.set(0, 1.55, 0.22); skirtL.rotation.x = 0.2; g.add(skirtL);

    const waist = cyl(0.16, 0.2, 0.4, m.white); waist.position.y = 2.05; g.add(waist);
    const torsoGrp = new THREE.Group(); g.add(torsoGrp);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 16), m.white); chest.scale.set(1.05, 0.95, 0.85); chest.position.y = 2.35; torsoGrp.add(chest);
    // cyan chest seam + core
    const seam = box(0.05, 0.45, 0.04, m.accent); seam.position.set(0, 2.35, 0.24); torsoGrp.add(seam);
    const core = sph(0.09, m.accent); core.position.set(0, 2.45, 0.26); torsoGrp.add(core);
    core.add(glowSprite(ION, 1.0)); g.userData.pulse = [core];

    // slim shoulders + arms; right hand holds a mic
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = sph(0.14, m.accent); sh.position.set(0.34 * s, 2.5, 0); sh.scale.setScalar(0.9); g.add(sh);
      const arm = new THREE.Group(); arm.position.set(0.34 * s, 2.45, 0); g.add(arm);
      const uArm = cyl(0.08, 0.09, 0.5, m.white); uArm.position.y = -0.25; arm.add(uArm);
      const fArm = cyl(0.07, 0.08, 0.45, m.armor); fArm.position.y = -0.68; arm.add(fArm);
      const glove = sph(0.09, m.accent); glove.position.y = -0.92; arm.add(glove);
      arms.push(arm);
    }
    g.userData.arms = arms;
    // right arm raised with mic near mouth
    arms[1].rotation.z = -1.1; arms[1].position.set(0.3, 2.5, 0.15);
    const mic = new THREE.Group();
    const micHandle = cyl(0.03, 0.03, 0.3, m.plate); mic.add(micHandle);
    const micHead = sph(0.09, m.accent); micHead.position.y = 0.2; mic.add(micHead); micHead.add(glowSprite(ION, 0.7));
    mic.position.set(0.0, 3.0, 0.42); mic.rotation.z = 0.3; g.add(mic); g.userData.mic = mic;

    // head with headset + visor + twin ponytails
    const headGrp = new THREE.Group(); headGrp.position.y = 2.92; g.add(headGrp);
    const neck = cyl(0.07, 0.09, 0.14, m.white); neck.position.y = -0.12; headGrp.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 18), m.white); head.scale.set(0.95, 1.02, 0.95); headGrp.add(head);
    const visor = box(0.34, 0.07, 0.04, m.accent); visor.position.set(0, 0.03, 0.19); headGrp.add(visor); visor.add(glowSprite(ION, 0.8)); g.userData.pulse.push(visor);
    // headset band + ear cans
    const band = tor(0.26, 0.03, m.plate); band.rotation.x = 0.3; band.position.y = 0.12; headGrp.add(band);
    for (const s of [-1, 1]) { const can = cyl(0.09, 0.09, 0.08, m.accent); can.rotation.z = Math.PI / 2; can.position.set(0.24 * s, 0.02, 0); headGrp.add(can); }
    // mic boom from left can
    const boom = cyl(0.015, 0.015, 0.28, m.plate); boom.position.set(-0.24, -0.05, 0.12); boom.rotation.set(0.5, 0, -0.5); headGrp.add(boom);
    // hair: top swoosh + two ponytails (animated)
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.plate); hairTop.material = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.6, metalness: 0.3 }); hairTop.position.y = 0.06; hairTop.scale.set(1.05, 0.9, 1.05); headGrp.add(hairTop);
    const tails = [];
    for (const s of [-1, 1]) {
      const tail = new THREE.Group(); tail.position.set(0.18 * s, 0.05, -0.15); g.add(tail);
      let seg = tail;
      for (let i = 0; i < 4; i++) {
        const piece = cyl(0.06 - i * 0.012, 0.05 - i * 0.012, 0.3, hairTop.material); piece.position.y = -0.15; seg.add(piece);
        const joint = new THREE.Group(); joint.position.y = -0.3; seg.add(joint); seg = joint;
      }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 5), m.accent); tip.position.y = -0.08; seg.add(tip);
      tails.push({ base: tail, s });
    }
    g.userData.tails = tails;
    // ponytails anchored high on the head
    for (const tl of tails) { tl.base.position.set(0.15 * tl.s, 3.0, -0.12); }
    g.userData.head = headGrp;

    // orbiting broadcast rings + floating cassette
    g.userData.rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = tor(0.9 + i * 0.35, 0.02, m.accent.clone()); ring.material.transparent = true; ring.material.opacity = 0.6;
      ring.rotation.x = Math.PI / 2; ring.position.y = 1.6; g.add(ring);
      g.userData.rings.push({ mesh: ring, base: 0.9 + i * 0.35, phase: i * 1.3 });
    }
    const cassette = box(0.28, 0.18, 0.05, m.plate); const cLabel = box(0.2, 0.08, 0.06, m.accent); cLabel.position.z = 0.01; cassette.add(cLabel);
    cassette.position.set(-1.1, 2.1, 0.2); g.add(cassette); g.userData.cassette = cassette;

    g.userData.shards = [];
    for (let i = 0; i < 5; i++) {
      const note = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), m.accent); g.add(note);
      g.userData.shards.push({ mesh: note, phase: (i / 5) * Math.PI * 2, rad: 1.5 + (i % 2) * 0.3, y: 1.3 + i * 0.32, spd: 0.9 + (i % 2) * 0.3 });
    }

    // idle: idol bounce-to-the-beat, ponytail sway, ring pulse, mic bob
    g.userData.idle = (tt, grp) => {
      const u = grp.userData;
      const beat = Math.abs(Math.sin(tt * 2.4));           // rhythmic 2-count
      grp.position.y = 0.1 + beat * 0.06;
      u.head.rotation.z = Math.sin(tt * 2.4) * 0.06; u.head.rotation.y = Math.sin(tt * 0.6) * 0.1;
      for (const tl of u.tails) {
        let seg = tl.base, i = 0;
        seg.rotation.z = Math.sin(tt * 2.2 + tl.s) * 0.12 * tl.s;
        while (seg.children.length) { const j = seg.children.find(c => c.type === 'Group'); if (!j) break; j.rotation.z = Math.sin(tt * 2.2 - i * 0.6 + tl.s) * 0.18; seg = j; i++; }
      }
      u.mic.position.y = 3.0 + beat * 0.04;
      for (const r of u.rings) { const p = (Math.sin(tt * 1.5 + r.phase) + 1) / 2; r.mesh.scale.setScalar(0.8 + p * 0.5); r.mesh.material.opacity = 0.15 + (1 - p) * 0.5; r.mesh.position.y = 1.4 + p * 0.6; }
      u.cassette.rotation.y += 0.02; u.cassette.position.y = 2.1 + Math.sin(tt * 1.1) * 0.1;
    };
    return g;
  }

  // ---------------------------------------------------------------- registry
  const CHARACTERS = {
    kaelis: {
      key: 'kaelis', build: buildKaelis, accent: 0xc084fc, rimHex: 0xc060ff, auraHex: 0x6a30b0, runeHex: 0xc084fc, rune2Hex: 0x7d3fd6,
      rarity: 5, tier: 'PRIME', affClass: 'umbral', aff: 'UMBRAL', role: 'ATTACK', house: 'HOUSE VANTAR',
      name: 'KAELIS VANTAR', epithet: '“The Unwritten Blade”',
      bio: 'Heir of the Void Compact — the Eclipse rewrote him into an executioner, until your anchor signal cut him loose. He hunts the timeline where a version of him still serves.',
      stats: { ATK: '1400', HP: '14000', SPD: '105', CRIT: '30%' }, note: 'Featured 5★ · Umbral has no affinity weakness',
    },
    juno: {
      key: 'juno', build: buildJuno, accent: 0x7dd3fc, rimHex: 0x3ba7ff, auraHex: 0x1a6ab0, runeHex: 0x7dd3fc, rune2Hex: 0x3f9fd6,
      rarity: 5, tier: 'PRIME', affClass: 'ion', aff: 'ION', role: 'SUPPORT', house: 'THE CHORUS',
      name: 'JUNO-9', epithet: '“The Signal Saint”',
      bio: 'An AI grown from the archived voice of a pre-Eclipse idol. Nine iterations burned out keeping the fleet\'s morale grid alive — this one writes her own songs. Her concerts are also jamming arrays.',
      stats: { ATK: '900', HP: '13000', SPD: '122', CRIT: '15%' }, note: 'Featured 5★ · team buffs + turn-meter tech',
    },
  };
  function list() { return Object.keys(CHARACTERS); }
  function meta(key) { return CHARACTERS[key]; }

  function select(key) {
    const c = CHARACTERS[key]; if (!c || !renderer) return null;
    if (hero) { scene.remove(hero); }
    // Prefer the sculpted Blender model once it's decoded; procedural is the fallback.
    hero = glbCache[key] ? heroFromModel(key, c.accent) : c.build();
    scene.add(hero); current = key;
    // retint the stage to the character's affinity
    rimLight.color.setHex(c.rimHex);
    auraSprite.material.color.setHex(c.auraHex);
    poolSprite.material.color.setHex(c.accent);
    embers.material.color.setHex(c.accent);
    rune1.color.setHex(c.runeHex); rune2.color.setHex(c.rune2Hex);
    for (const tm of tickMats) tm.color.setHex(c.runeHex);
    return c;
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

    scene.add(new THREE.AmbientLight(0x2a2a4a, 0.7));
    const key = new THREE.DirectionalLight(0xbcd0ff, 2.0); key.position.set(-5, 9, 7); scene.add(key);
    rimLight = new THREE.PointLight(0xc060ff, 3.2, 40); rimLight.position.set(1.5, 5, -6); scene.add(rimLight);
    const warm = new THREE.PointLight(0xff8a4a, 1.4, 30); warm.position.set(6, 2.5, 3); scene.add(warm);
    const top = new THREE.SpotLight(0xffffff, 1.2, 30, Math.PI / 5, 0.5); top.position.set(0, 14, 2); scene.add(top);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: 0x0a0812, metalness: 0.8, roughness: 0.4 }));
    disc.rotation.x = -Math.PI / 2; scene.add(disc);
    rune1 = new THREE.MeshBasicMaterial({ color: 0xc084fc }); const r1 = tor(3.4, 0.02, rune1); r1.rotation.x = Math.PI / 2; r1.position.y = 0.02; scene.add(r1);
    rune2 = new THREE.MeshBasicMaterial({ color: 0x7d3fd6 }); const r2 = tor(2.8, 0.05, rune2); r2.rotation.x = Math.PI / 2; r2.position.y = 0.015; scene.add(r2);
    for (let i = 0; i < 24; i++) {
      const tm = new THREE.MeshBasicMaterial({ color: 0x9a5fe0 }); tickMats.push(tm);
      const tick = box(0.05, 0.02, 0.3, tm); const a = (i / 24) * Math.PI * 2; tick.position.set(Math.cos(a) * 3.1, 0.02, Math.sin(a) * 3.1); tick.rotation.y = -a; scene.add(tick);
    }
    auraSprite = glowSprite(0x6a30b0, 9); auraSprite.position.set(0, 2.6, -2.5); scene.add(auraSprite);
    poolSprite = glowSprite(0xc084fc, 5); poolSprite.position.set(0, 0.05, 0); scene.add(poolSprite);

    const eg = new THREE.BufferGeometry(); const N = 90, pos = new Float32Array(N * 3), spd = [];
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 3; pos[i*3]=Math.cos(a)*r; pos[i*3+1]=Math.random()*5; pos[i*3+2]=Math.sin(a)*r; spd.push(0.004 + Math.random()*0.012); }
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xc9a2ff, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    embers.userData.spd = spd; scene.add(embers);

    const sg = new THREE.BufferGeometry(); const sp = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) { sp[i*3]=(Math.random()-0.5)*60; sp[i*3+1]=Math.random()*30; sp[i*3+2]=-8-Math.random()*40; }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8899cc, size: 0.15 })));

    loadEmbeddedModels();
    select('kaelis');
    return true;
  }

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    t += 0.01;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }

    hero.rotation.y = Math.sin(t * 0.35) * 0.5;
    camera.position.set(0, 2.7, 8.2); camera.lookAt(0, 1.95, 0);

    if (hero.userData.idle) hero.userData.idle(t, hero);
    for (const o of (hero.userData.shards || [])) {
      const a = t * o.spd + o.phase;
      o.mesh.position.set(Math.cos(a) * o.rad, o.y + Math.sin(a * 1.5) * 0.2, Math.sin(a) * o.rad);
      o.mesh.rotation.x += 0.03; o.mesh.rotation.y += 0.025;
    }
    for (const p of (hero.userData.pulse || [])) { const s = 1 + Math.sin(t * 3) * 0.12; if (p.children[0]) p.children[0].scale.setScalar((p === hero.userData.pulse[0] ? 1.05 : 0.75) * s); }
    if (embers) { const pos = embers.geometry.attributes.position, spd = embers.userData.spd; for (let i = 0; i < spd.length; i++) { pos.array[i*3+1] += spd[i]; if (pos.array[i*3+1] > 5) pos.array[i*3+1] = 0; } pos.needsUpdate = true; }
    renderer.render(scene, camera);
  }

  function start() { if (renderer && !running) { running = true; animate(); } }
  function stop() { running = false; }

  return { supported, init, start, stop, select, list, meta, current: () => current };
})();
