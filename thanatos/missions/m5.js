(() => {
  'use strict';

  window.ThanatosMissions = window.ThanatosMissions || {};

  const WORLD_W = 3200;
  const GROUND = 510;
  const BANNER_X = 340;
  const ARMOR_MAX = 100;
  const CORE_ARMOR = 285;
  const SHIELD_REACH = 57;
  const HAND_Y = 381;
  const THUNDER_RANGE = 630;
  const BRIDGE_TILE = 230;
  const DECK_ART_TOP = GROUND - 16;
  const STRIDE_STEP = 59;
  const STRIDE_CYCLE = STRIDE_STEP * 2;
  const PLANTED_FRACTION = 0.6;
  const TITAN_SCALE = 0.48;
  const FOOT_Y = -12;
  // Source rectangle and local joint of each cutout in titan_stride_parts.png.
  const TORSO = [0, 0, 260, 310, 150, 185];
  const LEG = [[260, 0, 80, 121, 27, 15], [340, 0, 72, 91, 29, 20], [260, 121, 101, 44, 31, 17]];
  const UPPER_LEG = 42;
  const LOWER_LEG = 31;
  const ACTION_W = 216;
  const ACTION_H = 184;
  const ACTION_FLOOR = 174;
  const CAST_PALM_X = 70;
  const CAST_PALM_Y = -129;
  const OUTCOME_HOLD = 0.64;
  const ACTIONS = { windup: 0, release: 1, stomp: 3, hit: 4, knee: 5, recover: 6, stompReady: 7, stompRecover: 8 };
  // Three rows of action silhouettes and guard art, then the separated idle layers.
  const BODY = [0, 552, 260, 310, 150, 185];
  const CLOTH = [260, 552, 260, 310, 150, 185];
  const HEAD = [520, 552, 94, 86, 43, 63];
  const GUARD_COLUMN = 432;
  const TYPES = {
    golem: { sprite: 'siegeGolem', height: 113, hp: 76, speed: 68, score: 125, metal: true },
    ballista: { sprite: 'dreadBallista', height: 98, hp: 71, speed: 48, score: 155, metal: true },
    manticore: { sprite: 'nighonManticore', height: 102, hp: 53, speed: 137, score: 185 },
    boss: { sprite: 'obsidianColossus', height: 220, hp: CORE_ARMOR, speed: 46, score: 1650, metal: true }
  };
  const ATTACKS = [
    { kind: 'cannon', windup: 1, message: 'CANNON VOLLEY  ·  Face the Colossus and hold SHIELD' },
    { kind: 'slam', windup: 1.24, message: 'FISSURE SLAM  ·  Back away or interrupt it with STOMP' },
    { kind: 'escort', windup: 1.35, message: 'REAR FLANK  ·  Manticores are heading for Isolde' }
  ];
  const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
  const toward = (from, to) => Math.sign(to - from) || 1;
  const ease = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };

  function footPose(phase) {
    const reach = STRIDE_CYCLE * PLANTED_FRACTION / 2;
    // During stance, the offset recedes by the same distance that the Titan advances.
    if (phase < PLANTED_FRACTION) return { x: reach - phase * STRIDE_CYCLE, lift: 0, roll: 0 };
    const swing = (phase - PLANTED_FRACTION) / (1 - PLANTED_FRACTION);
    const ease = swing * swing * (3 - 2 * swing);
    const arc = Math.sin(Math.PI * swing);
    return { x: (2 * ease - 1) * reach, lift: arc * 15, roll: -arc * Math.cos(Math.PI * swing) * 0.31 };
  }

  function makeEnemy(type, x, dive = 0, rear = false) {
    return {
      ...TYPES[type], type, x, y: GROUND - (dive ? 235 : 0), maxHp: TYPES[type].hp,
      facing: -1, cooldown: type === 'ballista' ? 0.9 : 0.36, stun: 0, flash: 0,
      dive, diveTotal: dive, rear, bob: 0, attack: null, knockback: 0
    };
  }

  function controller() {
    let p, banner, units, shots, effects, boss, strike, pointer;
    let time, view, viewWidth, score, stage, phaseClock, stormClock, bannerQuiet, shake, note, noteTime;
    let finished;

    function init(_ctx, width) {
      p = {
        x: 560, vx: 0, aim: 0.13, facing: 1, shield: false, charge: 0, hp: ARMOR_MAX,
        thunder: 0, stomp: 0, pose: '', poseTime: 0, step: 0, hurt: 0,
        strideFacing: 1, strideWeight: 0, guardWeight: 0, guardKick: 0,
        turn: 0, windup: '', castLean: 0, fall: null
      };
      banner = { hp: 100, flash: 0 };
      units = [makeEnemy('golem', 1120), makeEnemy('golem', 1305), makeEnemy('ballista', 1505)];
      shots = [];
      effects = [];
      boss = strike = pointer = null;
      time = view = score = bannerQuiet = shake = 0;
      stage = 'vanguard';
      phaseClock = 0;
      stormClock = 8.5;
      viewWidth = width;
      finished = false;
      announce('March east. Hold SHIELD to send ballista bolts back.', 5);
    }

    function announce(message, seconds = 3.15) {
      note = message;
      noteTime = seconds;
    }

    function addEffect(kind, x, y, size, life, dx = 0, dy = 0) {
      effects.push({ kind, x, y, size, life, duration: life, dx, dy });
    }

    function charge(amount) {
      p.charge = Math.min(100, p.charge + amount);
    }

    function hurtTitan(damage, audio) {
      if (p.hurt > 0 || p.hp <= 0) return;
      p.hp = Math.max(0, p.hp - damage);
      p.hurt = 0.53;
      shake = Math.max(shake, 5.1);
      audio.playStoneShatter();
    }

    function hurtBanner(damage, audio) {
      if (banner.hp <= 0 || banner.flash > 0) return;
      banner.hp = Math.max(0, banner.hp - damage);
      banner.flash = 0.37;
      bannerQuiet = 0;
      audio.playBannerHit();
    }

    function hit(enemy, damage, audio, finisher = false) {
      if (enemy === boss && boss.exposed) {
        if (!finisher) return;
        boss.hp = 0;
        finished = true;
        score += boss.score;
        shake = 17;
        addEffect('spark', boss.x, GROUND - 121, 242, 0.88);
        audio.playThunderbolt(true);
        return;
      }
      if (enemy.hp <= 0) return;
      enemy.hp = Math.max(0, enemy.hp - damage);
      enemy.flash = 0.18;
      if (enemy.hp > 0) return;
      if (enemy === boss) {
        boss.exposed = true;
        boss.attack = null;
        charge(100);
        shake = 12;
        announce('CORE EXPOSED  ·  Finish Kragg with an Overcharged Thunderbolt', 6);
        audio.playColossusAlarm();
        return;
      }
      score += enemy.score;
      addEffect('spark', enemy.x, targetY(enemy), enemy.height * 0.92, 0.39);
      audio.playStoneShatter();
    }

    function targets() {
      return units.filter((unit) => unit.hp > 0).concat(boss && !finished ? [boss] : []);
    }

    function targetY(enemy) {
      return enemy.y - enemy.height * (enemy === boss ? 0.49 : 0.48);
    }

    function lightningLine(from, to, energized) {
      addEffect('bolt', from.x, from.y, energized ? 38 : 25, energized ? 0.37 : 0.24, to.x - from.x, to.y - from.y);
    }

    function chooseFirstTarget(origin, angle, precise, range) {
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      let choice = null;
      let rank = Infinity;
      for (const enemy of targets()) {
        const x = enemy.x - origin.x;
        const y = targetY(enemy) - origin.y;
        const along = x * dx + y * dy;
        const offAxis = Math.abs(x * dy - y * dx);
        if (along < -35 || Math.hypot(x, y) > range || offAxis > (precise ? 54 : 128)) continue;
        const priority = along + (precise ? offAxis * 2.2 : 0);
        if (priority < rank) {
          choice = enemy;
          rank = priority;
        }
      }
      return choice;
    }

    function thunder(audio, precise) {
      const energized = p.charge >= 100;
      const range = energized ? THUNDER_RANGE + 102 : THUNDER_RANGE;
      if (energized) p.charge = 0;
      p.thunder = 0.55;
      if (!p.shield) {
        p.pose = 'throw';
        p.poseTime = 0.31;
      }
      const mouseX = pointer ? pointer.x + view : null;
      const pointerOnField = !precise && pointer && Math.hypot(mouseX - p.x, pointer.y - HAND_Y) > 30;
      if (pointerOnField && !p.shield) p.facing = toward(p.x, mouseX);
      const origin = { x: p.x + p.facing * 34, y: HAND_Y };
      let angle = p.facing > 0 ? p.aim : Math.PI - p.aim;
      if (pointerOnField) {
        const dx = p.facing * (mouseX - origin.x);
        let elevation = Math.atan2(pointer.y - origin.y, Math.max(20, dx));
        elevation = clamp(elevation, -1.28, 1.24);
        angle = p.facing > 0 ? elevation : Math.PI - elevation;
      }
      p.castLean = Math.atan2(Math.sin(angle), p.facing * Math.cos(angle)) * 0.11;
      audio.playThunderbolt(energized);
      let target = chooseFirstTarget(origin, angle, Boolean(precise || pointerOnField), range);
      // The damage ray retains its original origin. The flash comes from the visible palm.
      const cos = Math.cos(p.castLean);
      const sin = Math.sin(p.castLean);
      const hand = p.shield ? { x: p.x + p.facing * SHIELD_REACH, y: HAND_Y } : {
        x: p.x + p.facing * (CAST_PALM_X * cos - CAST_PALM_Y * sin),
        y: GROUND + 1 + CAST_PALM_X * sin + CAST_PALM_Y * cos
      };
      let from = hand;
      const visited = [];
      for (let hop = 0; hop < 3 && target; hop += 1) {
        const next = { x: target.x, y: targetY(target) };
        lightningLine(from, next, energized);
        addEffect('spark', next.x, next.y, energized ? 113 : 71, 0.29);
        const base = energized ? 63 : 40;
        hit(target, Math.round(base * (1 - hop * 0.2)) + (target.metal ? 11 : 0), audio, energized);
        if (!energized && !finished) charge(10);
        visited.push(target);
        from = next;
        let gap = energized ? 322 : 238;
        let nearest = null;
        for (const other of targets()) {
          if (visited.includes(other)) continue;
          const distance = Math.hypot(other.x - from.x, targetY(other) - from.y);
          if (distance < gap) {
            nearest = other;
            gap = distance;
          }
        }
        target = nearest;
      }
      if (!visited.length) {
        lightningLine(hand, {
          x: origin.x + Math.cos(angle) * range * 0.73,
          y: clamp(origin.y + Math.sin(angle) * range * 0.73, 83, GROUND - 4)
        }, energized);
      }
      if (energized) shake = Math.max(shake, 6.5);
    }

    function stomp(audio) {
      const energized = p.charge >= 100 && !boss?.exposed;
      if (energized) p.charge = 0;
      const reach = energized ? 270 : 203;
      p.stomp = 2.65;
      if (!p.shield) {
        p.pose = 'stomp';
        p.poseTime = 0.46;
      }
      shake = Math.max(shake, energized ? 10 : 7);
      audio.playSeismicStomp(energized);
      addEffect('stomp', p.x, GROUND - 20, reach * 2, 0.58);
      for (const enemy of targets()) {
        if (Math.abs(enemy.x - p.x) > reach || enemy.y < GROUND - 59) continue;
        if (enemy === boss) {
          if (boss.attack?.kind === 'slam') {
            boss.attack = null;
            boss.cooldown = 1.77;
            announce('Fissure interrupted. Strike the Colossus!');
          }
        } else {
          enemy.stun = 0.93;
          enemy.attack = null;
          enemy.knockback = toward(p.x, enemy.x) * (energized ? 270 : 188);
        }
        hit(enemy, energized ? 72 : 41, audio);
        if (!energized) charge(8);
      }
      for (const shot of shots) {
        if (!shot.reflected && Math.abs(shot.x - p.x) < reach && shot.y >= GROUND - 89) shot.life = 0;
      }
    }

    function updateTitan(dt, keys, audio) {
      const wasShielding = p.shield;
      const oldFacing = p.facing;
      p.shield = Boolean(keys.KeyX || keys.ShiftLeft || keys.ShiftRight);
      const direction = Number(Boolean(keys.ArrowRight || keys.KeyD)) - Number(Boolean(keys.ArrowLeft || keys.KeyA));
      const up = keys.ArrowUp || keys.KeyW;
      const down = keys.ArrowDown || keys.KeyS;
      // Directional input takes over from mouse aim until the mouse moves again.
      if (direction || up || down) pointer = null;
      if (direction && !(p.shield && wasShielding)) p.facing = direction;
      const speed = 175 * (p.shield ? 0.45 : 1);
      p.vx += (direction * speed - p.vx) * Math.min(1, dt * (p.shield ? 15 : 11));
      p.vx = clamp(p.vx, -speed, speed);
      const previousX = p.x;
      p.x = clamp(p.x + p.vx * dt, 110, 3070);
      p.aim += ((up ? -0.53 : down ? 0.49 : 0.13) - p.aim) * Math.min(1, dt * 15);
      p.thunder = Math.max(0, p.thunder - dt);
      p.stomp = Math.max(0, p.stomp - dt);
      p.poseTime = Math.max(0, p.poseTime - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      p.turn = Math.max(0, p.turn - dt);
      p.guardKick = Math.max(0, p.guardKick - dt);
      p.guardWeight += (Number(p.shield) - p.guardWeight) * (1 - Math.exp(-(p.shield ? 26 : 18) * dt));
      const travelled = Math.abs(p.x - previousX);
      const walking = travelled > dt * 16;
      p.strideWeight += (Number(walking) - p.strideWeight) * (1 - Math.exp(-18 * dt));
      if (p.strideWeight > 0.99) p.strideWeight = 1;
      if (travelled > 0) p.strideFacing = Math.sign(p.x - previousX);
      const previousStep = Math.floor(p.step / STRIDE_STEP);
      p.step += travelled;
      if (walking && Math.floor(p.step / STRIDE_STEP) > previousStep) {
        const contact = p.x + p.strideFacing * (footPose(0).x - (p.step % STRIDE_STEP));
        audio.playTitanStep();
        shake = Math.max(shake, 1.6);
        addEffect('footfall', contact, GROUND + 1, 46, 0.27);
      }
      if (boss?.exposed) charge(52 * dt);
      if (keys.Space && p.thunder <= 0) thunder(audio, Boolean(up || down));
      if (!finished && keys.KeyR && p.stomp <= 0) stomp(audio);
      // Held attacks show the next ready beat during their existing cooldown.
      p.windup = keys.Space && p.thunder <= 0.145 ? 'throw' : keys.KeyR && p.stomp <= 0.17 ? 'stomp' : '';
      if (p.facing !== oldFacing) p.turn = 0.12;
    }

    function launchShot(x, y, targetX, targetHeight, kind, speed, damage) {
      const angle = Math.atan2(targetHeight - y, targetX - x);
      shots.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 4.5, damage, kind, reflected: false
      });
    }

    function cross(x0, x1, x) {
      return x >= Math.min(x0, x1) && x <= Math.max(x0, x1);
    }

    function shotAt(shot, x0, y0, x, top, bottom) {
      if (!cross(x0, shot.x, x)) return false;
      const y = y0 + (shot.y - y0) * ((x - x0) / (shot.x - x0 || 1));
      return y > top && y < bottom;
    }

    function reflect(shot, audio) {
      shot.reflected = true;
      shot.life = 4.5;
      shot.x = p.x + p.facing * (SHIELD_REACH + 5);
      const target = targets().filter((e) => p.facing * (e.x - shot.x) > 12)
        .sort((a, b) => Math.abs(a.x - shot.x) - Math.abs(b.x - shot.x))[0];
      const speed = Math.max(490, Math.hypot(shot.vx, shot.vy) * 1.16);
      const angle = target ? Math.atan2(targetY(target) - shot.y, target.x - shot.x) : p.facing > 0 ? 0 : Math.PI;
      shot.vx = Math.cos(angle) * speed;
      shot.vy = Math.sin(angle) * speed;
      shot.damage = shot.kind === 'barb' ? 35 : 66;
      charge(12);
      audio.playShieldBlock();
      p.guardKick = 0.18;
      addEffect('spark', shot.x, shot.y, 93, 0.29);
      shake = Math.max(shake, 2.8);
    }

    function updateShots(dt, audio) {
      for (const shot of shots) {
        if (shot.life <= 0) continue;
        const x0 = shot.x;
        const y0 = shot.y;
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.life -= dt;
        if (shot.reflected) {
          const target = targets().find((unit) =>
            shotAt(shot, x0, y0, unit.x, unit.y - unit.height, unit.y + 2));
          if (target) {
            hit(target, shot.damage, audio);
            shot.life = 0;
          }
          continue;
        }
        if (p.shield && shot.vx * p.facing < 0 &&
            shotAt(shot, x0, y0, p.x + p.facing * SHIELD_REACH, GROUND - 168, GROUND - 23)) {
          reflect(shot, audio);
          continue;
        }
        const nearTitan = shotAt(shot, x0, y0, p.x, GROUND - 150, GROUND);
        const nearBanner = shotAt(shot, x0, y0, BANNER_X, GROUND - 123, GROUND);
        if (nearTitan && (!nearBanner || Math.abs(p.x - x0) <= Math.abs(BANNER_X - x0))) {
          hurtTitan(shot.damage, audio);
          shot.life = 0;
        } else if (nearBanner) {
          hurtBanner(shot.damage, audio);
          shot.life = 0;
        }
      }
      shots = shots.filter((shot) => shot.life > 0 && shot.x > -40 && shot.x < WORLD_W + 40 &&
        shot.y >= 71 && shot.y < GROUND + 24);
    }

    function flank(audio, count = 2, escort = false) {
      const starts = count > 1 ? [740, 620] : [724];
      for (const [index, x] of starts.entries()) {
        units.push(makeEnemy('manticore', x, 1.5 + index * 0.55, true));
      }
      announce(escort ? 'REAR FLANK  ·  Kragg sent another Manticore toward Isolde' :
        'REAR FLANK  ·  Turn west and protect Isolde’s banner', 5.3);
      audio.playManticoreRoar();
    }

    function aimWest(enemy) {
      return enemy.x > p.x + 16 ? p.x : BANNER_X;
    }

    function updateUnit(enemy, dt, audio) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (enemy.dive > 0) {
        enemy.dive = Math.max(0, enemy.dive - dt);
        enemy.y = GROUND - 240 * enemy.dive / enemy.diveTotal;
        enemy.x -= 42 * dt;
        if (!enemy.dive) enemy.y = GROUND;
        return;
      }
      if (enemy.stun > 0) {
        enemy.stun -= dt;
        enemy.x = clamp(enemy.x + enemy.knockback * dt, 134, 3060);
        enemy.knockback *= Math.pow(0.045, dt);
        return;
      }

      const defendsBanner = enemy.rear ? Math.abs(enemy.x - p.x) > 142 : enemy.x <= p.x - 22;
      const targetX = defendsBanner ? BANNER_X : p.x;
      enemy.facing = toward(enemy.x, targetX);
      const gap = Math.abs(enemy.x - targetX);
      if (enemy.type === 'ballista') {
        if (gap > 770) enemy.x += enemy.facing * enemy.speed * dt;
        else if (enemy.cooldown <= 0) {
          enemy.cooldown = 2.2;
          launchShot(enemy.x + enemy.facing * 32, GROUND - 84, targetX, GROUND - 85, 'ballista', 449, 16);
          audio.playCatapultLaunch();
        }
        return;
      }

      if (enemy.attack) {
        enemy.attack.time -= dt;
        if (enemy.attack.time > 0) return;
        if (enemy.type === 'manticore') {
          audio.playManticoreRoar();
          if (enemy.attack.kind === 'barb') {
            launchShot(enemy.x, GROUND - 86, targetX, GROUND - (defendsBanner ? 76 : 79), 'barb', 415, 11);
          } else if (gap < 147) {
            enemy.x += enemy.facing * Math.min(Math.max(0, gap - 44), 58);
            if (defendsBanner) hurtBanner(9, audio);
            else hurtTitan(12, audio);
          }
        } else if (gap < 111) {
          if (defendsBanner) hurtBanner(12, audio);
          else hurtTitan(13, audio);
        }
        enemy.attack = null;
        enemy.cooldown = enemy.type === 'manticore' ? 1.48 : 1.43;
        return;
      }

      if (gap < (enemy.type === 'manticore' ? 131 : 85) && enemy.cooldown <= 0) {
        enemy.attack = { time: enemy.type === 'manticore' ? 0.41 : 0.57, kind: 'melee' };
      } else if (enemy.type === 'manticore' && gap < 415 && gap > 200 && enemy.cooldown <= 0 && !defendsBanner) {
        enemy.attack = { time: 0.45, kind: 'barb' };
      } else if (gap > (enemy.type === 'manticore' ? 63 : 51)) {
        enemy.x += enemy.facing * enemy.speed * dt;
        enemy.bob += dt * (enemy.type === 'manticore' ? 19 : 8.7);
      }
    }

    function updateBoss(dt, audio) {
      if (!boss) return;
      boss.flash = Math.max(0, boss.flash - dt);
      if (boss.exposed) return;
      const targetX = aimWest(boss);
      boss.facing = toward(boss.x, targetX);
      const gap = Math.abs(boss.x - targetX);
      if (boss.attack) {
        boss.attack.time -= dt;
        if (boss.attack.time > 0) return;
        if (boss.attack.kind === 'cannon') {
          for (const y of [GROUND - 136, GROUND - 98, GROUND - 62]) {
            launchShot(boss.x + boss.facing * 68, y, targetX, y, 'cannon', 479, 19);
          }
          audio.playCatapultLaunch();
          shake = Math.max(shake, 4);
        } else if (boss.attack.kind === 'slam') {
          addEffect('stomp', boss.x, GROUND - 23, 480, 0.56);
          audio.playSeismicStomp(true);
          if (gap < 251 && targetX === p.x) hurtTitan(27, audio);
          if (Math.abs(boss.x - BANNER_X) < 238) hurtBanner(24, audio);
          shake = Math.max(shake, 8);
        } else if (!units.some((unit) => unit.type === 'manticore' && unit.hp > 0)) {
          flank(audio, 1, true);
        }
        boss.attack = null;
        boss.cooldown = 2.45;
        return;
      }
      boss.cooldown -= dt;
      if (gap > 220 && (gap < 615 || boss.x > 2380)) boss.x += boss.facing * boss.speed * dt;
      if (boss.cooldown > 0 || gap > 910) return;
      let attack = ATTACKS[boss.cycle % ATTACKS.length];
      if (attack.kind === 'slam' && gap > 340) attack = ATTACKS[0];
      boss.cycle += 1;
      boss.attack = { kind: attack.kind, time: attack.windup, duration: attack.windup };
      announce(attack.message, attack.windup + 0.65);
      audio.playColossusAlarm();
    }

    function updateStages(dt, audio) {
      phaseClock += dt;
      if (stage === 'vanguard' && (p.x >= 1295 ||
          p.x >= 940 && phaseClock > 3 && !units.some((unit) => unit.hp > 0))) {
        stage = 'rear';
        phaseClock = 0;
        flank(audio);
      } else if (stage === 'rear' && !units.some((unit) => unit.rear && unit.hp > 0)) {
        stage = 'march';
        phaseClock = 0;
        units.push(makeEnemy('golem', 1905), makeEnemy('ballista', 2235));
        announce('The banner is secure. Advance east toward Kragg’s gate.', 4.0);
      } else if (stage === 'march' && p.x >= 1985) {
        stage = 'gate';
        boss = makeEnemy('boss', 2650);
        boss.cycle = 0;
        boss.cooldown = 1.2;
        boss.exposed = false;
        audio.playColossusAlarm();
        announce('OBSIDIAN SIEGE-COLOSSUS  ·  Break its armor to expose the core', 4.5);
      }
    }

    function updateWeather(dt, audio) {
      if (strike) {
        strike.timer -= dt;
        if (strike.timer > 0) return;
        addEffect('bolt', strike.x, 79, 56, 0.26, 0, GROUND - 79);
        addEffect('spark', strike.x, GROUND - 30, 115, 0.39);
        audio.playThunderbolt(false);
        if (Math.abs(p.x - strike.x) <= 61) {
          if (p.shield && toward(p.x, strike.x) === p.facing) {
            charge(8);
            audio.playShieldBlock();
            p.guardKick = 0.18;
          } else {
            hurtTitan(16, audio);
          }
        }
        strike = null;
        stormClock = 7.9;
      } else if ((stormClock -= dt) <= 0) {
        strike = { x: clamp(p.x + p.vx * 0.42 + p.facing * 28, 140, 3065), timer: 1.2 };
        audio.playSkyWarning();
      }
    }

    function update(dt, keys, audio) {
      time += dt;
      shake = Math.max(0, shake - dt * 32);
      banner.flash = Math.max(0, banner.flash - dt);
      bannerQuiet += dt;
      noteTime -= dt;
      updateTitan(dt, keys, audio);
      if (finished) return { outcome: 'win', score, banner: Math.ceil(banner.hp) };
      updateStages(dt, audio);
      for (const unit of units) if (unit.hp > 0) updateUnit(unit, dt, audio);
      updateBoss(dt, audio);
      updateShots(dt, audio);
      updateWeather(dt, audio);
      if (banner.hp <= 0) return { outcome: 'loss', reason: 'banner', score };
      if (p.hp <= 0) return { outcome: 'loss', reason: 'armor', score };
      if (bannerQuiet > 1.5 && p.hurt <= 0 && Math.abs(p.x - BANNER_X) < 192) {
        p.hp = Math.min(ARMOR_MAX, p.hp + dt * 10);
      }
      for (const effect of effects) effect.life -= dt;
      effects = effects.filter((effect) => effect.life > 0);
      const desired = clamp(p.x - viewWidth * 0.47, 0, WORLD_W - viewWidth);
      view += (desired - view) * Math.min(1, dt * 8);
      return null;
    }

    function beginOutcomeAnimation(result) {
      if (result.reason !== 'armor') return 0;
      p.fall = 0;
      p.vx = 0;
      p.shield = false;
      addEffect('spark', p.x, GROUND - 91, 96, 0.32);
      return OUTCOME_HOLD;
    }

    function updateOutcomeAnimation(dt) {
      if (p.fall === null) return;
      p.fall = Math.min(OUTCOME_HOLD, p.fall + dt);
      time += dt;
      shake = Math.max(0, shake - dt * 32);
      for (const effect of effects) effect.life -= dt;
      effects = effects.filter((effect) => effect.life > 0);
    }

    function sprite(g, art, key, x, y, height, options = {}) {
      const image = art.getImage(key);
      if (!image) return;
      const { width = image.width / image.height * height, alpha = 1, flip = false, angle = 0, feet = false } = options;
      g.save();
      g.globalAlpha *= alpha;
      g.translate(Math.round(x), Math.round(y));
      if (angle) g.rotate(angle);
      if (flip) g.scale(-1, 1);
      g.drawImage(image, -Math.round(width / 2), feet ? -Math.round(height) : -Math.round(height / 2),
        Math.round(width), Math.round(height));
      g.restore();
    }

    function scenery(g, art, width, height) {
      const peaks = art.getImage('bracadaPeaks');
      g.fillStyle = '#203048';
      g.fillRect(0, 0, width, height);
      if (peaks) {
        const tile = 1320;
        const offset = view * 0.28;
        for (let i = 0; i < 2; i += 1) {
          g.save();
          g.translate(Math.round(i * tile - offset), 0);
          if (i % 2) {
            g.translate(tile, 0);
            g.scale(-1, 1);
          }
          g.drawImage(peaks, 0, 0, tile, height);
          g.restore();
        }
      }
    }

    function drawEffects(g, art) {
      for (const e of effects) {
        const alpha = clamp(e.life / e.duration * 1.34, 0, 1);
        if (e.kind === 'bolt') {
          const distance = Math.hypot(e.dx, e.dy);
          const angle = Math.atan2(e.dy, e.dx);
          const count = Math.max(1, Math.ceil(distance / 186));
          for (let i = 0; i < count; i += 1) {
            const middle = (i + 0.5) / count;
            sprite(g, art, 'chainLightning', e.x + e.dx * middle, e.y + e.dy * middle, e.size,
              { angle, width: distance / count + 23, alpha });
          }
        } else if (e.kind === 'footfall') {
          const progress = 1 - e.life / e.duration;
          sprite(g, art, 'stompWave', e.x, e.y, 18, { width: e.size * (0.52 + progress * 0.48), alpha: alpha * 0.58 });
        } else if (e.kind === 'stomp') {
          const progress = 1 - e.life / e.duration;
          sprite(g, art, 'stompWave', e.x, e.y, 52, { width: e.size * (0.43 + progress * 0.57), alpha });
        } else {
          sprite(g, art, 'chainLightning', e.x, e.y, e.size * 0.3,
            { width: e.size, angle: 0.59 + time * 5, alpha });
        }
      }
    }

    function drawTerrain(g, art, width, height) {
      const bridge = art.getImage('skybridgeMarble');
      if (!bridge) return;
      const first = Math.floor((view - 25) / BRIDGE_TILE);
      const last = Math.ceil((view + width + 25) / BRIDGE_TILE);
      for (let i = first; i <= last; i += 1) {
        g.drawImage(bridge, i * BRIDGE_TILE, DECK_ART_TOP, BRIDGE_TILE, height - GROUND + 18);
      }
    }

    function drawNearPosts(g, art, width) {
      const first = Math.max(3, Math.floor((view - 40) / BRIDGE_TILE));
      const last = Math.min(13, Math.floor((view + width + 40) / BRIDGE_TILE));
      for (let i = first; i <= last; i += 1) {
        if (i % 2 === 1) {
          sprite(g, art, 'skybridgeNearPost', i * BRIDGE_TILE + 35, GROUND + 16, 62, { width: 32, feet: true });
        }
      }
    }

    function drawUnit(g, art, unit) {
      const target = targetY(unit);
      const rise = unit.attack && unit.attack.kind !== 'barb' ? 5 : 0;
      const dive = unit.dive ? -0.13 : 0;
      sprite(g, art, unit.sprite, unit.x, unit.y + Math.round(Math.sin(unit.bob) * 2) - rise,
        unit.height, { feet: true, flip: unit.facing > 0, angle: dive, alpha: unit.flash > 0 ? 0.67 : 1 });
      if (unit === boss && unit.exposed) {
        sprite(g, art, 'chainLightning', unit.x, target, 42, { width: 89, angle: time * 6.5, alpha: 0.84 });
      } else if (unit.attack) {
        const groundWarning = unit === boss && unit.attack.kind === 'slam';
        sprite(g, art, groundWarning ? 'stompWave' : 'chainLightning',
          unit.x, groundWarning ? GROUND - 15 : unit.y - unit.height - 16, groundWarning ? 30 : 18,
          { width: groundWarning ? 480 : 54, alpha: 0.51 + Math.sin(time * 29) * 0.28 });
      }
      if (unit.hp < unit.maxHp && unit !== boss) {
        drawBar(g, unit.x - 28, unit.y - unit.height - 8, 56, 5, unit.hp / unit.maxHp, '#ef906c');
      }
    }

    function drawTitanPart(g, atlas, [sx, sy, width, height, pivotX, pivotY], row, x, y, angle) {
      g.save();
      g.translate(x, y);
      g.rotate(angle);
      g.drawImage(atlas, sx, sy + row, width, height, -pivotX * TITAN_SCALE, -pivotY * TITAN_SCALE,
        width * TITAN_SCALE, height * TITAN_SCALE);
      g.restore();
    }

    function drawTitanLeg(g, atlas, hipX, hipY, phase, far) {
      const { x, lift, roll } = footPose(phase);
      const weight = p.strideWeight;
      const facing = p.facing * p.strideFacing;
      const footX = x * weight * facing + (far ? -15 : 16) * (1 - weight);
      const footY = FOOT_Y - lift * weight;
      const dx = footX - hipX;
      const dy = footY - hipY;
      const reach = Math.hypot(dx, dy);
      const bend = Math.acos(clamp((UPPER_LEG ** 2 + reach ** 2 - LOWER_LEG ** 2) /
        (2 * UPPER_LEG * reach), -1, 1));
      const thigh = Math.atan2(dy, dx) - bend;
      const kneeX = hipX + Math.cos(thigh) * UPPER_LEG;
      const kneeY = hipY + Math.sin(thigh) * UPPER_LEG;
      const shin = Math.atan2(footY - kneeY, footX - kneeX);
      const row = far ? 165 : 0;
      drawTitanPart(g, atlas, LEG[2], row, footX, footY, roll * weight * facing);
      drawTitanPart(g, atlas, LEG[1], row, kneeX, kneeY, shin - 1.306);
      drawTitanPart(g, atlas, LEG[0], row, hipX, hipY, thigh - 1.286);
    }

    function drawTitanStride(g, atlas, actions, guarding) {
      const phase = (p.step % STRIDE_CYCLE) / STRIDE_CYCLE;
      const shift = Math.sin(phase * Math.PI * 2) * p.strideWeight;
      const idle = time * Math.PI * 2 / 2.1;
      const rest = 1 - p.strideWeight;
      const hipX = shift * 2 + Math.sin(idle) * rest * 1.7;
      const hipY = -74 + Math.cos(phase * Math.PI * 4) * p.strideWeight * 1.8 +
        Math.cos(idle) * rest * 1.3 + (guarding ? p.guardWeight * 2.6 : 0);
      const lean = shift * 0.032 + Math.sin(idle) * rest * 0.018 - ease(p.turn / 0.12) * 0.046;
      drawTitanLeg(g, atlas, hipX - 5, hipY - 1, (phase + 0.5) % 1, true);
      drawTitanLeg(g, atlas, hipX + 4, hipY, phase, false);
      if (guarding && actions) {
        const weight = ease(p.guardWeight);
        const recoil = Math.max(ease(p.guardKick / 0.18), ease((p.hurt - 0.28) / 0.25));
        g.drawImage(actions, GUARD_COLUMN, 0, ACTION_W, ACTION_H,
          -ACTION_W / 2 + hipX - 5 * recoil, -ACTION_FLOOR + hipY + 74 + (1 - weight) * 7,
          ACTION_W, ACTION_H);
      } else if (actions) {
        drawTitanPart(g, actions, CLOTH, 0, hipX, hipY, lean + Math.sin(idle - 0.92 + phase * 2) * 0.032 +
          Math.sin((phase - 0.12) * Math.PI * 2) * p.strideWeight * 0.067);
        drawTitanPart(g, actions, BODY, 0, hipX, hipY, lean);
        drawTitanPart(g, actions, HEAD, 0, hipX + 6.24, hipY - 58.56,
          lean * 0.51 + Math.sin(idle - 0.63) * 0.027 + p.aim * 0.12);
      } else {
        drawTitanPart(g, atlas, TORSO, 0, hipX, hipY, lean);
      }
    }

    function drawTitanAction(g, atlas, frame, { tilt = 0, stretch = 1, x = 0 } = {}) {
      const sx = frame % 3 * ACTION_W;
      const sy = Math.floor(frame / 3) * ACTION_H;
      g.save();
      g.translate(x, 0);
      g.rotate(tilt);
      g.scale(1, stretch);
      g.drawImage(atlas, sx, sy, ACTION_W, ACTION_H,
        -ACTION_W / 2, -ACTION_FLOOR, ACTION_W, ACTION_H);
      g.restore();
    }

    function drawTitanDefeat(g, actions) {
      const age = p.fall ?? OUTCOME_HOLD;
      if (age < 0.16) {
        const recoil = ease(age / 0.16);
        drawTitanAction(g, actions, ACTIONS.hit, { tilt: -0.11 * recoil, x: -5 * recoil });
      } else if (age < 0.31) {
        const fold = ease((age - 0.16) / 0.15);
        drawTitanAction(g, actions, ACTIONS.stompRecover, { tilt: 0.06 * fold, stretch: 1 - 0.1 * fold });
      } else {
        const settle = 1 - ease((age - 0.31) / 0.33);
        drawTitanAction(g, actions, ACTIONS.knee, { stretch: 1 + 0.14 * settle, tilt: 0.055 * settle });
      }
    }

    function drawPlayer(g, art) {
      const atlas = art.getImage('titanStrideParts');
      const actions = art.getImage('titanG3Actions');
      const alpha = p.hp > 0 && p.hurt > 0 && p.hurt < 0.25 && Math.floor(time * 18) % 2 ? 0.7 : 1;
      const guarding = p.shield || (!p.poseTime && p.guardWeight > 0.16);
      if (atlas && actions) {
        g.save();
        g.translate(Math.round(p.x), GROUND + 1);
        g.scale(p.facing, 1);
        g.globalAlpha *= alpha;
        if (p.hp <= 0) {
          drawTitanDefeat(g, actions);
        } else if (!guarding && p.hurt > 0.29) {
          const impact = 1 - ease((0.53 - p.hurt) / 0.24);
          drawTitanAction(g, actions, p.hurt > 0.415 ? ACTIONS.hit : ACTIONS.recover,
            { tilt: -impact * 0.095, x: -impact * 5 });
        } else if (!guarding && p.poseTime > 0.05 && p.pose === 'throw') {
          const release = 1 - ease((0.31 - p.poseTime) / 0.26);
          const frame = p.poseTime > 0.19 ? ACTIONS.release : ACTIONS.recover;
          drawTitanAction(g, actions, frame, { tilt: p.castLean * release, stretch: 0.98 + 0.02 * release });
        } else if (!guarding && p.poseTime > 0.06 && p.pose === 'stomp') {
          const recovery = ease((0.46 - p.poseTime) / 0.4);
          const frame = p.poseTime > 0.27 ? ACTIONS.stomp : ACTIONS.stompRecover;
          drawTitanAction(g, actions, frame, { tilt: -recovery * 0.035, stretch: 1 + recovery * 0.04 });
        } else if (!guarding && p.windup === 'throw') {
          const ready = 1 - ease(p.thunder / 0.145);
          drawTitanAction(g, actions, ACTIONS.windup, { tilt: -0.063 * ready, stretch: 0.97 + 0.03 * ready });
        } else if (!guarding && p.windup === 'stomp') {
          const ready = 1 - ease(p.stomp / 0.17);
          drawTitanAction(g, actions, ACTIONS.stompReady, { tilt: 0.047 * ready, stretch: 1 - 0.036 * ready });
        } else {
          drawTitanStride(g, atlas, actions, guarding);
        }
        g.restore();
      } else {
        const key = p.shield ? 'titanShield' : p.poseTime && p.pose === 'throw' ? 'titanThrow' :
          p.poseTime && p.pose === 'stomp' ? 'titanStomp' : null;
        if (atlas && !key) {
          g.save();
          g.translate(Math.round(p.x), GROUND + 1);
          g.scale(p.facing, 1);
          g.globalAlpha *= alpha;
          drawTitanStride(g, atlas, null, false);
          g.restore();
        } else {
          sprite(g, art, key || 'titanWalk1', p.x, GROUND + 1, p.shield ? 155 : 169, {
            feet: true, flip: p.facing < 0, alpha
          });
        }
      }
      if (p.shield) {
        sprite(g, art, 'shieldWard', p.x + p.facing * SHIELD_REACH, GROUND - 95, 144,
          { width: 64, flip: p.facing < 0, alpha: 0.72 + Math.sin(time * 12) * 0.11 });
      }
    }

    function drawSleet(g, width, height) {
      const alpha = stage === 'rear' ? 0.48 : 0.24;
      g.fillStyle = `rgba(216, 239, 255, ${alpha})`;
      for (let i = 0; i < 58; i += 1) {
        const x = ((7200 + i * 281.4 - (time * (68 + i % 17 * 5) + view * 0.07) % width) % width);
        const y = 73 + (i * 79.21 + time * (23 + i % 9 * 6)) % (height - 74);
        g.fillRect(Math.floor(x), Math.floor(y), i % 3 + 2, 1);
      }
    }

    function drawBar(g, x, y, width, height, value, color) {
      g.fillStyle = '#0d1627';
      g.fillRect(x, y, width, height);
      g.fillStyle = color;
      g.fillRect(x + 1, y + 1, Math.round((width - 2) * clamp(value, 0, 1)), height - 2);
      g.strokeStyle = '#7895aa';
      g.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }

    function label(g, value, x, y, size, color = '#edf2ed', alignment = 'left') {
      g.font = `bold ${size}px Georgia`;
      g.textAlign = alignment;
      g.fillStyle = color;
      g.fillText(value, x, y);
    }

    function drawHud(g, art, w, h) {
      const backdrop = g.createLinearGradient(0, 0, 0, 72);
      backdrop.addColorStop(0, '#254265');
      backdrop.addColorStop(1, '#111d31');
      g.fillStyle = backdrop;
      g.fillRect(0, 0, w, 72);
      g.fillStyle = '#bfa16d';
      g.fillRect(0, 70, w, 2);
      sprite(g, art, 'titanCrest', 39, 35, 45);
      label(g, `MARBLE ARMOR  ${Math.ceil(p.hp)}%`, 70, 24, 14);
      drawBar(g, 70, 34, 137, 11, p.hp / ARMOR_MAX, '#b8d7ea');
      label(g, p.charge >= 100 ? 'OVERCHARGED' : `STORM  ${Math.floor(p.charge)}%`, 251, 24, 13,
        p.charge >= 100 ? '#fff6bd' : '#a9e6ff');
      drawBar(g, 251, 34, 105, 11, p.charge / 100, p.charge >= 100 ? '#ffe9a6' : '#65cffa');
      label(g, `STOMP ${p.stomp > 0 ? p.stomp.toFixed(1) : 'READY'}`, 70, 60, 12, '#bfdcee');

      const mapX = (x) => 392 + 300 * x / WORLD_W;
      const barY = 43;
      drawBar(g, 381, barY - 3, 320, 7, 1, '#577390');
      sprite(g, art, 'isoldeBanner', mapX(BANNER_X), barY - 1, 19);
      for (const unit of targets()) {
        sprite(g, art, unit.sprite, mapX(unit.x), barY + (unit.rear ? -8 : 0), unit === boss ? 21 : 12);
      }
      sprite(g, art, 'titanCrest', mapX(p.x), barY - 1, 17);
      const title = stage === 'rear' || units.some((unit) => unit.rear && unit.hp > 0) ? 'REAR FLANK' :
        boss?.exposed ? 'CORE EXPOSED' : boss ? 'SIEGE-COLOSSUS' : 'BRACADA SKY-BRIDGE';
      label(g, title, 541, 22, 16, title === 'REAR FLANK' ? '#ffad86' : '#d8ebfa', 'center');
      if (boss && !boss.exposed) drawBar(g, 436, 59, 207, 6, boss.hp / CORE_ARMOR, '#de8863');

      const attacked = banner.flash > 0 || units.some((unit) => unit.hp > 0 &&
        (unit.rear ? unit.x < 710 : Math.abs(unit.x - BANNER_X) < 187));
      label(g, `BANNER ${Math.ceil(banner.hp)}%`, 730, 49, 14, attacked ? '#ffd2a3' : '#e1edf6');
      drawBar(g, 730, 55, 102, 7, banner.hp / 100, attacked ? '#ef986f' : '#82bbef');
      label(g, attacked ? 'UNDER ATTACK' : 'HOLDING', w - 25, 55, 16, attacked ? '#ffb19b' : '#d8ebfa', 'right');
      label(g, `GLORY ${score}`, w - 191, 55, 14, '#ead9af', 'right');

      if (noteTime > 0) {
        const touch = document.body.classList.contains('touch-active');
        const y = touch ? 82 : h - 44;
        g.font = 'bold 16px Georgia';
        const width = g.measureText(note).width + 36;
        g.fillStyle = 'rgba(10, 20, 36, .92)';
        g.fillRect((w - width) / 2, y, width, 31);
        label(g, note, w / 2, y + 21, 16, note.startsWith('REAR FLANK') ? '#ffd0a8' : '#e2f3ff', 'center');
      }
    }

    function render(g, w, h, art) {
      g.imageSmoothingEnabled = false;
      scenery(g, art, w, h);
      g.save();
      g.translate(-Math.round(view) + Math.round(shake * Math.sin(time * 139)),
        Math.round(shake * 0.72 * Math.cos(time * 116)));
      drawTerrain(g, art, w, h);
      sprite(g, art, 'castleMedic', BANNER_X - 67, GROUND, 68, { feet: true });
      sprite(g, art, 'castleMedic', BANNER_X + 94, GROUND, 61, { feet: true, flip: true });
      sprite(g, art, 'isoldeBanner', BANNER_X, GROUND, 134, { feet: true, alpha: banner.flash > 0 ? 0.72 : 1 });
      if (stage !== 'gate') {
        sprite(g, art, 'seraphiel', 243, GROUND - 136 + Math.sin(time * 2.6) * 8, 119, { alpha: 0.9 });
      }
      for (const unit of targets()) {
        if (unit.x > view - 210 && unit.x < view + w + 210) drawUnit(g, art, unit);
      }
      drawPlayer(g, art);
      drawNearPosts(g, art, w);
      if (strike) {
        sprite(g, art, 'chainLightning', strike.x, GROUND - 21, 32,
          { width: 117, alpha: 0.54 + Math.sin(time * 30) * 0.28 });
      }
      for (const shot of shots) {
        if (shot.x < view - 90 || shot.x > view + w + 90) continue;
        sprite(g, art, shot.reflected || shot.kind === 'barb' ? 'chainLightning' : 'ironSiegeBolt',
          shot.x, shot.y, shot.kind === 'cannon' ? 23 : 15,
          { angle: Math.atan2(shot.vy, shot.vx), width: shot.kind === 'cannon' ? 96 : 64 });
      }
      drawEffects(g, art);
      g.restore();
      drawSleet(g, w, h);
      drawHud(g, art, w, h);
    }

    return {
      init, update, render,
      beginOutcomeAnimation, updateOutcomeAnimation,
      musicMode: 'm5_tower',
      aimAt(x, y) { pointer = x === null ? null : { x, y }; },
      onPause() { p.shield = false; pointer = null; },
      getOverlayCopy(type, result, best) {
        if (type === 'pause') return {
          title: 'THE SKY-BRIDGE WAITS',
          subtitle: 'Mission V — Thunder Above the Cloud-Spire',
          noteHtml: 'Face incoming artillery before holding <b>Shield</b>. Reflections fill Storm Charge. Fall back when the banner is threatened. The medics repair your armor near Isolde while the banner is safe.',
          primaryLabel: 'RESUME THE SIEGE'
        };
        if (type === 'victory') return {
          title: 'THE SKY-BRIDGE IS OURS',
          subtitle: `Mission V Complete · Banner ${result.banner}% · Glory ${result.score} · Best ${best}`,
          noteHtml: 'The Colossus falls and Isolde’s banner still flies. Aegis-IX sinks to one knee, his storm core fused to glass. Beyond the cleared gate the clouds part, and the Azure Dragon Saphirion descends for <b>Mission VI — The Crown of Living Memory</b>.',
          primaryLabel: 'RETURN TO MAP'
        };
        return {
          title: result.reason === 'banner' ? 'ISOLDE’S BANNER HAS FALLEN' : 'THE TITAN HAS FALLEN',
          subtitle: `Mission V · Final Glory ${result.score}`,
          noteHtml: result.reason === 'banner' ?
            'Turn west when the rear-flank horn sounds. <b>Stomp</b> stops grounded Manticores before they can reach the banner.' :
            'Use <b>Shield</b> against frontal volleys and move away from fissure warnings. Isolde’s medics can repair your armor at the western barricade.',
          primaryLabel: 'RETRY THE SIEGE'
        };
      }
    };
  }

  window.ThanatosMissions[5] = controller();
})();
