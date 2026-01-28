(() => {
  const DATA_PATH = '/data/nh48.json';
  const TOTAL_ROUNDS = 8;
  const PEAKS_PER_ROUND = 6;
  const INERTIA_DURATION_MS = 450;
  const INERTIA_FRICTION = 0.92;
  const SOCIAL_CANONICAL_URL = 'https://nh48.info/peakid';

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const t = (key, vars) =>
    (window.NH48_I18N && window.NH48_I18N.t
      ? window.NH48_I18N.t(key, vars)
      : key);

  const tf = (key, fallback, vars) => {
    const value = t(key, vars);
    return value === key ? fallback : value;
  };

  const state = {
    rounds: [],
    currentRoundIndex: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    roundPlaced: 0,
    roundCorrect: 0,
    roundIncorrect: 0,
    struggledPeaks: new Set(),
    selectedCardId: null,
    usedSocialImages: new Set(),
    currentSocialImage: null,
    socialSettings: {
      showScore: true,
      showDate: true,
      showName: false,
      useGradient: true,
      name: ''
    },
    audioContext: null
  };

  const elements = {
    cards: document.getElementById('peakid-cards'),
    slots: document.getElementById('peakid-slots'),
    slotsLeft: document.getElementById('peakid-slots-left'),
    slotsRight: document.getElementById('peakid-slots-right'),
    roundLabel: document.getElementById('peakid-round-label'),
    totalCorrect: document.getElementById('peakid-total-correct'),
    totalIncorrect: document.getElementById('peakid-total-incorrect'),
    progressBar: document.getElementById('peakid-progress-bar'),
    submitButton: document.getElementById('peakid-submit'),
    roundSummary: document.getElementById('peakid-round-summary'),
    liveRegion: document.getElementById('peakid-live'),
    finalScreen: document.getElementById('peakid-final'),
    finalScore: document.getElementById('peakid-final-score'),
    finalMessage: document.getElementById('peakid-final-message'),
    restartButton: document.getElementById('peakid-restart'),
    cardOrientationButtons: document.querySelectorAll('[data-orientation]'),
    socialCard: document.getElementById('peakid-social-card'),
    socialCardTitle: document.getElementById('peakid-social-title'),
    socialCardScore: document.getElementById('peakid-social-score'),
    socialCardName: document.getElementById('peakid-social-name'),
    socialCardTimestamp: document.getElementById('peakid-social-timestamp'),
    socialCardLink: document.getElementById('peakid-social-link'),
    socialSettingsShowScore: document.getElementById('social-show-score'),
    socialSettingsShowDate: document.getElementById('social-show-date'),
    socialSettingsShowName: document.getElementById('social-show-name'),
    socialSettingsUseGradient: document.getElementById('social-use-gradient'),
    socialSettingsNameInput: document.getElementById('social-name-input'),
    shareButtons: document.getElementById('peakid-share-buttons'),
    downloadCardButton: document.getElementById('peakid-download-card'),
    regenCardButton: document.getElementById('peakid-regenerate-card'),
    splashBackground: document.getElementById('splash-background')
  };

  const shuffle = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const chunk = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const pickPhoto = (photos, used) => {
    if (!Array.isArray(photos) || photos.length === 0) {
      return null;
    }
    const shuffled = shuffle(photos);
    const unique = shuffled.find(photo => !used.has(photo.url));
    const selected = unique || shuffled[0];
    if (selected) {
      used.add(selected.url);
    }
    return selected;
  };

  const resetRoundStats = () => {
    state.roundPlaced = 0;
    state.roundCorrect = 0;
    state.roundIncorrect = 0;
  };

  const clearSelection = () => {
    if (!state.selectedCardId) return;
    const card = document.querySelector(`[data-card-id="${state.selectedCardId}"]`);
    if (card) {
      card.classList.remove('selected');
      card.removeAttribute('aria-pressed');
    }
    state.selectedCardId = null;
  };

  const updateScoreboard = () => {
    elements.totalCorrect.textContent = state.totalCorrect + state.roundCorrect;
    elements.totalIncorrect.textContent = state.totalIncorrect + state.roundIncorrect;
    const progressPercent = ((state.currentRoundIndex + 1) / TOTAL_ROUNDS) * 100;
    elements.progressBar.style.width = `${progressPercent}%`;
    elements.roundLabel.textContent = `${t('peakid.roundLabel')} ${state.currentRoundIndex + 1} ${t('peakid.ofLabel')} ${TOTAL_ROUNDS}`;
  };

  const announce = (message) => {
    if (!elements.liveRegion) return;
    elements.liveRegion.textContent = message;
  };

  const getAudioContext = () => {
    if (state.audioContext) return state.audioContext;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    state.audioContext = new AudioContext();
    return state.audioContext;
  };

  const playSequence = (tones) => {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    const now = context.currentTime;
    tones.forEach(tone => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const offset = tone.offset || 0;
      const duration = tone.duration || 0.3;
      const volume = tone.volume || 0.16;
      oscillator.type = tone.type || 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, now + offset);
      gainNode.gain.setValueAtTime(0.001, now + offset);
      gainNode.gain.linearRampToValueAtTime(volume, now + offset + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + duration + 0.02);
    });
  };

  const playCorrectSound = () => {
    playSequence([
      { frequency: 660, duration: 0.22, volume: 0.18 },
      { frequency: 880, duration: 0.2, volume: 0.16, offset: 0.16 }
    ]);
  };

  const playIncorrectSound = () => {
    playSequence([
      { frequency: 220, duration: 0.35, volume: 0.22, type: 'sawtooth' }
    ]);
  };

  const playNextRoundSound = () => {
    playSequence([
      { frequency: 740, duration: 0.12, volume: 0.16 },
      { frequency: 520, duration: 0.1, volume: 0.12, offset: 0.12 }
    ]);
  };

  const playFinishSound = () => {
    playSequence([
      { frequency: 520, duration: 0.2, volume: 0.16 },
      { frequency: 660, duration: 0.2, volume: 0.16, offset: 0.18 },
      { frequency: 880, duration: 0.28, volume: 0.18, offset: 0.36 }
    ]);
  };

  const getCardState = (card) => ({
    x: Number(card.dataset.translateX || 0),
    y: Number(card.dataset.translateY || 0)
  });

  const setCardState = (card, x, y) => {
    card.dataset.translateX = x;
    card.dataset.translateY = y;
    card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const getSlotById = (slotId) =>
    document.querySelector(`[data-slot-id="${slotId}"]`);

  const addSlotFeedback = (slot, isCorrect) => {
    const existing = slot.querySelector('.peakid-slot-feedback');
    if (existing) existing.remove();
    const badge = document.createElement('span');
    badge.className = `peakid-slot-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    badge.textContent = isCorrect ? '✅' : '❌';
    slot.appendChild(badge);
    const duration = prefersReducedMotion() ? 350 : 1200;
    setTimeout(() => {
      badge.remove();
    }, duration);
  };

  const animateSlotResult = (slot, isCorrect) => {
    if (prefersReducedMotion()) return;
    slot.classList.remove('feedback-correct', 'feedback-incorrect');
    void slot.offsetWidth;
    slot.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');
    slot.addEventListener('animationend', () => {
      slot.classList.remove('feedback-correct', 'feedback-incorrect');
    }, { once: true });
  };

  const placeCardInSlot = (card, slot) => {
    const cardRect = card.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const dx = slotRect.left + slotRect.width / 2 - (cardRect.left + cardRect.width / 2);
    const dy = slotRect.top + slotRect.height / 2 - (cardRect.top + cardRect.height / 2);

    const { x, y } = getCardState(card);
    setCardState(card, x + dx, y + dy);

    const slotId = slot.dataset.slotId;
    const cardId = card.dataset.cardId;
    if (slot.dataset.assignedCard && slot.dataset.assignedCard !== cardId) {
      return false;
    }

    const isCorrect = slot.dataset.peakSlug === card.dataset.peakSlug;
    if (isCorrect) {
      slot.dataset.assignedCard = cardId;
      card.dataset.assignedSlot = slotId;
    }
    card.setAttribute('aria-grabbed', 'false');
    clearSelection();
    announce(isCorrect ? t('peakid.correctLabel') : t('peakid.incorrectLabel'));
    if (isCorrect) {
      slot.classList.remove('correct', 'incorrect');
      slot.classList.add('correct');
      addSlotFeedback(slot, true);
      animateSlotResult(slot, true);
      playCorrectSound();
    }

    if (!isCorrect) {
      state.struggledPeaks.add(card.getAttribute('aria-label'));
    }

    return isCorrect;
  };

  const clearSlotAssignment = (card) => {
    const slotId = card.dataset.assignedSlot;
    if (!slotId) return;
    const slot = getSlotById(slotId);
    if (slot) {
      if (card.dataset.countedCorrect === 'true') {
        state.roundCorrect = Math.max(0, state.roundCorrect - 1);
      }
      slot.dataset.assignedCard = '';
      slot.classList.remove('correct', 'incorrect');
    }
    card.dataset.assignedSlot = '';
    card.dataset.countedCorrect = '';
    updateScoreboard();
  };

  const enableSubmitIfReady = () => {
    const allPlaced = state.roundPlaced === PEAKS_PER_ROUND;
    elements.submitButton.disabled = !allPlaced;
  };

  const handleRoundSubmit = () => {
    playNextRoundSound();
    elements.submitButton.disabled = true;
    elements.submitButton.textContent = t('peakid.nextRound');

    const summary = t('peakid.roundSummary', {
      round: state.currentRoundIndex + 1,
      score: state.roundCorrect,
      total: PEAKS_PER_ROUND
    });
    elements.roundSummary.textContent = summary;

    state.totalCorrect += state.roundCorrect;
    state.totalIncorrect += state.roundIncorrect;
    state.roundCorrect = 0;
    state.roundIncorrect = 0;
    state.roundPlaced = 0;
    updateScoreboard();

    setTimeout(() => {
      state.currentRoundIndex += 1;
      if (state.currentRoundIndex >= state.rounds.length) {
        showFinalScreen();
        return;
      }
      renderRound();
    }, 1400);
  };

  const showFinalScreen = () => {
    document.querySelector('.peakid-main').style.display = 'none';
    elements.finalScreen.classList.add('active');
    elements.finalScreen.setAttribute('aria-hidden', 'false');
    playFinishSound();
    if (elements.splashBackground) {
      elements.splashBackground.classList.add('active');
    }
    const totalScore = state.totalCorrect;
    elements.finalScore.textContent = `${totalScore} / ${TOTAL_ROUNDS * PEAKS_PER_ROUND}`;
    elements.finalMessage.textContent = t('peakid.finalMessage', {
      score: totalScore,
      total: TOTAL_ROUNDS * PEAKS_PER_ROUND
    });
    updateSocialCardContent();
  };

  const resetGame = () => {
    state.currentRoundIndex = 0;
    state.totalCorrect = 0;
    state.totalIncorrect = 0;
    resetRoundStats();
    elements.submitButton.textContent = t('peakid.submit');
    elements.roundSummary.textContent = '';
    document.querySelector('.peakid-main').style.display = 'block';
    elements.finalScreen.classList.remove('active');
    elements.finalScreen.setAttribute('aria-hidden', 'true');
    if (elements.splashBackground) {
      elements.splashBackground.classList.remove('active');
    }
    renderRound();
  };

  const findSlotUnderPointer = (x, y) => {
    const slots = Array.from(elements.slots.querySelectorAll('.peakid-slot'));
    return slots.find(slot => {
      const rect = slot.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
  };

  const findSlotForCard = (card, x, y) => {
    const slots = Array.from(elements.slots.querySelectorAll('.peakid-slot'));
    const cardRect = card.getBoundingClientRect();
    let bestSlot = null;
    let bestScore = 0;

    slots.forEach(slot => {
      const rect = slot.getBoundingClientRect();
      const overlapX = Math.max(0, Math.min(cardRect.right, rect.right) - Math.max(cardRect.left, rect.left));
      const overlapY = Math.max(0, Math.min(cardRect.bottom, rect.bottom) - Math.max(cardRect.top, rect.top));
      const overlapArea = overlapX * overlapY;
      const slotArea = rect.width * rect.height;
      const score = slotArea ? overlapArea / slotArea : 0;
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    });

    if (bestSlot && bestScore >= 0.25) {
      return bestSlot;
    }

    return findSlotUnderPointer(x, y);
  };

  const animateInertia = (card, velocity) => {
    if (prefersReducedMotion()) {
      setCardState(card, 0, 0);
      return;
    }

    let { x, y } = getCardState(card);
    let vx = velocity.x;
    let vy = velocity.y;
    const start = performance.now();
    const bounds = elements.cards.getBoundingClientRect();

    const step = (now) => {
      const elapsed = now - start;
      if (elapsed > INERTIA_DURATION_MS) {
        card.style.transition = 'transform 0.3s ease';
        setCardState(card, 0, 0);
        setTimeout(() => {
          card.style.transition = '';
        }, 320);
        return;
      }

      vx *= INERTIA_FRICTION;
      vy *= INERTIA_FRICTION;
      x += vx;
      y += vy;

      const cardRect = card.getBoundingClientRect();
      const minX = bounds.left - cardRect.left;
      const maxX = bounds.right - cardRect.right;
      const minY = bounds.top - cardRect.top;
      const maxY = bounds.bottom - cardRect.bottom;

      x = Math.min(Math.max(x, minX), maxX);
      y = Math.min(Math.max(y, minY), maxY);

      setCardState(card, x, y);
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const resetCardPosition = (card) => {
    if (prefersReducedMotion()) {
      setCardState(card, 0, 0);
      return;
    }
    card.style.transition = 'transform 0.25s ease';
    setCardState(card, 0, 0);
    setTimeout(() => {
      card.style.transition = '';
    }, 260);
  };

  const showIncorrectFeedback = (slot) => {
    playIncorrectSound();
    slot.classList.add('incorrect');
    addSlotFeedback(slot, false);
    animateSlotResult(slot, false);
    setTimeout(() => {
      slot.classList.remove('incorrect');
    }, prefersReducedMotion() ? 350 : 900);
  };

  const initDragHandlers = (card) => {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocity = { x: 0, y: 0 };
    let moved = false;

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      clearSelection();
      if (card.dataset.assignedSlot) {
        clearSlotAssignment(card);
        state.roundPlaced = Math.max(0, state.roundPlaced - 1);
        enableSubmitIfReady();
        updateScoreboard();
      }
      pointerId = event.pointerId;
      card.setPointerCapture(pointerId);
      card.classList.add('dragging');
      card.setAttribute('aria-grabbed', 'true');
      startX = event.clientX;
      startY = event.clientY;
      downX = event.clientX;
      downY = event.clientY;
      moved = false;
      card.dataset.ignoreClick = 'false';
      const { x, y } = getCardState(card);
      lastX = x;
      lastY = y;
      lastTime = performance.now();
    };

    const onPointerMove = (event) => {
      if (pointerId !== event.pointerId) return;
      if (!moved) {
        const distance = Math.hypot(event.clientX - downX, event.clientY - downY);
        if (distance > 6) moved = true;
      }
      const now = performance.now();
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const { x, y } = getCardState(card);
      setCardState(card, x + dx, y + dy);
      startX = event.clientX;
      startY = event.clientY;

      const dt = now - lastTime || 16;
      velocity = {
        x: ((x + dx) - lastX) / dt * 16,
        y: ((y + dy) - lastY) / dt * 16
      };
      lastX = x + dx;
      lastY = y + dy;
      lastTime = now;

      const slot = findSlotForCard(card, event.clientX, event.clientY);
      elements.slots.querySelectorAll('.peakid-slot').forEach(el => {
        el.classList.toggle('highlight', el === slot && !el.dataset.assignedCard);
      });
    };

    const onPointerUp = (event) => {
      if (pointerId !== event.pointerId) return;
      card.releasePointerCapture(pointerId);
      pointerId = null;
      card.classList.remove('dragging');
      if (moved) {
        card.dataset.ignoreClick = 'true';
      }

      elements.slots.querySelectorAll('.peakid-slot').forEach(el => {
        el.classList.remove('highlight');
      });

      const slot = findSlotForCard(card, event.clientX, event.clientY);
      if (slot && !slot.dataset.assignedCard) {
        const correct = placeCardInSlot(card, slot);
        if (correct) {
          state.roundPlaced += 1;
          if (card.dataset.hadIncorrect !== 'true') {
            state.roundCorrect += 1;
            card.dataset.countedCorrect = 'true';
          } else {
            card.dataset.countedCorrect = 'false';
          }
          enableSubmitIfReady();
          updateScoreboard();
          return;
        }
        state.roundIncorrect += 1;
        card.dataset.hadIncorrect = 'true';
        showIncorrectFeedback(slot);
        resetCardPosition(card);
        updateScoreboard();
        return;
      }

      animateInertia(card, velocity);
    };

    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);
    card.addEventListener('dragstart', (event) => {
      event.preventDefault();
    });
    card.addEventListener('click', () => {
      if (card.dataset.ignoreClick === 'true') return;
      card.classList.toggle('flipped');
    });
    card.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      card.classList.toggle('flipped');
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (state.selectedCardId === card.dataset.cardId) {
          clearSelection();
          return;
        }
        if (card.dataset.assignedSlot) {
          clearSlotAssignment(card);
          state.roundPlaced = Math.max(0, state.roundPlaced - 1);
          enableSubmitIfReady();
        }
        clearSelection();
        state.selectedCardId = card.dataset.cardId;
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
      }
    });
  };

  const initSlotHandlers = (slot) => {
    slot.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (!state.selectedCardId) return;
      const card = document.querySelector(`[data-card-id="${state.selectedCardId}"]`);
      if (!card) return;
      if (slot.dataset.assignedCard) return;
      const correct = placeCardInSlot(card, slot);
      if (correct) {
        state.roundPlaced += 1;
        if (card.dataset.hadIncorrect !== 'true') {
          state.roundCorrect += 1;
          card.dataset.countedCorrect = 'true';
        } else {
          card.dataset.countedCorrect = 'false';
        }
        enableSubmitIfReady();
        updateScoreboard();
        return;
      }
      state.roundIncorrect += 1;
      card.dataset.hadIncorrect = 'true';
      showIncorrectFeedback(slot);
      resetCardPosition(card);
      updateScoreboard();
    });
  };

  const renderRound = () => {
    resetRoundStats();
    clearSelection();

    const round = state.rounds[state.currentRoundIndex];
    if (!round) return;

    const usedPhotos = new Set();
    const roundCards = round.map(peak => ({
      ...peak,
      photo: pickPhoto(peak.photos, usedPhotos)
    }));

    elements.cards.innerHTML = '';
    if (elements.slotsLeft) {
      elements.slotsLeft.innerHTML = '';
    }
    if (elements.slotsRight) {
      elements.slotsRight.innerHTML = '';
    }

    const shuffledNames = shuffle(roundCards);

    roundCards.forEach((peak, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'peakid-card';
      card.dataset.peakSlug = peak.slug;
      card.dataset.cardId = `card-${state.currentRoundIndex}-${index}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', peak.peakName);
      card.setAttribute('aria-grabbed', 'false');
      card.dataset.translateX = 0;
      card.dataset.translateY = 0;
      card.dataset.hadIncorrect = 'false';
      card.dataset.countedCorrect = '';

      const cardInner = document.createElement('div');
      cardInner.className = 'peakid-card-inner';

      const cardFront = document.createElement('div');
      cardFront.className = 'peakid-card-face peakid-card-front';

      const cardBack = document.createElement('div');
      cardBack.className = 'peakid-card-face peakid-card-back';

      const img = document.createElement('img');
      img.src = peak.photo ? peak.photo.url : '';
      img.alt = peak.photo ? (peak.photo.alt || peak.photo.altText || peak.peakName) : peak.peakName;
      img.loading = 'lazy';
      img.draggable = false;

      const rawCredit = peak.photo && (peak.photo.creditText || (peak.photo.iptc && peak.photo.iptc.creditText) || peak.photo.author);
      const credit = rawCredit ? rawCredit.replace(/©/g, '').trim() : '';
      const captureDate = peak.photo && peak.photo.captureDate ? new Date(peak.photo.captureDate) : null;
      const formattedDate = captureDate && !Number.isNaN(captureDate.getTime())
        ? captureDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : tf('peakid.unknownLabel', 'Unknown');
      const timeOfDay = peak.photo && peak.photo.timeOfDay ? peak.photo.timeOfDay : tf('peakid.unknownLabel', 'Unknown');
      const creditLine = credit || tf('peakid.unknownLabel', 'Unknown');

      const backTitle = document.createElement('h3');
      backTitle.textContent = tf('peakid.photoHints', 'Photo hints');

      const metaList = document.createElement('dl');
      metaList.className = 'peakid-card-meta';

      const addMeta = (label, value) => {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        metaList.appendChild(dt);
        metaList.appendChild(dd);
      };

      addMeta(tf('peakid.photoDate', 'Photo date'), formattedDate);
      addMeta(tf('peakid.timeOfDay', 'Time of day'), timeOfDay);
      addMeta(tf('peakid.photoCreditLabel', 'Credit'), creditLine);

      cardFront.appendChild(img);
      cardBack.appendChild(backTitle);
      cardBack.appendChild(metaList);
      cardInner.appendChild(cardFront);
      cardInner.appendChild(cardBack);
      card.appendChild(cardInner);
      elements.cards.appendChild(card);
      card.draggable = false;

      initDragHandlers(card);
    });

    const midpoint = Math.ceil(shuffledNames.length / 2);
    const slotColumns = [elements.slotsLeft, elements.slotsRight].filter(Boolean);

    shuffledNames.forEach((peak, index) => {
      const slot = document.createElement('div');
      slot.className = 'peakid-slot';
      slot.setAttribute('role', 'listitem');
      slot.setAttribute('tabindex', '0');
      slot.dataset.peakSlug = peak.slug;
      slot.dataset.slotId = `slot-${state.currentRoundIndex}-${index}`;
      slot.textContent = peak.peakName;
      const columnIndex = slotColumns.length === 2 && index >= midpoint ? 1 : 0;
      const targetColumn = slotColumns[columnIndex] || elements.slots;
      targetColumn.appendChild(slot);
      initSlotHandlers(slot);
    });

    elements.submitButton.textContent = t('peakid.submit');
    elements.submitButton.disabled = true;
    elements.roundSummary.textContent = '';
    updateScoreboard();
  };

  const buildRounds = (peaks) => {
    const shuffledPeaks = shuffle(peaks);
    const rounds = chunk(shuffledPeaks, PEAKS_PER_ROUND).slice(0, TOTAL_ROUNDS);
    return rounds.map(round => round.map(peak => ({
      slug: peak.slug || peak.peakName,
      peakName: peak.peakName,
      photos: peak.photos || []
    })));
  };

  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSocialImagePool = () => {
    const pool = [];
    state.rounds.flat().forEach(peak => {
      if (!Array.isArray(peak.photos)) return;
      peak.photos.forEach(photo => {
        if (photo && photo.url) {
          pool.push(photo.url);
        }
      });
    });
    return shuffle(pool);
  };

  const sharePlatforms = [
    {
      name: 'Facebook',
      category: 'major',
      buildUrl: share => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share.url)}`
    },
    {
      name: 'X',
      category: 'major',
      buildUrl: share => `https://twitter.com/intent/tweet?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.text)}`
    },
    {
      name: 'LinkedIn',
      category: 'major',
      buildUrl: share => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share.url)}`
    },
    {
      name: 'Reddit',
      category: 'major',
      buildUrl: share => `https://www.reddit.com/submit?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
    },
    {
      name: 'Email',
      category: 'major',
      buildUrl: share => `mailto:?subject=${encodeURIComponent(share.text)}&body=${encodeURIComponent(share.url)}`
    },
    {
      name: 'WhatsApp',
      category: 'major',
      buildUrl: share => `https://wa.me/?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
    },
    {
      name: 'Bluesky',
      category: 'major',
      buildUrl: share => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
    },
    {
      name: 'Threads',
      category: 'major',
      buildUrl: share => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
    },
    {
      name: 'Telegram',
      category: 'international',
      buildUrl: share => `https://t.me/share/url?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.text)}`
    },
    {
      name: 'Weibo',
      category: 'international',
      buildUrl: share => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
    },
    {
      name: 'VK',
      category: 'international',
      buildUrl: share => `https://vk.com/share.php?url=${encodeURIComponent(share.url)}`
    },
    {
      name: 'Line',
      category: 'international',
      buildUrl: share => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(share.url)}`
    },
    {
      name: 'KakaoTalk',
      category: 'international',
      buildUrl: share => `https://story.kakao.com/share?url=${encodeURIComponent(share.url)}`
    },
    {
      name: 'Mastodon',
      category: 'international',
      buildUrl: share => `https://mastodon.social/share?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
    },
    {
      name: 'Pocket',
      category: 'international',
      buildUrl: share => `https://getpocket.com/edit?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
    },
    {
      name: 'Tumblr',
      category: 'international',
      buildUrl: share => `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
    },
    {
      name: 'Pinterest',
      category: 'international',
      buildUrl: share => `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(share.url)}&description=${encodeURIComponent(share.text)}`
    },
    {
      name: 'SMS',
      category: 'international',
      buildUrl: share => `sms:?&body=${encodeURIComponent(`${share.text} ${share.url}`)}`
    }
  ];

  const buildShareButtons = () => {
    if (!elements.shareButtons) return;
    const majorContainer = elements.shareButtons.querySelector('.major-networks');
    const internationalContainer = elements.shareButtons.querySelector('.international-networks');
    if (!majorContainer || !internationalContainer) return;

    const total = TOTAL_ROUNDS * PEAKS_PER_ROUND;
    const share = {
      url: SOCIAL_CANONICAL_URL,
      text: t('peakid.socialShareText', { score: state.totalCorrect, total })
    };

    majorContainer.innerHTML = '';
    internationalContainer.innerHTML = '';

    sharePlatforms.forEach(platform => {
      const link = document.createElement('a');
      link.className = `share-button ${platform.category}`;
      link.href = platform.buildUrl(share);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = platform.name;
      link.setAttribute('aria-label', `${t('peakid.socialShareHeading')}: ${platform.name}`);

      if (platform.category === 'major') {
        majorContainer.appendChild(link);
      } else {
        internationalContainer.appendChild(link);
      }
    });
  };

  const syncSocialSettings = () => {
    if (!elements.socialSettingsShowScore) return;
    state.socialSettings.showScore = elements.socialSettingsShowScore.checked;
    state.socialSettings.showDate = elements.socialSettingsShowDate.checked;
    state.socialSettings.showName = elements.socialSettingsShowName.checked;
    state.socialSettings.useGradient = elements.socialSettingsUseGradient.checked;
    state.socialSettings.name = elements.socialSettingsNameInput.value.trim();
  };

  const initSocialCardSettings = () => {
    if (!elements.socialSettingsShowScore) return;
    elements.socialSettingsShowScore.checked = state.socialSettings.showScore;
    elements.socialSettingsShowDate.checked = state.socialSettings.showDate;
    elements.socialSettingsShowName.checked = state.socialSettings.showName;
    elements.socialSettingsUseGradient.checked = state.socialSettings.useGradient;
    elements.socialSettingsNameInput.value = state.socialSettings.name;

    const updateSettings = () => {
      syncSocialSettings();
      updateSocialCardContent();
    };

    elements.socialSettingsShowScore.addEventListener('change', updateSettings);
    elements.socialSettingsShowDate.addEventListener('change', updateSettings);
    elements.socialSettingsShowName.addEventListener('change', updateSettings);
    elements.socialSettingsUseGradient.addEventListener('change', updateSettings);
    elements.socialSettingsNameInput.addEventListener('input', updateSettings);
  };

  const updateSocialCardContent = () => {
    if (!elements.socialCard) return;
    syncSocialSettings();

    const pool = getSocialImagePool();
    let selected = pool.find(url => !state.usedSocialImages.has(url));
    if (!selected) {
      state.usedSocialImages.clear();
      selected = pool[0];
    }
    if (selected) {
      state.usedSocialImages.add(selected);
      state.currentSocialImage = selected;
    }

    elements.socialCard.style.backgroundImage = selected ? `url(${selected})` : 'none';
    elements.socialCard.classList.toggle('gradient', state.socialSettings.useGradient);
    elements.socialCardTitle.textContent = t('peakid.socialTitle');
    if (elements.socialCardScore) {
      elements.socialCardScore.hidden = !state.socialSettings.showScore;
      if (state.socialSettings.showScore) {
        elements.socialCardScore.textContent = t('peakid.socialPeaksIdentified', {
          score: state.totalCorrect,
          total: TOTAL_ROUNDS * PEAKS_PER_ROUND
        });
      }
    }
    if (elements.socialCardTimestamp) {
      elements.socialCardTimestamp.hidden = !state.socialSettings.showDate;
      if (state.socialSettings.showDate) {
        elements.socialCardTimestamp.textContent = `${t('peakid.socialTimestamp')}: ${formatTimestamp()}`;
      }
    }
    if (elements.socialCardName) {
      const hasName = state.socialSettings.showName && state.socialSettings.name;
      elements.socialCardName.hidden = !hasName;
      if (hasName) {
        elements.socialCardName.textContent = t('peakid.socialNameLine', {
          name: state.socialSettings.name
        });
      }
    }
    if (elements.socialCardLink) {
      const anchor = elements.socialCardLink.querySelector('a');
      if (anchor) {
        anchor.href = SOCIAL_CANONICAL_URL;
      }
    }
    buildShareButtons();
  };

  const updateSocialCardOrientation = (orientation) => {
    if (!elements.socialCard) return;
    elements.socialCard.classList.toggle('landscape', orientation === 'landscape');
    elements.socialCard.classList.toggle('portrait', orientation === 'portrait');
  };

  const initSocialCardHandlers = () => {
    elements.cardOrientationButtons.forEach(button => {
      button.addEventListener('click', () => {
        elements.cardOrientationButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        updateSocialCardOrientation(button.dataset.orientation);
      });
    });

    if (elements.regenCardButton) {
      elements.regenCardButton.addEventListener('click', () => {
        updateSocialCardContent();
      });
    }

    if (elements.downloadCardButton) {
      elements.downloadCardButton.addEventListener('click', async () => {
        if (!window.htmlToImage) return;
        const orientation = elements.socialCard.classList.contains('portrait')
          ? 'portrait'
          : 'landscape';
        const fileName = `nh48_peakid_score_${state.totalCorrect}_of_${TOTAL_ROUNDS * PEAKS_PER_ROUND}_${orientation}.png`;

        const dataUrl = await window.htmlToImage.toPng(elements.socialCard, { cacheBust: true });
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      });
    }
  };

  const init = async () => {
    try {
      const response = await fetch(DATA_PATH, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const peaks = Object.values(payload);
      state.rounds = buildRounds(peaks);
      renderRound();
      initSocialCardHandlers();
      initSocialCardSettings();
      buildShareButtons();
      if (window.NH48_I18N && window.NH48_I18N.onLangChange) {
        window.NH48_I18N.onLangChange(() => {
          updateScoreboard();
          elements.submitButton.textContent = t('peakid.submit');
          updateSocialCardContent();
          buildShareButtons();
        });
      }
    } catch (error) {
      console.error('Failed to load NH48 dataset.', error);
    }
  };

  if (elements.submitButton) {
    elements.submitButton.addEventListener('click', handleRoundSubmit);
  }

  if (elements.restartButton) {
    elements.restartButton.addEventListener('click', resetGame);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
