(() => {
  'use strict';

  window.ThanatosMissions = window.ThanatosMissions || {};

  const WORLD = { w: 2200, h: 1400 };
  const ALTAR = { x: 1130, y: 738 };
  const MAX_SCALES = 120;
  const BOSS_MAX = 500;
  const FROST_RANGE = 390;
  const DASH_TIME = 0.22;
  const FROST_INTRO = 0.14;
  const FROST_RECOVERY = 0.33;
  const ROAR_POSE_TIME = 0.56;
  const DASH_POSE_TIME = 0.57;
  const HIT_POSE_TIME = 0.50;
  const BANK_TIME = 0.52;
  const GLIDE_ENTRY_TIME = 0.54;
  const POWER_RECOVERY_TIME = 0.56;
  // Source rectangles and local pivots on the 869 × 290 flight atlas.
  const AZURE_BODY = { x: 10, y: 62, w: 356, h: 207, pivotX: 211, pivotY: 76 };
  const AZURE_NEAR_WING = { x: 376, y: 12, w: 244, h: 236, pivotX: 219, pivotY: 220 };
  const AZURE_FAR_WING = { x: 658, y: 24, w: 211, h: 228, pivotX: 36, pivotY: 213 };
  const G3_NEAR_WING = { ...AZURE_NEAR_WING, pivotX: 224, pivotY: 117 };
  const G3_FAR_WING = { ...AZURE_FAR_WING, pivotX: 181, pivotY: 119 };
  // Uneven timing gives the long wind-up, fast power stroke, and folded recovery distinct silhouettes.
  const AZURE_WINGBEAT = [
    { phase: 0, sweep: 0.16, spread: 0.89 },
    { phase: 0.22, sweep: 0.2, spread: 1 },
    { phase: 0.43, sweep: -1.61, spread: 0.96 },
    { phase: 0.56, sweep: -1.63, spread: 0.76 },
    { phase: 0.76, sweep: -0.92, spread: 0.64 },
    { phase: 1, sweep: 0.16, spread: 0.89 }
  ];
  // The wing atlas changes the membrane silhouette during the beat. The two wings
  // load and recover at slightly different times to expose the bank in profile.
  const AZURE_PILOT_WINGS = [
    [6, 5], [0, 5], [0, 6], [1, 6], [1, 0], [1, 1], [2, 1], [2, 4],
    [4, 4], [4, 2], [5, 4], [5, 7], [6, 7], [6, 6], [6, 0], [6, 4]
  ];
  const AZURE_PILOT_CELL = { w: 224, h: 188 };
  const AZURE_PILOT_BODY_SCALE = 0.84;
  const AZURE_PILOT_FROST_MOUTH = [49, -18];
  // These pivots keep the chest fixed while the action silhouette changes around it.
  const AZURE_ACTIONS = {
    azureDash: { width: 177, height: 56, anchorX: 0.63, anchorY: 0.61 },
    azureRoar: { width: 150, height: 113, anchorX: 0.5, anchorY: 0.61 },
    azureFrost: { width: 150, height: 112, anchorX: 0.49, anchorY: 0.53 },
    azureFly1: { width: 150, height: 131, anchorX: 0.57, anchorY: 0.62 }
  };
  const AZURE_G3_VIEWS = [
    // Atlas row, mirror, wing spread, wing lift, and mouth relative to the chest.
    [0, 1, 1, 0, 55, -6],
    [1, 1, 1.03, 1, 62, 2],
    [2, 1, 1.24, 5, 2, -9],
    [1, -1, 1.03, 1, 62, 2],
    [0, -1, 1, 0, 55, -6],
    [3, -1, 1.10, -4, 40, -33],
    [4, 1, 1.16, -7, 0, -31],
    [3, 1, 1.10, -4, 40, -33]
  ];
  const HEADING_STEP = Math.PI / 4;
  const TURN_STEPS = 24;
  const TURN_STEP = 2 * Math.PI / TURN_STEPS;
  const TURN_CELL = { w: 192, h: 176, pivotX: 106, pivotY: 90 };
  // East half, from back to front. Each new cell has its own silhouette and
  // registered mouth position. The remaining major views use the flight rig.
  const AZURE_TURN_BRIDGES = [
    [9, 1.16, -7, 0, -29],
    [7, 1.15, -6, 19, -36], [6, 1.12, -5, 23, -42],
    null,
    [5, 1.07, -2, 35, -35], [4, 1.03, -1, 50, -18],
    null,
    [0, 1.01, 0, 55, -8], [1, 1.03, 1, 54, -6],
    null,
    [2, 1.12, 3, 35, -14], [3, 1.20, 4, 15, -16],
    [8, 1.24, 5, 0, -11]
  ];
  // The authored back and steep views expose different shoulder positions.
  const AZURE_SHOULDERS = {
    0: [-14, -5, 14, -5],
    1: [-13, -1, 13, -5],
    2: [-12, -10, 7, -10],
    3: [-8, -7, 8, -13],
    11: [-15, -4, 14, -2]
  };
  const DEFEAT_FALL = 0.79;
  const DEFEAT_LENGTH = 0.94;
  const easeInOut = (n) => n * n * (3 - 2 * n);
  const PHASES = ['BLACK DREAD-DRAGON', 'ECHOES OF GUILT', 'THANATOS UNBOUND'];
  const ANCHORS = [[853, 585], [1370, 568], [1173, 1000]];
  const BANNERS = [[460, 379, -95], [600, 1095, 26], [1750, 1040, 0]];
  const EPILOGUE = [
    ['THE CROWN DISSOLVES', 'Warm gold falls over the caldera. The stolen memories rise with the dawn.'],
    ['THE LOST FIND PEACE', 'Carmilla smiles in the sunlight. A tiny brass locket drifts back to earth.'],
    ['KAELEN RETURNS', 'Isolde and the Rampart Elders kneel. Kaelen awakens as Saphirion flies into the clear sky.']
  ];
  const ENEMIES = {
    wyvern: { sprite: 'blackScaleWyrm', hp: 41, speed: 214, size: 67, glory: 145, radius: 33 },
    manticore: { sprite: 'nighonManticore', hp: 53, speed: 178, size: 74, glory: 180, radius: 35 },
    priest: { sprite: 'dreadPriest', hp: 53, speed: 74, size: 84, glory: 155, radius: 37 },
    shadowWyvern: { sprite: 'shadowWyvern', hp: 53, speed: 184, size: 94, glory: 240, radius: 44, echo: true },
    shadowBone: { sprite: 'shadowBoneDragon', hp: 64, speed: 171, size: 105, glory: 310, radius: 48, echo: true }
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const at = (x, y, data = {}) => ({ x, y, ...data });
  const shift = (p, angle, d) => at(p.x + Math.cos(angle) * d, p.y + Math.sin(angle) * d);
  const hitBox = (unit) => unit.kind === 'boss' ? 83 : unit.radius;

  function makeEnemy(kind, x, y, cooldown) {
    return at(x, y, { ...ENEMIES[kind], kind, cooldown, stun: 0, chilled: 0, face: Math.PI });
  }

  function makeController() {
    let p, boss, anchors, escorts, bolts, lines, effects, camera, pointer, viewport;
    let time, phase, score, message, messageTime, epilogueAge, shake, won;

    function init(_ctx, w, h) {
      viewport = { w, h };
      p = at(770, 815, {
        hp: MAX_SCALES, frost: 100, resonance: 0, vx: 0, vy: 0, face: -0.23,
        course: -0.23, roar: 0, dash: 0, dashCharge: 0, roarHeld: false, dashHeld: false,
        dashAngle: 0, dashHits: new Set(), hurt: 0, firing: false, exhausted: false, roarPose: 0,
        wingPhase: 0, idlePhase: 0, glide: 0, bank: 0, flightSide: 1,
        visualHeading: 0, headingIndex: 0, frostBlend: 0, fall: 0, defeated: false,
        frostAge: 0, frostRelease: FROST_RECOVERY, frostReleaseStart: 0,
        dashPose: 0, bankPose: 0, bankSide: 1, banking: false,
        glideAge: 0, poweredRecovery: 0, gliding: false, powerBlend: 0
      });
      boss = at(1260, 650, {
        kind: 'boss', hp: BOSS_MAX, face: Math.PI, cooldown: 1.55, cast: null,
        rush: 0, rushAngle: 0, cycle: 0, chilled: 0, flash: 0, stun: 0
      });
      anchors = ANCHORS.map(([x, y]) => at(x, y, { kind: 'anchor', hp: 77, radius: 34 }));
      escorts = [];
      bolts = [];
      lines = [];
      effects = [];
      phase = 1;
      score = time = shake = 0;
      epilogueAge = -1;
      pointer = null;
      won = false;
      camera = at(p.x - w / 2, p.y - h / 2);
      announce('Close on the Dread-Dragon. SKY DASH through its charge.', 5);
    }

    function announce(text, seconds = 3.7) {
      message = text;
      messageTime = seconds;
    }

    function effect(kind, position, size, life, angle = 0) {
      effects.push(at(position.x, position.y, { kind, size, life, total: life, angle }));
    }

    function targets() {
      const living = escorts.filter((unit) => unit.hp > 0);
      if (phase === 2) living.push(...anchors.filter((unit) => unit.hp > 0));
      living.push(boss);
      return living;
    }

    function remainingAnchors() {
      return anchors.filter((anchor) => anchor.hp > 0).length;
    }

    function addResonance(amount) {
      p.resonance = Math.min(100, p.resonance + amount);
    }

    function spawnEscort(kind, x, y, cooldown = 1.1) {
      escorts.push(makeEnemy(kind, x, y, cooldown));
    }

    function changePhase(next, audio) {
      phase = next;
      boss.cast = null;
      boss.rush = 0;
      boss.stun = 0.55;
      boss.cycle = 0;
      boss.cooldown = 1.3;
      bolts.length = 0;
      lines.length = 0;
      shake = 13;
      audio.playCrownShatter();
      effect('ring', boss, 370, 0.88);
      if (phase === 2) {
        spawnEscort('shadowWyvern', 843, 704);
        spawnEscort('shadowBone', 1430, 792);
        spawnEscort('priest', 1460, 563, 1.6);
        spawnEscort('wyvern', 1660, 915);
        announce('FEAR ROAR dispels the echoes. Break the three Altar Anchors.', 6);
      } else {
        spawnEscort('manticore', 1595, 748);
        spawnEscort('wyvern', 978, 945, 1.6);
        announce('THANATOS UNBOUND  ·  Dodge the lightning. Interrupt his casts with FEAR ROAR.', 6);
      }
    }

    function hit(unit, damage, source, audio) {
      if (unit.hp <= 0 || won) return;
      if (unit === boss) {
        const shielded = phase === 2 && remainingAnchors() > 0;
        const lowerBound = phase === 1 ? 300 : shielded ? 126 : phase === 2 ? 125 : 0;
        const dealt = Math.min(unit.hp - lowerBound, damage * (shielded ? 0.1 : 1));
        unit.hp -= dealt;
        unit.flash = source === 'frost' ? 0.07 : 0.22;
        if (source === 'frost') unit.chilled = 0.65;
        if (!shielded && source !== 'nova') addResonance(dealt * 0.64);
        if (phase === 1 && unit.hp <= 300) changePhase(2, audio);
        else if (phase === 2 && unit.hp <= 125 && !shielded) changePhase(3, audio);
        else if (phase === 3 && unit.hp <= 0) {
          score += 3000 + Math.floor(p.hp) * 5;
          won = true;
        }
        return;
      }
      if (unit.echo && source !== 'roar' && source !== 'nova') damage *= 0.18;
      const dealt = Math.min(unit.hp, damage);
      unit.hp -= dealt;
      if (source !== 'nova') addResonance(dealt * 0.35);
      if (source === 'frost' && unit.kind !== 'anchor') unit.chilled = 0.65;
      if (unit.hp > 0) return;
      effect(unit.kind === 'anchor' ? 'ring' : 'frost', unit, unit.kind === 'anchor' ? 184 : 98, 0.58, time);
      if (unit.kind === 'anchor') {
        addResonance(25);
        score += 480;
        audio.playCrownShatter();
        const left = remainingAnchors();
        announce(left ? `${left} Altar Anchor${left === 1 ? '' : 's'} remain${left === 1 ? 's' : ''}.` :
          'The anchors are shattered. Thanatos is exposed.');
      } else {
        score += unit.glory;
      }
    }

    function hurt(amount, audio) {
      if (p.dash > 0 || p.hurt > 0 || won) return;
      p.hp = Math.max(0, p.hp - amount);
      p.hurt = 0.58;
      shake = 7;
      audio.playDreadDragonRoar(true);
    }

    function aim(inputX, inputY) {
      if (pointer) {
        const x = pointer.x + camera.x;
        const y = pointer.y + camera.y;
        if (Math.hypot(x - p.x, y - p.y) > 24) return Math.atan2(y - p.y, x - p.x);
      }
      const moving = inputX || inputY;
      const heading = moving ? Math.atan2(inputY, inputX) : p.course;
      let bestAngle = heading;
      let best = Infinity;
      for (const target of targets()) {
        const distance = gap(target, p);
        const angle = angleTo(p, target);
        if (distance > FROST_RANGE + 42 || (moving && Math.abs(wrap(angle - heading)) >= Math.PI / 6)) continue;
        const priority = target.kind === 'anchor' ? 135 : target === boss ? 86 : distance < 90 ? 72 : 0;
        if (distance - priority < best) {
          best = distance - priority;
          bestAngle = angle;
        }
      }
      return bestAngle;
    }

    function bound(unit) {
      unit.x = clamp(unit.x, 67, WORLD.w - 67);
      unit.y = clamp(unit.y, 105, WORLD.h - 54);
    }

    function updateFlight(dt, keys, audio) {
      const x = Number(Boolean(keys.KeyD || keys.ArrowRight)) - Number(Boolean(keys.KeyA || keys.ArrowLeft));
      const y = Number(Boolean(keys.KeyS || keys.ArrowDown)) - Number(Boolean(keys.KeyW || keys.ArrowUp));
      const length = Math.hypot(x, y);
      if (length) p.course = Math.atan2(y, x);
      p.face = aim(x, y);
      p.dashCharge = Math.max(0, p.dashCharge - dt);
      const wantsDash = Boolean(keys.KeyR);
      if (wantsDash && !p.dashHeld && p.dashCharge <= 0) {
        p.dash = DASH_TIME;
        p.dashPose = DASH_POSE_TIME;
        p.dashCharge = 1.48;
        p.dashAngle = length ? p.course : p.face;
        p.dashHits.clear();
        audio.playSkyDash();
      }
      p.dashHeld = wantsDash;
      if (p.dash > 0) {
        p.vx = Math.cos(p.dashAngle) * 820;
        p.vy = Math.sin(p.dashAngle) * 820;
        p.face = p.dashAngle;
        effect('frost', shift(p, p.face, -23), 60, 0.27, p.face);
      } else {
        const damping = Math.exp(-dt * (length ? 1.17 : 4.1));
        p.vx = p.vx * damping + (length ? x / length * 820 * dt : 0);
        p.vy = p.vy * damping + (length ? y / length * 820 * dt : 0);
        const scale = Math.min(1, 370 / (Math.hypot(p.vx, p.vy) || 1));
        p.vx *= scale;
        p.vy *= scale;
      }
      const flightTime = p.dash > 0 ? Math.min(dt, p.dash) : dt;
      p.x += p.vx * flightTime;
      p.y += p.vy * flightTime;
      bound(p);
      if (p.dash > 0) {
        for (const unit of targets()) {
          if (p.dashHits.has(unit) || gap(p, unit) >= hitBox(unit) + 42) continue;
          p.dashHits.add(unit);
          hit(unit, 26, 'dash', audio);
        }
      }
      return length > 0;
    }

    function fireFrost(dt, keys, audio) {
      if (!keys.Space || p.frost >= 25) p.exhausted = false;
      const wasFiring = p.firing;
      p.firing = Boolean(keys.Space) && !won && p.frost > 0 && !p.exhausted && p.dash <= 0;
      if (p.firing) {
        p.frostAge = wasFiring ? p.frostAge + dt : 0;
        p.frostRelease = 0;
      } else if (wasFiring) {
        p.frostReleaseStart = frostAttackProgress();
      } else {
        p.frostRelease = Math.min(FROST_RECOVERY, p.frostRelease + dt);
      }
      audio.setStarFrost(p.firing);
      p.frost = clamp(p.frost + (p.firing ? -29 : 25) * dt, 0, 100);
      if (p.frost <= 0) p.exhausted = true;
      if (!p.firing) return;
      const origin = shift(p, p.face, 33);
      const dx = Math.cos(p.face);
      const dy = Math.sin(p.face);
      for (const unit of targets()) {
        const x = unit.x - origin.x;
        const y = unit.y - origin.y;
        const ahead = x * dx + y * dy;
        const lateral = Math.abs(x * dy - y * dx);
        if (ahead > -Math.min(54, hitBox(unit)) && ahead < FROST_RANGE + hitBox(unit) * 0.55 &&
            lateral < 16 + Math.max(0, ahead) * 0.155 + hitBox(unit) * 0.6) {
          hit(unit, 92 * dt, 'frost', audio);
        }
      }
    }

    function updateFlightMotion(dt, audio, steering) {
      const speed = Math.hypot(p.vx, p.vy);
      const hovering = speed < 35;
      let heading = p.face;
      if (!p.firing && p.dash <= 0) {
        if (steering) heading = p.course;
        else if (!hovering) heading = Math.atan2(p.vy, p.vx);
      }
      const look = Math.cos(heading);
      // Keep one silhouette as the heading crosses directly above or below the dragon.
      if (Math.abs(look) > 0.14) p.flightSide = Math.sign(look);
      const flightAngle = Math.atan2(p.vy, p.vx);
      const glide = speed > 266 && (!steering || Math.abs(wrap(p.course - flightAngle)) < 0.28);
      const rise = Math.sin(heading);
      const sideways = (p.vy * look - p.vx * rise) / 370;
      const bank = clamp(rise * 0.39 + sideways * 0.15, -0.48, 0.48);
      const settle = 1 - Math.exp(-dt * 9);
      p.glide += (Number(glide) - p.glide) * settle;
      p.bank += (bank - p.bank) * settle;
      p.powerBlend += (clamp((speed - 15) / 85, 0, 1) - p.powerBlend) * settle;
      // The entry and exit each get a complete clip. Hysteresis keeps the
      // wingtips from alternating between glide and power near the threshold.
      const gliding = !p.firing && p.dash <= 0 && p.glide > (p.gliding ? 0.48 : 0.78);
      if (gliding) p.glideAge = p.gliding ? p.glideAge + dt : 0;
      p.poweredRecovery = gliding ? 0 : p.gliding ? POWER_RECOVERY_TIME : Math.max(0, p.poweredRecovery - dt);
      if (p.poweredRecovery > dt && !gliding) p.wingPhase = 0;
      p.gliding = gliding;
      const oldPhase = p.wingPhase;
      p.wingPhase = (p.wingPhase + dt * (hovering ? 0.88 : 1.62 + Math.max(0, -p.vy) / 540)) % 1;
      p.idlePhase = (p.idlePhase + dt * 0.79) % 1;
      p.frostBlend += (Number(p.firing) - p.frostBlend) * (1 - Math.exp(-dt * (p.firing ? 42 : 13)));
      const headingError = wrap(heading - p.visualHeading);
      const banking = Math.abs(headingError) > (p.banking ? 0.22 : 0.45);
      if (banking && !p.banking && !p.firing && p.dash <= 0) {
        p.bankPose = BANK_TIME;
        p.bankSide = Math.sign(headingError);
      } else {
        p.bankPose = Math.max(0, p.bankPose - dt);
      }
      p.banking = banking;
      // The combat vector changes on input. Only the artwork travels the arc.
      const turnStep = dt * (p.firing || p.dash > 0 ? 4.6 : 4) * Math.PI;
      p.visualHeading = wrap(p.visualHeading + clamp(headingError, -turnStep, turnStep));
      if (Math.abs(wrap(p.visualHeading - p.headingIndex * HEADING_STEP)) > HEADING_STEP * 0.59) {
        p.headingIndex = (Math.round(p.visualHeading / HEADING_STEP) + 8) % 8;
      }
      const wingCatch = hovering ? 6 / 14 : 9 / 20;
      if (oldPhase < wingCatch && p.wingPhase >= wingCatch && !gliding && p.poweredRecovery <= 0 &&
          p.bankPose < BANK_TIME * 0.25 && !p.firing && p.frostRelease >= FROST_RECOVERY &&
          p.roarPose <= 0 && p.dashPose <= 0 && p.hurt < 0.4) {
        audio.playAzureWingbeat?.(hovering);
      }
    }

    function roar(keys, audio) {
      const pressed = Boolean(keys.KeyX || keys.ShiftLeft || keys.ShiftRight);
      const active = pressed && !p.roarHeld && p.roar <= 0 && !won;
      p.roarHeld = pressed;
      if (!active) return;
      const nova = p.resonance >= 100;
      const range = nova ? 433 : 292;
      if (nova) {
        p.resonance = 0;
        announce('MEMORY NOVA  ·  The six vessels answer Saphirion.', 2.7);
      }
      const source = nova ? 'nova' : 'roar';
      p.roar = 4.5;
      p.roarPose = ROAR_POSE_TIME;
      effect(source, p, range, nova ? 0.75 : 0.51);
      audio.playAzureRoar(nova);
      shake = Math.max(shake, nova ? 11 : 4);
      for (const unit of targets()) {
        if (gap(unit, p) > range) continue;
        if (unit === boss) {
          if (boss.cast) {
            boss.cast = null;
            boss.cooldown = Math.max(boss.cooldown, 0.88);
          }
          boss.rush = 0;
          boss.stun = nova ? 1.0 : 0.57;
        } else if (unit.kind !== 'anchor') {
          unit.stun = 1.8;
        }
        const damage = unit.echo ? unit.hp : nova ? 115 : unit.kind === 'anchor' ? 39 : 33;
        hit(unit, damage, source, audio);
      }
      for (const bolt of bolts) {
        if (bolt.friendly || gap(bolt, p) > range) continue;
        const angle = gap(boss, bolt) > 1 ? angleTo(bolt, boss) : angleTo(p, bolt);
        bolt.vx = Math.cos(angle) * 557;
        bolt.vy = Math.sin(angle) * 557;
        bolt.friendly = true;
        bolt.life = 1.65;
      }
    }

    function missile(position, angle, speed, kind, damage, life = 4.1) {
      bolts.push(at(position.x, position.y, {
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, kind, damage, life, friendly: false
      }));
    }

    function spread(unit, offsets, speed, kind, damage, angle = angleTo(unit, p)) {
      for (const offset of offsets) missile(shift(unit, angle + offset, 21), angle + offset, speed, kind, damage);
    }

    function moveToward(unit, target, distance) {
      const angle = angleTo(unit, target);
      unit.face = angle;
      const length = Math.min(distance, gap(unit, target));
      unit.x += Math.cos(angle) * length;
      unit.y += Math.sin(angle) * length;
      bound(unit);
    }

    function updateEscorts(dt, audio) {
      for (const unit of escorts) {
        if (unit.hp <= 0) continue;
        unit.chilled = Math.max(0, unit.chilled - dt);
        unit.stun = Math.max(0, unit.stun - dt);
        if (unit.stun > 0) continue;
        unit.cooldown -= dt;
        const distance = gap(unit, p);
        const speed = unit.speed * (unit.chilled ? 0.58 : 1);
        if (unit.kind === 'priest') {
          if (unit.cooldown <= 0 && distance < 575) {
            unit.cooldown = 2.25;
            spread(unit, [-0.2, 0, 0.2], 284, 'ember', 8);
          }
          continue;
        }
        const heading = angleTo(unit, p) + Math.sin(time * 4 + unit.x * 0.012) * 0.15;
        moveToward(unit, shift(unit, heading, Math.max(1, distance)), speed * dt);
        if (unit.cooldown <= 0 && distance <= (unit.echo ? 290 : 405)) {
          unit.cooldown = unit.echo ? 3.0 : 2.48;
          spread(unit, unit.echo ? [0] : [-0.14, 0.14], 260, 'ember', unit.echo ? 9 : 7);
        }
        if (distance < unit.radius + 24) hurt(unit.echo ? 12 : 8, audio);
      }
      escorts = escorts.filter((unit) => unit.hp > 0);
    }

    function makeGrid() {
      const x = clamp(p.x + p.vx * 0.20, 185, WORLD.w - 185);
      const y = clamp(p.y + p.vy * 0.20, 175, WORLD.h - 175);
      return [
        { axis: 'x', value: x }, { axis: 'x', value: x + (x > ALTAR.x ? -318 : 318) },
        { axis: 'y', value: y }
      ];
    }

    function updateBoss(dt, audio) {
      boss.chilled = Math.max(0, boss.chilled - dt);
      boss.flash = Math.max(0, boss.flash - dt);
      boss.stun = Math.max(0, boss.stun - dt);
      boss.cooldown -= dt;
      if (boss.stun > 0) return;

      if (boss.rush > 0) {
        const advance = Math.min(boss.rush, dt) * (boss.chilled ? 354 : 510);
        boss.x += Math.cos(boss.rushAngle) * advance;
        boss.y += Math.sin(boss.rushAngle) * advance;
        boss.rush -= dt;
        bound(boss);
        if (gap(boss, p) < 106) hurt(24, audio);
        if (boss.rush <= 0) boss.cooldown = 1.12;
        return;
      }

      if (boss.cast) {
        boss.cast.time -= dt;
        if (boss.cast.time > 0) return;
        const cast = boss.cast;
        boss.cast = null;
        if (cast.kind === 'rush') {
          boss.rushAngle = boss.face = cast.angle;
          boss.rush = 0.62;
          spread(boss, [-0.46, -0.23, 0, 0.23, 0.46], 330, 'hellfire', 13, cast.angle);
          audio.playDreadDragonRoar();
        } else if (cast.kind === 'grid') {
          lines.push(...cast.grid.map((line) => ({ ...line, life: 0.52 })));
          audio.playRedLightning();
          boss.cooldown = 1.9;
        } else {
          const ring = cast.kind === 'spiral' ? 9 : 5;
          for (let i = 0; i < ring; i++) {
            const angle = ring === 9 ? cast.angle + i * Math.PI * 2 / ring : cast.angle + (i - 2) * 0.26;
            missile(shift(boss, angle, 47), angle, ring === 9 ? 182 + i % 3 * 51 : 305, 'soul', 11);
          }
          audio.playRedLightning();
          boss.cooldown = cast.kind === 'spiral' ? 1.48 : 1.32;
        }
        return;
      }

      const slowed = boss.chilled ? 0.65 : 1;
      if (phase === 1) {
        const pressure = gap(boss, p);
        if (pressure > 280) moveToward(boss, p, dt * 225 * slowed);
        else {
          const angle = angleTo(boss, p) + (pressure < 197 ? Math.PI * 0.78 : Math.PI * 0.47);
          moveToward(boss, shift(boss, angle, 200), dt * 173 * slowed);
        }
      } else {
        const orbit = phase === 2 ? 242 : 166;
        const route = at(ALTAR.x + Math.cos(time * 0.91) * orbit,
          ALTAR.y + Math.sin(time * 0.91) * orbit * 0.52);
        moveToward(boss, route, dt * (phase === 2 ? 188 : 160) * slowed);
      }

      if (boss.cooldown > 0) return;
      const angle = angleTo(boss, p);
      if (phase === 1) {
        boss.cast = { kind: 'rush', time: 0.91, angle };
        if (boss.cycle++ === 1) spawnEscort('wyvern', 1540, 454);
        audio.playDreadDragonRoar();
      } else if (phase === 2) {
        boss.cast = { kind: 'volley', time: 0.68, angle };
      } else if (boss.cycle++ % 2 === 0) {
        boss.cast = { kind: 'grid', time: 1.10, grid: makeGrid() };
        audio.playRedLightning(true);
      } else {
        boss.cast = { kind: 'spiral', time: 0.72, angle };
      }
    }

    function updateHazards(dt, audio) {
      for (const bolt of bolts) {
        if (bolt.life <= 0) continue;
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.life -= dt;
        if (bolt.friendly && gap(bolt, boss) < hitBox(boss)) {
          bolt.life = 0;
          hit(boss, 16, 'reflect', audio);
        } else if (!bolt.friendly && gap(bolt, p) < (bolt.kind === 'hellfire' ? 37 : 28)) {
          bolt.life = 0;
          hurt(bolt.damage, audio);
        }
      }
      bolts = bolts.filter((bolt) => bolt.life > 0 && bolt.x > 15 && bolt.x < WORLD.w - 15 &&
        bolt.y > 85 && bolt.y < WORLD.h - 14);
      for (const line of lines) {
        line.life -= dt;
        if (line.life > 0 && Math.abs(p[line.axis] - line.value) < 47) hurt(23, audio);
      }
      lines = lines.filter((line) => line.life > 0);
    }

    function update(dt, keys, audio) {
      time += dt;
      messageTime -= dt;
      shake = Math.max(0, shake - 34 * dt);
      p.hurt = Math.max(0, p.hurt - dt);
      p.roar = Math.max(0, p.roar - dt);
      p.roarPose = Math.max(0, p.roarPose - dt);
      p.dashPose = Math.max(0, p.dashPose - dt);
      const steering = updateFlight(dt, keys, audio);
      roar(keys, audio);
      fireFrost(dt, keys, audio);
      updateFlightMotion(dt, audio, steering);
      if (won) return { outcome: 'win', score };
      updateEscorts(dt, audio);
      updateBoss(dt, audio);
      updateHazards(dt, audio);
      if (won) return { outcome: 'win', score };
      if (p.hp <= 0) return { outcome: 'loss', score };
      p.dash = Math.max(0, p.dash - dt);
      for (const fx of effects) fx.life -= dt;
      effects = effects.filter((fx) => fx.life > 0);
      const smoothing = 1 - Math.exp(-9.2 * dt);
      camera.x += (clamp(p.x - viewport.w / 2, 0, WORLD.w - viewport.w) - camera.x) * smoothing;
      camera.y += (clamp(p.y - viewport.h * 0.56, 0, WORLD.h - viewport.h) - camera.y) * smoothing;
      return null;
    }

    function sprite(g, art, key, position, height, options = {}) {
      const im = art.getImage(key);
      if (!im) return;
      const { angle = 0, flip = false, alpha = 1, width = height * im.width / im.height } = options;
      g.save();
      g.globalAlpha *= alpha;
      g.translate(Math.round(position.x), Math.round(position.y));
      if (angle) g.rotate(angle);
      if (flip) g.scale(-1, 1);
      g.drawImage(im, -Math.round(width / 2), -Math.round(height / 2), Math.round(width), Math.round(height));
      g.restore();
    }

    function beam(g, art, from, to, key, height, alpha) {
      const d = gap(from, to);
      const angle = angleTo(from, to);
      const pieces = Math.max(1, Math.ceil(d / 145));
      for (let index = 0; index < pieces; index++) {
        const center = shift(from, angle, (index + 0.5) / pieces * d);
        sprite(g, art, key, center, height * (1 - index / pieces * 0.25),
          { width: d / pieces + 19, angle, alpha });
      }
    }

    function drawAzurePart(g, atlas, part, scale) {
      g.drawImage(atlas, part.x, part.y, part.w, part.h,
        -part.pivotX * scale, -part.pivotY * scale, part.w * scale, part.h * scale);
    }

    function drawAzureWing(g, atlas, part, x, y, sweep, spread, scale, mirror = false) {
      g.save();
      g.translate(x, y);
      g.rotate(sweep);
      g.scale(mirror ? -1 : 1, spread);
      drawAzurePart(g, atlas, part, scale);
      g.restore();
    }

    function drawAzureFlight(g, atlas) {
      const index = AZURE_WINGBEAT.findIndex(({ phase }) => phase > p.wingPhase);
      const before = AZURE_WINGBEAT[index - 1];
      const after = AZURE_WINGBEAT[index];
      const fraction = (p.wingPhase - before.phase) / (after.phase - before.phase);
      const ease = fraction * fraction * (3 - 2 * fraction);
      const sweep = (before.sweep + (after.sweep - before.sweep) * ease) * (1 - p.glide) - p.glide * 0.67;
      const spread = (before.spread + (after.spread - before.spread) * ease) * (1 - p.glide) + p.glide * 0.86;
      const bank = p.bank * p.flightSide;
      drawAzureWing(g, atlas, AZURE_FAR_WING, 8, -11, -sweep * 0.79 - bank * 0.3,
        spread * (0.89 - bank * 0.2), 0.37);
      drawAzurePart(g, atlas, AZURE_BODY, 0.42);
      drawAzureWing(g, atlas, AZURE_NEAR_WING, -9, -7, sweep + bank * 0.3,
        spread * (1 + bank * 0.2), 0.42);
    }

    function azurePose(turns) {
      let view = AZURE_G3_VIEWS[p.headingIndex];
      let center = p.headingIndex * HEADING_STEP;
      let turnFrame = null;
      let direction = null;
      if (turns) {
        const bucket = (Math.round(p.visualHeading / TURN_STEP) + TURN_STEPS) % TURN_STEPS;
        center = bucket * TURN_STEP;
        const mirrored = bucket > 6 && bucket < 18;
        const signed = mirrored ? 12 - bucket : bucket > 12 ? bucket - TURN_STEPS : bucket;
        direction = signed + 6;
        const bridge = AZURE_TURN_BRIDGES[signed + 6];
        if (bridge) {
          const [frame, breadth, lift, mouthX, mouthY] = bridge;
          view = [null, mirrored ? -1 : 1, breadth, lift, mouthX, mouthY];
          turnFrame = frame;
        } else {
          view = AZURE_G3_VIEWS[bucket / 3];
        }
      }
      const idle = Math.hypot(p.vx, p.vy) < 35 && p.dash <= 0 && p.frostBlend < 0.12 && p.roarPose <= 0;
      const dash = p.dash > 0 ? Math.sin(Math.PI * (1 - p.dash / DASH_TIME)) : 0;
      const roar = p.roarPose > 0 ? Math.sin(Math.PI * (1 - p.roarPose / ROAR_POSE_TIME)) : 0;
      const recoil = easeInOut(clamp((p.hurt - 0.31) / 0.27, 0, 1));
      const fall = easeInOut(clamp(p.fall / DEFEAT_FALL, 0, 1));
      const angle = clamp(wrap(p.visualHeading - center), -0.35, 0.35) * 0.42 +
        p.bank * 0.31 + view[1] * (roar * -0.08 + recoil * 0.15 + fall * 0.69);
      const axial = turns ? easeInOut(clamp((Math.abs(Math.sin(p.visualHeading)) - 0.68) / 0.32, 0, 1))
        : Number(view[0] === 2 || view[0] === 4);
      return {
        view, center, direction, turnFrame, axial, idle, dash, roar, recoil, fall, angle,
        x: Math.round(p.x - Math.cos(p.face) * recoil * 7),
        y: Math.round(p.y + fall * 73 - recoil * 5 + (idle ? Math.sin(p.idlePhase * Math.PI * 2) * 2 : 0)),
        scaleX: 1 + dash * 0.16 + p.frostBlend * 0.035 - recoil * 0.08 - fall * 0.12,
        scaleY: 1 - dash * 0.17 + roar * 0.073 - fall * 0.11
      };
    }

    function drawAzurePilotCell(g, atlas, frame, rowOffset, pivotX, pivotY, scale) {
      const { w, h } = AZURE_PILOT_CELL;
      g.drawImage(atlas, frame % 4 * w, (rowOffset + Math.floor(frame / 4)) * h, w, h,
        -pivotX * scale, -pivotY * scale, w * scale, h * scale);
    }

    function frostAttackProgress() {
      const intro = Math.min(1, p.frostAge / FROST_INTRO);
      const sustain = Math.max(0, p.frostAge - FROST_INTRO);
      return (intro * 4 + Math.sin(sustain * 7.8) ** 2 * 6) / 15;
    }

    function glideKey(mix, sample, base) {
      const age = p.glideAge;
      const progress = age < GLIDE_ENTRY_TIME ? age / GLIDE_ENTRY_TIME * 0.76 :
        0.88 - Math.cos((age - GLIDE_ENTRY_TIME) * 6) * 0.12;
      return mix(base, sample('glide', progress), easeInOut(clamp(age / 0.16, 0, 1)));
    }

    function azureMotion(art) {
      const motion = window.SaphirionMotion;
      const parts = window.SaphirionParts;
      const atlas = art.getImage('azureG5Motion');
      const wings = art.getImage('azureG5Pilot');
      if (!atlas || !wings || !motion || !parts) return null;

      const pose = azurePose(true);
      const { mix, sample } = motion;
      let key = mix(sample('hover', p.wingPhase), sample('flight', p.wingPhase), p.powerBlend);
      if (p.gliding) {
        key = glideKey(mix, sample, key);
      } else if (p.poweredRecovery > 0) {
        const progress = 1 - p.poweredRecovery / POWER_RECOVERY_TIME;
        const exit = mix(glideKey(mix, sample, key), sample('recovery', progress), easeInOut(clamp(progress * 8, 0, 1)));
        key = mix(key, exit, 1 - easeInOut(clamp((progress - 0.76) * 4.2, 0, 1)));
      }
      if (p.bankPose > 0) {
        const progress = 1 - p.bankPose / BANK_TIME;
        const bank = sample('bank', progress);
        if (p.bankSide !== pose.view[1]) {
          [bank[0], bank[1]] = [bank[1], bank[0]];
          [bank[2], bank[3]] = [bank[3], bank[2]];
          bank[7] *= -1;
          bank[9] *= -1;
        }
        key = mix(key, bank, easeInOut(clamp(Math.min(progress * 8, (1 - progress) * 4), 0, 1)));
      }
      if (p.defeated) {
        key = sample('defeat', Math.min(1, p.fall / DEFEAT_FALL));
      } else if (p.dash > 0) {
        const progress = (DASH_POSE_TIME - p.dashPose) / DASH_TIME * 0.61;
        key = sample('dash', progress);
      } else if (p.firing) {
        key = sample('frost', frostAttackProgress());
        if (p.roarPose > 0) {
          const progress = 1 - p.roarPose / ROAR_POSE_TIME;
          key = mix(key, sample('roar', progress), Math.min(0.42, (1 - progress) * 2));
        }
        if (p.hurt > 0.58 - HIT_POSE_TIME) {
          const progress = (0.58 - p.hurt) / HIT_POSE_TIME;
          key = mix(key, sample('hit', progress), (1 - progress) * 0.5);
        }
      } else if (p.roarPose > 0) {
        const progress = 1 - p.roarPose / ROAR_POSE_TIME;
        key = mix(key, sample('roar', progress), Math.min(1, (1 - progress) * 5));
      } else if (p.hurt > 0.58 - HIT_POSE_TIME) {
        const progress = (0.58 - p.hurt) / HIT_POSE_TIME;
        key = mix(key, sample('hit', progress), Math.min(1, (1 - progress) * 5));
      } else if (p.dashPose > 0) {
        const recovery = clamp(1 - p.dashPose / (DASH_POSE_TIME - DASH_TIME), 0, 1);
        const progress = 0.61 + 0.39 * recovery;
        key = mix(key, sample('dash', progress), Math.min(1, (1 - progress) * 4));
      } else if (p.frostRelease < FROST_RECOVERY) {
        const fade = p.frostRelease / FROST_RECOVERY;
        const progress = p.frostReleaseStart + (1 - p.frostReleaseStart) * fade;
        key = mix(key, sample('frost', progress), Math.min(1, (1 - fade) * 4));
      }

      const [nearWing, farWing, nearSweep, farSweep, span, headPitch, headReach, tailSweep,
        hindTuck, bodyPitch, bodyLift] = key;
      const pieces = parts[pose.direction];
      const [mouthX, mouthY] = window.SaphirionMouths?.[pose.direction] || pose.view.slice(4, 6);
      const [, , , , , , jointX, jointY] = pieces[3];
      const head = {
        pitch: clamp(headPitch, -0.29, 0.29) * (1 - pose.axial * 0.7),
        x: jointX + headReach * 0.17 * (1 - pose.axial),
        y: jointY - headReach * pose.axial * (p.visualHeading < 0 ? 0.20 : -0.14),
        scaleX: 1 + headReach * 0.016 * (1 - pose.axial),
        scaleY: 1 + headReach * 0.011 * pose.axial
      };
      const muzzleX = (mouthX - jointX) * head.scaleX;
      const muzzleY = (mouthY - jointY) * head.scaleY;
      const muzzle = at(head.x + muzzleX * Math.cos(head.pitch) - muzzleY * Math.sin(head.pitch),
        head.y + muzzleX * Math.sin(head.pitch) + muzzleY * Math.cos(head.pitch));
      const x = Math.round(p.x - Math.cos(p.face) * pose.recoil * 7);
      // Preserve the full pitch and collapse at the southern arena boundary,
      // using a shorter drop if the actor is already close to the screen edge.
      const dropRoom = clamp(viewport.h - (p.y - camera.y) - 51, 0, 98);
      const fallScale = p.defeated && bodyLift > 0 ? dropRoom / 98 : 1;
      const y = Math.round(p.y + bodyLift * fallScale);
      const angle = clamp(wrap(p.visualHeading - pose.center), -0.35, 0.35) * 0.42 +
        p.bank * 0.21 + bodyPitch * pose.view[1];
      return { ...pose, x, y, angle, atlas, wings, pieces, muzzle, head, nearWing, farWing, nearSweep, farSweep,
        span, tailSweep, hindTuck, scaleX: 1 + pose.dash * 0.09, scaleY: 1 - pose.dash * 0.07 };
    }

    function drawAzureMotion(g, pose) {
      const { atlas, wings, pieces, axial, view: [, side, breadth, lift], head } = pose;
      const bank = p.bank * side * (1 - axial);
      const [nearX, nearY, farX, farY] = AZURE_SHOULDERS[pose.direction] ||
        [-10 - 7 * axial, lift - 8 - 2 * axial, 8 + 9 * axial, lift - 11 + axial];
      const drawWing = (frame, x, y, angle, span, scale, mirror) => {
        g.save();
        g.translate(x, y);
        g.rotate(angle);
        g.scale(mirror ? -1 : 1, span);
        drawAzurePilotCell(g, wings, frame, 0, 202, 98, scale * 1.54);
        g.restore();
      };
      const drawNearWing = () => drawWing(pose.nearWing, nearX, nearY,
        pose.nearSweep + bank * 0.25, pose.span * (1 - 0.04 * axial + bank * 0.19), 0.42 * breadth, false);
      const drawPart = ([sx, sy, w, h, px, py, x, y], angle = 0, dx = x, dy = y, scaleX = 1, scaleY = 1) => {
        g.save();
        g.translate(dx, dy);
        g.rotate(angle);
        g.drawImage(atlas, sx, sy, w, h, -px * scaleX, -py * scaleY, w * scaleX, h * scaleY);
        g.restore();
      };
      g.save();
      g.translate(pose.x, pose.y);
      g.rotate(pose.angle);
      g.scale(side * pose.scaleX, pose.scaleY);
      drawWing(pose.farWing, farX, farY, -pose.farSweep - bank * 0.23,
        pose.span * (0.89 + 0.07 * axial - bank * 0.19), (0.37 + 0.05 * axial) * breadth, true);
      if (axial > 0.80) drawNearWing();
      drawPart(pieces[0], clamp(pose.tailSweep, -0.32, 0.32) * (1 - axial * 0.27));
      drawPart(pieces[1], -pose.hindTuck * 0.017, pieces[1][6], pieces[1][7] - pose.hindTuck * 0.21,
        1, 1 - pose.hindTuck * 0.027);
      drawPart(pieces[2]);
      drawPart(pieces[3], head.pitch, head.x, head.y, head.scaleX, head.scaleY);
      if (axial <= 0.80) drawNearWing();
      g.restore();
    }

    function azurePilotBodyFrame(pose) {
      // The pilot action sheet is profile art. Other headings use the existing
      // directional torso until their matching action sheets have been authored.
      if (pose.view[0] !== 0) return null;
      if (pose.fall > 0.62) return 7;
      if (pose.fall > 0.12) return 6;
      if ((p.dash > 0 || p.firing) && Math.abs(wrap(p.face - p.visualHeading)) > TURN_STEP) return null;
      if (p.dash > 0) return 4;
      if (p.firing) return 2;
      if (pose.recoil > 0.32) return 5;
      if (p.roarPose > 0.10) return 3;
      if (p.roarPose > 0) return 1;
      return null;
    }

    function drawAzureRig(g, body, wings, pose, pilot, turns) {
      const { view: [row, side, breadth, lift], axial, turnFrame, idle, dash, roar, recoil, fall } = pose;
      const index = AZURE_WINGBEAT.findIndex(({ phase }) => phase > p.wingPhase);
      const a = AZURE_WINGBEAT[index - 1], b = AZURE_WINGBEAT[index];
      const t = easeInOut((p.wingPhase - a.phase) / (b.phase - a.phase));
      const hold = Math.max(p.glide, p.frostBlend * 0.45);
      const beat = (a.sweep + (b.sweep - a.sweep) * t) * (idle ? 0.55 : 1);
      const sweep = beat * (1 - hold) - hold * 0.67 - dash * 0.72 - fall * 0.86 + recoil * 0.46;
      const spread = (a.spread + (b.spread - a.spread) * t) * (1 - hold) + hold * 0.87;
      const span = spread * (1 - dash * 0.33 - fall * 0.47) + roar * 0.12;
      const bank = p.bank * side * (1 - axial);
      const bothBehind = axial > 0.80;
      const beatFrames = AZURE_PILOT_WINGS[Math.floor(p.wingPhase * AZURE_PILOT_WINGS.length)];
      const glide = p.glide > 0.77 && !dash && !fall;
      const drawWing = (far, x, y, angle, stretch, scale, mirror = false) => {
        if (!pilot) {
          const part = far && !bothBehind ? G3_FAR_WING : G3_NEAR_WING;
          drawAzureWing(g, wings, part, x, y, angle, stretch, scale, mirror);
          return;
        }
        const wing = Number(far && axial < 0.95);
        const frame = glide ? (wing ? 7 : 3) : beatFrames[wing];
        g.save();
        g.translate(x, y);
        g.rotate(angle);
        g.scale(mirror ? -1 : 1, stretch);
        drawAzurePilotCell(g, pilot, frame, 0, 202, 98, scale * 1.54);
        g.restore();
      };
      drawWing(true, 8 + 9 * axial, lift - 11 + axial,
        -sweep * (0.80 + 0.20 * axial) - bank * 0.23,
        span * (0.89 + 0.07 * axial - bank * 0.2), (0.37 + 0.05 * axial) * breadth, true);
      const drawNearWing = () => drawWing(false, -10 - 7 * axial, lift - 8 - 2 * axial,
        sweep + bank * 0.3, span * (1 - 0.04 * axial + bank * 0.2), 0.42 * breadth);
      if (bothBehind) drawNearWing();

      const action = pilot ? azurePilotBodyFrame(pose) : null;
      if (action !== null) {
        drawAzurePilotCell(g, pilot, action, 2, 135, 94, AZURE_PILOT_BODY_SCALE);
      } else if (turnFrame !== null) {
        const { w, h, pivotX, pivotY } = TURN_CELL;
        g.drawImage(turns, turnFrame % 4 * w, Math.floor(turnFrame / 4) * h, w, h,
          -pivotX, -pivotY, w, h);
      } else {
        const frame = idle ? 8 + Math.floor(p.idlePhase * 6) : Math.floor(p.wingPhase * 8);
        g.drawImage(body, frame * 200, row * 184, 200, 184,
          -106 / 1.16, -88 / 1.16, 200 / 1.16, 184 / 1.16);
      }
      if (!bothBehind) drawNearWing();
    }

    function frostMuzzle(pose, pilot) {
      const [, side, , , baseX, baseY] = pose.view;
      const [mx, my] = pose.muzzle ? [pose.muzzle.x, pose.muzzle.y] :
        pilot && azurePilotBodyFrame(pose) === 2 ? AZURE_PILOT_FROST_MOUTH : [baseX, baseY];
      const delta = Math.abs(wrap(p.face - p.visualHeading));
      const mouthWeight = pose.muzzle ? 1 - easeInOut(clamp((delta - TURN_STEP) / (Math.PI / 2), 0, 1)) :
        clamp(Math.cos(delta), 0, 1);
      const x = mx * pose.scaleX * side * mouthWeight;
      const y = my * pose.scaleY * mouthWeight;
      return at(pose.x + x * Math.cos(pose.angle) - y * Math.sin(pose.angle),
        pose.y + x * Math.sin(pose.angle) + y * Math.cos(pose.angle));
    }

    function drawSaphirion(g, art, motion) {
      if (motion) {
        drawAzureMotion(g, motion);
        return;
      }
      const body = art.getImage('azureG3Turns');
      const wings = body && art.getImage('azureFlightRig');
      if (wings) {
        const turns = art.getImage('azureG5Turns');
        const pose = azurePose(turns);
        g.save();
        g.globalAlpha *= 1 - pose.fall * 0.34;
        g.translate(pose.x, pose.y);
        g.rotate(pose.angle);
        g.scale(pose.view[1] * pose.scaleX, pose.scaleY);
        drawAzureRig(g, body, wings, pose, art.getImage('azureG5Pilot'), turns);
        g.restore();
        return;
      }
      const action = p.dash > 0 ? 'azureDash' : p.firing ? 'azureFrost' : p.roarPose > 0 ? 'azureRoar' : null;
      const atlas = action ? null : art.getImage('azureFlightRig');
      const spriteKey = action || 'azureFly1';
      const im = atlas || art.getImage(spriteKey);
      if (!im) return;
      const side = action ? (Math.cos(p.face) < 0 ? -1 : 1) : p.flightSide;
      const angle = action === 'azureDash' || action === 'azureFrost' ? wrap(p.face - (side < 0 ? Math.PI : 0)) :
        p.bank * side;

      g.save();
      if (p.hurt > 0 && Math.floor(time * 20) % 2) g.globalAlpha *= 0.62;
      g.translate(Math.round(p.x), Math.round(p.y));
      g.rotate(angle);
      g.scale(side, 1);
      if (atlas) {
        drawAzureFlight(g, atlas);
      } else {
        const pose = AZURE_ACTIONS[spriteKey];
        g.drawImage(im, -pose.width * pose.anchorX, -pose.height * pose.anchorY, pose.width, pose.height);
      }
      g.restore();
    }

    function drawGrid(g, art, line, active) {
      const vertical = line.axis === 'x';
      const from = vertical ? at(line.value, camera.y - 32) : at(camera.x - 32, line.value);
      const to = vertical ? at(line.value, camera.y + viewport.h + 32) :
        at(camera.x + viewport.w + 32, line.value);
      beam(g, art, from, to, 'redLightning', active ? 61 : 18,
        active ? 0.95 : 0.33 + Math.sin(time * 27) * 0.15);
    }

    function drawArena(g, w, h, art) {
      const background = art.getImage('calderaSky');
      if (background) g.drawImage(background, -Math.round(camera.x), -Math.round(camera.y), WORLD.w, WORLD.h);
      else {
        g.fillStyle = '#182138';
        g.fillRect(0, 0, w, h);
      }
      const visible = (pos, margin = 135) => pos.x > camera.x - margin && pos.x < camera.x + w + margin &&
        pos.y > camera.y - margin && pos.y < camera.y + h + margin;
      g.save();
      g.translate(-Math.round(camera.x) + Math.round(shake * Math.sin(time * 127)),
        -Math.round(camera.y) + Math.round(shake * Math.cos(time * 91) * 0.66));

      for (const [x, y, hue] of BANNERS) {
        g.save();
        if (hue) g.filter = `hue-rotate(${hue}deg)`;
        sprite(g, art, 'isoldeBanner', at(x, y), 66, { alpha: 0.71 });
        g.restore();
      }
      sprite(g, art, 'blackAltar', ALTAR, 290, { alpha: phase === 3 ? 0.77 : 0.94 });
      if (phase === 2) {
        for (const anchor of anchors) {
          if (anchor.hp <= 0) continue;
          beam(g, art, anchor, boss, 'redLightning', 15, 0.36 + Math.sin(time * 12) * 0.1);
          sprite(g, art, 'altarAnchor', anchor, 121);
        }
      }
      if (boss.cast?.kind === 'grid') {
        for (const line of boss.cast.grid) drawGrid(g, art, line, false);
      } else if (boss.cast?.kind === 'rush') {
        beam(g, art, boss, shift(boss, boss.cast.angle, 420), 'redLightning', 19, 0.45 + Math.sin(time * 20) * 0.12);
      } else if (boss.cast) {
        sprite(g, art, 'fearRing', boss, 146, { alpha: 0.56, angle: time * 1.7 });
      }
      for (const line of lines) drawGrid(g, art, line, true);
      for (const enemy of escorts) {
        if (!visible(enemy)) continue;
        if (enemy.kind === 'priest' && phase === 2 && remainingAnchors() && enemy.stun <= 0) {
          beam(g, art, enemy, boss, 'redLightning', 9, 0.22);
        }
        const oscillation = enemy.kind === 'priest' ? 1 : 5;
        sprite(g, art, enemy.sprite, at(enemy.x, enemy.y + Math.sin(time * 10 + enemy.x * 0.01) * oscillation),
          enemy.size, { angle: enemy.kind === 'priest' ? 0 : Math.sin(enemy.face) * -0.19,
            flip: Math.cos(enemy.face) > 0, alpha: enemy.stun > 0 ? 0.62 : enemy.echo ? 0.77 : 1 });
      }
      if (visible(boss, 242)) {
        const key = phase > 1 ? 'dreadDragonDamaged' : Math.floor(time * 7) % 2 ? 'dreadDragonFly1' : 'dreadDragonFly2';
        const flip = Math.cos(boss.face) > 0;
        const pose = at(boss.x, boss.y + Math.sin(time * 8) * 5);
        if (phase === 2 && remainingAnchors()) {
          sprite(g, art, 'fearRing', boss, 218, { alpha: 0.43, angle: -time * 1.2 });
        }
        sprite(g, art, key, pose, 174,
          { width: 248, flip, angle: Math.sin(boss.face) * -0.16, alpha: boss.flash > 0 ? 0.71 : 1 });
        sprite(g, art, 'thanatosLich',
          at(boss.x + (phase === 3 ? -29 : flip ? -11 : 11), boss.y - (phase === 3 ? 76 : 55)),
          phase === 3 ? 105 : 64, { flip, alpha: 0.96 });
      }

      const motion = azureMotion(art);
      if (p.firing) {
        const muzzle = motion ? frostMuzzle(motion) : art.getImage('azureG3Turns') && art.getImage('azureFlightRig')
          ? frostMuzzle(azurePose(art.getImage('azureG5Turns')), art.getImage('azureG5Pilot')) : shift(p, p.face, 42);
        beam(g, art, muzzle, shift(p, p.face, FROST_RANGE + 18), 'starFrost',
          43 + Math.sin(time * 29) * 7, 0.83);
      }
      for (const bolt of bolts) {
        if (!visible(bolt, 55)) continue;
        const friendly = bolt.friendly;
        const size = bolt.kind === 'hellfire' ? 37 : 23;
        sprite(g, art, friendly ? 'starFrost' : 'redLightning', bolt, size,
          { width: size * 1.95, angle: Math.atan2(bolt.vy, bolt.vx), alpha: 0.9 });
      }
      drawSaphirion(g, art, motion);
      for (const fx of effects) {
        if (!visible(fx, fx.size)) continue;
        const alpha = clamp(fx.life / fx.total * 1.5, 0, 1);
        const scale = fx.kind === 'frost' ? fx.size : fx.size * (1 - fx.life / fx.total) * 1.85 + 28;
        sprite(g, art, fx.kind === 'frost' ? 'starFrost' : 'fearRing', fx, scale,
          { width: fx.kind === 'frost' ? scale * 1.8 : scale, angle: fx.angle + time * 0.72, alpha });
        if (fx.kind === 'nova') sprite(g, art, 'fearRing', fx, scale * 0.77,
          { width: scale * 0.77, angle: -time * 0.61, alpha: alpha * 0.79 });
      }
      g.restore();
    }

    function label(g, text, x, y, size, color = '#e8f2fa', align = 'left') {
      g.font = `bold ${size}px Georgia`;
      g.textAlign = align;
      g.fillStyle = color;
      g.fillText(text, x, y);
    }

    function meter(g, x, y, w, value, color) {
      g.fillStyle = '#080e1b';
      g.fillRect(x, y, w, 8);
      g.fillStyle = color;
      g.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(value, 0, 1)), 6);
      g.strokeStyle = '#59778f';
      g.strokeRect(x + 0.5, y + 0.5, w - 1, 7);
    }

    function hud(g, w, h, art) {
      const gradient = g.createLinearGradient(0, 0, 0, 72);
      gradient.addColorStop(0, '#243a5b');
      gradient.addColorStop(1, '#0e1730');
      g.fillStyle = gradient;
      g.fillRect(0, 0, w, 72);
      g.fillStyle = '#bd9b60';
      g.fillRect(0, 70, w, 2);
      sprite(g, art, 'azureCrest', at(36, 34), 45);
      label(g, `SCALES  ${Math.ceil(p.hp)} / ${MAX_SCALES}`, 64, 25, 15);
      meter(g, 64, 32, 133, p.hp / MAX_SCALES, '#9ecbef');
      label(g, `STAR FROST  ${Math.floor(p.frost)}%`, 214, 25, 13, '#c0ecff');
      meter(g, 214, 32, 114, p.frost / 100, '#7ad8f1');
      label(g, `ROAR  ${p.roar > 0 ? p.roar.toFixed(1) : 'READY'}`, 64, 61, 12, '#bedef0');

      const center = w / 2;
      label(g, `PHASE ${['I', 'II', 'III'][phase - 1]}  ·  ${PHASES[phase - 1]}`, center, 22, 17, '#ebdbb7', 'center');
      meter(g, center - 145, 30, 290, boss.hp / BOSS_MAX, phase === 3 ? '#ed7459' : '#be6386');
      label(g, phase === 1 ? 'ALTAR INTACT' : phase === 2 ? `ALTAR ANCHORS  ${remainingAnchors()} / 3` : 'ALTAR BROKEN',
        center, 56, 12, '#cbb9d7', 'center');

      const powered = p.resonance >= 100;
      label(g, powered ? 'MEMORY NOVA READY' : `RESONANCE ${Math.floor(p.resonance)}%`,
        w - 288, 49, 13, powered ? '#ffe4a4' : '#a9d7f2', 'right');
      meter(g, w - 406, 55, 118, p.resonance / 100, powered ? '#ffe4a4' : '#76a6ef');
      label(g, `DASH ${p.dashCharge > 0 ? p.dashCharge.toFixed(1) : 'READY'}`, w - 175, 60, 13, '#b7d9f1', 'right');
      label(g, `GLORY ${score}`, w - 25, 60, 14, '#ecd8af', 'right');

      if (messageTime > 0) {
        const y = document.body.classList.contains('touch-active') ? 83 : h - 45;
        g.font = 'bold 16px Georgia';
        const width = Math.min(w - 20, g.measureText(message).width + 38);
        g.fillStyle = '#0b1425ea';
        g.fillRect((w - width) / 2, y, width, 32);
        label(g, message, center, y + 21, 16, '#d9eafa', 'center');
      }
    }

    function drawEpilogue(g, w, h, art) {
      const dawn = art.getImage('calderaDawn');
      if (dawn) g.drawImage(dawn, 0, 0, w, h);
      else {
        g.fillStyle = '#33263d';
        g.fillRect(0, 0, w, h);
      }
      const fade = clamp(1 - epilogueAge / 1.35, 0, 1);
      if (fade > 0) {
        g.fillStyle = `rgba(252, 221, 158, ${fade})`;
        g.fillRect(0, 0, w, h);
      }
      g.save();
      g.filter = 'sepia(1) saturate(1.7)';
      for (let i = 0; i < 20; i++) {
        const x = (i * 263.71 + 55 * Math.sin(epilogueAge * 0.38 + i)) % w;
        const y = (h * 2 + i * 117.5 - epilogueAge * (36 + i % 7)) % h;
        sprite(g, art, 'starFrost', at(x, y), i % 4 + 5, { angle: -Math.PI / 2, alpha: 0.39 + Math.sin(i + epilogueAge * 2) * 0.18 });
      }
      g.restore();
      const [title, text] = EPILOGUE[Math.min(2, Math.floor(epilogueAge / 3.55))];
      g.fillStyle = '#141c2bd9';
      g.fillRect(w * 0.1, h - 117, w * 0.8, 79);
      label(g, title, w / 2, h - 83, 24, '#ffdfaa', 'center');
      label(g, text, w / 2, h - 56, 17, '#e9e7eb', 'center');
    }

    function render(g, w, h, art) {
      g.imageSmoothingEnabled = false;
      if (epilogueAge >= 0) {
        drawEpilogue(g, w, h, art);
        return;
      }
      drawArena(g, w, h, art);
      hud(g, w, h, art);
    }

    function stop(audio) {
      p.firing = false;
      p.frostRelease = FROST_RECOVERY;
      p.roarHeld = p.dashHeld = false;
      pointer = null;
      audio?.setStarFrost(false);
    }

    return {
      init, update, render,
      beginOutcomeAnimation(result, audio) {
        if (result.outcome !== 'loss') return 0;
        p.firing = false;
        p.frostBlend = 0;
        p.fall = 0;
        p.defeated = true;
        audio?.setStarFrost(false);
        return DEFEAT_LENGTH;
      },
      updateOutcomeAnimation(dt) {
        p.fall = Math.min(DEFEAT_LENGTH, p.fall + dt);
        p.wingPhase = (p.wingPhase + dt * 0.42) % 1;
      },
      musicMode: 'm6_finale',
      aimAt(x, y) { pointer = x === null ? null : { x, y }; },
      onPause: stop,
      cleanup: stop,
      startEpilogue(audio) {
        epilogueAge = 0;
        audio?.setMode('m6_epilogue');
        audio?.playCrownShatter();
      },
      updateEpilogue(dt) {
        epilogueAge += dt;
        return epilogueAge >= 11.3;
      },
      getOverlayCopy(type, result, best) {
        if (type === 'pause') return {
          title: 'THE CALDERA WAITS',
          subtitle: 'Mission VI — The Crown of Living Memory',
          noteHtml: '<b>Star Frost</b> slows the Dread-Dragon. <b>Fear Roar</b> breaks echoes and deflects nearby bolts. At full Resonance it becomes <b>Memory Nova</b>. <b>Sky Dash</b> cuts through attacks in your flight direction.',
          primaryLabel: 'RESUME THE FINALE'
        };
        if (type === 'victory') {
          const campaign = window.ThanatosCampaign;
          const badges = campaign.missions.filter((mission) => campaign.isCompleted(mission.id));
          const glory = campaign.missions.reduce((sum, mission) => sum + campaign.getBestScore(mission.id), 0);
          const badgeList = badges.map((mission) =>
            `<span class="vessel-badge"><b>${mission.roman}</b> ${mission.vesselName}</span>`).join('');
          return {
            title: 'THE CROWN OF LIVING MEMORY',
            subtitle: 'Thanatos has fallen. Kaelen has come home.',
            noteHtml: `<p class="finale-glory"><b>${glory.toLocaleString('en-US')} Total Glory</b> · ${badges.length} / 6 Vessel Badges</p>
              <p>Mission VI Glory ${result.score.toLocaleString('en-US')} · Best ${best.toLocaleString('en-US')}</p>
              <div class="vessel-badges">${badgeList}</div>`,
            primaryLabel: 'RETURN TO MAP',
            restartLabel: 'REPLAY CAMPAIGN',
            replayMissionId: 1,
            summary: true
          };
        }
        return {
          title: 'SAPHIRION HAS FALLEN',
          subtitle: `Mission VI · Final Glory ${result.score}`,
          noteHtml: 'Dash through the Dread-Dragon’s charge. In the second phase, use <b>Fear Roar</b> to dispel the echoes and <b>Star Frost</b> to break the anchors. Move clear of the red lightning lines before they ignite.',
          primaryLabel: 'TAKE FLIGHT AGAIN'
        };
      }
    };
  }

  window.ThanatosMissions[6] = makeController();
})();
