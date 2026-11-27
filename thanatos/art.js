(() => {
  const Art = {};

  const SPRITE_PATHS = {
    campaignMapBg: 'assets/raw/campaign_map_bg.jpg',
    skyBg: 'assets/raw/sky_mountains_bg.jpg',
    fensSkyBg: 'assets/raw/bg_fens_sky.jpg',
    groundTile: 'assets/sprites/ground_tile.png',
    seaTile: 'assets/sprites/sea_tile.png',
    hudBarTile: 'assets/sprites/hud_bar_tile.png',
    hudChalice: 'assets/sprites/hud_chalice_raw.png',
    hudHeart: 'assets/sprites/hud_heart_raw.png',

    dragonUp: 'assets/sprites/dragon_up.png',
    dragonGlide: 'assets/sprites/dragon_glide.png',
    dragonFire: 'assets/sprites/dragon_fire.png',
    dragonRest: 'assets/sprites/dragon_rest.png',
    dragonWalk1: 'assets/sprites/dragon_walk_1.png',
    dragonWalk2: 'assets/sprites/dragon_walk_2.png',
    veridiasHeadingG3: 'assets/sprites/veridias_heading_g3.png',
    veridiasRigG3: 'assets/sprites/veridias_rig_g3.png',

    archer: 'assets/sprites/unit_archer.png',
    spearman: 'assets/sprites/unit_spearman.png',
    stoner: 'assets/sprites/unit_stoner.png',
    princess: 'assets/sprites/princess.png',
    princessRider: 'assets/sprites/princess_rider_alpha.png',
    isoldeMotionG3: 'assets/sprites/isolde_motion_g3.png',

    bee1: 'assets/sprites/bee_1.png',
    bee2: 'assets/sprites/bee_2.png',
    serpentIdle: 'assets/sprites/serpent_idle.png',
    serpentSpit: 'assets/sprites/serpent_spit.png',
    hydraLeap: 'assets/sprites/hydra_leap.png',
    hydraBite: 'assets/sprites/hydra_bite.png',

    castleKeep: 'assets/sprites/castle_keep.png',
    watchtower: 'assets/sprites/watchtower.png',
    treeOak: 'assets/sprites/tree_oak.png',
    treePine: 'assets/sprites/tree_pine.png',
    boulder: 'assets/sprites/boulder.png',

    // Mission 2 — Venom in the Reed-Fens (#FF00FF magenta-keyed sprites)
    wyvernFly1: 'assets/sprites/wyvern_fly_1.png',
    skithraFlightRig: 'assets/sprites/skithra_flight_rig.png',
    skithraDirections: 'assets/sprites/skithra_directions.png',
    wyvernFly2: 'assets/sprites/wyvern_fly_2.png',
    wyvernSlash: 'assets/sprites/wyvern_slash.png',
    enemyLizardman: 'assets/sprites/enemy_lizardman.png',
    enemyGnoll: 'assets/sprites/enemy_gnoll.png',
    enemyGorgon: 'assets/sprites/enemy_gorgon.png',
    enemyLichMorvain: 'assets/sprites/enemy_lich_morvain.png',
    propSoulBarge: 'assets/sprites/prop_soul_barge.png',
    propSkiff: 'assets/sprites/prop_skiff.png',
    propCaptiveCage: 'assets/sprites/prop_captive_cage.png',
    propSoulLantern: 'assets/sprites/prop_soul_lantern.png',
    propCypressBranch: 'assets/sprites/prop_cypress_branch.png',

    // Mission 3 — Ashes of the Velvet Throne (Vampire Lord & Obsidian Keep)
    vampireIdle: 'assets/sprites/vampire_idle.png',
    vampireG3Rig: 'assets/sprites/vampire_g3_rig.png',
    vampireWalk1: 'assets/sprites/vampire_walk_1.png',
    vampireWalk2: 'assets/sprites/vampire_walk_2.png',
    vampireNorth: 'assets/sprites/vampire_north.png',
    vampireSlash: 'assets/sprites/vampire_slash.png',
    vampireMist: 'assets/sprites/vampire_mist.png',
    vampireBite: 'assets/sprites/vampire_bite.png',
    enemyDeathKnight: 'assets/sprites/enemy_death_knight.png',
    enemySkelArcher: 'assets/sprites/enemy_skel_archer.png',
    enemyWraith: 'assets/sprites/enemy_wraith.png',
    bossCultWarlord: 'assets/sprites/boss_cult_warlord.png',
    bossCultMage: 'assets/sprites/boss_cult_mage.png',
    bossGarret: 'assets/sprites/boss_garret.png',
    propReliquary: 'assets/sprites/prop_reliquary.png',
    propIronGrate: 'assets/sprites/prop_iron_grate.png',
    propPillar: 'assets/sprites/prop_pillar.png',
    propGargoyleBrazier: 'assets/sprites/prop_gargoyle_brazier.png',
    keepBloodSeal: 'assets/sprites/prop_blood_seal.png',
    tileObsidianWall: 'assets/sprites/tile_obsidian_wall.png',
    tileObsidianFloor: 'assets/sprites/tile_obsidian_floor.jpg',

    // Mission 4 — The Shattered Ossuary
    boneDragonFlap1: 'assets/sprites/bonedragon_flap_1.png',
    boneDragonG3: 'assets/sprites/bonedragon_g3.png',
    boneDragonFlap2: 'assets/sprites/bonedragon_flap_2.png',
    boneDragonSurge: 'assets/sprites/bonedragon_surge.png',
    boneDragonFire: 'assets/sprites/bonedragon_fire.png',
    ossuaryWarden: 'assets/sprites/enemy_necro_warden.png',
    boneCatapult: 'assets/sprites/enemy_bone_catapult.png',
    ghostWyrm: 'assets/sprites/enemy_ghost_wyrm.png',
    bossMalakor: 'assets/sprites/boss_malakor.png',
    soulPylon: 'assets/sprites/prop_soul_pylon.png',
    spiritCage: 'assets/sprites/prop_spirit_cage.png',
    bindingRune: 'assets/sprites/prop_binding_rune.png',
    boneLedge: 'assets/sprites/prop_bone_ledge.png',
    skySeal: 'assets/sprites/prop_sky_seal.png',
    ossuaryWalls: 'assets/sprites/bg_ossuary_walls.png',
    ghostFire: 'assets/sprites/fx_ghost_fire.png',
    soulMiasma: 'assets/sprites/fx_soul_miasma.png',
    soulWisp: 'assets/sprites/fx_spirit_wisp.png',
    boneCrest: 'assets/sprites/hud_bone_crest.png',
    ossuaryStalactite: 'assets/sprites/prop_ossuary_stalactite.png',
    catapultSkull: 'assets/sprites/proj_catapult_skull.png',
    bindingBolt: 'assets/sprites/proj_binding_bolt.png',
    ossuaryVent: 'assets/sprites/prop_ossuary_vent.png',
    ossuaryBurst: 'assets/sprites/fx_ossuary_burst.png',
    ossuaryShield: 'assets/sprites/fx_ossuary_shield.png',

    // Mission 5 — Thunder Above the Cloud-Spire
    titanWalk1: 'assets/sprites/titan_walk_1.png',
    titanWalk2: 'assets/sprites/titan_walk_2.png',
    titanStrideParts: 'assets/sprites/titan_stride_parts.png',
    titanG3Actions: 'assets/sprites/titan_g3_actions.png',
    titanThrow: 'assets/sprites/titan_throw.png',
    titanShield: 'assets/sprites/titan_shield.png',
    titanStomp: 'assets/sprites/titan_stomp.png',
    siegeGolem: 'assets/sprites/enemy_iron_golem.png',
    dreadBallista: 'assets/sprites/enemy_ballista.png',
    nighonManticore: 'assets/sprites/enemy_manticore.png',
    obsidianColossus: 'assets/sprites/boss_obsidian_colossus.png',
    ironSiegeBolt: 'assets/sprites/proj_iron_siege_bolt.png',
    isoldeBanner: 'assets/sprites/ally_isolde_banner.png',
    castleMedic: 'assets/sprites/ally_castle_medic.png',
    seraphiel: 'assets/sprites/ally_seraphiel.png',
    skybridgeMarble: 'assets/sprites/tile_skybridge_marble.png',
    skybridgeNearPost: 'assets/sprites/prop_skybridge_near_post.png',
    chainLightning: 'assets/sprites/fx_chain_lightning.png',
    shieldWard: 'assets/sprites/fx_shield_ward.png',
    stompWave: 'assets/sprites/fx_stomp_wave.png',
    titanCrest: 'assets/sprites/hud_titan_crest.png',
    bracadaPeaks: 'assets/sprites/bg_bracada_peaks.png',

    // Mission 6 — The Crown of Living Memory
    azureFly1: 'assets/sprites/azuredragon_fly_1.png',
    azureFly2: 'assets/sprites/azuredragon_fly_2.png',
    azureFlightRig: 'assets/sprites/azuredragon_flight_rig.png',
    azureG3Turns: 'assets/sprites/azuredragon_g3_turns.png',
    azureG5Pilot: 'assets/sprites/azuredragon_g5_pilot.png',
    azureG5Turns: 'assets/sprites/azuredragon_g5_turns.png',
    azureG5Motion: 'assets/sprites/azuredragon_g5_motion.png',
    azureFrost: 'assets/sprites/azuredragon_frost.png',
    azureRoar: 'assets/sprites/azuredragon_roar.png',
    azureDash: 'assets/sprites/azuredragon_dash.png',
    dreadDragonFly1: 'assets/sprites/boss_dread_dragon_1.png',
    dreadDragonFly2: 'assets/sprites/boss_dread_dragon_2.png',
    dreadDragonDamaged: 'assets/sprites/boss_dread_dragon_damaged.png',
    thanatosLich: 'assets/sprites/boss_thanatos_lich.png',
    blackScaleWyrm: 'assets/sprites/enemy_black_wyrm.png',
    dreadPriest: 'assets/sprites/enemy_dread_priest.png',
    shadowWyvern: 'assets/sprites/boss_shadow_wyvern.png',
    shadowBoneDragon: 'assets/sprites/boss_shadow_bonedragon.png',
    blackAltar: 'assets/sprites/prop_black_altar.png',
    altarAnchor: 'assets/sprites/prop_altar_anchor.png',
    starFrost: 'assets/sprites/fx_star_frost.png',
    fearRing: 'assets/sprites/fx_fear_ring.png',
    redLightning: 'assets/sprites/fx_red_lightning.png',
    azureCrest: 'assets/sprites/hud_azure_crest.png',
    calderaSky: 'assets/sprites/bg_caldera_sky.png',
    calderaDawn: 'assets/sprites/bg_caldera_dawn.png',

    // Campaign map heraldry
    mapCrest1: 'assets/sprites/chrome/crest_emerald.png',
    mapCrest2: 'assets/sprites/chrome/crest_wyvern.png',
    mapCrest3: 'assets/sprites/chrome/crest_vampire.png',
    mapCrest4: 'assets/sprites/chrome/crest_bone.png',
    mapCrest5: 'assets/sprites/chrome/crest_titan.png',
    mapCrest6: 'assets/sprites/chrome/crest_azure.png',
    mapStandard1: 'assets/sprites/chrome/standard_emerald.png',
    mapStandard2: 'assets/sprites/chrome/standard_wyvern.png',
    mapStandard3: 'assets/sprites/chrome/standard_vampire.png',
    mapStandard4: 'assets/sprites/chrome/standard_bone.png',
    mapStandard5: 'assets/sprites/chrome/standard_titan.png',
    mapStandard6: 'assets/sprites/chrome/standard_azure.png',
    mapLock: 'assets/sprites/chrome/mission_locked.png',
    mapVictory: 'assets/sprites/chrome/mission_victory.png'
  };

  // Pre-baked to transparent PNGs on disk so file:// never hits tainted-canvas getImageData errors
  const MAGENTA_KEYED_SPRITES = new Set();
  const HERO_PACKS = {
    1: ['veridiasHeadingG3', 'veridiasRigG3', 'isoldeMotionG3'],
    2: ['skithraFlightRig', 'skithraDirections'],
    3: ['vampireG3Rig'],
    4: ['boneDragonG3'],
    5: ['titanStrideParts', 'titanG3Actions'],
    6: ['azureFlightRig', 'azureG3Turns', 'azureG5Pilot', 'azureG5Turns', 'azureG5Motion']
  };
  const HERO_PACK_KEYS = new Set(Object.values(HERO_PACKS).flat());
  let preparedHeroMission = null;

  const imgs = {};
  const pixelSprites = {};
  let skyMirroredCanvas = null;
  let fensSkyMirroredCanvas = null;

  // Strips #FF00FF / JPEG-magenta fringe cleanly, despills 1-2px outline edges, and trims transparent padding
  function keyMagentaSprite(im, trim = true) {
    const w = im.naturalWidth || im.width;
    const h = im.naturalHeight || im.height;
    if (!w || !h) return im;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const g = srcCanvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0, w, h);

    const imgData = g.getImageData(0, 0, w, h);
    const d = imgData.data;
    const total = w * h;
    const transparent = new Uint8Array(total);
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let qHead = 0;
    let qTail = 0;

    const isExteriorMagenta = (idx4) => {
      const r = d[idx4];
      const gr = d[idx4 + 1];
      const b = d[idx4 + 2];
      // Pure #FF00FF, JPEG compression ringing, & soft pink lantern spill into #FF00FF
      if (r > 155 && b > 140 && gr < 118 && (r - gr) > 78 && (b - gr) > 68) return true;
      // Dark anti-aliased outline blend against #FF00FF on outer silhouette
      if (r > 72 && b > 68 && gr < 36 && (r - gr) > 50 && (b - gr) > 46 && Math.abs(r - b) < 30) return true;
      return false;
    };

    const isCoreMagentaHole = (idx4) => {
      const r = d[idx4];
      const gr = d[idx4 + 1];
      const b = d[idx4 + 2];
      return r > 208 && b > 198 && gr < 62 && (r - gr) > 152 && (b - gr) > 142 && Math.abs(r - b) < 42;
    };

    const isHoleRingMagenta = (idx4) => {
      const r = d[idx4];
      const gr = d[idx4 + 1];
      const b = d[idx4 + 2];
      return r > 145 && b > 135 && gr < 58 && (r - gr) > 100 && (b - gr) > 90 && Math.abs(r - b) < 36;
    };

    const pushSeed = (pIdx) => {
      if (!visited[pIdx]) {
        visited[pIdx] = 1;
        transparent[pIdx] = 1;
        queue[qTail++] = pIdx;
      }
    };

    // 1A. Flood-fill from all 4 image borders
    for (let x = 0; x < w; x++) {
      const top = x;
      const bot = (h - 1) * w + x;
      if (isExteriorMagenta(top * 4)) pushSeed(top);
      if (isExteriorMagenta(bot * 4)) pushSeed(bot);
    }
    for (let y = 0; y < h; y++) {
      const left = y * w;
      const right = y * w + (w - 1);
      if (isExteriorMagenta(left * 4)) pushSeed(left);
      if (isExteriorMagenta(right * 4)) pushSeed(right);
    }

    while (qHead < qTail) {
      const curr = queue[qHead++];
      const cx = curr % w;
      const cy = (curr - cx) / w;
      if (cx > 0) {
        const n = curr - 1;
        if (!visited[n] && isExteriorMagenta(n * 4)) pushSeed(n);
      }
      if (cx < w - 1) {
        const n = curr + 1;
        if (!visited[n] && isExteriorMagenta(n * 4)) pushSeed(n);
      }
      if (cy > 0) {
        const n = curr - w;
        if (!visited[n] && isExteriorMagenta(n * 4)) pushSeed(n);
      }
      if (cy < h - 1) {
        const n = curr + w;
        if (!visited[n] && isExteriorMagenta(n * 4)) pushSeed(n);
      }
    }

    // 1B. Key enclosed #FF00FF holes (cage bars, chain links, cypress moss, barge rigging)
    qHead = 0;
    qTail = 0;
    for (let i = 0; i < total; i++) {
      if (!transparent[i] && isCoreMagentaHole(i * 4)) {
        transparent[i] = 1;
        visited[i] = 1;
        queue[qTail++] = i;
      }
    }
    while (qHead < qTail) {
      const curr = queue[qHead++];
      const cx = curr % w;
      const cy = (curr - cx) / w;
      const neighbors = [];
      if (cx > 0) neighbors.push(curr - 1);
      if (cx < w - 1) neighbors.push(curr + 1);
      if (cy > 0) neighbors.push(curr - w);
      if (cy < h - 1) neighbors.push(curr + w);
      for (let k = 0; k < neighbors.length; k++) {
        const n = neighbors[k];
        if (!visited[n] && isHoleRingMagenta(n * 4)) {
          visited[n] = 1;
          transparent[n] = 1;
          queue[qTail++] = n;
        }
      }
    }

    // Apply transparency mask
    for (let i = 0; i < total; i++) {
      if (transparent[i]) {
        d[i * 4 + 3] = 0;
      }
    }

    // 2. Two-pass edge halo strip & JPEG 4:2:0 magenta despill on 1-2px silhouette border
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        const rowOff = y * w;
        for (let x = 0; x < w; x++) {
          const i = rowOff + x;
          if (d[i * 4 + 3] === 0) continue;

          let touchesAlpha = false;
          if (x > 0 && d[(i - 1) * 4 + 3] === 0) touchesAlpha = true;
          else if (x < w - 1 && d[(i + 1) * 4 + 3] === 0) touchesAlpha = true;
          else if (y > 0 && d[(i - w) * 4 + 3] === 0) touchesAlpha = true;
          else if (y < h - 1 && d[(i + w) * 4 + 3] === 0) touchesAlpha = true;
          if (!touchesAlpha) continue;

          const idx4 = i * 4;
          const r = d[idx4];
          const gr = d[idx4 + 1];
          const b = d[idx4 + 2];

          // Strip residual 1px semi-magenta JPEG anti-alias fringe
          if (pass === 0 && (r - gr) > 58 && (b - gr) > 52 && gr < 75 && Math.abs(r - b) < 42) {
            d[idx4 + 3] = 0;
            continue;
          }

          // Neutralize magenta color spill on dark/neutral outline pixels
          const minRB = r < b ? r : b;
          const spill = minRB - gr - 6;
          if (spill > 0) {
            d[idx4] = Math.max(0, r - spill);
            d[idx4 + 2] = Math.max(0, b - spill);
            if (spill > 75) {
              d[idx4 + 3] = Math.min(d[idx4 + 3], 150);
            }
          }
        }
      }
    }

    // 3. Trim transparent margins while preserving 1:1 sprite aspect ratio
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    if (trim) {
      for (let y = 0; y < h; y++) {
        const rowOff = y * w;
        for (let x = 0; x < w; x++) {
          if (d[(rowOff + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    if (!trim || maxX < minX || maxY < minY) {
      g.putImageData(imgData, 0, 0);
      srcCanvas.naturalWidth = w;
      srcCanvas.naturalHeight = h;
      return srcCanvas;
    }

    const pad = 1;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const outW = maxX - minX + 1;
    const outH = maxY - minY + 1;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const og = outCanvas.getContext('2d');
    og.putImageData(imgData, -minX, -minY);
    outCanvas.naturalWidth = outW;
    outCanvas.naturalHeight = outH;
    return outCanvas;
  }

  Art.keyMagentaSprite = keyMagentaSprite;

  function buildMirroredCanvas(im) {
    const c = document.createElement('canvas');
    const w = im.naturalWidth || im.width;
    const h = im.naturalHeight || im.height;
    c.width = w * 2;
    c.height = h;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w, h);
    g.save();
    g.translate(w * 2, 0);
    g.scale(-1, 1);
    g.drawImage(im, 0, 0, w, h);
    g.restore();
    return c;
  }

  function loadImg(key, src) {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      if (key === 'skyBg') {
        skyMirroredCanvas = buildMirroredCanvas(im);
      } else if (key === 'fensSkyBg') {
        fensSkyMirroredCanvas = buildMirroredCanvas(im);
      } else if (MAGENTA_KEYED_SPRITES.has(key)) {
        imgs[key] = keyMagentaSprite(im, true);
      }
    };
    if (HERO_PACK_KEYS.has(key)) {
      im.onerror = () => {
        if (imgs[key] === im) delete imgs[key];
      };
    }
    imgs[key] = im;
    im.src = src;
  }

  function ready(key) {
    const im = imgs[key];
    if (!im) return false;
    if (typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) {
      return im.width > 0 && im.height > 0;
    }
    if (MAGENTA_KEYED_SPRITES.has(key)) {
      // Wait until onload has keyed out the #FF00FF background into an offscreen canvas
      return false;
    }
    return Boolean(im.complete && im.naturalWidth > 0);
  }

  Art.isReady = ready;
  Art.getImage = function (key) {
    return ready(key) ? imgs[key] : null;
  };
  Art.getPixelSprite = function (key) {
    return pixelSprites[key] || null;
  };
  Art.getFensMirroredSky = function () {
    return fensSkyMirroredCanvas;
  };

  function bakePixelSprite(rows, palette) {
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch !== '.' && palette[ch]) {
          g.fillStyle = palette[ch];
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    return c;
  }

  function buildPixelSprites() {
    // 1. Marksman Arrow (18x7 crisp HoMM3 pixel sprite)
    pixelSprites.projArrow = bakePixelSprite(
      [
        '..ww.........ss...',
        '.www........ssss..',
        'ooowwwwwwwwwwssssS',
        '.oooooooooooSSSSSS',
        'ooowwwwwwwwwwssssS',
        '.www........ssss..',
        '..ww.........ss...'
      ],
      {
        o: '#5c3b1b',
        w: '#f4f0e4',
        s: '#9eb0c4',
        S: '#eef6ff'
      }
    );

    // 2. Halberdier Thrown Spear / Javelin (24x7 pixel sprite)
    pixelSprites.projSpear = bakePixelSprite(
      [
        '...............rr..ss...',
        '..............rrr.ssss..',
        'ddddddddddddddrrrssssssS',
        'oooooooooooooorrrSSSSSSS',
        'ddddddddddddddrrrssssssS',
        '..............rrr.ssss..',
        '...............rr..ss...'
      ],
      {
        d: '#4f3116',
        o: '#8f5f32',
        r: '#b5242c',
        s: '#99aec4',
        S: '#eef7ff'
      }
    );

    // 3. Abyssal Hydra Venom Orb (2-frame 12x12 pixel sprite)
    const venomPal = {
      d: '#0e4d26',
      g: '#24b54e',
      l: '#6df26b',
      y: '#f4ffa6'
    };
    pixelSprites.venom1 = bakePixelSprite(
      [
        '....dddd....',
        '..ddggggdd..',
        '.dggllllggd.',
        '.dglllyylgd.',
        'dggllyyyllgd',
        'dggllyyyllgd',
        'dggllllllggd',
        '.dggggggggd.',
        '.ddggggggdd.',
        '..dddddddd..',
        '.dg......gd.',
        '............'
      ],
      venomPal
    );
    pixelSprites.venom2 = bakePixelSprite(
      [
        '...dddddd...',
        '..dggggggd..',
        '.dggllllggd.',
        'dggllyyyllgd',
        'dgglyyyyylgd',
        'dggllyyyllgd',
        '.dggllllggd.',
        '.ddggggggdd.',
        '...dddddd...',
        '.dg..dd..gd.',
        '.....dg.....',
        '............'
      ],
      venomPal
    );

    // 4. Dragon Flame Breath (4-stage 14x14 pixel-art fire puff & smoke sequence)
    pixelSprites.fire0 = bakePixelSprite(
      [
        '.....oooo.....',
        '...oooooooo...',
        '..oooyyyyooo..',
        '.oooyyyyyyooo.',
        '.ooyywwwwyyoo.',
        'ooyywwwwwwyyoo',
        'ooyywwwwwwyyoo',
        'ooyywwwwwwyyoo',
        '.ooyywwwwyyoo.',
        '.oooyyyyyyooo.',
        '..oooyyyyooo..',
        '...oooooooo...',
        '....oooooo....',
        '..............'
      ],
      { o: '#eb6b15', y: '#ffd24a', w: '#fffbe0' }
    );
    pixelSprites.fire1 = bakePixelSprite(
      [
        '....rrrrrr....',
        '..rrrooorrr...',
        '.rroooooooorr.',
        '.rrooyyyyooor.',
        'rrooyyyyyyoorr',
        'rrooyywwyyoorr',
        'rrooyywwyyoorr',
        'rrooyyyyyyoorr',
        '.rrooyyyyooor.',
        '.rroooooooorr.',
        '..rrrooorrrr..',
        '...rrrrrrrr...',
        '.....rrrr.....',
        '..............'
      ],
      { r: '#c42c12', o: '#f7881e', y: '#ffd859', w: '#fff8cf' }
    );
    pixelSprites.fire2 = bakePixelSprite(
      [
        '...dddddddd...',
        '..ddrrrrrrdd..',
        '.ddrrrrrorrdd.',
        'ddrrrooooorrdd',
        'ddrrooyyyorrdd',
        'ddrrooyyyorrdd',
        'ddrrrooooorrdd',
        '.ddrrrrrorrdd.',
        '.ddrrrrrrrrdd.',
        '..dddrrrrddd..',
        '...dddddddd...',
        '.....dddd.....',
        '..............',
        '..............'
      ],
      { d: '#521712', r: '#a82210', o: '#e86a17', y: '#ffbd42' }
    );
    pixelSprites.fire3 = bakePixelSprite(
      [
        '....ssssss....',
        '..ssddddddss..',
        '.ssddddddddss.',
        '.sddddmmdddds.',
        'ssdddmmmmdddss',
        'ssdddmmmmdddss',
        '.sddddmmdddds.',
        '.ssddddddddss.',
        '..ssddddddss..',
        '....ssssss....',
        '..............',
        '..............',
        '..............',
        '..............'
      ],
      { s: 'rgba(26, 20, 18, 0.55)', d: 'rgba(42, 31, 28, 0.72)', m: 'rgba(68, 44, 36, 0.8)' }
    );

    // 5. Seafoam Splash Crest (10x7 pixel sprite)
    pixelSprites.splashDrop = bakePixelSprite(
      [
        '...wwww...',
        '..wwwwww..',
        '.wwccccww.',
        'wwccccccww',
        'wccccccccw',
        '.bbbbbbbb.',
        '..bb..bb..'
      ],
      {
        w: '#f0fcff',
        c: '#9ce6ff',
        b: '#399ec9'
      }
    );

    // 6. Craggy Boulder Fallback (12x10 pixel sprite)
    pixelSprites.boulderFallback = bakePixelSprite(
      [
        '...dddddd...',
        '.ddlllllldd.',
        'ddllllmmmldd',
        'dllmmmmmmmdd',
        'dlmmmmssssmd',
        'dmmmmssssssd',
        'ddmmssssssdd',
        '.ddssssssdd.',
        '..dddddddd..',
        '............'
      ],
      { d: '#2d2822', l: '#cfc5b4', m: '#9e9585', s: '#6b6357' }
    );

    // 7. HUD Quest Progress Gem (11x11 gold-bezel emerald diamond)
    pixelSprites.hudGem = bakePixelSprite(
      [
        '.....D.....',
        '....DGD....',
        '...DGwGD...',
        '..DGwewGD..',
        '.DGweEewGD.',
        'DGweEEEewGD',
        '.DGweEewGD.',
        '..DGwewGD..',
        '...DGgGD...',
        '....DGD....',
        '.....D.....'
      ],
      {
        D: '#2b1c07',
        G: '#f5d77f',
        g: '#b88628',
        w: '#d9ffcf',
        e: '#5be36b',
        E: '#1f9e3c'
      }
    );

    // 8. Stepped Pixel-Art Ground Shadow (32x7)
    pixelSprites.dragonShadow = bakePixelSprite(
      [
        '........ssssssssssssssss........',
        '....ssssddddddddddddddddssss....',
        '..ssddddddddddddddddddddddddss..',
        'ssddddddddddddddddddddddddddddss',
        '..ssddddddddddddddddddddddddss..',
        '....ssssddddddddddddddddssss....',
        '........ssssssssssssssss........'
      ],
      {
        s: 'rgba(0, 0, 0, 0.28)',
        d: 'rgba(0, 0, 0, 0.52)'
      }
    );

    // ================= MISSION 2 PIXEL-ART FX & PROP STAMPS (ZERO PRIMITIVES) =================

    // 9. fx_acid_glob (2-frame 16x12 caustic Wyvern Acid-Venom Glob with trailing droplets)
    const acidPal = {
      d: '#093818',
      g: '#1ea844',
      l: '#7ef748',
      y: '#e8ff85',
      w: '#fdffde'
    };
    pixelSprites.fxAcidGlob1 = bakePixelSprite(
      [
        '......dddddd....',
        '....ddggggggdd..',
        '..ddggllllllggd.',
        '.dggllllyyylllgd',
        'dg..dllywwwwylgd',
        '.d..dllyyyyyllgd',
        '..ddggllllllggd.',
        '....ddggggggdd..',
        '..dg..dddddd....',
        '.dl.............',
        '................',
        '................'
      ],
      acidPal
    );
    pixelSprites.fxAcidGlob2 = bakePixelSprite(
      [
        '.....ddddddd....',
        '...ddgggggggdd..',
        '.ddgglllllllggd.',
        'dgggllyyyyylllgd',
        '.dggllywwwwyllgd',
        '..dgllyyyyyllgd.',
        '...ddgllllllgd..',
        '.dg..ddggggdd...',
        'dl.....dddd.....',
        '....dg..........',
        '................',
        '................'
      ],
      acidPal
    );
    pixelSprites.fx_acid_glob = pixelSprites.fxAcidGlob1;

    // 10. fx_claw_arc (2-frame 18x26 razor jade-gold Wyvern Tail-Claw Crescent Slash)
    const clawPal = {
      d: '#0d3622',
      j: '#269e62',
      l: '#7cf796',
      g: '#ffe478',
      w: '#ffffff'
    };
    pixelSprites.fxClawArc1 = bakePixelSprite(
      [
        '..dd..............',
        '..ddjjd...........',
        '...ddjljd.........',
        '....ddjlgjd.......',
        '.....ddjlwgjd.....',
        '......ddjlwwgjd...',
        '.......ddjlwwljd..',
        '........ddjlwwwjd.',
        '.........ddjlwwwjd',
        '.........ddjlwwwjd',
        '..........ddjlwwjd',
        '..........ddjlwwjd',
        '..........ddjlwwjd',
        '..........ddjlwwjd',
        '..........ddjlwwjd',
        '..........ddjlwwjd',
        '.........ddjlwwwjd',
        '.........ddjlwwwjd',
        '........ddjlwwwjd.',
        '.......ddjlwwljd..',
        '......ddjlwwgjd...',
        '.....ddjlwgjd.....',
        '....ddjlgjd.......',
        '...ddjljd.........',
        '..ddjjd...........',
        '..dd..............'
      ],
      clawPal
    );
    pixelSprites.fxClawArc2 = bakePixelSprite(
      [
        '....dd............',
        '....ddjjd.........',
        '.....ddjljd.......',
        '......ddjlwjd.....',
        '.......ddjlwwjd...',
        '........ddjlgwwjd.',
        '.........ddjlgwwjd',
        '..........ddjlgwjd',
        '...........ddjlgwd',
        '...........ddjlgwd',
        '...........ddjlgwd',
        '............ddjlwd',
        '............ddjlwd',
        '............ddjlwd',
        '............ddjlwd',
        '...........ddjlgwd',
        '...........ddjlgwd',
        '...........ddjlgwd',
        '..........ddjlgwjd',
        '.........ddjlgwwjd',
        '........ddjlgwwjd.',
        '.......ddjlwwjd...',
        '......ddjlwjd.....',
        '.....ddjljd.......',
        '....ddjjd.........',
        '....dd............'
      ],
      clawPal
    );
    pixelSprites.fx_claw_arc = pixelSprites.fxClawArc1;

    // 11. fx_water_wake (2-frame 24x9 jade-whitewater spray wake for Wyvern skim & river hulls)
    const wakePal = {
      d: '#0b382e',
      j: '#1f7a63',
      c: '#6fe3c1',
      l: '#bffaeb',
      w: '#f5fffe'
    };
    pixelSprites.fxWaterWake1 = bakePixelSprite(
      [
        '..............ww....w...',
        '...........wwllll..wlw..',
        '........wwwllcccclwllw..',
        '.....wwwlllccccccclllww.',
        '..wwwlllcccccccccccccllw',
        'wwlllccccccjjjjjjccccclw',
        'jjjjjjjjjjjddddddjjjjjjj',
        '..dddddddddddddddddddd..',
        '........................'
      ],
      wakePal
    );
    pixelSprites.fxWaterWake2 = bakePixelSprite(
      [
        '...........ww......ww...',
        '........wwwllw...wwllw..',
        '......wwlllccclwwllccw..',
        '...wwwllccccccclllcccww.',
        '.wwlllcccccccccccccccllw',
        'wlllccccjjjjjjjjjjcccclw',
        'jjjjjjjjddddddddddjjjjjj',
        '.dddddddddddddddddddddd.',
        '........................'
      ],
      wakePal
    );
    pixelSprites.fx_water_wake = pixelSprites.fxWaterWake1;

    // 12. Lizardman Poison Dart (16x5 barbed emerald-tipped arrow)
    pixelSprites.projPoisonDart = bakePixelSprite(
      [
        '..gg........ll..',
        '.ggg.......llll.',
        'ggggwwwwwwwllllw',
        '.ggg.......llll.',
        '..gg........ll..'
      ],
      { w: '#6e4a24', g: '#3ad45b', l: '#b8ff73' }
    );

    // 13. Gnoll Hooked Iron Axe (13x13 spinning tomahawk)
    pixelSprites.projGnollAxe = bakePixelSprite(
      [
        '....ddddd....',
        '...dsssssdd..',
        '..dssSSSSssd.',
        '..dssSdddssd.',
        '...dd..wwddd.',
        '......ww.....',
        '.....ww......',
        '....ww.......',
        '...ww........',
        '..ww.........',
        '.dw..........',
        '.............',
        '.............'
      ],
      { d: '#1c1815', s: '#828c96', S: '#dce6f0', w: '#7d4e26' }
    );

    // 14. Soul-Barge Bone-Ballista Bolt (22x7 pale bone & dark iron spear)
    pixelSprites.projBoneBolt = bakePixelSprite(
      [
        '...............bb..ww.',
        '..............bbb.wwww',
        'ddddddddddddddbbbwwwww',
        'iiiiiiiiiiiiiibbbWWWWW',
        'ddddddddddddddbbbwwwww',
        '..............bbb.wwww',
        '...............bb..ww.'
      ],
      { d: '#231c29', i: '#5e556e', b: '#45d98c', w: '#d9d2c5', W: '#fffdf7' }
    );

    // 15. Lich Morvain Necrotic Skull-Bolt (13x13 green-violet flaming skull orb)
    pixelSprites.projSkullBolt = bakePixelSprite(
      [
        '....vvvvv....',
        '..vvgggggvv..',
        '.vgwwwwwwwgv.',
        'vgwWWWWWWWwgv',
        'vgwWddWddWwgv',
        'vgwWggWggWwgv',
        'vgwWWWWWWWwgv',
        '.vgwW.W.Wwgv.',
        '.vvgwwwwwgvv.',
        '..vvgggggvv..',
        '....vvvvv....',
        '.............',
        '.............'
      ],
      { v: '#5a1f8a', g: '#42f285', w: '#cfc8ba', W: '#f7f3eb', d: '#140c1c' }
    );

    // 16. Toxic Swamp Spore-Cloud Cluster (18x14)
    pixelSprites.fxSporeCloud = bakePixelSprite(
      [
        '....gggg..gggg....',
        '..ggllllggllllgg..',
        '.glllyyllllllyllg.',
        'ggllyyylllllyyylgg',
        'gllyyyylllllyyyylg',
        'ggllllllgggllllllg',
        '.ggllllllllllllgg.',
        '..ggglllllyllggg..',
        '...ggllllyyllgg...',
        '....gggllllggg....',
        '......gggggg......',
        '..y.........y.....',
        '.......y..........',
        '..................'
      ],
      {
        g: 'rgba(38, 112, 46, 0.72)',
        l: 'rgba(116, 214, 72, 0.82)',
        y: '#eaff7a'
      }
    );

    // 17. Glowing Necrotic Soul-Chain Link (6x9)
    pixelSprites.fxChainLink = bakePixelSprite(
      [
        '.dddd.',
        'dgglld',
        'dgl.gd',
        'dg..gd',
        'dg..gd',
        'dg..gd',
        'dgl.gd',
        'dgglld',
        '.dddd.'
      ],
      { d: '#191224', g: '#2ec47a', l: '#9effcc' }
    );

    // 18. Tatalian Wooden Stilt-Dock Pier (32x24 -> drawn scaled for Lizardmen/Gnolls/Gorgons)
    pixelSprites.propStiltDock = bakePixelSprite(
      [
        'dddddddddddddddddddddddddddddddd',
        'dwwwwWWWWwwwwWWWWwwwwWWWWwwwwWWd',
        'dmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmD',
        'dddddddddddddddddddddddddddddddd',
        '..dwwd....gggg......gggg..dwwd..',
        '..dwwd.....gg........gg...dwwd..',
        '..dwwd..dddddddddddddddd..dwwd..',
        '..dwwd..dwwwwwwwwwwwwwwd..dwwd..',
        '..dmmd..dddddddddddddddd..dmmd..',
        '..dwwd.......dwwd.........dwwd..',
        '..dwwd.......dwwd.........dwwd..',
        '..dmmd.......dmmd.........dmmd..',
        '..dwwd.......dwwd.........dwwd..',
        '..dwwd.......dwwd.........dwwd..',
        '..dggd.......dggd.........dggd..',
        '..dggd.......dggd.........dggd..',
        '..dddd.......dddd.........dddd..',
        '..dddd.......dddd.........dddd..',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................',
        '................................'
      ],
      { d: '#1c140e', D: '#120c08', w: '#6e4c2e', W: '#946b45', m: '#47301c', g: '#33693b' }
    );

    // 19. Jagged Swamp River Snag / Mossy Rock (22x16)
    pixelSprites.propRiverSnag = bakePixelSprite(
      [
        '.........ddd..........',
        '........dwwwd.........',
        '.......dwwmwwd...dd...',
        '......dwwmmmwwd.dwwd..',
        '..dd..dwmmgmmwwdwwmd..',
        '.dwwddwmmgggmmwwwwmd..',
        '.dwmwwwmgggggmmwwmmd..',
        'dwwmmmwmggggggmmmmmd..',
        'dwmmmmmmmmggggmmmmmmd.',
        'dmmmmmmmmmmmmmmmmmmmd.',
        'dggggmmmmmmmmmmmggggdd',
        'dggggggggmmmmggggggggd',
        'dddddddddddddddddddddd',
        '......................',
        '......................',
        '......................'
      ],
      { d: '#17120d', w: '#6b533b', m: '#453424', g: '#3b7844' }
    );

    // 20. Deyja Iron & Skull Floodgate Bastion (24x40 -> Stage 3 Climax Gate)
    pixelSprites.propFloodgate = bakePixelSprite(
      [
        '..dd......dddd......dd..',
        '.dssd....dssssd....dssd.',
        '.dssddddddssssddddddssd.',
        'ddssssssssWWWWssssssssdd',
        'dssssssssWddddWssssssssd',
        'dssssssssWdggdWssssssssd',
        'dssssssssWWWWWWssssssssd',
        'dssssddddddddddddddssssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssddddddddddddddddsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dsssds..ds..ds..ds.dsssd',
        'dddddddddddddddddddddddd',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................'
      ],
      { d: '#14101c', s: '#4c4659', W: '#d8d0c5', g: '#42f285' }
    );

    // 21. Fortress HUD Artifacts: Jade Scale Heart (13x13), Empty Scale, & Venom Gland Vial (12x18)
    pixelSprites.hudWyvernScale = bakePixelSprite(
      [
        '.....DDD.....',
        '...DDGGGDD...',
        '..DGjllljGD..',
        '.DGjllllljGD.',
        'DGjllwwwlljGD',
        'DGjllwllljjGD',
        'DGjjlllljjjGD',
        '.DGjjlljjjGD.',
        '..DGjjjjjGD..',
        '...DGjjjGD...',
        '....DGjGD....',
        '.....DGD.....',
        '......D......'
      ],
      { D: '#122117', G: '#e8c058', j: '#1c854c', l: '#5cf08e', w: '#e6ffea' }
    );

    pixelSprites.hudWyvernScaleEmpty = bakePixelSprite(
      [
        '.....DDD.....',
        '...DDgggDD...',
        '..DgdddddgD..',
        '.DgdddddddgD.',
        'DgddddsddddgD',
        'DgdddsdddddgD',
        'DgddddsddddgD',
        '.DgdddddddgD.',
        '..DgdddddgD..',
        '...DgdddgD...',
        '....DgddD....',
        '.....DgD.....',
        '......D......'
      ],
      { D: '#120e12', g: '#5e5243', d: '#26201d', s: '#423732' }
    );

    pixelSprites.hudVenomVial = bakePixelSprite(
      [
        '....DDDD....',
        '...DGGGGD...',
        '....DssD....',
        '....DssD....',
        '..DDssssDD..',
        '.Dsllllllsd.',
        'Dslllyyyllsd',
        'Dsllywwwylsd',
        'Dsllyyyyylsd',
        'Dsllllllllsd',
        'Dsggggggggsd',
        'Dsggggggggsd',
        '.Dsggggggsd.',
        '..DDDDDDDD..',
        '............',
        '............',
        '............',
        '............'
      ],
      { D: '#141c14', G: '#e8bd54', s: '#9ec4b8', d: '#141c14', g: '#1ea844', l: '#6cf549', y: '#dfff78', w: '#ffffff' }
    );

    // ================= MISSION 3 PIXEL-ART TILES, PROPS, FX & HUD STAMPS (ZERO PRIMITIVES) =================

    // 22. tileObsidianWall (24x28 oblique 2.5D Gothic Obsidian Wall Block with ruby-mortared archwork)
    pixelSprites.tileObsidianWall = bakePixelSprite(
      [
        'dddddddddddddddddddddddd',
        'dlllllllllllllllllllllld',
        'dlmmmmmmmmmmmmmmmmmmmmld',
        'dlmmssssssmmmmssssssmmld',
        'dlmmsddddsmmmmsddddsmmld',
        'dlmmssssssmmmmssssssmmld',
        'dlmmmmmmmmmmmmmmmmmmmmld',
        'dddddddddddddddddddddddd',
        'dggggggggggggggggggggggd',
        'dgssssssssdgssssssssdgdd',
        'dgsbbbbbbbdgsbbbbbbbdgdd',
        'dgsbrrrrbbdgsbrrrrbbdgdd',
        'dgsbrdddbbdgsbrdddbbdgdd',
        'dgsbrdddbbdgsbrdddbbdgdd',
        'dgsbbbbbbbdgsbbbbbbbdgdd',
        'dddddddddddddddddddddddd',
        'dbbbbbdgssssssssdgbbbbbd',
        'dbdddbdgbbbbbbbbdgdddbbd',
        'dbdddbdgsbrrrrbbdgsddbbd',
        'dbbbbbdgsbrdddbbdgsbbbbd',
        'dddddddgsbbbbbbbdgdddddd',
        'dssssssddddddddddssssssd',
        'dsbbbbbbbbdgsbbbbbbbbbsd',
        'dsbddddddbdgsbddddddbbdd',
        'dsbbbbbbbbdgsbbbbbbbbbsd',
        'drrrrrrrrrrrrrrrrrrrrrrd',
        'dddddddddddddddddddddddd',
        'DDDDDDDDDDDDDDDDDDDDDDDD'
      ],
      {
        D: '#050408',
        d: '#0d0a12',
        b: '#1a1524',
        s: '#2b2438',
        m: '#39314a',
        l: '#564c6b',
        g: '#6d5e85',
        r: '#591625'
      }
    );

    // 23. propPillar (18x34 Ornate Gothic Obsidian & Ruby-Trimmed Cathedral Column)
    pixelSprites.propPillar = bakePixelSprite(
      [
        '..dddddddddddddd..',
        '.dlllllllllllllld.',
        'dlmmmmmmmmmmmmmmld',
        'dggggggggggggggggd',
        '.dssssrrssssrrssd.',
        '..dddddddddddddd..',
        '...dlsbbbbbbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '...dlsbddddbbsld..',
        '...dlsbbbbbbbsld..',
        '..ddlllllllllldd..',
        '.dlmmmmmmmmmmmmld.',
        '.dssssrrssssrrssd.',
        'dlbbbbbbbbbbbbbbld',
        'dlbddddddddddddbld',
        'dddddddddddddddddd',
        '.DDDDDDDDDDDDDDDD.',
        '..DDDDDDDDDDDDDD..',
        '..................'
      ],
      {
        D: 'rgba(0, 0, 0, 0.55)',
        d: '#0e0b14',
        b: '#1f192b',
        s: '#342b45',
        m: '#493e5e',
        l: '#6c5f87',
        g: '#9182ad',
        r: '#8f1d32'
      }
    );

    // 24. propCorpseCandle (2-frame 12x22 Gothic Wax Corpse-Candle Pedestal)
    const candlePal = {
      d: '#120c14',
      i: '#3a3245',
      g: '#9e7c32',
      w: '#dfd5c5',
      s: '#aba08f',
      r: '#d92638',
      o: '#ff8c24',
      y: '#ffe869',
      W: '#fffdf0'
    };
    pixelSprites.propCorpseCandle = bakePixelSprite(
      [
        '.....oo.....',
        '....oyyo....',
        '....oyWo....',
        '....oyWo....',
        '.....oo.....',
        '....dddd....',
        '...dwwwwd...',
        '...dwwwwd...',
        '...dwsswd...',
        '...dwwwwd...',
        '..ddwsswdd..',
        '..dwwwwwwd..',
        '...dwsswd...',
        '..ddggggdd..',
        '.dggggggggd.',
        '..ddiiiidd..',
        '...diiiid...',
        '...diiiid...',
        '..ddiiiidd..',
        '.diiiiiiiiD.',
        'dddddddddddd',
        '............'
      ],
      { ...candlePal, D: '#1f1826' }
    );
    pixelSprites.propCorpseCandle2 = bakePixelSprite(
      [
        '......oo....',
        '.....oyyo...',
        '....ooyWo...',
        '....oyyoo...',
        '.....oo.....',
        '....dddd....',
        '...dwwwwd...',
        '...dwwwwd...',
        '...dwsswd...',
        '...dwwwwd...',
        '..ddwsswdd..',
        '..dwwwwwwd..',
        '...dwsswd...',
        '..ddggggdd..',
        '.dggggggggd.',
        '..ddiiiidd..',
        '...diiiid...',
        '...diiiid...',
        '..ddiiiidd..',
        '.diiiiiiiiD.',
        'dddddddddddd',
        '............'
      ],
      { ...candlePal, D: '#1f1826' }
    );

    // 24b. propGargoyleBrazier (18x18 Rotating Gargoyle Light-Brazier Turret)
    pixelSprites.propGargoyleBrazier = bakePixelSprite(
      [
        '.....dddddddd.....',
        '...ddssssssssdd...',
        '..dssggggggggssd..',
        '.dssgddddddddgssd.',
        '.dsgdroooooordgsd.',
        'dsgdroyyyyyyordgsd',
        'dsgdroyWWWWyordgsd',
        'dsgdroyWWWWyordgsd',
        'dsgdroyyyyyyordgsd',
        '.dsgdroooooordgsd.',
        '.dssgddddddddgssd.',
        '..dssggggggggssd..',
        '...ddssssssssdd...',
        '..ddiiiiiiiiiiDD..',
        '.diiiiiiiiiiiiiiD.',
        'dddddddddddddddddd',
        '..................',
        '..................'
      ],
      {
        d: '#120d17',
        D: '#09060c',
        i: '#2c2538',
        s: '#524763',
        g: '#c99b3b',
        r: '#c4311d',
        o: '#ff8b1f',
        y: '#ffe36e',
        W: '#fffbe6'
      }
    );

    // 25. fxLanternCone (32x24 Translucent Stepped Pixel-Art Lantern Cone pointing +X)
    pixelSprites.fxLanternCone = bakePixelSprite(
      [
        '..........................oooooo',
        '......................oooooooooo',
        '..................ooooooooYYYYYY',
        '..............ooooooooYYYYYYYYYY',
        '..........ooooooooYYYYYYYYWWWWWW',
        '......ooooooooYYYYYYYYWWWWWWWWWW',
        '...oooooooYYYYYYYYWWWWWWWWWWWWWW',
        '.oooooYYYYYYYYWWWWWWWWWWWWWWWWWW',
        'oooYYYYYYYWWWWWWWWWWWWWWWWWWWWWW',
        'ooYYYYWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'oYYWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'oYYWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'ooYYYYWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'oooYYYYYYYWWWWWWWWWWWWWWWWWWWWWW',
        '.oooooYYYYYYYYWWWWWWWWWWWWWWWWWW',
        '...oooooooYYYYYYYYWWWWWWWWWWWWWW',
        '......ooooooooYYYYYYYYWWWWWWWWWW',
        '..........ooooooooYYYYYYYYWWWWWW',
        '..............ooooooooYYYYYYYYYY',
        '..................ooooooooYYYYYY',
        '......................oooooooooo',
        '..........................oooooo'
      ],
      {
        W: 'rgba(255, 244, 184, 0.34)',
        Y: 'rgba(255, 205, 96, 0.22)',
        o: 'rgba(235, 132, 48, 0.12)'
      }
    );

    // 26. fxSlashCrimson (2-frame 20x28 Razor Crimson-Ruby Rapier Crescent Arc)
    const crimsonSlashPal = {
      d: '#2b040c',
      r: '#9e0e26',
      R: '#eb1c3c',
      p: '#ff6e88',
      w: '#fff2f5'
    };
    pixelSprites.fxSlashCrimson = bakePixelSprite(
      [
        '..ddd...............',
        '..ddrrd.............',
        '...ddrrrd...........',
        '....ddrrRrd.........',
        '.....ddrrRRrd.......',
        '......ddrrRpRrd.....',
        '.......ddrrRwpRrd...',
        '........ddrrRwwpRrd.',
        '.........ddrrRwwwRrd',
        '..........ddrrRwwwRd',
        '..........ddrrRwwwRd',
        '...........ddrrRwwRd',
        '...........ddrrRwwRd',
        '...........ddrrRwwRd',
        '...........ddrrRwwRd',
        '...........ddrrRwwRd',
        '...........ddrrRwwRd',
        '..........ddrrRwwwRd',
        '..........ddrrRwwwRd',
        '.........ddrrRwwwRrd',
        '........ddrrRwwpRrd.',
        '.......ddrrRwpRrd...',
        '......ddrrRpRrd.....',
        '.....ddrrRRrd.......',
        '....ddrrRrd.........',
        '...ddrrrd...........',
        '..ddrrd.............',
        '..ddd...............'
      ],
      crimsonSlashPal
    );
    pixelSprites.fxSlashCrimson2 = bakePixelSprite(
      [
        '....dd..............',
        '....ddrrd...........',
        '.....ddrRrd.........',
        '......ddrRpRd.......',
        '.......ddrRwpRd.....',
        '........ddrRwwRd....',
        '.........ddrRwwRd...',
        '..........ddrRwpRd..',
        '...........ddrRpwRd.',
        '...........ddrRpwRd.',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '............ddrRpwRd',
        '...........ddrRpwRd.',
        '...........ddrRpwRd.',
        '..........ddrRwpRd..',
        '.........ddrRwwRd...',
        '........ddrRwwRd....',
        '.......ddrRwpRd.....',
        '......ddrRpRd.......',
        '.....ddrRrd.........',
        '....ddrrd...........',
        '....dd..............',
        '....................'
      ],
      crimsonSlashPal
    );

    // 27. fxFireRing (24x24 Stepped Octagonal Apostate Pyromancer Hellfire Ring — ZERO ctx.arc!)
    pixelSprites.fxFireRing = bakePixelSprite(
      [
        '.......dddddddddd.......',
        '.....ddrrrrrrrrrrdd.....',
        '...ddrrrooooooooorrdd...',
        '..ddrrooyyyyyyyyyyorrd..',
        '.ddrroyyywwwwwwwwyyorrd.',
        '.drroyywwddddddddwwyorrd',
        'drroyywdd........ddwyorr',
        'drroywd............dwyor',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'droywd..............dwyo',
        'drroywd............dwyor',
        'drroyywdd........ddwyorr',
        '.drroyywwddddddddwwyorrd',
        '.ddrroyyywwwwwwwwyyorrd.',
        '..ddrrooyyyyyyyyyyorrd..',
        '...ddrrrooooooooorrdd...',
        '.....ddrrrrrrrrrrdd.....',
        '.......dddddddddd.......'
      ],
      {
        d: '#3d0912',
        r: '#ba1826',
        o: '#f76d1e',
        y: '#ffd24c',
        w: '#fff9db'
      }
    );

    // 28. projCrossbowBolt (18x5 Skeleton Marksman Steel-Tipped Crossbow Quarrel)
    pixelSprites.projCrossbowBolt = bakePixelSprite(
      [
        '..ff.........ss...',
        '.fff........ssss..',
        'ffffwwwwwwwwssssSS',
        '.fff........ssss..',
        '..ff.........ss...'
      ],
      {
        f: '#9e2638',
        w: '#6e4c2e',
        s: '#98a9bd',
        S: '#f0f7ff'
      }
    );

    // 29. hudBloodVial (14x20 Ornate Necropolis Ruby & Gold Blood Vial)
    pixelSprites.hudBloodVial = bakePixelSprite(
      [
        '.....DDDD.....',
        '....DGGGGD....',
        '.....DssD.....',
        '....DDssDD....',
        '..DDssssssDD..',
        '.DssrrrrrrssD.',
        'DssrRRRRRRrssD',
        'DssrRRppRRrssD',
        'DssrRpwppRrssD',
        'DssrRRRRRRrssD',
        'DssrrrrrrrrssD',
        'DssrrrrrrrrssD',
        'DssddddddddssD',
        '.DssddddddssD.',
        '..DDGGGGGGDD..',
        '....DDDDDD....',
        '..............',
        '..............',
        '..............',
        '..............'
      ],
      {
        D: '#120912',
        G: '#e0b24c',
        s: '#9ea8bd',
        d: '#4f0714',
        r: '#a81128',
        R: '#eb1e3d',
        p: '#ff7088',
        w: '#ffffff'
      }
    );

    // 30. hudMistOrb & hudMistOrbEmpty (13x13 Swirling Crimson-Violet Mist-Dash Charge Pip)
    pixelSprites.hudMistOrb = bakePixelSprite(
      [
        '....DDDDD....',
        '..DDGGGGGDD..',
        '.DGvvvvvvvGD.',
        '.DGvrrrrrvGD.',
        'DGvrRRRRRrvGD',
        'DGvrRpppRrvGD',
        'DGvrRpwppRvGD',
        'DGvrRRRRRrvGD',
        'DGvvrrrrrvvGD',
        '.DGvvvvvvvGD.',
        '..DDGGGGGDD..',
        '....DDDDD....',
        '.............'
      ],
      {
        D: '#120814',
        G: '#d9a843',
        v: '#4c1642',
        r: '#a81432',
        R: '#ed244c',
        p: '#ff7a99',
        w: '#fff2f7'
      }
    );
    pixelSprites.hudMistOrbEmpty = bakePixelSprite(
      [
        '....DDDDD....',
        '..DDgggggDD..',
        '.DgdddddddgD.',
        '.DgddsssddgD.',
        'DgddsdddsddgD',
        'Dgddsd.dsddgD',
        'DgddsdddsddgD',
        'DgddddddddgD.',
        '.DgdddddddgD.',
        '..DDgggggDD..',
        '....DDDDD....',
        '.............',
        '.............'
      ],
      {
        D: '#0f0a12',
        g: '#594c5e',
        d: '#1e1624',
        s: '#34283d'
      }
    );

    // 31. hudAlertGem (Blue = Unseen Shadow, Amber = Hunting, Crimson = Lockdown; 13x13)
    const alertGemShape = [
      '.....DDD.....',
      '....DGGGD....',
      '...DGlllGD...',
      '..DGllwllGD..',
      '.DGlmmwmmlGD.',
      'DGlmmmWmmmlGD',
      '.DGlmmmmmlGD.',
      '..DGddddlGD..',
      '...DGdddGD...',
      '....DGGGD....',
      '.....DDD.....',
      '.............',
      '.............'
    ];
    pixelSprites.hudAlertGem = bakePixelSprite(alertGemShape, {
      D: '#0d0c17',
      G: '#d9ae4c',
      d: '#143366',
      m: '#2968bd',
      l: '#63b4ff',
      w: '#bdf0ff',
      W: '#ffffff'
    });
    pixelSprites.hudAlertGemBlue = pixelSprites.hudAlertGem;
    pixelSprites.hudAlertGemAmber = bakePixelSprite(alertGemShape, {
      D: '#171008',
      G: '#f0c456',
      d: '#6e3809',
      m: '#cf7719',
      l: '#ffb838',
      w: '#ffe994',
      W: '#ffffff'
    });
    pixelSprites.hudAlertGemCrimson = bakePixelSprite(alertGemShape, {
      D: '#1a060a',
      G: '#ffcf66',
      d: '#690918',
      m: '#bd152c',
      l: '#ff3856',
      w: '#ff9cab',
      W: '#ffffff'
    });

    // 32. fxFangsPrompt (15x13 Glowing Crimson Vampiric Fangs Backstab / Stagger Prompt)
    pixelSprites.fxFangsPrompt = bakePixelSprite(
      [
        '.dddd.....dddd.',
        'drrrrdd.ddrrrrd',
        'drWWWrrddrWWWrd',
        'drWWWWrrrWWWWrd',
        '.drWWWd.dWWWrd.',
        '.drWWwd.dwWWrd.',
        '..drWwd.dwWrd..',
        '..drRwd.dwRrd..',
        '...drRd.dRrd...',
        '...drrd.drrd...',
        '....drd.drd....',
        '....dd...dd....',
        '...............'
      ],
      {
        d: '#24040a',
        r: '#ba142e',
        R: '#ff2e4c',
        w: '#ffd6de',
        W: '#ffffff'
      }
    );

    // 33. fxMistBat1 & fxMistBat2 (13x9 Pixel-Art Bat Silhouette for Mist-Dash Swirls)
    const batPal = { d: '#14060d', b: '#3d1024', r: '#ff2b4a' };
    pixelSprites.fxMistBat1 = bakePixelSprite(
      [
        'dd.........dd',
        'dbdd..d..ddbd',
        '.dbbddbddbbd.',
        '..dbbrdrbbd..',
        '...dbbbbbd...',
        '....dbbbd....',
        '...dd...dd...',
        '.............',
        '.............'
      ],
      batPal
    );
    pixelSprites.fxMistBat2 = bakePixelSprite(
      [
        '......d......',
        '....ddbdd....',
        '..ddbrdrbdd..',
        '.dbbbbbbbbbd.',
        'dbbddbbbddbbd',
        'dd...dbd...dd',
        '.............',
        '.............',
        '.............'
      ],
      batPal
    );
  }

  Art.init = function () {
    buildPixelSprites();
    for (const [key, src] of Object.entries(SPRITE_PATHS)) {
      if (!HERO_PACK_KEYS.has(key)) loadImg(key, src);
    }
  };

  Art.prepareMission = function (id) {
    if (preparedHeroMission !== id) {
      for (const key of HERO_PACKS[preparedHeroMission] || []) delete imgs[key];
      preparedHeroMission = id;
    }
    for (const key of HERO_PACKS[id] || []) {
      if (!imgs[key]) loadImg(key, SPRITE_PATHS[key]);
    }
  };

  // ================= WORLD ENVIRONMENT (HoMM3 PIXEL ART) =================
  Art.drawWorld = function (ctx, W, H, WORLD_W, GROUND_Y, SEA_START, SEA_END, cameraX, time, props) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Seamless Panoramic HoMM3 Twilight Sky & Snow-Streaked Mountains
    const skyTop = 68;
    const skyH = GROUND_Y - skyTop + 26;
    if (skyMirroredCanvas) {
      const scale = skyH / skyMirroredCanvas.height;
      const drawW = skyMirroredCanvas.width * scale;
      const scroll = ((cameraX * 0.25) % drawW + drawW) % drawW;
      ctx.drawImage(skyMirroredCanvas, -scroll, skyTop, drawW, skyH);
      if (drawW - scroll < W) {
        ctx.drawImage(skyMirroredCanvas, drawW - scroll, skyTop, drawW, skyH);
      }
    } else {
      const grad = ctx.createLinearGradient(0, skyTop, 0, GROUND_Y);
      grad.addColorStop(0, '#18182b');
      grad.addColorStop(1, '#6e4c3a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, skyTop, W, skyH);
    }

    // Distant dark treeline mist silhouette along mountain base
    ctx.fillStyle = 'rgba(14, 22, 16, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 8);
    for (let sx = 0; sx <= W + 20; sx += 16) {
      const wx = sx + cameraX * 0.48;
      const jag = Math.abs(Math.sin(wx * 0.08)) * 7;
      const hy = GROUND_Y - 18 - Math.sin(wx * 0.007) * 14 - jag;
      ctx.lineTo(sx, hy);
    }
    ctx.lineTo(W, GROUND_Y + 8);
    ctx.closePath();
    ctx.fill();

    // 2. Rampart Oaks, Pines & Mossy Boulders (behind units, rooted on turf)
    for (const pr of props) {
      const px = pr.x - cameraX;
      if (px < -240 || px > W + 240) continue;
      if (pr.type === 'tree') {
        const key = pr.variant % 2 === 0 ? 'treeOak' : 'treePine';
        if (ready(key)) {
          const im = imgs[key];
          const targetH = (key === 'treeOak' ? 215 : 230) * pr.scale;
          const targetW = targetH * (im.naturalWidth / im.naturalHeight);
          ctx.drawImage(im, px - targetW * 0.5, GROUND_Y - targetH + 14, targetW, targetH);
        }
      } else if (pr.type === 'rock' && ready('boulder')) {
        const im = imgs.boulder;
        const rw = pr.r * 2.5;
        const rh = rw * (im.naturalHeight / im.naturalWidth);
        ctx.drawImage(im, px - rw * 0.5, GROUND_Y - rh + 10, rw, rh);
      }
    }

    // 3. Western Sanctuary Castle Keep & Eastern Captive Watchtower
    drawSanctuaryKeep(ctx, 165 - cameraX, GROUND_Y, time);
    drawWatchtower(ctx, 4120 - cameraX, GROUND_Y);

    // 4. Deep Sapphire Wave-Crested Sea (SEA_START .. SEA_END)
    drawSeaSection(ctx, W, H, GROUND_Y, SEA_START, SEA_END, cameraX, time);

    // 5. Seamless HoMM3 Mossy Grass & Carved Limestone Cliff Landmasses
    drawLandSection(ctx, -cameraX, SEA_START, GROUND_Y, H, W);
    drawLandSection(ctx, SEA_END - cameraX, WORLD_W - SEA_END + 240, GROUND_Y, H, W);
  };

  function drawSeaSection(ctx, W, H, groundY, seaStart, seaEnd, cameraX, time) {
    const sx = seaStart - cameraX;
    const sw = seaEnd - seaStart;
    if (sx + sw < -40 || sx > W + 40) return;

    const seaY = groundY + 10;
    const seaH = H - seaY + 8;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, seaY - 4, sw, seaH + 8);
    ctx.clip();

    if (ready('seaTile')) {
      const im = imgs.seaTile;
      const tileH = seaH + 10;
      const tileW = tileH * (im.naturalWidth / im.naturalHeight);
      const drift = Math.sin(time * 1.4) * 14;
      const firstX = sx - (((cameraX * 0.15 + drift) % tileW + tileW) % tileW);
      for (let x = firstX - tileW; x < sx + sw + tileW; x += tileW) {
        ctx.drawImage(im, x, seaY - 2, tileW + 1, tileH);
      }
    } else {
      ctx.fillStyle = '#0c3554';
      ctx.fillRect(sx, seaY, sw, seaH);
    }

    // Stepped pixel-art whitecap shimmer along sea surface
    ctx.fillStyle = 'rgba(225, 248, 255, 0.72)';
    for (let wx = 0; wx <= sw; wx += 12) {
      const wy = Math.round(seaY + 2 + Math.sin(time * 3.8 + wx * 0.05) * 2.5);
      ctx.fillRect(Math.round(sx + wx), wy, 9, 2);
    }

    ctx.restore();
  }

  function drawLandSection(ctx, startX, width, groundY, H, W) {
    if (startX + width < -60 || startX > W + 60) return;

    const tileTop = groundY - 8;
    const tileH = H - tileTop + 12;

    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, tileTop - 6, width, tileH + 12);
    ctx.clip();

    if (ready('groundTile')) {
      const im = imgs.groundTile;
      const tileW = tileH * (im.naturalWidth / im.naturalHeight);
      const visStart = Math.max(-tileW, startX);
      const firstTile = startX + Math.floor((visStart - startX) / tileW) * tileW;
      for (let tx = firstTile; tx < Math.min(W + tileW, startX + width); tx += tileW) {
        ctx.drawImage(im, tx, tileTop, tileW + 1, tileH);
      }
    } else {
      ctx.fillStyle = '#385e24';
      ctx.fillRect(startX, groundY, width, H - groundY);
    }

    // Dark shadow vignette along coastal drop-offs for 3D cliff depth
    const leftEdgeShadow = ctx.createLinearGradient(startX, 0, startX + 22, 0);
    leftEdgeShadow.addColorStop(0, 'rgba(0,0,0,0.55)');
    leftEdgeShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftEdgeShadow;
    ctx.fillRect(startX, groundY, 22, tileH);

    const rightEdgeShadow = ctx.createLinearGradient(startX + width - 22, 0, startX + width, 0);
    rightEdgeShadow.addColorStop(0, 'rgba(0,0,0,0)');
    rightEdgeShadow.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = rightEdgeShadow;
    ctx.fillRect(startX + width - 22, groundY, 22, tileH);

    ctx.restore();
  }

  function drawSanctuaryKeep(ctx, x, groundY, time) {
    if (x < -260 || x > 1380 || !ready('castleKeep')) return;
    const im = imgs.castleKeep;
    const h = 268;
    const w = h * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, x - w * 0.5, groundY - h + 14, w, h);

    // Subtle dynamic torchlight flicker + crisp pixel flame tongues over gate sconces
    const flicker = 0.85 + Math.sin(time * 15) * 0.15;
    const rad = 28 * flicker;
    [-38, 38].forEach((ox, idx) => {
      const tx = Math.round(x + ox);
      const ty = Math.round(groundY - 58);
      const g = ctx.createRadialGradient(tx, ty, 2, tx, ty, rad);
      g.addColorStop(0, 'rgba(255, 215, 110, 0.45)');
      g.addColorStop(1, 'rgba(255, 110, 20, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(tx - rad, ty - rad, rad * 2, rad * 2);

      // Crisp pixel-art torch flame flicker
      const lift = Math.floor((time * 12 + idx) % 2);
      ctx.fillStyle = '#ff7b1c';
      ctx.fillRect(tx - 2, ty - 4 - lift, 4, 4);
      ctx.fillStyle = '#fff5b8';
      ctx.fillRect(tx - 1, ty - 2 - lift, 2, 3);
    });

    ctx.fillStyle = '#f6df96';
    ctx.font = 'bold 11px "Palatino Linotype", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('SANCTUARY CITADEL', x, groundY - h + 4);
    ctx.shadowBlur = 0;
  }

  function drawWatchtower(ctx, x, groundY) {
    if (x < -180 || x > 1300 || !ready('watchtower')) return;
    const im = imgs.watchtower;
    const h = 264;
    const w = h * (im.naturalWidth / im.naturalHeight);
    ctx.drawImage(im, x - w * 0.5, groundY - h + 14, w, h);

    ctx.fillStyle = '#f6df96';
    ctx.font = 'bold 10.5px "Palatino Linotype", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText('EASTERN WATCHTOWER', x, groundY - h + 4);
    ctx.shadowBlur = 0;
  }

  const VERIDIAS_VIEWS_G3 = [
    [2, 2, 185, 152], [229, 2, 205, 152], [456, 2, 223, 150],
    [2, 158, 202, 152], [229, 158, 222, 152], [456, 158, 223, 97]
  ];
  const VERIDIAS_RIG_G3 = [
    [2, 2, 155, 79], [180, 2, 117, 130], [358, 2, 153, 56], [536, 2, 167, 128],
    [2, 161, 174, 155], [180, 161, 68, 83], [358, 161, 64, 104], [536, 161, 138, 66]
  ];
  const ISOLDE_FRAMES_G3 = [
    [2, 2, 88, 150], [118, 2, 95, 150], [234, 2, 109, 150], [350, 2, 112, 122],
    [2, 156, 87, 109], [118, 156, 87, 109], [234, 156, 95, 109], [350, 156, 88, 109]
  ];
  const M1_TAU = Math.PI * 2;
  const m1Unit = (value) => Math.max(0, Math.min(1, value));
  const m1Ease = (value) => {
    const u = m1Unit(value);
    return u * u * (3 - 2 * u);
  };

  function drawM1Part(ctx, image, rect, x, y, width, anchorX, anchorY, angle = 0, squashY = 1) {
    const [sx, sy, sw, sh] = rect;
    const height = width * sh / sw;
    ctx.save();
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    if (squashY !== 1) ctx.scale(1, squashY);
    ctx.drawImage(image, sx, sy, sw, sh, -width * anchorX, -height * anchorY, width, height);
    ctx.restore();
  }

  function drawIsoldePose(ctx, index, x, y, height, tilt = 0, widthScale = 1) {
    const rect = ISOLDE_FRAMES_G3[index];
    const seated = index >= 4 && index <= 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(widthScale, 1);
    const pivotX = [0.57, 0.55, 0.47, 0.45, 0.48, 0.47, 0.48, 0.64][index];
    drawM1Part(ctx, imgs.isoldeMotionG3, rect, 0, 0, height * rect[2] / rect[3],
      pivotX, seated ? 0.65 : index === 7 ? 0.92 : 0.985, tilt);
    ctx.restore();
  }

  // Captive Princess Isolde Sprite atop Watchtower
  Art.drawPrincess = function (ctx, x, y, wavePhase) {
    if (ready('isoldeMotionG3')) {
      const wave = [0, 0, 1, 2, 3, 2, 1, 0];
      const index = wave[Math.floor(wavePhase * 1.15) % wave.length];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      drawIsoldePose(ctx, index, 0, 0, index === 3 ? 56 : 62, Math.sin(wavePhase * 0.8) * 0.012);
      ctx.restore();
      return;
    }
    if (!ready('princess')) return;
    const im = imgs.princess;
    const h = 62;
    const w = h * (im.naturalWidth / im.naturalHeight);
    const bob = Math.sin(wavePhase * 0.8) * 1.5;

    ctx.save();
    ctx.translate(x, y + bob);
    // Face left toward incoming dragon!
    ctx.scale(-1, 1);
    ctx.drawImage(im, -w * 0.5, -h, w, h);
    ctx.restore();
  };

  // ================= ACTIVE HoMM3 PIXEL-ART SPRITES =================

  // Normalized points on each painted Veridias pose.
  const VERIDIAS_SEATS = {
    dragonUp: [0.651, 0.558],
    dragonGlide: [0.650, 0.566],
    dragonFire: [0.529, 0.473],
    dragonRest: [0.667, 0.494],
    dragonWalk1: [0.691, 0.381],
    dragonWalk2: [0.695, 0.409]
  };

  const VERIDIAS_GROUND_MOUTHS = {
    dragonRest: [0.970, 0.282],
    dragonWalk1: [0.979, 0.274],
    dragonWalk2: [0.980, 0.253]
  };

  function drawVeridiasGaitLeg(ctx, atlas, front, x, y, phase, stride, blend, grounded, flap, far) {
    const local = ((stride + phase) % 1 + 1) % 1;
    const stance = 0.62;
    const reach = 17;
    const swing = m1Unit((local - stance) / (1 - stance));
    const footTravel = local < stance ? reach * (1 - 2 * local / stance) :
      reach * (2 * m1Ease(swing) - 1);
    const lift = Math.sin(Math.PI * swing) * (front ? 9 : 7) * blend;
    const footX = footTravel * blend;
    const leg = VERIDIAS_RIG_G3[front ? 5 : 6];
    const plantedY = 27 + (far ? -3 : 0);
    const targetY = grounded ? plantedY - lift : 19 + flap * (front ? 3 : 2);
    const legAngle = grounded ? -Math.atan2(footX, Math.max(12, targetY - y)) :
      (front ? 0.64 : 0.42) + flap * 0.12;
    const width = front ? 25 : 30;
    const toeSpan = front ? 0.59 : 0.75;
    const legHeight = width * leg[3] / leg[2] * 0.79;
    const needed = Math.max(12, targetY - y) - Math.sin(legAngle) * width * toeSpan;
    const squash = (grounded ? needed / (legHeight * Math.cos(legAngle)) : 0.59);
    drawM1Part(ctx, atlas, leg, x, y, width, front ? 0.31 : 0.58, 0.12,
      legAngle, Math.max(0.48, Math.min(1.22, squash)));
  }

  function drawVeridiasSide(ctx, d, time, phase, grounded, onGround, strideBlend, recoil, flame, throwBeat, terminal) {
    const atlas = imgs.veridiasRigG3;
    const breath = Math.sin(time * 3.8);
    const glide = d.motion.glide;
    const flap = Math.sin(phase);
    const lag = Math.sin(phase - 0.93);
    const stride = d.motion.walkDistance / 56;
    const walkSway = Math.cos(stride * M1_TAU * 2) * 2.6 * strideBlend;
    const bob = (flap * -4 * (1 - glide) + breath * 1.15) * (1 - grounded) + walkSway * grounded;
    const flight = 1 - grounded;
    const wingSpread = glide * 0.56 + (1 - glide) * (0.76 + flap * 0.42);
    const wingAngle = 0.18 + (1 - glide) * (flap * 0.18 + lag * 0.08);
    const farAngle = wingAngle + 0.36 - lag * 0.10 * (1 - glide);
    const wingOpacity = Math.min(1, flight * 2);
    const foldedOpacity = m1Ease(grounded);
    const neckAngle = flight * (0.44 + lag * 0.05) + grounded * breath * 0.045 +
      flame * 0.27 - recoil * 0.32 - throwBeat * 0.09 + terminal * 0.33;
    ctx.save();
    if (wingOpacity > 0.01) {
      ctx.globalAlpha *= wingOpacity * 0.84;
      drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[3], 27, bob + 1, 105, 0.92, 0.94,
        farAngle + grounded * 0.17, 0.54 + wingSpread * 0.51);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= 0.68;
    drawVeridiasGaitLeg(ctx, atlas, false, -26, bob + 3, 0, stride, strideBlend, onGround, lag, true);
    drawVeridiasGaitLeg(ctx, atlas, true, 21, bob + 2, 0.52, stride, strideBlend, onGround, flap, true);
    ctx.restore();
    drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[2], -32, bob + 5, 91, 0.90, 0.51,
      Math.sin(phase - 1.18) * (flight * (1 - glide * 0.68) * 0.16 + 0.043) +
      walkSway * 0.017 + recoil * 0.15, 0.91 + breath * 0.06);
    drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[0], -5, bob + 3, 77 + breath * 0.6, 0.47, 0.49,
      -0.02 + walkSway * 0.013);
    drawVeridiasGaitLeg(ctx, atlas, false, -25, bob + 6, 0.48, stride, strideBlend, onGround, flap, false);
    drawVeridiasGaitLeg(ctx, atlas, true, 20, bob + 6, 0.94, stride, strideBlend, onGround, lag, false);
    drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[1], 29, bob + 10, 61, 0.24, 0.86, neckAngle);
    ctx.save();
    if (wingOpacity > 0.01) {
      ctx.globalAlpha *= wingOpacity;
      drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[4], 20, bob + 1, 118, 0.93, 0.91,
        wingAngle + grounded * 0.30 - recoil * 0.14, wingSpread);
    }
    ctx.restore();
    ctx.save();
    if (foldedOpacity > 0.01) {
      ctx.globalAlpha *= foldedOpacity;
      drawM1Part(ctx, atlas, VERIDIAS_RIG_G3[7], 19, bob - 6, 98, 0.92, 0.25,
        -0.10 + breath * 0.018 + recoil * 0.15);
    }
    ctx.restore();
    return [24 + flame * 4 - recoil * 3, bob - 13];
  }

  // Vertically deform the painted perspective views around a stable central body.
  function drawVeridiasTurnView(ctx, frame, phase, glide, recoil) {
    const rect = VERIDIAS_VIEWS_G3[frame];
    const [sx, sy, sw, sh] = rect;
    const width = [187, 179, 185, 167][frame];
    const anchorX = [0.58, 0.50, 0.53, 0.50][frame];
    const anchorY = [0.68, 0.47, 0.69, 0.71][frame];
    const scale = width / sw;
    const wing = Math.sin(phase) * (1 - glide * 0.87) * 8;
    const tail = Math.sin(phase - 1.31) * (1 - glide * 0.66) * 3;
    const breath = Math.sin(phase * 0.48) * 0.8;
    const top = -sh * scale * anchorY;
    for (let start = 0; start < sw; start += 6) {
      const span = Math.min(6, sw - start);
      const band = (start + span / 2) / sw;
      const edge = Math.min(1, Math.abs(band - anchorX) * 2.35) ** 1.5;
      const x = -width * anchorX + start * scale;
      const lift = wing * edge - breath;
      const height = sh * scale;
      const pivot = Math.round(sh * 0.56);
      const tailBias = tail * (frame % 2 ? edge : Math.max(0, 1 - band * 1.7));
      const lowerY = top + pivot * scale + recoil * edge * 2;
      ctx.drawImage(imgs.veridiasHeadingG3, sx + start, sy, span, pivot,
        x, top + lift, span * scale + 0.18, lowerY - top - lift);
      ctx.drawImage(imgs.veridiasHeadingG3, sx + start, sy + pivot, span, sh - pivot,
        x, lowerY, span * scale + 0.18, height - pivot * scale + tailBias);
    }
    return [[16,-15], [0,-13], [12,-15], [0,-10]][frame];
  }

  function drawMountedIsolde(ctx, d, seat, time, phase, tilt, scaleX, face) {
    if (!ready('isoldeMotionG3')) {
      if (d.carryingPrincess && ready('princessRider')) {
        const image = imgs.princessRider;
        const width = 41 * image.naturalWidth / image.naturalHeight;
        ctx.drawImage(image, seat[0] - width * 0.49, seat[1] - 25, width, 41);
      }
      return;
    }
    const motion = d.motion;
    const pickup = motion.pickup;
    const outcome = motion.outcome;
    const delivery = outcome?.kind === 'win' ? m1Ease((outcome.age - 0.26) / 0.48) : 0;
    if (!d.carryingPrincess && !delivery && outcome?.kind !== 'win') return;

    function localPoint(x, y) {
      const dx = x - d.x;
      const dy = y - d.y;
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const localX = dx / (face * scaleX);
      return [localX * c + dy * s, -localX * s + dy * c];
    }
    const pickupBlend = pickup ? m1Ease(pickup.age / 0.42) : 1;
    const wave = [4, 4, 5, 5, 4, 6, 6, 4];
    let pose = wave[Math.floor(((phase - 0.37 + M1_TAU) % M1_TAU) / M1_TAU * wave.length)];
    if (motion.hurt > 0 || motion.fire > 0.54 || (pickup && pickup.age < 0.28)) pose = 6;
    let x = seat[0], y = seat[1];
    let riderHeight = 42 + Math.sin(time * 4.2 - 0.7) * 0.55;
    if (pickupBlend < 1) {
      const [fromX, fromY] = localPoint(pickup.x, pickup.y);
      x = fromX + (x - fromX) * pickupBlend;
      y = fromY + (y - fromY) * pickupBlend - Math.sin(pickupBlend * Math.PI) * 17;
      if (pickupBlend < 0.32) {
        pose = 3;
        riderHeight = 56;
      }
    }
    if (delivery > 0) {
      const [toX, toY] = localPoint(outcome.arrivalX, outcome.floor);
      x += (toX - x) * delivery;
      y += (toY - y) * delivery - Math.sin(delivery * Math.PI) * 8;
      riderHeight += (59 - riderHeight) * delivery;
      pose = delivery > 0.86 ? 0 : 7;
    }
    drawIsoldePose(ctx, pose, x, y, riderHeight,
      -tilt * (pose < 4 || pose === 7 ? 0.9 : 0.2) + Math.sin(phase - 0.58) * 0.031);
  }

  function drawVeridiasG3(ctx, d, x, y, time, isFiring) {
    const motion = d.motion;
    const outcome = motion.outcome;
    const terminal = outcome?.kind === 'loss' ? m1Ease(outcome.age / 0.68) : 0;
    const recoil = m1Ease(motion.hurt / 0.27);
    const throwBeat = Math.sin(Math.PI * m1Unit(motion.throwAge / 0.33));
    const turning = m1Ease(motion.turn / 0.18);
    const heading = turning < 0.5 ? motion.headingFrom : motion.heading;
    const onGround = motion.grounded > 0.78 || Boolean(d.landed);
    const grounded = m1Ease(motion.grounded);
    const action = isFiring || motion.fire > 0.14 || throwBeat > 0.04 || recoil > 0.2;
    const profile = grounded > 0.28 || action || terminal > 0 || heading === 0 || heading === 4;
    const face = profile ? d.facing : heading >= 3 && heading <= 5 ? -1 : 1;
    const scaleX = 1 - Math.sin(turning * Math.PI) * (action ? 0.08 : 0.19);
    const tilt = (profile ? Math.max(-0.22, Math.min(0.22, d.vy * 0.0009)) * (1 - grounded) : 0) -
      recoil * 0.18 + terminal * (onGround ? 0.12 : 0.45);
    const phase = d.wingPhase;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x - face * (recoil * 8 + terminal * 14), y);
    ctx.scale(face * scaleX, 1);
    ctx.rotate(tilt);
    let seat;
    if (terminal > 0.63) {
      drawM1Part(ctx, imgs.veridiasHeadingG3, VERIDIAS_VIEWS_G3[5], -12, 11,
        168, 0.55, outcome.water ? 0.68 : 0.78, -tilt);
      seat = [11, 0];
    } else if (outcome?.kind === 'loss' && terminal > 0.28) {
      drawM1Part(ctx, imgs.veridiasHeadingG3, VERIDIAS_VIEWS_G3[4], -10, 5, 173, 0.55, 0.66, -0.09);
      seat = [20, -7];
    } else if (profile) {
      seat = drawVeridiasSide(ctx, d, time, phase, grounded, onGround, motion.walk, recoil, motion.fire, throwBeat, terminal);
    } else {
      const frame = [0, 2, 3, 2, 0, 0, 1, 0][heading];
      seat = drawVeridiasTurnView(ctx, frame, phase, motion.glide, recoil);
    }
    drawMountedIsolde(ctx, d, seat, time, phase, tilt, scaleX, face);
    ctx.restore();

    if (isFiring && pixelSprites.fire0 && pixelSprites.fire1) {
      // Preserve the projectile emission point while the neck aims and recoils.
      const pulse = Math.sin(time * 37) * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(d.facing, 1);
      ctx.drawImage(pixelSprites.fire1, 68, -22, 20 + pulse, 18 + pulse);
      ctx.drawImage(pixelSprites.fire0, 77, -20, 15 + pulse, 14);
      ctx.restore();
    }
  }

  // 1. Rampart Emerald & Gold Dragon (Veridias)
  Art.drawDragon = function (ctx, d, cameraX, groundY, time, isFiring) {
    const sx = d.x - cameraX;
    const sy = d.y;

    // Stepped pixel-art ground contact shadow
    const distGround = Math.max(0, groundY - sy);
    if (distGround < 300 && pixelSprites.dragonShadow) {
      const shAlpha = (1 - distGround / 300) * 0.82;
      const shScale = Math.max(0.25, 1 - distGround / 390);
      const sw = Math.round(120 * shScale);
      const sh = Math.max(4, Math.round(20 * shScale));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = shAlpha;
      ctx.drawImage(
        pixelSprites.dragonShadow,
        Math.round(sx - sw * 0.5),
        Math.round(groundY + 4 - sh * 0.5),
        sw,
        sh
      );
      ctx.restore();
    }

    if (d.motion && ready('veridiasRigG3') && ready('veridiasHeadingG3')) {
      drawVeridiasG3(ctx, d, sx, sy, time, isFiring);
      return;
    }

    // Keep the feet planted while breathing fire on the ground.
    const isGrounded = Boolean(d.landed || d.onGround || d.resting);
    const facing = d.facing || d.dir || 1;
    const isWalking = isGrounded && Boolean(d.walking || Math.abs(d.vx || 0) > 18);
    const walkPhase = d.walkPhase || 0;

    let key = 'dragonUp';
    let pivotX = 0.63;
    let pivotY = 0.66;
    let baseScale = 0.37;

    if (isFiring && !isGrounded) {
      key = 'dragonFire';
      pivotX = 0.49;
      pivotY = 0.64;
    } else if (isGrounded) {
      if (isWalking && ready('dragonWalk1') && ready('dragonWalk2')) {
        key = Math.sin(walkPhase) >= 0 ? 'dragonWalk1' : 'dragonWalk2';
        pivotX = 0.56;
        pivotY = 0.72;
        baseScale = 0.178;
      } else {
        key = 'dragonRest';
        pivotX = 0.56;
        pivotY = 0.72;
        baseScale = 0.36;
      }
    } else {
      const flapSin = Math.sin(d.wingPhase);
      if (flapSin < -0.1) {
        key = 'dragonGlide';
        pivotX = 0.64;
        pivotY = 0.66;
      } else {
        key = 'dragonUp';
        pivotX = 0.63;
        pivotY = 0.66;
      }
    }

    if (!ready(key)) return;
    const im = imgs[key];
    const dw = im.naturalWidth * baseScale;
    const dh = im.naturalHeight * baseScale;

    ctx.save();
    ctx.translate(sx, sy);
    if (d.invuln > 0 && Math.floor(time * 18) % 2 === 0) {
      ctx.globalAlpha = 0.52;
    }
    ctx.scale(facing, 1);

    const walkBob = isWalking ? Math.sin(walkPhase * 2) * 0.8 : 0;
    const walkSurge = isWalking ? Math.cos(walkPhase) * 2.5 : 0;
    const tilt = isGrounded
      ? (isWalking ? Math.sin(walkPhase) * 0.025 : 0)
      : Math.max(-0.22, Math.min(0.22, d.vy * 0.0008));
    ctx.rotate(tilt);

    // Subtle vertical wingbeat bob while airborne, or crisp stride bob while walking on land
    const motionBob = isGrounded ? walkBob : -Math.sin(d.wingPhase) * 4.5;

    const spriteX = -dw * pivotX + walkSurge;
    const spriteY = -dh * pivotY + motionBob;
    ctx.drawImage(im, spriteX, spriteY, dw, dh);

    if (d.carryingPrincess && ready('princessRider')) {
      const rider = imgs.princessRider;
      const h = 41;
      const w = h * rider.naturalWidth / rider.naturalHeight;
      const [seatX, seatY] = VERIDIAS_SEATS[key];
      ctx.drawImage(rider, spriteX + seatX * dw - w * 0.49,
        spriteY + seatY * dh - h * 0.61, w, h);
    }

    if (isFiring && isGrounded && pixelSprites.fire0 && pixelSprites.fire1) {
      const [mouthX, mouthY] = VERIDIAS_GROUND_MOUTHS[key];
      const x = spriteX + dw * mouthX;
      const y = spriteY + dh * mouthY;
      const pulse = 2 * Math.sin(time * 37);
      // Join the painted mouth to the start of the active projectile stream.
      ctx.drawImage(pixelSprites.fire1, x + (86 - x) * 0.55 - 10,
        y + (-14 - y) * 0.55 - 10, 20 + pulse, 20 + pulse);
      ctx.drawImage(pixelSprites.fire0, x - 4, y - 7, 15 + pulse, 14);
    }

    ctx.restore();
  };

  // 2. Ground Garrison Units (Marksman Archer, Halberdier Spearman, Brigand Slinger)
  Art.drawGroundUnit = function (ctx, e, cameraX, dragonX, dragonY, time) {
    const key = e.sub === 'archer' ? 'archer' : e.sub === 'spearman' ? 'spearman' : 'stoner';
    if (!ready(key)) return;

    const im = imgs[key];
    const x = e.x - cameraX;
    const y = e.y + 6;
    const faceDir = dragonX >= e.x ? 1 : -1;

    // Scaled cleanly to heroic HoMM3 battlefield proportions
    const targetH = e.sub === 'archer' ? 88 : e.sub === 'spearman' ? 74 : 84;
    const targetW = targetH * (im.naturalWidth / im.naturalHeight);

    // Subtle patrol step bob & attack windup lean
    const walkBob = Math.abs(Math.sin(time * 6.5 + e.originX)) * 2.5;
    const attackLean = e.cooldown < 0.35 ? 0.08 : 0;

    ctx.save();
    ctx.translate(x, y - walkBob);
    ctx.scale(faceDir, 1);
    ctx.rotate(attackLean);
    ctx.drawImage(im, -targetW * 0.48, -targetH * 0.97, targetW, targetH);
    ctx.restore();
  };

  // 3. Fortress Giant Wasp ("Big Bee" — 2-frame buzzing wing animation)
  Art.drawBee = function (ctx, e, cameraX, dragonX, time) {
    const frameKey = Math.floor(time * 22 + e.phase) % 2 === 0 ? 'bee1' : 'bee2';
    if (!ready(frameKey)) return;

    const im = imgs[frameKey];
    const x = e.x - cameraX;
    const y = e.y;
    const faceDir = dragonX < e.x ? -1 : 1;

    const targetH = 68;
    const targetW = targetH * (im.naturalWidth / im.naturalHeight);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(faceDir, 1);
    ctx.drawImage(im, -targetW * 0.5, -targetH * 0.5, targetW, targetH);
    ctx.restore();
  };

  // 4. Cove / Abyssal Sea Hydra ("Header" — Surface Emergence vs Full-Body Waterless High Jump!)
  Art.drawSerpent = function (ctx, e, cameraX, groundY, dragonX, dragonY, time) {
    const x = e.x - cameraX;
    const waterY = groundY + 12;
    const faceDir = dragonX < e.x ? -1 : 1;

    const highOutOfWater = e.jumping && e.y < groundY - 42;

    if (highOutOfWater) {
      const distToDragon = Math.hypot(dragonX - e.x, dragonY - e.y);
      const isBiting = distToDragon < 150 || e.biteAnim > 0 || (e.vy < 40 && e.vy > -180);
      const key = isBiting ? 'hydraBite' : 'hydraLeap';
      if (ready(key)) {
        const im = imgs[key];
        const targetH = isBiting ? 105 : 122;
        const targetW = targetH * (im.naturalWidth / im.naturalHeight);
        const pitch = Math.max(-0.35, Math.min(0.42, (e.vy || 0) * 0.0008));

        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 160, 0, 320, waterY + 2);
        ctx.clip();

        ctx.translate(x, e.y);
        ctx.scale(faceDir, 1);
        ctx.rotate(pitch);
        ctx.drawImage(im, -targetW * 0.5, -targetH * 0.48, targetW, targetH);
        ctx.restore();
      }
    } else {
      const isSpitting = e.biteAnim > 0 || (e.emerge > 0.72 && e.cooldown < 0.45);
      const key = isSpitting ? 'serpentSpit' : 'serpentIdle';
      if (ready(key)) {
        const im = imgs[key];
        const targetH = 116;
        const targetW = targetH * (im.naturalWidth / im.naturalHeight);
        const drawBottomY = Math.max(waterY + 14, e.y + 52);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 120, 0, 240, waterY + 4);
        ctx.clip();

        ctx.translate(x, drawBottomY);
        ctx.scale(faceDir, 1);
        ctx.drawImage(im, -targetW * 0.5, -targetH, targetW, targetH);
        ctx.restore();
      }
    }

    // Crisp pixel-art whitewater splash crests locked strictly at waterY
    if ((e.splashTimer > 0 || (!highOutOfWater && e.emerge > 0.16)) && pixelSprites.splashDrop) {
      const intensity = e.splashTimer > 0 ? Math.min(1, e.splashTimer * 2.2) : 0.65;
      const count = e.splashTimer > 0 ? 5 : 3;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.88 * intensity;
      for (let f = -count; f <= count; f++) {
        const lift = e.splashTimer > 0 ? Math.abs(Math.sin(time * 14 + f)) * 8 * intensity : 0;
        const sc = Math.max(1, Math.round((1.1 + Math.sin(time * 10 + f * 2) * 0.4) * intensity * 1.4));
        const dw = 10 * sc;
        const dh = 7 * sc;
        ctx.drawImage(
          pixelSprites.splashDrop,
          Math.round(x + f * 8 - dw * 0.5),
          Math.round(waterY + 3 - lift - dh),
          dw,
          dh
        );
      }
      ctx.restore();
    }
  };

  // ================= PROJECTILES & PIXEL-ART VFX (ZERO PRIMITIVES) =================
  Art.drawPlayerBoulder = function (ctx, s, cameraX, time) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(s.x - cameraX), Math.round(s.y));
    ctx.rotate(time * 7 + s.x * 0.02);
    if (ready('boulder')) {
      ctx.drawImage(imgs.boulder, -12, -10, 24, 20);
    } else if (pixelSprites.boulderFallback) {
      ctx.drawImage(pixelSprites.boulderFallback, -12, -10, 24, 20);
    }
    ctx.restore();
  };

  Art.drawEnemyProjectile = function (ctx, p, cameraX, time) {
    const px = Math.round(p.x - cameraX);
    const py = Math.round(p.y);
    const angle = Math.atan2(p.vy, p.vx);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(px, py);

    if (p.type === 'archer') {
      ctx.rotate(angle);
      if (pixelSprites.projArrow) {
        ctx.drawImage(pixelSprites.projArrow, -15, -4, 30, 9);
      }
    } else if (p.type === 'spearman') {
      ctx.rotate(angle);
      if (pixelSprites.projSpear) {
        ctx.drawImage(pixelSprites.projSpear, -20, -4, 40, 9);
      }
    } else if (p.type === 'stoner') {
      ctx.rotate(time * 8);
      if (ready('boulder')) {
        ctx.drawImage(imgs.boulder, -9, -8, 18, 15);
      } else if (pixelSprites.boulderFallback) {
        ctx.drawImage(pixelSprites.boulderFallback, -9, -8, 18, 15);
      }
    } else {
      const vSprite = Math.floor(time * 14) % 2 === 0 ? pixelSprites.venom1 : pixelSprites.venom2;
      if (vSprite) {
        ctx.drawImage(vSprite, -11, -11, 22, 22);
      }
    }

    ctx.restore();
  };

  Art.drawFireParticles = function (ctx, fireParticles, cameraX) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of fireParticles) {
      const px = Math.round(p.x - cameraX);
      const py = Math.round(p.y);
      const ratio = Math.max(0, p.life / p.maxLife);
      const sz = Math.max(8, Math.round(p.size * (2.5 - ratio * 0.85)));

      let sprite = pixelSprites.fire3;
      if (ratio > 0.72) sprite = pixelSprites.fire0;
      else if (ratio > 0.48) sprite = pixelSprites.fire1;
      else if (ratio > 0.25) sprite = pixelSprites.fire2;

      if (sprite) {
        ctx.globalAlpha = Math.min(1, ratio * 1.65);
        ctx.drawImage(sprite, Math.round(px - sz * 0.5), Math.round(py - sz * 0.5), sz, sz);
      }
    }
    ctx.restore();
  };

  Art.drawSpark = function (ctx, s, cameraX) {
    const sx = Math.round(s.x - cameraX);
    const sy = Math.round(s.y);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (s.gravity && pixelSprites.splashDrop) {
      // Crisp pixel sea droplet
      ctx.drawImage(pixelSprites.splashDrop, sx - 4, sy - 3, 8, 6);
    } else {
      // Crisp HoMM3 integer pixel ember / hit cluster
      ctx.fillStyle = '#1f120b';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.fillStyle = s.color || '#ffd268';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.restore();
  };

  // ================= HoMM3 PIXEL-ART ARTIFACT HUD =================
  Art.drawHUD = function (ctx, W, dragon, princess, score, statusBanner, time) {
    const hudH = 72;

    // 1. Ornate Stone & Burnished Gold HoMM3 Top Panel
    if (ready('hudBarTile')) {
      const im = imgs.hudBarTile;
      const tileW = hudH * (im.naturalWidth / im.naturalHeight);
      for (let x = 0; x < W; x += tileW) {
        ctx.drawImage(im, x, 0, tileW + 1, hudH);
      }
    } else {
      ctx.fillStyle = '#181410';
      ctx.fillRect(0, 0, W, hudH);
    }

    // 2. Ruby-Studded Golden Chalice Artifact (Dragonblood / Fire Meter)
    drawChaliceSlot(ctx, 14, 5, dragon.fire / 100);

    // 3. Gilded Dragon Heart Medallion Artifact (BPM & Rest Meter)
    drawHeartSlot(ctx, 168, 5, dragon.bpm, dragon.resting, time, Boolean(dragon.landed && !dragon.activelyFiring));

    // 4. Center Quest & Realm Progress Readout
    const centerX = (335 + (W - 265)) * 0.5;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;

    ctx.fillStyle = dragon.carryingPrincess ? '#ffe48a' : '#f5e7c4';
    ctx.font = 'bold 12px "Palatino Linotype", Georgia, serif';
    const questTitle = dragon.carryingPrincess
      ? 'PRINCESS ISOLDE RESCUED — BEAR HER WEST TO SANCTUARY CITADEL'
      : 'QUEST: VANQUISH GARRISON & RESCUE PRINCESS ISOLDE';
    ctx.fillText(questTitle, centerX, 25);

    const barW = 280;
    const barX = Math.round(centerX - barW * 0.5);
    const barY = 34;
    ctx.fillStyle = '#0c0907';
    ctx.fillRect(barX, barY, barW, 8);
    ctx.strokeStyle = '#b88e3d';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(barX, barY, barW, 8);

    const prog = Math.max(0, Math.min(1, (dragon.x - 165) / (princess.x - 165)));
    const pFill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    pFill.addColorStop(0, '#2a753c');
    pFill.addColorStop(1, '#78d468');
    ctx.fillStyle = pFill;
    ctx.fillRect(barX + 1, barY + 1, Math.round((barW - 2) * prog), 6);

    // Crisp pixel-art gem marker on progress bar (zero ctx.arc!)
    if (pixelSprites.hudGem) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixelSprites.hudGem, Math.round(barX + barW * prog - 5), barY - 2, 11, 11);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffe680';
      ctx.fillRect(Math.round(barX + barW * prog - 3), barY + 1, 6, 6);
    }

    ctx.fillStyle = '#e0cfa6';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText(`GLORY: ${score}     •     REALM SPAN: ${Math.round(dragon.x)} / ${princess.x}`, centerX, 55);

    // 5. Right Slot below Sound / Touch / Full HUD toggles
    ctx.fillStyle = dragon.landed ? '#88f09b' : '#dfd2b4';
    ctx.font = 'bold 11px Georgia, serif';
    const stanceLabel = dragon.landed
      ? dragon.walking
        ? 'Striding on Solid Earth'
        : dragon.deepResting
          ? 'Deep Rest on Solid Earth'
          : 'Perched on Solid Earth'
      : 'Soaring Aloft';
    ctx.fillText(stanceLabel, W - 122, 55);

    // 6. Scroll Banner Notification
    if (statusBanner.timer > 0) {
      const bw = 580;
      const bx = Math.round((W - bw) * 0.5);
      const by = 82;
      ctx.fillStyle = 'rgba(20, 15, 11, 0.92)';
      ctx.fillRect(bx, by, bw, 32);
      ctx.strokeStyle = '#d4a644';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, 32);
      ctx.fillStyle = '#fff0b8';
      ctx.font = 'bold 13.5px "Palatino Linotype", Georgia, serif';
      ctx.fillText(statusBanner.text, W * 0.5, by + 21);
    }

    ctx.shadowBlur = 0;
  };

  function drawChaliceSlot(ctx, x, y, fillPct) {
    const sz = 62;
    if (ready('hudChalice')) {
      ctx.drawImage(imgs.hudChalice, x, y, sz, sz);
    }
    const barX = x + sz + 6;
    const barY = y + 8;
    const barW = 9;
    const barH = sz - 16;
    ctx.fillStyle = '#120709';
    ctx.fillRect(barX, barY, barW, barH);
    const fillH = Math.round((barH - 2) * fillPct);
    const wGrad = ctx.createLinearGradient(0, barY + barH - fillH, 0, barY + barH);
    wGrad.addColorStop(0, '#ff3d50');
    wGrad.addColorStop(1, '#6e0714');
    ctx.fillStyle = wGrad;
    ctx.fillRect(barX + 1, barY + barH - 1 - fillH, barW - 2, fillH);
    ctx.strokeStyle = '#c89b3c';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.textAlign = 'left';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#f6df96';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('FLAME', barX + 15, y + 25);
    ctx.fillStyle = '#f5ebd4';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(`${Math.round(fillPct * 100)}%`, barX + 15, y + 43);
  }

  function drawHeartSlot(ctx, x, y, bpm, resting, time, groundedCalming = false) {
    const sz = 62;
    const beatFreq = bpm / 60;
    const pulse = Math.pow(Math.max(0, Math.sin(time * beatFreq * Math.PI * 2)), 4);

    if (ready('hudHeart')) {
      ctx.save();
      const cx = x + sz * 0.5;
      const cy = y + sz * 0.5;
      ctx.translate(cx, cy);
      const sc = 1 + pulse * 0.08;
      ctx.scale(sc, sc);
      ctx.drawImage(imgs.hudHeart, -sz * 0.5, -sz * 0.5, sz, sz);

      // Pulsing ruby glow overlay inside the heart gem (fillRect radial gradient — zero ctx.arc)
      if (pulse > 0.05) {
        const pGlow = ctx.createRadialGradient(0, 2, 1, 0, 2, 18);
        pGlow.addColorStop(0, `rgba(255, 95, 110, ${pulse * 0.55})`);
        pGlow.addColorStop(1, 'rgba(255, 30, 50, 0)');
        ctx.fillStyle = pGlow;
        ctx.fillRect(-18, -16, 36, 36);
      }
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = bpm > 155 ? '#ff5c6a' : (resting || groundedCalming) ? '#88f09b' : '#f5e6c4';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(`${Math.round(bpm)} BPM`, x + sz + 10, y + 25);

    ctx.fillStyle = (resting || groundedCalming) ? '#88f09b' : bpm > 145 ? '#ff9478' : '#d6c6a5';
    ctx.font = 'bold 11px Georgia, serif';
    const sub = resting
      ? 'Resting — Calming'
      : groundedCalming
        ? 'Grounded — Calming'
        : bpm > 145
          ? 'Danger! Land & Rest'
          : 'Dragon Heartbeat';
    ctx.fillText(sub, x + sz + 10, y + 43);
  }

  window.HoMM3Art = Art;
})();
