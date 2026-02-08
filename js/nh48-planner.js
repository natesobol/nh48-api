
// NH48 Peak Planning Tool
// React 18 + @hello-pangea/dnd (ESM via esm.sh)

import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { DragDropContext, Droppable, Draggable } from 'https://esm.sh/@hello-pangea/dnd@18.0.1?deps=react@18.2.0,react-dom@18.2.0';

const PRESET_SETS = [
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

function buildPeakItem(details) {
  return {
    type: 'peak',
    id: details.slug,
    slug: details.slug,
    name: details.name,
    range: details.range,
    rangeGroup: details.rangeGroup || '',
    riskFactors: details.riskFactors || [],
    primaryDistanceMi: details.primaryDistanceMi ?? null,
    primaryGainFt: details.primaryGainFt ?? null,
    estimatedTimeHours: details.estimatedTimeHours ?? null,
    bailoutDistanceMi: details.bailoutDistanceMi ?? null
  };
}

function buildItinerary(preset, peaksMap) {
  if (!preset) return [];
  return preset.peaks.map((slug) => {
    const details = peaksMap[slug] || { slug, name: slug, range: '' };
    return buildPeakItem(details);
  });
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

function mapVisibleIndexToActual(mapping, index, totalLength) {
  if (!mapping) return null;
  if (index < mapping.length) return mapping[index];
  if (mapping.length === 0) return totalLength;
  const lastActual = mapping[mapping.length - 1];
  return Math.min(totalLength, lastActual + 1);
}

function PeakPlannerApp() {
  const [peaksMap, setPeaksMap] = useState({});
  const [itinerary, setItinerary] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
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
          map[slug] = {
            slug,
            name: entry.peakName || entry['Peak Name'] || slug,
            elevation: entry['Elevation (ft)'] || '',
            range: entry['Range / Subrange'] || '',
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
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest', err);
        setLoadError('Unable to load peak data. Please refresh or try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedSetId) {
      setItinerary([]);
      setSelectedPeakIds(new Set());
      return;
    }
    const preset = PRESET_SETS.find((set) => set.id === selectedSetId);
    setItinerary(buildItinerary(preset, peaksMap));
    setSelectedPeakIds(new Set());
  }, [selectedSetId, peaksMap]);

  const activePreset = useMemo(
    () => PRESET_SETS.find((set) => set.id === selectedSetId),
    [selectedSetId]
  );

  const rangeGroupOptions = useMemo(() => {
    const groups = new Set();
    Object.values(peaksMap).forEach((peak) => {
      if (peak.rangeGroup) groups.add(peak.rangeGroup);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [peaksMap]);

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

  const filteredView = useMemo(() => {
    const root = [];
    const groupMaps = {};

    itinerary.forEach((item, idx) => {
      if (item.type === 'group') {
        const visibleItems = [];
        const visibleMap = [];
        item.items.forEach((peak, peakIdx) => {
          if (peakMatchesFilters(peak)) {
            visibleItems.push(peak);
            visibleMap.push({ item: peak, actualIndex: peakIdx });
          }
        });
        groupMaps[item.id] = visibleMap;
        root.push({
          item: { ...item, visibleItems },
          actualIndex: idx
        });
      } else if (item.type === 'peak') {
        if (!filtersActive || peakMatchesFilters(item)) {
          root.push({ item, actualIndex: idx });
        }
      }
    });

    return { root, groupMaps };
  }, [itinerary, filtersActive, activeRiskFilters, activeRangeGroups, distanceFilter, gainFilter, timeFilter, bailoutFilter]);

  const visiblePeakIds = useMemo(() => {
    const ids = new Set();
    filteredView.root.forEach((entry) => {
      if (entry.item.type === 'peak') {
        ids.add(entry.item.id);
      } else {
        entry.item.visibleItems.forEach((peak) => ids.add(peak.id));
      }
    });
    return ids;
  }, [filteredView]);

  const selectedVisiblePeaks = useMemo(() => {
    const collected = [];
    itinerary.forEach((item) => {
      if (item.type === 'peak') {
        if (selectedPeakIds.has(item.id) && visiblePeakIds.has(item.id)) {
          collected.push(item);
        }
      } else {
        item.items.forEach((peak) => {
          if (selectedPeakIds.has(peak.id) && visiblePeakIds.has(peak.id)) {
            collected.push(peak);
          }
        });
      }
    });
    return collected;
  }, [itinerary, selectedPeakIds, visiblePeakIds]);

  const handleSetChange = (e) => {
    setSelectedSetId(e.target.value);
  };
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
    if (selectedVisiblePeaks.length < 2) return;
    const groupId = `custom-${Date.now()}-${groupCounterRef.current}`;
    const groupName = `Custom Group ${groupCounterRef.current}`;
    groupCounterRef.current += 1;

    setItinerary((prev) => {
      const next = [];
      const collected = [];
      let insertIndex = null;

      prev.forEach((item) => {
        if (item.type === 'peak') {
          if (selectedPeakIds.has(item.id) && visiblePeakIds.has(item.id)) {
            if (insertIndex === null) insertIndex = next.length;
            collected.push(item);
          } else {
            next.push(item);
          }
        } else {
          const remaining = [];
          item.items.forEach((peak) => {
            if (selectedPeakIds.has(peak.id) && visiblePeakIds.has(peak.id)) {
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

  const getRiskColor = (peak) => {
    if (activeRiskFilters.size === 0) return null;
    for (const risk of RISK_PRIORITY) {
      if (activeRiskFilters.has(risk) && peak.riskFactors && peak.riskFactors.includes(risk)) {
        return RISK_COLOR_LOOKUP[risk] || '#ef4444';
      }
    }
    return null;
  };
  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const rootMapping = filteredView.root.map((entry) => entry.actualIndex);
    const groupMappings = Object.fromEntries(
      Object.entries(filteredView.groupMaps).map(([id, entries]) => [id, entries.map((entry) => entry.actualIndex)])
    );

    const sourceIsRoot = source.droppableId === 'root';
    const destIsRoot = destination.droppableId === 'root';
    const sourceGroupId = sourceIsRoot ? null : source.droppableId.replace('group-', '');
    const destGroupId = destIsRoot ? null : destination.droppableId.replace('group-', '');

    if (sourceIsRoot) {
      const sourceActual = rootMapping[source.index];
      if (sourceActual === undefined) return;
      const draggedItem = itinerary[sourceActual];
      if (!draggedItem) return;

      if (draggedItem.type === 'group' && !destIsRoot) {
        return;
      }

      if (destIsRoot) {
        const destActual = mapVisibleIndexToActual(rootMapping, destination.index, itinerary.length);
        if (destActual === null || destActual === undefined) return;
        setItinerary((prev) => reorder(prev, sourceActual, destActual));
        return;
      }

      if (draggedItem.type !== 'peak') return;
      const destGroupIndex = itinerary.findIndex((item) => item.type === 'group' && item.id === destGroupId);
      if (destGroupIndex === -1) return;
      const destGroup = itinerary[destGroupIndex];
      const destMapping = groupMappings[destGroupId] || [];
      const destActual = mapVisibleIndexToActual(destMapping, destination.index, destGroup.items.length);

      setItinerary((prev) => {
        const next = [...prev];
        const [moved] = next.splice(sourceActual, 1);
        const groupIdx = next.findIndex((item) => item.type === 'group' && item.id === destGroupId);
        if (groupIdx === -1) return prev;
        const group = next[groupIdx];
        const updatedItems = [...group.items];
        const insertAt = destActual === null || destActual === undefined ? updatedItems.length : destActual;
        updatedItems.splice(insertAt, 0, moved);
        next[groupIdx] = { ...group, items: updatedItems };
        return next;
      });
      return;
    }

    const sourceGroupIndex = itinerary.findIndex((item) => item.type === 'group' && item.id === sourceGroupId);
    if (sourceGroupIndex === -1) return;
    const sourceGroup = itinerary[sourceGroupIndex];
    const sourceMapping = groupMappings[sourceGroupId] || [];
    const sourceActual = sourceMapping[source.index];
    if (sourceActual === undefined) return;

    if (destIsRoot) {
      const destActual = mapVisibleIndexToActual(rootMapping, destination.index, itinerary.length);
      if (destActual === null || destActual === undefined) return;
      setItinerary((prev) => {
        const next = [...prev];
        const groupIdx = next.findIndex((item) => item.type === 'group' && item.id === sourceGroupId);
        if (groupIdx === -1) return prev;
        const group = next[groupIdx];
        const groupItems = [...group.items];
        const [moved] = groupItems.splice(sourceActual, 1);
        if (groupItems.length === 0) {
          next.splice(groupIdx, 1);
        } else {
          next[groupIdx] = { ...group, items: groupItems };
        }
        const insertAt = destActual;
        next.splice(insertAt, 0, moved);
        return next;
      });
      return;
    }

    const destGroupIndex = itinerary.findIndex((item) => item.type === 'group' && item.id === destGroupId);
    if (destGroupIndex === -1) return;
    const destGroup = itinerary[destGroupIndex];
    const destMapping = groupMappings[destGroupId] || [];
    const destActual = mapVisibleIndexToActual(destMapping, destination.index, destGroup.items.length);

    setItinerary((prev) => {
      const next = [...prev];
      const srcIdx = next.findIndex((item) => item.type === 'group' && item.id === sourceGroupId);
      const dstIdx = next.findIndex((item) => item.type === 'group' && item.id === destGroupId);
      if (srcIdx === -1 || dstIdx === -1) return prev;
      const srcGroup = next[srcIdx];
      const dstGroup = next[dstIdx];
      const srcItems = [...srcGroup.items];
      const dstItems = [...dstGroup.items];
      const [moved] = srcItems.splice(sourceActual, 1);
      const insertAt = destActual === null || destActual === undefined ? dstItems.length : destActual;
      dstItems.splice(insertAt, 0, moved);
      if (srcItems.length === 0) {
        next.splice(srcIdx, 1);
      } else {
        next[srcIdx] = { ...srcGroup, items: srcItems };
      }
      const adjustedDstIdx = srcIdx !== dstIdx && srcIdx < dstIdx ? dstIdx - 1 : dstIdx;
      next[adjustedDstIdx] = { ...dstGroup, items: dstItems };
      return next;
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
      'aria-pressed': isActive ? 'true' : 'false'
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
      'aria-pressed': isActive ? 'true' : 'false'
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
    const riskColor = getRiskColor(peak);
    const style = riskColor
      ? { background: `linear-gradient(135deg, ${riskColor}, #0ea5e9)` }
      : undefined;

    return React.createElement('div', {
      ref: provided.innerRef,
      ...provided.draggableProps,
      className: `itinerary-row${snapshot.isDragging ? ' is-dragging' : ''}`
    }, [
      React.createElement('span', {
        className: 'itinerary-index drag-handle',
        style,
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

  const emptyMessage = !selectedSetId
    ? 'Choose a preset to load peaks, then drag items to reorder your day.'
    : 'No peaks match the current filters.';

  let displayCounter = 0;
  const nextDisplayIndex = () => {
    displayCounter += 1;
    return displayCounter;
  };

  return React.createElement('div', { className: 'planner-shell' },
    React.createElement('div', { className: 'planner-controls' },
      React.createElement('label', { htmlFor: 'presetSelect' }, 'Choose a preset route:'),
      React.createElement('select', {
        id: 'presetSelect',
        value: selectedSetId,
        onChange: handleSetChange
      }, [
        React.createElement('option', { key: 'none', value: '' }, '-- Select --'),
        ...PRESET_SETS.map((set) =>
          React.createElement('option', { key: set.id, value: set.id }, set.name)
        )
      ])
    ),
    activePreset
      ? React.createElement('div', { className: 'preset-meta' },
          React.createElement('strong', null, `${activePreset.name}: `),
          activePreset.description
        )
      : React.createElement('div', { className: 'preset-meta' },
          'Select a preset to populate your itinerary.'
        ),
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
      !hasOverlay
        ? React.createElement('div', { className: 'filter-note' }, 'Risk and route filters are unavailable because the overlay failed to load.')
        : null
    ]),
    React.createElement('div', { className: 'group-actions' }, [
      React.createElement('span', { className: 'group-status' }, `${selectedVisiblePeaks.length} selected`),
      React.createElement('button', {
        type: 'button',
        className: 'group-btn',
        onClick: handleGroupSelected,
        disabled: selectedVisiblePeaks.length < 2
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
          ...filteredView.root.map((entry, index) => {
            const item = entry.item;
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
                      ...(item.visibleItems.length ? item.visibleItems.map((peak, peakIndex) =>
                        React.createElement(Draggable, {
                          key: `peak-${peak.id}`,
                          draggableId: `peak-${peak.id}`,
                          index: peakIndex
                        }, (peakProvided, peakSnapshot) =>
                          renderPeakRow(peak, nextDisplayIndex(), peakProvided, peakSnapshot)
                        )
                      ) : [React.createElement('div', { key: 'empty', className: 'group-empty' }, 'No peaks match current filters.')]),
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
          filteredView.root.length === 0 && !loading && !loadError
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
