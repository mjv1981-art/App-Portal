(() => {
  'use strict';

  window.ThanatosMissions = window.ThanatosMissions || {};

  const WORLD_W = 1120;
  const DEPTH = 5400;
  const MUSIC = 'm4_ossuary';
  const TIDE_SPEED = 68;
  const ARENA_Y = 680;
  const EXIT_X = WORLD_W / 2;
  const EXIT_Y = 85;
  const FIRE_RANGE = 260;
  const ROAR_RANGE = 218;
  const SURGE_TIME = 0.29;
  const FLAP_TIME = 0.36;
  const HIT_POSE_TIME = 0.23;
  const DEFEAT_POSE_TIME = 0.46;
  const VAELKOR_CELL = 120;
  const VAELKOR_COLUMNS = 16;
  const VAELKOR_VIEW_FRAMES = 53;
  // Screen-space clockwise headings from East. West facings mirror the drawn
  // side and three-quarter views. North and South each have their own anatomy.
  const VAELKOR_VIEWS = [[0, 1], [3, 1], [4, 1], [3, -1], [0, -1], [1, -1], [2, 1], [1, 1]];
  const VAELKOR_CLIPS = {
    idle: { first: 0, count: 6, length: 1.26 },
    glide: { first: 6, count: 6, length: 0.64 },
    climb: { first: 12, count: 8, length: FLAP_TIME },
    dive: { first: 20, count: 8, length: 0.48 },
    fire: { first: 28, count: 5, length: 0.28 },
    fireRecovery: { first: 31, count: 2, length: 0.12 },
    surge: { first: 33, count: 5, length: SURGE_TIME },
    roar: { first: 38, count: 5, length: 0.38 },
    hit: { first: 43, count: 5, length: HIT_POSE_TIME },
    defeat: { first: 48, count: 5, length: DEFEAT_POSE_TIME }
  };
  // Pixel anchors from the Ghost Fire atlas cells, relative to the ribcage.
  const VAELKOR_MOUTHS = [
    [[40.5, -8.7], [41.7, -8.6], [44.6, -9.3], [42.1, -8.6], [40.3, -8.5]],
    [[29.4, -27], [30.3, -28.7], [32.4, -32.2], [30.7, -30.1], [29.3, -27.4]],
    [[-0.1, -26.4], [-0.1, -28.3], [-0.1, -31.7], [-0.2, -28.9], [-0.1, -26.4]],
    [[36.8, 5.2], [38.3, 6.4], [41.1, 7.5], [38.6, 7], [36.7, 5.8]],
    [[-0.5, 5.2], [-0.8, 7.3], [-1.1, 9.4], [-0.6, 7.3], [-0.6, 5.6]]
  ];
  const VENTS = [
    [156, 4740], [955, 4340], [171, 3730], [952, 3230],
    [144, 2755], [958, 2190], [155, 1510], [959, 1020]
  ];
  const CAGES = [
    [465, 5170], [785, 5000], [235, 4850], [886, 4660], [648, 4455],
    [245, 4230], [891, 4085], [381, 3860], [826, 3570], [250, 3280],
    [838, 3050], [340, 2710], [791, 2325], [231, 1840], [862, 1285]
  ];
  const LEDGES = [
    [129, 4720, 297], [878, 4540, 228], [560, 4510, 310, true],
    [801, 4160, 345], [235, 3935, 355], [205, 3500, 340],
    [899, 3335, 352], [328, 3090, 632], [927, 2690, 290],
    [225, 2450, 315], [558, 2170, 344, true], [817, 1900, 408],
    [265, 1685, 344], [404, 1390, 588], [886, 1120, 300],
    [175, 865, 240], [245, 484, 292], [875, 484, 292]
  ];
  const CREATURES = [
    ['warden', 180, 4663], ['catapult', 934, 4478], ['wraith', 492, 4070],
    ['warden', 268, 3880], ['catapult', 917, 3273], ['wraith', 755, 3170],
    ['wyrm', 454, 2635, 232], ['warden', 916, 2635], ['wyrm', 664, 2075, 864],
    ['catapult', 249, 1623], ['wyrm', 425, 1580, 215], ['wraith', 866, 1345],
    ['warden', 925, 1065], ['wraith', 467, 965]
  ];
  const ENEMY = {
    warden: { sprite: 'ossuaryWarden', hp: 37, size: 78, score: 115, interval: 2.65 },
    catapult: { sprite: 'boneCatapult', hp: 58, size: 104, score: 145, interval: 3.1 },
    wraith: { sprite: 'enemyWraith', hp: 34, size: 75, score: 105, interval: 2.6 },
    wyrm: { sprite: 'ghostWyrm', hp: 56, size: 91, score: 135, interval: 2.1 }
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const point = (x, y, data = {}) => ({ x, y, ...data });

  function makeController() {
    let p, cages, ledges, enemies, runes, vents, rockfalls, pylons, boss, missiles, trails, camera;
    let time, tide, tideDelay, score, souls, rescuedWyrms, arena, surgeHeld, roarHeld, fire, visualHit;
    let note, noteTime;

    function init(_ctx, _w, h) {
      p = {
        x: EXIT_X, y: DEPTH - 92, vx: 0, vy: 0, hp: 100, fuel: 100, flap: 0, flapPose: 0,
        surge: 0, surgeRecover: 0, roarRecover: 0, hurt: 0,
        aim: -Math.PI / 2, facing: 1, starved: false, surgeAngle: 0, rammed: new Set(),
        motion: { heading: 6, clip: 'idle', elapsed: 0, turn: 0, roar: 0, terminal: false }
      };
      cages = CAGES.map(([x, y]) => point(x, y, { hp: 14, kind: 'cage' }));
      ledges = LEDGES.map(([x, y, width, brittle]) => point(x, y, { width, brittle, broken: false }));
      enemies = CREATURES.map(([kind, x, y, runeX], id) => point(x, y, {
        ...ENEMY[kind], kind, startX: x, startY: y, runeX, elapsed: id * 0.33, freed: false, vx: 0, flash: 0
      }));
      runes = enemies.filter((e) => e.kind === 'wyrm').map((e) =>
        point(e.runeX, e.startY + 28, { kind: 'rune', hp: 24, wyrm: e }));
      vents = VENTS.map(([x, y]) => point(x, y, { direction: x < EXIT_X ? 1 : -1, phase: 0, clock: 0 }));
      rockfalls = [3940, 2850, 1780, 990].map((y) => point(0, y, { warning: null }));
      pylons = [point(305, 444, { kind: 'pylon', hp: 63 }), point(815, 444, { kind: 'pylon', hp: 63 })];
      boss = point(EXIT_X, 237, { kind: 'boss', hp: 215, attack: 1, angle: 0, flash: 0, cycle: 0 });
      missiles = [];
      trails = [];
      camera = DEPTH - h;
      time = tideDelay = score = souls = rescuedWyrms = visualHit = 0;
      tide = DEPTH + 215;
      arena = surgeHeld = roarHeld = fire = false;
      announce('Hold UP to climb. Use Soul Roar near spirit cages.', 4.6);
    }

    function announce(text, duration = 3) {
      note = text;
      noteTime = duration;
    }

    function shatter(target, audio) {
      target.broken = true;
      score += 40;
      trails.push(point(target.x, target.y, { kind: 'blast', age: 0.42 }));
      audio.playStoneShatter();
    }

    function freeSpirit(cage, audio) {
      souls += 1;
      p.hp = Math.min(100, p.hp + 15);
      tideDelay += 2.5;
      score += 125;
      trails.push(point(cage.x, cage.y, { kind: 'spirit', age: 0.85 }));
      audio.playSpiritFreed();
      announce('Soul freed  ·  +15 Integrity  ·  +2.5s before the tide rises');
    }

    function pylonCount() {
      return Number(pylons[0].hp > 0) + Number(pylons[1].hp > 0);
    }

    function hit(target, damage, audio) {
      if (target.hp <= 0 || target.freed || (target.kind === 'boss' && pylonCount() > 0)) return;
      target.hp = Math.max(0, target.hp - damage);
      if (target.kind in ENEMY || target.kind === 'boss') target.flash = 0.14;
      if (target.hp > 0) return;
      switch (target.kind) {
        case 'cage':
          freeSpirit(target, audio);
          break;
        case 'rune':
          audio.playStoneShatter();
          if (target.wyrm.hp > 0) {
            target.wyrm.freed = true;
            rescuedWyrms += 1;
            p.fuel = Math.min(100, p.fuel + 32);
            score += 300;
            audio.playSpiritFreed();
            announce('Binding shattered. A Ghost Wyrm is free.');
          }
          break;
        case 'pylon':
          score += 450;
          audio.playStoneShatter();
          announce(pylonCount() ? 'One pylon remains.' : 'Malakor is exposed. Aim Ghost Fire upward.');
          break;
        case 'boss':
          score += 1050;
          missiles.length = 0;
          audio.playStoneShatter();
          announce('Sky-Seal shattered. SURGE up through the opening!', 7);
          break;
        default:
          score += target.score;
          break;
      }
      trails.push(point(target.x, target.y, { kind: 'blast', age: 0.45 }));
    }

    function takeDamage(amount, audio) {
      if (p.hurt > 0 || p.surge > 0) return;
      p.hp = Math.max(0, p.hp - amount);
      p.hurt = 0.62;
      visualHit = HIT_POSE_TIME;
      audio.playStoneShatter();
    }

    function nearTargets() {
      const targets = [...cages, ...runes, ...enemies];
      if (arena) targets.push(...pylons, boss);
      return targets.filter((target) => target.hp > 0 && !target.freed && Math.abs(target.y - p.y) < 460);
    }

    function fireTrace(angle, range, behind = 0) {
      const origin = point(p.x + Math.cos(angle) * 32, p.y + Math.sin(angle) * 32);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      function blocked(length) {
        const x = origin.x + length * cos;
        const y = origin.y + length * sin;
        return ledges.some((ledge) => !ledge.broken &&
          Math.abs(ledge.y - y) < 17 && Math.abs(x - ledge.x) < ledge.width / 2);
      }
      let length = range;
      for (let step = 20; step < range; step += 12) {
        if (blocked(step)) {
          length = step;
          break;
        }
      }
      return { origin, length, cos, sin, behind };
    }

    function inFire(target, trace) {
      const dx = target.x - trace.origin.x;
      const dy = target.y - trace.origin.y;
      const along = dx * trace.cos + dy * trace.sin;
      const across = Math.abs(dx * trace.sin - dy * trace.cos);
      return along >= trace.behind && along < trace.length && across <= 29 + Math.max(0, along) * 0.105;
    }

    function updateWeapons(dt, keys, audio) {
      const wantsFire = Boolean(keys.Space);
      if (!wantsFire || p.fuel >= 30) p.starved = false;
      fire = wantsFire && !p.starved && p.fuel > 0 && p.surge <= 0;
      audio.setGhostFire(fire);
      p.fuel = clamp(p.fuel + (fire ? -38 : 26) * dt, 0, 100);
      if (p.fuel <= 0) p.starved = true;
      const roar = Boolean(keys.KeyR);
      const roarNow = roar && !roarHeld && p.roarRecover <= 0;
      roarHeld = roar;
      if (roarNow) {
        p.roarRecover = 2.85;
        p.motion.roar = VAELKOR_CLIPS.roar.length;
        audio.playSoulRoar();
        trails.push(point(p.x, p.y, { kind: 'roar', age: 0.51 }));
        for (const target of nearTargets()) {
          if (distance(p, target) <= ROAR_RANGE) hit(target, target.kind === 'pylon' ? 16 : 35, audio);
        }
        for (const missile of missiles) {
          if (distance(p, missile) < ROAR_RANGE) missile.age = 0;
        }
      }
      if (fire) {
        const trace = fireTrace(p.aim, FIRE_RANGE, -40);
        for (const target of nearTargets()) {
          if (inFire(target, trace)) hit(target, 69 * dt, audio);
        }
      }
    }

    function moveDragon(dt, audio) {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) * dt / 11));
      for (let i = 0; i < steps; i += 1) {
        const oldX = p.x;
        const oldY = p.y;
        p.x = clamp(p.x + p.vx * dt / steps, 121, WORLD_W - 121);
        p.y += p.vy * dt / steps;
        if (arena) p.y = Math.min(p.y, 729);
        p.y = clamp(p.y, boss.hp <= 0 && Math.abs(p.x - EXIT_X) < 155 && p.surge > 0 ? 44 : 116, DEPTH - 22);
        for (const ledge of ledges) {
          if (ledge.broken || Math.abs(p.x - ledge.x) >= ledge.width / 2 + 28) continue;
          if (Math.abs(p.y - ledge.y) > 29) continue;
          if (ledge.brittle && p.surge > 0) {
            shatter(ledge, audio);
            if (p.vy > 0) {
              p.vy = -430;
              p.surgeAngle = -Math.PI / 2;
              p.surge = Math.max(p.surge, 0.19);
            }
          } else if (Math.abs(oldY - ledge.y) < 29) {
            p.x = oldX;
            p.vx = 0;
            p.surge = 0;
          } else {
            p.y = oldY;
            p.vy = p.vy < 0 ? 22 : -28;
            p.surge = 0;
          }
        }
      }
      if (p.surge <= 0) return;
      for (const target of nearTargets()) {
        if (p.rammed.has(target) || distance(p, target) >= 74) continue;
        p.rammed.add(target);
        hit(target, target.kind === 'pylon' ? 70 : 65, audio);
      }
    }

    function updatePlayer(dt, keys, audio) {
      const side = Number(Boolean(keys.KeyD || keys.ArrowRight)) - Number(Boolean(keys.KeyA || keys.ArrowLeft));
      const climb = Boolean(keys.KeyW || keys.ArrowUp);
      const dive = !climb && Boolean(keys.KeyS || keys.ArrowDown);
      const surge = Boolean(keys.KeyX || keys.ShiftLeft || keys.ShiftRight);
      p.flap -= dt;
      p.flapPose = Math.max(0, p.flapPose - dt);
      p.surgeRecover = Math.max(0, p.surgeRecover - dt);
      p.roarRecover = Math.max(0, p.roarRecover - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      if (side) p.facing = side;
      p.aim = side ? Math.atan2(climb ? -0.9 : dive ? 0.85 : -0.16, side) : dive ? Math.PI / 2 : -Math.PI / 2;

      if (surge && !surgeHeld && p.surgeRecover <= 0) {
        p.surge = SURGE_TIME;
        p.surgeRecover = 1.45;
        p.surgeAngle = Math.atan2(dive ? 1 : -1, side * 0.8);
        p.rammed.clear();
        audio.playBoneSurge();
      }
      surgeHeld = surge;
      if (p.surge > 0) {
        p.vx = Math.cos(p.surgeAngle) * 713;
        p.vy = Math.sin(p.surgeAngle) * 713;
        moveDragon(Math.min(dt, p.surge), audio);
        if (arena && boss.hp <= 0 && p.y <= EXIT_Y && p.vy < 0) {
          return { outcome: 'win', score, souls, rescuedWyrms };
        }
        p.surge = Math.max(0, p.surge - dt);
        if (p.surge === 0) p.vy = clamp(p.vy, -270, 300);
        return null;
      }

      p.vx = side ? clamp(p.vx + side * 780 * dt, -310, 310) : p.vx * Math.pow(0.018, dt);
      p.vy += (dive ? 880 : climb ? -168 : p.flapPose > 0 ? 136 : 290) * dt;
      if (climb && p.flap <= 0) {
        p.flap = FLAP_TIME;
        p.flapPose = 0.24;
        p.vy -= 82;
        audio.playBoneWingbeat();
      }
      p.vy = clamp(p.vy, -276, dive ? 445 : 328);
      moveDragon(dt, audio);
      return null;
    }

    function updateMotion(dt, keys) {
      const motion = p.motion;
      const side = Number(Boolean(keys.KeyD || keys.ArrowRight)) - Number(Boolean(keys.KeyA || keys.ArrowLeft));
      const climb = Boolean(keys.KeyW || keys.ArrowUp);
      const dive = !climb && Boolean(keys.KeyS || keys.ArrowDown);
      const target = p.surge > 0 ? p.surgeAngle : fire ? p.aim :
        side || climb || dive ? Math.atan2(Number(dive) - Number(climb), side) : null;
      motion.turn = Math.max(0, motion.turn - dt * 10);
      if (target !== null) {
        const heading = (Math.round(target / (Math.PI / 4)) + 8) % 8;
        if (heading !== motion.heading) {
          motion.heading = heading;
          motion.turn = fire ? 0 : 1;
        }
      }

      const recovering = motion.clip === 'fire' ||
        (motion.clip === 'fireRecovery' && motion.elapsed + dt < VAELKOR_CLIPS.fireRecovery.length);
      const pose = p.surge > 0 ? 'surge' : visualHit > 0 ? 'hit' : motion.roar > 0 ? 'roar' :
        fire ? 'fire' : recovering ? 'fireRecovery' : climb ? 'climb' : dive ? 'dive' :
          side || Math.abs(p.vx) > 30 ? 'glide' : 'idle';
      motion.roar = Math.max(0, motion.roar - dt);
      motion.elapsed = motion.clip === pose ? motion.elapsed + dt : 0;
      motion.clip = pose;
    }

    function spawnMissile(from, angle, speed, kind, damage, life, gravity = 0) {
      missiles.push(point(from.x, from.y, {
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, kind,
        damage, age: life, gravity, angle
      }));
    }

    function updateEnemies(dt, audio) {
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || Math.abs(enemy.y - p.y) > 890) continue;
        enemy.flash = Math.max(0, enemy.flash - dt);
        if (enemy.freed) {
          enemy.y -= dt * 245;
          enemy.x += Math.sin(time * 3) * 60 * dt;
          continue;
        }
        const gap = distance(enemy, p);
        if (enemy.kind === 'wraith' || enemy.kind === 'wyrm') {
          const heading = gap < 416 ? angleTo(enemy, p) + Math.sin(time * 3 + enemy.startX) * 0.34 :
            angleTo(enemy, point(enemy.startX + Math.sin(time * 1.5) * 110, enemy.startY));
          const v = enemy.kind === 'wyrm' ? 159 : 128;
          enemy.vx = Math.cos(heading) * v;
          enemy.x = clamp(enemy.x + enemy.vx * dt, 145, 975);
          enemy.y = clamp(enemy.y + Math.sin(heading) * v * dt, enemy.startY - 310, enemy.startY + 270);
          if (gap < 48) takeDamage(enemy.kind === 'wyrm' ? 17 : 11, audio);
          continue;
        }
        if (gap > 620) continue;
        enemy.elapsed -= dt;
        if (enemy.elapsed > 0) continue;
        enemy.elapsed = enemy.interval;
        const aim = angleTo(enemy, p);
        if (enemy.kind === 'catapult') {
          audio.playCatapultLaunch();
          const angle = angleTo(enemy, point(p.x, Math.min(enemy.y - 125, p.y - 150)));
          for (const offset of [-0.2, 0, 0.2]) spawnMissile(enemy, angle + offset, 345, 'skull', 13, 2.85, 184);
        } else {
          audio.playMiasmaHiss(true);
          spawnMissile(enemy, aim, 285, 'bolt', 13, 2.9);
        }
      }
    }

    function updateMissiles(dt, audio) {
      for (const shot of missiles) {
        if (shot.age <= 0) continue;
        shot.age -= dt;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.vy += shot.gravity * dt;
        if (distance(shot, p) < (shot.kind === 'debris' ? 36 : 30)) {
          takeDamage(shot.damage, audio);
          shot.age = 0;
        }
      }
      missiles = missiles.filter((shot) => shot.age > 0 && shot.x > 58 && shot.x < 1062);
    }

    function updateVents(dt, audio) {
      for (const vent of vents) {
        if (Math.abs(p.y - vent.y) > 690) continue;
        vent.clock -= dt;
        if (vent.clock <= 0) {
          vent.phase = (vent.phase + 1) % 3;
          vent.clock = [1.9, 0.9, 0.38][vent.phase];
          if (vent.phase && Math.abs(p.y - vent.y) < 470) audio.playMiasmaHiss(vent.phase === 1);
        }
        const ahead = (p.x - vent.x) * vent.direction;
        if (vent.phase === 2 && ahead > 0 && ahead < 373 && Math.abs(p.y - vent.y) < 38) takeDamage(17, audio);
      }
    }

    function updateRockfalls(dt, audio) {
      for (const fall of rockfalls) {
        if (fall.warning === 0) continue;
        if (fall.warning === null) {
          if (p.y > fall.y + 220) continue;
          fall.x = clamp(p.x + p.vx * 0.27, 230, 890);
          fall.warning = 0.77;
          audio.playMiasmaHiss(true);
          continue;
        }
        fall.warning = Math.max(0, fall.warning - dt);
        if (fall.warning > 0) continue;
        audio.playStoneShatter();
        for (const offset of [-109, 0, 115]) {
          spawnMissile(point(fall.x + offset, fall.y - Math.abs(offset) * 0.44), Math.PI / 2,
            144, 'debris', 16, 2.3, 215);
        }
      }
    }

    function beamAngle() {
      return boss.angle + (boss.cycle % 2 ? -1 : 1) * clamp((boss.attack - 0.92) * 1.52, 0, 1.4);
    }

    function updateBoss(dt, audio) {
      if (!arena || boss.hp <= 0) return;
      boss.flash = Math.max(0, boss.flash - dt);
      boss.x = EXIT_X + Math.sin(time * 1.27) * 151;
      boss.y = 241 + Math.sin(time * 2.15) * 27;
      boss.attack += dt;
      if (boss.attack <= dt + 0.000001) {
        boss.angle = clamp(angleTo(boss, p), 0.32, 2.84) + (boss.cycle % 2 ? 0.58 : -0.58);
        audio.playMiasmaHiss(true);
      }
      if (boss.attack >= 0.92 && boss.attack <= 1.73) {
        const angle = beamAngle();
        const targetAngle = angleTo(boss, p);
        const gap = Math.abs(Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle)));
        if (gap < 0.105 && distance(boss, p) < 710) takeDamage(19, audio);
      }
      if (boss.attack >= 2.83) {
        boss.attack = 0;
        boss.cycle += 1;
        const start = clamp(p.x, 240, 880);
        for (const delta of [-141, 0, 141]) {
          spawnMissile(point(start + delta, 143 + Math.abs(delta) * 0.23), Math.PI / 2, 127, 'debris', 16, 2.36, 205);
        }
        audio.playCatapultLaunch();
      }
    }

    function update(dt, keys, audio) {
      time += dt;
      noteTime -= dt;
      visualHit = Math.max(0, visualHit - dt);
      const result = updatePlayer(dt, keys, audio);
      if (result) return result;
      if (!arena && p.y < ARENA_Y) {
        arena = true;
        tide = 804;
        missiles.length = 0;
        boss.attack = 0;
        announce('Malakor is shielded. Shatter both Soul-Pylons.', 5.2);
      }
      if (!arena) {
        const covered = Math.min(dt, tideDelay);
        tideDelay -= covered;
        tide -= (dt - covered) * TIDE_SPEED;
      }

      updateWeapons(dt, keys, audio);
      if (!arena) {
        updateEnemies(dt, audio);
        updateVents(dt, audio);
        updateRockfalls(dt, audio);
      }
      updateBoss(dt, audio);
      updateMissiles(dt, audio);
      for (const trace of trails) {
        trace.age -= dt;
        if (trace.kind === 'spirit') {
          const angle = angleTo(trace, p);
          const pace = Math.min(distance(trace, p), dt * 400);
          trace.x += Math.cos(angle) * pace;
          trace.y += Math.sin(angle) * pace;
        }
      }
      trails = trails.filter((trace) => trace.age > 0);
      updateMotion(dt, keys);
      if (p.hp <= 0) return { outcome: 'loss', reason: 'integrity', score, souls };
      if (p.y + 22 >= tide) return { outcome: 'loss', reason: 'tide', score, souls };
      const offset = clamp(p.y - 390, 0, DEPTH - 630);
      camera += (offset - camera) * (1 - Math.exp(-10 * dt));
      return null;
    }

    function stamp(g, art, key, x, y, size, options = {}) {
      const im = art.getImage(key) || art.getPixelSprite(key);
      if (!im) return;
      const { angle = 0, flip = false, alpha = 1, width = size * im.width / im.height } = options;
      g.save();
      g.globalAlpha *= alpha;
      g.translate(Math.round(x), Math.round(y));
      if (angle) g.rotate(angle);
      if (flip) g.scale(-1, 1);
      g.drawImage(im, -Math.round(width / 2), -Math.round(size / 2), Math.round(width), Math.round(size));
      g.restore();
    }

    function background(g, w, h, art) {
      const bg = art.getImage('ossuaryWalls');
      g.fillStyle = '#0a0a18';
      g.fillRect(0, 0, w, h);
      if (!bg) return;
      const repeat = 636;
      const base = camera * 0.93;
      const first = Math.floor(base / repeat);
      for (let i = first; i <= first + 1; i += 1) {
        g.save();
        const y = Math.round(i * repeat - base);
        if (i % 2) {
          g.translate(0, y + repeat);
          g.scale(1, -1);
          g.drawImage(bg, 0, 0, w, repeat);
        } else {
          g.drawImage(bg, 0, y, w, repeat);
        }
        g.restore();
      }
      if (arena) {
        const glow = g.createRadialGradient(EXIT_X, 35 - camera, 3, EXIT_X, 35 - camera, 375);
        glow.addColorStop(0, boss.hp > 0 ? '#8b60cf88' : '#f6e5babb');
        glow.addColorStop(1, '#a387de00');
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);
      }
    }

    function renderTide(g, w, h, art) {
      if (tide - camera > h + 92) return;
      const gradient = g.createLinearGradient(0, tide - 22, 0, tide + 150);
      gradient.addColorStop(0, '#4b2b7800');
      gradient.addColorStop(0.21, '#61409acc');
      gradient.addColorStop(1, '#281142');
      g.fillStyle = gradient;
      g.fillRect(0, tide - 22, w, Math.max(0, h + camera - tide + 45));
      for (let i = -1; i < 8; i += 1) {
        const x = i * 174 + (time * 32) % 174;
        stamp(g, art, 'soulMiasma', x, tide + 16 + Math.sin(time * 2.4 + i) * 8, 101,
          { width: 232, flip: i % 2 === 0, alpha: 0.72 });
      }
    }

    function drawBeam(g, art, origin, angle, range, size, alpha, key = 'ghostFire') {
      for (let gap = 30; gap <= range; gap += 42) {
        const wiggle = Math.sin(gap * 0.13 - time * 41) * (size * 0.12);
        stamp(g, art, key, origin.x + Math.cos(angle) * gap, origin.y + Math.sin(angle) * gap + wiggle,
          size + gap * 0.014, { angle, alpha: alpha * (1 - gap / (range + 70) * 0.4) });
      }
    }

    function drawBoss(g, art) {
      if (!arena) return;
      for (const pylon of pylons) {
        if (pylon.hp <= 0) continue;
        if (boss.hp > 0) drawBeam(g, art, pylon, angleTo(pylon, boss), distance(pylon, boss), 15, 0.35, 'soulWisp');
        stamp(g, art, 'soulPylon', pylon.x, pylon.y - 11, 130);
      }
      if (boss.hp <= 0) {
        stamp(g, art, 'soulWisp', EXIT_X, EXIT_Y - 4, 60,
          { angle: -Math.PI / 2, alpha: 0.75 + Math.sin(time * 7) * 0.21 });
        return;
      }

      stamp(g, art, 'skySeal', EXIT_X, EXIT_Y + 27, 101, { width: 428 });
      if (boss.attack <= 1.73) {
        const live = boss.attack > 0.92;
        drawBeam(g, art, boss, beamAngle(), 710, live ? 52 : 19,
          live ? 0.88 : 0.34 + Math.sin(time * 20) * 0.13, 'soulMiasma');
      }
      if (pylonCount()) {
        const alpha = 0.51 + Math.sin(time * 7) * 0.12;
        stamp(g, art, 'ossuaryShield', boss.x + 46, boss.y - 7, 152, { alpha });
        stamp(g, art, 'ossuaryShield', boss.x - 46, boss.y - 7, 152, { alpha, flip: true });
      }
      stamp(g, art, 'bossMalakor', boss.x, boss.y - 8, 151, { alpha: boss.flash > 0 ? 0.71 : 1 });
    }

    function drawDragon(g, art) {
      const atlas = art.getImage('boneDragonG3');
      if (atlas) {
        drawVaelkorAtlas(g, art, atlas);
        return;
      }
      const climbPose = p.flapPose > 0.12 ? 'boneDragonFlap2' : 'boneDragonFlap1';
      const sprite = p.surge > 0 ? 'boneDragonSurge' : fire ? 'boneDragonFire' : climbPose;
      const flightPitch = p.surge > 0 ? clamp(p.vy / 960, -0.46, 0.75) : clamp(p.vy / 1380, -0.19, 0.24);
      const angle = fire ? p.aim - (p.facing < 0 ? Math.PI : 0) : p.facing * flightPitch;
      const alpha = p.hurt > 0 && Math.floor(time * 20) % 2 ? 0.63 : 1;
      if (fire) {
        const trace = fireTrace(p.aim, FIRE_RANGE);
        drawBeam(g, art, trace.origin, p.aim, trace.length, 43, 0.87);
      }
      stamp(g, art, sprite, p.x, p.y, p.surge > 0 ? 105 : 91, {
        flip: p.facing < 0, angle, alpha
      });
    }

    function drawVaelkorAtlas(g, art, atlas) {
      const motion = p.motion;
      const clip = VAELKOR_CLIPS[motion.clip];
      const [view, flip] = VAELKOR_VIEWS[motion.heading];
      let phase = (motion.elapsed % clip.length) / clip.length;
      if (motion.clip === 'climb') phase = 1 - clamp(p.flap / FLAP_TIME, 0, 1);
      if (motion.clip === 'hit') phase = 1 - visualHit / HIT_POSE_TIME;
      if (motion.clip === 'surge') phase = 1 - clamp(p.surge / SURGE_TIME, 0, 1);
      if (motion.clip === 'fire') {
        phase = motion.elapsed < 0.16 ? motion.elapsed / 0.28 : 0.56 + Math.sin(motion.elapsed * 31) * 0.11;
      }
      if (motion.clip === 'roar' || motion.clip === 'defeat') phase = motion.elapsed / clip.length;
      const frame = clamp(Math.floor(phase * clip.count), 0, clip.count - 1);
      const index = view * VAELKOR_VIEW_FRAMES + clip.first + frame;
      const sx = (index % VAELKOR_COLUMNS) * VAELKOR_CELL;
      const sy = Math.floor(index / VAELKOR_COLUMNS) * VAELKOR_CELL;
      const bodyScale = 1.20;
      const turnScale = 1 - motion.turn * 0.09;
      const x = Math.round(p.x);
      const y = Math.round(p.y + (motion.terminal ? motion.elapsed * 87 : 0));

      if (fire) {
        const [mx, my] = VAELKOR_MOUTHS[view][motion.clip === 'fire' ? frame : 2];
        const mouth = point(x + mx * flip * bodyScale * turnScale, y + my * bodyScale);
        const trace = fireTrace(p.aim, FIRE_RANGE);
        const tip = point(trace.origin.x + trace.cos * trace.length, trace.origin.y + trace.sin * trace.length);
        const outgoing = (tip.x - mouth.x) * trace.cos + (tip.y - mouth.y) * trace.sin;
        if (outgoing > 5) {
          drawBeam(g, art, mouth, angleTo(mouth, tip), distance(mouth, tip), 43, 0.87);
        }
        stamp(g, art, 'ghostFire', mouth.x + trace.cos * 11, mouth.y + trace.sin * 11, 25,
          { angle: p.aim, alpha: 0.77 });
      }
      const collapse = motion.terminal ? clamp(phase, 0, 1) : 0;
      const hit = motion.clip === 'hit' ? Math.sin(Math.PI * phase) : 0;
      g.save();
      g.translate(x - Math.cos(p.aim) * hit * 5, y - Math.sin(p.aim) * hit * 5);
      g.globalAlpha *= 1 - collapse * 0.90;
      g.scale(flip * bodyScale * turnScale, bodyScale);
      g.drawImage(atlas, sx, sy, VAELKOR_CELL, VAELKOR_CELL,
        -VAELKOR_CELL / 2, -VAELKOR_CELL / 2, VAELKOR_CELL, VAELKOR_CELL);
      g.restore();
    }

    function beginOutcomeAnimation(result, audio) {
      if (result.outcome !== 'loss') return 0;
      audio?.setGhostFire?.(false);
      fire = false;
      p.motion.clip = 'defeat';
      p.motion.elapsed = 0;
      p.motion.terminal = true;
      return DEFEAT_POSE_TIME;
    }

    function updateOutcomeAnimation(dt) {
      p.motion.elapsed = Math.min(DEFEAT_POSE_TIME, p.motion.elapsed + dt);
    }

    function bar(g, x, y, width, height, fraction, color) {
      g.fillStyle = '#0d101c';
      g.fillRect(x, y, width, height);
      g.fillStyle = color;
      g.fillRect(x + 1, y + 1, Math.round((width - 2) * clamp(fraction, 0, 1)), height - 2);
      g.strokeStyle = '#527587';
      g.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }

    function label(g, text, x, y, size = 16, color = '#e5e3d1', align = 'left') {
      g.fillStyle = color;
      g.textAlign = align;
      g.font = `bold ${size}px Georgia`;
      g.fillText(text, x, y);
    }

    function hud(g, w, h, art) {
      const backdrop = g.createLinearGradient(0, 0, 0, 72);
      backdrop.addColorStop(0, '#233345');
      backdrop.addColorStop(1, '#12101e');
      g.fillStyle = backdrop;
      g.fillRect(0, 0, w, 72);
      g.fillStyle = '#938372';
      g.fillRect(0, 70, w, 2);
      stamp(g, art, 'boneCrest', 43, 36, 44);
      label(g, `INTEGRITY  ${Math.ceil(p.hp)}%`, 74, 27, 14);
      bar(g, 75, 36, 126, 14, p.hp / 100, '#d5cbb8');
      label(g, 'GHOST FIRE', 235, 26, 13, '#aeeafd');
      bar(g, 235, 36, 102, 14, p.fuel / 100, '#62ccf4');
      const ability = `SURGE ${p.surgeRecover > 0 ? p.surgeRecover.toFixed(1) : 'READY'}  ·  ROAR ${p.roarRecover > 0 ? p.roarRecover.toFixed(1) : 'READY'}`;
      label(g, ability, 74, 63, 11, '#adc4d2');

      const gap = Math.round(tide - p.y);
      if (arena) {
        const title = boss.hp <= 0 ? 'SKY-SEAL OPEN' : pylonCount() ? `MALAKOR SHIELDED  ·  ${pylonCount()} PYLONS` : 'DREAD LICH MALAKOR';
        label(g, title, 560, 29, 18, '#d0edff', 'center');
        bar(g, 435, 40, 250, 9, boss.hp / 215, '#b891e4');
      } else {
        label(g, `${Math.round(p.y)} m BELOW THE SKY-SEAL`, 560, 27, 18, '#cdeaf8', 'center');
        bar(g, 435, 36, 250, 9, 1 - p.y / DEPTH, '#58bcdf');
        bar(g, 435, 48, 250, 6, 1 - gap / 875, '#a768d4');
      }
      label(g, `SOULS FREED  ${souls} / ${cages.length}`, 560, 65, 12, '#cdeaf8', 'center');
      const status = arena ? 'TIDE HELD' : tideDelay > 0 ? 'TIDE DELAYED' : gap < 180 ? 'MIASMA CRITICAL' : gap < 430 ? 'MIASMA RISING' : 'MIASMA SAFE';
      label(g, status, w - 26, 53, 14, gap < 180 && !arena ? '#ff9eaa' : '#d2b6ec', 'right');
      label(g, `GLORY  ${score}`, w - 210, 53, 14, '#d7cda6', 'right');

      if (noteTime <= 0) return;
      const touch = document.body.classList.contains('touch-active');
      const y = touch ? 91 : h - 43;
      g.font = 'bold 17px Georgia';
      const width = g.measureText(note).width + 44;
      g.fillStyle = '#121020e7';
      g.fillRect((w - width) / 2, y, width, 30);
      label(g, note, w / 2, y + 20, 17, '#d7e8f5', 'center');
    }

    function render(g, w, h, art) {
      g.imageSmoothingEnabled = false;
      background(g, w, h, art);
      const visible = (item) => item.y >= camera - 155 && item.y <= camera + h + 148;
      g.save();
      g.translate(0, -Math.round(camera));
      for (const ledge of ledges) {
        if (!ledge.broken && visible(ledge)) {
          stamp(g, art, 'boneLedge', ledge.x, ledge.y, ledge.brittle ? 49 : 64,
            { width: ledge.width, flip: ledge.x > EXIT_X, alpha: ledge.brittle ? 0.73 : 1 });
        }
      }
      for (const target of cages) {
        if (target.hp > 0 && visible(target)) stamp(g, art, 'spiritCage', target.x, target.y, 94);
      }
      for (const rune of runes) {
        if (rune.hp > 0 && visible(rune)) stamp(g, art, 'bindingRune', rune.x, rune.y, 90);
      }
      for (const vent of vents) {
        if (!visible(vent)) continue;
        stamp(g, art, 'ossuaryVent', vent.x, vent.y, 39, { flip: vent.direction < 0, alpha: vent.phase ? 1 : 0.57 });
        if (vent.phase > 0) {
          drawBeam(g, art, vent, vent.direction === 1 ? 0 : Math.PI, 373, vent.phase === 1 ? 21 : 48,
            vent.phase === 1 ? 0.26 + Math.sin(time * 18) * 0.11 : 0.79, 'soulMiasma');
        }
      }
      for (const fall of rockfalls) {
        if (!(fall.warning > 0) || !visible(fall)) continue;
        for (const offset of [-109, 0, 115]) {
          stamp(g, art, 'ossuaryStalactite', fall.x + offset, fall.y - Math.abs(offset) * 0.44, 55,
            { alpha: 0.37 + Math.sin(time * 29) * 0.22 });
        }
      }
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || !visible(enemy)) continue;
        stamp(g, art, enemy.sprite, enemy.x, enemy.y + Math.sin(enemy.x + time * 7) * (enemy.vx ? 5 : 1),
          enemy.size, { flip: enemy.vx ? enemy.vx < 0 : enemy.x > EXIT_X, alpha: enemy.freed ? 0.49 : enemy.flash > 0 ? 0.64 : 1 });
      }
      drawBoss(g, art);
      for (const shot of missiles) {
        if (!visible(shot)) continue;
        const sprite = shot.kind === 'debris' ? 'ossuaryStalactite' : shot.kind === 'skull' ? 'catapultSkull' : 'bindingBolt';
        stamp(g, art, sprite, shot.x, shot.y, shot.kind === 'debris' ? 68 : 31,
          { angle: shot.kind === 'debris' ? Math.sin(time * 6) * 0.28 : shot.angle });
      }

      for (const trace of trails) {
        if (!visible(trace)) continue;
        if (trace.kind === 'roar') {
          const radius = (1 - trace.age / 0.51) * ROAR_RANGE;
          for (let i = 0; i < 14; i += 1) {
            const angle = i * Math.PI * 2 / 14;
            stamp(g, art, 'soulWisp', trace.x + Math.cos(angle) * radius, trace.y + Math.sin(angle) * radius,
              35, { angle, alpha: trace.age * 1.75 });
          }
        } else {
          stamp(g, art, trace.kind === 'spirit' ? 'soulWisp' : 'ossuaryBurst', trace.x, trace.y,
            trace.kind === 'spirit' ? 34 : 68, { alpha: clamp(trace.age * 2.2, 0, 1) });
        }
      }
      drawDragon(g, art);
      renderTide(g, w, h, art);
      g.restore();
      if (visualHit > 0) {
        g.fillStyle = `rgba(118, 34, 73, ${visualHit * 0.59})`;
        g.fillRect(0, 72, w, h - 72);
      }
      hud(g, w, h, art);
    }

    function stopFire(audio) {
      fire = false;
      surgeHeld = roarHeld = false;
      audio.setGhostFire(false);
    }

    return {
      musicMode: MUSIC,
      init, update, render,
      beginOutcomeAnimation, updateOutcomeAnimation,
      onPause: stopFire,
      cleanup: stopFire,
      getOverlayCopy(type, result, best) {
        if (type === 'pause') {
          return {
            title: 'THE OSSUARY WAITS',
            subtitle: 'Mission IV — The Shattered Ossuary',
            noteHtml: 'Hold <b>Up</b> to climb. Use <b>Down + Surge</b> to break brittle ribs and rebound upward. <b>Ghost Fire</b> and <b>Soul Roar</b> free caged souls, which repair your bones and hold back the miasma.',
            primaryLabel: 'RESUME ASCENT'
          };
        }
        if (type === 'victory') {
          return {
            title: 'THE SKY-SEAL IS BROKEN',
            subtitle: `Mission IV Complete · Souls ${result.souls} / ${CAGES.length} · Glory ${result.score} · Best ${best}`,
            noteHtml: `Vaelkor bursts into dawn and the freed souls follow. ${result.rescuedWyrms ? `You broke the bonds of <b>${result.rescuedWyrms} Ghost Wyrm${result.rescuedWyrms === 1 ? '' : 's'}</b>. ` : ''}As the Bone Dragon turns to ash, Archmage Solon catches Kaelen’s spirit in the <b>Star-Heart Core</b>. The Titan of Bracada awaits in <b>Mission V — Thunder Above the Cloud-Spire</b>.`,
            primaryLabel: 'RETURN TO MAP'
          };
        }
        return {
          title: result.reason === 'tide' ? 'THE MIASMA TOOK VAELKOR' : 'VAELKOR’S BONES ARE SHATTERED',
          subtitle: `Mission IV · Souls ${result.souls} / ${CAGES.length} · Final Glory ${result.score}`,
          noteHtml: result.reason === 'tide' ?
            'Fly upward with <b>Up</b> and steer around the ledges. Free nearby souls to buy time against the miasma.' :
            'Use <b>Soul Roar</b> to clear projectiles and free nearby souls to recover 15 Integrity. The two Soul-Pylons shield Malakor.',
          primaryLabel: 'CLIMB AGAIN'
        };
      }
    };
  }

  window.ThanatosMissions[4] = makeController();
})();
