(() => {
  const gameArea = document.querySelector('.timed-game-area');
  if (!gameArea) return;

  const t = (key, vars) => {
    if (window.NH48_I18N && window.NH48_I18N.t) {
      return window.NH48_I18N.t(key, vars);
    }
    return key;
  };

  const scoreValue = document.querySelector('[data-score]');
  const livesValue = document.querySelector('[data-lives]');
  const timeValue = document.querySelector('[data-time]');
  const statusValue = document.querySelector('.timed-status');
  const zonesContainer = document.querySelector('.timed-game-zones');
  const zoneColumns = Array.from(document.querySelectorAll('.timed-zone-column'));
  const playButton = document.querySelector('[data-action="play"]');
  const splashScreen = document.querySelector('.timed-splash');
  const mainContent = document.querySelector('main');
  const gameOverOverlay = document.querySelector('.timed-game-over');
  const gameOverScore = document.querySelector('[data-final-score]');
  const gameOverMatches = document.querySelector('[data-final-matches]');
  const gameOverMisses = document.querySelector('[data-final-misses]');
  const gameOverAccuracy = document.querySelector('[data-final-accuracy]');

  const config = {
    maxLives: 5,
    totalPieces: 20,
    gameDuration: 150,
    maxZones: 6,
    minZones: 4,
    startSpawnInterval: 1800,
    minSpawnInterval: 650,
    difficultyStepSeconds: 16,
    preloadCount: 6,
    preloadHoldMs: 3000,
    minFallDurationSeconds: 12,
    maxFallDurationSeconds: 18,
    flashWarningMs: 2500
  };

  const state = {
    peaks: [],
    queue: [],
    pieces: [],
    zones: [],
    score: 0,
    lives: config.maxLives,
    matches: 0,
    misses: 0,
    totalSpawned: 0,
    elapsed: 0,
    running: false,
    lastFrame: null,
    spawnTimer: 0,
    spawnInterval: config.startSpawnInterval,
    difficultyLevel: 0,
    nextPieceId: 1,
    preloaded: new Map()
  };

  const audioState = {
    context: null,
    enabled: false
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const clampPiecePosition = (piece) => {
    const bounds = gameArea.getBoundingClientRect();
    const pieceBounds = piece.el.getBoundingClientRect();
    const maxX = bounds.width - pieceBounds.width;
    const maxY = bounds.height - pieceBounds.height;
    piece.x = clamp(piece.x, 0, Math.max(0, maxX));
    piece.y = clamp(piece.y, 0, Math.max(0, maxY));
  };

  const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const setStatus = (message) => {
    if (statusValue) {
      statusValue.textContent = message;
    }
  };

  const updateScoreboard = () => {
    const timeLeft = Math.max(0, config.gameDuration - state.elapsed);
    if (scoreValue) scoreValue.textContent = String(state.score);
    if (livesValue) livesValue.textContent = String(state.lives);
    if (timeValue) timeValue.textContent = `${Math.ceil(timeLeft)}s`;
    setStatus(`${t('timedGame.score')}: ${state.score} · ${t('timedGame.lives')}: ${state.lives} · ${t('timedGame.timeRemaining')}: ${Math.ceil(timeLeft)}s`);
  };

  const setZones = (names) => {
    state.zones = names;
    if (!zonesContainer) return;
    if (zoneColumns.length) {
      zoneColumns.forEach(column => {
        column.innerHTML = '';
      });
    } else {
      zonesContainer.innerHTML = '';
    }
    const midpoint = Math.ceil(names.length / 2);
    names.forEach((name, index) => {
      const zone = document.createElement('div');
      zone.className = 'drop-zone';
      zone.textContent = name;
      zone.dataset.peak = name;
      if (zoneColumns.length) {
        const targetColumn = index >= midpoint ? zoneColumns[1] : zoneColumns[0];
        targetColumn.appendChild(zone);
      } else {
        zonesContainer.appendChild(zone);
      }
    });
  };

  const ensureZonesInclude = (name) => {
    if (state.zones.includes(name)) return;
    const updated = [...state.zones];
    if (updated.length < config.maxZones) {
      updated.push(name);
    } else {
      const replaceIndex = Math.floor(Math.random() * updated.length);
      updated[replaceIndex] = name;
    }
    setZones(updated);
  };

  const getZoneElements = () => Array.from(document.querySelectorAll('.drop-zone'));

  const getZoneUnderPiece = (pieceEl) => {
    const pieceRect = pieceEl.getBoundingClientRect();
    const centerX = pieceRect.left + pieceRect.width / 2;
    const centerY = pieceRect.top + pieceRect.height / 2;
    const zones = getZoneElements();
    const centerZone = zones.find(zone => {
      const rect = zone.getBoundingClientRect();
      return centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom;
    });
    if (centerZone) return centerZone;
    return zones.find(zone => {
      const rect = zone.getBoundingClientRect();
      const overlapX = Math.max(0, Math.min(pieceRect.right, rect.right) - Math.max(pieceRect.left, rect.left));
      const overlapY = Math.max(0, Math.min(pieceRect.bottom, rect.bottom) - Math.max(pieceRect.top, rect.top));
      const overlapArea = overlapX * overlapY;
      const pieceArea = pieceRect.width * pieceRect.height;
      return overlapArea / pieceArea >= 0.2;
    });
  };

  const clearZoneHighlights = () => {
    getZoneElements().forEach(zone => {
      zone.classList.remove('is-target');
    });
  };

  const highlightZone = (zone) => {
    clearZoneHighlights();
    if (zone) zone.classList.add('is-target');
  };

  const flashZone = (zone, className) => {
    if (!zone) return;
    zone.classList.add(className);
    setTimeout(() => zone.classList.remove(className), 450);
  };

  const removePiece = (piece) => {
    if (piece.el && piece.el.parentNode) {
      piece.el.parentNode.removeChild(piece.el);
    }
    state.pieces = state.pieces.filter(item => item.id !== piece.id);
  };

  const initAudio = () => {
    if (audioState.context || audioState.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioState.context = new AudioContext();
    audioState.enabled = true;
  };

  const playTone = (type) => {
    if (!audioState.context) return;
    const context = audioState.context;
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const isCorrect = type === 'correct';
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isCorrect ? 620 : 220, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isCorrect ? 0.28 : 0.32, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCorrect ? 0.35 : 0.45));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (isCorrect ? 0.38 : 0.5));
  };

  const registerMatch = (piece) => {
    state.score += 10;
    state.matches += 1;
    removePiece(piece);
    playTone('correct');
  };

  const registerMiss = (piece) => {
    state.misses += 1;
    state.lives = Math.max(0, state.lives - 1);
    removePiece(piece);
    playTone('incorrect');
  };

  const attemptDrop = (piece) => {
    const zone = getZoneUnderPiece(piece.el);
    if (!zone) return false;
    if (zone.dataset.peak === piece.peak.peakName) {
      flashZone(zone, 'is-correct');
      registerMatch(piece);
    } else {
      flashZone(zone, 'is-wrong');
      registerMiss(piece);
    }
    updateScoreboard();
    return true;
  };

  const warmImage = (url) => {
    if (!url || state.preloaded.has(url)) return;
    const img = new Image();
    img.src = url;
    img.decoding = 'async';
    state.preloaded.set(url, img);
    const release = () => state.preloaded.delete(url);
    if (img.decode) {
      img.decode().finally(() => {
        setTimeout(release, config.preloadHoldMs);
      });
    } else {
      setTimeout(release, config.preloadHoldMs);
    }
  };

  const preloadUpcoming = (count = config.preloadCount) => {
    state.queue.slice(0, count).forEach(item => warmImage(item.photoUrl));
  };

  const createPiece = (peak) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'falling-piece';
    pieceEl.tabIndex = 0;
    pieceEl.setAttribute('role', 'button');
    pieceEl.setAttribute('aria-label', `${peak.peakName}`);
    pieceEl.setAttribute('draggable', 'false');
    const img = document.createElement('img');
    img.src = peak.photoUrl;
    img.alt = peak.altText;
    img.loading = 'eager';
    img.draggable = false;
    pieceEl.appendChild(img);

    const rect = gameArea.getBoundingClientRect();
    const width = pieceEl.offsetWidth || 120;
    const x = Math.random() * Math.max(0, rect.width - width);

    const piece = {
      id: state.nextPieceId++,
      peak,
      el: pieceEl,
      x,
      y: -80,
      dragging: false,
      pointerId: null,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.00045 + Math.random() * 0.00025,
      fallElapsed: 0,
      fallDurationMs: (config.minFallDurationSeconds
        + Math.random() * (config.maxFallDurationSeconds - config.minFallDurationSeconds)) * 1000,
      warned: false
    };

    const updatePosition = () => {
      piece.el.style.setProperty('--piece-x', `${piece.x}px`);
      piece.el.style.setProperty('--piece-y', `${piece.y}px`);
    };

    pieceEl.addEventListener('pointerdown', (event) => {
      piece.dragging = true;
      piece.pointerId = event.pointerId;
      pieceEl.setPointerCapture(event.pointerId);
      pieceEl.classList.add('is-dragging');
      piece.offsetX = event.clientX - pieceEl.getBoundingClientRect().left;
      piece.offsetY = event.clientY - pieceEl.getBoundingClientRect().top;
    });

    pieceEl.addEventListener('pointermove', (event) => {
      if (!piece.dragging) return;
      const bounds = gameArea.getBoundingClientRect();
      piece.x = event.clientX - bounds.left - piece.offsetX;
      piece.y = event.clientY - bounds.top - piece.offsetY;
      clampPiecePosition(piece);
      updatePosition();
      highlightZone(getZoneUnderPiece(pieceEl));
    });

    const releasePointer = () => {
      if (!piece.dragging) return;
      piece.dragging = false;
      pieceEl.classList.remove('is-dragging');
      clearZoneHighlights();
      attemptDrop(piece);
    };

    pieceEl.addEventListener('pointerup', releasePointer);
    pieceEl.addEventListener('pointercancel', releasePointer);
    pieceEl.addEventListener('lostpointercapture', releasePointer);
    pieceEl.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });

    pieceEl.addEventListener('focus', () => {
      piece.dragging = true;
      pieceEl.classList.add('is-dragging');
    });

    pieceEl.addEventListener('blur', () => {
      piece.dragging = false;
      pieceEl.classList.remove('is-dragging');
      clearZoneHighlights();
    });

    updatePosition();
    gameArea.appendChild(pieceEl);
    return piece;
  };

  const spawnPiece = () => {
    if (state.totalSpawned >= config.totalPieces) return;
    const peak = state.queue.shift();
    if (!peak) return;

    ensureZonesInclude(peak.peakName);
    const piece = createPiece(peak);
    state.pieces.push(piece);
    state.totalSpawned += 1;
    preloadUpcoming();
  };

  const updateDifficulty = () => {
    const nextLevel = Math.floor(state.elapsed / config.difficultyStepSeconds);
    if (nextLevel <= state.difficultyLevel) return;
    state.difficultyLevel = nextLevel;
    state.spawnInterval = Math.max(config.minSpawnInterval, state.spawnInterval - 60);
  };

  const tick = (timestamp) => {
    if (!state.running) return;
    if (!state.lastFrame) state.lastFrame = timestamp;
    const delta = timestamp - state.lastFrame;
    state.lastFrame = timestamp;
    state.elapsed += delta / 1000;

    updateDifficulty();

    state.spawnTimer += delta;
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      spawnPiece();
    }

    const bounds = gameArea.getBoundingClientRect();
    state.pieces.forEach(piece => {
      if (piece.dragging) return;
      piece.fallElapsed += delta;
      const progress = Math.min(piece.fallElapsed / piece.fallDurationMs, 1);
      const remainingMs = piece.fallDurationMs - piece.fallElapsed;
      if (!piece.warned && remainingMs <= config.flashWarningMs) {
        piece.warned = true;
        piece.el.classList.add('is-warning');
      }
      piece.y = -80 + (bounds.height + 80) * progress;
      piece.driftPhase += piece.driftSpeed * delta;
      piece.x += Math.sin(piece.driftPhase) * 0.5;
      clampPiecePosition(piece);
      if (piece.y + piece.el.offsetHeight >= bounds.height) {
        registerMiss(piece);
      } else {
        piece.el.style.setProperty('--piece-x', `${piece.x}px`);
        piece.el.style.setProperty('--piece-y', `${piece.y}px`);
      }
    });

    updateScoreboard();

    const timeLeft = config.gameDuration - state.elapsed;
    if (timeLeft <= 0 || state.lives <= 0 || (state.totalSpawned >= config.totalPieces && state.pieces.length === 0)) {
      endGame();
      return;
    }

    requestAnimationFrame(tick);
  };

  const buildZonesFromQueue = () => {
    const upcoming = state.queue.slice(0, config.maxZones).map(item => item.peakName);
    if (upcoming.length < config.minZones) {
      const filler = shuffle(state.peaks.map(item => item.peakName)).slice(0, config.minZones - upcoming.length);
      setZones([...new Set([...upcoming, ...filler])].slice(0, config.maxZones));
    } else {
      setZones(upcoming);
    }
  };

  const resetGame = () => {
    state.score = 0;
    state.lives = config.maxLives;
    state.matches = 0;
    state.misses = 0;
    state.totalSpawned = 0;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.spawnInterval = config.startSpawnInterval;
    state.difficultyLevel = 0;
    state.pieces.forEach(piece => removePiece(piece));
    state.pieces = [];
    state.queue = shuffle(state.peaks);
    preloadUpcoming();
    buildZonesFromQueue();
    updateScoreboard();
  };

  const endGame = () => {
    state.running = false;
    clearZoneHighlights();
    if (gameOverOverlay) {
      const accuracy = state.matches + state.misses > 0
        ? Math.round((state.matches / (state.matches + state.misses)) * 100)
        : 0;
      if (gameOverScore) gameOverScore.textContent = String(state.score);
      if (gameOverMatches) gameOverMatches.textContent = String(state.matches);
      if (gameOverMisses) gameOverMisses.textContent = String(state.misses);
      if (gameOverAccuracy) gameOverAccuracy.textContent = `${accuracy}%`;
      gameOverOverlay.classList.add('active');
    }
  };

  const hideSplash = () => {
    if (splashScreen) {
      splashScreen.classList.add('is-hidden');
      splashScreen.setAttribute('aria-hidden', 'true');
    }
    if (mainContent) {
      mainContent.removeAttribute('aria-hidden');
    }
    document.body.classList.remove('has-splash');
  };

  const startGame = () => {
    if (!state.peaks.length) return;
    hideSplash();
    resetGame();
    initAudio();
    state.running = true;
    gameOverOverlay?.classList.remove('active');
    state.lastFrame = null;
    requestAnimationFrame(tick);
  };

  const loadPeaks = async () => {
    const response = await fetch('/data/nh48.json');
    const data = await response.json();
    state.peaks = Object.values(data).flatMap(item => {
      const photos = item.photos || [];
      if (!photos.length) {
        return [{
          peakName: item.peakName,
          slug: item.slug,
          photoUrl: '',
          altText: `${item.peakName} summit photo`
        }];
      }
      return photos.map(photo => ({
        peakName: item.peakName,
        slug: item.slug,
        photoUrl: photo.url || '',
        altText: photo.altText || photo.alt || `${item.peakName} summit photo`
      }));
    }).filter(item => item.photoUrl);
    config.totalPieces = Math.min(state.peaks.length, 60);
    state.queue = shuffle(state.peaks);
    buildZonesFromQueue();
    preloadUpcoming();
    updateScoreboard();
  };

  playButton?.addEventListener('click', () => {
    startGame();
  });

  document.querySelectorAll('[data-action="replay"]').forEach(button => {
    button.addEventListener('click', () => {
      startGame();
    });
  });

  loadPeaks().catch(err => {
    console.error('Timed PeakID Game failed to load peaks', err);
    setStatus(t('common.errorLoading'));
  });
})();
