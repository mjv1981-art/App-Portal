(() => {
  const CREST_SIZE = 66;
  const FLAG_HEIGHT = 61;
  const PLAQUE_HEIGHT = 23;

  const sprites = {};
  let initialized = false;
  let activeScreen = true;
  let time = 0;
  let hoveredNodeId = null;
  let focusedNodeId = 1;
  let openBriefingMissionId = null;
  let mapToast = { text: '', timer: 0 };
  let launchCallback = null;
  let safeTop = 82;
  const plaques = new Map();

  // Ambient drifting clouds & biome particles (all integer pixel rects/sprites)
  const clouds = [
    { x: 140, y: 210, speed: 9, scale: 3 },
    { x: 560, y: 390, speed: 7, scale: 4 },
    { x: 920, y: 150, speed: 11, scale: 3 }
  ];

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

  function buildMapSprites() {
    // Pixel-art route pavers (5x5 -> drawn at 2x = 10x10)
    const paverShape = [
      '..D..',
      '.DcD.',
      'DcccD',
      '.DcD.',
      '..D..'
    ];
    sprites.paverLocked = bakePixelSprite(paverShape, { D: '#17121f', c: '#544963' });
    sprites.paverActive = bakePixelSprite(paverShape, { D: '#2b1a05', c: '#e6b245' });
    sprites.paverPulse = bakePixelSprite(paverShape, { D: '#4a2e08', c: '#fff8c9' });
    sprites.paverConquered = bakePixelSprite(paverShape, { D: '#182b16', c: '#f5d76e' });

    // Selection corner bracket (6x6 -> drawn at 2x = 12x12)
    sprites.bracketTL = bakePixelSprite(
      [
        'DDDDDD',
        'DGGGGD',
        'DGGDDD',
        'DGD...',
        'DGD...',
        'DDD...'
      ],
      { D: '#241504', G: '#fff0a6' }
    );

    // Pixel-art drifting cloud silhouette (28x9)
    sprites.cloudShadow = bakePixelSprite(
      [
        '.......cccccccccccc.........',
        '....cccccccccccccccccc......',
        '..cccccccccccccccccccccc....',
        '.ccccccccccccccccccccccccc..',
        'cccccccccccccccccccccccccccc',
        '.cccccccccccccccccccccccccc.',
        '...cccccccccccccccccccccc...',
        '......cccccccccccccccc......',
        '............................'
      ],
      { c: 'rgba(10, 12, 18, 0.22)' }
    );
  }

  function sampleRoutePoints(waypoints, spacing = 20) {
    const Campaign = window.ThanatosCampaign;
    if (!waypoints || waypoints.length < 2) return [];
    const pts = waypoints.map((w) => ({
      x: w.xPct * Campaign.LOGICAL_W,
      y: w.yPct * Campaign.LOGICAL_H
    }));
    const out = [];
    let carry = spacing * 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLen < 1) continue;
      let d = carry;
      while (d < segLen) {
        const t = d / segLen;
        out.push({
          x: Math.round(a.x + (b.x - a.x) * t),
          y: Math.round(a.y + (b.y - a.y) * t)
        });
        d += spacing;
      }
      carry = d - segLen;
    }
    return out;
  }

  function showMapToast(text, duration = 2.8) {
    mapToast = { text, timer: duration };
  }

  function getLogicalPointer(canvas, clientX, clientY) {
    const Campaign = window.ThanatosCampaign;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: -999, y: -999 };
    return {
      x: ((clientX - rect.left) / rect.width) * Campaign.LOGICAL_W,
      y: ((clientY - rect.top) / rect.height) * Campaign.LOGICAL_H
    };
  }

  function measureHeader(canvas, bar) {
    if (!bar || !activeScreen) return;
    const view = canvas.getBoundingClientRect();
    const bottom = bar.getBoundingClientRect().bottom;
    if (!view.height || !Number.isFinite(bottom)) return;
    safeTop = Math.max(0, Math.ceil((bottom - view.top) * window.ThanatosCampaign.LOGICAL_H / view.height));
  }

  function markerY(mission) {
    return Math.max(mission.y, safeTop + 38);
  }

  function findNodeAt(lx, ly) {
    for (const mission of window.ThanatosCampaign.missions) {
      const dx = lx - mission.x;
      const dy = ly - markerY(mission);
      const plaque = plaques.get(mission.id);
      if ((Math.abs(dx) <= 38 && dy >= -40 && dy <= 37) ||
          (dx >= 14 && dx <= 82 && dy >= -52 && dy <= 30) ||
          (plaque && lx >= plaque.x && lx <= plaque.x + plaque.w &&
            ly >= plaque.y && ly <= plaque.y + PLAQUE_HEIGHT)) return mission;
    }
    return null;
  }

  function drawBriefingPortrait(mission) {
    const portraitCanvas = document.getElementById('briefing-portrait');
    if (!portraitCanvas) return;
    const pctx = portraitCanvas.getContext('2d');
    const pw = portraitCanvas.width;
    const ph = portraitCanvas.height;
    pctx.clearRect(0, 0, pw, ph);

    // Ornate dark velvet & gold backdrop
    pctx.fillStyle = '#140f0c';
    pctx.fillRect(0, 0, pw, ph);

    const Art = window.HoMM3Art;
    const artIm = mission.portraitSprite && Art && Art.getImage ? Art.getImage(mission.portraitSprite) : null;
    const crest = Art?.getImage(`mapCrest${mission.id}`);

    if (mission.implemented && artIm) {
      const iw = artIm.naturalWidth || artIm.width;
      const ih = artIm.naturalHeight || artIm.height;
      pctx.imageSmoothingEnabled = true;
      pctx.imageSmoothingQuality = 'high';
      const scale = Math.min((pw - 8) / iw, (ph - 8) / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      pctx.drawImage(artIm, (pw - dw) * 0.5, (ph - dh) * 0.5, dw, dh);
    } else if (crest) {
      pctx.imageSmoothingEnabled = false;
      const sz = 52;
      pctx.drawImage(crest, Math.round((pw - sz) * 0.5), Math.round((ph - sz) * 0.5), sz, sz);
    }

    pctx.strokeStyle = '#c89b3c';
    pctx.lineWidth = 2;
    pctx.strokeRect(1, 1, pw - 2, ph - 2);
  }

  function openBriefing(missionId) {
    const Campaign = window.ThanatosCampaign;
    const Audio = window.HoMM3Audio;
    const mission = Campaign.getMission(missionId);
    if (!mission) return;

    if (!Campaign.isUnlocked(mission.id)) {
      if (Audio && Audio.playMapLocked) Audio.playMapLocked();
      const prev = Campaign.getMission(Math.max(1, mission.id - 1));
      showMapToast(`Locked — Conquer Mission ${prev.roman}: ${prev.title} to awaken this vessel!`);
      return;
    }

    openBriefingMissionId = mission.id;
    focusedNodeId = mission.id;
    window.HoMM3Art?.prepareMission?.(mission.id);
    Campaign.setLastPlayed(mission.id);
    if (Audio && Audio.playMapSelect) Audio.playMapSelect();

    const modal = document.getElementById('map-briefing');
    if (!modal) return;

    const titleEl = document.getElementById('briefing-title');
    const subEl = document.getElementById('briefing-subtitle');
    const statusEl = document.getElementById('briefing-status');
    const hookEl = document.getElementById('briefing-story');
    const objEl = document.getElementById('briefing-objective');
    const controlsEl = document.getElementById('briefing-controls');
    const noticeEl = document.getElementById('briefing-gate4-notice');
    const embarkBtn = document.getElementById('briefing-embark-btn');

    const conquered = Campaign.isCompleted(mission.id);
    const bestScore = Campaign.getBestScore(mission.id);

    if (titleEl) {
      titleEl.textContent = `MISSION ${mission.roman} — ${mission.title}`;
    }
    if (subEl) {
      subEl.textContent = `${mission.vesselName} • ${mission.vessel} (${mission.faction}) • ${mission.landmark}`;
    }
    if (statusEl) {
      if (conquered) {
        statusEl.textContent = `LIBERATED • BEST GLORY: ${bestScore}`;
        statusEl.className = 'briefing-badge conquered';
      } else if (mission.implemented) {
        statusEl.textContent = 'ACTIVE CHRONICLE • READY TO EMBARK';
        statusEl.className = 'briefing-badge active';
      } else {
        statusEl.textContent = 'CHRONICLE PREVIEW • GATE 4';
        statusEl.className = 'briefing-badge preview';
      }
    }
    if (hookEl) {
      hookEl.textContent = mission.storyHook;
    }
    if (objEl) {
      objEl.innerHTML = `<b>Quest Objective:</b> ${mission.objective}<br><span class="mech-hint">${mission.mechanicsNote}</span>`;
    }
    if (controlsEl) {
      const isTouchUI = document.body.classList.contains('touch-active') || window.matchMedia('(pointer: coarse)').matches;
      const rows = mission.controlsDesktop
        .map((c) => `<div><span class="key">${c.key}</span> : ${c.action}</div>`)
        .join('');
      const touchSummary = mission.touchButtons
        .slice()
        .reverse()
        .map((b) => `<span class="touch-pill">${b.label.replace('\n', ' / ')}</span>`)
        .join(' ');
      controlsEl.innerHTML =
        `<div class="briefing-ctrl-title">${isTouchUI ? 'Touch & Keyboard Controls' : 'Battle Controls'}</div>` +
        `<div class="briefing-ctrl-list">${rows}</div>` +
        `<div class="briefing-touch-row">Touch HUD: <span class="touch-pill">D-PAD</span> ${touchSummary}</div>`;
    }

    drawBriefingPortrait(mission);

    if (mission.implemented && window.ThanatosMissions && window.ThanatosMissions[mission.id]) {
      if (noticeEl) noticeEl.classList.add('hidden');
      if (embarkBtn) {
        embarkBtn.textContent = conquered ? 'REPLAY CHRONICLE' : 'EMBARK';
        embarkBtn.classList.remove('btn-disabled');
      }
    } else {
      if (noticeEl) {
        noticeEl.innerHTML =
          `<b>Coming in Gate 4:</b> <i>${mission.title}</i> (${mission.vessel}) is slated for upcoming Gate 4 cycles. ` +
          `Select any available chronicle to embark.`;
        noticeEl.classList.remove('hidden');
      }
      if (embarkBtn) {
        embarkBtn.textContent = 'COMING IN GATE 4';
        embarkBtn.classList.add('btn-disabled');
      }
    }

    modal.classList.remove('hidden');
  }

  function closeBriefing(playClick = true) {
    const modal = document.getElementById('map-briefing');
    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      if (playClick && window.HoMM3Audio && window.HoMM3Audio.playUiClick) {
        window.HoMM3Audio.playUiClick();
      }
    }
    openBriefingMissionId = null;
  }

  function triggerEmbark() {
    if (!openBriefingMissionId) return;
    const Campaign = window.ThanatosCampaign;
    const Audio = window.HoMM3Audio;
    const mission = Campaign.getMission(openBriefingMissionId);
    if (!mission) return;

    const hasController = Boolean(
      mission.implemented && window.ThanatosMissions && window.ThanatosMissions[mission.id]
    );
    if (!Campaign.isUnlocked(mission.id)) {
      closeBriefing(false);
      showMapToast('This mission is locked in campaign progression.');
      return;
    }
    if (!hasController) {
      if (Audio && Audio.playMapLocked) Audio.playMapLocked();
      const noticeEl = document.getElementById('briefing-gate4-notice');
      if (noticeEl) {
        noticeEl.classList.remove('pulse-notice');
        void noticeEl.offsetWidth;
        noticeEl.classList.add('pulse-notice');
      }
      return;
    }

    const idToLaunch = mission.id;
    closeBriefing(false);
    if (Audio && Audio.playMapLaunch) Audio.playMapLaunch();
    if (typeof launchCallback === 'function') {
      launchCallback(idToLaunch);
    }
  }

  function bindEvents(canvas) {
    const embarkBtn = document.getElementById('briefing-embark-btn');
    const closeBtn = document.getElementById('briefing-close-btn');
    const modal = document.getElementById('map-briefing');

    if (embarkBtn) {
      embarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.HoMM3Audio) window.HoMM3Audio.unlock();
        triggerEmbark();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeBriefing(true);
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeBriefing(true);
        }
      });
    }

    canvas.addEventListener('pointermove', (e) => {
      if (!activeScreen || openBriefingMissionId !== null) return;
      const pt = getLogicalPointer(canvas, e.clientX, e.clientY);
      const hit = pt.y > safeTop ? findNodeAt(pt.x, pt.y) : null;
      const newHover = hit ? hit.id : null;
      if (newHover !== hoveredNodeId) {
        hoveredNodeId = newHover;
        if (newHover !== null && window.HoMM3Audio && window.HoMM3Audio.playMapHover) {
          window.HoMM3Audio.playMapHover();
        }
      }
      canvas.style.cursor = newHover !== null ? 'pointer' : 'default';
    });

    canvas.addEventListener('pointerleave', () => {
      hoveredNodeId = null;
      canvas.style.cursor = 'default';
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (!activeScreen || openBriefingMissionId !== null) return;
      const pt = getLogicalPointer(canvas, e.clientX, e.clientY);
      if (pt.y <= safeTop) return;
      const hit = findNodeAt(pt.x, pt.y);
      if (hit) {
        e.preventDefault();
        focusedNodeId = hit.id;
        openBriefing(hit.id);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!activeScreen) return;
      if ((e.code === 'Enter' || e.code === 'Space') && e.target?.closest?.('button')) return;

      if (openBriefingMissionId !== null) {
        if (e.code === 'Escape') {
          e.preventDefault();
          closeBriefing(true);
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          triggerEmbark();
        }
        return;
      }

      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        focusedNodeId = (focusedNodeId % 6) + 1;
        if (window.HoMM3Audio && window.HoMM3Audio.playMapHover) window.HoMM3Audio.playMapHover();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        focusedNodeId = ((focusedNodeId + 4) % 6) + 1;
        if (window.HoMM3Audio && window.HoMM3Audio.playMapHover) window.HoMM3Audio.playMapHover();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        openBriefing(focusedNodeId);
      }
    });
  }

  function ambientOpacity(progress, peak) {
    const rise = Math.sin(Math.PI * progress);
    return peak * rise * rise;
  }

  function drawBiomeAtmosphere(ctx, W, H) {
    const Campaign = window.ThanatosCampaign;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const mapAlpha = ctx.globalAlpha;

    // 1. Shimmering water pixel glints in Emerald Sea & River Strait
    const waterSpots = [
      [88, 520], [164, 565], [242, 540], [378, 505], [435, 456], [518, 360], [60, 290]
    ];
    for (let i = 0; i < waterSpots.length; i++) {
      const [wx, wy] = waterSpots[i];
      const phase = Math.sin(time * 3.2 + i * 1.7);
      if (phase > 0.1) {
        ctx.globalAlpha = mapAlpha * ((phase - 0.1) / 0.9) ** 2 * 0.7;
        ctx.fillStyle = '#b5edf8';
        const drift = Math.round(Math.sin(time * 1.5 + i) * 4);
        ctx.fillRect(wx + drift, wy, 6, 2);
      }
    }

    // 2. Sanctuary Citadel warm torchlight pixels (M1)
    for (const [x, y, offset] of [[306, 444, 0], [334, 452, 2.6]]) {
      const flame = 0.61 + 0.17 * Math.sin(time * 8 + offset) + 0.09 * Math.sin(time * 17 + offset);
      ctx.globalAlpha = mapAlpha * flame;
      ctx.fillStyle = '#ff9429';
      ctx.fillRect(x, y, 3, 3);
      ctx.globalAlpha = mapAlpha * flame * flame;
      ctx.fillStyle = '#fff5b8';
      ctx.fillRect(x + 1, y + 1, 2, 2);
    }

    // 3. Tatalia marsh spore glints (M2)
    ctx.fillStyle = '#98f080';
    for (let i = 0; i < 5; i++) {
      const mx = 540 + i * 38 + Math.round(Math.sin(time * 1.3 + i) * 8);
      const age = (time * 10 + i * 7) % 18;
      const my = 468 + ((i * 23) % 65) - Math.round(age);
      ctx.globalAlpha = mapAlpha * ambientOpacity(age / 18, 0.65);
      ctx.fillRect(mx, my, 3, 3);
    }

    // 4. Shattered Ossuary spectral cyan wisps (M4)
    ctx.fillStyle = '#68f0ff';
    for (let i = 0; i < 4; i++) {
      const ox = 885 + i * 22 + Math.round(Math.cos(time * 2 + i) * 5);
      const age = (time * 16 + i * 11) % 36;
      const oy = 205 - Math.round(age);
      ctx.globalAlpha = mapAlpha * ambientOpacity(age / 36, 0.7);
      ctx.fillRect(ox, oy, 3, 4);
    }

    // 5. Bracada snow/storm glints (M5)
    ctx.fillStyle = '#e1f6ff';
    for (let i = 0; i < 5; i++) {
      const bx = 575 + i * 30 + Math.round(Math.sin(time * 2.6 + i) * 10);
      const age = (time * 18 + i * 13) % 55;
      const by = 135 + Math.round(age);
      ctx.globalAlpha = mapAlpha * ambientOpacity(age / 55, 0.8);
      ctx.fillRect(bx, by, 2, 2);
    }

    // 6. Caldera of Living Memory rising lava embers (M6)
    for (let i = 0; i < 6; i++) {
      const cx = 335 + i * 14 + Math.round(Math.sin(time * 3 + i * 2) * 6);
      const age = (time * 22 + i * 15) % 68;
      const cy = 195 - Math.round(age);
      if (cy > safeTop + 6) {
        const headerFade = Math.min(1, (cy - safeTop - 6) / 12);
        ctx.globalAlpha = mapAlpha * ambientOpacity(age / 68, 0.8) * headerFade;
        ctx.fillStyle = i % 2 === 0 ? '#ffd85e' : '#ff5926';
        ctx.fillRect(cx, cy, 3, 3);
      }
    }

    ctx.globalAlpha = mapAlpha;
    // 7. Drifting Pixel-Art Cloud Shadows
    if (sprites.cloudShadow) {
      for (const cl of clouds) {
        const cw = 28 * cl.scale;
        const ch = 9 * cl.scale;
        ctx.drawImage(sprites.cloudShadow, Math.round(cl.x), Math.round(cl.y), cw, ch);
      }
    }

    // 8. Subtle Darkened Fog Veil over Locked Regions
    for (const m of Campaign.missions) {
      if (Campaign.getNodeState(m.id) === 'locked') {
        const g = ctx.createRadialGradient(m.x, m.y, 12, m.x, m.y, 92);
        g.addColorStop(0, 'rgba(12, 8, 22, 0.42)');
        g.addColorStop(1, 'rgba(12, 8, 22, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(m.x - 92, Math.max(safeTop, m.y - 92), 184, 184);
      }
    }

    ctx.restore();
  }

  function drawRoutes(ctx) {
    const Campaign = window.ThanatosCampaign;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const m of Campaign.missions) {
      if (!m.routeFromPrev || m.routeFromPrev.length < 2) continue;
      const previous = Campaign.getMission(m.id - 1);
      const route = m.routeFromPrev.slice();
      route[0] = { xPct: previous.xPct, yPct: markerY(previous) / Campaign.LOGICAL_H };
      route[route.length - 1] = { xPct: m.xPct, yPct: markerY(m) / Campaign.LOGICAL_H };
      const pts = sampleRoutePoints(route, 19);
      const destState = Campaign.getNodeState(m.id);

      const pulseIdx = pts.length > 0 ? Math.floor(time * 7) % pts.length : -1;

      pts.forEach((pt, idx) => {
        let paver = sprites.paverLocked;
        let sz = 8;
        if (destState === 'conquered') {
          paver = sprites.paverConquered;
          sz = 10;
        } else if (destState === 'active') {
          if (idx === pulseIdx || idx === (pulseIdx - 1 + pts.length) % pts.length) {
            paver = sprites.paverPulse;
            sz = 12;
          } else {
            paver = sprites.paverActive;
            sz = 10;
          }
        }
        if (paver) {
          ctx.drawImage(paver, Math.round(pt.x - sz * 0.5), Math.round(pt.y - sz * 0.5), sz, sz);
        }
      });
    }

    ctx.restore();
  }

  function drawSelectionBrackets(ctx, cx, cy, pulseOffset) {
    if (!sprites.bracketTL) return;
    const d = 39 + pulseOffset;
    const sz = 10;

    const corners = [
      { ox: -d, oy: -d, sx: 1, sy: 1 },
      { ox: d, oy: -d, sx: -1, sy: 1 },
      { ox: -d, oy: d, sx: 1, sy: -1 },
      { ox: d, oy: d, sx: -1, sy: -1 }
    ];
    for (const c of corners) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(cx + c.ox), Math.round(cy + c.oy));
      ctx.scale(c.sx, c.sy);
      ctx.drawImage(sprites.bracketTL, 0, 0, sz, sz);
      ctx.restore();
    }
  }

  function drawStandard(ctx, img, x, y, timeOffset) {
    if (!img) return;
    const width = Math.min(59, Math.round(FLAG_HEIGHT * img.width / img.height));
    const strips = 10;
    // Keep the pole still and ripple the cloth farther from it.
    for (let i = 0; i < strips; i += 1) {
      const srcX = Math.round(i * img.width / strips);
      const srcRight = Math.round((i + 1) * img.width / strips);
      const left = Math.round(i * width / strips);
      const right = Math.round((i + 1) * width / strips);
      const wave = i < 2 ? 0 : Math.sin(time * 5.2 - i * 0.59 + timeOffset) * i * 0.28;
      ctx.drawImage(img, srcX, 0, srcRight - srcX, img.height, x + left,
        y + Math.round(wave), right - left, FLAG_HEIGHT);
    }
  }

  function drawPlaque(ctx, mission, y, state) {
    const label = `${mission.roman}. ${mission.landmark}`;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    const width = Math.ceil(ctx.measureText(label).width) + 22;
    const x = Math.round(mission.x - width / 2);
    const top = y + 37;
    const palette = state === 'locked' ? ['#26212b', '#62566c', '#e1d5e1'] :
      state === 'conquered' ? ['#18261e', '#a4b681', '#f1efc9'] : ['#282019', '#cba45c', '#ffedc4'];

    ctx.fillStyle = '#100c11';
    ctx.fillRect(x + 1, top + 2, width, PLAQUE_HEIGHT);
    ctx.fillStyle = palette[0];
    ctx.fillRect(x, top, width, PLAQUE_HEIGHT);
    ctx.strokeStyle = palette[1];
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, top + 0.5, width - 1, PLAQUE_HEIGHT - 1);
    ctx.fillStyle = palette[2];
    ctx.fillText(label, mission.x, top + 15);
    plaques.set(mission.id, { x, y: top, w: width });
  }

  function drawNodes(ctx, art) {
    const Campaign = window.ThanatosCampaign;
    for (const mission of Campaign.missions) {
      const state = Campaign.getNodeState(mission.id);
      const active = state === 'active';
      const locked = state === 'locked';
      const focused = hoveredNodeId === mission.id || focusedNodeId === mission.id;
      const x = mission.x;
      const y = markerY(mission);
      const crest = art?.getImage(`mapCrest${mission.id}`) || art?.getImage(mission.portraitSprite);
      const standard = art?.getImage(`mapStandard${mission.id}`);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.save();
      if (locked) {
        ctx.globalAlpha = 0.75;
        ctx.filter = 'grayscale(0.67) saturate(0.68)';
      }
      drawStandard(ctx, standard, x + 18, Math.max(safeTop + 3, y - 52), mission.id);
      if (crest) {
        const size = CREST_SIZE + (focused ? 4 : 0);
        const scale = size / Math.max(crest.width, crest.height);
        const w = Math.round(crest.width * scale);
        const h = Math.round(crest.height * scale);
        ctx.shadowColor = focused && !locked ? '#ffcf7a95' : active ? '#0c0505e6' : '#08070bc0';
        ctx.shadowBlur = focused && !locked ? 13 : 8;
        ctx.drawImage(crest, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      }
      ctx.restore();

      const badge = locked ? art?.getImage('mapLock') :
        state === 'conquered' ? art?.getImage('mapVictory') : null;
      if (badge) {
        const scale = 25 / Math.max(badge.width, badge.height);
        ctx.drawImage(badge, x - 36, y - 32, Math.round(badge.width * scale), Math.round(badge.height * scale));
      }
      if (focused) drawSelectionBrackets(ctx, x, y, Math.round(Math.sin(time * 5) * 1.4));
      drawPlaque(ctx, mission, y, state);
      ctx.restore();
    }
  }

  function drawMapToast(ctx, W, H) {
    if (mapToast.timer <= 0 || !mapToast.text) return;
    ctx.save();
    ctx.font = 'bold 13px "Palatino Linotype", Georgia, serif';
    const tw = Math.ceil(ctx.measureText(mapToast.text).width);
    const bw = Math.min(W - 40, tw + 36);
    const bh = 32;
    const bx = Math.round((W - bw) * 0.5);
    const by = H - 44;

    ctx.fillStyle = 'rgba(18, 13, 20, 0.94)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#c89b3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#ffe7a3';
    ctx.textAlign = 'center';
    ctx.fillText(mapToast.text, W * 0.5, by + 21);
    ctx.restore();
  }

  function syncTestButton() {
    const btn = document.getElementById('test-toggle');
    if (!btn || !window.ThanatosCampaign) return;
    const on = window.ThanatosCampaign.isTestMode();
    const label = document.getElementById('test-state');
    if (label) label.textContent = on ? 'On' : 'Off';
    btn.setAttribute('aria-pressed', String(on));
  }

  const ThanatosMap = {
    init(canvas, onLaunchMission) {
      launchCallback = onLaunchMission;
      if (!initialized) {
        buildMapSprites();
        bindEvents(canvas);
        const bar = document.getElementById('command-bar');
        const updateInset = () => measureHeader(canvas, bar);
        if (bar && typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(updateInset);
          observer.observe(bar);
          observer.observe(canvas);
        }
        window.addEventListener('resize', updateInset);
        updateInset();
        const testBtn = document.getElementById('test-toggle');
        if (testBtn) {
          testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const Campaign = window.ThanatosCampaign;
            const Audio = window.HoMM3Audio;
            if (!Campaign) return;
            const next = Campaign.setTestMode(!Campaign.isTestMode());
            syncTestButton();
            if (Audio) {
              Audio.unlock();
              Audio.playMapSelect();
            }
            if (openBriefingMissionId !== null && !Campaign.isUnlocked(openBriefingMissionId)) closeBriefing(false);
            mapToast.text = next
              ? 'Test Mode ON — All campaign nodes are open.'
              : 'Test Mode OFF — Standard campaign progression restored.';
            mapToast.timer = 2.6;
          });
        }
        syncTestButton();
        const saved = window.ThanatosCampaign.getState();
        focusedNodeId = saved.lastPlayedNode || 1;
        initialized = true;
      }
    },

    setActive(isActive) {
      activeScreen = Boolean(isActive);
      if (!activeScreen) {
        hoveredNodeId = null;
        closeBriefing(false);
      } else {
        const count = document.getElementById('map-awakened-count');
        const Campaign = window.ThanatosCampaign;
        if (count) count.textContent = `${Campaign.getVesselsAwakenedCount()} / ${Campaign.missions.length}`;
        const saved = window.ThanatosCampaign.getState();
        focusedNodeId = saved.lastPlayedNode || 1;
      }
    },

    isBriefingOpen() {
      return openBriefingMissionId !== null;
    },

    openBriefing,
    closeBriefing,

    update(dt) {
      if (!activeScreen) return;
      time += dt;
      if (mapToast.timer > 0) {
        mapToast.timer = Math.max(0, mapToast.timer - dt);
      }
      const W = window.ThanatosCampaign.LOGICAL_W;
      for (const cl of clouds) {
        cl.x += cl.speed * dt;
        if (cl.x > W + 40) {
          cl.x = -160;
        }
      }
    },

    render(ctx, W, H, Art) {
      ctx.save();

      // 1. Generated HoMM3 Helicopter-View Continent Artwork (1120x630)
      const bg = Art && Art.getImage ? Art.getImage('campaignMapBg') : null;
      if (bg) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bg, 0, 0, W, H);
      } else {
        const fallback = ctx.createLinearGradient(0, 0, 0, H);
        fallback.addColorStop(0, '#1c2430');
        fallback.addColorStop(1, '#193b2d');
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Atmospheric Biome Pixel Glints, Embers, Clouds & Fog
      drawBiomeAtmosphere(ctx, W, H);

      // 3. Animated Pixel-Art Dotted / Gold Route Trails
      drawRoutes(ctx);

      // 4. Campaign crests, standards, and plaques
      drawNodes(ctx, Art);

      // 5. Locked node feedback
      drawMapToast(ctx, W, H);

      ctx.restore();
    }
  };

  window.ThanatosMap = ThanatosMap;
})();
