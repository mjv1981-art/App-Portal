(() => {
  window.ThanatosMissions = window.ThanatosMissions || {};

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const gameShell = document.getElementById('game-shell');

  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const returnMapBtn = document.getElementById('return-map-btn');

  const pauseBtn = document.getElementById('pause-btn');
  const pauseLabel = document.getElementById('pause-label');
  const modeToggle = document.getElementById('mode-toggle');
  const touchState = document.getElementById('touch-state');
  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');
  const fullscreenToggle = document.getElementById('fullscreen-toggle');
  const fullscreenState = document.getElementById('fullscreen-state');

  const touchDpad = document.getElementById('touch-dpad');
  const touchActions = document.getElementById('touch-actions');

  const Art = window.HoMM3Art;
  const Audio = window.HoMM3Audio;
  const Campaign = window.ThanatosCampaign;
  const WorldMap = window.ThanatosMap;

  const W = canvas.width;  // 1120
  const H = canvas.height; // 630

  // ================= ROUTER & VIEWPORT STATE =================
  let appScreen = 'map';          // 'map' | 'mission'
  let activeMissionId = null;
  let activeController = null;
  let missionStatus = 'idle';     // 'idle' | 'playing' | 'paused' | 'finishing' | 'epilogue' | 'victory' | 'gameover'
  let startBtnAction = 'resume';  // 'resume' | 'retry' | 'return_map'
  let replayMissionId = null;
  let epilogueResult = null;
  let pendingOutcome = null;

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || missionStatus !== 'playing' || !activeController?.aimAt) return;
    const rect = canvas.getBoundingClientRect();
    activeController.aimAt((event.clientX - rect.left) * W / rect.width,
      (event.clientY - rect.top) * H / rect.height);
  });
  canvas.addEventListener('pointerleave', () => activeController?.aimAt?.(null));

  // ================= AUDIO UNLOCK & PERSISTED SETTINGS =================
  const savedSettings = Campaign ? Campaign.getState().settings : { muted: false, touchMode: 'auto' };

  if (Audio && savedSettings.muted) {
    Audio.setMuted(true);
  }
  if (soundToggle && Audio) {
    const syncSound = () => {
      soundState.textContent = Audio.muted ? 'Off' : 'On';
      soundToggle.setAttribute('aria-pressed', String(!Audio.muted));
    };
    syncSound();
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const muted = Audio.toggleMute();
      syncSound();
      if (Campaign) Campaign.updateSettings({ muted });
    });
  }

  const unlockOnce = () => {
    if (Audio) {
      Audio.unlock();
      if (Audio.muted && savedSettings.muted) {
        Audio.setMuted(true);
      }
    }
  };
  window.addEventListener('pointerdown', unlockOnce, { passive: true });
  window.addEventListener('keydown', unlockOnce);

  // ================= TOUCH MODE & DYNAMIC 3-BUTTON HUD =================
  let touchMode = savedSettings.touchMode || 'auto'; // 'auto' | 'on' | 'off'
  const coarseQuery = window.matchMedia('(pointer: coarse)');

  function updateTouchUI() {
    const isCoarse = coarseQuery.matches;
    const active = touchMode === 'auto' ? isCoarse : touchMode === 'on';
    document.body.classList.toggle('touch-active', active);
    if (modeToggle) {
      touchState.textContent = touchMode === 'auto' ? 'Auto' : touchMode === 'on' ? 'On' : 'Off';
      modeToggle.setAttribute('aria-pressed', String(active));
    }
  }
  updateTouchUI();
  coarseQuery.addEventListener?.('change', updateTouchUI);

  if (modeToggle) {
    modeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Audio) {
        Audio.unlock();
        if (Audio.playUiClick) Audio.playUiClick();
      }
      if (touchMode === 'auto') touchMode = coarseQuery.matches ? 'off' : 'on';
      else if (touchMode === 'on') touchMode = 'off';
      else touchMode = 'auto';
      if (Campaign) Campaign.updateSettings({ touchMode });
      updateTouchUI();
    });
  }

  // ================= FULLSCREEN TOGGLE + LANDSCAPE ORIENTATION LOCK =================
  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenLabel() {
    if (!fullscreenToggle) return;
    const active = Boolean(getFullscreenElement());
    fullscreenState.textContent = active ? 'Exit' : 'Enter';
    fullscreenToggle.setAttribute('aria-pressed', String(active));
  }

  async function toggleFullscreen() {
    if (Audio) {
      Audio.unlock();
      if (Audio.playUiClick) Audio.playUiClick();
    }
    try {
      if (!getFullscreenElement()) {
        const target = document.documentElement || gameShell;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) {
          target.webkitRequestFullscreen();
        }
        try {
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
          }
        } catch (_) {
          // Silent fallback on browsers/devices that disallow orientation lock
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (_) {
      // Ignore fullscreen rejection gracefully
    }
    updateFullscreenLabel();
  }

  if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });
  }
  document.addEventListener('fullscreenchange', updateFullscreenLabel);
  document.addEventListener('webkitfullscreenchange', updateFullscreenLabel);

  // ================= PORTRAIT LOCKOUT & VISIBILITY AUTO-PAUSE =================
  const portraitQuery = window.matchMedia('(pointer: coarse) and (orientation: portrait)');

  function isEnvironmentBlocked() {
    return Boolean(portraitQuery.matches || document.hidden);
  }

  function handleEnvironmentChange() {
    if (isEnvironmentBlocked()) {
      clearAllKeys();
      if (Audio) {
        Audio.setDragonFire(false);
        if (Audio.setWaterSkim) Audio.setWaterSkim(false);
      }
      if (activeController && activeController.onPause) {
        activeController.onPause(Audio);
      }
    }
  }

  if (portraitQuery.addEventListener) {
    portraitQuery.addEventListener('change', handleEnvironmentChange);
  }
  window.addEventListener('orientationchange', handleEnvironmentChange);
  window.addEventListener('resize', handleEnvironmentChange);
  document.addEventListener('visibilitychange', handleEnvironmentChange);

  // ================= UNIFIED KEYBOARD + SLIDE D-PAD + 3-BUTTON INPUT =================
  const keys = {};

  function clearAllKeys() {
    Object.keys(keys).forEach((k) => {
      keys[k] = false;
    });
    if (touchDpad) {
      touchDpad.querySelectorAll('.dpad-btn').forEach((b) => b.classList.remove('active'));
    }
    if (touchActions) {
      touchActions.querySelectorAll('.act-btn').forEach((b) => b.classList.remove('active'));
    }
  }

  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'Space') && e.target?.closest?.('button')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (missionStatus === 'epilogue' && (e.code === 'Escape' || e.code === 'Enter')) {
      e.preventDefault();
      showVictory(epilogueResult);
      return;
    }
    if (e.code === 'Escape' && appScreen === 'mission') {
      e.preventDefault();
      if (missionStatus === 'playing') {
        openPauseOverlay();
      } else if (missionStatus === 'paused') {
        resumeMission();
      } else if (missionStatus === 'victory' || missionStatus === 'gameover') {
        returnToCampaignMap();
      }
      return;
    }
    keys[e.code] = true;
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // 8-Way Slide-Friendly Touch D-Pad
  if (touchDpad) {
    let dpadPointerId = null;
    const btnUp = touchDpad.querySelector('.dpad-up');
    const btnDown = touchDpad.querySelector('.dpad-down');
    const btnLeft = touchDpad.querySelector('.dpad-left');
    const btnRight = touchDpad.querySelector('.dpad-right');

    const applyDpadVector = (clientX, clientY) => {
      const rect = touchDpad.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const deadzone = 12;

      const left = dx < -deadzone;
      const right = dx > deadzone;
      const up = dy < -deadzone;
      const down = dy > deadzone;

      keys['ArrowLeft'] = left;
      keys['ArrowRight'] = right;
      keys['ArrowUp'] = up;
      keys['ArrowDown'] = down;

      if (btnLeft) btnLeft.classList.toggle('active', left);
      if (btnRight) btnRight.classList.toggle('active', right);
      if (btnUp) btnUp.classList.toggle('active', up);
      if (btnDown) btnDown.classList.toggle('active', down);
    };

    const clearDpad = () => {
      dpadPointerId = null;
      keys['ArrowLeft'] = false;
      keys['ArrowRight'] = false;
      keys['ArrowUp'] = false;
      keys['ArrowDown'] = false;
      if (btnLeft) btnLeft.classList.remove('active');
      if (btnRight) btnRight.classList.remove('active');
      if (btnUp) btnUp.classList.remove('active');
      if (btnDown) btnDown.classList.remove('active');
    };

    touchDpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (Audio) Audio.unlock();
      dpadPointerId = e.pointerId;
      if (touchDpad.setPointerCapture) {
        try { touchDpad.setPointerCapture(e.pointerId); } catch (_) {}
      }
      applyDpadVector(e.clientX, e.clientY);
    });

    touchDpad.addEventListener('pointermove', (e) => {
      if (dpadPointerId !== e.pointerId) return;
      e.preventDefault();
      applyDpadVector(e.clientX, e.clientY);
    });

    touchDpad.addEventListener('pointerup', (e) => {
      if (dpadPointerId !== e.pointerId) return;
      e.preventDefault();
      clearDpad();
    });

    touchDpad.addEventListener('pointercancel', (e) => {
      if (dpadPointerId !== e.pointerId) return;
      clearDpad();
    });
  }

  // Strictly Capped 3-Button Dynamic Touch Action Medallions
  function configureTouchButtons(buttonDefs) {
    if (!touchActions) return;
    const capped = (buttonDefs || []).slice(0, 3);
    touchActions.innerHTML = '';

    capped.forEach((def) => {
      const btn = document.createElement('div');
      btn.className = `act-btn ${def.role || 'stone'}`;
      btn.setAttribute('data-key', def.key);
      btn.innerHTML = String(def.label || '').replace('\n', '<br>');

      const press = (e) => {
        e.preventDefault();
        if (Audio) Audio.unlock();
        keys[def.key] = true;
        btn.classList.add('active');
      };
      const release = (e) => {
        e.preventDefault();
        keys[def.key] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      touchActions.appendChild(btn);
    });
  }

  // ================= MISSION 1 CONTROLLER (THE COAST OF OATHS) =================
  function createMission1Controller() {
    const GROUND_Y = 524;
    const WORLD_W = 4600;
    const SEA_START = 1680;
    const SEA_END = 2880;

    let time = 0;
    let cameraX = 0;
    let screenShake = 0;
    let score = 0;
    let statusBanner = { text: '', timer: 0 };

    const dragon = {
      x: 260,
      y: 260,
      vx: 0,
      vy: 0,
      dir: 1,
      facing: 1,
      wingPhase: 0,
      walkPhase: 0,
      landed: false,
      onGround: false,
      walking: false,
      resting: false,
      deepResting: false,
      fire: 100,
      bpm: 68,
      invuln: 0,
      stoneCooldown: 0,
      carryingPrincess: false,
      activelyFiring: false,
      motion: null
    };

    const sanctuary = { x: 165, y: GROUND_Y };
    const princess = {
      x: 4120,
      y: GROUND_Y - 236,
      rescued: false,
      delivered: false,
      wavePhase: 0
    };

    const scenicProps = [
      // Western Rampart woodlands & boulders
      { type: 'tree', x: 380, variant: 0, scale: 0.96 },
      { type: 'rock', x: 495, r: 22 },
      { type: 'tree', x: 650, variant: 1, scale: 1.02 },
      { type: 'tree', x: 910, variant: 0, scale: 0.92 },
      { type: 'rock', x: 1090, r: 24 },
      { type: 'tree', x: 1210, variant: 1, scale: 1.06 },
      { type: 'tree', x: 1510, variant: 0, scale: 0.94 },
      { type: 'rock', x: 1625, r: 20 },

      // Eastern borderlands approaching Watchtower
      { type: 'rock', x: 2950, r: 22 },
      { type: 'tree', x: 3120, variant: 1, scale: 1.0 },
      { type: 'tree', x: 3410, variant: 0, scale: 1.04 },
      { type: 'rock', x: 3590, r: 25 },
      { type: 'tree', x: 3720, variant: 1, scale: 0.98 },
      { type: 'tree', x: 3960, variant: 0, scale: 0.9 },
      { type: 'tree', x: 4330, variant: 0, scale: 1.06 },
      { type: 'rock', x: 4460, r: 24 }
    ];

    let enemies = [];
    let projectiles = [];
    let playerStones = [];
    let fireParticles = [];
    let sparks = [];

    function showBanner(text, duration = 3.2) {
      statusBanner = { text, timer: duration };
    }

    function isOverSea(x) {
      return x > SEA_START && x < SEA_END;
    }

    function spawnEntities() {
      enemies = [];
      projectiles = [];
      playerStones = [];
      fireParticles = [];
      sparks = [];

      const groundSpots = [
        { x: 520, type: 'archer' },
        { x: 780, type: 'spearman' },
        { x: 1010, type: 'stoner' },
        { x: 1260, type: 'archer' },
        { x: 1500, type: 'spearman' },
        { x: 3040, type: 'stoner' },
        { x: 3290, type: 'archer' },
        { x: 3530, type: 'spearman' },
        { x: 3770, type: 'archer' },
        { x: 3960, type: 'spearman' }
      ];
      for (const g of groundSpots) {
        enemies.push({
          kind: 'ground',
          sub: g.type,
          x: g.x,
          y: GROUND_Y,
          hp: 2.2,
          cooldown: 1.0 + Math.random() * 1.4,
          patrolDir: Math.random() < 0.5 ? -1 : 1,
          originX: g.x,
          alive: true
        });
      }

      const beeSpots = [890, 1410, 2120, 2660, 3420, 3890];
      for (const bx of beeSpots) {
        const by = 175 + Math.random() * 170;
        enemies.push({
          kind: 'bee',
          x: bx,
          y: by,
          baseY: by,
          hp: 2.0,
          phase: Math.random() * Math.PI * 2,
          alive: true
        });
      }

      const seaSpots = [1860, 2180, 2490, 2740];
      seaSpots.forEach((sx, idx) => {
        enemies.push({
          kind: 'serpent',
          x: sx,
          originX: sx,
          y: GROUND_Y + 34,
          vx: 0,
          vy: 0,
          emerge: 0,
          jumping: false,
          jumpCooldown: 1.2 + idx * 0.75,
          splashTimer: 0,
          biteAnim: 0,
          timer: Math.random() * 2.8,
          hp: 3.2,
          cooldown: 1.3,
          alive: true
        });
      });
    }

    function spawnReturnReinforcements() {
      const aliveHydras = enemies.filter((e) => e.alive && e.kind === 'serpent').length;
      if (aliveHydras < 2) {
        [2040, 2560].forEach((sx, idx) => {
          enemies.push({
            kind: 'serpent',
            x: sx,
            originX: sx,
            y: GROUND_Y + 34,
            vx: 0,
            vy: 0,
            emerge: 0,
            jumping: false,
            jumpCooldown: 1.0 + idx * 0.8,
            splashTimer: 0,
            biteAnim: 0,
            timer: Math.random() * 2.0,
            hp: 3.2,
            cooldown: 1.2,
            alive: true
          });
        });
      }
      const aliveBees = enemies.filter((e) => e.alive && e.kind === 'bee' && e.x < 3200).length;
      if (aliveBees < 2) {
        [1180, 2340].forEach((bx) => {
          const by = 185 + Math.random() * 140;
          enemies.push({
            kind: 'bee',
            x: bx,
            y: by,
            baseY: by,
            hp: 2.0,
            phase: Math.random() * Math.PI * 2,
            alive: true
          });
        });
      }
    }

    function spawnDeathSparks(x, y, color, count = 11) {
      for (let k = 0; k < count; k++) {
        sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 170,
          vy: -Math.random() * 145,
          life: 0.42,
          color
        });
      }
    }

    function spawnWaterDroplets(x) {
      for (let i = 0; i < 12; i++) {
        sparks.push({
          x: x + (Math.random() - 0.5) * 34,
          y: GROUND_Y + 10,
          vx: (Math.random() - 0.5) * 140,
          vy: -80 - Math.random() * 140,
          gravity: 380,
          life: 0.55,
          color: i % 2 === 0 ? '#dff8ff' : '#4cc3e8'
        });
      }
    }

    function damageDragon(amountBpm, cause = 'projectile') {
      if (dragon.invuln > 0) return false;
      dragon.bpm = Math.min(210, dragon.bpm + amountBpm);
      dragon.invuln = 0.85;
      dragon.motion.hurt = 0.27;
      screenShake = 9;

      if (Audio) {
        if (cause === 'hydra') Audio.playHydraBite(false);
        else if (cause === 'bee') Audio.playBeeBite();
        else Audio.playBoulder(true);
      }

      for (let i = 0; i < 14; i++) {
        sparks.push({
          x: dragon.x,
          y: dragon.y,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 220,
          life: 0.48,
          color: i % 2 === 0 ? '#ff3848' : '#ffd268'
        });
      }
      return dragon.bpm >= 200;
    }

    function updateDragonMotion(dt, dx, moveDir, up, down, wasGrounded, audio) {
      const motion = dragon.motion;
      if (!motion) return;
      const vertical = (down ? 1 : 0) - (up ? 1 : 0);
      const heading = !dragon.landed && (moveDir || vertical) ?
        (Math.round(Math.atan2(vertical, moveDir) / (Math.PI / 4)) + 8) % 8 :
        dragon.facing < 0 ? 4 : 0;
      if (heading !== motion.heading) {
        motion.headingFrom = motion.turn < 0.09 ? motion.headingFrom : motion.heading;
        motion.heading = heading;
        motion.turn = 0;
      }
      motion.turn = Math.min(0.18, motion.turn + dt);
      const toward = (state, target, speed) => {
        const delta = speed * dt;
        return target > state ? Math.min(target, state + delta) : Math.max(target, state - delta);
      };
      const previousGround = motion.grounded;
      motion.grounded = toward(motion.grounded, Number(dragon.landed), dragon.landed ? 4.65 : 5.3);
      motion.walk = toward(motion.walk, dragon.walking ? Math.min(1, Math.abs(dragon.vx) / 112) : 0, 6.8);
      const gliding = !dragon.landed && !up && !down && Math.abs(dragon.vx) > 133;
      motion.glide = toward(motion.glide, Number(gliding), gliding ? 2.5 : 4.3);
      motion.fire = toward(motion.fire, Number(dragon.activelyFiring), dragon.activelyFiring ? 11.5 : 4.1);
      motion.hurt = Math.max(0, motion.hurt - dt);
      motion.throwAge = Math.min(0.33, motion.throwAge + dt);
      motion.contactCooldown = Math.max(0, motion.contactCooldown - dt);
      if (motion.pickup) {
        motion.pickup.age += dt;
        if (motion.pickup.age >= 0.42) motion.pickup = null;
      }
      if (!wasGrounded && dragon.landed) {
        audio?.playBoulder?.(true);
        motion.contactCooldown = 0.21;
      }
      if (dragon.walking) {
        const previousStep = Math.floor(motion.walkDistance / 28);
        motion.walkDistance += Math.abs(dx);
        if (Math.floor(motion.walkDistance / 28) !== previousStep && motion.contactCooldown === 0) {
          audio?.playTitanStep?.();
          motion.contactCooldown = 0.17;
        }
      }
      const previousWingbeat = Math.floor((dragon.wingPhase + Math.PI * 0.5) / (Math.PI * 2));
      dragon.wingPhase += dt * (dragon.landed ? 2.2 : 10.5 - 5 * motion.glide);
      const nextWingbeat = Math.floor((dragon.wingPhase + Math.PI * 0.5) / (Math.PI * 2));
      if (motion.glide < 0.63 && motion.grounded < 0.34 &&
          (nextWingbeat !== previousWingbeat || previousGround >= 0.34)) {
        audio?.playBoneWingbeat?.();
      }
    }

    return {
      id: 1,
      title: 'The Coast of Oaths',
      musicMode: 'm1_rampart',
      touchButtons: Campaign.getMission(1).touchButtons,

      init() {
        time = 0;
        score = 0;
        screenShake = 0;
        cameraX = 0;

        dragon.x = 260;
        dragon.y = 260;
        dragon.vx = 0;
        dragon.vy = 0;
        dragon.dir = 1;
        dragon.facing = 1;
        dragon.wingPhase = 0;
        dragon.walkPhase = 0;
        dragon.landed = false;
        dragon.onGround = false;
        dragon.walking = false;
        dragon.resting = false;
        dragon.deepResting = false;
        dragon.fire = 100;
        dragon.bpm = 68;
        dragon.invuln = 0;
        dragon.stoneCooldown = 0;
        dragon.carryingPrincess = false;
        dragon.activelyFiring = false;
        dragon.motion = {
          heading: 0, headingFrom: 0, turn: 0.18, grounded: 0, walk: 0, glide: 0,
          walkDistance: 0, contactCooldown: 0, fire: 0, hurt: 0,
          throwAge: 0.33, pickup: null, outcome: null
        };

        princess.rescued = false;
        princess.delivered = false;
        princess.wavePhase = 0;

        spawnEntities();
        showBanner('SOAR EASTWARD AS VERIDIAS & RESCUE PRINCESS ISOLDE!', 3.6);
      },

      update(dt, inputKeys, audio) {
        time += dt;
        const previousX = dragon.x;
        const wasGrounded = dragon.landed;
        if (statusBanner.timer > 0) statusBanner.timer -= dt;
        if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 28);

        const left = inputKeys['ArrowLeft'] || inputKeys['KeyA'];
        const right = inputKeys['ArrowRight'] || inputKeys['KeyD'];
        const up = inputKeys['ArrowUp'] || inputKeys['KeyW'];
        const down = inputKeys['ArrowDown'] || inputKeys['KeyS'];
        const firing = inputKeys['Space'];
        const throwingStone = inputKeys['KeyX'] || inputKeys['ShiftLeft'] || inputKeys['ShiftRight'];
        const wantRest = inputKeys['KeyR'];

        // Liftoff from solid earth when Up / W is pressed
        if (up) {
          if (dragon.landed) {
            dragon.vy = -215;
            dragon.y = Math.min(dragon.y, GROUND_Y - 35);
            dragon.landed = false;
            dragon.onGround = false;
            dragon.resting = false;
            dragon.walking = false;
          }
          dragon.vy -= 700 * dt;
        }

        const moveDir = (right ? 1 : 0) - (left ? 1 : 0);
        if (moveDir !== 0) {
          dragon.dir = moveDir;
          dragon.facing = moveDir;
        }

        if (dragon.landed) {
          // Smooth, responsive ground walking while landed
          if (moveDir !== 0) {
            dragon.vx += moveDir * 1050 * dt;
            dragon.vx *= Math.pow(0.04, dt);
          } else {
            dragon.vx *= Math.pow(0.0004, dt);
            if (Math.abs(dragon.vx) < 4) dragon.vx = 0;
          }
          dragon.vx = Math.max(-190, Math.min(190, dragon.vx));
          dragon.vy = 0;
        } else {
          if (left) dragon.vx -= 650 * dt;
          if (right) dragon.vx += 650 * dt;
          if (down || wantRest) {
            dragon.vy += 580 * dt;
          }
          dragon.vy += 155 * dt;
          dragon.vx *= Math.pow(0.25, dt);
          dragon.vy *= Math.pow(0.22, dt);
          dragon.vx = Math.max(-310, Math.min(310, dragon.vx));
          dragon.vy = Math.max(-260, Math.min(270, dragon.vy));
        }

        dragon.x += dragon.vx * dt;
        dragon.y += dragon.vy * dt;

        dragon.x = Math.max(55, Math.min(WORLD_W - 55, dragon.x));
        dragon.y = Math.max(122, dragon.y);

        const overSea = isOverSea(dragon.x);
        const floorY = GROUND_Y - 27;
        if (!overSea && dragon.y >= floorY && !up) {
          dragon.y = floorY;
          dragon.vy = 0;
          dragon.landed = true;
        } else if (overSea && dragon.y >= floorY + 6) {
          dragon.y = floorY + 6;
          dragon.vy = Math.min(0, dragon.vy);
          dragon.landed = false;
        } else if (overSea || dragon.y < floorY - 4) {
          dragon.landed = false;
        }

        dragon.onGround = dragon.landed;
        dragon.facing = dragon.dir;

        dragon.walking = dragon.landed && (moveDir !== 0 || Math.abs(dragon.vx) > 18);
        if (dragon.walking) {
          dragon.walkPhase += dt * (4.2 + Math.abs(dragon.vx) * 0.042);
        } else {
          dragon.walkPhase = 0;
        }

        const activelyFiring = Boolean(firing && dragon.fire > 2);
        dragon.activelyFiring = activelyFiring;

        const standingStillOnLand = dragon.landed && moveDir === 0 && Math.abs(dragon.vx) < 22;
        const deepRest = standingStillOnLand && Boolean(wantRest) && !activelyFiring && !throwingStone;
        dragon.deepResting = deepRest;
        dragon.resting = standingStillOnLand && !activelyFiring && !throwingStone;

        // Heartbeat (BPM) recovery:
        // - R / Rest while standing still on land: fastest recovery (-27 BPM/s)
        // - Standing still on land & not firing flame: fast recovery (-17.5 BPM/s)
        // - Walking on land & not firing flame: brisk grounded recovery (-10.5 BPM/s) > flying
        // - Flying & not firing flame: slow airborne recovery (-1.5 BPM/s down to 72)
        if (!activelyFiring && !firing) {
          if (deepRest) {
            dragon.bpm = Math.max(64, dragon.bpm - 27 * dt);
          } else if (standingStillOnLand) {
            dragon.bpm = Math.max(64, dragon.bpm - 17.5 * dt);
          } else if (dragon.landed) {
            dragon.bpm = Math.max(66, dragon.bpm - 10.5 * dt);
          } else if (dragon.bpm > 72) {
            dragon.bpm = Math.max(72, dragon.bpm - 1.5 * dt);
          }
        }

        if (audio) {
          audio.updateHeartbeat(dt, dragon.bpm, true, dragon.resting || (dragon.landed && !activelyFiring));
          audio.setDragonFire(activelyFiring);
        }

        if (activelyFiring) {
          dragon.fire = Math.max(0, dragon.fire - 32 * dt);
          for (let i = 0; i < 4; i++) {
            const speed = 340 + Math.random() * 160;
            const spread = dragon.landed
              ? (Math.random() - 0.5) * 0.22 + 0.04
              : (Math.random() - 0.5) * 0.28 + 0.14;
            fireParticles.push({
              x: dragon.x + dragon.dir * 86,
              y: dragon.landed ? dragon.y - 14 : dragon.y - 12,
              vx: dragon.dir * speed + dragon.vx * 0.3,
              vy: Math.sin(spread) * speed * 0.52,
              life: 0.42 + Math.random() * 0.18,
              maxLife: 0.6,
              size: 9 + Math.random() * 8
            });
          }
        } else if (!firing) {
          const flameRegen = deepRest ? 32 : dragon.landed ? 24 : 16;
          dragon.fire = Math.min(100, dragon.fire + flameRegen * dt);
        }

        if (dragon.stoneCooldown > 0) dragon.stoneCooldown -= dt;
        if (throwingStone && dragon.stoneCooldown <= 0) {
          dragon.stoneCooldown = 0.45;
          dragon.motion.throwAge = 0;
          if (audio) audio.playBoulder(false);
          if (dragon.landed) {
            // Grounded boulder hurl: strong forward battlefield arc while walking or standing
            playerStones.push({
              x: dragon.x + dragon.dir * 34,
              y: dragon.y - 18,
              vx: dragon.dir * 340 + dragon.vx * 0.4,
              vy: -235,
              life: 3.2
            });
          } else {
            playerStones.push({
              x: dragon.x + dragon.dir * 16,
              y: dragon.y + 12,
              vx: dragon.dir * 185 + dragon.vx * 0.5,
              vy: -45,
              life: 3.2
            });
          }
        }

        if (dragon.invuln > 0) dragon.invuln -= dt;
        updateDragonMotion(dt, dragon.x - previousX, moveDir, up, down || wantRest, wasGrounded, audio);

        // Update Fire Particles
        for (let i = fireParticles.length - 1; i >= 0; i--) {
          const p = fireParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) {
            fireParticles.splice(i, 1);
            continue;
          }
          for (const e of enemies) {
            if (!e.alive) continue;
            const targetY = e.kind === 'bee' || (e.kind === 'serpent' && e.jumping) ? e.y : e.y - 18;
            if (Math.hypot(p.x - e.x, p.y - targetY) < 32) {
              e.hp -= 4.8 * dt;
              if (e.hp <= 0) {
                e.alive = false;
                score += e.kind === 'serpent' ? 250 : e.kind === 'bee' ? 150 : 100;
                spawnDeathSparks(e.x, targetY, '#ff9d38');
              }
            }
          }
        }

        // Update Player Boulders
        for (let i = playerStones.length - 1; i >= 0; i--) {
          const s = playerStones[i];
          s.vy += 500 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt;
          let hit = false;
          for (const e of enemies) {
            if (!e.alive) continue;
            const targetY = e.kind === 'bee' || (e.kind === 'serpent' && e.jumping) ? e.y : e.y - 18;
            if (Math.hypot(s.x - e.x, s.y - targetY) < 30) {
              e.hp -= 2.2;
              hit = true;
              if (e.hp <= 0) {
                e.alive = false;
                score += e.kind === 'serpent' ? 250 : e.kind === 'bee' ? 150 : 100;
                spawnDeathSparks(e.x, targetY, '#e8be68');
              }
              break;
            }
          }
          if (hit || s.y >= GROUND_Y + 6 || s.life <= 0) {
            if (hit && audio) audio.playBoulder(true);
            spawnDeathSparks(s.x, Math.min(s.y, GROUND_Y), '#cfc2ad', 6);
            playerStones.splice(i, 1);
          }
        }

        // Update Enemies
        let fatalHit = false;
        for (const e of enemies) {
          if (!e.alive) continue;
          const dist = Math.abs(e.x - dragon.x);
          const audible = dist < 720;

          if (e.kind === 'ground') {
            e.x += e.patrolDir * 26 * dt;
            if (Math.abs(e.x - e.originX) > 68) e.patrolDir *= -1;

            e.cooldown -= dt;
            if (dist < 490 && e.cooldown <= 0) {
              e.cooldown = e.sub === 'archer' ? 1.85 : e.sub === 'spearman' ? 2.25 : 2.55;
              const dx = dragon.x - e.x;
              const dy = (dragon.y - 6) - (e.y - 26);
              const len = Math.max(1, Math.hypot(dx, dy));
              const spd = e.sub === 'archer' ? 325 : e.sub === 'spearman' ? 260 : 225;

              if (audible && audio) {
                if (e.sub === 'archer') audio.playArrow();
                else if (e.sub === 'spearman') audio.playSpear();
                else audio.playBoulder(false);
              }

              projectiles.push({
                type: e.sub,
                x: e.x,
                y: e.y - 28,
                vx: (dx / len) * spd,
                vy: (dy / len) * spd - (e.sub === 'stoner' ? 115 : 48),
                gravity: e.sub === 'stoner' ? 250 : 95,
                life: 3.2
              });
            }
          } else if (e.kind === 'bee') {
            e.phase += dt * 4.2;
            e.y = e.baseY + Math.sin(e.phase) * 34;
            if (dist < 580) {
              const dirToDragon = dragon.x < e.x ? -1 : 1;
              e.x += dirToDragon * 76 * dt;
            }
            if (Math.hypot(e.x - dragon.x, e.y - dragon.y) < 36) {
              if (damageDragon(18, 'bee')) fatalHit = true;
            }
          } else if (e.kind === 'serpent') {
            if (e.splashTimer > 0) e.splashTimer -= dt;
            if (e.biteAnim > 0) e.biteAnim -= dt;
            e.cooldown -= dt;

            if (e.jumping) {
              e.vy += 610 * dt;
              e.x += e.vx * dt;
              e.y += e.vy * dt;
              e.x = Math.max(SEA_START + 70, Math.min(SEA_END - 70, e.x));

              if (e.vy > -120 && e.vy < 90 && dist < 480 && e.cooldown <= 0) {
                e.cooldown = 1.85;
                e.biteAnim = 0.55;
                if (audible && audio) audio.playHydraBite(true);
                const dx = dragon.x - e.x;
                const dy = dragon.y - e.y;
                const len = Math.max(1, Math.hypot(dx, dy));
                projectiles.push({
                  type: 'venom',
                  x: e.x + (dx / len) * 26,
                  y: e.y,
                  vx: (dx / len) * 285,
                  vy: (dy / len) * 285,
                  gravity: 42,
                  life: 2.9
                });
              }

              if (e.vy > 0 && e.y >= GROUND_Y + 26) {
                e.jumping = false;
                e.vx = 0;
                e.vy = 0;
                e.y = GROUND_Y + 26;
                e.splashTimer = 0.5;
                e.jumpCooldown = 2.1 + Math.random() * 1.4;
                spawnWaterDroplets(e.x);
                if (audible && audio) audio.playHydraSplash();
              }

              if (Math.hypot(e.x - dragon.x, e.y - dragon.y) < 42) {
                e.biteAnim = 0.5;
                if (damageDragon(24, 'hydra')) fatalHit = true;
              }
            } else {
              e.x += (e.originX - e.x) * Math.min(1, dt * 1.8);
              e.timer += dt;
              const cycle = (Math.sin(e.timer * 1.5) + 1) * 0.5;
              e.emerge = dist < 540 ? cycle * 0.72 : cycle * 0.35;
              e.y = GROUND_Y + 34 - e.emerge * 72;

              e.jumpCooldown -= dt;
              if (dist < 540 && e.jumpCooldown <= 0) {
                e.jumping = true;
                const dirToDragon = dragon.x < e.x ? -1 : 1;
                e.vx = dirToDragon * (45 + Math.random() * 45);
                e.vy = -445 - Math.random() * 115;
                e.y = GROUND_Y - 12;
                e.splashTimer = 0.55;
                spawnWaterDroplets(e.x);
                if (audible && audio) audio.playHydraSplash();
              } else if (e.emerge > 0.55 && dist < 430 && e.cooldown <= 0) {
                e.cooldown = 2.0;
                e.biteAnim = 0.45;
                if (audible && audio) audio.playHydraBite(true);
                const dx = dragon.x - e.x;
                const dy = dragon.y - (e.y - 20);
                const len = Math.max(1, Math.hypot(dx, dy));
                projectiles.push({
                  type: 'venom',
                  x: e.x,
                  y: e.y - 22,
                  vx: (dx / len) * 265,
                  vy: (dy / len) * 265,
                  gravity: 42,
                  life: 2.9
                });
              }

              if (Math.hypot(e.x - dragon.x, (e.y - 18) - dragon.y) < 38) {
                e.biteAnim = 0.5;
                if (damageDragon(24, 'hydra')) fatalHit = true;
              }
            }
          }
        }

        // Enemy Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.vy += p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (Math.hypot(p.x - dragon.x, p.y - dragon.y) < 28) {
            if (damageDragon(p.type === 'venom' ? 20 : 14, p.type === 'venom' ? 'hydra' : 'projectile')) {
              fatalHit = true;
            }
            projectiles.splice(i, 1);
            continue;
          }
          if (p.y > GROUND_Y + 12 || p.life <= 0) {
            projectiles.splice(i, 1);
          }
        }

        // Sparks & Water Droplets
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          if (s.gravity) s.vy += s.gravity * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt;
          if (s.life <= 0 || (s.gravity && s.y > GROUND_Y + 14)) {
            sparks.splice(i, 1);
          }
        }

        if (fatalHit || dragon.bpm >= 200) {
          return { outcome: 'loss', score };
        }

        // Princess Isolde Rescue & Return to Sanctuary Citadel
        princess.wavePhase += dt * 4.5;
        if (!princess.rescued && Math.hypot(dragon.x - princess.x, dragon.y - (princess.y - 24)) < 62) {
          princess.rescued = true;
          dragon.carryingPrincess = true;
          dragon.motion.pickup = { age: 0, x: princess.x, y: princess.y };
          score += 500;
          spawnReturnReinforcements();
          if (audio) audio.playFanfare(false);
          showBanner('PRINCESS ISOLDE RESCUED! BEAR HER WEST TO SANCTUARY CITADEL!', 4.2);
        }

        if (dragon.carryingPrincess && Math.hypot(dragon.x - sanctuary.x, dragon.y - (sanctuary.y - 48)) < 85) {
          dragon.carryingPrincess = false;
          princess.delivered = true;
          score += 1000;
          return { outcome: 'win', score };
        }

        // Smooth Camera Follow
        const targetCam = Math.max(0, Math.min(WORLD_W - W, dragon.x - W * 0.36));
        cameraX += (targetCam - cameraX) * Math.min(1, dt * 6);

        return null;
      },

      beginOutcomeAnimation(result) {
        const water = isOverSea(dragon.x);
        const won = result.outcome === 'win';
        dragon.motion.outcome = {
          kind: result.outcome, age: 0, fromX: dragon.x, fromY: dragon.y, water,
          toX: won ? Math.max(sanctuary.x + 6, Math.min(sanctuary.x + 50, dragon.x)) :
            dragon.x - dragon.facing * 19,
          toY: water ? GROUND_Y + 18 : GROUND_Y - 27,
          arrivalX: sanctuary.x - 26, floor: GROUND_Y
        };
        dragon.motion.hurt = 0;
        dragon.motion.fire = 0;
        dragon.motion.throwAge = 0.33;
        dragon.motion.pickup = null;
        dragon.activelyFiring = false;
        return won ? 0.9 : 0.78;
      },

      updateOutcomeAnimation(dt) {
        const motion = dragon.motion;
        const outcome = motion.outcome;
        if (!outcome) return;
        time += dt;
        outcome.age += dt;
        screenShake = Math.max(0, screenShake - dt * 35);
        const t = Math.min(1, outcome.age / (outcome.kind === 'win' ? 0.38 : 0.66));
        const ease = t * t * (3 - 2 * t);
        dragon.x = outcome.fromX + (outcome.toX - outcome.fromX) * ease;
        dragon.y = outcome.fromY + (outcome.toY - outcome.fromY) * ease;
        motion.grounded = Math.min(1, motion.grounded + dt * (outcome.kind === 'win' ? 5 : 2.5));
        motion.walk = Math.max(0, motion.walk - dt * 5);
        motion.turn = 0.18;
        dragon.vy *= Math.pow(0.02, dt);
        dragon.wingPhase += dt * (1.4 + (1 - motion.grounded) * 4);
      },

      render(rctx, rW, rH, art) {
        rctx.save();
        if (screenShake > 0) {
          rctx.translate(
            Math.round((Math.random() - 0.5) * screenShake),
            Math.round((Math.random() - 0.5) * screenShake)
          );
        }

        // 1. HoMM3 World Backdrop, Mountains, Woodlands, Castles, Turf & Sea
        art.drawWorld(rctx, rW, rH, WORLD_W, GROUND_Y, SEA_START, SEA_END, cameraX, time, scenicProps);

        // 2. Captive Princess Isolde atop Watchtower
        if (!princess.rescued && !princess.delivered) {
          const px = princess.x - cameraX;
          if (px > -60 && px < rW + 60) {
            art.drawPrincess(rctx, px, princess.y, princess.wavePhase);
          }
        }

        // 3. Active HoMM3 Enemy Units
        for (const e of enemies) {
          if (!e.alive) continue;
          const ex = e.x - cameraX;
          if (ex < -140 || ex > rW + 140) continue;

          if (e.kind === 'ground') {
            art.drawGroundUnit(rctx, e, cameraX, dragon.x, dragon.y, time);
          } else if (e.kind === 'bee') {
            art.drawBee(rctx, e, cameraX, dragon.x, time);
          } else if (e.kind === 'serpent') {
            art.drawSerpent(rctx, e, cameraX, GROUND_Y, dragon.x, dragon.y, time);
          }
        }

        // 4. Rampart Emerald Dragon (Veridias)
        art.drawDragon(
          rctx,
          dragon,
          cameraX,
          isOverSea(dragon.x) ? GROUND_Y + 80 : GROUND_Y,
          time,
          dragon.activelyFiring
        );

        // 5. Dragon Flame Breath, Boulders & Enemy Projectiles (100% Pixel-Art Sprites)
        art.drawFireParticles(rctx, fireParticles, cameraX);

        for (const s of playerStones) {
          art.drawPlayerBoulder(rctx, s, cameraX, time);
        }
        for (const p of projectiles) {
          art.drawEnemyProjectile(rctx, p, cameraX, time);
        }

        // 6. Crisp Integer Pixel-Art Impact Sparks & Sea Droplets (Zero ctx.arc!)
        for (const s of sparks) {
          art.drawSpark(rctx, s, cameraX);
        }

        // 7. Ornate HoMM3 Marble & Gold Top HUD
        art.drawHUD(rctx, rW, dragon, princess, score, statusBanner, time);

        rctx.restore();
      },

      cleanup(audio) {
        if (audio) {
          audio.setDragonFire(false);
        }
      }
    };
  }

  window.ThanatosMissions[1] = createMission1Controller();

  // ================= ROUTER: CAMPAIGN MAP <-> MISSION FLOW =================

  function syncOverlayControlsGrid(meta) {
    const grid = document.getElementById('overlay-controls-grid');
    if (!grid || !meta || !Array.isArray(meta.controlsDesktop)) return;
    grid.innerHTML = meta.controlsDesktop
      .map((c) => `<div><span class="key">${c.key}</span> : ${c.action}</div>`)
      .join('');
  }

  function showMissionDialog({ title, subtitle, noteHtml, primaryLabel, primaryAction, restartLabel, showRestart,
    showReturnMap, summary = false, replayTarget = null }) {
    overlay.classList.toggle('campaign-finale', summary);
    overlay.querySelector('h1').textContent = title;
    overlay.querySelector('.subtitle').textContent = subtitle;
    overlay.querySelector('.legend-note').innerHTML = noteHtml;

    startBtn.textContent = primaryLabel;
    startBtnAction = primaryAction;
    replayMissionId = replayTarget;

    if (restartBtn) {
      restartBtn.textContent = restartLabel || 'REPLAY';
      restartBtn.classList.toggle('hidden', !showRestart);
    }
    if (returnMapBtn) {
      returnMapBtn.classList.toggle('hidden', !showReturnMap);
    }

    overlay.classList.remove('hidden');
  }

  function launchMission(missionId) {
    const controller = window.ThanatosMissions[missionId];
    const meta = Campaign ? Campaign.getMission(missionId) : null;
    if (!controller || !meta) return;

    clearAllKeys();
    activeMissionId = missionId;
    activeController = controller;
    pendingOutcome = null;
    Art.prepareMission?.(missionId);
    missionStatus = 'playing';
    appScreen = 'mission';

    if (WorldMap) WorldMap.setActive(false);
    document.body.classList.remove('on-map', 'on-epilogue');
    overlay.classList.add('hidden');
    if (pauseBtn) {
      pauseLabel.textContent = 'Map / Pause';
      pauseBtn.classList.remove('hidden');
    }

    syncOverlayControlsGrid(meta);
    configureTouchButtons(controller.touchButtons || meta.touchButtons);
    controller.init(ctx, W, H);

    if (Audio) {
      Audio.unlock();
      Audio.setMode(controller.musicMode || 'playing');
    }
  }

  function openPauseOverlay() {
    if (appScreen !== 'mission' || missionStatus !== 'playing') return;
    missionStatus = 'paused';
    clearAllKeys();
    if (activeController && activeController.onPause) {
      activeController.onPause(Audio);
    }
    if (Audio) {
      Audio.setDragonFire(false);
      if (Audio.setWaterSkim) Audio.setWaterSkim(false);
      if (Audio.playUiClick) Audio.playUiClick();
      Audio.setMode('menu');
    }

    const custom =
      activeController && activeController.getOverlayCopy
        ? activeController.getOverlayCopy('pause')
        : null;

    showMissionDialog({
      title: (custom && custom.title) || 'CHRONICLE PAUSED',
      subtitle: (custom && custom.subtitle) || 'Mission I — The Coast of Oaths (Kaelen & Veridias)',
      noteHtml:
        (custom && custom.noteHtml) ||
        'As <b>Veridias</b>, guardian <b>Emerald Dragon</b> of Rampart, rescue <b>Princess Isolde</b> from the <b>Eastern Watchtower</b> and return her to the <b>Sanctuary Citadel</b> to seal the <b>Rampart–Castle Alliance</b>.<br><br>' +
          'Guard your <b>Chalice of Dragonblood</b> and perch upon solid earth to calm your <b>Heart Medallion</b>.',
      primaryLabel: (custom && custom.primaryLabel) || 'RESUME FLIGHT',
      primaryAction: 'resume',
      restartLabel: 'RESTART MISSION',
      showRestart: true,
      showReturnMap: true
    });
  }

  function resumeMission() {
    if (appScreen !== 'mission' || missionStatus !== 'paused') return;
    clearAllKeys();
    missionStatus = 'playing';
    overlay.classList.add('hidden');
    if (Audio) {
      Audio.unlock();
      if (Audio.playUiClick) Audio.playUiClick();
      Audio.setMode((activeController && activeController.musicMode) || 'playing');
    }
  }

  function returnToCampaignMap() {
    clearAllKeys();
    if (activeController && activeController.cleanup) {
      activeController.cleanup(Audio);
    }
    activeMissionId = null;
    activeController = null;
    pendingOutcome = null;
    missionStatus = 'idle';
    appScreen = 'map';

    overlay.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    document.body.classList.remove('on-epilogue');
    document.body.classList.add('on-map');

    if (WorldMap) WorldMap.setActive(true);
    if (Audio) {
      Audio.setDragonFire(false);
      if (Audio.setWaterSkim) Audio.setWaterSkim(false);
      if (Audio.playUiClick) Audio.playUiClick();
      Audio.setMode('map');
    }
  }

  function showVictory(result) {
    missionStatus = 'victory';
    const best = Campaign ? Campaign.getBestScore(activeMissionId || 1) : result.score;
    if (epilogueResult) {
      epilogueResult = null;
      if (pauseBtn) pauseBtn.classList.add('hidden');
    } else if (Audio) {
      Audio.playFanfare(true);
      Audio.setMode('map');
    }

    const custom = activeController?.getOverlayCopy?.('victory', result, best);
    showMissionDialog({
      title: custom?.title || 'THE ALLIANCE IS SEALED!',
      subtitle: custom?.subtitle || `Mission I Liberated • Glory: ${result.score} (Best: ${best})`,
      noteHtml: custom?.noteHtml ||
        'Inside the <b>Sanctuary Citadel</b>, <b>Princess Isolde</b> presses her royal signet into the Rampart Elder’s hands—forging the <b>Rampart–Castle Alliance</b>! ' +
          'Yet <b>Veridias</b> bleeds from Hydra venom, and word arrives from <b>Tatalia</b> that Thanatos’s cursed <b>Soul-Barge</b> glides through the Reed-Fens.<br><br>' +
          '<b>Mission II — Venom in the Reed-Fens</b> is now unlocked upon the Campaign Map!',
      primaryLabel: custom?.primaryLabel || 'RETURN TO MAP',
      primaryAction: 'return_map',
      restartLabel: custom?.restartLabel || 'REPLAY',
      replayTarget: custom?.replayMissionId,
      summary: custom?.summary,
      showRestart: true,
      showReturnMap: false
    });
  }

  function handleMissionOutcome(result) {
    clearAllKeys();
    activeController?.cleanup?.(Audio);
    if (result.outcome === 'win') {
      if (Campaign && activeMissionId) Campaign.recordVictory(activeMissionId, result.score);
      if (activeController.startEpilogue) {
        missionStatus = 'epilogue';
        epilogueResult = result;
        document.body.classList.add('on-epilogue');
        if (pauseLabel) pauseLabel.textContent = 'Skip Epilogue';
        activeController.startEpilogue(Audio);
      } else {
        showVictory(result);
      }
    } else {
      missionStatus = 'gameover';
      if (Audio) {
        Audio.setMode('menu');
      }

      const custom =
        activeController && activeController.getOverlayCopy
          ? activeController.getOverlayCopy('gameover', result, 0)
          : null;

      showMissionDialog({
        title: (custom && custom.title) || 'VERIDIAS HAS FALLEN',
        subtitle: (custom && custom.subtitle) || `Mission I — Final Glory: ${result.score}`,
        noteHtml:
          (custom && custom.noteHtml) ||
          'Your battle-strained Dragon Heart gave out before <b>Princess Isolde</b> could seal the <b>Rampart–Castle Alliance</b>! ' +
            'Alight upon solid earth without breathing flame to steady your <b>Heart Medallion</b>.',
        primaryLabel: (custom && custom.primaryLabel) || 'TAKE WING AGAIN',
        primaryAction: 'retry',
        restartLabel: 'REPLAY',
        showRestart: false,
        showReturnMap: true
      });
    }
  }

  function finishMission(result) {
    const seconds = activeController.beginOutcomeAnimation?.(result, Audio) || 0;
    if (seconds <= 0) {
      handleMissionOutcome(result);
      return;
    }
    clearAllKeys();
    Audio?.setDragonFire(false);
    Audio?.setWaterSkim?.(false);
    pendingOutcome = { result, remaining: seconds };
    missionStatus = 'finishing';
  }

  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (startBtnAction === 'resume') {
        resumeMission();
      } else if (startBtnAction === 'return_map') {
        returnToCampaignMap();
      } else {
        launchMission(activeMissionId || 1);
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (replayMissionId) Campaign?.setLastPlayed(replayMissionId);
      launchMission(replayMissionId || activeMissionId || 1);
    });
  }

  if (returnMapBtn) {
    returnMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      returnToCampaignMap();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (missionStatus === 'playing') {
        openPauseOverlay();
      } else if (missionStatus === 'paused') {
        resumeMission();
      } else if (missionStatus === 'epilogue') {
        showVictory(epilogueResult);
      }
    });
  }

  // ================= BOOT & MAIN RAF LOOP =================
  Art.init();
  if (WorldMap) {
    WorldMap.init(canvas, launchMission);
    WorldMap.setActive(true);
  }
  if (Audio) {
    Audio.setMode('map');
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const blocked = isEnvironmentBlocked();

    if (appScreen === 'map') {
      if (!blocked && WorldMap) {
        WorldMap.update(dt);
      }
      if (WorldMap) {
        WorldMap.render(ctx, W, H, Art);
      }
    } else if (appScreen === 'mission' && activeController) {
      if (!blocked && missionStatus === 'playing') {
        const result = activeController.update(dt, keys, Audio);
        if (result) {
          finishMission(result);
        }
      } else if (!blocked && missionStatus === 'finishing') {
        const step = Math.min(dt, pendingOutcome.remaining);
        activeController.updateOutcomeAnimation?.(step);
        pendingOutcome.remaining -= step;
        if (pendingOutcome.remaining <= 0) {
          const { result } = pendingOutcome;
          pendingOutcome = null;
          handleMissionOutcome(result);
        }
      } else if (!blocked && missionStatus === 'epilogue' && activeController.updateEpilogue(dt)) {
        showVictory(epilogueResult);
      }
      activeController.render(ctx, W, H, Art);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
