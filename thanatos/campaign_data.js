(() => {
  const STORAGE_KEY = 'thanatos_campaign_v1';
  const DEFAULT_TEST_MODE = true;
  const LOGICAL_W = 1120;
  const LOGICAL_H = 630;

  // QA Override via ?unlockAll=1
  let qaUnlockAll = false;
  try {
    const params = new URLSearchParams(window.location.search || '');
    qaUnlockAll = params.get('unlockAll') === '1';
  } catch (_) {
    qaUnlockAll = false;
  }

  const MISSIONS = [
    {
      id: 1,
      roman: 'I',
      title: 'The Coast of Oaths',
      vessel: 'Emerald Dragon',
      vesselName: 'Veridias',
      faction: 'Rampart',
      category: 'Dragon I',
      landmark: 'Sanctuary Citadel',
      region: 'Western Rampart Coast & Emerald Strait',
      implemented: true,
      musicMode: 'm1_rampart',
      crestType: 'emerald_dragon',
      portraitSprite: 'dragonUp',
      xPct: 0.29,
      yPct: 0.73,
      x: Math.round(LOGICAL_W * 0.29), // 325
      y: Math.round(LOGICAL_H * 0.73), // 460
      routeFromPrev: [],
      storyHook:
        'Mortally wounded at the eaves of the Dark Forest, border-seer Kaelen has his unbroken soul bound by Rampart Elder Druids into Veridias, guardian Emerald Dragon of the Sanctuary Citadel. Rogue border-lords and necrotic turncoats have ambushed Princess Isolde of Castle atop the Eastern Watchtower—threatening to shatter the Rampart–Castle Alliance before war begins.',
      objective:
        'Soar east across Marksmen, Halberdier Spearmen, Brigand Slingers, Giant Dragonfly Wasps & Abyssal Sea Serpents to rescue Princess Isolde from the Eastern Watchtower, then bear her safely home to the Sanctuary Citadel.',
      mechanicsNote:
        'Guard your Chalice of Dragonblood (flame replenishes when not firing) and your Heart Medallion (rises with wounds — perch motionless on solid earth to calm your pulse!).',
      controlsDesktop: [
        { key: 'WASD / Arrows', action: 'Soar & Steer' },
        { key: 'SPACE', action: 'Dragon Flame' },
        { key: 'X / SHIFT', action: 'Hurl Boulder' },
        { key: 'R / Land', action: 'Perch & Rest' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'LAND\nREST' },
        { role: 'stone', key: 'KeyX', label: 'BOULDER' },
        { role: 'fire', key: 'Space', label: 'FLAME' }
      ]
    },
    {
      id: 2,
      roman: 'II',
      title: 'Venom in the Reed-Fens',
      vessel: 'Wyvern',
      vesselName: 'Skithra',
      faction: 'Fortress (Tatalia)',
      category: 'Iconic Unit I',
      landmark: 'Tatalia Reed-Fens',
      region: 'Southern Tatalian Marshes',
      implemented: true,
      musicMode: 'm2_fortress',
      crestType: 'wyvern',
      portraitSprite: 'wyvernFly1',
      xPct: 0.55,
      yPct: 0.76,
      x: Math.round(LOGICAL_W * 0.55), // 616
      y: Math.round(LOGICAL_H * 0.76), // 479
      routeFromPrev: [
        { xPct: 0.29, yPct: 0.73 },
        { xPct: 0.36, yPct: 0.79 },
        { xPct: 0.45, yPct: 0.80 },
        { xPct: 0.55, yPct: 0.76 }
      ],
      storyHook:
        'With Veridias scarred by Hydra venom, Kaelen’s spirit is woven through a Fortress beastmaster totem into Skithra, a fierce Tatalian Wyvern. Deep beneath the choking ironwood canopy, Thanatos’s iron Soul-Barge ferries his cursed Phylactery upriver—shielded by shackled captives.',
      objective:
        'Skim inches above poisoned reed-waters at high speed, sever the four Soul-Lantern Chains with precision claw-slashes to free the captives, and dissolve the Phylactery Cradle before the Deyja locks close.',
      mechanicsNote:
        'High-speed forward river-corridor skimmer: water-skimming (+30% speed) rapidly refills Acid Venom glands—never splash Acid onto Captive Cages!',
      controlsDesktop: [
        { key: 'WASD / Arrows', action: 'Pitch & Throttle Skim' },
        { key: 'SPACE', action: 'Tail-Claw Slash (Chains)' },
        { key: 'X / SHIFT', action: 'Acid Venom Spit' },
        { key: 'R', action: 'Barrel-Evade Roll' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'EVADE' },
        { role: 'stone', key: 'KeyX', label: 'VENOM' },
        { role: 'fire', key: 'Space', label: 'SLASH' }
      ]
    },
    {
      id: 3,
      roman: 'III',
      title: 'Ashes of the Velvet Throne',
      vessel: 'Vampire Lord',
      vesselName: 'Lord Cassian',
      faction: 'Necropolis (Deyja)',
      category: 'Iconic Unit II',
      landmark: 'Obsidian Keep',
      region: 'Eastern Velvet Borders of Deyja',
      implemented: true,
      musicMode: 'm3_necropolis_stealth',
      crestType: 'vampire',
      portraitSprite: 'vampireIdle',
      xPct: 0.88,
      yPct: 0.56,
      x: Math.round(LOGICAL_W * 0.88), // 986
      y: Math.round(LOGICAL_H * 0.56), // 353
      routeFromPrev: [
        { xPct: 0.55, yPct: 0.76 },
        { xPct: 0.68, yPct: 0.79 },
        { xPct: 0.79, yPct: 0.71 },
        { xPct: 0.84, yPct: 0.64 },
        { xPct: 0.88, yPct: 0.56 }
      ],
      storyHook:
        'Pulled across the Stygian current after the Phylactery shockwave, Kaelen’s fading spark is caught by rogue elder vampire Lady Carmilla and bound into Lord Cassian’s crimson cloak. Inside the Obsidian Keep, three mortal Cult-Generals channel the Blood-Seal before dawn.',
      objective:
        'Stalk the Keep’s gothic cloisters in crimson mist-form, slip past Death Knight lantern cones, shatter the Blood-Seal generals, and break Commander Garret’s cursed Brass Reliquary.',
      mechanicsNote:
        '2.5D gothic stealth-assassination & rapier duel: Mist-Dash phases through iron grates and sweeping light beams.',
      controlsDesktop: [
        { key: 'WASD / Arrows', action: '8-Way Nocturnal Stalk' },
        { key: 'SPACE', action: 'Crimson Rapier / Parry' },
        { key: 'X / SHIFT', action: 'Mist-Dash Phase' },
        { key: 'R', action: 'Shadow-Bite Drain' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'BITE' },
        { role: 'stone', key: 'KeyX', label: 'MIST\nDASH' },
        { role: 'fire', key: 'Space', label: 'SLASH' }
      ]
    },
    {
      id: 4,
      roman: 'IV',
      title: 'The Shattered Ossuary',
      vessel: 'Bone / Ghost Dragon',
      vesselName: 'Vaelkor',
      faction: 'Necropolis Abyss',
      category: 'Dragon II',
      landmark: 'Shattered Ossuary',
      region: 'Under-Deyja Dragon Catacombs',
      implemented: true,
      musicMode: 'm4_ossuary',
      crestType: 'bone_dragon',
      portraitSprite: 'boneDragonFlap1',
      xPct: 0.82,
      yPct: 0.28,
      x: Math.round(LOGICAL_W * 0.82), // 918
      y: Math.round(LOGICAL_H * 0.28), // 176
      routeFromPrev: [
        { xPct: 0.88, yPct: 0.56 },
        { xPct: 0.85, yPct: 0.46 },
        { xPct: 0.81, yPct: 0.37 },
        { xPct: 0.82, yPct: 0.28 }
      ],
      storyHook:
        'Hurled beneath the burning cathedral grates, Kaelen awakens inside Vaelkor—a risen Bone & Ghost Dragon chained in a mile-deep dragon graveyard. Thousands of captive souls cry out from suspended cages as rising Soul-Miasma floods the chasm below.',
      objective:
        'Ascend vertically through the collapsing subterranean shaft, shatter binding runes to free bound Ghost Wyrms and trapped spirits, and smash Dread Lich Malakor’s Twin Soul-Pylons at the Sky-Seal.',
      mechanicsNote:
        'Vertical upward catacomb breakout: freeing captive spirit cages knits fractured bone armor and delays the rising Miasma.',
      controlsDesktop: [
        { key: 'WASD / Arrows', action: 'Climb Flap & Tuck-Dive' },
        { key: 'SPACE', action: 'Blue Ghost-Fire' },
        { key: 'X / SHIFT', action: 'Spectral Surge' },
        { key: 'R', action: 'Soul-Pulse Roar' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'SOUL\nROAR' },
        { role: 'stone', key: 'KeyX', label: 'SURGE' },
        { role: 'fire', key: 'Space', label: 'GHOST\nFIRE' }
      ]
    },
    {
      id: 5,
      roman: 'V',
      title: 'Thunder Above the Cloud-Spire',
      vessel: 'Titan',
      vesselName: 'Aegis-IX',
      faction: 'Tower (Bracada)',
      category: 'Iconic Unit III',
      landmark: 'Bracada Sky-Bridge',
      region: 'Snow-Crowned Bracada Peaks',
      implemented: true,
      musicMode: 'm5_tower',
      crestType: 'titan',
      portraitSprite: 'titanWalk1',
      xPct: 0.57,
      yPct: 0.26,
      x: Math.round(LOGICAL_W * 0.57), // 638
      y: Math.round(LOGICAL_H * 0.26), // 164
      routeFromPrev: [
        { xPct: 0.82, yPct: 0.28 },
        { xPct: 0.74, yPct: 0.32 },
        { xPct: 0.66, yPct: 0.29 },
        { xPct: 0.57, yPct: 0.26 }
      ],
      storyHook:
        'As Vaelkor’s undead bones dissolve in mountain dawnlight, Archmage Solon anchors Kaelen’s radiant soul inside Aegis-IX—a forty-foot Tower Titan of marble and storm-bronze. Across the Sky-Bridge, Princess Isolde’s allied vanguard is pinned by Nighon Siege-Colossi.',
      objective:
        'March across the storm-swept marble causeway, reflect Dread Ballista volleys with your Storm-Bastion Shield, intercept flanking Manticores threatening Isolde’s rear banner, and fell the Obsidian Siege-Colossus.',
      mechanicsNote:
        'Grounded heavy siege brawl & two-front escort: blocking artillery charges Overloaded Chain Thunderbolts.',
      controlsDesktop: [
        { key: 'A/D + W/S', action: 'March & Aim Elevation (mouse also aims)' },
        { key: 'SPACE', action: 'Chain Thunderbolt' },
        { key: 'X / SHIFT', action: 'Storm-Bastion Shield' },
        { key: 'R', action: 'Seismic Stomp' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'STOMP' },
        { role: 'stone', key: 'KeyX', label: 'SHIELD' },
        { role: 'fire', key: 'Space', label: 'THUNDER' }
      ]
    },
    {
      id: 6,
      roman: 'VI',
      title: 'The Crown of Living Memory',
      vessel: 'Azure Dragon',
      vesselName: 'Saphirion',
      faction: 'Sky-Crown (United Realm)',
      category: 'Dragon III — Grand Finale',
      landmark: 'Caldera of Living Memory',
      region: 'The Frost-Flame Crown Altar',
      implemented: true,
      musicMode: 'm6_finale',
      crestType: 'azure_dragon',
      portraitSprite: 'azureFly1',
      xPct: 0.33,
      yPct: 0.22,
      x: Math.round(LOGICAL_W * 0.33), // 370
      y: Math.round(LOGICAL_H * 0.22), // 139
      routeFromPrev: [
        { xPct: 0.57, yPct: 0.26 },
        { xPct: 0.49, yPct: 0.23 },
        { xPct: 0.41, yPct: 0.20 },
        { xPct: 0.33, yPct: 0.22 }
      ],
      storyHook:
        'Answered by the fallen Titan’s thunder and the united banners of Rampart, Castle, and Tower below, the mythical Azure Dragon Saphirion descends from the stars. Above the volcanic-frost caldera, Thanatos rides his Black Dread-Dragon to shatter the Crown of Living Memory.',
      objective:
        'Soar through a 360° open-sky caldera dogfight, dispel Shadow-Echoes of past vessels with your Sapphire Fear-Roar, shatter the Black Altar anchors, and end Thanatos’s Dread-Dragon host.',
      mechanicsNote:
        '360° open-sky multi-phase boss arena: Star-Frost Breath slows aerial threats while Crown Resonance unleashes Memory Nova.',
      controlsDesktop: [
        { key: 'WASD / Arrows', action: '360° Flight (optional mouse aim)' },
        { key: 'SPACE', action: 'Star-Frost Breath' },
        { key: 'X / SHIFT', action: 'Sapphire Fear-Roar' },
        { key: 'R', action: 'Supersonic Sky-Dash' }
      ],
      touchButtons: [
        { role: 'rest', key: 'KeyR', label: 'SKY\nDASH' },
        { role: 'stone', key: 'KeyX', label: 'FEAR\nROAR' },
        { role: 'fire', key: 'Space', label: 'STAR\nFROST' }
      ]
    }
  ];

  function createDefaultSave() {
    return {
      version: 1,
      unlockedMax: 1,
      completed: { '1': false, '2': false, '3': false, '4': false, '5': false, '6': false },
      bestScores: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
      lastPlayedNode: 1,
      settings: { muted: false, touchMode: 'auto', testModeOverride: null }
    };
  }

  function sanitizeSave(raw) {
    const base = createDefaultSave();
    if (!raw || typeof raw !== 'object') return base;

    if (typeof raw.unlockedMax === 'number' && raw.unlockedMax >= 1) {
      base.unlockedMax = Math.min(6, Math.max(1, Math.floor(raw.unlockedMax)));
    }
    if (raw.completed && typeof raw.completed === 'object') {
      for (let i = 1; i <= 6; i++) {
        const k = String(i);
        base.completed[k] = Boolean(raw.completed[k]);
        if (base.completed[k] && i < 6) {
          base.unlockedMax = Math.max(base.unlockedMax, i + 1);
        }
      }
    }
    if (raw.bestScores && typeof raw.bestScores === 'object') {
      for (let i = 1; i <= 6; i++) {
        const k = String(i);
        const val = Number(raw.bestScores[k]);
        base.bestScores[k] = Number.isFinite(val) && val > 0 ? Math.floor(val) : 0;
      }
    }
    if (typeof raw.lastPlayedNode === 'number' && raw.lastPlayedNode >= 1 && raw.lastPlayedNode <= 6) {
      base.lastPlayedNode = Math.floor(raw.lastPlayedNode);
    }
    if (raw.settings && typeof raw.settings === 'object') {
      base.settings.muted = Boolean(raw.settings.muted);
      if (['auto', 'on', 'off'].includes(raw.settings.touchMode)) {
        base.settings.touchMode = raw.settings.touchMode;
      }
      if (typeof raw.settings.testModeOverride === 'boolean') {
        base.settings.testModeOverride = raw.settings.testModeOverride;
      }
    }
    return base;
  }

  let state = createDefaultSave();

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = sanitizeSave(JSON.parse(raw));
      } else {
        state = createDefaultSave();
      }
    } catch (_) {
      state = createDefaultSave();
    }
    return state;
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Ignore quota / private-browsing storage restrictions cleanly
    }
  }

  function resetSave() {
    const keepSettings = { ...state.settings };
    state = createDefaultSave();
    state.settings = keepSettings;
    save();
    return state;
  }

  function getMission(id) {
    return MISSIONS.find((m) => m.id === Number(id)) || MISSIONS[0];
  }

  function isCompleted(id) {
    return Boolean(state.completed[String(id)]);
  }

  function isTestMode() {
    return qaUnlockAll || (state.settings.testModeOverride ?? DEFAULT_TEST_MODE);
  }

  function setTestMode(enabled) {
    state.settings.testModeOverride = Boolean(enabled);
    save();
    return isTestMode();
  }

  function isUnlocked(id) {
    const n = Number(id);
    return Number.isInteger(n) && n >= 1 && n <= (isTestMode() ? MISSIONS.length : state.unlockedMax);
  }

  // Returns 'conquered' | 'active' | 'locked'
  function getNodeState(id) {
    if (isCompleted(id)) return 'conquered';
    if (isUnlocked(id)) return 'active';
    return 'locked';
  }

  function getBestScore(id) {
    return state.bestScores[String(id)] || 0;
  }

  function getVesselsAwakenedCount() {
    let count = 0;
    for (let i = 1; i <= 6; i++) {
      if (state.completed[String(i)]) count++;
    }
    return count;
  }

  function recordVictory(id, score = 0) {
    const n = Number(id);
    if (n < 1 || n > 6) return state;
    const k = String(n);
    state.completed[k] = true;
    const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
    if (cleanScore > (state.bestScores[k] || 0)) {
      state.bestScores[k] = cleanScore;
    }
    if (n < 6) {
      state.unlockedMax = Math.min(6, Math.max(state.unlockedMax, n + 1));
    }
    state.lastPlayedNode = n < 6 ? n + 1 : n;
    save();
    return state;
  }

  function setLastPlayed(id) {
    const n = Number(id);
    if (n >= 1 && n <= 6) {
      state.lastPlayedNode = n;
      save();
    }
  }

  function updateSettings(partial) {
    if (!partial || typeof partial !== 'object') return;
    if (typeof partial.muted === 'boolean') state.settings.muted = partial.muted;
    if (['auto', 'on', 'off'].includes(partial.touchMode)) state.settings.touchMode = partial.touchMode;
    if (typeof partial.testMode === 'boolean') state.settings.testModeOverride = partial.testMode;
    save();
  }

  loadSave();

  window.ThanatosCampaign = {
    STORAGE_KEY,
    LOGICAL_W,
    LOGICAL_H,
    qaUnlockAll,
    isTestMode,
    setTestMode,
    title: 'THANATOS — Chronicles of the Six Vessels',
    tagline: 'One mortal soul. Six immortal forms.',
    missions: MISSIONS,
    getMission,
    getState: () => state,
    loadSave,
    save,
    resetSave,
    isUnlocked,
    isCompleted,
    getNodeState,
    getBestScore,
    getVesselsAwakenedCount,
    recordVictory,
    setLastPlayed,
    updateSettings
  };
})();
