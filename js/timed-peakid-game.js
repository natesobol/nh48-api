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
  const playButton = document.querySelector('[data-action="play"]');
  const gameOverOverlay = document.querySelector('.timed-game-over');
  const gameOverScore = document.querySelector('[data-final-score]');
  const gameOverMatches = document.querySelector('[data-final-matches]');
  const gameOverMisses = document.querySelector('[data-final-misses]');
  const gameOverAccuracy = document.querySelector('[data-final-accuracy]');

  const config = {
    maxLives: 5,
    totalPieces: 20,
    gameDuration: 120,
    maxZones: 6,
    minZones: 4,
    startSpawnInterval: 2200,
    minSpawnInterval: 900,
    gravity: 0.0007,
    difficultyStepSeconds: 20
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
    gravity: config.gravity,
    difficultyLevel: 0,
    nextPieceId: 1
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    zonesContainer.innerHTML = '';
    names.forEach(name => {
      const zone = document.createElement('div');
      zone.className = 'drop-zone';
      zone.textContent = name;
      zone.dataset.peak = name;
      zonesContainer.appendChild(zone);
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
    return zones.find(zone => {
      const rect = zone.getBoundingClientRect();
      return centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom;
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

  const registerMatch = (piece) => {
    state.score += 10;
    state.matches += 1;
    removePiece(piece);
  };

  const registerMiss = (piece) => {
    state.misses += 1;
    state.lives = Math.max(0, state.lives - 1);
    removePiece(piece);
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

  const createPiece = (peak) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'falling-piece';
    pieceEl.tabIndex = 0;
    pieceEl.setAttribute('role', 'button');
    pieceEl.setAttribute('aria-label', `${peak.peakName}`);
    const img = document.createElement('img');
    img.src = peak.photoUrl;
    img.alt = peak.altText;
    img.loading = 'eager';
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
      velocity: 0.03,
      dragging: false,
      pointerId: null
    };

    const updatePosition = () => {
      piece.el.style.transform = `translate3d(${piece.x}px, ${piece.y}px, 0)`;
    };

    const clampPosition = () => {
      const bounds = gameArea.getBoundingClientRect();
      const pieceBounds = piece.el.getBoundingClientRect();
      const maxX = bounds.width - pieceBounds.width;
      const maxY = bounds.height - pieceBounds.height;
      piece.x = clamp(piece.x, 0, Math.max(0, maxX));
      piece.y = clamp(piece.y, 0, Math.max(0, maxY));
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
      clampPosition();
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

    pieceEl.addEventListener('focus', () => {
      piece.dragging = true;
      pieceEl.classList.add('is-dragging');
    });

    pieceEl.addEventListener('blur', () => {
      piece.dragging = false;
      pieceEl.classList.remove('is-dragging');
      clearZoneHighlights();
    });

    pieceEl.addEventListener('keydown', (event) => {
      const step = 12;
      if (event.key === 'ArrowLeft') {
        piece.x -= step;
      } else if (event.key === 'ArrowRight') {
        piece.x += step;
      } else if (event.key === 'ArrowUp') {
        piece.y -= step;
      } else if (event.key === 'ArrowDown') {
        piece.y += step;
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        attemptDrop(piece);
        return;
      } else {
        return;
      }
      event.preventDefault();
      clampPosition();
      updatePosition();
      highlightZone(getZoneUnderPiece(pieceEl));
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
  };

  const updateDifficulty = () => {
    const nextLevel = Math.floor(state.elapsed / config.difficultyStepSeconds);
    if (nextLevel <= state.difficultyLevel) return;
    state.difficultyLevel = nextLevel;
    state.gravity *= 1.12;
    state.spawnInterval = Math.max(config.minSpawnInterval, state.spawnInterval - 150);
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
      piece.velocity += state.gravity * delta;
      piece.y += piece.velocity * delta;
      if (piece.y + piece.el.offsetHeight >= bounds.height) {
        registerMiss(piece);
      } else {
        piece.el.style.transform = `translate3d(${piece.x}px, ${piece.y}px, 0)`;
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
    state.gravity = config.gravity;
    state.difficultyLevel = 0;
    state.pieces.forEach(piece => removePiece(piece));
    state.pieces = [];
    state.queue = shuffle(state.peaks);
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

  const startGame = () => {
    if (!state.peaks.length) return;
    resetGame();
    state.running = true;
    gameOverOverlay?.classList.remove('active');
    state.lastFrame = null;
    requestAnimationFrame(tick);
  };

  const loadPeaks = async () => {
    const response = await fetch('/data/nh48.json');
    const data = await response.json();
    state.peaks = Object.values(data).map(item => {
      const photos = item.photos || [];
      const photo = photos[Math.floor(Math.random() * photos.length)] || {};
      return {
        peakName: item.peakName,
        slug: item.slug,
        photoUrl: photo.url || '',
        altText: photo.altText || photo.alt || `${item.peakName} summit photo`
      };
    }).filter(item => item.photoUrl);
    state.queue = shuffle(state.peaks);
    buildZonesFromQueue();
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
