(() => {
  const AudioEngine = {
    ctx: null,
    unlocked: false,
    muted: false,
    mode: 'map', // 'map' | 'menu' | 'playing' | 'm1_rampart' | 'silent'

    masterGain: null,
    musicGain: null,
    sfxGain: null,
    heartGain: null,
    reverbNode: null,
    noiseBuffer: null,

    // Music scheduler state
    nextNoteTime: 0,
    stepIndex: 0,
    schedulerTimer: null,

    // Continuous dragonfire nodes
    fireActive: false,
    fireNodes: null,

    // Continuous Wyvern water-skim spray nodes (Mission 2)
    skimActive: false,
    skimNodes: null,

    // Continuous heartbeat state
    heartTimer: 0,
    dubPending: false,
    dubTimer: 0,

    // Hover throttle timestamp
    lastHoverTime: 0
  };

  function ensureContext() {
    if (AudioEngine.ctx) {
      if (AudioEngine.ctx.state === 'suspended') {
        AudioEngine.ctx.resume();
      }
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    const ctx = new AC();
    AudioEngine.ctx = ctx;

    // Master Compressor + Gain
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.18;

    const master = ctx.createGain();
    master.gain.value = AudioEngine.muted ? 0 : 0.88;
    comp.connect(master);
    master.connect(ctx.destination);
    AudioEngine.masterGain = master;

    // Sub-buses
    const music = ctx.createGain();
    music.gain.value = 0.34;
    music.connect(comp);
    AudioEngine.musicGain = music;

    const sfx = ctx.createGain();
    sfx.gain.value = 0.72;
    sfx.connect(comp);
    AudioEngine.sfxGain = sfx;

    const heart = ctx.createGain();
    heart.gain.value = 0.82;
    heart.connect(comp);
    AudioEngine.heartGain = heart;

    // Warm Concert-Hall Reverb Impulse for HoMM3 Orchestral Depth
    const revLen = Math.floor(ctx.sampleRate * 1.65);
    const revBuf = ctx.createBuffer(2, revLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = revBuf.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        const t = i / revLen;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8) * 0.5;
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = revBuf;
    const revGain = ctx.createGain();
    revGain.gain.value = 0.38;
    convolver.connect(revGain);
    revGain.connect(music);
    AudioEngine.reverbNode = convolver;

    // Shared 2-second White/Pink Noise Buffer for Foley & Dragonfire
    const nLen = ctx.sampleRate * 2;
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nData = nBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < nLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      nData[i] = (b0 + b1 + b2 + white * 0.18) * 0.85;
    }
    AudioEngine.noiseBuffer = nBuf;

    AudioEngine.nextNoteTime = ctx.currentTime + 0.05;
    startMusicScheduler();
    return true;
  }

  AudioEngine.unlock = function () {
    if (!ensureContext()) return;
    if (AudioEngine.ctx.state === 'suspended') {
      AudioEngine.ctx.resume();
    }
    AudioEngine.unlocked = true;
  };

  AudioEngine.setMuted = function (muted) {
    AudioEngine.muted = Boolean(muted);
    if (AudioEngine.masterGain && AudioEngine.ctx) {
      AudioEngine.masterGain.gain.setTargetAtTime(
        AudioEngine.muted ? 0 : 0.88,
        AudioEngine.ctx.currentTime,
        0.04
      );
    }
    if (AudioEngine.muted) {
      AudioEngine.setDragonFire(false);
      if (AudioEngine.setWaterSkim) AudioEngine.setWaterSkim(false);
      AudioEngine.setGhostFire(false);
      AudioEngine.setStarFrost(false);
    }
    return AudioEngine.muted;
  };

  AudioEngine.toggleMute = function () {
    AudioEngine.unlock();
    return AudioEngine.setMuted(!AudioEngine.muted);
  };

  AudioEngine.setMode = function (newMode) {
    let normalized = newMode;
    if (newMode === 'm1_rampart') normalized = 'playing';
    else if (newMode === 'm2_tatalia') normalized = 'm2_fortress';

    if (normalized !== 'playing') {
      AudioEngine.setDragonFire(false);
      AudioEngine.dubPending = false;
    }
    if (normalized !== 'm2_fortress' && AudioEngine.setWaterSkim) {
      AudioEngine.setWaterSkim(false);
    }
    if (normalized !== 'm4_ossuary') AudioEngine.setGhostFire(false);
    if (normalized !== 'm6_finale') AudioEngine.setStarFrost(false);
    if (AudioEngine.mode === normalized) return;
    AudioEngine.mode = normalized;
    AudioEngine.stepIndex = 0;
    if (AudioEngine.ctx) {
      AudioEngine.nextNoteTime = AudioEngine.ctx.currentTime + 0.06;
    }
  };

  // ================= HoMM3 NEOCLASSICAL ORCHESTRAL SYNTHESIS =================
  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // 1. Baroque Harpsichord Pluck
  function playHarpsichord(time, midi, dur, vel = 0.22) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(freq * 6.5, time);
    flt.frequency.exponentialRampToValueAtTime(freq * 1.8, time + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  // 1b. Warm Renaissance Lute / Concert Harp Arpeggio (Overworld Map Voice)
  function playLute(time, midi, dur, vel = 0.2) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const body = ctx.createOscillator();
    const harm = ctx.createOscillator();
    body.type = 'triangle';
    harm.type = 'sine';
    body.frequency.setValueAtTime(freq, time);
    harm.frequency.setValueAtTime(freq * 2, time);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 1.1;
    flt.frequency.setValueAtTime(freq * 4.2, time);
    flt.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 1.25), time + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    body.connect(flt);
    harm.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    body.start(time);
    harm.start(time);
    body.stop(time + dur + 0.03);
    harm.stop(time + dur + 0.03);
  }

  // 2. Warm Bowed String Section Pad / Spiccato
  function playStrings(time, midis, dur, vel = 0.12, staccato = false) {
    const ctx = AudioEngine.ctx;
    midis.forEach((m, idx) => {
      const freq = midiToFreq(m);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(idx % 2 === 0 ? 5 : -5, time);

      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(staccato ? 1350 : 950, time);

      const g = ctx.createGain();
      const atk = staccato ? 0.018 : 0.16;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vel, time + atk);
      g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

      osc.connect(flt);
      flt.connect(g);
      g.connect(AudioEngine.musicGain);
      g.connect(AudioEngine.reverbNode);

      osc.start(time);
      osc.stop(time + dur + 0.03);
    });
  }

  // 3. Lyrical Concert Flute / Oboe (Map & Menu Lead)
  function playFlute(time, midi, dur, vel = 0.19) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 5.4;
    vibGain.gain.setValueAtTime(0, time);
    vibGain.gain.linearRampToValueAtTime(freq * 0.011, time + Math.min(0.25, dur * 0.5));
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2100;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.045);
    g.gain.setValueAtTime(vel * 0.85, time + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    osc.start(time);
    vib.start(time);
    osc.stop(time + dur + 0.03);
    vib.stop(time + dur + 0.03);
  }

  // 4. Heroic French Horn / Brass Fanfare
  function playBrass(time, midi, dur, vel = 0.2) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 1.8;
    flt.frequency.setValueAtTime(380, time);
    flt.frequency.exponentialRampToValueAtTime(2100, time + 0.07);
    flt.frequency.exponentialRampToValueAtTime(1150, time + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.035);
    g.gain.setValueAtTime(vel * 0.82, time + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  // 5. Orchestral Timpani & Martial Snare
  function playTimpani(time, midi, vel = 0.34) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.38, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.07);

    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.42);

    osc.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);
    osc.start(time);
    osc.stop(time + 0.45);
  }

  function playMartialDrum(time, vel = 0.1) {
    const ctx = AudioEngine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = AudioEngine.noiseBuffer;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 950;
    flt.Q.value = 1.4;

    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    src.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    src.start(time, Math.random() * 0.5, 0.1);
  }

  // 6. Fortress Orchestral Voices: Low Contrabass, Woody Bassoon, Pizzicato Strings & Marsh Oboe/Clarinet
  function playContrabass(time, midi, dur, vel = 0.2) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 0.5, time);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 1.4;
    flt.frequency.setValueAtTime(420, time);
    flt.frequency.exponentialRampToValueAtTime(190, time + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.016);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  function playBassoon(time, midi, dur, vel = 0.15) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Double-reed woody nasal formant around 540Hz
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(540, time);
    formant.Q.value = 2.6;

    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.setValueAtTime(980, time);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.018);
    g.gain.setValueAtTime(vel * 0.78, time + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc.connect(formant);
    formant.connect(body);
    body.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(AudioEngine.reverbNode);

    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  function playPizzicato(time, midis, vel = 0.14) {
    const ctx = AudioEngine.ctx;
    midis.forEach((m, i) => {
      const t = time + i * 0.006;
      const freq = midiToFreq(m);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 1.008, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);

      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(freq * 3.8, t);
      flt.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.11);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.13);

      osc.connect(flt);
      flt.connect(g);
      g.connect(AudioEngine.musicGain);
      g.connect(AudioEngine.reverbNode);

      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  function playReedLead(time, midi, dur, timbre = 'oboe', vel = 0.17) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc = ctx.createOscillator();
    osc.type = timbre === 'clarinet' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = timbre === 'clarinet' ? 4.8 : 5.6;
    vibGain.gain.setValueAtTime(0, time);
    vibGain.gain.linearRampToValueAtTime(freq * 0.012, time + Math.min(0.22, dur * 0.45));
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    const formant = ctx.createBiquadFilter();
    if (timbre === 'clarinet') {
      formant.type = 'lowpass';
      formant.frequency.setValueAtTime(1250, time);
      formant.Q.value = 1.6;
    } else {
      // Ominous nasal oboe formant
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(1320, time);
      formant.Q.value = 2.1;
    }

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.0001, time);
    dryGain.gain.linearRampToValueAtTime(vel, time + 0.032);
    dryGain.gain.setValueAtTime(vel * 0.84, time + dur * 0.72);
    dryGain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    // Extra damp marsh reverb send for eerie reed resonance
    const marshSend = ctx.createGain();
    marshSend.gain.value = 1.45;

    osc.connect(formant);
    formant.connect(dryGain);
    dryGain.connect(AudioEngine.musicGain);
    dryGain.connect(marshSend);
    marshSend.connect(AudioEngine.reverbNode);

    osc.start(time);
    vib.start(time);
    osc.stop(time + dur + 0.04);
    vib.stop(time + dur + 0.04);
  }

  // 7. Necropolis Gothic Voices: Sorrowful Solo Cello (F# Minor Nocturne)
  function playSoloCello(time, midi, dur, vel = 0.19) {
    const ctx = AudioEngine.ctx;
    const freq = midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.002, time);

    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 5.1;
    vibGain.gain.setValueAtTime(0, time);
    vibGain.gain.linearRampToValueAtTime(freq * 0.013, time + Math.min(0.28, dur * 0.45));
    vib.connect(vibGain);
    vibGain.connect(osc1.frequency);
    vibGain.connect(osc2.frequency);

    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.Q.value = 1.7;
    body.frequency.setValueAtTime(Math.min(1450, freq * 4.4), time);
    body.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 2.4), time + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.065);
    g.gain.setValueAtTime(vel * 0.84, time + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    const hallSend = ctx.createGain();
    hallSend.gain.value = 1.35;

    osc1.connect(body);
    osc2.connect(body);
    body.connect(g);
    g.connect(AudioEngine.musicGain);
    g.connect(hallSend);
    hallSend.connect(AudioEngine.reverbNode);

    osc1.start(time);
    osc2.start(time);
    vib.start(time);
    osc1.stop(time + dur + 0.04);
    osc2.stop(time + dur + 0.04);
    vib.stop(time + dur + 0.04);
  }

  // ================= MUSICAL SCORES =================

  // A) OVERWORLD CAMPAIGN MAP SCORE — HoMM3 Grand Chronicle in D Dorian / Aeolian (96 steps = 8 bars of 12/8-feel pastoral-heroic arpeggios)
  const MAP_CHORDS = [
    [50, 57, 62, 65], // Dm (D A D F)
    [48, 55, 60, 64], // C  (C G C E)
    [47, 55, 59, 62], // G/B (Dorian natural B!)
    [45, 52, 57, 60], // Am (A E A C)
    [50, 57, 62, 65], // Dm
    [41, 48, 53, 57], // F  (F C F A)
    [46, 53, 58, 62], // Bb (Aeolian bVI)
    [45, 52, 57, 61]  // A  (Dominant cadence back to Dm)
  ];
  const MAP_LUTE_ARP = [0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2, 3];
  const MAP_MELODY_FLUTE = {
    0: [74, 0.72], 6: [76, 0.36], 9: [77, 0.55],
    12: [76, 0.72], 18: [74, 0.36], 21: [72, 0.55],
    24: [71, 0.78], 30: [74, 0.38], 33: [76, 0.52],
    36: [72, 0.95], 44: [69, 0.55]
  };
  const MAP_MELODY_HORN = {
    48: [62, 0.85], 54: [65, 0.42], 57: [69, 0.58],
    60: [69, 0.82], 66: [67, 0.42], 69: [65, 0.55],
    72: [65, 0.75], 78: [62, 0.45], 81: [58, 0.55],
    84: [61, 1.05], 92: [64, 0.55]
  };

  // B) MENU / PAUSE SCORE — HoMM3 Rampart Pastoral Baroque (64 sixteenth-steps = 4 bars in D Harmonic Minor)
  const MENU_CHORDS = [
    [50, 57, 62, 65], // Dm
    [46, 53, 58, 62], // Bb
    [43, 50, 55, 58], // Gm
    [45, 52, 57, 61]  // A
  ];
  const MENU_ARP_PATTERN = [0, 1, 2, 3, 2, 1, 2, 3, 0, 2, 1, 3, 2, 3, 1, 2];
  const MENU_MELODY = {
    0: [74, 0.65], 6: [76, 0.3], 8: [77, 0.7], 14: [76, 0.3],
    16: [74, 0.65], 22: [72, 0.3], 24: [70, 0.85],
    32: [67, 0.65], 38: [69, 0.3], 40: [70, 0.65], 44: [74, 0.45],
    48: [73, 0.95], 56: [69, 0.75]
  };

  // C) GAMEPLAY SCORE (M1) — HoMM3 Battlefield Combat Ostinato & Fanfare (64 eighth-substeps = 8 bars in C Minor)
  const COMBAT_CHORDS = [
    [48, 55, 60, 63], // Cm
    [48, 55, 60, 63], // Cm
    [44, 51, 56, 60], // Ab
    [41, 48, 53, 56], // Fm
    [43, 50, 55, 59], // G
    [48, 55, 60, 63], // Cm
    [46, 53, 58, 62], // Bb
    [43, 50, 55, 59]  // G7
  ];
  const COMBAT_BRASS = {
    0: [60, 0.42], 3: [63, 0.22], 4: [67, 0.65],
    8: [68, 0.38], 10: [67, 0.22], 12: [63, 0.55],
    16: [68, 0.55], 20: [67, 0.35], 22: [65, 0.25],
    24: [65, 0.45], 28: [62, 0.45],
    32: [67, 0.85],
    40: [60, 0.38], 42: [62, 0.22], 44: [63, 0.55],
    48: [65, 0.45], 52: [62, 0.45],
    56: [59, 0.75], 60: [62, 0.4]
  };

  // D) MISSION 2 SCORE ('m2_fortress') — Tatalian Reed-Fens in G Minor / Phrygian-Harmonic
  // Driving 6/8 tempo at 128 BPM dotted-quarter pulse -> 3 eighth-steps per dotted-quarter = 0.15625s/step (96 steps = 16 bars of 6/8)
  const FORTRESS_CHORDS = [
    [43, 50, 55, 58], // Gm
    [43, 50, 55, 58], // Gm
    [39, 46, 51, 55], // Eb
    [36, 43, 48, 51], // Cm
    [38, 45, 50, 54], // D7 (F#)
    [43, 50, 55, 58], // Gm
    [44, 51, 56, 60], // Ab (Phrygian bII marsh tension!)
    [38, 45, 50, 54], // D7
    [43, 50, 55, 58], // Gm
    [41, 48, 53, 57], // F
    [39, 46, 51, 55], // Eb
    [38, 45, 50, 54], // D7
    [36, 43, 48, 51], // Cm
    [37, 43, 49, 52], // C#dim7 (Necrotic Soul-Barge shadow)
    [38, 45, 50, 54], // D7sus/D7
    [38, 45, 50, 54]  // D7 turnaround
  ];
  const FORTRESS_BASSOON_OSTINATO = [0, 2, 1, 0, 3, 2];
  // Ominous Oboe reed lead (bars 1-8, steps 0..47)
  const FORTRESS_OBOE = {
    0: [67, 0.44], 3: [70, 0.30], 5: [69, 0.16],
    6: [67, 0.62], 10: [62, 0.30],
    12: [63, 0.45], 15: [67, 0.30], 17: [65, 0.16],
    18: [60, 0.72],
    24: [66, 0.45], 27: [69, 0.28], 29: [70, 0.16],
    30: [74, 0.58], 34: [70, 0.28],
    36: [68, 0.60], 40: [67, 0.30],
    42: [66, 0.78]
  };
  // Shadowy Clarinet reed answer (bars 9-16, steps 48..95)
  const FORTRESS_CLARINET = {
    48: [62, 0.44], 51: [67, 0.30], 53: [70, 0.16],
    54: [69, 0.45], 57: [65, 0.42],
    60: [67, 0.45], 63: [63, 0.30], 65: [62, 0.16],
    66: [66, 0.72],
    72: [60, 0.44], 75: [63, 0.30], 77: [67, 0.16],
    78: [64, 0.46], 81: [69, 0.42],
    84: [66, 0.60], 88: [69, 0.28],
    90: [74, 0.78]
  };

  // E) MISSION 3 STEALTH SCORE ('m3_necropolis_stealth') — Haunting F#-Minor Baroque Nocturne
  // 96 compound eighth-steps (8 bars of 12/8, 0.175s/step): solo harpsichord arpeggios, muted pizzicato bass, sorrowful solo cello
  const NECRO_STEALTH_CHORDS = [
    [42, 49, 54, 57], // F#m  (F#2 C#3 F#3 A3)
    [50, 57, 62, 66], // Dmaj7/D (D3 A3 D4 F#4)
    [47, 54, 59, 62], // Bm   (B2 F#3 B3 D4)
    [49, 56, 61, 65], // C#7  (C#3 G#3 C#4 E#4)
    [42, 49, 54, 57], // F#m
    [44, 50, 56, 59], // G#dim7 (Gothic diminished shadow)
    [50, 54, 57, 62], // D
    [49, 56, 61, 65]  // C#7 dominant turnaround
  ];
  const NECRO_HARP_ARP = [0, 1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 2];
  const NECRO_CELLO_LEAD = {
    0: [54, 0.95], 6: [57, 0.50], 9: [61, 0.52],
    12: [62, 0.95], 18: [61, 0.50], 21: [57, 0.52],
    24: [59, 0.95], 30: [57, 0.48], 33: [54, 0.52],
    36: [56, 1.35],
    48: [66, 0.92], 54: [65, 0.48], 57: [66, 0.52],
    60: [68, 0.92], 66: [66, 0.48], 69: [62, 0.52],
    72: [61, 0.88], 78: [57, 0.48], 81: [59, 0.50],
    84: [56, 1.15], 91: [53, 0.65]
  };

  // F) MISSION 3 BOSS DUEL SCORE ('m3_duel') — Urgent F#-Minor Cathedral Duel (Commander Garret)
  // 64 driving eighth-substeps (8 bars, 0.132s/step): urgent harpsichord ostinato, dramatic minor strings, timpani & brass
  const NECRO_DUEL_CHORDS = [
    [42, 49, 54, 57], // F#m
    [42, 49, 54, 57], // F#m
    [50, 57, 62, 66], // D
    [47, 54, 59, 62], // Bm
    [49, 56, 61, 65], // C#7
    [42, 49, 54, 57], // F#m
    [44, 50, 56, 62], // G#dim7
    [49, 56, 61, 65]  // C#7
  ];
  const NECRO_DUEL_ARP = [0, 2, 1, 3, 2, 3, 1, 2];
  const NECRO_DUEL_STRINGS = {
    0: [66, 0.38], 3: [69, 0.24], 4: [73, 0.52],
    8: [74, 0.36], 11: [73, 0.24], 12: [69, 0.48],
    16: [74, 0.52], 20: [73, 0.32], 22: [71, 0.24],
    24: [71, 0.48], 28: [68, 0.44],
    32: [68, 0.50], 36: [73, 0.48],
    40: [66, 0.38], 43: [69, 0.24], 44: [73, 0.50],
    48: [74, 0.48], 52: [71, 0.45],
    56: [68, 0.68], 61: [65, 0.36]
  };

  const OSSUARY_CHORDS = [
    [37, 44, 49, 52], [33, 40, 45, 49], [42, 49, 54, 57], [32, 39, 44, 48],
    [37, 44, 49, 52], [40, 47, 52, 56], [39, 45, 51, 54], [32, 39, 48, 54]
  ];
  const OSSUARY_ARP = [0, 1, 2, 3, 1, 2, 3, 2];
  const TOWER_CHORDS = [
    [43, 50, 55, 58], [39, 46, 51, 55], [46, 53, 58, 62], [41, 48, 53, 57],
    [43, 50, 55, 58], [48, 55, 60, 63], [45, 51, 57, 60], [38, 45, 50, 54]
  ];
  const TOWER_HORNS = [
    [67, 70, 74, 74], [75, 74, 70, 67], [70, 74, 77, 77], [77, 76, 72, 69],
    [67, 70, 74, 79], [79, 75, 72, 70], [69, 72, 75, 74], [74, 72, 69, 66]
  ];
  const FINALE_CHORDS = [
    [38, 45, 50, 53], [34, 41, 46, 50], [41, 48, 53, 57], [36, 43, 48, 52],
    [38, 45, 50, 53], [43, 50, 55, 58], [34, 41, 46, 50], [33, 40, 45, 49]
  ];
  const FINALE_LEADS = [
    [62, 65, 69, 74], [74, 72, 69, 70], [69, 72, 77, 81], [79, 76, 72, 67],
    [74, 77, 81, 84], [82, 79, 74, 70], [77, 74, 70, 65], [69, 73, 76, 81]
  ];
  const EPILOGUE_CHORDS = [[38, 45, 50, 54], [43, 50, 55, 59], [47, 54, 59, 62], [45, 52, 57, 61]];

  function playPipeOrgan(time, note, duration) {
    const ctx = AudioEngine.ctx;
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(0.001, time);
    voice.gain.linearRampToValueAtTime(0.14, time + 0.12);
    voice.gain.setValueAtTime(0.12, time + duration - 0.19);
    voice.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.2);
    voice.connect(AudioEngine.musicGain);
    voice.connect(AudioEngine.reverbNode);
    for (const [partial, volume] of [[1, 0.67], [2, 0.19], [3, 0.09], [4, 0.05]]) {
      const pipe = ctx.createOscillator();
      const level = ctx.createGain();
      pipe.frequency.value = midiToFreq(note) * partial;
      level.gain.value = volume;
      pipe.connect(level);
      level.connect(voice);
      pipe.start(time);
      pipe.stop(time + duration + 0.22);
    }
  }

  function scheduleStep(step, t) {
    if (AudioEngine.mode === 'map') {
      const stepDur = 0.19; // Noble 12/8 HoMM3 Adventure Map flow
      const s96 = step % 96;
      const bar = Math.floor(s96 / 12) % 8;
      const inBar = s96 % 12;
      const chord = MAP_CHORDS[bar];

      // Lush bowed string harmony pad at start of each bar
      if (inBar === 0) {
        playStrings(t, [chord[0], chord[1], chord[3]], stepDur * 11.6, 0.085, false);
      }

      // Rolling Lute / Harp arpeggio across all 12 compound beats
      const luteNote = chord[MAP_LUTE_ARP[inBar]] + (inBar >= 6 ? 12 : 0);
      playLute(t, luteNote, stepDur * 2.6, inBar % 3 === 0 ? 0.19 : 0.12);

      // Delicate Harpsichord sparkle on dotted accents
      if (inBar === 0 || inBar === 6) {
        playHarpsichord(t, chord[3] + 12, stepDur * 2.4, 0.11);
      } else if (inBar === 9) {
        playHarpsichord(t, chord[2] + 12, stepDur * 1.8, 0.08);
      }

      // Flute lead (bars 1-4) answered by noble French Horn (bars 5-8)
      if (MAP_MELODY_FLUTE[s96]) {
        const [mNote, mDur] = MAP_MELODY_FLUTE[s96];
        playFlute(t, mNote, mDur, 0.18);
      }
      if (MAP_MELODY_HORN[s96]) {
        const [hNote, hDur] = MAP_MELODY_HORN[s96];
        playBrass(t, hNote, hDur, 0.14);
      }

      return stepDur;
    }

    if (AudioEngine.mode === 'menu') {
      const stepDur = 0.175;
      const bar = Math.floor(step / 16) % 4;
      const inBar = step % 16;
      const chord = MENU_CHORDS[bar];

      if (inBar === 0) {
        playStrings(t, [chord[0], chord[2], chord[3]], stepDur * 15.5, 0.085, false);
      }
      const arpNote = chord[MENU_ARP_PATTERN[inBar]] + 12;
      playHarpsichord(t, arpNote, stepDur * 2.2, inBar % 4 === 0 ? 0.17 : 0.11);

      if (MENU_MELODY[step % 64]) {
        const [mNote, mDur] = MENU_MELODY[step % 64];
        playFlute(t, mNote, mDur, 0.18);
      }
      return stepDur;
    }

    if (AudioEngine.mode === 'playing') {
      const stepDur = 0.145;
      const s64 = step % 64;
      const bar = Math.floor(s64 / 8) % 8;
      const inBar = s64 % 8;
      const chord = COMBAT_CHORDS[bar];

      if (inBar % 2 === 0) {
        const bassNote = inBar === 4 ? chord[1] - 12 : chord[0] - 12;
        playStrings(t, [bassNote, bassNote + 12], stepDur * 1.5, 0.13, true);
      } else if (inBar === 3 || inBar === 7) {
        playHarpsichord(t, chord[2] + 12, stepDur * 1.4, 0.1);
      }

      if (inBar === 0) {
        playTimpani(t, chord[0] - 12, 0.3);
      } else if (inBar === 3 || inBar === 6) {
        playTimpani(t, chord[0] - 5, 0.18);
      }
      if (inBar === 2 || inBar === 6 || inBar === 7) {
        playMartialDrum(t, inBar === 7 ? 0.06 : 0.09);
      }

      if (inBar === 0) {
        playStrings(t, [chord[1], chord[2], chord[3]], stepDur * 7.8, 0.065, false);
      }

      if (COMBAT_BRASS[s64]) {
        const [bNote, bDur] = COMBAT_BRASS[s64];
        playBrass(t, bNote, bDur, 0.18);
      }
      return stepDur;
    }

    if (AudioEngine.mode === 'm2_fortress') {
      // 128 BPM dotted-quarter pulse in 6/8 -> 3 eighth-note pulses per dotted-quarter = 0.15625s/step
      const stepDur = 0.15625;
      const s96 = step % 96;
      const bar = Math.floor(s96 / 6) % 16;
      const inBar = s96 % 6;
      const chord = FORTRESS_CHORDS[bar];

      // 1. Driving 6/8 Low Contrabass Ostinato (accented on dotted-quarter beats 0 & 3)
      if (inBar === 0) {
        playContrabass(t, chord[0] - 12, stepDur * 2.4, 0.22);
        playTimpani(t, chord[0] - 12, 0.24);
      } else if (inBar === 3) {
        playContrabass(t, chord[1] - 12, stepDur * 2.1, 0.17);
        if (bar % 2 === 1) playTimpani(t, chord[0] - 5, 0.15);
      }

      // 2. Woody Bassoon Rolling 6/8 Marsh Ostinato
      const bsnNote = chord[FORTRESS_BASSOON_OSTINATO[inBar]];
      playBassoon(t, bsnNote, stepDur * 1.35, inBar % 3 === 0 ? 0.15 : 0.10);

      // 3. Taut Pizzicato Strings on 6/8 off-beats (1, 2, 4, 5) + dark sustained pad on bar start
      if (inBar === 0 && bar % 2 === 0) {
        playStrings(t, [chord[1], chord[2], chord[3]], stepDur * 11.4, 0.055, false);
      }
      if (inBar === 1 || inBar === 4) {
        playPizzicato(t, [chord[2] + 12], 0.12);
      } else if (inBar === 2 || inBar === 5) {
        playPizzicato(t, [chord[3] + 12, chord[1] + 12], 0.10);
      }

      // Subtle damp marsh frame-drum shuffle on compound beats
      if (inBar === 3 || (inBar === 5 && bar % 2 === 1)) {
        playMartialDrum(t, inBar === 3 ? 0.07 : 0.045);
      }

      // 4. Ominous Oboe & Clarinet Reed Melodies with Damp Marsh Reverb
      if (FORTRESS_OBOE[s96]) {
        const [oNote, oDur] = FORTRESS_OBOE[s96];
        playReedLead(t, oNote, oDur, 'oboe', 0.17);
      }
      if (FORTRESS_CLARINET[s96]) {
        const [cNote, cDur] = FORTRESS_CLARINET[s96];
        playReedLead(t, cNote, cDur, 'clarinet', 0.16);
      }
      // Low French horn brass swell on dramatic cadences (bars 7-8 & 15-16)
      if ((bar === 7 || bar === 15) && inBar === 0) {
        playBrass(t, chord[3], stepDur * 5.2, 0.13);
      }

      return stepDur;
    }

    if (AudioEngine.mode === 'm3_necropolis_stealth') {
      // Haunting F#-Minor Baroque Nocturne (12/8 flow: solo harpsichord, muted pizzicato bass, sorrowful solo cello)
      const stepDur = 0.175;
      const s96 = step % 96;
      const bar = Math.floor(s96 / 12) % 8;
      const inBar = s96 % 12;
      const chord = NECRO_STEALTH_CHORDS[bar];

      // 1. Muted Pizzicato Contrabass & Cello Bass on compound pulses (0, 6, 9)
      if (inBar === 0) {
        playPizzicato(t, [chord[0], chord[0] + 12], 0.16);
        playContrabass(t, chord[0] - 12, stepDur * 3.2, 0.12);
      } else if (inBar === 6) {
        playPizzicato(t, [chord[1]], 0.12);
      } else if (inBar === 9 && bar % 2 === 1) {
        playPizzicato(t, [chord[2]], 0.10);
      }

      // 2. Whispered gothic string veil on bar downbeat
      if (inBar === 0) {
        playStrings(t, [chord[1], chord[2], chord[3]], stepDur * 11.4, 0.048, false);
      }

      // 3. Crystalline Baroque Harpsichord Nocturne Arpeggios
      const harpNote = chord[NECRO_HARP_ARP[inBar]] + 12 + (inBar >= 6 ? 12 : 0);
      playHarpsichord(t, harpNote, stepDur * 2.3, inBar % 3 === 0 ? 0.15 : 0.095);

      // 4. Sorrowful Solo Cello Cantabile Lead
      if (NECRO_CELLO_LEAD[s96]) {
        const [cNote, cDur] = NECRO_CELLO_LEAD[s96];
        playSoloCello(t, cNote, cDur, 0.19);
      }

      return stepDur;
    }

    if (AudioEngine.mode === 'm3_duel') {
      // Urgent F#-Minor Cathedral Duel (Commander Garret & Velvet Throne)
      const stepDur = 0.132;
      const s64 = step % 64;
      const bar = Math.floor(s64 / 8) % 8;
      const inBar = s64 % 8;
      const chord = NECRO_DUEL_CHORDS[bar];

      // 1. Driving Urgent Harpsichord Ostinato across every eighth-note
      const arpNote = chord[NECRO_DUEL_ARP[inBar]] + 12 + (inBar % 4 === 3 ? 12 : 0);
      playHarpsichord(t, arpNote, stepDur * 1.85, inBar % 2 === 0 ? 0.17 : 0.12);

      // 2. Dramatic Staccato Minor Bass Strings + Timpani Hits
      if (inBar % 2 === 0) {
        const bassNote = inBar === 4 ? chord[1] - 12 : chord[0] - 12;
        playStrings(t, [bassNote, bassNote + 12], stepDur * 1.45, 0.14, true);
      }
      if (inBar === 0) {
        playTimpani(t, chord[0] - 12, 0.32);
        playStrings(t, [chord[1], chord[2], chord[3]], stepDur * 7.6, 0.068, false);
      } else if (inBar === 3 || inBar === 6) {
        playTimpani(t, chord[1] - 12, 0.20);
      }
      if (inBar === 2 || inBar === 6) {
        playMartialDrum(t, 0.075);
      }

      // 3. Urgent Minor String & Cello Duel Melody + Brass Cadence Stabs
      if (NECRO_DUEL_STRINGS[s64]) {
        const [mNote, mDur] = NECRO_DUEL_STRINGS[s64];
        playSoloCello(t, mNote, mDur, 0.18);
        playStrings(t, [mNote + 12], mDur * 0.9, 0.085, true);
      }
      if ((bar === 4 || bar === 7) && inBar === 0) {
        playBrass(t, chord[3], stepDur * 4.5, 0.16);
      }

      return stepDur;
    }

    if (AudioEngine.mode === 'm4_ossuary') {
      const stepDur = 0.154;
      const inBar = step % 8;
      const bar = Math.floor(step / 8) % OSSUARY_CHORDS.length;
      const chord = OSSUARY_CHORDS[bar];
      if (inBar === 0) {
        playPipeOrgan(t, chord[0], stepDur * 8);
        playPipeOrgan(t, chord[1] - 12, stepDur * 8);
        playStrings(t, chord.slice(1), stepDur * 7.6, 0.079, false);
        playTimpani(t, chord[0] - 5, 0.28);
      }
      const ascent = chord[OSSUARY_ARP[inBar]] + (inBar < 4 ? 12 : 24);
      playHarpsichord(t, ascent, stepDur * 1.25, inBar % 2 ? 0.10 : 0.15);
      if (inBar === 2 || inBar === 5) playMartialDrum(t, inBar === 5 ? 0.05 : 0.075);
      if (inBar === 3 || inBar === 7) playStrings(t, [ascent, ascent + 12], stepDur * 1.7, 0.091, true);
      if (inBar === 4) playSoloCello(t, chord[2] + (bar % 2 ? 0 : 12), stepDur * 3.75, 0.15);
      return stepDur;
    }

    if (AudioEngine.mode === 'm5_tower') {
      const stepDur = 0.215;
      const beat = step % 8;
      const bar = Math.floor(step / 8) % TOWER_CHORDS.length;
      const chord = TOWER_CHORDS[bar];
      const strong = beat === 0 || beat === 4;
      if (strong) {
        playContrabass(t, chord[beat === 0 ? 0 : 1] - 12, 0.46, 0.16);
        playTimpani(t, chord[0] - (beat === 0 ? 12 : 5), beat === 0 ? 0.29 : 0.18);
      }
      if (beat === 0) playStrings(t, chord.slice(1), 1.6, 0.083);
      if (beat % 2 === 0) playBrass(t, TOWER_HORNS[bar][beat / 2], strong ? 0.39 : 0.25, strong ? 0.17 : 0.124);
      else playLute(t, chord[1 + (beat >> 1) % 3] + 24, 0.51, 0.12);
      if (beat === 3 || beat === 7) playMartialDrum(t, 0.11);
      return stepDur;
    }

    if (AudioEngine.mode === 'm6_finale') {
      const stepDur = 60 / 138 / 2;
      const beat = step % 8;
      const bar = Math.floor(step / 8) % FINALE_CHORDS.length;
      const chord = FINALE_CHORDS[bar];
      if (beat === 0) {
        playStrings(t, chord, 1.63, 0.086);
        playPipeOrgan(t, chord[0] - 12, 1.5);
      }
      if (beat === 0 || beat === 4 || beat === 7) {
        playTimpani(t, chord[beat === 4 ? 1 : 0] - 4, beat === 0 ? 0.33 : 0.21);
      }
      if (beat % 2 === 0) {
        const note = FINALE_LEADS[bar][beat / 2];
        playStrings(t, [note, note + 12], 0.45, 0.098, true);
        if (beat === 0 || beat === 4) playBrass(t, note - 12, 0.65, 0.18);
      }
      playHarpsichord(t, chord[(beat + 1) % 4] + (beat > 2 ? 24 : 12), 0.31, 0.12);
      return stepDur;
    }

    if (AudioEngine.mode === 'm6_epilogue') {
      const stepDur = 0.33;
      const beat = step % 8;
      const chord = EPILOGUE_CHORDS[Math.floor(step / 8) % EPILOGUE_CHORDS.length];
      if (beat === 0) {
        playStrings(t, chord.slice(1), 2.35, 0.072);
        playSoloCello(t, chord[0] + 24, 1.47, 0.125);
      }
      if (beat < 6) playLute(t, chord[beat % 4] + 24, 0.87, 0.125);
      if (beat === 5) playFlute(t, chord[3] + 19, 0.84, 0.11);
      return stepDur;
    }

    return 0.2;
  }

  function startMusicScheduler() {
    if (AudioEngine.schedulerTimer) return;
    AudioEngine.schedulerTimer = setInterval(() => {
      const ctx = AudioEngine.ctx;
      if (!ctx || ctx.state !== 'running') return;
      while (AudioEngine.nextNoteTime < ctx.currentTime + 0.18) {
        const dur = scheduleStep(AudioEngine.stepIndex, AudioEngine.nextNoteTime);
        AudioEngine.nextNoteTime += dur;
        AudioEngine.stepIndex++;
      }
    }, 50);
  }

  // ================= CAMPAIGN MAP & UI SOUND EFFECTS =================

  AudioEngine.playMapHover = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;
    if (t - AudioEngine.lastHoverTime < 0.08) return;
    AudioEngine.lastHoverTime = t;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(midiToFreq(74), t);
    osc.frequency.exponentialRampToValueAtTime(midiToFreq(81), t + 0.045);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(AudioEngine.sfxGain);
    osc.start(t);
    osc.stop(t + 0.065);
  };

  AudioEngine.playMapSelect = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    // Gilded HoMM3 Scroll Chime + Subtle Parchment Unroll
    [62, 69, 74].forEach((m, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(m), t + i * 0.04);

      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 2600;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t + i * 0.04);
      g.gain.linearRampToValueAtTime(0.16 - i * 0.02, t + i * 0.04 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.28);

      osc.connect(flt);
      flt.connect(g);
      g.connect(AudioEngine.sfxGain);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.3);
    });

    if (AudioEngine.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200, t);
      bp.Q.value = 2.4;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.09, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      src.start(t, 0.2, 0.13);
    }
  };

  AudioEngine.playMapLocked = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    // Muted iron lock thud
    [135, 98].forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t + idx * 0.055);
      osc.frequency.exponentialRampToValueAtTime(52, t + idx * 0.055 + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.1);
      osc.connect(g);
      g.connect(AudioEngine.sfxGain);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.11);
    });
  };

  AudioEngine.playMapLaunch = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const t = AudioEngine.ctx.currentTime;
    const notes = [50, 57, 62, 69, 74];
    notes.forEach((n, i) => {
      playBrass(t + i * 0.075, n, 0.48, 0.22);
      playHarpsichord(t + i * 0.075, n + 12, 0.42, 0.18);
    });
    playTimpani(t, 38, 0.34);
  };

  AudioEngine.playUiClick = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(g);
    g.connect(AudioEngine.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  };

  // ================= FOLEY & COMBAT SOUND EFFECTS =================

  // (b1) Bowstring Twang + Arrow Fwhip
  AudioEngine.playArrow = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const str = ctx.createOscillator();
    str.type = 'triangle';
    str.frequency.setValueAtTime(240, t);
    str.frequency.exponentialRampToValueAtTime(115, t + 0.075);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.24, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    str.connect(sg);
    sg.connect(AudioEngine.sfxGain);
    str.start(t);
    str.stop(t + 0.09);

    const n = ctx.createBufferSource();
    n.buffer = AudioEngine.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.2;
    bp.frequency.setValueAtTime(1600, t);
    bp.frequency.exponentialRampToValueAtTime(3800, t + 0.06);
    bp.frequency.exponentialRampToValueAtTime(1200, t + 0.14);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.26, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(AudioEngine.sfxGain);
    n.start(t, Math.random() * 0.8, 0.16);
  };

  // (b2) Heavy Javelin / Spear Throw Whoosh + Steel Glint
  AudioEngine.playSpear = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const n = ctx.createBufferSource();
    n.buffer = AudioEngine.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.0;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(1150, t + 0.08);
    bp.frequency.exponentialRampToValueAtTime(320, t + 0.22);

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.34, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(AudioEngine.sfxGain);
    n.start(t, Math.random() * 0.8, 0.24);

    const ring = ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(2350, t);
    ring.frequency.exponentialRampToValueAtTime(1850, t + 0.09);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.07, t);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    ring.connect(rg);
    rg.connect(AudioEngine.sfxGain);
    ring.start(t);
    ring.stop(t + 0.1);
  };

  // Boulder Hurl / Smash
  AudioEngine.playBoulder = function (impact = false) {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(impact ? 130 : 175, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + (impact ? 0.18 : 0.14));
    const g = ctx.createGain();
    g.gain.setValueAtTime(impact ? 0.32 : 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(g);
    g.connect(AudioEngine.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  };

  // (b3) Continuous Roaring Dragon Fire Breath
  AudioEngine.setDragonFire = function (active) {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    if (active === AudioEngine.fireActive) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;
    AudioEngine.fireActive = active;

    if (active) {
      const roar = ctx.createOscillator();
      roar.type = 'sawtooth';
      roar.frequency.setValueAtTime(155, t);
      roar.frequency.exponentialRampToValueAtTime(86, t + 0.32);
      const rFlt = ctx.createBiquadFilter();
      rFlt.type = 'lowpass';
      rFlt.frequency.value = 520;
      const rGain = ctx.createGain();
      rGain.gain.setValueAtTime(0.28, t);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      roar.connect(rFlt);
      rFlt.connect(rGain);
      rGain.connect(AudioEngine.sfxGain);
      roar.start(t);
      roar.stop(t + 0.36);

      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      src.loop = true;

      const lowFlt = ctx.createBiquadFilter();
      lowFlt.type = 'bandpass';
      lowFlt.frequency.value = 420;
      lowFlt.Q.value = 0.75;

      const hissFlt = ctx.createBiquadFilter();
      hissFlt.type = 'highpass';
      hissFlt.frequency.value = 1400;

      const fGain = ctx.createGain();
      fGain.gain.setValueAtTime(0.01, t);
      fGain.gain.linearRampToValueAtTime(0.42, t + 0.08);

      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(0.01, t);
      hGain.gain.linearRampToValueAtTime(0.14, t + 0.08);

      src.connect(lowFlt);
      lowFlt.connect(fGain);
      fGain.connect(AudioEngine.sfxGain);

      src.connect(hissFlt);
      hissFlt.connect(hGain);
      hGain.connect(AudioEngine.sfxGain);

      src.start(t);
      AudioEngine.fireNodes = { src, fGain, hGain };
    } else if (AudioEngine.fireNodes) {
      const { src, fGain, hGain } = AudioEngine.fireNodes;
      fGain.gain.cancelScheduledValues(t);
      hGain.gain.cancelScheduledValues(t);
      fGain.gain.setValueAtTime(Math.max(0.001, fGain.gain.value), t);
      hGain.gain.setValueAtTime(Math.max(0.001, hGain.gain.value), t);
      fGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.stop(t + 0.2);
      AudioEngine.fireNodes = null;
    }
  };

  // (b4) Hydra Leap Water Splash & Ferocious Hydra Bite / Venom Spit
  AudioEngine.playHydraSplash = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = AudioEngine.noiseBuffer;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(650, t);
    flt.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
    flt.frequency.exponentialRampToValueAtTime(450, t + 0.34);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.sfxGain);
    src.start(t, Math.random() * 0.5, 0.36);
  };

  AudioEngine.playHydraBite = function (spitOnly = false) {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const snarl = ctx.createOscillator();
    snarl.type = 'sawtooth';
    snarl.frequency.setValueAtTime(spitOnly ? 320 : 210, t);
    snarl.frequency.exponentialRampToValueAtTime(95, t + 0.24);

    const sFlt = ctx.createBiquadFilter();
    sFlt.type = 'bandpass';
    sFlt.Q.value = 3.5;
    sFlt.frequency.setValueAtTime(980, t);
    sFlt.frequency.exponentialRampToValueAtTime(340, t + 0.24);

    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.32, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    snarl.connect(sFlt);
    sFlt.connect(sg);
    sg.connect(AudioEngine.sfxGain);
    snarl.start(t);
    snarl.stop(t + 0.26);

    if (!spitOnly) {
      const snap = ctx.createOscillator();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(160, t + 0.03);
      snap.frequency.exponentialRampToValueAtTime(42, t + 0.15);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.45, t + 0.03);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      snap.connect(cg);
      cg.connect(AudioEngine.sfxGain);
      snap.start(t + 0.03);
      snap.stop(t + 0.17);
    }
  };

  // (b5) Giant Wasp / Bee Buzz-Surge & Mandible Sting Bite
  AudioEngine.playBeeBite = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(185, t);
    carrier.frequency.linearRampToValueAtTime(265, t + 0.09);
    carrier.frequency.exponentialRampToValueAtTime(130, t + 0.24);

    mod.frequency.value = 58;
    modGain.gain.value = 95;
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.28, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    carrier.connect(bg);
    bg.connect(AudioEngine.sfxGain);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + 0.26);
    mod.stop(t + 0.26);

    const sting = ctx.createOscillator();
    sting.type = 'square';
    sting.frequency.setValueAtTime(1750, t + 0.04);
    sting.frequency.exponentialRampToValueAtTime(420, t + 0.13);
    const stg = ctx.createGain();
    stg.gain.setValueAtTime(0.22, t + 0.04);
    stg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    sting.connect(stg);
    stg.connect(AudioEngine.sfxGain);
    sting.start(t + 0.04);
    sting.stop(t + 0.15);
  };

  // Heroic Quest Stingers (Princess Rescue & Victory)
  AudioEngine.playFanfare = function (victory = false) {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const t = AudioEngine.ctx.currentTime;
    const notes = victory ? [60, 64, 67, 72, 76] : [62, 66, 69, 74];
    notes.forEach((n, i) => {
      playBrass(t + i * 0.11, n, victory ? 0.65 : 0.45, 0.24);
      playHarpsichord(t + i * 0.11, n + 12, 0.5, 0.2);
    });
  };

  // ================= MISSION 2: WYVERN & SOUL-BARGE SOUND EFFECTS =================

  // 1. Piercing Predatory Wyvern Screech
  AudioEngine.playWyvernScreech = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const fm = ctx.createOscillator();
    const fmGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(1280, t);
    osc1.frequency.linearRampToValueAtTime(1520, t + 0.06);
    osc1.frequency.exponentialRampToValueAtTime(490, t + 0.42);

    osc2.frequency.setValueAtTime(645, t);
    osc2.frequency.exponentialRampToValueAtTime(240, t + 0.42);

    fm.frequency.value = 42;
    fmGain.gain.value = 65;
    fm.connect(fmGain);
    fmGain.connect(osc1.frequency);

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = 2.4;
    flt.frequency.setValueAtTime(1650, t);
    flt.frequency.exponentialRampToValueAtTime(720, t + 0.42);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.44);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.sfxGain);
    g.connect(AudioEngine.reverbNode);

    osc1.start(t);
    osc2.start(t);
    fm.start(t);
    osc1.stop(t + 0.46);
    osc2.stop(t + 0.46);
    fm.stop(t + 0.46);
  };

  // 2. Tail-Claw Slash (Wing-Whip + Razor Talon Glint)
  AudioEngine.playClawSlash = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    if (AudioEngine.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = AudioEngine.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2.6;
      bp.frequency.setValueAtTime(680, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + 0.065);
      bp.frequency.exponentialRampToValueAtTime(850, t + 0.17);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.32, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      n.start(t, Math.random() * 0.7, 0.19);
    }

    const blade = ctx.createOscillator();
    blade.type = 'triangle';
    blade.frequency.setValueAtTime(1950, t);
    blade.frequency.exponentialRampToValueAtTime(620, t + 0.11);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.14, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    blade.connect(bg);
    bg.connect(AudioEngine.sfxGain);
    blade.start(t);
    blade.stop(t + 0.13);
  };

  // 3. Pressurized Acid-Venom Spit & Sizzle
  AudioEngine.playVenomSpit = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    if (AudioEngine.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.Q.value = 3.4;
      hp.frequency.setValueAtTime(2600, t);
      hp.frequency.exponentialRampToValueAtTime(1150, t + 0.19);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      src.start(t, Math.random() * 0.6, 0.22);
    }

    const glob = ctx.createOscillator();
    glob.type = 'sawtooth';
    glob.frequency.setValueAtTime(480, t);
    glob.frequency.exponentialRampToValueAtTime(150, t + 0.15);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1100;
    const gg = ctx.createGain();
    gg.gain.setValueAtTime(0.18, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    glob.connect(flt);
    flt.connect(gg);
    gg.connect(AudioEngine.sfxGain);
    glob.start(t);
    glob.stop(t + 0.17);
  };

  // 4. Continuous Low Water-Skim Spray Loop (Stopped cleanly on pause/exit/mute)
  AudioEngine.setWaterSkim = function (active) {
    if (!AudioEngine.ctx) return;
    const wantActive = Boolean(active && AudioEngine.unlocked && !AudioEngine.muted);
    if (wantActive === AudioEngine.skimActive) return;

    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;
    AudioEngine.skimActive = wantActive;

    if (wantActive && AudioEngine.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      src.loop = true;

      const rushFlt = ctx.createBiquadFilter();
      rushFlt.type = 'bandpass';
      rushFlt.frequency.value = 540;
      rushFlt.Q.value = 1.1;

      const sprayFlt = ctx.createBiquadFilter();
      sprayFlt.type = 'bandpass';
      sprayFlt.frequency.value = 2350;
      sprayFlt.Q.value = 1.8;

      const rGain = ctx.createGain();
      rGain.gain.setValueAtTime(0.001, t);
      rGain.gain.linearRampToValueAtTime(0.16, t + 0.09);

      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.001, t);
      sGain.gain.linearRampToValueAtTime(0.085, t + 0.09);

      src.connect(rushFlt);
      rushFlt.connect(rGain);
      rGain.connect(AudioEngine.sfxGain);

      src.connect(sprayFlt);
      sprayFlt.connect(sGain);
      sGain.connect(AudioEngine.sfxGain);

      src.start(t);
      AudioEngine.skimNodes = { src, rGain, sGain };
    } else if (AudioEngine.skimNodes) {
      const { src, rGain, sGain } = AudioEngine.skimNodes;
      try {
        rGain.gain.cancelScheduledValues(t);
        sGain.gain.cancelScheduledValues(t);
        rGain.gain.setValueAtTime(Math.max(0.001, rGain.gain.value), t);
        sGain.gain.setValueAtTime(Math.max(0.001, sGain.gain.value), t);
        rGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
        sGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
        src.stop(t + 0.16);
      } catch (_) {}
      AudioEngine.skimNodes = null;
    }
  };

  AudioEngine.playWaterSkim = function (active = true) {
    AudioEngine.setWaterSkim(active);
  };

  // 5. Swamp Gorgon Petrifying Gaze Beam
  AudioEngine.playGorgonBeam = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(190, t);
    osc1.frequency.exponentialRampToValueAtTime(420, t + 0.35);
    osc2.frequency.setValueAtTime(384, t);
    osc2.frequency.exponentialRampToValueAtTime(845, t + 0.35);

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.Q.value = 4.2;
    flt.frequency.setValueAtTime(420, t);
    flt.frequency.exponentialRampToValueAtTime(1680, t + 0.32);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc1.connect(flt);
    osc2.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);
  };

  // 6. Timber Skiff / Cypress Branch Splinter Crunch
  AudioEngine.playWoodSplinter = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const thud = ctx.createOscillator();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(165, t);
    thud.frequency.exponentialRampToValueAtTime(52, t + 0.16);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.3, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    thud.connect(tg);
    tg.connect(AudioEngine.sfxGain);
    thud.start(t);
    thud.stop(t + 0.18);

    if (AudioEngine.noiseBuffer) {
      [0, 0.035, 0.075].forEach((off, idx) => {
        const src = ctx.createBufferSource();
        src.buffer = AudioEngine.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 2.8;
        bp.frequency.setValueAtTime(1150 + idx * 420, t + off);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.24 - idx * 0.05, t + off);
        ng.gain.exponentialRampToValueAtTime(0.001, t + off + 0.075);
        src.connect(bp);
        bp.connect(ng);
        ng.connect(AudioEngine.sfxGain);
        src.start(t + off, Math.random() * 0.9, 0.085);
      });
    }
  };

  // 7. Soul-Lantern Iron Chain Snap + Freed Spirit Harmonic Chime
  AudioEngine.playChainBreak = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    // Metallic iron link snap
    [2180, 3120].forEach((hz, i) => {
      const cl = ctx.createOscillator();
      cl.type = 'square';
      cl.frequency.setValueAtTime(hz, t + i * 0.018);
      cl.frequency.exponentialRampToValueAtTime(hz * 0.62, t + i * 0.018 + 0.09);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.16, t + i * 0.018);
      cg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.018 + 0.1);
      cl.connect(cg);
      cg.connect(AudioEngine.sfxGain);
      cl.start(t + i * 0.018);
      cl.stop(t + i * 0.018 + 0.11);
    });

    // Ethereal spirit release triad
    [67, 74, 79].forEach((m, idx) => {
      const sp = ctx.createOscillator();
      sp.type = 'triangle';
      sp.frequency.setValueAtTime(midiToFreq(m), t + 0.04 + idx * 0.045);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.001, t + 0.04 + idx * 0.045);
      sg.gain.linearRampToValueAtTime(0.14, t + 0.055 + idx * 0.045);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.36 + idx * 0.045);
      sp.connect(sg);
      sg.connect(AudioEngine.sfxGain);
      sg.connect(AudioEngine.reverbNode);
      sp.start(t + 0.04 + idx * 0.045);
      sp.stop(t + 0.38 + idx * 0.045);
    });
  };

  // ================= MISSION 3: VAMPIRE LORD & OBSIDIAN KEEP SOUND EFFECTS =================

  // 1. Crimson Mist-Dash (Breathy nocturnal mist whoosh + subtle bat chirps)
  AudioEngine.playMistDash = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    if (AudioEngine.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.9;
      bp.frequency.setValueAtTime(520, t);
      bp.frequency.exponentialRampToValueAtTime(1950, t + 0.09);
      bp.frequency.exponentialRampToValueAtTime(420, t + 0.27);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.001, t);
      ng.gain.linearRampToValueAtTime(0.32, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      ng.connect(AudioEngine.reverbNode);
      src.start(t, Math.random() * 0.7, 0.3);
    }

    // Subtle vampire bat chirps
    [0.03, 0.1, 0.17].forEach((off, i) => {
      const bat = ctx.createOscillator();
      bat.type = 'sine';
      const baseHz = 3400 - i * 320;
      bat.frequency.setValueAtTime(baseHz, t + off);
      bat.frequency.exponentialRampToValueAtTime(baseHz * 0.54, t + off + 0.045);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.065, t + off);
      bg.gain.exponentialRampToValueAtTime(0.001, t + off + 0.05);
      bat.connect(bg);
      bg.connect(AudioEngine.sfxGain);
      bat.start(t + off);
      bat.stop(t + off + 0.055);
    });
  };

  // 2. Vampiric Bite (Sharp fang snap + dark sustain blood-drain resonance)
  AudioEngine.playVampireBite = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    // Sharp fang crunch
    const fang = ctx.createOscillator();
    fang.type = 'sawtooth';
    fang.frequency.setValueAtTime(920, t);
    fang.frequency.exponentialRampToValueAtTime(110, t + 0.09);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(0.32, t);
    fg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    fang.connect(fg);
    fg.connect(AudioEngine.sfxGain);
    fang.start(t);
    fang.stop(t + 0.11);

    // Dark velvet sustain drain chord (F#2 + C#3 + A3)
    [42, 49, 57].forEach((m, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(midiToFreq(m), t + 0.04);
      osc.frequency.linearRampToValueAtTime(midiToFreq(m) * 1.03, t + 0.36);

      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(680, t + 0.04);
      flt.frequency.exponentialRampToValueAtTime(1450, t + 0.24);

      const dg = ctx.createGain();
      dg.gain.setValueAtTime(0.001, t + 0.04);
      dg.gain.linearRampToValueAtTime(0.16 - idx * 0.03, t + 0.1);
      dg.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(flt);
      flt.connect(dg);
      dg.connect(AudioEngine.sfxGain);
      dg.connect(AudioEngine.reverbNode);
      osc.start(t + 0.04);
      osc.stop(t + 0.44);
    });
  };

  // 3. Crimson Rapier Slash (Aristocratic silver foil whip + singing steel edge)
  AudioEngine.playRapierSlash = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    if (AudioEngine.noiseBuffer) {
      const n = ctx.createBufferSource();
      n.buffer = AudioEngine.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 3.1;
      bp.frequency.setValueAtTime(1100, t);
      bp.frequency.exponentialRampToValueAtTime(3900, t + 0.055);
      bp.frequency.exponentialRampToValueAtTime(1250, t + 0.15);

      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      n.start(t, Math.random() * 0.7, 0.17);
    }

    const foil = ctx.createOscillator();
    foil.type = 'sine';
    foil.frequency.setValueAtTime(2550, t);
    foil.frequency.exponentialRampToValueAtTime(880, t + 0.11);
    const fg = ctx.createGain();
    fg.gain.setValueAtTime(0.13, t);
    fg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    foil.connect(fg);
    fg.connect(AudioEngine.sfxGain);
    foil.start(t);
    foil.stop(t + 0.13);
  };

  // 4. Counter-Parry Steel Clang (Resonant rapier riposte ring)
  AudioEngine.playParryClang = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    [1640, 2490, 3820].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.96, t + 0.28);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22 - i * 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28 - i * 0.04);
      osc.connect(g);
      g.connect(AudioEngine.sfxGain);
      g.connect(AudioEngine.reverbNode);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  };

  // 5. Death Knight Sentinel Alert Horn (Hollow gothic brass/bone warning)
  AudioEngine.playAlertHorn = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    [185, 138.6].forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz * 0.97, t + idx * 0.08);
      osc.frequency.linearRampToValueAtTime(hz, t + idx * 0.08 + 0.06);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.94, t + idx * 0.08 + 0.48);

      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.Q.value = 2.6;
      flt.frequency.setValueAtTime(520, t + idx * 0.08);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t + idx * 0.08);
      g.gain.linearRampToValueAtTime(0.24 - idx * 0.05, t + idx * 0.08 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.5);

      osc.connect(flt);
      flt.connect(g);
      g.connect(AudioEngine.sfxGain);
      g.connect(AudioEngine.reverbNode);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.52);
    });
  };

  // 6. Brass Reliquary / Rose-Window Glass Shatter Climax
  AudioEngine.playGlassShatter = function () {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    if (AudioEngine.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = AudioEngine.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2400, t);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.34, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      src.connect(hp);
      hp.connect(ng);
      ng.connect(AudioEngine.sfxGain);
      ng.connect(AudioEngine.reverbNode);
      src.start(t, 0.1, 0.36);
    }

    // Cascading crystalline glass shards + freed soul harmonic chime
    [3320, 4180, 2790, 4860, 2240].forEach((hz, i) => {
      const off = i * 0.032;
      const sh = ctx.createOscillator();
      sh.type = 'sine';
      sh.frequency.setValueAtTime(hz, t + off);
      sh.frequency.exponentialRampToValueAtTime(hz * 0.78, t + off + 0.14);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.15, t + off);
      sg.gain.exponentialRampToValueAtTime(0.001, t + off + 0.15);
      sh.connect(sg);
      sg.connect(AudioEngine.sfxGain);
      sh.start(t + off);
      sh.stop(t + off + 0.16);
    });

    [66, 73, 78, 85].forEach((m, idx) => {
      const ch = ctx.createOscillator();
      ch.type = 'triangle';
      ch.frequency.setValueAtTime(midiToFreq(m), t + 0.08 + idx * 0.055);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.001, t + 0.08 + idx * 0.055);
      cg.gain.linearRampToValueAtTime(0.15, t + 0.1 + idx * 0.055);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.55 + idx * 0.055);
      ch.connect(cg);
      cg.connect(AudioEngine.sfxGain);
      cg.connect(AudioEngine.reverbNode);
      ch.start(t + 0.08 + idx * 0.055);
      ch.stop(t + 0.58 + idx * 0.055);
    });
  };

  // ================= MISSION 4: THE SHATTERED OSSUARY =================
  function ossuaryNoise(duration, from, to, volume, resonance = 1) {
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = AudioEngine.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = resonance;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(AudioEngine.sfxGain);
    source.start(t, 0.12, duration + 0.01);
  }

  function ossuaryTone(time, duration, start, end, volume, type = 'triangle') {
    const ctx = AudioEngine.ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, time);
    oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(AudioEngine.sfxGain);
    gain.connect(AudioEngine.reverbNode);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  function ossuarySoundReady() {
    return AudioEngine.ctx && AudioEngine.unlocked && !AudioEngine.muted;
  }

  AudioEngine.playBoneWingbeat = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.23, 670, 185, 0.27);
    ossuaryTone(t + 0.03, 0.09, 470, 276, 0.085);
    ossuaryTone(t + 0.08, 0.08, 280, 150, 0.055);
  };

  AudioEngine.playBoneSurge = function () {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(0.34, 380, 1720, 0.29, 0.7);
    ossuaryTone(AudioEngine.ctx.currentTime, 0.34, 96, 240, 0.19, 'sine');
  };

  AudioEngine.playSoulRoar = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.42, 500, 155, 0.34, 2);
    ossuaryTone(t, 0.51, 149, 57, 0.23);
    ossuaryTone(t + 0.07, 0.37, 286, 94, 0.097, 'sine');
  };

  AudioEngine.setGhostFire = function (active) {
    const ctx = AudioEngine.ctx;
    const previous = AudioEngine.ghostFire;
    if (active && !ossuarySoundReady() || !ctx || active === Boolean(previous)) return;
    const t = ctx.currentTime;
    if (!active) {
      previous.gain.gain.cancelScheduledValues(t);
      previous.gain.gain.setTargetAtTime(0.001, t, 0.025);
      previous.source.stop(t + 0.14);
      previous.drone.stop(t + 0.14);
      AudioEngine.ghostFire = null;
      return;
    }

    const source = ctx.createBufferSource();
    const drone = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const droneLevel = ctx.createGain();
    const gain = ctx.createGain();
    source.buffer = AudioEngine.noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1680, t);
    filter.frequency.exponentialRampToValueAtTime(1040, t + 0.42);
    filter.Q.value = 0.65;
    drone.type = 'sine';
    drone.frequency.setValueAtTime(126, t);
    drone.frequency.exponentialRampToValueAtTime(94, t + 0.47);
    droneLevel.gain.value = 0.12;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.31, t + 0.085);
    source.connect(filter);
    filter.connect(gain);
    drone.connect(droneLevel);
    droneLevel.connect(gain);
    gain.connect(AudioEngine.sfxGain);
    source.start(t);
    drone.start(t);
    AudioEngine.ghostFire = { source, drone, gain };
  };

  AudioEngine.playSpiritFreed = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    for (const [i, note] of [61, 68, 76, 85].entries()) {
      const frequency = midiToFreq(note);
      ossuaryTone(t + i * 0.075, 0.49, frequency, frequency, 0.12, 'sine');
    }
  };

  AudioEngine.playStoneShatter = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.28, 1800, 420, 0.31, 1.7);
    ossuaryTone(t, 0.17, 114, 46, 0.19);
    ossuaryTone(t + 0.045, 0.12, 492, 328, 0.08);
  };

  AudioEngine.playCatapultLaunch = function () {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(0.29, 680, 162, 0.28);
    ossuaryTone(AudioEngine.ctx.currentTime, 0.24, 146, 55, 0.19);
  };

  AudioEngine.playMiasmaHiss = function (warning = false) {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(warning ? 0.3 : 0.38, warning ? 610 : 1620, warning ? 1720 : 390, warning ? 0.19 : 0.32);
  };

  // Mission 5 combat cues use the same noise source and gain staging as the Ossuary.
  AudioEngine.playTitanStep = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.13, 390, 105, 0.22);
    ossuaryTone(t, 0.17, 97, 38, 0.21, 'sine');
  };

  AudioEngine.playThunderbolt = function (charged = false) {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(charged ? 0.45 : 0.23, 2600, 325, charged ? 0.39 : 0.27);
    ossuaryTone(t, 0.19, charged ? 462 : 306, 101, 0.17, 'sawtooth');
    ossuaryTone(t + 0.045, charged ? 0.48 : 0.29, 92, 32, charged ? 0.28 : 0.20, 'sine');
  };

  AudioEngine.playShieldBlock = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryTone(t, 0.25, 620, 192, 0.18);
    ossuaryTone(t + 0.022, 0.27, 433, 217, 0.13, 'sine');
    ossuaryNoise(0.18, 1800, 680, 0.22, 2.1);
  };

  AudioEngine.playSeismicStomp = function (charged = false) {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryTone(t, charged ? 0.48 : 0.31, 104, 29, charged ? 0.39 : 0.30, 'sine');
    ossuaryNoise(0.34, 940, 140, 0.27, 1.3);
    if (charged) ossuaryNoise(0.16, 2400, 410, 0.18);
  };

  AudioEngine.playManticoreRoar = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.42, 720, 335, 0.28, 1.25);
    ossuaryTone(t, 0.34, 178, 62, 0.14, 'triangle');
    ossuaryTone(t + 0.064, 0.20, 247, 81, 0.067, 'sawtooth');
  };

  AudioEngine.playColossusAlarm = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryTone(t, 0.27, 144, 132, 0.19, 'sawtooth');
    ossuaryTone(t + 0.34, 0.36, 107, 94, 0.23, 'triangle');
  };

  AudioEngine.playSkyWarning = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.49, 860, 2190, 0.16, 2.3);
    ossuaryTone(t + 0.08, 0.25, 372, 694, 0.10, 'sine');
  };

  AudioEngine.playBannerHit = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryTone(t, 0.22, 291, 211, 0.16);
    ossuaryTone(t + 0.12, 0.20, 205, 149, 0.12);
    ossuaryNoise(0.19, 480, 220, 0.18);
  };

  AudioEngine.setStarFrost = function (active) {
    const ctx = AudioEngine.ctx;
    const previous = AudioEngine.starFrost;
    if (!ctx || active === Boolean(previous) || (active && !ossuarySoundReady())) return;
    const time = ctx.currentTime;
    if (!active) {
      previous.gain.gain.cancelScheduledValues(time);
      previous.gain.gain.setTargetAtTime(0.001, time, 0.035);
      previous.wind.stop(time + 0.19);
      previous.chime.stop(time + 0.19);
      AudioEngine.starFrost = null;
      return;
    }
    const wind = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const chime = ctx.createOscillator();
    const glint = ctx.createGain();
    wind.buffer = AudioEngine.noiseBuffer;
    wind.loop = true;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2490, time);
    filter.frequency.exponentialRampToValueAtTime(1370, time + 0.35);
    filter.Q.value = 0.92;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.21, time + 0.065);
    chime.type = 'sine';
    chime.frequency.setValueAtTime(631, time);
    chime.frequency.exponentialRampToValueAtTime(363, time + 0.3);
    glint.gain.value = 0.11;
    wind.connect(filter);
    filter.connect(gain);
    chime.connect(glint);
    glint.connect(gain);
    gain.connect(AudioEngine.sfxGain);
    wind.start(time);
    chime.start(time);
    AudioEngine.starFrost = { wind, chime, gain };
  };

  AudioEngine.playAzureWingbeat = function (hovering = false) {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(0.18, 860, 310, hovering ? 0.045 : 0.075, 1.1);
  };

  AudioEngine.playAzureRoar = function (nova = false) {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.53, 980, 281, nova ? 0.38 : 0.28, 1.5);
    ossuaryTone(t, 0.58, 121, 48, 0.27, 'triangle');
    for (const [i, frequency] of (nova ? [330, 494, 659, 988] : [270, 392, 587]).entries()) {
      ossuaryTone(t + i * 0.043, 0.49, frequency, frequency * 0.89, 0.11, 'sine');
    }
  };

  AudioEngine.playSkyDash = function () {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(0.24, 510, 2330, 0.28);
    ossuaryTone(AudioEngine.ctx.currentTime, 0.23, 83, 172, 0.19, 'triangle');
  };

  AudioEngine.playDreadDragonRoar = function (hit = false) {
    if (!ossuarySoundReady()) return;
    ossuaryNoise(hit ? 0.24 : 0.47, hit ? 1400 : 450, 156, hit ? 0.23 : 0.30, 1.35);
    ossuaryTone(AudioEngine.ctx.currentTime, hit ? 0.21 : 0.42, hit ? 140 : 104, 43, 0.17, 'triangle');
  };

  AudioEngine.playRedLightning = function (warning = false) {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(warning ? 0.40 : 0.30, warning ? 810 : 2630, warning ? 2190 : 350, warning ? 0.16 : 0.32, 1.7);
    ossuaryTone(t, warning ? 0.35 : 0.24, warning ? 297 : 224, warning ? 544 : 83, 0.14, 'sawtooth');
  };

  AudioEngine.playCrownShatter = function () {
    if (!ossuarySoundReady()) return;
    const t = AudioEngine.ctx.currentTime;
    ossuaryNoise(0.41, 2800, 610, 0.27);
    for (const [i, note] of [62, 69, 74, 78, 81, 86].entries()) {
      const tone = midiToFreq(note);
      ossuaryTone(t + i * 0.07, 0.8, tone, tone, 0.11, 'sine');
    }
  };

  // ================= (c) CONSTANT DYNAMIC DRAGON HEARTBEAT =================
  function triggerHeartThump(isDub, bpm, isResting) {
    if (!AudioEngine.unlocked || !AudioEngine.ctx) return;
    const ctx = AudioEngine.ctx;
    const t = ctx.currentTime;

    const stress = Math.max(0, Math.min(1, (bpm - 65) / 130));
    const baseVol = (isResting ? 0.30 : 0.38) + stress * 0.42;
    const vol = isDub ? baseVol * 0.78 : baseVol;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const startHz = (isDub ? 108 : 92) + stress * 24;
    const endHz = (isDub ? 48 : 40) + stress * 8;
    const dur = isDub ? 0.13 : 0.17;

    osc.frequency.setValueAtTime(startHz, t);
    osc.frequency.exponentialRampToValueAtTime(endHz, t + dur);

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 210 + stress * 160;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(flt);
    flt.connect(g);
    g.connect(AudioEngine.heartGain);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  AudioEngine.updateHeartbeat = function (dt, bpm, activeGameplay, isResting) {
    if (!activeGameplay || !AudioEngine.unlocked) return;

    const beatPeriod = 60 / Math.max(55, Math.min(220, bpm));
    AudioEngine.heartTimer -= dt;

    if (AudioEngine.heartTimer <= 0) {
      AudioEngine.heartTimer = beatPeriod;
      triggerHeartThump(false, bpm, isResting);
      AudioEngine.dubPending = true;
      AudioEngine.dubTimer = Math.min(0.24, beatPeriod * 0.30);
    }

    if (AudioEngine.dubPending) {
      AudioEngine.dubTimer -= dt;
      if (AudioEngine.dubTimer <= 0) {
        AudioEngine.dubPending = false;
        triggerHeartThump(true, bpm, isResting);
      }
    }
  };

  window.HoMM3Audio = AudioEngine;
})();
