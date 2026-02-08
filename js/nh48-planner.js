
// NH48 Peak Planning Tool
// React 18 + @hello-pangea/dnd (ESM via esm.sh)

import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { DragDropContext, Droppable, Draggable } from 'https://esm.sh/@hello-pangea/dnd@18.0.1?deps=react@18.2.0,react-dom@18.2.0';

const DAY_TRIP_GROUPS = [
  {
    id: 'presidential',
    name: 'Presidential Traverse',
    description: 'Madison, Adams, Jefferson, Washington, Monroe, Eisenhower, Pierce',
    peaks: [
      'mount-madison',
      'mount-adams',
      'mount-jefferson',
      'mount-washington',
      'mount-monroe',
      'mount-eisenhower',
      'mount-pierce'
    ]
  },
  {
    id: 'franconia',
    name: 'Franconia Ridge Loop',
    description: 'Flume, Liberty, Lincoln, Lafayette',
    peaks: [
      'mount-flume',
      'mount-liberty',
      'mount-lincoln',
      'mount-lafayette'
    ]
  },
  {
    id: 'bonds',
    name: 'Bonds Traverse',
    description: 'Bondcliff, Bond, West Bond',
    peaks: [
      'bondcliff',
      'mount-bond',
      'west-bond'
    ]
  },
  {
    id: 'pemi',
    name: 'Pemi Loop',
    description: 'Flume, Liberty, Lincoln, Lafayette, Garfield, Galehead, South Twin, West Bond, Bond, Bondcliff',
    peaks: [
      'mount-flume',
      'mount-liberty',
      'mount-lincoln',
      'mount-lafayette',
      'mount-garfield',
      'galehead-mountain',
      'south-twin-mountain',
      'west-bond',
      'mount-bond',
      'bondcliff'
    ]
  },
  {
    id: 'twinRange',
    name: 'Twin Range',
    description: 'South Twin, North Twin, Galehead',
    peaks: [
      'south-twin-mountain',
      'north-twin-mountain',
      'galehead-mountain'
    ]
  },
  {
    id: 'hancocks',
    name: 'Hancocks Loop',
    description: 'North Hancock, South Hancock',
    peaks: [
      'mount-hancock',
      'mount-hancock-south'
    ]
  },
  {
    id: 'kinsmans',
    name: 'Kinsmans',
    description: 'North and South Kinsman',
    peaks: [
      'north-kinsman-mountain',
      'south-kinsman-mountain'
    ]
  },
  {
    id: 'osceolas',
    name: 'Osceolas',
    description: 'Mount Osceola, East Osceola',
    peaks: [
      'mount-osceola',
      'mount-osceola-east'
    ]
  },
  {
    id: 'willeyRange',
    name: 'Willey Range',
    description: 'Tom, Field, Willey',
    peaks: [
      'mount-tom',
      'mount-field',
      'mount-willey'
    ]
  },
  {
    id: 'carterMoriah',
    name: 'Carter-Moriah Traverse',
    description: 'Carter Dome, South Carter, Middle Carter, Moriah',
    peaks: [
      'carter-dome',
      'south-carter-mountain',
      'middle-carter-mountain',
      'mount-moriah'
    ]
  }
];

const DIFFICULTY_MAP = {
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

const DIFFICULTY_ORDER = ['beginner', 'moderate', 'challenging', 'severe'];
const DIFFICULTY_LABELS = {
  beginner: 'Beginner Friendly',
  moderate: 'Moderate',
  challenging: 'Challenging',
  severe: 'Severe / Exposed'
};

const DIFFICULTY_SORT_OVERRIDES = {
  'mount-tecumseh': -100,
  'mount-pierce': -90,
  'mount-waumbek': -80,
  'mount-jackson': -70,
  'mount-adams': 900,
  'mount-madison': 910
};

const STORAGE_KEY = 'nh48-planner-itinerary-v1';

const RISK_FACTORS = [
  { id: 'AboveTreelineExposure', label: 'Above-treeline exposure', color: '#f97316' },
  { id: 'SevereWeather', label: 'Severe weather', color: '#ef4444' },
  { id: 'LongBailout', label: 'Long bailout', color: '#f59e0b' },
  { id: 'LimitedWater', label: 'Limited water', color: '#facc15' },
  { id: 'Navigation', label: 'Navigation', color: '#a855f7' },
  { id: 'ScrambleSteep', label: 'Scramble / steep', color: '#fb7185' },
  { id: 'UnbridgedRiverCrossings', label: 'Unbridged crossings', color: '#38bdf8' },
  { id: 'NoCellService', label: 'No cell service', color: '#94a3b8' }
];

const RISK_PRIORITY = RISK_FACTORS.map((risk) => risk.id);
const RISK_COLOR_LOOKUP = RISK_FACTORS.reduce((acc, risk) => {
  acc[risk.id] = risk.color;
  return acc;
}, {});
const RISK_LABEL_LOOKUP = RISK_FACTORS.reduce((acc, risk) => {
  acc[risk.id] = risk.label;
  return acc;
}, {});

const DEFAULT_NUMERIC_FILTER = { min: '', max: '' };

function parseNumberInput(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function isFilterActive(filter) {
  return (filter.min !== '' && filter.min !== null && filter.min !== undefined)
    || (filter.max !== '' && filter.max !== null && filter.max !== undefined);
}

function withinFilter(value, filter) {
  const min = parseNumberInput(filter.min);
  const max = parseNumberInput(filter.max);
  if (min === null && max === null) return true;
  if (value === null || value === undefined || value === '') return false;
  const num = Number.isFinite(value) ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
}

function resolveDifficulty(entry, slug) {
  if (DIFFICULTY_MAP[slug]) return DIFFICULTY_MAP[slug];
  const raw = `${entry?.Difficulty || ''}`.toLowerCase();
  if (raw.includes('extremely') || raw.includes('very')) return 'severe';
  if (raw.includes('difficult')) return 'challenging';
  if (raw.includes('moderate')) return 'moderate';
  return 'moderate';
}

function buildDifficultyGroups(peaksMap) {
  const groups = DIFFICULTY_ORDER.map((tier) => ({
    type: 'group',
    id: `difficulty-${tier}`,
    name: DIFFICULTY_LABELS[tier] || tier,
    kind: 'difficulty',
    items: []
  }));
  const groupIndex = groups.reduce((acc, group, idx) => {
    acc[group.id] = idx;
    return acc;
  }, {});
  Object.values(peaksMap).forEach((peak) => {
    const tier = peak.difficulty || 'moderate';
    const groupId = `difficulty-${tier}`;
    const idx = groupIndex[groupId];
    if (idx === undefined) return;
    groups[idx].items.push(buildPeakItem(peak));
  });
  groups.forEach((group) => {
    group.items.sort((a, b) => {
      const aOverride = DIFFICULTY_SORT_OVERRIDES[a.slug] ?? 0;
      const bOverride = DIFFICULTY_SORT_OVERRIDES[b.slug] ?? 0;
      if (aOverride !== bOverride) return aOverride - bOverride;
      const aVal = Number.isFinite(a.elevation) ? a.elevation : null;
      const bVal = Number.isFinite(b.elevation) ? b.elevation : null;
      if (aVal !== null && bVal !== null && aVal !== bVal) return aVal - bVal;
      return a.name.localeCompare(b.name);
    });
  });
  return groups.filter((group) => group.items.length);
}

function serializeItinerary(list) {
  return list.map((item) => {
    if (item.type === 'group') {
      return {
        type: 'group',
        id: item.id,
        name: item.name,
        kind: item.kind || 'custom',
        items: item.items.map((peak) => peak.slug)
      };
    }
    return {
      type: 'peak',
      id: item.slug
    };
  });
}

function hydrateItinerary(serialized, peaksMap) {
  if (!Array.isArray(serialized)) return null;
  const list = [];
  serialized.forEach((item) => {
    if (item.type === 'group') {
      const items = (item.items || [])
        .map((slug) => peaksMap[slug])
        .filter(Boolean)
        .map((peak) => buildPeakItem(peak));
      if (items.length) {
        list.push({
          type: 'group',
          id: item.id || `group-${Date.now()}`,
          name: item.name || 'Group',
          kind: item.kind || 'custom',
          items
        });
      }
    } else if (item.type === 'peak') {
      const peak = peaksMap[item.id];
      if (peak) list.push(buildPeakItem(peak));
    }
  });
  return list.length ? list : null;
}

function loadSavedItinerary(peaksMap) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return hydrateItinerary(parsed, peaksMap);
  } catch (err) {
    console.warn('Failed to load saved itinerary', err);
    return null;
  }
}

function buildPeakItem(details) {
  return {
    type: 'peak',
    id: details.slug,
    slug: details.slug,
    name: details.name,
    range: details.range,
    rangeGroup: details.rangeGroup || '',
    elevation: details.elevation ?? null,
    difficulty: details.difficulty || 'moderate',
    riskFactors: details.riskFactors || [],
    primaryDistanceMi: details.primaryDistanceMi ?? null,
    primaryGainFt: details.primaryGainFt ?? null,
    estimatedTimeHours: details.estimatedTimeHours ?? null,
    bailoutDistanceMi: details.bailoutDistanceMi ?? null
  };
}

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  let insertIndex = endIndex;
  if (insertIndex > startIndex) insertIndex -= 1;
  if (insertIndex < 0) insertIndex = 0;
  if (insertIndex > result.length) insertIndex = result.length;
  result.splice(insertIndex, 0, removed);
  return result;
}

function PeakPlannerApp() {
  const [peaksMap, setPeaksMap] = useState({});
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [hasOverlay, setHasOverlay] = useState(true);

  const [activeRiskFilters, setActiveRiskFilters] = useState(new Set());
  const [activeRangeGroups, setActiveRangeGroups] = useState(new Set());
  const [distanceFilter, setDistanceFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [gainFilter, setGainFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [timeFilter, setTimeFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [bailoutFilter, setBailoutFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [selectedPeakIds, setSelectedPeakIds] = useState(new Set());
  const [selectedDayTripId, setSelectedDayTripId] = useState('');
  const groupCounterRef = useRef(1);
  useEffect(() => {
    Promise.all([
      fetch('/manifest_out.json').then((r) => {
        if (!r.ok) throw new Error('Failed to load manifest');
        return r.json();
      }),
      fetch('/data/nh48_enriched_overlay.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
      .then(([data, overlay]) => {
        const map = {};
        Object.values(data).forEach((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const elevation = entry['Elevation (ft)'] ? Number.parseInt(entry['Elevation (ft)'], 10) : null;
          map[slug] = {
            slug,
            name: entry.peakName || entry['Peak Name'] || slug,
            elevation: Number.isFinite(elevation) ? elevation : null,
            range: entry['Range / Subrange'] || '',
            difficulty: resolveDifficulty(entry, slug),
            rangeGroup: '',
            riskFactors: [],
            primaryDistanceMi: null,
            primaryGainFt: null,
            estimatedTimeHours: null,
            bailoutDistanceMi: null
          };
        });

        if (overlay) {
          Object.entries(overlay).forEach(([slugKey, overlayEntry]) => {
            const slug = overlayEntry.slug || slugKey;
            if (!map[slug]) return;
            map[slug] = {
              ...map[slug],
              riskFactors: overlayEntry.risk_factors || overlayEntry.riskFactors || [],
              prepNotes: overlayEntry.prep_notes || overlayEntry.prepNotes || '',
              riskEvidence: overlayEntry.risk_evidence || overlayEntry.riskEvidence || [],
              riskReview: overlayEntry.risk_review || overlayEntry.riskReview || null,
              latitude: overlayEntry.latitude ?? null,
              longitude: overlayEntry.longitude ?? null,
              rangeGroup: overlayEntry.range_group || overlayEntry.rangeGroup || map[slug].rangeGroup,
              rangeRaw: overlayEntry.range_raw || overlayEntry.rangeRaw || '',
              primaryRoute: overlayEntry.primary_route || overlayEntry.primaryRoute || null,
              primaryDistanceMi: overlayEntry.primary_distance_mi ?? overlayEntry.primaryDistanceMi ?? null,
              primaryGainFt: overlayEntry.primary_gain_ft ?? overlayEntry.primaryGainFt ?? null,
              estimatedTimeHours: overlayEntry.estimated_time_hours ?? overlayEntry.estimatedTimeHours ?? null,
              bailoutDistanceMi: overlayEntry.bailout_distance_mi ?? overlayEntry.bailoutDistanceMi ?? null,
              commonGroupings: overlayEntry.common_groupings || overlayEntry.commonGroupings || [],
              trailheadCoordinates: overlayEntry.trailhead_coordinates || overlayEntry.trailheadCoordinates || null
            };
          });
        }

        setHasOverlay(Boolean(overlay));
        setPeaksMap(map);
        const saved = loadSavedItinerary(map);
        const baseItinerary = saved || buildDifficultyGroups(map);
        setItinerary(baseItinerary);
        setSelectedPeakIds(new Set());
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest', err);
        setLoadError('Unable to load peak data. Please refresh or try again later.');
        setLoading(false);
      });
  }, []);

  const rangeGroupOptions = useMemo(() => {
    const groups = new Set();
    Object.values(peaksMap).forEach((peak) => {
      if (peak.rangeGroup) groups.add(peak.rangeGroup);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [peaksMap]);

  useEffect(() => {
    if (!itinerary.length) return;
    try {
      const payload = serializeItinerary(itinerary);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save itinerary', err);
    }
  }, [itinerary]);

  const filtersActive = useMemo(() => (
    activeRiskFilters.size > 0
    || activeRangeGroups.size > 0
    || isFilterActive(distanceFilter)
    || isFilterActive(gainFilter)
    || isFilterActive(timeFilter)
    || isFilterActive(bailoutFilter)
  ), [activeRiskFilters, activeRangeGroups, distanceFilter, gainFilter, timeFilter, bailoutFilter]);

  const peakMatchesFilters = (peak) => {
    if (!filtersActive) return true;
    if (activeRangeGroups.size > 0 && !activeRangeGroups.has(peak.rangeGroup)) {
      return false;
    }
    if (activeRiskFilters.size > 0) {
      for (const risk of activeRiskFilters) {
        if (!peak.riskFactors || !peak.riskFactors.includes(risk)) return false;
      }
    }
    if (!withinFilter(peak.primaryDistanceMi, distanceFilter)) return false;
    if (!withinFilter(peak.primaryGainFt, gainFilter)) return false;
    if (!withinFilter(peak.estimatedTimeHours, timeFilter)) return false;
    if (!withinFilter(peak.bailoutDistanceMi, bailoutFilter)) return false;
    return true;
  };

  const selectedPeaks = useMemo(() => {
    const collected = [];
    itinerary.forEach((item) => {
      if (item.type === 'peak') {
        if (selectedPeakIds.has(item.id)) {
          collected.push(item);
        }
      } else {
        item.items.forEach((peak) => {
          if (selectedPeakIds.has(peak.id)) {
            collected.push(peak);
          }
        });
      }
    });
    return collected;
  }, [itinerary, selectedPeakIds]);

  const toggleRiskFilter = (risk) => {
    if (!hasOverlay) return;
    setActiveRiskFilters((prev) => {
      const next = new Set(prev);
      if (next.has(risk)) {
        next.delete(risk);
      } else {
        next.add(risk);
      }
      return next;
    });
  };

  const toggleRangeGroup = (group) => {
    if (!hasOverlay) return;
    setActiveRangeGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setActiveRiskFilters(new Set());
    setActiveRangeGroups(new Set());
    setDistanceFilter({ ...DEFAULT_NUMERIC_FILTER });
    setGainFilter({ ...DEFAULT_NUMERIC_FILTER });
    setTimeFilter({ ...DEFAULT_NUMERIC_FILTER });
    setBailoutFilter({ ...DEFAULT_NUMERIC_FILTER });
  };

  const togglePeakSelection = (peakId) => {
    setSelectedPeakIds((prev) => {
      const next = new Set(prev);
      if (next.has(peakId)) {
        next.delete(peakId);
      } else {
        next.add(peakId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedPeakIds(new Set());

  const handleGroupSelected = () => {
    if (selectedPeaks.length < 2) return;
    const groupId = `custom-${Date.now()}-${groupCounterRef.current}`;
    const groupName = `Custom Group ${groupCounterRef.current}`;
    groupCounterRef.current += 1;

    setItinerary((prev) => {
      const next = [];
      const collected = [];
      let insertIndex = null;

      prev.forEach((item) => {
        if (item.type === 'peak') {
          if (selectedPeakIds.has(item.id)) {
            if (insertIndex === null) insertIndex = next.length;
            collected.push(item);
          } else {
            next.push(item);
          }
        } else {
          const remaining = [];
          item.items.forEach((peak) => {
            if (selectedPeakIds.has(peak.id)) {
              if (insertIndex === null) insertIndex = next.length;
              collected.push(peak);
            } else {
              remaining.push(peak);
            }
          });
          if (remaining.length) {
            next.push({ ...item, items: remaining });
          }
        }
      });

      if (collected.length < 2) return prev;
      const groupItem = {
        type: 'group',
        id: groupId,
        name: groupName,
        kind: 'custom',
        items: collected
      };
      const safeIndex = insertIndex === null ? next.length : insertIndex;
      next.splice(safeIndex, 0, groupItem);
      return next;
    });

    clearSelection();
  };

  const handleUngroup = (groupId) => {
    setItinerary((prev) => {
      const index = prev.findIndex((item) => item.type === 'group' && item.id === groupId);
      if (index === -1) return prev;
      const group = prev[index];
      const next = [...prev.slice(0, index), ...group.items, ...prev.slice(index + 1)];
      return next;
    });
    clearSelection();
  };

  const handleAutoGroup = () => {
    if (!selectedDayTripId) return;
    const preset = DAY_TRIP_GROUPS.find((set) => set.id === selectedDayTripId);
    if (!preset) return;
    const slugSet = new Set(preset.peaks);
    const groupId = `daytrip-${preset.id}`;

    setItinerary((prev) => {
      const cleaned = prev.filter((item) => !(item.type === 'group' && item.id === groupId));
      const next = [];
      const collected = [];

      cleaned.forEach((item) => {
        if (item.type === 'peak') {
          if (slugSet.has(item.slug)) {
            collected.push(item);
          } else {
            next.push(item);
          }
        } else {
          const remaining = [];
          item.items.forEach((peak) => {
            if (slugSet.has(peak.slug)) {
              collected.push(peak);
            } else {
              remaining.push(peak);
            }
          });
          if (remaining.length) {
            next.push({ ...item, items: remaining });
          }
        }
      });

      if (!collected.length) return prev;
      const groupItem = {
        type: 'group',
        id: groupId,
        name: preset.name,
        kind: 'day-trip',
        items: collected
      };
      next.unshift(groupItem);
      return next;
    });

    setSelectedDayTripId('');
    clearSelection();
  };

  const getHighlightColor = (peak) => {
    if (!filtersActive) return null;
    if (activeRiskFilters.size > 0) {
      for (const risk of RISK_PRIORITY) {
        if (activeRiskFilters.has(risk) && peak.riskFactors && peak.riskFactors.includes(risk)) {
          return RISK_COLOR_LOOKUP[risk] || '#ef4444';
        }
      }
      return null;
    }
    return '#38bdf8';
  };
  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setItinerary((prev) => {
      const next = [...prev];
      const getGroupIndex = (id) => next.findIndex((item) => item.type === 'group' && item.id === id);
      const sourceIsRoot = source.droppableId === 'root';
      const destIsRoot = destination.droppableId === 'root';

      if (sourceIsRoot) {
        const sourceItem = next[source.index];
        if (!sourceItem) return prev;
        if (destIsRoot) {
          return reorder(next, source.index, destination.index);
        }
        if (sourceItem.type === 'group') return prev;

        const destGroupId = destination.droppableId.replace('group-', '');
        const destGroupIndex = getGroupIndex(destGroupId);
        if (destGroupIndex === -1) return prev;
        const destGroup = next[destGroupIndex];
        const updatedItems = [...destGroup.items];
        updatedItems.splice(destination.index, 0, sourceItem);
        next.splice(source.index, 1);
        const adjustedDestIndex = destGroupIndex > source.index ? destGroupIndex - 1 : destGroupIndex;
        next[adjustedDestIndex] = { ...destGroup, items: updatedItems };
        return next;
      }

      const sourceGroupId = source.droppableId.replace('group-', '');
      const sourceGroupIndex = getGroupIndex(sourceGroupId);
      if (sourceGroupIndex === -1) return prev;
      const sourceGroup = next[sourceGroupIndex];
      const sourceItems = [...sourceGroup.items];
      const [moved] = sourceItems.splice(source.index, 1);
      if (!moved) return prev;

      if (destIsRoot) {
        let updatedList = [...next];
        if (sourceItems.length === 0) {
          updatedList.splice(sourceGroupIndex, 1);
        } else {
          updatedList[sourceGroupIndex] = { ...sourceGroup, items: sourceItems };
        }
        let insertIndex = destination.index;
        if (sourceItems.length === 0 && sourceGroupIndex < insertIndex) insertIndex -= 1;
        updatedList.splice(insertIndex, 0, moved);
        return updatedList;
      }

      const destGroupId = destination.droppableId.replace('group-', '');
      const destGroupIndex = getGroupIndex(destGroupId);
      if (destGroupIndex === -1) return prev;
      const destGroup = next[destGroupIndex];
      if (sourceGroupId === destGroupId) {
        const reorderedItems = [...destGroup.items];
        reorderedItems.splice(source.index, 1);
        reorderedItems.splice(destination.index, 0, moved);
        next[destGroupIndex] = { ...destGroup, items: reorderedItems };
        return next;
      }
      const destItems = [...destGroup.items];
      destItems.splice(destination.index, 0, moved);
      let updatedList = [...next];
      if (sourceItems.length === 0) {
        updatedList.splice(sourceGroupIndex, 1);
      } else {
        updatedList[sourceGroupIndex] = { ...sourceGroup, items: sourceItems };
      }
      const adjustedDestIndex = sourceItems.length === 0 && sourceGroupIndex < destGroupIndex ? destGroupIndex - 1 : destGroupIndex;
      updatedList[adjustedDestIndex] = { ...destGroup, items: destItems };
      return updatedList;
    });
  };
  const riskChip = (risk) => {
    const isActive = activeRiskFilters.has(risk.id);
    return React.createElement('button', {
      key: risk.id,
      type: 'button',
      className: `chip-button${isActive ? ' is-active' : ''}${!hasOverlay ? ' is-disabled' : ''}`,
      onClick: () => toggleRiskFilter(risk.id),
      disabled: !hasOverlay,
      'aria-pressed': isActive ? 'true' : 'false',
      style: { '--chip-color': risk.color }
    }, [
      React.createElement('span', { className: 'chip-dot', style: { background: risk.color } }),
      React.createElement('span', null, risk.label)
    ]);
  };

  const rangeChip = (group) => {
    const isActive = activeRangeGroups.has(group);
    return React.createElement('button', {
      key: group,
      type: 'button',
      className: `chip-button${isActive ? ' is-active' : ''}${!hasOverlay ? ' is-disabled' : ''}`,
      onClick: () => toggleRangeGroup(group),
      disabled: !hasOverlay,
      'aria-pressed': isActive ? 'true' : 'false',
      style: { '--chip-color': '#38bdf8' }
    }, group);
  };

  const renderMetrics = (peak) => {
    const parts = [];
    if (peak.primaryDistanceMi !== null && peak.primaryDistanceMi !== undefined) {
      parts.push(`${peak.primaryDistanceMi} mi`);
    }
    if (peak.primaryGainFt !== null && peak.primaryGainFt !== undefined) {
      const gain = Number.isFinite(peak.primaryGainFt) ? peak.primaryGainFt.toLocaleString() : peak.primaryGainFt;
      parts.push(`${gain} ft`);
    }
    if (peak.estimatedTimeHours !== null && peak.estimatedTimeHours !== undefined) {
      parts.push(`${peak.estimatedTimeHours} hr`);
    }
    if (peak.bailoutDistanceMi !== null && peak.bailoutDistanceMi !== undefined) {
      parts.push(`Bailout ${peak.bailoutDistanceMi} mi`);
    }
    if (!parts.length) return null;
    return React.createElement('span', { className: 'itinerary-meta' }, parts.join(' | '));
  };

  const renderRiskTags = (peak) => {
    if (filtersActive || !peak.riskFactors || !peak.riskFactors.length) return null;
    return React.createElement('div', { className: 'risk-tags' },
      peak.riskFactors.map((risk) => React.createElement('span', { key: risk, className: 'risk-tag' }, [
        React.createElement('span', { className: 'risk-tag-dot', style: { background: RISK_COLOR_LOOKUP[risk] || '#94a3b8' } }),
        React.createElement('span', null, RISK_LABEL_LOOKUP[risk] || risk)
      ]))
    );
  };

  const renderPeakRow = (peak, displayIndex, provided, snapshot) => {
    const matchesFilters = filtersActive && peakMatchesFilters(peak);
    const highlightColor = matchesFilters ? getHighlightColor(peak) : null;
    const dragStyle = provided.draggableProps?.style || {};
    const style = highlightColor
      ? { ...dragStyle, '--highlight-color': highlightColor }
      : dragStyle;
    const indexStyle = highlightColor
      ? { background: `linear-gradient(135deg, ${highlightColor}, #0ea5e9)` }
      : undefined;

    return React.createElement('div', {
      ref: provided.innerRef,
      ...provided.draggableProps,
      style,
      className: `itinerary-row${snapshot.isDragging ? ' is-dragging' : ''}${matchesFilters ? ' is-highlighted' : ''}`
    }, [
      React.createElement('span', {
        className: 'itinerary-index drag-handle',
        style: indexStyle,
        ...provided.dragHandleProps
      }, displayIndex),
      React.createElement('div', { className: 'itinerary-details' }, [
        React.createElement('div', { className: 'itinerary-name-row' }, [
          React.createElement('input', {
            type: 'checkbox',
            className: 'row-checkbox',
            checked: selectedPeakIds.has(peak.id),
            onChange: () => togglePeakSelection(peak.id)
          }),
          React.createElement('span', { className: 'itinerary-name' }, peak.name)
        ]),
        renderMetrics(peak),
        renderRiskTags(peak)
      ]),
      React.createElement('span', { className: 'itinerary-range' }, peak.rangeGroup || peak.range || 'Range TBD')
    ]);
  };

  const getGroupLabel = (group) => {
    if (group.kind === 'day-trip') return 'Day-trip group';
    if (group.kind === 'difficulty') return 'Difficulty group';
    return 'Custom group';
  };

  const emptyMessage = 'No peaks available.';

  let displayCounter = 0;
  const nextDisplayIndex = () => {
    displayCounter += 1;
    return displayCounter;
  };

  return React.createElement('div', { className: 'planner-shell' },
    React.createElement('div', { className: `planner-filters${!hasOverlay ? ' is-disabled' : ''}` }, [
      React.createElement('div', { className: 'filters-header' }, [
        React.createElement('h3', null, 'Filters'),
        React.createElement('button', {
          type: 'button',
          className: 'filter-clear',
          onClick: clearFilters,
          disabled: !hasOverlay
        }, 'Clear Filters')
      ]),
      React.createElement('div', { className: 'filters-grid' }, [
        React.createElement('div', { className: 'filter-block' }, [
          React.createElement('span', { className: 'filter-title' }, 'Risk factors'),
          React.createElement('div', { className: 'filter-chips' }, RISK_FACTORS.map(riskChip))
        ]),
        React.createElement('div', { className: 'filter-block' }, [
          React.createElement('span', { className: 'filter-title' }, 'Range groups'),
          React.createElement('div', { className: 'filter-chips' },
            rangeGroupOptions.length
              ? rangeGroupOptions.map(rangeChip)
              : React.createElement('span', { className: 'filter-empty' }, 'Range groups unavailable.')
          )
        ]),
        React.createElement('div', { className: 'filter-block' }, [
          React.createElement('span', { className: 'filter-title' }, 'Route metrics'),
          React.createElement('div', { className: 'filter-numbers' }, [
            React.createElement('label', null, 'Distance (mi)'),
            React.createElement('div', { className: 'numeric-range' }, [
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Min',
                value: distanceFilter.min,
                onChange: (e) => setDistanceFilter((prev) => ({ ...prev, min: e.target.value })),
                disabled: !hasOverlay
              }),
              React.createElement('span', { className: 'range-sep' }, 'to'),
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Max',
                value: distanceFilter.max,
                onChange: (e) => setDistanceFilter((prev) => ({ ...prev, max: e.target.value })),
                disabled: !hasOverlay
              })
            ]),
            React.createElement('label', null, 'Elevation gain (ft)'),
            React.createElement('div', { className: 'numeric-range' }, [
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '100',
                placeholder: 'Min',
                value: gainFilter.min,
                onChange: (e) => setGainFilter((prev) => ({ ...prev, min: e.target.value })),
                disabled: !hasOverlay
              }),
              React.createElement('span', { className: 'range-sep' }, 'to'),
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '100',
                placeholder: 'Max',
                value: gainFilter.max,
                onChange: (e) => setGainFilter((prev) => ({ ...prev, max: e.target.value })),
                disabled: !hasOverlay
              })
            ]),
            React.createElement('label', null, 'Estimated time (hrs)'),
            React.createElement('div', { className: 'numeric-range' }, [
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Min',
                value: timeFilter.min,
                onChange: (e) => setTimeFilter((prev) => ({ ...prev, min: e.target.value })),
                disabled: !hasOverlay
              }),
              React.createElement('span', { className: 'range-sep' }, 'to'),
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Max',
                value: timeFilter.max,
                onChange: (e) => setTimeFilter((prev) => ({ ...prev, max: e.target.value })),
                disabled: !hasOverlay
              })
            ]),
            React.createElement('label', null, 'Bailout distance (mi)'),
            React.createElement('div', { className: 'numeric-range' }, [
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Min',
                value: bailoutFilter.min,
                onChange: (e) => setBailoutFilter((prev) => ({ ...prev, min: e.target.value })),
                disabled: !hasOverlay
              }),
              React.createElement('span', { className: 'range-sep' }, 'to'),
              React.createElement('input', {
                type: 'number',
                min: '0',
                step: '0.1',
                placeholder: 'Max',
                value: bailoutFilter.max,
                onChange: (e) => setBailoutFilter((prev) => ({ ...prev, max: e.target.value })),
                disabled: !hasOverlay
              })
            ])
          ])
        ])
      ]),
      React.createElement('div', { className: 'auto-group' }, [
        React.createElement('span', { className: 'filter-title' }, 'Auto-group day trips'),
        React.createElement('div', { className: 'auto-group-controls' }, [
          React.createElement('select', {
            value: selectedDayTripId,
            onChange: (e) => setSelectedDayTripId(e.target.value)
          }, [
            React.createElement('option', { key: 'none', value: '' }, 'Select a day-trip group'),
            ...DAY_TRIP_GROUPS.map((set) =>
              React.createElement('option', { key: set.id, value: set.id }, set.name)
            )
          ]),
          React.createElement('button', {
            type: 'button',
            className: 'group-btn',
            onClick: handleAutoGroup,
            disabled: !selectedDayTripId
          }, 'Group hike')
        ]),
        React.createElement('span', { className: 'filter-note' }, 'Create a grouped panel for a classic NH48 day-trip.')
      ]),
      !hasOverlay
        ? React.createElement('div', { className: 'filter-note' }, 'Risk and route filters are unavailable because the overlay failed to load.')
        : null
    ]),
    React.createElement('div', { className: 'group-actions' }, [
      React.createElement('span', { className: 'group-status' }, `${selectedPeaks.length} selected`),
      React.createElement('button', {
        type: 'button',
        className: 'group-btn',
        onClick: handleGroupSelected,
        disabled: selectedPeaks.length < 2
      }, 'Group selected'),
      React.createElement('button', {
        type: 'button',
        className: 'group-btn ghost',
        onClick: clearSelection,
        disabled: selectedPeakIds.size === 0
      }, 'Clear selection')
    ]),
    loading
      ? React.createElement('div', { className: 'planner-status' }, 'Loading peak data...')
      : null,
    loadError
      ? React.createElement('div', { className: 'planner-status' }, loadError)
      : null,
    React.createElement(DragDropContext, { onDragEnd },
      React.createElement(Droppable, { droppableId: 'root' }, (provided) =>
        React.createElement('div', {
          ref: provided.innerRef,
          ...provided.droppableProps,
          className: 'itinerary-list'
        }, [
          ...itinerary.map((item, index) => {
            if (item.type === 'group') {
              return React.createElement(Draggable, {
                key: `group-${item.id}`,
                draggableId: `group-${item.id}`,
                index
              }, (prov, snapshot) =>
                React.createElement('div', {
                  ref: prov.innerRef,
                  ...prov.draggableProps,
                  className: `itinerary-group${snapshot.isDragging ? ' is-dragging' : ''}`
                }, [
                  React.createElement('div', { className: 'group-header' }, [
                    React.createElement('span', {
                      className: 'drag-handle group-handle',
                      ...prov.dragHandleProps
                    }, 'drag'),
                    React.createElement('div', { className: 'group-title' }, [
                      React.createElement('strong', null, item.name),
                      React.createElement('span', { className: 'group-badge' }, getGroupLabel(item)),
                      React.createElement('span', { className: 'group-meta' }, `${item.items.length} peaks`)
                    ]),
                    React.createElement('button', {
                      type: 'button',
                      className: 'group-btn ghost',
                      onClick: () => handleUngroup(item.id)
                    }, 'Ungroup')
                  ]),
                  React.createElement(Droppable, { droppableId: `group-${item.id}` }, (groupProvided) =>
                    React.createElement('div', {
                      ref: groupProvided.innerRef,
                      ...groupProvided.droppableProps,
                      className: 'group-list'
                    }, [
                      ...(item.items.length ? item.items.map((peak, peakIndex) =>
                        React.createElement(Draggable, {
                          key: `peak-${peak.id}`,
                          draggableId: `peak-${peak.id}`,
                          index: peakIndex
                        }, (peakProvided, peakSnapshot) =>
                          renderPeakRow(peak, nextDisplayIndex(), peakProvided, peakSnapshot)
                        )
                      ) : [React.createElement('div', { key: 'empty', className: 'group-empty' }, 'Group is empty.')]),
                      groupProvided.placeholder
                    ])
                  )
                ])
              );
            }

            return React.createElement(Draggable, {
              key: `peak-${item.id}`,
              draggableId: `peak-${item.id}`,
              index
            }, (prov, snapshot) =>
              renderPeakRow(item, nextDisplayIndex(), prov, snapshot)
            );
          }),
          itinerary.length === 0 && !loading && !loadError
            ? React.createElement('div', { className: 'itinerary-empty' }, emptyMessage)
            : null,
          provided.placeholder
        ])
      )
    )
  );
}

const rootEl = document.getElementById('planner-root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(React.createElement(PeakPlannerApp));
}
