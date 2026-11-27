(() => {
  'use strict';

  window.ThanatosMissions = window.ThanatosMissions || {};

  const WORLD_W = 2240;
  const WORLD_H = 1500;
  const PLAYER_RADIUS = 12;
  const WALK_SPEED = 235;
  const MIST_SPEED = 680;
  const MIST_DURATION = 0.26;
  const MIST_RECHARGE = 2.2;
  const SLASH_RANGE = 83;
  const BITE_RANGE = 57;
  const DEFEAT_DURATION = 0.56;
  const CASSIAN_STRIDE = 54;
  const CASSIAN_ATLAS = { columns: 12, rows: 19, width: 112, height: 106, pivotX: 55, pivotY: 86, posesPerView: 45 };
  const CASSIAN_CLIPS = {
    idle: [0, 6], walk: [6, 8], slash: [14, 5], parry: [19, 5], mist: [24, 5],
    bite: [29, 5], hit: [34, 5], defeat: [39, 5], fallen: [44, 1]
  };
  // E, SE, S, SW, W, NW, N, NE. Mirroring keeps the five painted perspectives distinct.
  const CASSIAN_HEADINGS = [[2, 1], [1, 1], [0, 1], [1, -1], [2, -1], [3, -1], [4, 1], [3, 1]];
  const STEALTH_SCORE = 'm3_necropolis_stealth';
  const DUEL_SCORE = 'm3_duel';

  const rooms = [
    { x: 80, y: 760, w: 780, h: 650, name: 'West Cloister' },
    { x: 1380, y: 760, w: 780, h: 650, name: 'East Reliquary Wing' },
    { x: 650, y: 80, w: 940, h: 450, name: 'Velvet Throne Cathedral' },
    { x: 860, y: 530, w: 520, h: 900, name: 'Obsidian Keep' },
    { x: 816, y: 1000, w: 88, h: 174 },
    { x: 1336, y: 1000, w: 88, h: 174 }
  ];
  const gates = [
    { x: 844, y: 1000, w: 30, h: 174 },
    { x: 1366, y: 1000, w: 30, h: 174 },
    { x: 860, y: 517, w: 520, h: 27, cathedral: true }
  ];
  const pillars = [
    [240, 923], [660, 950], [240, 1300], [660, 1310], [984, 825], [1256, 825],
    [1520, 975], [1980, 985], [1520, 1250], [2000, 1280],
    [810, 280], [1430, 280], [810, 445], [1430, 445]
  ];
  const shadowNiches = [
    [137, 828], [137, 1340], [562, 806], [807, 1350], [927, 920], [1316, 920],
    [927, 1328], [1316, 1328], [1430, 831], [2105, 833], [2105, 1350]
  ];
  const braziers = [
    { x: 975, y: 640, angle: 0.6, speed: 0.9 },
    { x: 1265, y: 650, angle: 2.7, speed: -0.85 },
    { x: 370, y: 1000, angle: 2.9, speed: -0.76 },
    { x: 1860, y: 1148, angle: 1.2, speed: 0.88 }
  ];
  const candles = [[712, 870], [388, 784], [530, 1376], [1470, 870], [1840, 785],
    [1775, 1370], [950, 1190], [1290, 1190], [1020, 165], [1220, 165],
    [688, 415], [1550, 415]];
  const altar = { x: 1120, y: 194 };
  const enemyTypes = {
    knight: { art: 'enemyDeathKnight', hp: 68, speed: 109, range: 63, size: 83, damage: 13, score: 65 },
    archer: { art: 'enemySkelArcher', hp: 38, speed: 0, range: 310, size: 68, damage: 10, score: 55 },
    wraith: { art: 'enemyWraith', hp: 38, speed: 147, range: 58, size: 81, damage: 11, score: 60 },
    warlord: { art: 'bossCultWarlord', hp: 164, speed: 128, range: 122, size: 114, damage: 20, score: 420 },
    mage: { art: 'bossCultMage', hp: 128, speed: 82, range: 300, size: 100, damage: 17, score: 460 },
    garret: { art: 'bossGarret', hp: 220, speed: 165, range: 99, size: 108, damage: 11, score: 540 }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const direction = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
  const angleGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const inRect = (x, y, rect) =>
    x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

  function createEnemy(type, x, y, patrol = null) {
    const config = enemyTypes[type];
    return {
      ...config, type, x, y, patrol, home: { x, y }, patrolEnd: true,
      maxHp: config.hp, facing: patrol ? Math.atan2(patrol[1] - y, patrol[0] - x) : Math.PI / 2,
      boss: ['warlord', 'mage', 'garret'].includes(type),
      aware: false, memory: 0, windup: 0, recovery: 0, stunned: 0, cooldown: 0,
      combo: 0, casts: 0, hitFlash: 0, down: false
    };
  }

  function createController() {
    let player, enemies, commander, bolts, rings, effects, camera, layout, biteButton;
    let time, score, slain, dawn, duel, wardBroken, guardBreaks, alarm;
    let message, messageTimer, biteTarget, dashHeld, slashHeld, biteHeld, visibility;
    let viewportW, viewportH;

    function init(_ctx, w, h) {
      viewportW = w;
      viewportH = h;
      player = {
        x: 1120, y: 1280, hp: 100, facing: -Math.PI / 2, mirror: false,
        charge: 3, recharge: 0, dash: 0, dashAngle: 0, slash: 0, bite: 0,
        invulnerability: 0, moving: false, lastClear: null, visualHeading: -Math.PI / 2,
        stride: 0, strideMix: 0, action: null, defeatAge: null
      };
      commander = createEnemy('garret', 1120, 323);
      enemies = [
        createEnemy('knight', 1010, 1100, [1220, 1080]),
        createEnemy('knight', 590, 1150, [620, 878]),
        createEnemy('knight', 265, 1230, [480, 1260]),
        createEnemy('archer', 165, 1140),
        createEnemy('wraith', 525, 887, [342, 875]),
        createEnemy('knight', 1530, 1125, [1760, 1195]),
        createEnemy('archer', 2050, 1030),
        createEnemy('wraith', 1810, 901, [1980, 907]),
        createEnemy('wraith', 1140, 785, [1160, 620]),
        createEnemy('warlord', 384, 1087),
        createEnemy('mage', 1810, 1040),
        commander
      ];
      bolts = [];
      rings = [];
      effects = [];
      camera = { x: clamp(player.x - w / 2, 0, WORLD_W - w), y: WORLD_H - h };
      time = score = slain = alarm = guardBreaks = 0;
      dashHeld = slashHeld = biteHeld = duel = wardBroken = false;
      dawn = null;
      biteTarget = null;
      visibility = 'clear';
      biteButton = document.querySelector('#touch-actions [data-key="KeyR"]');
      announce('MIST DASH through either iron grate', 5);
    }

    function announce(text, duration = 3.1) {
      message = text;
      messageTimer = duration;
    }

    function onFloor(x, y) {
      return rooms.some((room) => inRect(x, y, room));
    }

    function openPath(x, y, radius, phase) {
      if (!onFloor(x - radius, y) || !onFloor(x + radius, y) ||
          !onFloor(x, y - radius) || !onFloor(x, y + radius)) return false;
      if (pillars.some(([px, py]) => Math.hypot(x - px, y - py) < radius + 23)) return false;
      return !gates.some((gate) => {
        if (gate.cathedral ? slain >= 2 : phase) return false;
        return x > gate.x - radius && x < gate.x + gate.w + radius &&
          y > gate.y - radius && y < gate.y + gate.h + radius;
      });
    }

    function move(unit, dx, dy, radius, phase = false) {
      if (openPath(unit.x + dx, unit.y, radius, phase)) unit.x += dx;
      if (openPath(unit.x, unit.y + dy, radius, phase)) unit.y += dy;
    }

    function lineClear(from, to) {
      const steps = Math.ceil(distance(from, to) / 22);
      for (let i = 1; i < steps; i += 1) {
        const t = i / steps;
        if (!openPath(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 0, false)) return false;
      }
      return true;
    }

    function coneHits(source, range, halfAngle, facing = source.facing) {
      return distance(source, player) <= range &&
        angleGap(direction(source, player), facing) < halfAngle && lineClear(source, player);
    }

    function inShadow() {
      return shadowNiches.some(([x, y]) => Math.hypot(player.x - x, player.y - y) < 59);
    }

    function nearestTarget(range, accepts) {
      let nearest = null;
      let closest = range;
      for (const enemy of enemies) {
        if (enemy.down || !accepts(enemy)) continue;
        const gap = distance(enemy, player);
        if (gap < closest && lineClear(player, enemy)) {
          closest = gap;
          nearest = enemy;
        }
      }
      return nearest;
    }

    function findBiteTarget() {
      if (duel && commander.down && wardBroken && distance(commander, player) < BITE_RANGE &&
          lineClear(player, commander)) return commander;
      return nearestTarget(BITE_RANGE, (enemy) =>
        enemy.stunned > 0 || enemy.recovery > 0.15 && enemy.boss ||
        !enemy.boss && !enemy.aware && angleGap(enemy.facing, direction(enemy, player)) > 2.24);
    }

    function shatter(audio, mercy) {
      slain = 3;
      score += enemyTypes.garret.score + (mercy ? 450 : 0);
      audio.playGlassShatter();
      addEffect('fxFireRing', altar, 126, 0.7);
      return { outcome: 'win', score, heroic: mercy };
    }

    function defeatEnemy(enemy) {
      enemy.down = true;
      enemy.windup = 0;
      score += enemy.score;
      if (!enemy.boss) return;
      slain += 1;
      if (slain === 2) {
        dawn = 90;
        announce('Cathedral open. Dawn breaks in 90 seconds!', 4.2);
      } else {
        announce(enemy.type === 'warlord' ? 'Warlord defeated. Hunt the Pyromancer.' :
          'Pyromancer defeated. Hunt the Warlord.');
      }
    }

    function hurtEnemy(enemy, damage) {
      enemy.hp = Math.max(0, enemy.hp - damage);
      enemy.hitFlash = 0.2;
      if (enemy.hp > 0) return;
      if (enemy.type === 'garret') {
        enemy.down = true;
        wardBroken = true;
        announce('Garret is disarmed. SLASH the Brass Reliquary.', 5);
      } else {
        defeatEnemy(enemy);
      }
    }

    function hurtPlayer(damage) {
      if (player.dash > 0 || player.invulnerability > 0) return;
      player.hp = Math.max(0, player.hp - damage);
      player.invulnerability = 0.48;
      poseAction('hit', 0.27);
      alarm = Math.max(alarm, 3.2);
    }

    function addEffect(key, point, size, life, angle = 0) {
      effects.push({ key, x: point.x, y: point.y, size, life, duration: life, angle });
    }

    function parry(enemy, audio) {
      enemy.windup = 0;
      enemy.combo = 0;
      enemy.stunned = enemy.boss ? 1.25 : 1.0;
      audio.playParryClang();
      if (enemy.type === 'garret') {
        guardBreaks += 1;
        if (!wardBroken && (guardBreaks >= 2 || enemy.hp <= enemy.maxHp / 2)) {
          wardBroken = true;
          announce('Ward broken. SLASH the Reliquary to free the child.', 4.5);
        } else if (!wardBroken) {
          announce('Guard cracked. Parry Garret again.');
        }
      }
    }

    function slash(audio) {
      player.slash = 0.38;
      const nearAltar = duel && distance(player, altar) <= SLASH_RANGE + 4;
      if (nearAltar) {
        if (wardBroken) {
          poseAction('slash', 0.38);
          return shatter(audio, true);
        }
        announce('Parry Garret to break the Reliquary ward.');
      }

      const target = nearestTarget(SLASH_RANGE, (enemy) =>
        angleGap(player.facing, direction(player, enemy)) < 1.53 || distance(player, enemy) < 38);
      if (target) player.facing = direction(player, target);
      const reach = {
        x: player.x + Math.cos(player.facing) * 42,
        y: player.y + Math.sin(player.facing) * 42 - 18
      };
      let parried = false;
      audio.playRapierSlash();
      for (const enemy of enemies) {
        if (enemy.down || distance(enemy, player) > SLASH_RANGE || !lineClear(player, enemy) ||
            angleGap(player.facing, direction(player, enemy)) > 1.25) continue;
        const wasParry = enemy.windup > 0 && ['knight', 'warlord', 'garret'].includes(enemy.type);
        if (wasParry) {
          parried = true;
          parry(enemy, audio);
        }
        const flank = angleGap(enemy.facing, direction(enemy, player)) > 1.8;
        const guarded = enemy.type === 'garret' && !flank && enemy.stunned <= 0 && enemy.recovery <= 0;
        hurtEnemy(enemy, guarded ? 12 : wasParry ? 43 : 32);
        if (!enemy.down) {
          enemy.aware = true;
          enemy.memory = 4;
        }
      }
      for (const bolt of bolts) {
        if (distance(player, bolt) < 69 && angleGap(player.facing, direction(player, bolt)) < 1.35) {
          bolt.life = 0;
          parried = true;
          audio.playParryClang();
        }
      }
      poseAction(parried ? 'parry' : 'slash', 0.38);
      addEffect(parried ? 'fxSlashCrimson2' : 'fxSlashCrimson', reach, 77, 0.24, player.facing);
      return null;
    }

    function bite(target, audio) {
      player.facing = direction(player, target);
      player.bite = 0.58;
      poseAction('bite', 0.58);
      player.hp = Math.min(100, player.hp + 18);
      player.invulnerability = Math.max(player.invulnerability, 0.36);
      audio.playVampireBite();
      addEffect('fxFangsPrompt', { x: target.x, y: target.y - target.size * 0.7 }, 23, 0.21);
      if (target.type === 'garret') {
        if (target.hp <= 64) {
          target.down = true;
          return shatter(audio, false);
        }
        hurtEnemy(target, 64);
        target.stunned = 1.0;
        announce('Garret is fading. The Reliquary can still free the child.');
      } else if (target.boss) {
        target.stunned = 1.05;
        hurtEnemy(target, 62);
      } else {
        defeatEnemy(target);
        score += 45;
      }
      return null;
    }

    function startDash(audio) {
      player.charge -= 1;
      player.dash = MIST_DURATION;
      player.dashAngle = player.facing;
      player.lastClear = { x: player.x, y: player.y };
      poseAction('mist', MIST_DURATION + 0.09);
      audio.playMistDash();
    }

    function poseAction(clip, duration) {
      player.action = { clip, duration, age: 0, heading: player.facing };
      player.visualHeading = player.facing;
    }

    function advanceCassianAction(dt) {
      const action = player.action;
      if (action) {
        action.age += dt;
        if (action.age >= action.duration) player.action = null;
      }
    }

    function advanceCassianPose(dt, travel) {
      const turning = player.facing - player.visualHeading;
      const angle = Math.atan2(Math.sin(turning), Math.cos(turning));
      player.visualHeading += clamp(angle, -dt * 34, dt * 34);
      player.stride = (player.stride + travel) % CASSIAN_STRIDE;
      const running = travel > 0.01;
      const blend = 1 - Math.exp(-dt * (running ? 26 : 19));
      player.strideMix += (Number(running) - player.strideMix) * blend;
    }

    function movePlayer(dt, keys, audio) {
      const dx = Number(Boolean(keys.ArrowRight || keys.KeyD)) - Number(Boolean(keys.ArrowLeft || keys.KeyA));
      const dy = Number(Boolean(keys.ArrowDown || keys.KeyS)) - Number(Boolean(keys.ArrowUp || keys.KeyW));
      const dashDown = Boolean(keys.KeyX || keys.ShiftLeft || keys.ShiftRight);
      const slashDown = Boolean(keys.Space);
      const biteDown = Boolean(keys.KeyR);

      player.moving = Boolean(dx || dy);
      if (player.moving && player.dash <= 0) {
        player.facing = Math.atan2(dy, dx);
        if (dx) player.mirror = dx < 0;
      }
      if (dashDown && !dashHeld && player.charge && player.dash <= 0) startDash(audio);

      const phased = player.dash > 0;
      if (phased) {
        const step = Math.min(dt, player.dash) * MIST_SPEED;
        const substeps = Math.max(1, Math.ceil(step / 10));
        for (let i = 0; i < substeps; i += 1) {
          move(player, Math.cos(player.dashAngle) * step / substeps,
            Math.sin(player.dashAngle) * step / substeps, PLAYER_RADIUS, true);
          if (openPath(player.x, player.y, PLAYER_RADIUS, false)) {
            player.lastClear = { x: player.x, y: player.y };
          }
        }
        player.dash = Math.max(0, player.dash - dt);
        addEffect(Math.floor(time * 24) % 2 ? 'fxMistBat1' : 'fxMistBat2', {
          x: player.x - Math.cos(player.dashAngle) * 21,
          y: player.y - 23 + Math.sin(time * 32) * 11
        }, 22, 0.28);
        if (player.dash <= 0) {
          Object.assign(player, player.lastClear);
          player.invulnerability = Math.max(player.invulnerability, 0.11);
        }
      } else if (player.moving) {
        move(player, Math.cos(player.facing) * WALK_SPEED * dt,
          Math.sin(player.facing) * WALK_SPEED * dt, PLAYER_RADIUS);
      }

      const useSlash = slashDown && !slashHeld && player.slash <= 0;
      const useBite = biteDown && !biteHeld && player.bite <= 0;
      dashHeld = dashDown;
      slashHeld = slashDown;
      biteHeld = biteDown;
      if (phased) return null;
      biteTarget = findBiteTarget();
      if (useSlash) return slash(audio);
      if (useBite && biteTarget) return bite(biteTarget, audio);
      return null;
    }

    function seek(enemy, target, speed, dt) {
      enemy.facing = direction(enemy, target);
      const step = Math.min(distance(enemy, target), speed * dt);
      move(enemy, Math.cos(enemy.facing) * step, Math.sin(enemy.facing) * step, 10);
    }

    function fireBolt(enemy, audio) {
      audio.playArrow();
      bolts.push({ x: enemy.x, y: enemy.y, angle: enemy.facing, life: 1.4, damage: enemy.damage });
    }

    function castRing(enemy) {
      rings.push({ x: player.x, y: player.y, age: 0, hit: false, damage: enemy.damage });
      enemy.casts += 1;
      const destinations = [[1525, 880], [1985, 1125], [1615, 1305], [1965, 858]];
      const [x, y] = destinations[(enemy.casts - 1) % destinations.length];
      addEffect('fxMistBat1', enemy, 48, 0.5);
      enemy.x = x;
      enemy.y = y;
      addEffect('fxMistBat2', enemy, 57, 0.6);
    }

    function releaseAttack(enemy, audio) {
      if (enemy.type === 'archer') {
        fireBolt(enemy, audio);
        enemy.cooldown = 1.65;
      } else if (enemy.type === 'mage') {
        castRing(enemy);
        enemy.recovery = 0.92;
        enemy.cooldown = 2.15;
      } else {
        if (enemy.type === 'warlord') {
          for (let i = 0; i < 5; i += 1) {
            move(enemy, Math.cos(enemy.facing) * 10, Math.sin(enemy.facing) * 10, 13);
          }
        }
        audio.playRapierSlash();
        const sweep = enemy.type === 'warlord' ? Math.PI : enemy.combo === 3 ? 1.08 : 0.74;
        if (coneHits(enemy, enemy.range + 12, sweep + 0.001)) {
          hurtPlayer(enemy.damage + (enemy.combo === 3 ? 6 : 0));
        }
        if (enemy.type === 'garret' && enemy.combo < 3) {
          enemy.combo += 1;
          enemy.facing = direction(enemy, player);
          enemy.windup = enemy.combo === 3 ? 0.47 : 0.31;
          return;
        }
        enemy.combo = 0;
        enemy.recovery = enemy.boss ? 1.02 : 0.46;
        enemy.cooldown = enemy.boss ? 0.95 : 1.25;
      }
    }

    function updateEnemy(enemy, dt, audio, concealed) {
      if (enemy.down || enemy.type === 'garret' && !duel) return;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (enemy.stunned > 0) {
        enemy.stunned -= dt;
        return;
      }
      if (enemy.recovery > 0) {
        enemy.recovery -= dt;
        return;
      }
      if (enemy.windup > 0) {
        enemy.windup -= dt;
        if (enemy.windup <= 0) releaseAttack(enemy, audio);
        return;
      }

      const gap = distance(enemy, player);
      const sight = player.dash <= 0 && gap < 330 && (!concealed || gap < 39) && lineClear(enemy, player);
      const seen = sight && (enemy.type === 'garret' || gap < 39 ||
        (enemy.boss && gap < 248 ||
          enemy.type === 'wraith' && player.moving && gap < 173 ||
          enemy.type === 'knight' && coneHits(enemy, 224, 0.46) ||
          enemy.type === 'archer' && coneHits(enemy, 256, 0.72)));
      if (seen) {
        if (!enemy.aware && alarm <= 0) audio.playAlertHorn();
        enemy.aware = true;
        enemy.memory = 3.4;
        alarm = Math.max(alarm, 3);
      } else {
        enemy.memory -= dt;
        enemy.aware = enemy.aware && enemy.memory > 0;
      }

      if (enemy.aware && sight && gap <= enemy.range && enemy.cooldown <= 0) {
        enemy.facing = direction(enemy, player);
        enemy.windup = enemy.type === 'warlord' ? 0.69 : enemy.type === 'mage' ? 0.66 : 0.45;
        enemy.combo = enemy.type === 'garret' ? 1 : 0;
        return;
      }
      if (enemy.aware) {
        if (sight && (gap > enemy.range * 0.69 || enemy.cooldown > 0 && gap > 57)) {
          seek(enemy, player, enemy.speed, dt);
        }
        return;
      }
      if (!enemy.patrol && !enemy.speed) return;
      const end = enemy.patrol && enemy.patrolEnd ? { x: enemy.patrol[0], y: enemy.patrol[1] } : enemy.home;
      if (distance(enemy, end) > 8) {
        seek(enemy, end, enemy.speed * 0.63, dt);
      } else if (enemy.patrol) {
        enemy.patrolEnd = !enemy.patrolEnd;
      } else {
        enemy.facing = Math.PI / 2;
      }
    }

    function updateHazards(dt) {
      for (const bolt of bolts) {
        if (bolt.life <= 0) continue;
        bolt.x += Math.cos(bolt.angle) * 445 * dt;
        bolt.y += Math.sin(bolt.angle) * 445 * dt;
        bolt.life -= dt;
        if (!openPath(bolt.x, bolt.y, 0, false)) bolt.life = 0;
        if (bolt.life > 0 && distance(bolt, player) < 22 && player.dash <= 0) {
          hurtPlayer(bolt.damage);
          bolt.life = 0;
        }
      }
      bolts = bolts.filter((bolt) => bolt.life > 0);
      for (const ring of rings) {
        ring.age += dt;
        const gap = distance(player, ring);
        const radius = (ring.age - 0.56) * 228;
        if (!ring.hit && ring.age >= 0.56 && Math.abs(gap - radius) < 21 && player.dash <= 0) {
          hurtPlayer(ring.damage);
          ring.hit = true;
        }
      }
      rings = rings.filter((ring) => ring.age < 1.15);
    }

    function brazierAngle(brazier) {
      return brazier.angle + time * brazier.speed;
    }

    function update(dt, keys, audio) {
      time += dt;
      messageTimer -= dt;
      alarm = Math.max(0, alarm - dt);
      player.invulnerability = Math.max(0, player.invulnerability - dt);
      player.slash = Math.max(0, player.slash - dt);
      player.bite = Math.max(0, player.bite - dt);
      if (dawn !== null) {
        dawn -= dt;
        if (dawn <= 0) return { outcome: 'loss', reason: 'dawn', score };
      }
      const beforeMoveX = player.x;
      const beforeMoveY = player.y;
      const wasDashing = player.dash > 0;
      advanceCassianAction(dt);
      const outcome = movePlayer(dt, keys, audio);
      const dashing = wasDashing || player.dash > 0;
      const travel = dashing ? 0 : Math.hypot(player.x - beforeMoveX, player.y - beforeMoveY);
      advanceCassianPose(dt, travel);
      if (outcome) return outcome;
      if (!duel && slain >= 2 && player.y < 491 && !player.dash) {
        duel = true;
        audio.setMode(DUEL_SCORE);
        announce('Garret guards his daughter’s soul. Parry his blade.', 4.5);
      }

      const inLight = player.dash <= 0 &&
        braziers.some((brazier) => coneHits(brazier, 205, 0.43, brazierAngle(brazier)));
      if (inLight) {
        if (alarm <= 0) audio.playAlertHorn();
        alarm = Math.max(alarm, 2.4);
      }
      if (player.charge < 3) {
        player.recharge = Math.max(0, player.recharge + (inLight ? -dt : dt));
        if (player.recharge >= MIST_RECHARGE) {
          player.charge += 1;
          player.recharge = player.charge < 3 ? player.recharge - MIST_RECHARGE : 0;
        }
      }
      const concealed = player.dash > 0 || !inLight && inShadow();
      visibility = concealed ? 'shadow' : inLight ? 'lit' : 'clear';
      for (const enemy of enemies) updateEnemy(enemy, dt, audio, concealed);
      if (alarm > 0) player.hp = Math.max(0, player.hp - dt * 0.8);
      updateHazards(dt);
      if (player.hp <= 0) return { outcome: 'loss', reason: 'blood', score };
      for (const fx of effects) fx.life -= dt;
      effects = effects.filter((fx) => fx.life > 0);
      biteTarget = player.dash <= 0 && player.bite <= 0 ? findBiteTarget() : null;
      if (biteButton) biteButton.classList.toggle('bite-ready', Boolean(biteTarget));

      const follow = 1 - Math.exp(-11 * dt);
      camera.x += (clamp(player.x - viewportW / 2, 0, WORLD_W - viewportW) - camera.x) * follow;
      camera.y += (clamp(player.y - viewportH * 0.56, 0, WORLD_H - viewportH) - camera.y) * follow;
      return null;
    }

    function sprite(art, key) {
      return art.getImage(key) || art.getPixelSprite(key);
    }

    function stamp(g, art, key, x, y, size, { angle = 0, flip = false, opacity = 1, feet = false } = {}) {
      const im = sprite(art, key);
      if (!im) return;
      const width = Math.round(size * im.width / im.height);
      g.save();
      g.globalAlpha *= opacity;
      g.translate(Math.round(x), Math.round(y));
      if (angle) g.rotate(angle);
      if (flip) g.scale(-1, 1);
      g.drawImage(im, -Math.round(width / 2), feet ? -size : -Math.round(size / 2), width, size);
      g.restore();
    }

    function buildLayout(art) {
      const floor = art.getImage('tileObsidianFloor');
      const wall = art.getImage('tileObsidianWall');
      if (!floor || !wall) return;
      layout = document.createElement('canvas');
      layout.width = WORLD_W;
      layout.height = WORLD_H;
      const g = layout.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#0a070f';
      g.fillRect(0, 0, WORLD_W, WORLD_H);

      const repeat = document.createElement('canvas');
      repeat.width = 336;
      repeat.height = 252;
      repeat.getContext('2d').drawImage(floor, 0, 0, repeat.width, repeat.height);
      const tile = g.createPattern(repeat, 'repeat');
      for (const room of rooms) {
        g.fillStyle = tile;
        g.fillRect(room.x, room.y, room.w, room.h);
        if (!room.name) continue;
        if (room.name !== 'Obsidian Keep') {
          const segments = Math.round(room.w / 100);
          const width = room.w / segments;
          for (let i = 0; i < segments; i += 1) {
            g.drawImage(wall, Math.round(room.x + i * width), room.y - 41, Math.ceil(width), 59);
          }
        }
        g.strokeStyle = '#362333';
        g.lineWidth = 2;
        g.strokeRect(room.x + 0.5, room.y + 0.5, room.w - 1, room.h - 1);
      }

      for (const [x, y] of shadowNiches) {
        const shadow = g.createRadialGradient(x, y, 12, x, y, 74);
        shadow.addColorStop(0, 'rgba(9, 8, 26, .93)');
        shadow.addColorStop(0.7, 'rgba(10, 9, 32, .67)');
        shadow.addColorStop(1, 'rgba(10, 9, 32, 0)');
        g.fillStyle = shadow;
        g.fillRect(x - 74, y - 74, 148, 148);
      }
      for (const room of rooms.filter((room) => room.name)) {
        const x = room.x + room.w / 2;
        const y = room.y + room.h - 33;
        g.font = 'small-caps bold 18px Georgia';
        g.textAlign = 'center';
        g.strokeStyle = '#100a12';
        g.lineWidth = 4;
        g.strokeText(room.name, x, y);
        g.fillStyle = '#b8a0a3';
        g.fillText(room.name, x, y);
      }
    }

    function drawCone(g, art, point, angle, reach) {
      const cone = sprite(art, 'fxLanternCone');
      if (!cone) return;
      let length = reach;
      for (let gap = 18; gap < reach; gap += 18) {
        if (!openPath(point.x + Math.cos(angle) * gap, point.y + Math.sin(angle) * gap, 0, false)) {
          length = gap;
          break;
        }
      }
      g.save();
      g.translate(point.x, point.y);
      g.rotate(angle);
      g.drawImage(cone, 0, -length * 0.46, length, length * 0.92);
      g.restore();
    }

    function drawGate(g, art, gate) {
      if (gate.cathedral && slain >= 2) return;
      const im = sprite(art, 'propIronGrate');
      if (!im) return;
      if (gate.cathedral) {
        for (let x = gate.x; x < gate.x + gate.w; x += 104) {
          g.drawImage(im, x, gate.y - 21, 104, 62);
        }
      } else {
        for (let i = 0; i < 3; i += 1) {
          g.drawImage(im, gate.x - 13, gate.y - 17 + i * 58, 58, 72);
        }
      }
    }

    function drawEnemy(g, art, enemy) {
      if (enemy.down) {
        if (enemy.type === 'garret' && slain < 3) {
          stamp(g, art, enemy.art, enemy.x, enemy.y, enemy.size - 14, { feet: true, opacity: 0.72 });
        }
        return;
      }
      if (enemy.type === 'garret' && !duel) {
        stamp(g, art, enemy.art, enemy.x, enemy.y, enemy.size, { feet: true });
        return;
      }
      const windup = enemy.windup > 0;
      const facingLeft = Math.cos(enemy.facing) < -0.1;
      const hover = enemy.type === 'wraith' ? Math.round(Math.sin(time * 6 + enemy.home.x) * 6) : 0;
      const step = !windup && enemy.aware && enemy.recovery <= 0 && enemy.stunned <= 0 ?
        Math.round(Math.sin(time * 18 + enemy.home.x) * 2.5) : 0;
      stamp(g, art, enemy.art, enemy.x, enemy.y + hover + step, enemy.size,
        { feet: true, flip: facingLeft, opacity: enemy.hitFlash > 0 ? 0.65 : 1 });
      if (windup || enemy.stunned > 0 || enemy.recovery > 0 && enemy.boss) {
        const key = windup ? 'hudAlertGemAmber' : 'fxFangsPrompt';
        stamp(g, art, key, enemy.x, enemy.y - enemy.size - 8, 17);
      }
      if (enemy.boss && enemy.aware) {
        drawBar(g, enemy.x - 37, enemy.y + 5, 74, 6, enemy.hp / enemy.maxHp, '#e24468');
      }
    }

    function drawPlayer(g, art) {
      const atlas = art.getImage('vampireG3Rig');
      const facing = player.action?.heading ?? player.visualHeading;
      const opacity = visibility === 'shadow' ? 0.79 : 1;
      if (atlas?.width === CASSIAN_ATLAS.columns * CASSIAN_ATLAS.width &&
          atlas.height === CASSIAN_ATLAS.rows * CASSIAN_ATLAS.height) {
        drawCassianPose(g, atlas, facing, opacity);
        return;
      }

      // The preceding art remains available while the animation atlas is loading.
      let key = 'vampireIdle';
      if (player.dash > 0) key = 'vampireMist';
      else if (player.bite > 0.27) key = 'vampireBite';
      else if (player.slash > 0.2) key = 'vampireSlash';
      else if (Math.sin(player.facing) < -0.7) key = 'vampireNorth';
      else if (player.moving) key = Math.floor(time * 11) % 2 ? 'vampireWalk1' : 'vampireWalk2';
      if (!sprite(art, key)) key = player.bite > 0.27 ? 'vampireSlash' : 'vampireIdle';
      const bob = player.moving && !player.dash ? Math.round(Math.sin(time * 18) * 2) : 0;
      const fallbackOpacity = player.dash > 0 ? 0.8 : player.invulnerability > 0.16 ? 0.57 : opacity;
      stamp(g, art, key, player.x, player.y + bob, player.dash > 0 ? 67 : 75, {
        feet: true, flip: Math.abs(Math.cos(player.facing)) > 0.36 ? Math.cos(player.facing) < 0 : player.mirror,
        opacity: fallbackOpacity
      });
    }

    function drawCassianPose(g, atlas, facing, opacity) {
      const octant = (Math.round(facing / (Math.PI / 4)) % 8 + 8) % 8;
      const [view, mirror] = CASSIAN_HEADINGS[octant];
      const { columns, width, height, pivotX, pivotY, posesPerView } = CASSIAN_ATLAS;
      const drawFrame = (clip, phase, alpha) => {
        const [start, frames] = CASSIAN_CLIPS[clip];
        if (alpha < 0.02) return;
        const frame = view * posesPerView + start + Math.min(frames - 1, Math.floor(phase * frames));
        g.globalAlpha = layerAlpha * opacity * alpha;
        g.drawImage(atlas, frame % columns * width, Math.floor(frame / columns) * height,
          width, height, -pivotX, -pivotY, width, height);
      };
      const layerAlpha = g.globalAlpha;
      g.save();
      g.translate(Math.round(player.x), Math.round(player.y));
      g.scale(mirror, 1);

      const age = player.defeatAge;
      if (age !== null) {
        const progress = Math.min(1, age / DEFEAT_DURATION);
        const grounded = clamp((progress - 0.61) / 0.24, 0, 1);
        if (grounded < 1) {
          g.save();
          g.rotate((1 - (1 - progress) ** 2) * 1.03);
          drawFrame('defeat', Math.min(1, progress / 0.77), 1 - grounded);
          g.restore();
        }
        if (grounded > 0) {
          g.save();
          g.translate(23, 3);
          drawFrame('fallen', 0, grounded);
          g.restore();
        }
      } else {
        const action = player.action;
        const phase = action ? action.age / action.duration : 0;
        // Gameplay contact and audio are immediate. Blend the late follow-through back into locomotion.
        const recovery = action ? clamp((phase - 0.73) / 0.27, 0, 1) : 1;
        const blend = recovery * recovery * (3 - 2 * recovery);
        const idlePhase = (time * 0.76) % 1;
        const stridePhase = player.stride / CASSIAN_STRIDE;
        if (action) {
          if (player.strideMix > 0.5) drawFrame('walk', stridePhase, blend);
          else drawFrame('idle', idlePhase, blend);
          drawFrame(action.clip, phase, 1 - blend);
        } else {
          drawFrame('idle', idlePhase, 1 - player.strideMix);
          drawFrame('walk', stridePhase, player.strideMix);
        }
      }
      g.restore();
    }

    function drawBar(g, x, y, w, h, fraction, color) {
      g.fillStyle = '#110b16';
      g.fillRect(x, y, w, h);
      g.fillStyle = color;
      g.fillRect(x + 1, y + 1, Math.round((w - 2) * clamp(fraction, 0, 1)), h - 2);
      g.strokeStyle = '#87565b';
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    function drawText(g, text, x, y, size, color = '#f3e0be', align = 'left') {
      g.font = `bold ${size}px Georgia`;
      g.textAlign = align;
      g.fillStyle = color;
      g.fillText(text, x, y);
    }

    function drawHUD(g, art, w, h) {
      const hud = g.createLinearGradient(0, 0, 0, 73);
      hud.addColorStop(0, '#251624');
      hud.addColorStop(1, '#100b14');
      g.fillStyle = hud;
      g.fillRect(0, 0, w, 73);
      g.fillStyle = '#936747';
      g.fillRect(0, 70, w, 2);
      stamp(g, art, 'hudBloodVial', 39, 36, 45);
      drawText(g, `BLOOD  ${Math.ceil(player.hp)} / 100`, 68, 30, 17);
      drawBar(g, 68, 41, 136, 12, player.hp / 100, '#de3656');
      drawText(g, 'MIST', 228, 30, 14, '#caacaa');
      for (let i = 0; i < 3; i += 1) {
        stamp(g, art, i < player.charge ? 'hudMistOrb' : 'hudMistOrbEmpty', 235 + i * 26, 48, 21);
      }

      const hunting = alarm > 0;
      const state = duel ? 'LOCKDOWN' : hunting ? 'HUNTING' : visibility === 'shadow' ? 'IN SHADOW' : 'UNSEEN';
      stamp(g, art, duel ? 'hudAlertGemCrimson' : hunting ? 'hudAlertGemAmber' : 'hudAlertGemBlue', 358, 38, 26);
      drawText(g, state, 377, 43, 15);
      drawText(g, `CULT GENERALS  ${slain} / 3`, 575, 28, 17, '#f3e0be', 'center');

      const remaining = nearestGeneral();
      if (remaining) {
        stamp(g, art, 'projCrossbowBolt', 484, 47, 8, { angle: direction(player, remaining) });
        drawText(g, remaining.name, 500, 52, 15, '#cfb7b8');
      }
      const deadline = dawn === null ? 'DAWN —' : `DAWN ${Math.floor(Math.ceil(Math.max(0, dawn)) / 60)}:${String(Math.ceil(Math.max(0, dawn)) % 60).padStart(2, '0')}`;
      drawText(g, deadline, w - 36, 57, 19, dawn !== null && dawn < 25 ? '#ff7281' : '#efbe88', 'right');
      drawText(g, `GLORY  ${score}`, w - 195, 57, 15, '#ceb79f', 'right');

      if (messageTimer > 0) {
        g.save();
        g.font = 'bold 18px Georgia';
        const width = g.measureText(message).width + 40;
        const top = document.body.classList.contains('touch-active') ? 86 : h - 47;
        g.fillStyle = 'rgba(17, 11, 22, .91)';
        g.fillRect((w - width) / 2, top, width, 32);
        drawText(g, message, w / 2, top + 22, 18, '#f5dab5', 'center');
        g.restore();
      }
    }

    function nearestGeneral() {
      const names = { warlord: 'West Cloister', mage: 'East Reliquary', garret: 'Velvet Throne' };
      const living = enemies.filter((enemy) => enemy.boss && !enemy.down &&
        (enemy.type !== 'garret' || slain >= 2));
      if (wardBroken && duel) return { ...altar, name: 'Brass Reliquary' };
      const nearest = living.reduce((best, enemy) =>
        !best || distance(player, enemy) < distance(player, best) ? enemy : best, null);
      return nearest && { ...nearest, name: names[nearest.type] };
    }

    function render(g, w, h, art) {
      g.imageSmoothingEnabled = false;
      if (!layout) buildLayout(art);
      const x = Math.round(camera.x);
      const y = Math.round(camera.y);
      g.fillStyle = '#0a070f';
      g.fillRect(0, 0, w, h);
      if (layout) g.drawImage(layout, x, y, w, h, 0, 0, w, h);

      g.save();
      g.translate(-x, -y);
      stamp(g, art, 'keepBloodSeal', 1120, 294, 190, { opacity: wardBroken ? 0.6 : 0.87 });
      for (const enemy of enemies) {
        if (enemy.type === 'knight' && !enemy.down && enemy.stunned <= 0) {
          drawCone(g, art, enemy, enemy.facing, 224);
        }
      }
      for (const brazier of braziers) drawCone(g, art, brazier, brazierAngle(brazier), 205);
      for (const gate of gates) drawGate(g, art, gate);
      for (const ring of rings) {
        const size = ring.age < 0.56 ? 104 : Math.max(18, 2 * (ring.age - 0.56) * 228);
        stamp(g, art, 'fxFireRing', ring.x, ring.y, Math.round(size), {
          opacity: ring.age < 0.56 ? 0.33 + Math.sin(ring.age * 24) * 0.12 : 0.76
        });
      }

      const layers = enemies.map((enemy) => ({ y: enemy.y, draw: () => drawEnemy(g, art, enemy) }));
      for (const [px, py] of pillars) {
        layers.push({ y: py + 8, draw: () => stamp(g, art, 'propPillar', px, py + 8, 110, { feet: true }) });
      }
      for (const [cx, cy] of candles) {
        const key = Math.floor(time * 8 + cx) % 2 ? 'propCorpseCandle' : 'propCorpseCandle2';
        layers.push({ y: cy, draw: () => stamp(g, art, key, cx, cy, 45, { feet: true }) });
      }
      for (const brazier of braziers) {
        layers.push({ y: brazier.y, draw: () => stamp(g, art, 'propGargoyleBrazier', brazier.x, brazier.y, 59, { feet: true }) });
      }
      layers.push({ y: altar.y, draw: () => {
        if (slain === 3) return;
        stamp(g, art, 'propReliquary', altar.x, altar.y, 85, { feet: true });
        if (!wardBroken) stamp(g, art, 'hudMistOrb', altar.x, altar.y - 87, 23);
      } });
      layers.push({ y: player.y, draw: () => drawPlayer(g, art) });
      layers.sort((a, b) => a.y - b.y);
      for (const layer of layers) layer.draw();

      for (const bolt of bolts) stamp(g, art, 'projCrossbowBolt', bolt.x, bolt.y - 12, 9, { angle: bolt.angle });
      for (const fx of effects) {
        const key = fx.key === 'fxSlashCrimson' && fx.life < 0.13 ? 'fxSlashCrimson2' : fx.key;
        stamp(g, art, key, fx.x, fx.y, fx.size, { angle: fx.angle, opacity: fx.life / fx.duration });
      }
      if (biteTarget) stamp(g, art, 'fxFangsPrompt', biteTarget.x, biteTarget.y - biteTarget.size - 29, 24);
      g.restore();
      drawHUD(g, art, w, h);
    }

    return {
      get musicMode() { return duel ? DUEL_SCORE : STEALTH_SCORE; },
      init, update, render,
      beginOutcomeAnimation(result) {
        if (result?.outcome !== 'loss') return 0;
        player.action = null;
        player.defeatAge = 0;
        biteTarget = null;
        if (biteButton) biteButton.classList.remove('bite-ready');
        return DEFEAT_DURATION;
      },
      updateOutcomeAnimation(dt) {
        if (player.defeatAge !== null) player.defeatAge = Math.min(DEFEAT_DURATION, player.defeatAge + dt);
      },
      onPause() {
        slashHeld = dashHeld = biteHeld = false;
        if (biteButton) biteButton.classList.remove('bite-ready');
      },
      cleanup() {
        if (biteButton) biteButton.classList.remove('bite-ready');
        biteButton = null;
      },
      getOverlayCopy(type, result, best) {
        if (type === 'pause') {
          return {
            title: 'THE KEEP WAITS',
            subtitle: 'Mission III — Ashes of the Velvet Throne',
            noteHtml: 'Slip through either iron grate with <b>Mist Dash</b>. Approach an unaware sentry from behind or parry an attack to set up a <b>Bite</b> and recover blood.<br><br>Once both generals fall, you have <b>90 seconds</b> to confront Garret before dawn.',
            primaryLabel: 'RESUME INFILTRATION'
          };
        }
        if (type === 'victory') {
          return {
            title: result.heroic ? 'THE CHILD IS FREED' : 'THE BLOOD-SEAL IS BROKEN',
            subtitle: `Mission III Complete · Glory ${result.score} · Best ${best}`,
            noteHtml: (result.heroic ?
              'The Brass Reliquary bursts and Garret hears his daughter’s voice one last time. ' :
              'Garret falls to Cassian’s thirst. The Blood-Seal fractures as his daughter’s voice fades. ') +
              'Dawn pierces the rose window. As Cassian turns to ash, Carmilla sends Kaelen’s spirit into <b>Mission IV — The Shattered Ossuary</b>.',
            primaryLabel: 'RETURN TO MAP'
          };
        }
        return {
          title: result.reason === 'dawn' ? 'DAWN HAS BROKEN' : 'CASSIAN HAS FALLEN',
          subtitle: `Mission III · Final Glory ${result.score}`,
          noteHtml: result.reason === 'dawn' ?
            'Dawn reached the cathedral before the Blood-Seal fell. Head north as soon as the second general drops.' :
            'Cassian’s blood ran dry. Use shadow niches to lose patrols and use <b>Bite</b> after a parry to recover health.',
          primaryLabel: 'STALK THE KEEP AGAIN'
        };
      }
    };
  }

  window.ThanatosMissions[3] = createController();
})();
