(() => {
  const DATA_PATH = '/data/nh48.json';
  const SNAP_THRESHOLD = 18;
  const DEFAULT_DIFFICULTY = 5;

  const t = (key, vars) =>
    (window.NH48_I18N && window.NH48_I18N.t
      ? window.NH48_I18N.t(key, vars)
      : key);

  const state = {
    pieces: [],
    placedCount: 0,
    totalPieces: 0,
    startTime: null,
    timerId: null,
    rows: DEFAULT_DIFFICULTY,
    cols: DEFAULT_DIFFICULTY,
    image: null,
    boardRect: null,
    playAreaRect: null,
    dragState: null,
    keyboardPieceId: null,
    peaks: [],
    customImageUrl: null
  };

  const elements = {
    board: document.getElementById('puzzle-board'),
    tray: document.getElementById('puzzle-tray'),
    piecesLayer: document.getElementById('puzzle-pieces'),
    progressText: document.getElementById('puzzle-progress-text'),
    progressBar: document.getElementById('puzzle-progress-bar'),
    timer: document.getElementById('puzzle-timer'),
    piecesCount: document.getElementById('puzzle-pieces-count'),
    status: document.getElementById('puzzle-status'),
    liveRegion: document.getElementById('puzzle-live'),
    startButton: document.getElementById('puzzle-start'),
    shuffleButton: document.getElementById('puzzle-shuffle'),
    restartButton: document.getElementById('puzzle-restart'),
    randomButton: document.getElementById('puzzle-random'),
    photoSelect: document.getElementById('puzzle-photo-select'),
    photoUpload: document.getElementById('puzzle-photo-upload'),
    difficultySelect: document.getElementById('puzzle-difficulty'),
    finalScreen: document.getElementById('puzzle-final'),
    finalTime: document.getElementById('puzzle-final-time'),
    finalMessage: document.getElementById('puzzle-final-message')
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const announce = (message) => {
    if (!elements.liveRegion) return;
    elements.liveRegion.textContent = message;
  };

  const updateScoreboard = () => {
    const percent = state.totalPieces
      ? Math.round((state.placedCount / state.totalPieces) * 100)
      : 0;
    elements.progressText.textContent = `${percent}%`;
    elements.progressBar.style.width = `${percent}%`;
    elements.piecesCount.textContent = `${state.placedCount} / ${state.totalPieces}`;
  };

  const updateTimer = () => {
    if (!state.startTime) return;
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    elements.timer.textContent = formatTime(elapsedSeconds);
  };

  const resetTimer = () => {
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    state.timerId = null;
    state.startTime = null;
    elements.timer.textContent = '0:00';
  };

  const startTimer = () => {
    state.startTime = Date.now();
    updateTimer();
    state.timerId = setInterval(updateTimer, 1000);
  };

  const clearPieces = () => {
    state.pieces = [];
    state.placedCount = 0;
    state.totalPieces = 0;
    state.keyboardPieceId = null;
    elements.piecesLayer.innerHTML = '';
    updateScoreboard();
  };

  const resetGameUI = () => {
    elements.status.textContent = '';
    elements.board.style.height = '';
    elements.finalScreen.classList.remove('active');
    elements.finalScreen.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('puzzle-complete');
  };

  const resetGame = () => {
    clearPieces();
    resetTimer();
    resetGameUI();
  };

  const handleDifficultyChange = () => {
    const size = Number(elements.difficultySelect.value || DEFAULT_DIFFICULTY);
    state.rows = size;
    state.cols = size;
  };

  const toPeakList = (data) =>
    Object.values(data)
      .map(peak => ({
        name: peak.peakName || peak['Peak Name'] || peak.slug,
        photos: Array.isArray(peak.photos) ? peak.photos : []
      }))
      .filter(peak => peak.photos.length > 0);

  const populatePhotoSelect = (peaks) => {
    elements.photoSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = t('puzzle.photoSelectPlaceholder');
    elements.photoSelect.appendChild(placeholder);

    peaks.forEach((peak, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = peak.name;
      elements.photoSelect.appendChild(option);
    });
  };

  const pickRandomPeak = () => {
    if (!state.peaks.length) return;
    const index = Math.floor(Math.random() * state.peaks.length);
    elements.photoSelect.value = String(index);
    elements.photoUpload.value = '';
    announce(t('puzzle.randomPhotoAnnounce', { name: state.peaks[index].name }));
  };

  const getSelectedPhoto = () => {
    const index = Number(elements.photoSelect.value);
    if (!Number.isNaN(index) && state.peaks[index]) {
      const photo = state.peaks[index].photos[0];
      return {
        url: photo.url,
        credit: photo.author || photo.iptc?.creator || ''
      };
    }
    return null;
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image failed to load'));
      image.src = src;
    });

  const getBoardSize = () => {
    const playAreaRect = elements.board.parentElement.getBoundingClientRect();
    const maxBoardWidth = playAreaRect.width < 900
      ? playAreaRect.width
      : playAreaRect.width * 0.62;
    const boardWidth = Math.min(720, maxBoardWidth);
    const cellSize = boardWidth / state.cols;
    const boardHeight = cellSize * state.rows;
    elements.board.style.width = `${boardWidth}px`;
    elements.board.style.height = `${boardHeight}px`;
    return { boardWidth, boardHeight, cellSize };
  };

  const drawSourceCanvas = (image, boardWidth, boardHeight) => {
    const canvas = document.createElement('canvas');
    canvas.width = boardWidth;
    canvas.height = boardHeight;
    const ctx = canvas.getContext('2d');
    const imageRatio = image.width / image.height;
    const boardRatio = boardWidth / boardHeight;
    let drawWidth = boardWidth;
    let drawHeight = boardHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imageRatio > boardRatio) {
      drawHeight = boardHeight;
      drawWidth = boardHeight * imageRatio;
      offsetX = (boardWidth - drawWidth) / 2;
    } else {
      drawWidth = boardWidth;
      drawHeight = boardWidth / imageRatio;
      offsetY = (boardHeight - drawHeight) / 2;
    }

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    return canvas;
  };

  const buildEdges = () => {
    const edges = Array.from({ length: state.rows }, () =>
      Array.from({ length: state.cols }, () => ({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }))
    );

    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        const piece = edges[row][col];
        if (row > 0) {
          piece.top = -edges[row - 1][col].bottom;
        }
        if (col > 0) {
          piece.left = -edges[row][col - 1].right;
        }
        if (row < state.rows - 1) {
          piece.bottom = Math.random() > 0.5 ? 1 : -1;
        }
        if (col < state.cols - 1) {
          piece.right = Math.random() > 0.5 ? 1 : -1;
        }
      }
    }

    return edges;
  };

  const createPiecePath = (size, tabSize, edge) => {
    const path = new Path2D();
    const origin = tabSize;
    const tabWidth = tabSize * 1.1;

    const addHorizontal = (startX, startY, length, tab, outwardSign, direction = 1) => {
      if (tab === 0) {
        path.lineTo(startX + length * direction, startY);
        return;
      }
      const bump = tab * tabSize * outwardSign;
      const mid = startX + (length / 2) * direction;
      path.lineTo(startX + (length / 2 - tabWidth) * direction, startY);
      path.bezierCurveTo(
        startX + (length / 2 - tabWidth / 2) * direction,
        startY,
        mid - (tabWidth / 2) * direction,
        startY + bump,
        mid,
        startY + bump
      );
      path.bezierCurveTo(
        mid + (tabWidth / 2) * direction,
        startY + bump,
        startX + (length / 2 + tabWidth / 2) * direction,
        startY,
        startX + (length / 2 + tabWidth) * direction,
        startY
      );
      path.lineTo(startX + length * direction, startY);
    };

    const addVertical = (startX, startY, length, tab, outwardSign, direction = 1) => {
      if (tab === 0) {
        path.lineTo(startX, startY + length * direction);
        return;
      }
      const bump = tab * tabSize * outwardSign;
      const mid = startY + (length / 2) * direction;
      path.lineTo(startX, startY + (length / 2 - tabWidth) * direction);
      path.bezierCurveTo(
        startX,
        startY + (length / 2 - tabWidth / 2) * direction,
        startX + bump,
        mid - (tabWidth / 2) * direction,
        startX + bump,
        mid
      );
      path.bezierCurveTo(
        startX + bump,
        mid + (tabWidth / 2) * direction,
        startX,
        startY + (length / 2 + tabWidth / 2) * direction,
        startX,
        startY + (length / 2 + tabWidth) * direction
      );
      path.lineTo(startX, startY + length * direction);
    };

    path.moveTo(origin, origin);
    addHorizontal(origin, origin, size, edge.top, -1, 1);
    addVertical(origin + size, origin, size, edge.right, 1, 1);
    addHorizontal(origin + size, origin + size, size, edge.bottom, 1, -1);
    addVertical(origin, origin + size, size, edge.left, -1, -1);
    path.closePath();

    return path;
  };

  const setPiecePosition = (piece, x, y) => {
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.dataset.x = String(x);
    piece.dataset.y = String(y);
  };

  const getPiecePosition = (piece) => ({
    x: Number(piece.dataset.x || 0),
    y: Number(piece.dataset.y || 0)
  });

  const snapPiece = (piece) => {
    const targetX = Number(piece.dataset.targetX);
    const targetY = Number(piece.dataset.targetY);
    setPiecePosition(piece, targetX, targetY);
    piece.classList.add('locked');
    piece.setAttribute('aria-disabled', 'true');
    piece.setAttribute('aria-grabbed', 'false');
    piece.removeEventListener('pointerdown', handlePointerDown);
    piece.removeEventListener('keydown', handlePieceKeydown);
    state.placedCount += 1;
    updateScoreboard();

    if (state.placedCount === state.totalPieces) {
      endGame();
    } else {
      announce(t('puzzle.piecePlaced'));
    }
  };

  const attemptSnap = (piece) => {
    const { x, y } = getPiecePosition(piece);
    const targetX = Number(piece.dataset.targetX);
    const targetY = Number(piece.dataset.targetY);
    const distance = Math.hypot(x - targetX, y - targetY);
    if (distance <= SNAP_THRESHOLD) {
      snapPiece(piece);
      return true;
    }
    return false;
  };

  const shufflePieces = () => {
    if (!state.pieces.length || !elements.tray || !elements.piecesLayer) return;
    const trayRect = elements.tray.getBoundingClientRect();
    const playAreaRect = elements.board.parentElement.getBoundingClientRect();
    const minX = trayRect.left - playAreaRect.left + 16;
    const minY = trayRect.top - playAreaRect.top + 16;
    const maxX = trayRect.right - playAreaRect.left - 16;
    const maxY = trayRect.bottom - playAreaRect.top - 16;

    state.pieces.forEach(piece => {
      if (piece.classList.contains('locked')) return;
      const width = piece.offsetWidth;
      const height = piece.offsetHeight;
      const x = minX + Math.random() * Math.max(0, maxX - minX - width);
      const y = minY + Math.random() * Math.max(0, maxY - minY - height);
      setPiecePosition(piece, x, y);
    });
    announce(t('puzzle.shuffleAnnounce'));
  };

  const handlePointerMove = (event) => {
    if (!state.dragState) return;
    const { piece, offsetX, offsetY, playAreaRect } = state.dragState;
    state.dragState.nextX = event.clientX - playAreaRect.left - offsetX;
    state.dragState.nextY = event.clientY - playAreaRect.top - offsetY;

    if (!piece.animationFrame) {
      piece.animationFrame = requestAnimationFrame(() => {
        setPiecePosition(piece, state.dragState.nextX, state.dragState.nextY);
        piece.animationFrame = null;
      });
    }
  };

  const handlePointerUp = () => {
    if (!state.dragState) return;
    const { piece } = state.dragState;
    piece.classList.remove('dragging');
    piece.style.zIndex = '';
    attemptSnap(piece);
    state.dragState = null;
  };

  function handlePointerDown(event) {
    const piece = event.currentTarget;
    if (piece.classList.contains('locked')) return;
    const playAreaRect = elements.board.parentElement.getBoundingClientRect();
    const rect = piece.getBoundingClientRect();
    piece.classList.add('dragging');
    piece.style.zIndex = '10';
    piece.setPointerCapture(event.pointerId);
    state.dragState = {
      piece,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      playAreaRect,
      nextX: Number(piece.dataset.x || 0),
      nextY: Number(piece.dataset.y || 0)
    };
  }

  const handlePieceKeydown = (event) => {
    const piece = event.currentTarget;
    if (piece.classList.contains('locked')) return;
    const step = event.shiftKey ? 30 : 12;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const isActive = state.keyboardPieceId === piece.dataset.pieceId;
      if (isActive) {
        piece.classList.remove('keyboard-active');
        piece.setAttribute('aria-grabbed', 'false');
        state.keyboardPieceId = null;
        attemptSnap(piece);
        announce(t('puzzle.dropPiece'));
      } else {
        state.keyboardPieceId = piece.dataset.pieceId;
        piece.classList.add('keyboard-active');
        piece.setAttribute('aria-grabbed', 'true');
        announce(t('puzzle.pickupPiece'));
      }
      return;
    }

    if (state.keyboardPieceId !== piece.dataset.pieceId) return;

    const { x, y } = getPiecePosition(piece);
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPiecePosition(piece, x, y - step);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPiecePosition(piece, x, y + step);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPiecePosition(piece, x - step, y);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPiecePosition(piece, x + step, y);
    }
  };

  const createPieces = (sourceCanvas, metrics) => {
    const { boardWidth, boardHeight, cellSize } = metrics;
    const tabSize = cellSize * 0.22;
    const edges = buildEdges();
    const playAreaRect = elements.board.parentElement.getBoundingClientRect();
    const boardRect = elements.board.getBoundingClientRect();
    const trayRect = elements.tray.getBoundingClientRect();

    state.totalPieces = state.rows * state.cols;
    updateScoreboard();

    for (let row = 0; row < state.rows; row += 1) {
      for (let col = 0; col < state.cols; col += 1) {
        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = cellSize + tabSize * 2;
        pieceCanvas.height = cellSize + tabSize * 2;
        const ctx = pieceCanvas.getContext('2d');
        const path = createPiecePath(cellSize, tabSize, edges[row][col]);

        ctx.save();
        ctx.clip(path);
        ctx.drawImage(
          sourceCanvas,
          tabSize - col * cellSize,
          tabSize - row * cellSize,
          boardWidth,
          boardHeight
        );
        ctx.restore();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke(path);

        const piece = document.createElement('button');
        piece.type = 'button';
        piece.className = 'puzzle-piece';
        piece.appendChild(pieceCanvas);
        piece.dataset.pieceId = `${row}-${col}`;
        piece.dataset.targetX = String(boardRect.left - playAreaRect.left + col * cellSize - tabSize);
        piece.dataset.targetY = String(boardRect.top - playAreaRect.top + row * cellSize - tabSize);
        piece.setAttribute('aria-label', t('puzzle.pieceLabel', { index: row * state.cols + col + 1 }));
        piece.setAttribute('aria-grabbed', 'false');

        const minX = trayRect.left - playAreaRect.left + 16;
        const minY = trayRect.top - playAreaRect.top + 16;
        const maxX = trayRect.right - playAreaRect.left - 16;
        const maxY = trayRect.bottom - playAreaRect.top - 16;
        const x = minX + Math.random() * Math.max(0, maxX - minX - pieceCanvas.width);
        const y = minY + Math.random() * Math.max(0, maxY - minY - pieceCanvas.height);

        setPiecePosition(piece, x, y);
        piece.addEventListener('pointerdown', handlePointerDown);
        piece.addEventListener('keydown', handlePieceKeydown);
        state.pieces.push(piece);
        elements.piecesLayer.appendChild(piece);
      }
    }
  };

  const startPuzzle = async () => {
    resetGame();
    handleDifficultyChange();

    let imageSource = null;
    let photoCredit = '';
    if (elements.photoUpload.files && elements.photoUpload.files[0]) {
      const file = elements.photoUpload.files[0];
      if (state.customImageUrl) {
        URL.revokeObjectURL(state.customImageUrl);
      }
      state.customImageUrl = URL.createObjectURL(file);
      imageSource = state.customImageUrl;
      photoCredit = t('puzzle.customPhotoLabel');
    } else {
      const selected = getSelectedPhoto();
      if (selected) {
        imageSource = selected.url;
        if (selected.credit) {
          photoCredit = t('puzzle.photoCredit', { credit: selected.credit });
        }
      }
    }

    if (!imageSource) {
      elements.status.textContent = t('puzzle.selectPhotoWarning');
      return;
    }

    try {
      const image = await loadImage(imageSource);
      state.image = image;
      const metrics = getBoardSize();
      const sourceCanvas = drawSourceCanvas(image, metrics.boardWidth, metrics.boardHeight);
      createPieces(sourceCanvas, metrics);
      startTimer();
      announce(t('puzzle.startAnnounce'));
      elements.status.textContent = photoCredit;
    } catch (error) {
      console.error(error);
      elements.status.textContent = t('puzzle.imageLoadError');
    }
  };

  const endGame = () => {
    if (state.timerId) {
      clearInterval(state.timerId);
    }
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    elements.finalTime.textContent = t('puzzle.finalTime', { time: formatTime(elapsedSeconds) });
    elements.finalMessage.textContent = t('puzzle.finalMessage', { time: formatTime(elapsedSeconds) });
    elements.finalScreen.classList.add('active');
    elements.finalScreen.setAttribute('aria-hidden', 'false');
    document.body.classList.add('puzzle-complete');
    announce(t('puzzle.completeAnnounce'));
  };

  const handleGlobalPointerUp = () => {
    if (state.dragState) {
      handlePointerUp();
    }
  };

  const loadPeaks = async () => {
    try {
      const response = await fetch(DATA_PATH);
      if (!response.ok) throw new Error('Failed to load peaks');
      const data = await response.json();
      state.peaks = toPeakList(data);
      populatePhotoSelect(state.peaks);
    } catch (error) {
      console.error(error);
      elements.status.textContent = t('puzzle.dataError');
    }
  };

  const init = () => {
    handleDifficultyChange();
    loadPeaks();
    updateScoreboard();

    elements.startButton.addEventListener('click', startPuzzle);
    elements.shuffleButton.addEventListener('click', shufflePieces);
    elements.randomButton.addEventListener('click', pickRandomPeak);
    elements.difficultySelect.addEventListener('change', handleDifficultyChange);
    elements.photoSelect.addEventListener('change', () => {
      elements.photoUpload.value = '';
    });
    elements.photoUpload.addEventListener('change', () => {
      elements.photoSelect.value = '';
    });
    elements.restartButton.addEventListener('click', () => {
      resetGame();
      startPuzzle();
    });

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
  };

  init();
})();
