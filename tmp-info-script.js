
      let canonicalRanges = [];

      const peakSlugOverrides = {
        'South Twin': 'south-twin-mountain',
        'North Twin': 'north-twin-mountain',
        'Middle Carter': 'middle-carter-mountain',
        'South Carter': 'south-carter-mountain',
        'Wildcat A': 'wildcat-mountain-a',
        'Wildcat D': 'wildcat-mountain-d',
        'East Osceola': 'mount-osceola-east',
        'North Hancock': 'mount-hancock',
        'South Hancock': 'mount-hancock-south',
        'North Kinsman': 'north-kinsman-mountain',
        'South Kinsman': 'south-kinsman-mountain'
      };

      let rangeOrder = ['All'];
      let rangeDescriptions = {};
      let rangeLookup = {};
      let rangeColors = {};
      const selectedRanges = new Set();
      let selectedPeakSlug = null;

      const RISK_PALETTE = {
        AboveTreelineExposure: '#f97316',
        LongBailout: '#f59e0b',
        LimitedWater: '#facc15',
        ScrambleSteep: '#fb7185',
        UnbridgedRiverCrossings: '#38bdf8',
        NoCellService: '#94a3b8'
      };

      const RISK_PRIORITY = [
        'AboveTreelineExposure',
        'LongBailout',
        'LimitedWater',
        'ScrambleSteep',
        'UnbridgedRiverCrossings',
        'NoCellService'
      ];

      const RISK_LABELS = {
        AboveTreelineExposure: 'Above-treeline exposure',
        LongBailout: 'Long bailout',
        LimitedWater: 'Limited water',
        ScrambleSteep: 'Scramble / steep',
        UnbridgedRiverCrossings: 'Unbridged crossings',
        NoCellService: 'Especially Unreliable Cell Service'
      };
      const ALLOWED_RISKS = new Set(RISK_PRIORITY);

      const activeRiskFilters = new Set();
      let riskFiltersEnabled = false;
      let riskButtons = [];

      const buildRangeLookup = (data) => {
        const nameToSlug = {};
        Object.values(data).forEach((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          if (entry.peakName) nameToSlug[entry.peakName] = slug;
          if (entry['Peak Name']) nameToSlug[entry['Peak Name']] = slug;
        });

        const lookup = {};
        canonicalRanges.forEach((range) => {
          range.peaks.forEach((peakName) => {
            const slug = peakSlugOverrides[peakName] || nameToSlug[peakName];
            if (slug) {
              lookup[slug] = range.name;
            }
          });
        });
        return lookup;
      };

      function setRangeData(ranges) {
        canonicalRanges = ranges;
        rangeOrder = ['All', ...canonicalRanges.map((range) => range.name)];
        rangeDescriptions = canonicalRanges.reduce((acc, range) => {
          acc[range.name] = range.description;
          return acc;
        }, {});
        rangeColors = canonicalRanges.reduce((acc, range) => {
          acc[range.name] = range.color || '#22c55e';
          return acc;
        }, {});
      }

      function loadRanges() {
        return fetch('/data/wmnf-ranges.json', { headers: { 'Accept': 'application/json' } })
          .then((response) => (response.ok ? response.json() : Promise.reject(response)))
          .then((ranges) => {
            const resolved = Object.values(ranges).map((range) => ({
              name: range.rangeName,
              peaks: range.peakList,
              description: range.description,
              color: range.color
            }));
            setRangeData(resolved);
          })
          .catch((err) => {
            console.error('Failed to load range data', err);
            setRangeData([]);
          });
      }

      const difficultyMap = {
        'mount-tecumseh': 'beginner',
        'mount-waumbek': 'beginner',
        'mount-pierce': 'beginner',
        'mount-jackson': 'beginner',
        'mount-osceola': 'beginner',
        'mount-hale': 'beginner',
        'mount-carrigain': 'challenging',
        'owls-head': 'challenging',
        'mount-isolation': 'challenging',
        'mount-whiteface': 'challenging',
        'mount-passaconaway': 'challenging',
        'wildcat-mountain-a': 'challenging',
        'wildcat-mountain-d': 'challenging',
        'mount-washington': 'severe',
        'mount-adams': 'severe',
        'mount-jefferson': 'severe',
        'mount-madison': 'severe',
        'mount-lafayette': 'severe',
        'mount-lincoln': 'severe',
        'bondcliff': 'severe',
        'mount-monroe': 'severe'
      };

      const difficultyOrder = ['beginner', 'moderate', 'challenging', 'severe'];

      let peaks = [];
      let currentRange = 'All';
      let sortState = {
        key: 'name',
        direction: 'asc',
        difficultyPriority: null
      };
      let itemListSchemaEl;

      const seasonRows = {
        summer: [
          ['Trail access', 'Many trailheads open after mud season, but check WMNF alerts and AMC updates for closures or construction detours.'],
          ['Gear', 'Light layers, sun protection, bug netting in early summer, and traction for lingering monorail snow.'],
          ['Strategy', 'Long days allow big mileage, but plan early starts for exposed ridges and carry a headlamp for storm delays.'],
          ['Road notes', 'Tripoli Road (Tecumseh/Osceola) and Zealand Road often open after mud season; confirm status with official updates.'],
          ['Navigation', 'Above-treeline routes on Washington, Jefferson, and Adams require careful rock hopping, bailout awareness, and staying on trail to protect fragile alpine terrain.'],
          ['Additional hazards', 'Thunderstorms, heat exhaustion, and biting insects are common; check the Mt. Washington Observatory forecast before committing to exposed routes.']
        ],
        fall: [
          ['Trail access', 'Roads and trailheads remain mostly open through mid-October, but gate closures begin after Columbus Day; leaf-peeper traffic can crowd parking. Expect first snows above 3,500 ft by November and occasional maintenance closures.'],
          ['Gear', 'Dress for variable conditions with warm layers, hats, and gloves; pack rain gear and waterproof boots for wet leaves and early snow. Carry microspikes by late fall and wear blaze orange during hunting season (mid-Oct to Dec).'],
          ['Strategy', 'Shorter days demand early starts and a headlamp; plan to be off exposed ridges by mid-afternoon and avoid steep leaf-covered descents in the dark.'],
          ['Road notes', 'Seasonal roads like Tripoli Road and Zealand Road often close in mid-October; the Kancamagus Highway remains open year-round. Check NH DOT or WMNF for closure dates.'],
          ['Navigation', 'Fallen leaves hide rocks, roots, and wet ledges, and above-treeline trails can ice early; carry traction, map, and GPS and verify junctions.'],
          ['Additional hazards', 'Hunting season and early freezes raise hypothermia risk after sunset; keep dogs visible and confirm conditions with the AMC, WMNF, and Mt. Washington Observatory.']
        ],
        winter: [
          ['Trail access', 'Gated roads (Zealand, Tripoli, Sawyer River) often add miles to Osceola, Zealand, and Carrigain; verify current access with WMNF and AMC updates.'],
          ['Gear', 'Snowshoes (when depth >8"), microspikes, goggles, four-season shells, and hot backups for electronics.'],
          ['Strategy', 'Short daylight usually demands pre-dawn starts and a headlamp; sheltered routes (Pierce, Waumbek, Tecumseh) are popular in high winds.'],
          ['Road notes', 'Cog Railway and Cannon tram do not count toward AMC credit; plan self-propelled ascents from winter lots.'],
          ['Navigation', 'Whiteouts on the Presidential Range make cairn-to-cairn travel hazardous; carry map, compass, and GPX and stay on trail to protect alpine terrain.'],
          ['Additional hazards', 'Frostbite, avalanches, and ice dams are real risks; review avalanche bulletins and the Mt. Washington Observatory forecast before committing.']
        ],
        spring: [
          ['Trail access', 'Mud season limits access: many USFS roads (Tripoli, Zealand, Sawyer River) remain gated until late May, adding miles to peaks like Osceola, Carrigain, and Zealand. Some trails close temporarily to protect them from erosion. Snowpack persists on north-facing slopes into June and water crossings may be high.'],
          ['Gear', 'Prepare for shoulder-season conditions: winter traction remains necessary (snowshoes early, microspikes later). Waterproof boots, gaiters, and dry socks are essential; pack insect repellent for black flies and mosquitoes in May and June and do tick checks after hikes.'],
          ['Strategy', 'Plan for slow travel on rotten snow and mud, start early to cross swollen streams before afternoon melt, and favor south-facing routes for less snow. Carry a headlamp as days lengthen but weather remains volatile.'],
          ['Road notes', 'Gated roads add 2-4 miles to Osceola, Zealand, Carrigain, and Hale approaches. The Mount Washington Auto Road and Cannon Tramway may be closed for spring maintenance; mechanical ascents do not count toward AMC credit anyway.'],
          ['Navigation', "Snow bridges can collapse as thaw progresses; have backup routes for impassable crossings. Deep snow hides trail corridors, so use GPS tracks and a compass and watch for avalanche danger in steep gullies like Tuckerman's Ravine."],
          ['Additional hazards', 'Deep mud causes erosion, so hike through the center of muddy sections. Black flies peak in late May and June and ticks can carry Lyme disease; treat clothing with permethrin and confirm conditions with WMNF alerts.']
        ]
      };

      function parseCoords(coordString) {
        if (!coordString || typeof coordString !== 'string' || !coordString.includes(',')) return null;
        const [lat, lon] = coordString.split(',').map((v) => parseFloat(v.trim()));
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
        return null;
      }

      function buildFallbackCoords(data) {
        if (!data) return {};
        const lookup = {};
        Object.values(data).forEach((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const coords = parseCoords(entry.Coordinates);
          if (slug && coords) {
            lookup[slug] = coords;
          }
        });
        return lookup;
      }

      function loadFallbackCoords() {
        return fetch('/data/nh48.json', { headers: { 'Accept': 'application/json' } })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => (data ? buildFallbackCoords(data) : null))
          .catch(() => null);
      }

      function hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(239, 68, 68, ${alpha})`;
        let value = hex.replace('#', '').trim();
        if (value.length === 3) {
          value = value.split('').map((c) => c + c).join('');
        }
        if (value.length !== 6) return `rgba(239, 68, 68, ${alpha})`;
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        if ([r, g, b].some((v) => Number.isNaN(v))) return `rgba(239, 68, 68, ${alpha})`;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }

      function peakMatchesRisk(peak) {
        if (!activeRiskFilters.size) return true;
        const factors = Array.isArray(peak.riskFactors) ? peak.riskFactors : [];
        return Array.from(activeRiskFilters).every((risk) => factors.includes(risk));
      }

      function filterPeaksByRisk(list) {
        if (!activeRiskFilters.size) return list;
        return list.filter(peakMatchesRisk);
      }

      function getRiskColorForPeak(peak) {
        if (!activeRiskFilters.size) return null;
        const factors = Array.isArray(peak.riskFactors) ? peak.riskFactors : [];
        for (const risk of RISK_PRIORITY) {
          if (activeRiskFilters.has(risk) && factors.includes(risk)) {
            return RISK_PALETTE[risk] || '#ef4444';
          }
        }
        return null;
      }

      function getPeakColor(peak) {
        const riskColor = getRiskColorForPeak(peak);
        return riskColor || rangeColors[peak.range] || '#22c55e';
      }

      function updateRiskButtonStates() {
        if (!riskButtons.length) return;
        riskButtons.forEach((btn) => {
          const risk = btn.dataset.risk;
          if (risk && RISK_PALETTE[risk]) {
            btn.style.setProperty('--risk-color', RISK_PALETTE[risk]);
          }
          const isActive = activeRiskFilters.has(risk);
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }

      function setRiskFiltersEnabled(enabled) {
        riskFiltersEnabled = enabled;
        if (!riskButtons.length) return;
        riskButtons.forEach((btn) => {
          btn.classList.toggle('is-disabled', !enabled);
          btn.setAttribute('aria-disabled', !enabled ? 'true' : 'false');
          if (!enabled) {
            btn.classList.remove('is-active');
            btn.setAttribute('aria-pressed', 'false');
          }
        });
      }

      function updateRiskCounts() {
        if (!riskButtons.length) return;
        riskButtons.forEach((btn) => {
          const risk = btn.dataset.risk;
          const valueEl = btn.querySelector('.risk-value');
          if (!valueEl) return;
          const count = peaks.filter((peak) => Array.isArray(peak.riskFactors) && peak.riskFactors.includes(risk)).length;
          valueEl.textContent = `${count} Peaks`;
        });
      }

      function setupRiskFilters() {
        riskButtons = Array.from(document.querySelectorAll('.risk-box[data-risk]'));
        if (!riskButtons.length) return;
        riskButtons.forEach((btn) => {
          const risk = btn.dataset.risk;
          if (risk && RISK_PALETTE[risk]) {
            btn.style.setProperty('--risk-color', RISK_PALETTE[risk]);
          }
          btn.addEventListener('click', () => {
            if (!riskFiltersEnabled) return;
            if (activeRiskFilters.has(risk)) {
              activeRiskFilters.delete(risk);
            } else {
              activeRiskFilters.add(risk);
            }
            selectedPeakSlug = null;
            updateRiskButtonStates();
            renderPeakTable();
            scheduleMapRender();
          });
        });
        setRiskFiltersEnabled(false);
        updateRiskButtonStates();
      }

      function getRange(entry, slug) {
        if (rangeLookup[slug]) return rangeLookup[slug];
        const range = entry['Range / Subrange'];
        if (range && typeof range === 'string') {
          const normalized = range.toLowerCase();
          if (normalized.includes('presidential')) return 'Presidential Range';
          if (normalized.includes('franconia')) return 'Franconia Range';
          if (normalized.includes('kinsman') || normalized.includes('moosilauke') || normalized.includes('cannon')) return 'Kinsman Range';
          if (normalized.includes('carter') || normalized.includes('moriah') || normalized.includes('wildcat')) return 'Carter-Moriah Range';
          if (normalized.includes('twin') || normalized.includes('bond')) return 'Twin Range';
          if (normalized.includes('willey') || normalized.includes('field') || normalized.includes('tom')) return 'Willey Range';
          if (normalized.includes('pilot') || normalized.includes('pliny') || normalized.includes('kilkenny') || normalized.includes('cabot') || normalized.includes('waumbek')) {
            return 'Pilotâ€“Pliny Range';
          }
          if (normalized.includes('sandwich') || normalized.includes('waterville') || normalized.includes('osceola') || normalized.includes('tripyramid') || normalized.includes('tecumseh') || normalized.includes('passaconaway') || normalized.includes('whiteface')) {
            return 'Sandwich / Waterville Range';
          }
          if (normalized.includes('pemigewasset') || normalized.includes('pemi') || normalized.includes('wilderness')) return 'Pemigewasset Wilderness';
        }
        return 'Pemigewasset Wilderness';
      }

      function renderRangeFilters() {
        const container = document.getElementById('rangeFilters');
        container.innerHTML = '';
        rangeOrder.forEach((label) => {
          const btn = document.createElement('button');
          btn.className = `chip ${currentRange === label ? 'active' : ''}`;
          btn.type = 'button';
          btn.textContent = label;
          btn.dataset.range = label;
          btn.setAttribute('aria-pressed', currentRange === label ? 'true' : 'false');
          btn.setAttribute('aria-controls', 'peakTableBody');
          btn.addEventListener('click', () => {
            currentRange = label;
            selectedRanges.clear();
            selectedPeakSlug = null;
            renderRangeFilters();
            renderRangeList();
            renderPeakTable();
            scheduleMapRender();
          });
          container.appendChild(btn);
        });
      }

      function renderRangeList() {
        const list = document.getElementById('rangeList');
        list.innerHTML = '';
        rangeOrder.filter((r) => r !== 'All').forEach((range) => {
          const card = document.createElement('button');
          card.className = 'range-card';
          card.type = 'button';
          const isActive = selectedRanges.has(range);
          card.classList.toggle('active', isActive);
          card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          const desc = rangeDescriptions[range] || '';
          card.setAttribute('aria-label', desc ? `${range}. ${desc}` : range);
          if (desc) card.setAttribute('title', desc);

          const nameWrap = document.createElement('span');
          nameWrap.style.display = 'inline-flex';
          nameWrap.style.alignItems = 'center';
          nameWrap.style.gap = '8px';

          const dot = document.createElement('span');
          dot.className = 'range-card__dot';
          dot.style.background = rangeColors[range] || '#22c55e';

          const label = document.createElement('span');
          label.className = 'range-card__name';
          label.textContent = range;

          const hiddenDesc = document.createElement('span');
          hiddenDesc.className = 'sr-only';
          hiddenDesc.textContent = desc;

          const status = document.createElement('span');
          status.className = 'range-card__chip';
          status.textContent = isActive ? 'Selected' : 'Select';

          nameWrap.appendChild(dot);
          nameWrap.appendChild(label);
          nameWrap.appendChild(hiddenDesc);
          card.appendChild(nameWrap);
          card.appendChild(status);
          card.addEventListener('click', () => {
            if (selectedRanges.has(range)) {
              selectedRanges.delete(range);
            } else {
              selectedRanges.add(range);
            }
            selectedPeakSlug = null;
            renderRangeList();
            scheduleMapRender();
          });
          list.appendChild(card);
        });
      }

      function focusMapOnPeak(peak) {
        if (!peak) return;
        selectedPeakSlug = peak.slug;
        selectedRanges.clear();
        currentRange = 'All';
        renderRangeFilters();
        renderRangeList();
        scheduleMapRender();
        const mapSection = document.getElementById('range-map');
        if (mapSection) {
          mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      function renderPeakTable() {
        const tbody = document.getElementById('peakTableBody');
        tbody.innerHTML = '';
        let filtered = currentRange === 'All' ? peaks : peaks.filter((p) => p.range === currentRange);
        filtered = filterPeaksByRisk(filtered);
        const sorted = [...filtered].sort((a, b) => {
          if (sortState.key === 'elevation') {
            const aVal = a.elevation ?? (sortState.direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
            const bVal = b.elevation ?? (sortState.direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
            return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          if (sortState.key === 'range') {
            const rangeCompare = a.range.localeCompare(b.range);
            return sortState.direction === 'asc' ? rangeCompare || a.name.localeCompare(b.name) : (rangeCompare || a.name.localeCompare(b.name)) * -1;
          }
          if (sortState.key === 'difficulty') {
            const baseRank = (value) => {
              const idx = difficultyOrder.indexOf(value);
              return idx === -1 ? difficultyOrder.length : idx;
            };
            const aRank = baseRank(a.difficulty) + (sortState.difficultyPriority === a.difficulty ? -1 : 0);
            const bRank = baseRank(b.difficulty) + (sortState.difficultyPriority === b.difficulty ? -1 : 0);
            if (aRank !== bRank) return aRank - bRank;
            return a.name.localeCompare(b.name);
          }
          return a.name.localeCompare(b.name);
        });
        if (!sorted.length) {
          tbody.innerHTML = '<tr><td colspan="5">No peaks match the current filters.</td></tr>';
          updateSortIndicators();
          return;
        }

        sorted.forEach((peak) => {
          const tr = document.createElement('tr');
          tr.classList.add(`tier-${peak.difficulty}`);
          const riskColor = getRiskColorForPeak(peak);
          if (riskColor) {
            tr.classList.add('hazard-row');
            tr.style.setProperty('--hazard-color', riskColor);
            tr.style.setProperty('--hazard-bg', hexToRgba(riskColor, 0.08));
            tr.style.setProperty('--hazard-bg-hover', hexToRgba(riskColor, 0.16));
          }
          const peakCell = document.createElement('td');
          const link = document.createElement('a');
          link.href = `/peak/${peak.slug}/`;
          link.textContent = peak.name;
          peakCell.appendChild(link);

          const elevCell = document.createElement('td');
          elevCell.textContent = peak.elevation ? peak.elevation.toLocaleString() : 'â€”';

          const rangeCell = document.createElement('td');
          rangeCell.textContent = peak.range;

          const diffCell = document.createElement('td');
          const difficultyBadge = document.createElement('span');
          difficultyBadge.className = `difficulty-badge tier-${peak.difficulty}`;
          difficultyBadge.textContent = `${peak.difficulty.charAt(0).toUpperCase()}${peak.difficulty.slice(1)}`;
          diffCell.appendChild(difficultyBadge);

          const actionCell = document.createElement('td');
          const actionWrap = document.createElement('div');
          actionWrap.className = 'table-actions';
          const viewLink = document.createElement('a');
          viewLink.className = 'table-action';
          viewLink.href = `/peak/${peak.slug}/`;
          viewLink.textContent = 'Details';
          viewLink.setAttribute('aria-label', `Open ${peak.name} detail page`);
          const mapBtn = document.createElement('button');
          mapBtn.className = 'table-action';
          mapBtn.type = 'button';
          mapBtn.textContent = 'Map';
          mapBtn.setAttribute('aria-label', `Show ${peak.name} on the map`);
          mapBtn.addEventListener('click', () => focusMapOnPeak(peak));
          actionWrap.appendChild(viewLink);
          actionWrap.appendChild(mapBtn);
          actionCell.appendChild(actionWrap);

          tr.appendChild(peakCell);
          tr.appendChild(elevCell);
          tr.appendChild(rangeCell);
          tr.appendChild(diffCell);
          tr.appendChild(actionCell);
          tbody.appendChild(tr);
        });
        updateSortIndicators();
      }
      let mapRenderQueued = false;
      let mapResizeObserver = null;
      let leafletMap = null;
      let leafletLayer = null;
      let leafletStylizedLayer = null;
      let leafletMarkers = null;
      let leafletBounds = null;
      let activeMapStyle = 'osm';
      const STYLIZED_TILE_FILTER = 'brightness(0.4) invert(1) contrast(2)';

      function scheduleMapRender() {
        if (mapRenderQueued) return;
        mapRenderQueued = true;
        requestAnimationFrame(() => {
          mapRenderQueued = false;
          renderMap();
        });
      }

      function getActiveMapRanges() {
        if (selectedPeakSlug) return [];
        if (selectedRanges.size > 0) return Array.from(selectedRanges);
        if (currentRange && currentRange !== 'All') return [currentRange];
        return [];
      }

      function updateMapLegend(activeRanges, peakFocus) {
        const legendLabel = document.getElementById('mapLegendLabel');
        const legendItems = document.getElementById('mapLegendItems');
        const legendDot = document.getElementById('mapLegendDot');
        if (legendItems) legendItems.innerHTML = '';
        const activeRisks = RISK_PRIORITY.filter((risk) => activeRiskFilters.has(risk));
        if (peakFocus) {
          if (legendLabel) legendLabel.textContent = `NH48 Summit: ${peakFocus.name}`;
          if (legendDot) legendDot.style.background = getPeakColor(peakFocus);
          return;
        }
        if (activeRisks.length) {
          const labels = activeRisks.map((risk) => RISK_LABELS[risk] || risk);
          if (legendLabel) legendLabel.textContent = `Risk Filters: ${labels.join(', ')}`;
          if (legendDot) {
            legendDot.style.background = activeRisks.length === 1 ? (RISK_PALETTE[activeRisks[0]] || '#ef4444') : '#94a3b8';
          }
          if (!legendItems) return;
          activeRisks.forEach((risk) => {
            const item = document.createElement('span');
            item.className = 'map-legend-item';
            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.background = RISK_PALETTE[risk] || '#ef4444';
            const label = document.createElement('span');
            label.textContent = RISK_LABELS[risk] || risk;
            item.appendChild(dot);
            item.appendChild(label);
            legendItems.appendChild(item);
          });
          return;
        }
        if (!activeRanges.length) {
          if (legendLabel) legendLabel.textContent = 'NH48 Summits (All ranges)';
          if (legendDot) legendDot.style.background = '#22c55e';
          return;
        }
        if (legendLabel) legendLabel.textContent = 'NH48 Summits (Selected ranges)';
        if (legendDot) legendDot.style.background = '#94a3b8';
        if (!legendItems) return;
        activeRanges.forEach((range) => {
          const item = document.createElement('span');
          item.className = 'map-legend-item';
          const dot = document.createElement('span');
          dot.className = 'legend-dot';
          dot.style.background = rangeColors[range] || '#22c55e';
          const label = document.createElement('span');
          label.textContent = range;
          item.appendChild(dot);
          item.appendChild(label);
          legendItems.appendChild(item);
        });
      }

      function getFilteredMapPeaks() {
        const coords = peaks.filter((p) => p.coords);
        const activeRanges = getActiveMapRanges();
        const peakFocus = selectedPeakSlug ? peaks.find((p) => p.slug === selectedPeakSlug) : null;
        let filtered = coords;
        if (peakFocus) {
          filtered = coords.filter((p) => p.slug === selectedPeakSlug);
        } else {
          filtered = filterPeaksByRisk(coords);
          if (activeRanges.length) {
            filtered = filtered.filter((p) => activeRanges.includes(p.range));
          }
        }
        return { coords, filtered, activeRanges, peakFocus };
      }

      function renderMap() {
        const map = document.getElementById('peakMap');
        if (map) map.innerHTML = '';
        const { coords, filtered, activeRanges, peakFocus } = getFilteredMapPeaks();
        updateMapLegend(activeRanges, peakFocus);
        renderLeafletMap(filtered);
      }

      function renderSeasonTable(season) {
        const tbody = document.getElementById('seasonRows');
        const heading = document.getElementById('seasonHeading');
        const seasonLabels = {
          summer: 'Summer',
          fall: 'Fall',
          winter: 'Winter',
          spring: 'Spring'
        };
        heading.textContent = `${seasonLabels[season] || 'Summer'} Strategy`;
        tbody.innerHTML = '';
        seasonRows[season].forEach(([topic, detail]) => {
          const tr = document.createElement('tr');
          const t1 = document.createElement('td');
          t1.textContent = topic;
          const t2 = document.createElement('td');
          t2.textContent = detail;
          tr.appendChild(t1);
          tr.appendChild(t2);
          tbody.appendChild(tr);
        });
      }

      function updateSeasonToggle(season) {
        const seasonButtons = {
          summer: document.getElementById('summerBtn'),
          fall: document.getElementById('fallBtn'),
          winter: document.getElementById('winterBtn'),
          spring: document.getElementById('springBtn')
        };
        Object.entries(seasonButtons).forEach(([key, button]) => {
          if (!button) return;
          const isActive = season === key;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
          button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }

      function renderDataLoadError(message) {
        setRiskFiltersEnabled(false);
        document.getElementById('peakTableBody').innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
        const map = document.getElementById('peakMap');
        map.innerHTML = '<text x="10" y="30" fill="#cbd5e1">Map data unavailable.</text>';
        renderLeafletMap([]);
      }

      function observeMapResize() {
        if (mapResizeObserver) return;
        const map = document.getElementById('peakMap');
        if (!map || typeof ResizeObserver === 'undefined') return;
        mapResizeObserver = new ResizeObserver(() => {
          scheduleMapRender();
        });
        mapResizeObserver.observe(map);
      }

      function initLeafletMap() {
        if (leafletMap || typeof L === 'undefined') return;
        const container = document.getElementById('peakMapLeaflet');
        if (!container) return;
        leafletMap = L.map(container, {
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: true,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false
        });
        leafletLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: 'Map data (c) OpenStreetMap contributors, SRTM | Tiles (c) OpenTopoMap'
        }).addTo(leafletMap);
        leafletStylizedLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: 'Map data (c) OpenStreetMap contributors, SRTM | Tiles (c) OpenTopoMap'
        });
        leafletStylizedLayer.on('tileload', (event) => {
          if (!event?.tile) return;
          event.tile.style.filter = STYLIZED_TILE_FILTER;
        });
        leafletMarkers = L.layerGroup().addTo(leafletMap);
      }

      function setLeafletMapHint(message) {
        if (!leafletMap) return;
        const container = leafletMap.getContainer();
        if (!container) return;
        let hint = container.querySelector('.map-empty-hint');
        if (!message) {
          if (hint) hint.remove();
          return;
        }
        if (!hint) {
          hint = document.createElement('div');
          hint.className = 'map-empty-hint';
          Object.assign(hint.style, {
            position: 'absolute',
            left: '12px',
            top: '12px',
            zIndex: '500',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.78)',
            color: '#cbd5e1',
            fontSize: '0.82rem',
            pointerEvents: 'none'
          });
          container.appendChild(hint);
        }
        hint.textContent = message;
      }

      function renderLeafletMap(points) {
        initLeafletMap();
        if (!leafletMap || !leafletMarkers) return;
        leafletMarkers.clearLayers();
        if (!points || !points.length) {
          const hasCoords = peaks.some((peak) => peak.coords);
          setLeafletMapHint(hasCoords ? 'No peaks match the current filters.' : 'No coordinate data available.');
          return;
        }
        setLeafletMapHint('');
        const isPeakFocus = points.length === 1 && selectedPeakSlug && points[0]?.slug === selectedPeakSlug;
        const latLngs = points.map((peak) => {
          const color = getPeakColor(peak);
          const latLng = [peak.coords.lat, peak.coords.lon];
          const marker = L.circleMarker(latLng, {
            radius: isPeakFocus ? 7 : 5,
            color: '#0b1220',
            weight: 1,
            fillColor: color,
            fillOpacity: 0.95
          });
          marker.bindTooltip(peak.name, { direction: 'top', offset: [0, -6], opacity: 0.9 });
          marker.on('click', () => {
            window.open(`/peak/${peak.slug}/`, '_blank');
          });
          marker.addTo(leafletMarkers);
          return latLng;
        });
        leafletBounds = L.latLngBounds(latLngs);
        leafletMap.fitBounds(leafletBounds.pad(0.2), { animate: false });
      }

      function setMapStyle(style) {
        activeMapStyle = style;
        const stylizedBtn = document.getElementById('mapStyleStylized');
        const osmBtn = document.getElementById('mapStyleOsm');
        const svgMap = document.getElementById('peakMap');
        const leafletEl = document.getElementById('peakMapLeaflet');
        if (stylizedBtn && osmBtn) {
          stylizedBtn.classList.toggle('active', style === 'stylized');
          osmBtn.classList.toggle('active', style === 'osm');
          stylizedBtn.setAttribute('aria-selected', style === 'stylized' ? 'true' : 'false');
          osmBtn.setAttribute('aria-selected', style === 'osm' ? 'true' : 'false');
        }
        if (svgMap && leafletEl) {
          svgMap.style.display = 'none';
          leafletEl.style.display = 'block';
        }
        initLeafletMap();
        if (leafletMap && leafletLayer && leafletStylizedLayer) {
          if (style === 'stylized') {
            if (leafletMap.hasLayer(leafletLayer)) {
              leafletMap.removeLayer(leafletLayer);
            }
            if (!leafletMap.hasLayer(leafletStylizedLayer)) {
              leafletStylizedLayer.addTo(leafletMap);
            }
          } else {
            if (leafletMap.hasLayer(leafletStylizedLayer)) {
              leafletMap.removeLayer(leafletStylizedLayer);
            }
            if (!leafletMap.hasLayer(leafletLayer)) {
              leafletLayer.addTo(leafletMap);
            }
          }
          setTimeout(() => {
            if (leafletMap) {
              leafletMap.invalidateSize();
              if (leafletBounds) {
                leafletMap.fitBounds(leafletBounds.pad(0.2), { animate: false });
              }
            }
          }, 60);
        }
        const { filtered } = getFilteredMapPeaks();
        renderLeafletMap(filtered);
      }

      function renderItemListSchema() {
        if (itemListSchemaEl) itemListSchemaEl.remove();
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        const itemList = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'NH48 Peaks',
          description: 'Community directory of the New Hampshire 4,000-footers with links to every peak detail page; confirm details with the AMC.',
          numberOfItems: peaks.length,
          itemListOrder: 'Ascending',
          itemListElement: peaks.map((peak, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: peak.name,
            url: `https://nh48.info/peak/${peak.slug}/`,
            description: `${peak.range} peak`
          }))
        };
        script.textContent = JSON.stringify(itemList, null, 2);
        document.body.appendChild(script);
        itemListSchemaEl = script;
      }

      function setupTocObserver() {
        const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
        const sections = links
          .map((link) => document.querySelector(link.getAttribute('href')))
          .filter(Boolean);
        if (!links.length || !sections.length) return;

        const setActive = (id) => {
          links.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('active', isActive);
            if (isActive) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        };

        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible?.target?.id) setActive(visible.target.id);
          },
          { rootMargin: '-25% 0px -60% 0px', threshold: [0.1, 0.4, 0.7] }
        );

        sections.forEach((section) => observer.observe(section));
      }

      function updateSortIndicators() {
        document.querySelectorAll('th[data-sort-key]').forEach((th) => {
          const key = th.dataset.sortKey;
          const isActive = sortState.key === key;
          th.setAttribute('aria-sort', isActive ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none');
          const indicator = th.querySelector('.sort-indicator');
          if (indicator) {
            indicator.textContent = isActive ? (sortState.direction === 'asc' ? 'â–²' : 'â–¼') : '';
          }
        });
      }

      function hydratePeaks(data, overlay, fallbackCoords) {
        rangeLookup = buildRangeLookup(data);
        peaks = Object.values(data).map((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const overlayEntry = overlay && overlay[slug] ? overlay[slug] : null;
          const overlayLat = overlayEntry && Number.isFinite(overlayEntry.latitude) ? overlayEntry.latitude : null;
          const overlayLon = overlayEntry && Number.isFinite(overlayEntry.longitude) ? overlayEntry.longitude : null;
          const fallback = fallbackCoords && fallbackCoords[slug] ? fallbackCoords[slug] : null;
          const coords = overlayLat !== null && overlayLon !== null
            ? { lat: overlayLat, lon: overlayLon }
            : (fallback || parseCoords(entry.Coordinates));
            const rawRiskFactors = Array.isArray(overlayEntry?.risk_factors) ? overlayEntry.risk_factors : [];
            const filteredRiskFactors = rawRiskFactors.filter((risk) => ALLOWED_RISKS.has(risk));
            return {
            slug,
            name: entry.peakName || entry['Peak Name'],
            elevation: parseInt(entry['Elevation (ft)'], 10) || null,
            prominence: parseInt(entry['Prominence (ft)'], 10) || null,
            range: getRange(entry, slug),
            difficulty: difficultyMap[slug] || 'moderate',
            coords,
            latitude: overlayLat ?? coords?.lat ?? null,
            longitude: overlayLon ?? coords?.lon ?? null,
            rangeGroup: overlayEntry?.range_group || null,
            rangeRaw: overlayEntry?.range_raw || entry['Range / Subrange'] || null,
            primaryRoute: overlayEntry?.primary_route || null,
            primaryDistanceMi: overlayEntry?.primary_distance_mi ?? null,
            primaryGainFt: overlayEntry?.primary_gain_ft ?? null,
            trailTypePrimary: overlayEntry?.trail_type_primary ?? null,
            difficultyTextPrimary: overlayEntry?.difficulty_text_primary ?? null,
            estimatedTimeHours: overlayEntry?.estimated_time_hours ?? null,
            riskFactors: filteredRiskFactors,
            prepNotes: overlayEntry?.prep_notes || null,
            bailoutDistanceMi: overlayEntry?.bailout_distance_mi ?? null,
            riskEvidence: Array.isArray(overlayEntry?.risk_evidence) ? overlayEntry.risk_evidence : [],
            riskReview: overlayEntry?.risk_review || null,
            commonGroupings: Array.isArray(overlayEntry?.common_groupings) ? overlayEntry.common_groupings : [],
            finishStrategySuggestions: Array.isArray(overlayEntry?.finish_strategy_suggestions) ? overlayEntry.finish_strategy_suggestions : [],
            trailheadCoordinates: overlayEntry?.trailhead_coordinates || null
          };
        });
      }

      function loadFinishStrategies() {
        const container = document.getElementById('finishStrategyTiles');
        if (!container) return;
        fetch('/data/nh48-planner-templates.json')
          .then((response) => {
            if (!response.ok) throw new Error('Template file unavailable');
            return response.json();
          })
          .then((payload) => {
            const strategies = Array.isArray(payload?.finishStrategies) ? payload.finishStrategies : [];
            if (!strategies.length) return;
            container.innerHTML = '';
            strategies.forEach((strategy) => {
              const tile = document.createElement('a');
              tile.className = 'strategy-tile';
              tile.href = `/nh48-planner.html?strategy=${encodeURIComponent(strategy.id)}`;
              tile.setAttribute('aria-label', `${strategy.name} strategy`);

              const icon = document.createElement('span');
              icon.className = 'strategy-icon';
              icon.textContent = strategy.icon || '';

              const name = document.createElement('span');
              name.className = 'strategy-name';
              name.textContent = strategy.name || 'Strategy';

              const duration = document.createElement('span');
              duration.className = 'strategy-duration';
              const durationParts = [strategy.duration, strategy.tripRange].filter(Boolean);
              duration.textContent = durationParts.join(' | ');

              const summary = document.createElement('p');
              summary.className = 'strategy-description';
              summary.textContent = strategy.summary || '';

              tile.append(icon, name, duration, summary);
              container.appendChild(tile);
            });
          })
          .catch((err) => {
            console.warn('Finish strategy templates unavailable, using fallback cards.', err);
          });
      }

      function init() {
        loadFinishStrategies();
        renderRangeFilters();
        renderRangeList();
        setupRiskFilters();
        renderSeasonTable('summer');
        updateSeasonToggle('summer');
        const seasonButtons = {
          summer: document.getElementById('summerBtn'),
          fall: document.getElementById('fallBtn'),
          winter: document.getElementById('winterBtn'),
          spring: document.getElementById('springBtn')
        };
        Object.entries(seasonButtons).forEach(([key, button]) => {
          if (!button) return;
          button.addEventListener('click', () => {
            updateSeasonToggle(key);
            renderSeasonTable(key);
          });
        });

        document.querySelectorAll('[data-sort]').forEach((button) => {
          button.addEventListener('click', () => {
            const key = button.dataset.sort;
            if (sortState.key === key) {
              sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
              sortState.key = key;
              sortState.direction = 'asc';
            }
            sortState.difficultyPriority = null;
            renderPeakTable();
          });
        });

        document.querySelectorAll('.tier-badge').forEach((badge) => {
          badge.addEventListener('click', () => {
            const level = badge.dataset.difficulty;
            if (!level) return;
            sortState = {
              key: 'difficulty',
              direction: 'asc',
              difficultyPriority: level
            };
            currentRange = 'All';
            renderRangeFilters();
            renderRangeList();
            renderPeakTable();
            scheduleMapRender();
            const list = document.getElementById('official-peak-list');
            if (list) {
              list.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });

        Promise.all([
          fetch('/manifest_out.json').then((r) => r.json()),
          fetch('/data/nh48_enriched_overlay.json')
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        ])
          .then(async ([data, overlay]) => {
            if (!overlay) {
              console.warn('Overlay data unavailable; risk filters disabled.');
              setRiskFiltersEnabled(false);
            } else {
              setRiskFiltersEnabled(true);
            }

            let fallbackCoords = null;
            if (!overlay) {
              fallbackCoords = await loadFallbackCoords();
            }

            hydratePeaks(data, overlay, fallbackCoords);

            if (!fallbackCoords) {
              const missingCoords = peaks.some((peak) => !peak.coords);
              if (missingCoords) {
                fallbackCoords = await loadFallbackCoords();
                if (fallbackCoords) {
                  hydratePeaks(data, overlay, fallbackCoords);
                }
              }
            }

            renderPeakTable();
            renderItemListSchema();
            scheduleMapRender();
            if (overlay) {
              updateRiskCounts();
              updateRiskButtonStates();
            }
          })
          .catch((err) => {
            console.error('Failed to load peak data', err);
            renderDataLoadError('Unable to load peaks right now.');
          });
      }

      document.addEventListener('DOMContentLoaded', () => {
        setupTocObserver();
        const mapSection = document.getElementById('range-map');
        observeMapResize();
        const stylizedBtn = document.getElementById('mapStyleStylized');
        const osmBtn = document.getElementById('mapStyleOsm');
        if (stylizedBtn && osmBtn) {
          stylizedBtn.addEventListener('click', () => setMapStyle('stylized'));
          osmBtn.addEventListener('click', () => setMapStyle('osm'));
        }
        const zoomInBtn = document.getElementById('mapZoomIn');
        const zoomOutBtn = document.getElementById('mapZoomOut');
        const resetBtn = document.getElementById('mapReset');
        if (zoomInBtn) {
          zoomInBtn.addEventListener('click', () => {
            if (leafletMap) {
              leafletMap.zoomIn();
            }
          });
        }
        if (zoomOutBtn) {
          zoomOutBtn.addEventListener('click', () => {
            if (leafletMap) {
              leafletMap.zoomOut();
            }
          });
        }
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            if (leafletMap) {
              if (leafletBounds) {
                leafletMap.fitBounds(leafletBounds.pad(0.2), { animate: false });
              }
            }
          });
        }
        const clearBtn = document.getElementById('mapClearFilters');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            activeRiskFilters.clear();
            selectedRanges.clear();
            selectedPeakSlug = null;
            currentRange = 'All';
            updateRiskButtonStates();
            renderRangeFilters();
            renderRangeList();
            renderPeakTable();
            scheduleMapRender();
          });
        }
        if (mapSection) {
          const mapObserver = new IntersectionObserver((entries, observer) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              scheduleMapRender();
              observer.disconnect();
            }
          }, { threshold: 0.2 });
          mapObserver.observe(mapSection);
        }
        loadRanges().finally(() => {
          init();
          setMapStyle('osm');
        });
      });
  
