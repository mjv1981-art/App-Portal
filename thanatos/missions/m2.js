(() => {
  window.ThanatosMissions = window.ThanatosMissions || {};

  function createMission2Controller() {
    const HUD_H = 72;
    const CEILING_MIN_Y = 92;
    const CANOPY_BAND_Y = 135;
    const SKIM_MIN_Y = 435;
    const WATER_Y = 510;

    const BASE_SCROLL_SPEED = 240; // px/s forced river chase
    const MIN_SCROLL_SPEED = 180;
    const MAX_SCROLL_SPEED = 360;

    const STAGE2_DIST = 3100;
    const STAGE3_DIST = 7200;
    const TOTAL_CAPTIVES = 12;
    const MAX_CAPTIVES_LOST = 6; // Loss if >50% (>6 of 12) captives killed by Acid
    const TAU = Math.PI * 2;
    const DEFEAT_DURATION = 0.72;
    const VENOM_POSE_TIME = 0.2;
    const HURT_POSE_TIME = 0.29;
    const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
    const ease = (v) => v * v * (3 - 2 * v);
    const mix = (a, b, v) => a + (b - a) * v;

    // [source x, y, width, height, joint x, y]. Torso and wing roots stay coupled.
    const BODY = [2, 2, 152, 87, 75, 47];
    const WING = [161, 2, 242, 163, 226, 138];
    const HEAD = [409, 2, 169, 179, 20, 164];
    const TAIL = [2, 180, 174, 93, 168, 63];
    const LEG = [184, 180, 117, 123, 22, 28];
    const OPEN_JAW = [310, 180, 165, 179, 20, 167];
    const NORTH = [2, 2, 62, 193, 31, 107];
    const NORTHEAST = [72, 2, 117, 182, 35, 100];
    const SOUTH = [199, 2, 62, 181, 32, 91];
    const SOUTHEAST = [272, 2, 130, 151, 37, 79];
    const TURN_VIEWS = [
      null, SOUTHEAST, SOUTH, SOUTHEAST, null, NORTHEAST, NORTH, NORTHEAST
    ];
    // Ten keyed flight silhouettes. Hold and accelerate into the power stroke, then recover.
    const STROKE = [
      [0, 0.49, 0.87], [0.09, 0.62, 0.76], [0.19, 0.57, 0.66],
      [0.28, 0.25, 0.58], [0.38, -0.49, 0.66], [0.48, -0.87, 0.9],
      [0.58, -0.74, 0.88], [0.69, -0.42, 0.65], [0.81, -0.04, 0.53],
      [0.91, 0.28, 0.63], [1, 0.49, 0.87]
    ];

    let time = 0;
    let riverDist = 0;
    let scrollSpeed = BASE_SCROLL_SPEED;
    let stage = 1; // 1: Reed Delta, 2: Stilt Narrows, 3: Soul-Barge Showdown
    let score = 0;
    let screenShake = 0;
    let statusBanner = { text: '', timer: 0 };

    let captivesSaved = 0;
    let captivesLost = 0;
    let motion;

    function resetWyvernMotion() {
      motion = {
        heading: 0, phase: 0, breath: 0, glide: 0, pitch: 0, lift: 0,
        venom: 0, venomAngle: 0, hurt: 0, fall: 0, falling: false,
        slashAnticipation: 0, venomAnticipation: 0
      };
    }
    resetWyvernMotion();

    const wyvern = {
      x: 220,
      y: 285,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      venom: 100,
      maxVenom: 100,
      wingPhase: 0,
      skimming: false,
      swoop: 0,
      slashTimer: 0,
      slashCooldown: 0,
      venomCooldown: 0,
      evadeTimer: 0,
      evadeCooldown: 0,
      invuln: 0,
      petrifySlow: 0,
      wakeSpawnAcc: 0
    };

    // World encounter arrays (stored in river-world X coordinates for Stages 1-2)
    let branches = [];
    let snags = [];
    let sporeClouds = [];
    let docks = [];
    let skiffs = [];
    let enemies = [];
    let captiveRig = []; // { x, y, lanternX, lanternY, chainCut, state: 'caged'|'saved'|'killed', onBarge, slotIdx }
    let acidGlobs = [];
    let enemyProj = [];
    let clawArcs = [];
    let wakes = [];
    let sparks = [];
    let freedWisps = [];
    let geysers = [];

    // Stage 3 Boss: Iron Soul-Barge & Lich Overseer Morvain
    const boss = {
      active: false,
      phase: 1, // 1: 4 Soul-Lantern Chains, 2: Morvain & Phylactery Cradle
      bargeX: 1220,
      targetBargeX: 565,
      bargeY: WATER_Y + 6,
      gateTimer: 45.0,
      maxGateTimer: 45.0,
      chainsTotal: 4,
      chainsCut: 0,
      cradleHp: 135,
      maxCradleHp: 135,
      cradleFlash: 0,
      morvainActive: false,
      morvainX: 675,
      morvainY: 330,
      morvainCastTimer: 1.6,
      geyserTimer: 3.1,
      ballistaTimer: 1.5,
      canopySpawnTimer: 2.2
    };

    function showBanner(text, duration = 3.2) {
      statusBanner = { text, timer: duration };
    }

    function spawnSparks(x, y, color, count = 10, spread = 185, gravity = 0) {
      for (let i = 0; i < count; i++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * spread,
          vy: (Math.random() - 0.6) * spread,
          gravity,
          life: 0.36 + Math.random() * 0.22,
          color
        });
      }
    }

    function spawnFreedSpirits(sx, sy) {
      for (let i = 0; i < 8; i++) {
        freedWisps.push({
          x: sx + (Math.random() - 0.5) * 24,
          y: sy + (Math.random() - 0.5) * 20,
          vx: -30 + (Math.random() - 0.5) * 60,
          vy: -95 - Math.random() * 85,
          life: 0.95 + Math.random() * 0.35,
          maxLife: 1.3
        });
      }
    }

    function buildRiverCorridor() {
      branches = [];
      snags = [];
      sporeClouds = [];
      docks = [];
      skiffs = [];
      enemies = [];
      captiveRig = [];
      acidGlobs = [];
      enemyProj = [];
      clawArcs = [];
      wakes = [];
      sparks = [];
      freedWisps = [];
      geysers = [];

      // 1. Hanging Ironwood Cypress Branches along Low-Canopy Ceiling (Stages 1 & 2)
      const branchSpots = [
        { wx: 620, reach: 172, w: 165, flip: false },
        { wx: 1240, reach: 196, w: 185, flip: true },
        { wx: 1760, reach: 168, w: 160, flip: false },
        { wx: 2390, reach: 204, w: 190, flip: true },
        { wx: 3020, reach: 176, w: 170, flip: false },
        // Stage 2 tighter narrows (leaving strategic canopy gaps above Gorgons!)
        { wx: 3520, reach: 186, w: 175, flip: true },
        { wx: 4060, reach: 210, w: 195, flip: false },
        { wx: 4510, reach: 174, w: 165, flip: true },
        { wx: 5260, reach: 206, w: 190, flip: false },
        { wx: 5610, reach: 170, w: 160, flip: true },
        { wx: 6280, reach: 208, w: 190, flip: false },
        { wx: 6960, reach: 182, w: 175, flip: true }
      ];
      for (const b of branchSpots) {
        branches.push({
          wx: b.wx,
          reachY: b.reach,
          w: b.w,
          flip: b.flip,
          hitCooldown: 0,
          broken: false
        });
      }

      // 2. Jagged River Snags along Water-Skim lane
      const snagSpots = [880, 1620, 2560, 3360, 4420, 5480, 6420];
      for (const sx of snagSpots) {
        snags.push({ wx: sx, w: 66, h: 46, hitCooldown: 0 });
      }

      // 3. Drifting Toxic Swamp Spore-Clouds (Cleared by EVADE roll!)
      const sporeSpots = [
        { wx: 980, y: 265 },
        { wx: 1840, y: 345 },
        { wx: 2680, y: 240 },
        { wx: 3880, y: 310 },
        { wx: 4920, y: 235 },
        { wx: 5860, y: 355 },
        { wx: 6580, y: 255 }
      ];
      sporeSpots.forEach((sp, idx) => {
        sporeClouds.push({
          wx: sp.wx,
          y: sp.y,
          baseY: sp.y,
          phase: idx * 1.3,
          alive: true
        });
      });

      // 4. Stilt-Dock Garrisons (Lizardman Sharpshooters, Gnoll Marauders & Swamp Gorgons)
      const dockDefs = [
        // Stage 1: Reed Delta
        { wx: 760, deckY: 446, kind: 'lizardman' },
        { wx: 1460, deckY: 438, kind: 'gnoll' },
        { wx: 2220, deckY: 444, kind: 'lizardman' },
        { wx: 2920, deckY: 436, kind: 'gnoll' },
        // Stage 2: Stilt Narrows + 4 Swamp Gorgon River-Bends
        { wx: 3680, deckY: 432, kind: 'gorgon' },
        { wx: 4140, deckY: 446, kind: 'lizardman' },
        { wx: 4720, deckY: 428, kind: 'gorgon' },
        { wx: 5180, deckY: 440, kind: 'gnoll' },
        { wx: 5760, deckY: 432, kind: 'gorgon' },
        { wx: 6220, deckY: 444, kind: 'lizardman' },
        { wx: 6720, deckY: 430, kind: 'gorgon' },
        { wx: 7060, deckY: 440, kind: 'gnoll' }
      ];
      for (const d of dockDefs) {
        docks.push({ wx: d.wx, deckY: d.deckY, wide: d.kind === 'gorgon' });
        enemies.push({
          kind: d.kind,
          wx: d.wx,
          y: d.deckY,
          hp: d.kind === 'gorgon' ? 68 : 30,
          maxHp: d.kind === 'gorgon' ? 68 : 30,
          cooldown: d.kind === 'gorgon' ? 0.55 : 0.85 + Math.random() * 0.5,
          gazeState: 'idle', // 'idle' | 'telegraph' | 'firing'
          gazeTimer: 0,
          gazeAngle: 0,
          onSkiff: null,
          alive: true
        });
      }

      // 5. Fast Escort Skiffs moving upriver (carry Lizardman or Gnoll raiders)
      const skiffDefs = [
        { wx: 1180, rider: 'gnoll' },
        { wx: 2520, rider: 'lizardman' },
        { wx: 3980, rider: 'gnoll' },
        { wx: 5420, rider: 'lizardman' },
        { wx: 6480, rider: 'gnoll' }
      ];
      skiffDefs.forEach((sk, idx) => {
        const skiffObj = {
          id: idx + 1,
          wx: sk.wx,
          y: WATER_Y + 4,
          hp: 44,
          alive: true,
          upriverSpeed: 92 // Moves upriver so it stays in combat window longer!
        };
        skiffs.push(skiffObj);
        enemies.push({
          kind: sk.rider,
          wx: sk.wx - 8,
          y: WATER_Y - 16,
          hp: 28,
          maxHp: 28,
          cooldown: 0.9 + (idx % 2) * 0.4,
          gazeState: 'idle',
          gazeTimer: 0,
          gazeAngle: 0,
          onSkiff: skiffObj,
          alive: true
        });
      });

      // 6. Pre-Boss Captive Cage + Soul-Lantern Assemblies (3 in Stage 1 + 5 in Stage 2 = 8; + 4 on Soul-Barge = 12!)
      const preBossCaptives = [
        // Stage 1 (3)
        { wx: 1060, lanternY: 225, cageY: 332 },
        { wx: 1960, lanternY: 205, cageY: 316 },
        { wx: 2790, lanternY: 235, cageY: 342 },
        // Stage 2 (5)
        { wx: 3430, lanternY: 215, cageY: 325 },
        { wx: 4320, lanternY: 240, cageY: 348 },
        { wx: 5040, lanternY: 205, cageY: 315 },
        { wx: 6020, lanternY: 230, cageY: 338 },
        { wx: 6880, lanternY: 212, cageY: 322 }
      ];
      preBossCaptives.forEach((c, idx) => {
        captiveRig.push({
          id: idx + 1,
          wx: c.wx,
          lanternOffsetY: c.lanternY,
          cageOffsetY: c.cageY,
          fallVy: 0,
          chainCut: false,
          state: 'caged', // 'caged' | 'saved' | 'killed'
          onBarge: false,
          bargeOffsetX: 0,
          swingPhase: idx * 0.9
        });
      });
    }

    function startSoulBargeShowdown(audio) {
      stage = 3;
      boss.active = true;
      boss.phase = 1;
      boss.bargeX = 1160;
      boss.targetBargeX = 560;
      boss.gateTimer = 45.0;
      boss.chainsCut = 0;
      boss.cradleHp = boss.maxCradleHp;
      boss.cradleFlash = 0;
      boss.morvainActive = false;
      boss.morvainCastTimer = 1.5;
      boss.geyserTimer = 2.8;
      boss.ballistaTimer = 1.3;
      boss.canopySpawnTimer = 2.5;

      if (audio && audio.playWyvernScreech) {
        audio.playWyvernScreech();
      }
      showBanner('IRON SOUL-BARGE ENGAGED! SLASH ALL 4 SOUL-LANTERN CHAINS (45s TO FLOODGATE)!', 4.5);

      // Spawn the 4 Soul-Lantern + Captive Cage Chains rigged across the Iron Soul-Barge!
      const bargeRigging = [
        { ox: -18, ly: 205, cy: 312 },
        { ox: 78, ly: 185, cy: 292 },
        { ox: 174, ly: 200, cy: 308 },
        { ox: 268, ly: 218, cy: 324 }
      ];
      bargeRigging.forEach((r, i) => {
        captiveRig.push({
          id: 9 + i,
          wx: 0,
          lanternOffsetY: r.ly,
          cageOffsetY: r.cy,
          fallVy: 0,
          chainCut: false,
          state: 'caged',
          onBarge: true,
          bargeOffsetX: r.ox,
          swingPhase: i * 1.2
        });
      });
    }

    function severCaptiveRig(rig, audio, healWyvern = true) {
      if (rig.chainCut) return;
      rig.chainCut = true;
      if (audio && audio.playChainBreak) {
        audio.playChainBreak();
      }

      const sx = rig.onBarge ? boss.bargeX + rig.bargeOffsetX : rig.wx - riverDist;
      spawnSparks(sx, rig.lanternOffsetY - 18, '#6cf7b2', 12, 210);

      if (rig.state === 'caged') {
        rig.state = 'saved';
        captivesSaved++;
        score += 200;
        if (healWyvern) {
          wyvern.hp = Math.min(wyvern.maxHp, wyvern.hp + 10);
        }
        spawnFreedSpirits(sx, rig.cageOffsetY);
      }

      if (rig.onBarge) {
        boss.chainsCut++;
        if (boss.chainsCut >= boss.chainsTotal && boss.phase === 1) {
          unlockBossPhase2(audio);
        } else {
          showBanner(
            `SOUL-LANTERN CHAIN SEVERED (${boss.chainsCut}/${boss.chainsTotal})! CAPTIVE SAVED!`,
            2.4
          );
        }
      } else {
        showBanner(`CAPTIVE FREED INTO THE REEDS! (${captivesSaved}/${TOTAL_CAPTIVES} SAVED)`, 2.2);
      }
    }

    function harmCaptiveWithAcid(rig, sx, audio) {
      if (rig.state !== 'caged') return;
      rig.state = 'killed';
      rig.chainCut = true;
      captivesLost++;
      screenShake = 9;
      if (audio && audio.playWoodSplinter) {
        audio.playWoodSplinter();
      }
      spawnSparks(sx, rig.cageOffsetY, '#ff4252', 14, 220);

      if (rig.onBarge) {
        boss.chainsCut++;
        if (boss.chainsCut >= boss.chainsTotal && boss.phase === 1 && captivesLost <= MAX_CAPTIVES_LOST) {
          unlockBossPhase2(audio);
        }
      }

      showBanner(
        `CAUSTIC ACID KILLED A CAPTIVE! (${captivesLost}/${MAX_CAPTIVES_LOST} MAX ALLOWED) — USE SLASH!`,
        3.4
      );
    }

    function unlockBossPhase2(audio) {
      boss.phase = 2;
      boss.morvainActive = true;
      boss.morvainX = boss.bargeX + 108;
      boss.morvainY = boss.bargeY - 165;
      screenShake = 11;
      if (audio) {
        if (audio.playChainBreak) audio.playChainBreak();
        if (audio.playWyvernScreech) audio.playWyvernScreech();
      }
      showBanner(
        'NECROTIC SHIELD SHATTERED! LICH MORVAIN RISES — MELT THE PHYLACTERY CRADLE!',
        4.4
      );
    }

    function damageWyvern(dmg, audio, isWood = false) {
      if (wyvern.invuln > 0 || wyvern.evadeTimer > 0) return false;
      wyvern.hp = Math.max(0, wyvern.hp - dmg);
      wyvern.invuln = 0.72;
      motion.hurt = HURT_POSE_TIME;
      screenShake = 9;
      if (audio) {
        if (isWood && audio.playWoodSplinter) audio.playWoodSplinter();
        else if (audio.playBoulder) audio.playBoulder(true);
      }
      spawnSparks(wyvern.x, wyvern.y, '#ff4757', 12, 220);
      return wyvern.hp <= 0;
    }

    function performSlash(audio) {
      wyvern.slashTimer = 0.25;
      wyvern.slashCooldown = 0.31;
      const isDiveSlash = wyvern.swoop > 0.28;
      if (audio && audio.playClawSlash) {
        audio.playClawSlash();
      }

      const reachBonus = isDiveSlash ? 24 : 0;
      const arcX = wyvern.x + 76 + reachBonus * 0.5;
      const arcY = wyvern.y - 2;
      clawArcs.push({
        x: arcX,
        y: arcY,
        life: 0.22,
        maxLife: 0.22,
        big: isDiveSlash
      });

      const rx = 76 + reachBonus;
      const ry = 60 + (isDiveSlash ? 12 : 0);

      // 1. Cleanly sever Soul-Lantern Chains & liberate Captive Cages (ZERO harm to captives!)
      for (const rig of captiveRig) {
        if (rig.chainCut && rig.state !== 'caged') continue;
        const sx = rig.onBarge ? boss.bargeX + rig.bargeOffsetX : rig.wx - riverDist;
        const dx = Math.abs(sx - arcX);
        if (dx <= rx) {
          const hitLantern = Math.abs(rig.lanternOffsetY - arcY) <= ry + 26;
          const hitChainBand = arcY >= rig.lanternOffsetY - 45 && arcY <= rig.cageOffsetY + 24;
          if (hitLantern || hitChainBand) {
            severCaptiveRig(rig, audio, true);
          }
        }
      }

      // 2. Parry / slice incoming poison darts, axes & Morvain skull-bolts
      for (let i = enemyProj.length - 1; i >= 0; i--) {
        const p = enemyProj[i];
        if (Math.abs(p.x - arcX) <= rx && Math.abs(p.y - arcY) <= ry) {
          score += 25;
          spawnSparks(p.x, p.y, '#9effb8', 7, 160);
          enemyProj.splice(i, 1);
        }
      }

      // 3. Melee damage against Lizardmen, Gnolls, Gorgons & Escort Skiffs
      const slashDmg = isDiveSlash ? 44 : 28;
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = e.wx - riverDist;
        const ey = e.y - 28;
        if (Math.abs(ex - arcX) <= rx && Math.abs(ey - arcY) <= ry) {
          e.hp -= slashDmg;
          spawnSparks(ex, ey, '#ffe378', 9, 185);
          if (e.hp <= 0) {
            e.alive = false;
            score += e.kind === 'gorgon' ? 260 : 125;
            spawnSparks(ex, ey, '#7cf796', 14, 210);
          }
        }
      }

      for (const sk of skiffs) {
        if (!sk.alive) continue;
        const skx = sk.wx - riverDist;
        if (Math.abs(skx - arcX) <= rx + 24 && Math.abs((sk.y - 16) - arcY) <= ry) {
          sk.hp -= slashDmg;
          if (sk.hp <= 0) {
            sk.alive = false;
            score += 180;
            if (audio && audio.playWoodSplinter) audio.playWoodSplinter();
            spawnSparks(skx, sk.y - 14, '#c48f52', 14, 220);
            for (const e of enemies) {
              if (e.onSkiff === sk && e.alive) {
                e.alive = false;
                score += 100;
              }
            }
          }
        }
      }

      // 4. Stage 3 Phase 2: Slash Phylactery Cradle & Lich Morvain!
      if (boss.active && boss.phase === 2) {
        const cradleX = boss.bargeX + 58;
        const cradleY = boss.bargeY - 138;
        if (Math.abs(cradleX - arcX) <= rx + 34 && Math.abs(cradleY - arcY) <= ry + 36) {
          const bossDmg = isDiveSlash ? 26 : 16;
          boss.cradleHp = Math.max(0, boss.cradleHp - bossDmg);
          boss.cradleFlash = 0.2;
          screenShake = isDiveSlash ? 8 : 5;
          if (audio && audio.playChainBreak) audio.playChainBreak();
          spawnSparks(cradleX, cradleY, '#5cf7b2', 14, 230);
        } else if (
          boss.morvainActive &&
          Math.abs(boss.morvainX - arcX) <= rx + 24 &&
          Math.abs((boss.morvainY - 24) - arcY) <= ry + 28
        ) {
          boss.cradleHp = Math.max(0, boss.cradleHp - (isDiveSlash ? 20 : 12));
          boss.cradleFlash = 0.16;
          spawnSparks(boss.morvainX, boss.morvainY - 24, '#b87aff', 11, 200);
        }
      }
    }

    function spitAcidVenom(upHeld, downHeld, audio) {
      wyvern.venom = Math.max(0, wyvern.venom - 18);
      wyvern.venomCooldown = 0.27;
      if (audio && audio.playVenomSpit) {
        audio.playVenomSpit();
      }

      let aimVy = 85;
      if (upHeld) aimVy = -185;
      else if (downHeld) aimVy = 225;
      motion.venom = VENOM_POSE_TIME;
      motion.venomAngle = Math.atan2(aimVy, 545);
      const [releaseX, releaseY] = venomMuzzle();

      acidGlobs.push({
        x: wyvern.x + 62,
        y: wyvern.y + 8,
        vx: 545 + Math.max(0, wyvern.vx * 0.35),
        vy: aimVy + wyvern.vy * 0.2,
        releaseOffsetX: releaseX - 62,
        releaseOffsetY: releaseY - 8,
        life: 2.0
      });
    }

    function neckSway() {
      return Math.sin(motion.phase * TAU - 0.48) * 0.07 + Math.sin(motion.breath * TAU) * 0.068;
    }

    function venomMuzzle() {
      const angle = neckSway() + 0.57 + motion.venomAngle * 0.38;
      const x = 23 + Math.cos(angle) * 35 - Math.sin(angle) * -25;
      const y = 2 + Math.sin(angle) * 35 + Math.cos(angle) * -25;
      const pitch = motion.pitch;
      return [
        Math.cos(pitch) * x - Math.sin(pitch) * y,
        Math.sin(pitch) * x + Math.cos(pitch) * y - motion.lift * 0.25
      ];
    }

    function updateWyvernMotion(dt, dx, dy, wantSlash, wantVenom) {
      const idle = dx === 0 && dy === 0;
      const velocity = Math.hypot(wyvern.vx, wyvern.vy);
      const smooth = 1 - Math.exp(-11 * dt);
      const targetGlide = wyvern.skimming ? 0.96 : idle && velocity < 55 ? 0 : dy < 0 ? 0 : 0.38;
      motion.glide = mix(motion.glide, targetGlide, smooth);
      motion.phase = (motion.phase + dt * (1.68 + 0.7 * Number(dy < 0) - (idle ? 0.45 : 0))) % 1;
      motion.breath = (motion.breath + dt * 1.05) % 1;
      motion.pitch = mix(motion.pitch, clamp(wyvern.vy * 0.0008 + wyvern.swoop * 0.14, -0.29, 0.34), smooth);
      motion.lift = mix(motion.lift, clamp(-wyvern.vy * 0.019, -6, 7), smooth);
      motion.slashAnticipation = wantSlash ? 1 - clamp(wyvern.slashCooldown / 0.09) : 0;
      motion.venomAnticipation = wantVenom && wyvern.venom >= 18 ? 1 - clamp(wyvern.venomCooldown / 0.09) : 0;

      // Combat continues to release rightward. The eight views follow steering between attacks.
      const committed = wyvern.slashTimer > 0 || motion.venom > 0 || motion.falling;
      const target = idle || committed ? 0 : Math.round(Math.atan2(dy, dx) * 4 / Math.PI);
      const difference = ((target - motion.heading + 12) % 8) - 4;
      motion.heading = (motion.heading + difference * smooth + 8) % 8;
    }

    function strokeAt(phaseIndex) {
      let i = 1;
      while (STROKE[i][0] < phaseIndex) i++;
      const [start, startTilt, startSpan] = STROKE[i - 1];
      const [end, endTilt, endSpan] = STROKE[i];
      const t = ease((phaseIndex - start) / (end - start));
      return [mix(startTilt, endTilt, t), mix(startSpan, endSpan, t)];
    }

    function piece(ctx, atlas, part, x, y, angle, sx, sy = sx, opacity = 1) {
      const [left, top, w, h, anchorX, anchorY] = part;
      ctx.save();
      ctx.translate(x, y);
      if (angle) ctx.rotate(angle);
      ctx.scale(sx, sy);
      ctx.globalAlpha *= opacity;
      ctx.drawImage(atlas, left, top, w, h, -anchorX, -anchorY, w, h);
      ctx.restore();
    }

    function drawTurnBody(ctx, atlas, part, sway, leg) {
      const [left, top, width, height, px, py] = part;
      const scale = 0.42;
      const neck = Math.round(height * 0.47);
      const hip = Math.round(height * 0.73);
      // Sample overlapping sections of the authored full view to keep visible joints continuous.
      piece(ctx, atlas, [left, top + hip - 8, width, height - hip + 8, px, 8],
        0, (hip - py) * scale, leg * 0.4, scale, scale * (1 + leg * 0.25));
      piece(ctx, atlas, [left, top + neck - 8, width, hip - neck + 16, px, py - neck + 8],
        0, 0, 0, scale);
      piece(ctx, atlas, [left, top, width, neck + 5, px, neck],
        0, (neck - py) * scale, sway * 0.52, scale);
    }

    function drawWyvernFacing(ctx, rig, directions, index, stroke, span, idle, action) {
      const dorsal = index === 5 || index === 6 || index === 7;
      const profile = index === 0 || index === 4 || !directions;
      const flip = index >= 3 && index <= 5;
      const phase = motion.phase * TAU;
      const tailDrift = Math.sin(phase - 1.35) * mix(0.24, 0.12, idle);
      const neckDrift = neckSway();
      const talon = Math.sin(phase - 0.9) * 0.24;

      ctx.save();
      if (flip) ctx.scale(-1, 1);
      if (profile) {
        const wingFold = 1 - action.fold * 0.31;
        piece(ctx, rig, WING, 10, -6, stroke * 0.81 + 0.6, -0.29 * wingFold, 0.25 * span, 0.72);
        piece(ctx, rig, TAIL, -21, 6, tailDrift + action.tail, 0.386 * (1 + action.reach * 0.2), 0.386);
        piece(ctx, rig, LEG, -10, 11, -talon + action.fold * 0.52, 0.24, 0.25, 0.75);
        piece(ctx, rig, BODY, 0, 0, 0, 0.344, 0.32 * (1 + Math.sin(motion.breath * TAU) * 0.025));
        piece(ctx, rig, HEAD, 23, 2, neckDrift + action.head, 0.256, 0.244, 1 - action.mouth);
        if (action.mouth > 0) {
          piece(ctx, rig, OPEN_JAW, 23, 2, neckDrift + action.head, 0.256, 0.244, action.mouth);
        }
        piece(ctx, rig, WING, 2, -6, stroke, 0.367 * wingFold, 0.37 * span);
        piece(ctx, rig, LEG, -17, 10, talon + action.fold * 0.62, 0.29);
      } else {
        const tailTilt = dorsal ? -1.14 : 0.63;
        const wingSpan = 0.38 * (0.78 + span * 0.24) * (1 - action.fold * 0.35);
        piece(ctx, rig, TAIL, -7, 3, tailTilt + tailDrift, 0.30, 0.28);
        piece(ctx, rig, WING, -8, -4, stroke * 0.83, wingSpan, 0.35 * span, 0.91);
        piece(ctx, rig, WING, 10, -4, -stroke * 0.9, -wingSpan, 0.35 * span, dorsal ? 0.82 : 0.96);
        drawTurnBody(ctx, directions, TURN_VIEWS[index], neckDrift + action.head, talon);
      }
      ctx.restore();
    }

    function drawWyvern(ctx, Art) {
      const rig = Art.getImage('skithraFlightRig');
      const directions = Art.getImage('skithraDirections');
      const shade = Art.getPixelSprite('dragonShadow');
      if (shade) {
        const depth = Math.max(0, WATER_Y - wyvern.y);
        const scale = Math.max(0.3, 1 - depth / 420);
        const width = Math.round(115 * scale);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= 0.45 * scale * (1 - motion.fall * 0.6);
        ctx.drawImage(shade, Math.round(wyvern.x - width * 0.5), WATER_Y + 3, width, Math.max(4, Math.round(18 * scale)));
        ctx.restore();
      }

      const slash = wyvern.slashTimer > 0 ? 1 - clamp(wyvern.slashTimer / 0.25) : 1;
      const venom = 1 - clamp(motion.venom / VENOM_POSE_TIME);
      const evade = wyvern.evadeTimer > 0 ? 1 - clamp(wyvern.evadeTimer / 0.38) : 1;
      const hurt = 1 - clamp(motion.hurt / HURT_POSE_TIME);
      const roll = evade < 1 ? TAU * ease(evade) : 0;
      const recoil = recoilAt(hurt) * (motion.falling ? 0 : 1);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(wyvern.x - 8 * recoil, Math.min(WATER_Y - 14, wyvern.y + 73 * motion.fall ** 2) - motion.lift * 0.25 - recoil * 5);
      ctx.rotate(motion.pitch - recoil * 0.29 + roll + motion.fall * 1.42);
      ctx.scale(1 - motion.fall * 0.24, 1 - motion.fall * 0.18);
      ctx.globalAlpha *= (1 - 0.42 * recoil) * (1 - 0.38 * ease(clamp((motion.fall - 0.55) / 0.45)));
      if (wyvern.petrifySlow > 0 && 'filter' in ctx) ctx.filter = 'saturate(0.64) sepia(0.46)';
      if (rig) {
        const [stroke, span] = strokeAt(motion.phase);
        const glide = motion.glide;
        const slashWind = motion.slashAnticipation * (slash === 1 ? 1 : 0);
        // The release beat leads the follow-through. It never delays the slash hitbox or sound.
        const sweep = slash < 0.22 ? mix(0.79, 1, ease(slash / 0.22)) : 1 - ease(clamp((slash - 0.22) / 0.78));
        const recoilFold = recoil * 0.62;
        const open = venom < 1 ? 1 - ease(clamp((venom - 0.26) / 0.58)) : 0;
        const action = {
          mouth: open,
          fold: Math.max(Math.sin(Math.PI * evade), motion.fall, recoilFold),
          head: open * (0.57 + motion.venomAngle * 0.38) - motion.venomAnticipation * 0.09 - sweep * 0.23,
          tail: sweep * -2.96 + slashWind * 0.3 - motion.fall * 0.42,
          reach: sweep
        };
        const heading = motion.venom > 0 || wyvern.slashTimer > 0 ? 0 : motion.heading;
        const floor = Math.floor(heading) % 8;
        const ceil = (floor + 1) % 8;
        const transition = ease(heading - Math.floor(heading));
        const wingTilt = mix(stroke, 0.11, glide) + action.fold * 0.18;
        const wingDepth = mix(span, 0.83, glide) * (1 - action.fold * 0.28);
        // Cross-blend only between neighboring authored views, with the same torso pivot.
        if (transition < 0.98) {
          ctx.save();
          ctx.globalAlpha *= 1 - transition;
          drawWyvernFacing(ctx, rig, directions, floor, wingTilt, wingDepth, glide, action);
          ctx.restore();
        }
        if (transition > 0.02) {
          ctx.globalAlpha *= transition;
          drawWyvernFacing(ctx, rig, directions, ceil, wingTilt, wingDepth, glide, action);
        }
      } else {
        const key = slash < 1 ? 'wyvernSlash' : Math.sin(wyvern.wingPhase) >= 0 ? 'wyvernFly1' : 'wyvernFly2';
        const image = Art.getImage(key);
        if (image) {
          const width = key === 'wyvernFly2' ? 162 : key === 'wyvernSlash' ? 154 : 148;
          const height = width * image.height / image.width;
          ctx.drawImage(image, -width * 0.52, -height * 0.54, width, height);
        }
      }
      ctx.restore();
    }

    function recoilAt(age) {
      return age < 0.19 ? ease(age / 0.19) : 1 - ease(clamp((age - 0.19) / 0.81));
    }

    return {
      id: 2,
      title: 'Venom in the Reed-Fens',
      musicMode: 'm2_fortress',
      touchButtons: window.ThanatosCampaign
        ? window.ThanatosCampaign.getMission(2).touchButtons
        : [
            { role: 'rest', key: 'KeyR', label: 'EVADE' },
            { role: 'stone', key: 'KeyX', label: 'VENOM' },
            { role: 'fire', key: 'Space', label: 'SLASH' }
          ],

      init() {
        time = 0;
        riverDist = 0;
        scrollSpeed = BASE_SCROLL_SPEED;
        stage = 1;
        score = 0;
        screenShake = 0;
        captivesSaved = 0;
        captivesLost = 0;

        wyvern.x = 220;
        wyvern.y = 285;
        wyvern.vx = 0;
        wyvern.vy = 0;
        wyvern.hp = 100;
        wyvern.venom = 100;
        wyvern.wingPhase = 0;
        wyvern.skimming = false;
        wyvern.swoop = 0;
        wyvern.slashTimer = 0;
        wyvern.slashCooldown = 0;
        wyvern.venomCooldown = 0;
        wyvern.evadeTimer = 0;
        wyvern.evadeCooldown = 0;
        wyvern.invuln = 0;
        wyvern.petrifySlow = 0;
        wyvern.wakeSpawnAcc = 0;
        resetWyvernMotion();

        boss.active = false;
        boss.phase = 1;
        boss.bargeX = 1220;
        boss.gateTimer = 45.0;
        boss.chainsCut = 0;
        boss.cradleHp = boss.maxCradleHp;
        boss.morvainActive = false;

        buildRiverCorridor();
        showBanner(
          'STAGE I: REED DELTA — SKIM WATER FOR +30% SPEED & VENOM! SLASH LANTERN CHAINS!',
          4.0
        );
      },

      onPause(audio) {
        if (audio && audio.setWaterSkim) {
          audio.setWaterSkim(false);
        }
      },

      cleanup(audio) {
        if (audio && audio.setWaterSkim) {
          audio.setWaterSkim(false);
        }
      },

      getOverlayCopy(type, result, bestScore) {
        if (type === 'pause') {
          return {
            title: 'CHRONICLE PAUSED',
            subtitle: 'Mission II — Venom in the Reed-Fens (Kaelen & Skithra)',
            noteHtml:
              'As <b>Skithra</b>, fierce Tatalian <b>Wyvern</b> of Fortress, skim low above the poisoned reed-waters for <b>+30% chase speed & rapid Acid-Venom recharge</b>.<br><br>' +
              'Use <b>SLASH (Space)</b> to cleanly sever <b>Soul-Lantern Chains</b> and rescue captives—never splash <b>VENOM (X)</b> onto Captive Cages! Roll with <b>EVADE (R)</b> through Swamp Gorgon gaze beams.',
            primaryLabel: 'RESUME CHASE'
          };
        }
        if (type === 'victory') {
          const savedTxt = `${captivesSaved} / ${TOTAL_CAPTIVES}`;
          return {
            title: 'THE PHYLACTERY IS SHATTERED!',
            subtitle: `Mission II Liberated • Captives Saved: ${savedTxt} • Glory: ${result.score} (Best: ${bestScore})`,
            noteHtml:
              'With a final venom-drenched swoop, <b>Skithra</b> shatters <b>Lich Overseer Morvain’s</b> Phylactery Cradle before the Deyja Floodgate locks—freeing the captives into the Tatalian reeds!<br><br>' +
              'Yet the ruptured crystal unleashes a blinding <b>Necrotic Shockwave</b>. Pulled across the Stygian current, Kaelen’s fading spark is caught by rogue elder vampire <b>Lady Carmilla</b> inside the <b>Obsidian Keep</b>. <b>Mission III — Ashes of the Velvet Throne</b> is now unlocked upon the Campaign Map!',
            primaryLabel: 'RETURN TO MAP'
          };
        }
        // Defeat reasons tailored to exact failure condition
        const reason = (result && result.reason) || 'hp';
        let reasonHtml =
          'Choking marsh-darts and necrotic fire overwhelmed <b>Skithra</b> beneath the ironwood canopy! Use <b>EVADE (R)</b> to spin-roll through Swamp Gorgon gaze beams and <b>SLASH</b> chains to restore vitality.';
        if (reason === 'floodgate') {
          reasonHtml =
            'The <b>Iron Soul-Barge</b> crossed through the <b>Deyja Floodgate</b> before its Phylactery Cradle could be destroyed! Skim the river surface to refill Acid Venom rapidly and surge right to <b>SLASH</b> all 4 Soul-Lantern Chains quickly.';
        } else if (reason === 'captives') {
          reasonHtml =
            'More than half of the shackled captives perished under reckless <b>Acid Venom</b> splashes! Aim <b>VENOM (X)</b> only at enemy skiffs, gunners, and the unshielded Phylactery—use <b>SLASH (Space)</b> to sever Captive Chains cleanly.';
        }
        return {
          title: reason === 'floodgate' ? 'THE BARGE ESCAPED INTO DEYJA' : reason === 'captives' ? 'CAPTIVES LOST TO VENOM' : 'SKITHRA HAS FALLEN',
          subtitle: `Mission II — Final Glory: ${result ? result.score : 0}`,
          noteHtml: reasonHtml,
          primaryLabel: 'TAKE WING AGAIN'
        };
      },

      update(dt, inputKeys, audio) {
        time += dt;
        motion.venom = Math.max(0, motion.venom - dt);
        motion.hurt = Math.max(0, motion.hurt - dt);
        if (statusBanner.timer > 0) statusBanner.timer -= dt;
        if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 26);
        if (wyvern.invuln > 0) wyvern.invuln -= dt;
        if (wyvern.petrifySlow > 0) wyvern.petrifySlow -= dt;
        if (wyvern.slashTimer > 0) wyvern.slashTimer -= dt;
        if (wyvern.slashCooldown > 0) wyvern.slashCooldown -= dt;
        if (wyvern.venomCooldown > 0) wyvern.venomCooldown -= dt;
        if (wyvern.evadeTimer > 0) wyvern.evadeTimer -= dt;
        if (wyvern.evadeCooldown > 0) wyvern.evadeCooldown -= dt;
        if (boss.cradleFlash > 0) boss.cradleFlash -= dt;

        const left = Boolean(inputKeys['ArrowLeft'] || inputKeys['KeyA']);
        const right = Boolean(inputKeys['ArrowRight'] || inputKeys['KeyD']);
        const up = Boolean(inputKeys['ArrowUp'] || inputKeys['KeyW']);
        const down = Boolean(inputKeys['ArrowDown'] || inputKeys['KeyS']);
        const wantSlash = Boolean(inputKeys['Space']);
        const wantVenom = Boolean(inputKeys['KeyX'] || inputKeys['ShiftLeft'] || inputKeys['ShiftRight']);
        const wantEvade = Boolean(inputKeys['KeyR'] || inputKeys['KeyE']);

        // 1. Barrel-Evade Spin Roll (0.38s i-frames + spore clear)
        if (wantEvade && wyvern.evadeCooldown <= 0) {
          wyvern.evadeTimer = 0.38;
          wyvern.evadeCooldown = 0.98;
          wyvern.petrifySlow = 0;
          if (audio && audio.playClawSlash) audio.playClawSlash();
          spawnSparks(wyvern.x, wyvern.y, '#9effd6', 10, 190);
        }

        // 2. Water-Skim Detection (y = 435..510)
        wyvern.skimming = wyvern.y >= SKIM_MIN_Y;
        if (audio && audio.setWaterSkim) {
          audio.setWaterSkim(wyvern.skimming);
        }

        // 3. Forced Forward River Scroll Throttle (180..360 px/s) + Dive-Swoop Momentum
        const slowMult = wyvern.petrifySlow > 0 ? 0.62 : 1.0;
        let targetThrottle = BASE_SCROLL_SPEED;
        if (left && !right) targetThrottle = MIN_SCROLL_SPEED;
        else if (right && !left) targetThrottle = 277;

        if (wyvern.skimming) {
          targetThrottle = Math.min(MAX_SCROLL_SPEED, targetThrottle * 1.3);
        }
        scrollSpeed += (targetThrottle * slowMult - scrollSpeed) * Math.min(1, dt * 6.5);
        riverDist += scrollSpeed * dt;

        // Stage Transitions
        if (stage === 1 && riverDist >= STAGE2_DIST) {
          stage = 2;
          if (audio && audio.playWyvernScreech) audio.playWyvernScreech();
          showBanner('STAGE II: STILT NARROWS — EVADE OR DIVE PAST SWAMP GORGON GAZE BEAMS!', 4.0);
        } else if (stage === 2 && riverDist >= STAGE3_DIST) {
          startSoulBargeShowdown(audio);
        }

        // Dive-Swoop buildup (Down + Forward) & Upward Climb Conversion
        if (down && right) {
          wyvern.swoop = Math.min(1, wyvern.swoop + dt * 2.4);
        } else if (up && wyvern.swoop > 0.22) {
          wyvern.vy -= 320 * wyvern.swoop;
          wyvern.swoop = 0;
        } else {
          wyvern.swoop = Math.max(0, wyvern.swoop - dt * 1.9);
        }

        // Screen-space X/Y steering (Stages 1-2: x in [110, 480]; Stage 3 Boss: x in [110, 785] for rigging runs)
        const maxPlayerX = boss.active ? 785 : 480;
        const accelX = 820 * slowMult;
        const accelY = 860 * slowMult;

        if (left) wyvern.vx -= accelX * dt;
        if (right) wyvern.vx += (accelX + wyvern.swoop * 210) * dt;
        if (!left && !right && boss.active && wyvern.x > 460) {
          // Gently drift back from right rigging when releasing surge
          wyvern.vx -= 220 * dt;
        }

        if (up) wyvern.vy -= accelY * dt;
        if (down) wyvern.vy += (accelY + wyvern.swoop * 180) * dt;

        // Subtle buoyancy + aerodynamic damping
        wyvern.vx *= Math.pow(0.08, dt);
        wyvern.vy *= Math.pow(0.09, dt);
        wyvern.vx = Math.max(-340, Math.min(380, wyvern.vx));
        wyvern.vy = Math.max(-330, Math.min(350, wyvern.vy));

        wyvern.x = Math.max(110, Math.min(maxPlayerX, wyvern.x + wyvern.vx * dt));
        wyvern.y = Math.max(CEILING_MIN_Y, Math.min(WATER_Y - 14, wyvern.y + wyvern.vy * dt));

        // Low-Canopy Ceiling brush pushback (y = 92..102)
        if (wyvern.y < 100) {
          wyvern.vy = Math.max(wyvern.vy, 75);
        }

        // Venom Gland Recharge (Rapid +36/s while skimming water, +11/s aloft!)
        const venomRegen = wyvern.skimming ? 36 : 11;
        wyvern.venom = Math.min(wyvern.maxVenom, wyvern.venom + venomRegen * dt);

        // Water-Skim Pixel Wake Trail
        if (wyvern.skimming) {
          wyvern.wakeSpawnAcc += dt * (scrollSpeed / 240);
          if (wyvern.wakeSpawnAcc >= 0.065) {
            wyvern.wakeSpawnAcc = 0;
            wakes.push({
              x: wyvern.x - 28,
              y: WATER_Y + 1,
              vx: -scrollSpeed * 0.72,
              life: 0.42,
              maxLife: 0.42,
              scale: 1.8
            });
          }
        }

        wyvern.wingPhase += dt * (wyvern.skimming ? 14.5 : 10.5);

        // 4. Execute SLASH & VENOM Actions
        if (wantSlash && wyvern.slashCooldown <= 0) {
          performSlash(audio);
        }
        if (wantVenom && wyvern.venomCooldown <= 0 && wyvern.venom >= 18) {
          spitAcidVenom(up, down, audio);
        }
        updateWyvernMotion(dt, Number(right) - Number(left), Number(down) - Number(up), wantSlash, wantVenom);

        let fatalDamage = false;

        // 5. Update Hanging Cypress Branches (Low-Canopy Hazards)
        for (let i = branches.length - 1; i >= 0; i--) {
          const b = branches[i];
          if (b.hitCooldown > 0) b.hitCooldown -= dt;
          const bx = b.wx - riverDist;
          if (bx < -260) {
            branches.splice(i, 1);
            continue;
          }
          if (
            bx > -120 &&
            bx < 1180 &&
            b.hitCooldown <= 0 &&
            Math.abs(wyvern.x - bx) < b.w * 0.38 &&
            wyvern.y < b.reachY - 8
          ) {
            b.hitCooldown = 0.85;
            wyvern.vy = Math.max(wyvern.vy, 185);
            wyvern.y = Math.max(wyvern.y, b.reachY - 4);
            if (damageWyvern(12, audio, true)) fatalDamage = true;
          }
        }

        // 6. Update River Snags
        for (let i = snags.length - 1; i >= 0; i--) {
          const sn = snags[i];
          if (sn.hitCooldown > 0) sn.hitCooldown -= dt;
          const sx = sn.wx - riverDist;
          if (sx < -120) {
            snags.splice(i, 1);
            continue;
          }
          if (
            sn.hitCooldown <= 0 &&
            Math.abs(wyvern.x - sx) < 34 &&
            wyvern.y > WATER_Y - 32
          ) {
            sn.hitCooldown = 0.85;
            wyvern.vy = -155;
            if (damageWyvern(11, audio, true)) fatalDamage = true;
          }
        }

        // 7. Update Drifting Spore-Clouds (Dispelled cleanly by EVADE!)
        for (let i = sporeClouds.length - 1; i >= 0; i--) {
          const sp = sporeClouds[i];
          if (!sp.alive) {
            sporeClouds.splice(i, 1);
            continue;
          }
          sp.phase += dt * 2.8;
          sp.y = sp.baseY + Math.sin(sp.phase) * 20;
          const spx = sp.wx - riverDist;
          if (spx < -120) {
            sporeClouds.splice(i, 1);
            continue;
          }
          const dist = Math.hypot(wyvern.x - spx, wyvern.y - sp.y);
          if (wyvern.evadeTimer > 0 && dist < 76) {
            sp.alive = false;
            score += 40;
            spawnSparks(spx, sp.y, '#d6ff7a', 10, 175);
          } else if (dist < 36) {
            sp.alive = false;
            wyvern.petrifySlow = Math.max(wyvern.petrifySlow, 0.9);
            if (damageWyvern(10, audio, false)) fatalDamage = true;
          }
        }

        // 8. Update Escort Skiffs
        for (const sk of skiffs) {
          if (!sk.alive) continue;
          const skx = sk.wx - riverDist;
          if (skx < 1160 && skx > -140) {
            sk.wx += sk.upriverSpeed * dt;
          }
        }

        // 9. Update Enemies (Lizardmen, Gnolls, & 1.1s Telegraph Swamp Gorgons)
        for (const e of enemies) {
          if (!e.alive) continue;
          if (e.onSkiff) {
            if (!e.onSkiff.alive) {
              e.alive = false;
              continue;
            }
            e.wx = e.onSkiff.wx - 6;
            e.y = e.onSkiff.y - 16;
          }

          const ex = e.wx - riverDist;
          if (ex < -90 || ex > 1140) continue;

          if (e.kind === 'gorgon') {
            const headX = ex - 38;
            const headY = e.y - 48;
            if (e.gazeState === 'idle') {
              e.cooldown -= dt;
              if (ex < 1030 && ex > wyvern.x + 40 && e.cooldown <= 0) {
                e.gazeState = 'telegraph';
                e.gazeTimer = 1.1; // Exact 1.1s telegraph per design!
                e.gazeAngle = Math.atan2(wyvern.y - headY, wyvern.x - headX);
                if (audio && audio.playGorgonBeam) audio.playGorgonBeam();
              }
            } else if (e.gazeState === 'telegraph') {
              // Subtle slow tracking for first 0.55s, then locks angle for final 0.55s dodge window!
              if (e.gazeTimer > 0.55) {
                const desired = Math.atan2(wyvern.y - headY, wyvern.x - headX);
                e.gazeAngle += (desired - e.gazeAngle) * Math.min(1, dt * 3.5);
              }
              e.gazeTimer -= dt;
              if (e.gazeTimer <= 0) {
                e.gazeState = 'firing';
                e.gazeTimer = 0.55;
                if (audio && audio.playGorgonBeam) audio.playGorgonBeam();
              }
            } else if (e.gazeState === 'firing') {
              e.gazeTimer -= dt;
              // Ray-to-Wyvern beam check along gazeAngle
              const dx = wyvern.x - headX;
              const dy = wyvern.y - headY;
              const dist = Math.hypot(dx, dy);
              if (dist > 20 && dist < 820) {
                const cosA = Math.cos(e.gazeAngle);
                const sinA = Math.sin(e.gazeAngle);
                const along = dx * cosA + dy * sinA;
                const perp = Math.abs(-dx * sinA + dy * cosA);
                const beamHalfW = 14 + (along / 820) * 26;
                if (along > 0 && perp < beamHalfW) {
                  if (wyvern.evadeTimer <= 0 && wyvern.invuln <= 0) {
                    wyvern.petrifySlow = 0.85;
                    if (damageWyvern(18, audio, false)) fatalDamage = true;
                  }
                }
              }
              if (e.gazeTimer <= 0) {
                e.gazeState = 'idle';
                e.cooldown = 2.0;
              }
            }
          } else {
            // Lizardman Sharpshooter (flat poison dart) or Gnoll Marauder (arcing hooked axe)
            e.cooldown -= dt;
            if (ex < 1040 && ex > wyvern.x - 30 && e.cooldown <= 0) {
              e.cooldown = e.kind === 'lizardman' ? 1.55 : 1.75;
              const spawnX = ex - 22;
              const spawnY = e.y - 44;
              const dx = wyvern.x - spawnX;
              const dy = wyvern.y - spawnY;
              const len = Math.max(1, Math.hypot(dx, dy));

              if (e.kind === 'lizardman') {
                if (audio && audio.playArrow) audio.playArrow();
                enemyProj.push({
                  type: 'dart',
                  x: spawnX,
                  y: spawnY,
                  vx: (dx / len) * 420 - scrollSpeed * 0.25,
                  vy: (dy / len) * 420,
                  gravity: 22,
                  rot: 0,
                  life: 2.8
                });
              } else {
                if (audio && audio.playSpear) audio.playSpear();
                enemyProj.push({
                  type: 'axe',
                  x: spawnX,
                  y: spawnY,
                  vx: (dx / len) * 305 - scrollSpeed * 0.2,
                  vy: (dy / len) * 305 - 155,
                  gravity: 340,
                  rot: 0,
                  life: 3.0
                });
              }
            }
          }
        }

        // 10. Update Stage 3 Boss: Iron Soul-Barge, Floodgate Timer & Lich Morvain
        if (boss.active) {
          boss.bargeX += (boss.targetBargeX - boss.bargeX) * Math.min(1, dt * 2.6);
          boss.gateTimer = Math.max(0, boss.gateTimer - dt);
          if (boss.gateTimer <= 0 && boss.cradleHp > 0) {
            return {
              outcome: 'loss',
              reason: 'floodgate',
              score,
              stats: { captivesSaved, captivesLost }
            };
          }

          // Periodic low-canopy ceiling hazard during barge chase (kept high at y <= 148 so lantern rigging at y = 185..324 is clear!)
          boss.canopySpawnTimer -= dt;
          if (boss.canopySpawnTimer <= 0) {
            boss.canopySpawnTimer = 3.8;
            branches.push({
              wx: riverDist + 1240,
              reachY: 138 + Math.round(Math.random() * 12),
              w: 150,
              flip: Math.random() < 0.5,
              hitCooldown: 0,
              broken: false
            });
          }

          // Barge Bone-Ballista volleys
          boss.ballistaTimer -= dt;
          if (boss.ballistaTimer <= 0 && boss.bargeX < 760) {
            boss.ballistaTimer = boss.phase === 1 ? 1.55 : 2.15;
            const bx = boss.bargeX + 215;
            const by = boss.bargeY - 86;
            const dx = wyvern.x - bx;
            const dy = wyvern.y - by;
            const len = Math.max(1, Math.hypot(dx, dy));
            if (audio && audio.playSpear) audio.playSpear();
            enemyProj.push({
              type: 'bone_bolt',
              x: bx,
              y: by,
              vx: (dx / len) * 435,
              vy: (dy / len) * 435,
              gravity: 15,
              rot: 0,
              life: 2.8
            });
          }

          // Phase 2: Lich Overseer Morvain Skull-Bolt Spreads & Stygian Whirlpools
          if (boss.phase === 2 && boss.morvainActive) {
            boss.morvainX = boss.bargeX + 112 + Math.sin(time * 2.1) * 22;
            boss.morvainY = boss.bargeY - 156 + Math.cos(time * 3.0) * 12;

            boss.morvainCastTimer -= dt;
            if (boss.morvainCastTimer <= 0) {
              boss.morvainCastTimer = 2.05;
              const mx = boss.morvainX - 24;
              const my = boss.morvainY - 38;
              const baseAng = Math.atan2(wyvern.y - my, wyvern.x - mx);
              [-0.22, 0, 0.22].forEach((spread) => {
                const a = baseAng + spread;
                enemyProj.push({
                  type: 'skull',
                  x: mx,
                  y: my,
                  vx: Math.cos(a) * 365,
                  vy: Math.sin(a) * 365,
                  gravity: 0,
                  rot: 0,
                  life: 3.2
                });
              });
              if (audio && audio.playHydraBite) audio.playHydraBite(true);
            }

            boss.geyserTimer -= dt;
            if (boss.geyserTimer <= 0) {
              boss.geyserTimer = 3.25;
              geysers.push({
                x: Math.max(150, Math.min(480, wyvern.x + (Math.random() - 0.3) * 90)),
                telegraph: 0.95,
                erupt: 0.55
              });
            }
          }
        }

        // 11. Update Stygian River Geysers (Boss Phase 2)
        for (let i = geysers.length - 1; i >= 0; i--) {
          const gy = geysers[i];
          if (gy.telegraph > 0) {
            gy.telegraph -= dt;
            if (gy.telegraph <= 0 && audio && audio.playHydraSplash) {
              audio.playHydraSplash();
            }
          } else {
            gy.erupt -= dt;
            if (Math.abs(wyvern.x - gy.x) < 34 && wyvern.y > 275) {
              if (damageWyvern(15, audio, false)) fatalDamage = true;
            }
            if (gy.erupt <= 0) {
              geysers.splice(i, 1);
            }
          }
        }

        // 12. Update Captive Cages (Falling safely into reeds when freed)
        for (const rig of captiveRig) {
          rig.swingPhase += dt * 2.4;
          if (rig.state === 'saved' && rig.cageOffsetY < WATER_Y + 34) {
            rig.fallVy += 420 * dt;
            rig.cageOffsetY += rig.fallVy * dt;
            if (rig.cageOffsetY >= WATER_Y && rig.fallVy > 0) {
              const sx = rig.onBarge ? boss.bargeX + rig.bargeOffsetX : rig.wx - riverDist;
              if (sx > -60 && sx < 1180) {
                wakes.push({
                  x: sx - 18,
                  y: WATER_Y,
                  vx: -scrollSpeed * 0.5,
                  life: 0.4,
                  maxLife: 0.4,
                  scale: 1.6
                });
              }
              rig.cageOffsetY = WATER_Y + 40;
            }
          }
        }

        // 13. Update Player Acid-Venom Globs (Melts foes & Phylactery — HARMS CAPTIVE CAGES!)
        for (let i = acidGlobs.length - 1; i >= 0; i--) {
          const g = acidGlobs[i];
          g.vy += 175 * dt;
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.life -= dt;

          let consumed = false;

          // Check Captive Cage splash hazard FIRST (Critical Mission 2 precision rule!)
          for (const rig of captiveRig) {
            if (rig.state !== 'caged') continue;
            const rx = rig.onBarge ? boss.bargeX + rig.bargeOffsetX : rig.wx - riverDist;
            const ry = rig.cageOffsetY;
            if (Math.hypot(g.x - rx, g.y - ry) < 40) {
              harmCaptiveWithAcid(rig, rx, audio);
              consumed = true;
              break;
            }
          }

          // Check Enemies
          if (!consumed) {
            for (const e of enemies) {
              if (!e.alive) continue;
              const ex = e.wx - riverDist;
              const ey = e.y - 32;
              const hitR = e.kind === 'gorgon' ? 46 : 34;
              if (Math.hypot(g.x - ex, g.y - ey) < hitR) {
                e.hp -= 38;
                spawnSparks(g.x, g.y, '#8cff52', 10, 190);
                if (e.hp <= 0) {
                  e.alive = false;
                  score += e.kind === 'gorgon' ? 260 : 125;
                  spawnSparks(ex, ey, '#bfff66', 14, 220);
                }
                consumed = true;
                break;
              }
            }
          }

          // Check Escort Skiffs
          if (!consumed) {
            for (const sk of skiffs) {
              if (!sk.alive) continue;
              const skx = sk.wx - riverDist;
              if (Math.abs(g.x - skx) < 58 && Math.abs(g.y - (sk.y - 14)) < 28) {
                sk.hp -= 46;
                spawnSparks(g.x, g.y, '#8cff52', 11, 195);
                if (sk.hp <= 0) {
                  sk.alive = false;
                  score += 180;
                  if (audio && audio.playWoodSplinter) audio.playWoodSplinter();
                  for (const e of enemies) {
                    if (e.onSkiff === sk && e.alive) {
                      e.alive = false;
                      score += 100;
                    }
                  }
                }
                consumed = true;
                break;
              }
            }
          }

          // Check Soul-Barge Shield / Phylactery Cradle / Morvain
          if (!consumed && boss.active) {
            const cradleX = boss.bargeX + 58;
            const cradleY = boss.bargeY - 138;
            if (Math.hypot(g.x - cradleX, g.y - cradleY) < 56) {
              if (boss.phase === 1) {
                // Blocked by Necrotic Shield until all 4 Soul-Lantern Chains are SLASHED!
                spawnSparks(g.x, g.y, '#52ffd1', 8, 160);
                if (statusBanner.timer <= 0) {
                  showBanner('NECROTIC SHIELD BLOCKS VENOM! SLASH ALL 4 SOUL-LANTERN CHAINS FIRST!', 2.2);
                }
              } else {
                boss.cradleHp = Math.max(0, boss.cradleHp - 20);
                boss.cradleFlash = 0.2;
                screenShake = 5;
                spawnSparks(g.x, g.y, '#8cff52', 14, 225);
              }
              consumed = true;
            } else if (
              boss.phase === 2 &&
              boss.morvainActive &&
              Math.hypot(g.x - boss.morvainX, g.y - (boss.morvainY - 24)) < 42
            ) {
              boss.cradleHp = Math.max(0, boss.cradleHp - 15);
              boss.cradleFlash = 0.16;
              spawnSparks(g.x, g.y, '#b8ff66', 11, 200);
              consumed = true;
            }
          }

          if (consumed || g.y >= WATER_Y + 6 || g.x > 1160 || g.life <= 0) {
            if (!consumed && g.y >= WATER_Y + 6) {
              spawnSparks(g.x, WATER_Y, '#7ef748', 5, 110, 260);
            }
            acidGlobs.splice(i, 1);
          }
        }

        // Check >50% Captive Loss Failure Condition immediately
        if (captivesLost > MAX_CAPTIVES_LOST) {
          return {
            outcome: 'loss',
            reason: 'captives',
            score,
            stats: { captivesSaved, captivesLost }
          };
        }

        // Check Boss Victory Condition (Phylactery Cradle Shattered!)
        if (boss.active && boss.phase === 2 && boss.cradleHp <= 0) {
          const rescueBonus = captivesSaved * 150;
          const timeBonus = Math.round(boss.gateTimer * 25);
          score += 1000 + rescueBonus + timeBonus;
          return {
            outcome: 'win',
            score,
            stats: { captivesSaved, captivesLost, gateTimer: boss.gateTimer }
          };
        }

        // 14. Update Enemy Projectiles
        for (let i = enemyProj.length - 1; i >= 0; i--) {
          const p = enemyProj[i];
          p.vy += p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += dt * 11;
          p.life -= dt;

          if (Math.hypot(p.x - wyvern.x, p.y - wyvern.y) < 30) {
            const dmg = p.type === 'bone_bolt' ? 16 : p.type === 'skull' ? 15 : 12;
            if (damageWyvern(dmg, audio, false)) fatalDamage = true;
            enemyProj.splice(i, 1);
            continue;
          }
          if (p.x < -60 || p.x > 1180 || p.y > WATER_Y + 14 || p.y < 60 || p.life <= 0) {
            enemyProj.splice(i, 1);
          }
        }

        // 15. Update VFX Lists (Claw Arcs, Wakes, Sparks, Freed Spirits)
        for (let i = clawArcs.length - 1; i >= 0; i--) {
          clawArcs[i].life -= dt;
          clawArcs[i].x += 95 * dt;
          if (clawArcs[i].life <= 0) clawArcs.splice(i, 1);
        }
        for (let i = wakes.length - 1; i >= 0; i--) {
          const wk = wakes[i];
          wk.x += wk.vx * dt;
          wk.life -= dt;
          if (wk.life <= 0) wakes.splice(i, 1);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          if (s.gravity) s.vy += s.gravity * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt;
          if (s.life <= 0) sparks.splice(i, 1);
        }
        for (let i = freedWisps.length - 1; i >= 0; i--) {
          const w = freedWisps[i];
          w.x += w.vx * dt + Math.sin(time * 8 + i) * 28 * dt;
          w.y += w.vy * dt;
          w.life -= dt;
          if (w.life <= 0) freedWisps.splice(i, 1);
        }

        if (fatalDamage || wyvern.hp <= 0) {
          return {
            outcome: 'loss',
            reason: 'hp',
            score,
            stats: { captivesSaved, captivesLost }
          };
        }

        return null;
      },

      beginOutcomeAnimation(result, audio) {
        if (result.outcome !== 'loss') return 0;
        motion.falling = true;
        motion.fall = 0;
        audio?.setWaterSkim?.(false);
        audio?.playWyvernScreech?.();
        return DEFEAT_DURATION;
      },

      updateOutcomeAnimation(dt) {
        time += dt;
        screenShake = Math.max(0, screenShake - dt * 26);
        motion.venom = Math.max(0, motion.venom - dt);
        motion.fall = clamp(motion.fall + dt / DEFEAT_DURATION);
        wyvern.evadeTimer = Math.max(0, wyvern.evadeTimer - dt);
        wyvern.slashTimer = Math.max(0, wyvern.slashTimer - dt);
        updateWyvernMotion(dt, 0, 0, false, false);
      },

      render(ctx, W, H, Art) {
        ctx.save();
        if (screenShake > 0) {
          ctx.translate(
            Math.round((Math.random() - 0.5) * screenShake),
            Math.round((Math.random() - 0.5) * screenShake)
          );
        }

        // 1. Tatalian Reed-Fens Parallax Backdrop (bg_fens_sky.jpg seamless mirrored strip)
        const fensStrip = Art.getFensMirroredSky ? Art.getFensMirroredSky() : null;
        const skyTop = HUD_H - 2;
        const skyH = WATER_Y - skyTop + 12;
        if (fensStrip) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const scale = skyH / fensStrip.height;
          const drawW = fensStrip.width * scale;
          const scroll = ((riverDist * 0.34) % drawW + drawW) % drawW;
          ctx.drawImage(fensStrip, -scroll, skyTop, drawW, skyH);
          if (drawW - scroll < W) {
            ctx.drawImage(fensStrip, drawW - scroll, skyTop, drawW, skyH);
          }
        } else {
          const bgGrad = ctx.createLinearGradient(0, skyTop, 0, WATER_Y);
          bgGrad.addColorStop(0, '#102b26');
          bgGrad.addColorStop(1, '#245947');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, skyTop, W, skyH);
        }

        // Atmospheric marsh mist & drifting firefly spores (integer pixel quads)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < 14; i++) {
          const fx = ((1120 - ((riverDist * 0.55 + i * 97) % 1180)) + 1180) % 1180 - 20;
          const fy = 150 + ((i * 53) % 310) + Math.round(Math.sin(time * 2.2 + i) * 8);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(182, 255, 138, 0.55)' : 'rgba(112, 224, 178, 0.38)';
          ctx.fillRect(Math.round(fx), Math.round(fy), 3, 3);
        }
        ctx.restore();

        // 2. Stage 3 Deyja Iron Floodgate looming ahead as gateTimer runs low
        const floodgateStamp = Art.getPixelSprite('propFloodgate');
        if (boss.active && floodgateStamp && boss.gateTimer < 18) {
          const urgency = 1 - boss.gateTimer / 18;
          const gx = Math.round(W - urgency * 205);
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(floodgateStamp, gx, HUD_H + 6, 156, WATER_Y - HUD_H + 8);
          ctx.restore();
        }

        // 3. Wooden Stilt-Docks & River Snags
        const dockStamp = Art.getPixelSprite('propStiltDock');
        if (dockStamp) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          for (const d of docks) {
            const dx = Math.round(d.wx - riverDist);
            if (dx < -140 || dx > W + 140) continue;
            const dw = d.wide ? 148 : 112;
            const dh = Math.max(76, WATER_Y - d.deckY + 34);
            ctx.drawImage(dockStamp, Math.round(dx - dw * 0.5), Math.round(d.deckY - 4), dw, dh);
          }
          ctx.restore();
        }

        const snagStamp = Art.getPixelSprite('propRiverSnag');
        if (snagStamp) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          for (const sn of snags) {
            const sx = Math.round(sn.wx - riverDist);
            if (sx < -90 || sx > W + 90) continue;
            ctx.drawImage(snagStamp, sx - 36, WATER_Y - 38, 72, 52);
          }
          ctx.restore();
        }

        // 4. Escort Skiffs (prop_skiff.jpg, magenta-keyed)
        const skiffIm = Art.getImage('propSkiff');
        const wake1 = Art.getPixelSprite('fxWaterWake1');
        const wake2 = Art.getPixelSprite('fxWaterWake2');
        for (const sk of skiffs) {
          if (!sk.alive) continue;
          const skx = sk.wx - riverDist;
          if (skx < -140 || skx > W + 140) continue;
          const bob = Math.sin(time * 4.5 + sk.id) * 2.5;
          if (skiffIm) {
            const sh = 64;
            const sw = sh * (skiffIm.width / skiffIm.height);
            ctx.drawImage(skiffIm, skx - sw * 0.5, sk.y - sh + 10 + bob, sw, sh);
          }
          const wkStamp = Math.floor(time * 10 + sk.id) % 2 === 0 ? wake1 : wake2;
          if (wkStamp) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(wkStamp, Math.round(skx - 62), WATER_Y - 4, 52, 16);
            ctx.restore();
          }
        }

        // 5. Stage 3 Boss: The Iron Soul-Barge & Lich Overseer Morvain
        if (boss.active) {
          const bargeIm = Art.getImage('propSoulBarge');
          const bBob = Math.sin(time * 2.8) * 3;
          const bx = boss.bargeX;
          const by = boss.bargeY + bBob;

          if (bargeIm) {
            const bw = 415;
            const bh = bw * (bargeIm.height / bargeIm.width);
            ctx.drawImage(bargeIm, bx, by - bh + 18, bw, bh);
          }

          // Churning wake along Barge hull & skull prow
          const bWake = Math.floor(time * 12) % 2 === 0 ? wake1 : wake2;
          if (bWake) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            for (let k = 0; k < 4; k++) {
              ctx.drawImage(bWake, Math.round(bx + 24 + k * 95), WATER_Y - 5, 76, 20);
            }
            ctx.restore();
          }

          // Phase 1 Necrotic Shield Barrier around Stern Phylactery Cradle
          const cradleX = Math.round(bx + 58);
          const cradleY = Math.round(by - 138);
          if (boss.phase === 1) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const pulse = 0.52 + Math.sin(time * 7) * 0.16;
            const shGrad = ctx.createLinearGradient(cradleX - 42, cradleY - 56, cradleX + 42, cradleY + 56);
            shGrad.addColorStop(0, `rgba(66, 245, 167, ${pulse})`);
            shGrad.addColorStop(0.5, `rgba(138, 72, 245, ${pulse * 0.72})`);
            shGrad.addColorStop(1, `rgba(42, 214, 140, ${pulse})`);
            ctx.strokeStyle = '#7dffcb';
            ctx.lineWidth = 3;
            ctx.strokeRect(cradleX - 38, cradleY - 52, 76, 100);
            ctx.fillStyle = shGrad;
            ctx.fillRect(cradleX - 36, cradleY - 50, 72, 96);
            ctx.restore();
          } else if (boss.cradleFlash > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(220, 255, 150, 0.65)';
            ctx.fillRect(cradleX - 32, cradleY - 46, 64, 88);
            ctx.restore();
          }

          // Phase 2 Lich Overseer Morvain hovering above stern deck
          if (boss.phase === 2 && boss.morvainActive) {
            const lichIm = Art.getImage('enemyLichMorvain');
            if (lichIm) {
              const lh = 112;
              const lw = lh * (lichIm.width / lichIm.height);
              ctx.drawImage(lichIm, boss.morvainX - lw * 0.5, boss.morvainY - lh + 16, lw, lh);
            }
          }
        }

        // 6. Enemies on Stilt-Docks & Skiffs + Swamp Gorgon 1.1s Gaze Telegraph / Beam
        for (const e of enemies) {
          if (!e.alive) continue;
          const ex = e.wx - riverDist;
          if (ex < -110 || ex > W + 110) continue;

          const sprKey =
            e.kind === 'gorgon'
              ? 'enemyGorgon'
              : e.kind === 'lizardman'
                ? 'enemyLizardman'
                : 'enemyGnoll';
          const im = Art.getImage(sprKey);
          if (im) {
            const targetH = e.kind === 'gorgon' ? 92 : 76;
            const targetW = targetH * (im.width / im.height);
            const bob = e.onSkiff ? Math.sin(time * 4.5 + e.onSkiff.id) * 2.5 : 0;
            ctx.drawImage(im, ex - targetW * 0.5, e.y - targetH + 6 + bob, targetW, targetH);
          }

          // Swamp Gorgon Petrifying Gaze Telegraph & Stepped Pixel Beam (Zero ctx.arc!)
          if (e.kind === 'gorgon' && (e.gazeState === 'telegraph' || e.gazeState === 'firing')) {
            const headX = ex - 38;
            const headY = e.y - 48;
            const cosA = Math.cos(e.gazeAngle);
            const sinA = Math.sin(e.gazeAngle);

            ctx.save();
            ctx.imageSmoothingEnabled = false;
            if (e.gazeState === 'telegraph') {
              const blink = Math.floor(time * 18) % 2 === 0;
              ctx.fillStyle = blink ? '#eaff75' : '#58f27c';
              // Glowing eye quad
              ctx.fillRect(Math.round(headX - 3), Math.round(headY - 3), 6, 6);
              // Dotted pixel sightline warning cone
              for (let dist = 18; dist < 760; dist += 22) {
                const px = Math.round(headX + cosA * dist);
                const py = Math.round(headY + sinA * dist);
                ctx.fillStyle = blink ? 'rgba(238, 255, 118, 0.85)' : 'rgba(92, 245, 128, 0.55)';
                ctx.fillRect(px - 3, py - 2, 7, 4);
              }
            } else {
              // Full stepped pixel-art Petrifying Gaze Beam!
              for (let dist = 12; dist < 800; dist += 10) {
                const px = Math.round(headX + cosA * dist);
                const py = Math.round(headY + sinA * dist);
                const halfH = Math.round(6 + (dist / 800) * 18);
                ctx.fillStyle = 'rgba(72, 232, 108, 0.48)';
                ctx.fillRect(px - 5, py - halfH, 11, halfH * 2);
                ctx.fillStyle = '#eaff85';
                ctx.fillRect(px - 4, py - Math.max(2, Math.round(halfH * 0.42)), 9, Math.max(4, Math.round(halfH * 0.84)));
              }
            }
            ctx.restore();
          }
        }

        // 7. Soul-Lanterns, Necrotic Chains & Shackled Captive Cages
        const lanternIm = Art.getImage('propSoulLantern');
        const cageIm = Art.getImage('propCaptiveCage');
        const chainStamp = Art.getPixelSprite('fxChainLink');

        for (const rig of captiveRig) {
          const rx = rig.onBarge ? boss.bargeX + rig.bargeOffsetX : rig.wx - riverDist;
          if (rx < -100 || rx > W + 100) continue;
          const sway = rig.chainCut ? 0 : Math.sin(rig.swingPhase) * 4;
          const drawX = rx + sway;

          // Intact Chain Links from Canopy / Rigging down to Soul-Lantern & Captive Cage
          if (!rig.chainCut && chainStamp) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const topAnchor = rig.onBarge ? rig.lanternOffsetY - 58 : HUD_H + 18;
            for (let cy = topAnchor; cy < rig.cageOffsetY - 26; cy += 13) {
              ctx.drawImage(chainStamp, Math.round(drawX - 4), Math.round(cy), 9, 14);
            }
            // Energy tether into Barge Phylactery Shield in Phase 1
            if (rig.onBarge && boss.phase === 1) {
              const cradleX = boss.bargeX + 58;
              const cradleY = boss.bargeY - 138;
              for (let s = 1; s <= 5; s++) {
                const t = s / 6;
                const tx = Math.round(drawX + (cradleX - drawX) * t);
                const ty = Math.round(rig.lanternOffsetY + (cradleY - rig.lanternOffsetY) * t);
                ctx.fillStyle = s % 2 === 0 ? '#6effc8' : '#b47aff';
                ctx.fillRect(tx - 2, ty - 2, 5, 5);
              }
            }
            ctx.restore();
          }

          // Soul-Lantern (extinguished/dropped once chain is severed)
          if (!rig.chainCut && lanternIm) {
            const lh = 64;
            const lw = lh * (lanternIm.width / lanternIm.height);
            ctx.drawImage(lanternIm, drawX - lw * 0.5, rig.lanternOffsetY - lh * 0.5, lw, lh);
          }

          // Shackled Captive Cage
          if (rig.state !== 'killed' && rig.cageOffsetY < WATER_Y + 32 && cageIm) {
            const ch = 68;
            const cw = ch * (cageIm.width / cageIm.height);
            ctx.drawImage(cageIm, drawX - cw * 0.5, rig.cageOffsetY - ch * 0.5, cw, ch);
          }
        }

        // 8. Drifting Toxic Swamp Spore-Clouds
        const sporeStamp = Art.getPixelSprite('fxSporeCloud');
        if (sporeStamp) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          for (const sp of sporeClouds) {
            if (!sp.alive) continue;
            const spx = Math.round(sp.wx - riverDist);
            if (spx < -80 || spx > W + 80) continue;
            ctx.drawImage(sporeStamp, spx - 32, Math.round(sp.y - 24), 64, 48);
          }
          ctx.restore();
        }

        // 9. Stygian River Geysers (Boss Phase 2)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const gy of geysers) {
          const gx = Math.round(gy.x);
          if (gy.telegraph > 0) {
            const flash = Math.floor(time * 16) % 2 === 0;
            ctx.fillStyle = flash ? '#7effb8' : '#9c5cff';
            ctx.fillRect(gx - 26, WATER_Y - 5, 52, 8);
          } else {
            ctx.fillStyle = 'rgba(92, 42, 168, 0.72)';
            ctx.fillRect(gx - 22, 275, 44, WATER_Y - 275);
            ctx.fillStyle = '#7dffbf';
            ctx.fillRect(gx - 10, 275, 20, WATER_Y - 275);
          }
        }
        ctx.restore();

        // 10. Hanging Cypress Canopy Roof & Overhang Hazards (prop_cypress_branch.jpg)
        const branchIm = Art.getImage('propCypressBranch');
        if (branchIm) {
          for (const b of branches) {
            const bx = b.wx - riverDist;
            if (bx < -220 || bx > W + 220) continue;
            const bh = b.reachY - (HUD_H - 4);
            ctx.save();
            ctx.translate(bx, HUD_H - 4);
            if (b.flip) ctx.scale(-1, 1);
            ctx.drawImage(branchIm, -b.w * 0.5, 0, b.w, bh);
            ctx.restore();
          }
        }
        // Continuous top ironwood canopy shadow valance directly beneath HUD
        const canopyShade = ctx.createLinearGradient(0, HUD_H, 0, HUD_H + 26);
        canopyShade.addColorStop(0, 'rgba(8, 18, 14, 0.92)');
        canopyShade.addColorStop(1, 'rgba(8, 18, 14, 0)');
        ctx.fillStyle = canopyShade;
        ctx.fillRect(0, HUD_H, W, 26);

        // 11. Skithra: flight rig, authored steering views and action poses.
        drawWyvern(ctx, Art);

        // 12. Tail-Claw Crescent Arcs (fx_claw_arc) & Caustic Acid-Venom Globs (fx_acid_glob)
        const claw1 = Art.getPixelSprite('fxClawArc1');
        const claw2 = Art.getPixelSprite('fxClawArc2');
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const arc of clawArcs) {
          const ratio = arc.life / arc.maxLife;
          const cStamp = ratio > 0.5 ? claw1 : claw2;
          if (cStamp) {
            const cw = arc.big ? 62 : 48;
            const ch = arc.big ? 98 : 78;
            ctx.globalAlpha = Math.min(1, ratio * 1.6);
            ctx.drawImage(cStamp, Math.round(arc.x - cw * 0.5), Math.round(arc.y - ch * 0.5), cw, ch);
          }
        }
        ctx.restore();

        const acid1 = Art.getPixelSprite('fxAcidGlob1');
        const acid2 = Art.getPixelSprite('fxAcidGlob2');
        for (const g of acidGlobs) {
          const aStamp = Math.floor(time * 16) % 2 === 0 ? acid1 : acid2;
          if (aStamp) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const releaseBlend = ease(clamp((g.life - 1.93) / 0.07));
            ctx.translate(
              Math.round(g.x + g.releaseOffsetX * releaseBlend),
              Math.round(g.y + g.releaseOffsetY * releaseBlend)
            );
            ctx.rotate(Math.atan2(g.vy, g.vx));
            ctx.drawImage(aStamp, -16, -12, 32, 24);
            ctx.restore();
          }
        }

        // 13. Enemy Projectiles (Poison Darts, Hooked Axes, Bone Bolts, Morvain Skull Bolts)
        const dartStamp = Art.getPixelSprite('projPoisonDart');
        const axeStamp = Art.getPixelSprite('projGnollAxe');
        const boneBoltStamp = Art.getPixelSprite('projBoneBolt');
        const skullStamp = Art.getPixelSprite('projSkullBolt');

        for (const p of enemyProj) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(Math.round(p.x), Math.round(p.y));
          if (p.type === 'dart' && dartStamp) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.drawImage(dartStamp, -14, -5, 28, 10);
          } else if (p.type === 'axe' && axeStamp) {
            ctx.rotate(p.rot);
            ctx.drawImage(axeStamp, -13, -13, 26, 26);
          } else if (p.type === 'bone_bolt' && boneBoltStamp) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.drawImage(boneBoltStamp, -20, -6, 40, 12);
          } else if (skullStamp) {
            ctx.drawImage(skullStamp, -13, -13, 26, 26);
          }
          ctx.restore();
        }

        // 14. Tatalian Jade River Water Foreground & Pixel Water-Skim Wakes (fx_water_wake)
        const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, H);
        waterGrad.addColorStop(0, 'rgba(22, 86, 68, 0.93)');
        waterGrad.addColorStop(0.35, 'rgba(13, 56, 46, 0.97)');
        waterGrad.addColorStop(1, '#07211b');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, WATER_Y, W, H - WATER_Y);

        // Scrolling jade surface ripples (100% crisp pixel quads)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let wx = 0; wx < W; wx += 18) {
          const shift = Math.round(((riverDist * 1.15 + wx) % 18));
          const rx = wx - shift;
          const ry = WATER_Y + 2 + Math.round(Math.sin(time * 4.2 + wx * 0.07) * 2);
          ctx.fillStyle = 'rgba(156, 245, 212, 0.65)';
          ctx.fillRect(rx, ry, 11, 2);
          ctx.fillStyle = 'rgba(62, 168, 134, 0.5)';
          ctx.fillRect(rx + 4, ry + 14 + ((wx * 7) % 42), 14, 2);
        }

        for (const wk of wakes) {
          const ratio = wk.life / wk.maxLife;
          const st = ratio > 0.5 ? wake1 : wake2;
          if (st) {
            ctx.globalAlpha = Math.min(1, ratio * 1.4);
            const ww = Math.round(24 * wk.scale);
            const wh = Math.round(9 * wk.scale);
            ctx.drawImage(st, Math.round(wk.x), Math.round(wk.y - wh + 5), ww, wh);
          }
        }
        ctx.restore();

        // Freed Spirit Wisps & Integer Pixel Sparks
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (const fw of freedWisps) {
          ctx.globalAlpha = Math.max(0, fw.life / fw.maxLife);
          ctx.fillStyle = '#45f5b5';
          ctx.fillRect(Math.round(fw.x - 3), Math.round(fw.y - 3), 6, 6);
          ctx.fillStyle = '#ebfff7';
          ctx.fillRect(Math.round(fw.x - 1), Math.round(fw.y - 1), 3, 3);
        }
        ctx.restore();

        for (const s of sparks) {
          Art.drawSpark(ctx, s, 0);
        }

        // 15. Ornate Fortress Jade & Gold 72px Top HUD
        this.renderHUD(ctx, W, Art);

        ctx.restore();
      },

      renderHUD(ctx, W, Art) {
        const hudTile = Art.getImage('hudBarTile');
        if (hudTile) {
          const tileW = HUD_H * (hudTile.width / hudTile.height);
          for (let x = 0; x < W; x += tileW) {
            ctx.drawImage(hudTile, x, 0, tileW + 1, HUD_H);
          }
        } else {
          ctx.fillStyle = '#141c17';
          ctx.fillRect(0, 0, W, HUD_H);
        }

        // Subtle Fortress jade border trim
        ctx.fillStyle = '#c89b3c';
        ctx.fillRect(0, HUD_H - 2, W, 2);

        // Left Slot 1: Wyvern Vitality Gauge (5 Jade-Scale Hearts + HP readout)
        const scaleFull = Art.getPixelSprite('hudWyvernScale');
        const scaleEmpty = Art.getPixelSprite('hudWyvernScaleEmpty');
        const fullHearts = Math.ceil((wyvern.hp / wyvern.maxHp) * 5);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < 5; i++) {
          const st = i < fullHearts ? scaleFull : scaleEmpty;
          if (st) {
            ctx.drawImage(st, 14 + i * 24, 10, 22, 22);
          }
        }
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillStyle = wyvern.hp <= 30 ? '#ff6b78' : '#dcffe6';
        ctx.font = 'bold 12px Georgia, serif';
        ctx.fillText(`WYVERN VITALITY: ${Math.ceil(wyvern.hp)}%`, 15, 51);

        // Left Slot 2: Acid-Venom Gland Vial
        const vialStamp = Art.getPixelSprite('hudVenomVial');
        if (vialStamp) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(vialStamp, 176, 8, 28, 42);
          ctx.restore();
        }
        const vBarX = 208;
        const vBarY = 26;
        const vBarW = 88;
        ctx.fillStyle = '#0c1710';
        ctx.fillRect(vBarX, vBarY, vBarW, 10);
        const vFill = Math.round((vBarW - 2) * (wyvern.venom / wyvern.maxVenom));
        ctx.fillStyle = wyvern.skimming ? '#9eff5c' : '#3ad45b';
        ctx.fillRect(vBarX + 1, vBarY + 1, vFill, 8);
        ctx.strokeStyle = '#c89b3c';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(vBarX, vBarY, vBarW, 10);

        ctx.fillStyle = '#f6df96';
        ctx.font = 'bold 11px Georgia, serif';
        ctx.fillText(`VENOM: ${Math.round(wyvern.venom)}%`, vBarX, 20);
        ctx.fillStyle = wyvern.skimming ? '#a8ff78' : '#bfb59b';
        ctx.font = 'bold 10.5px Georgia, serif';
        ctx.fillText(wyvern.skimming ? 'Skim Refill!' : 'Skim Low +3x', vBarX, 51);

        // Center Slot: Gorge Progress OR Stage 3 Soul-Barge & 45s Floodgate Timer!
        const centerX = 548;
        ctx.textAlign = 'center';

        if (!boss.active) {
          const stageLabel =
            stage === 1 ? 'STAGE I: REED DELTA' : 'STAGE II: STILT NARROWS';
          ctx.fillStyle = '#ffe9a6';
          ctx.font = 'bold 12px "Palatino Linotype", Georgia, serif';
          ctx.fillText(`${stageLabel}  •  PURSUING IRON SOUL-BARGE`, centerX, 23);

          const barW = 290;
          const barX = Math.round(centerX - barW * 0.5);
          const barY = 31;
          ctx.fillStyle = '#0c0f0d';
          ctx.fillRect(barX, barY, barW, 8);
          ctx.strokeStyle = '#b88e3d';
          ctx.strokeRect(barX, barY, barW, 8);

          const prog = Math.max(0, Math.min(1, riverDist / STAGE3_DIST));
          ctx.fillStyle = '#3dc97e';
          ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * prog), 6);

          const gem = Art.getPixelSprite('hudGem');
          if (gem) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(gem, Math.round(barX + barW * prog - 5), barY - 2, 11, 11);
            ctx.restore();
          }
        } else {
          // Stage 3 Boss Readout + 45s Deyja Floodgate Countdown!
          const urgent = boss.gateTimer < 12;
          ctx.fillStyle = urgent ? '#ff6e7a' : '#ffe48a';
          ctx.font = 'bold 12px "Palatino Linotype", Georgia, serif';
          const phaseTitle =
            boss.phase === 1
              ? `SOUL-LANTERN CHAINS: ${boss.chainsTotal - boss.chainsCut} INTACT  •  DEYJA LOCK: ${boss.gateTimer.toFixed(1)}s`
              : `PHYLACTERY CRADLE & MORVAIN  •  DEYJA LOCK: ${boss.gateTimer.toFixed(1)}s`;
          ctx.fillText(phaseTitle, centerX, 23);

          const barW = 296;
          const barX = Math.round(centerX - barW * 0.5);
          const barY = 31;
          ctx.fillStyle = '#120a17';
          ctx.fillRect(barX, barY, barW, 9);
          ctx.strokeStyle = '#d4a644';
          ctx.strokeRect(barX, barY, barW, 9);

          const bossRatio =
            boss.phase === 1
              ? (boss.chainsTotal - boss.chainsCut) / boss.chainsTotal
              : boss.cradleHp / boss.maxCradleHp;
          ctx.fillStyle = boss.phase === 1 ? '#52e8a8' : '#b45cff';
          ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * bossRatio), 7);
        }

        const capColor = captivesLost >= 5 ? '#ff737f' : '#e6d8b5';
        ctx.fillStyle = capColor;
        ctx.font = 'bold 11px Georgia, serif';
        ctx.fillText(
          `CAPTIVES SAVED: ${captivesSaved}/${TOTAL_CAPTIVES}  (LOST: ${captivesLost}/${MAX_CAPTIVES_LOST})   •   GLORY: ${score}`,
          centerX,
          55
        );

        // Right Slot (below #top-controls): Skim Speed Boost Indicator
        ctx.fillStyle = wyvern.skimming ? '#7effa8' : wyvern.swoop > 0.3 ? '#ffe27a' : '#cfc2a5';
        ctx.font = 'bold 11px Georgia, serif';
        const modeTxt = wyvern.skimming
          ? `WATER SKIM +30% (${Math.round(scrollSpeed)} px/s)`
          : wyvern.swoop > 0.3
            ? 'DIVE-SWOOP ACTIVE!'
            : `SPEED: ${Math.round(scrollSpeed)} px/s`;
        ctx.fillText(modeTxt, W - 135, 55);

        // Status Scroll Toast Banner
        if (statusBanner.timer > 0) {
          const bw = 660;
          const bx = Math.round((W - bw) * 0.5);
          const by = 80;
          ctx.fillStyle = 'rgba(14, 20, 17, 0.93)';
          ctx.fillRect(bx, by, bw, 30);
          ctx.strokeStyle = '#d4a644';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, bw, 30);
          ctx.fillStyle = '#fff2bd';
          ctx.font = 'bold 12.5px "Palatino Linotype", Georgia, serif';
          ctx.fillText(statusBanner.text, W * 0.5, by + 20);
        }

        ctx.shadowBlur = 0;
      }
    };
  }

  window.ThanatosMissions[2] = createMission2Controller();
})();
