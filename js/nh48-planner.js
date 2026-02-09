
// NH48 Peak Planning Tool
// React 18 + @hello-pangea/dnd (ESM via esm.sh)

import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { DragDropContext, Droppable, Draggable } from 'https://esm.sh/@hello-pangea/dnd@18.0.1?deps=react@18.2.0,react-dom@18.2.0';

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
const ROUTE_METRICS_KEY = 'nh48-planner-route-metrics-open';
const FILTER_DRAWER_KEY = 'nh48-planner-filters-open';
const RANGE_COLOR_FALLBACK = '#22c55e';
const USE_COMMAND_BAR_LAYOUT = true;
const SEGMENTED_TEMPLATE_IDS = ['fast-finish', 'efficient-trips', 'scenic-journey'];

const RISK_FACTORS = [
  { id: 'AboveTreelineExposure', label: 'Above-treeline exposure', color: '#f97316' },
  { id: 'LongBailout', label: 'Long bailout', color: '#f59e0b' },
  { id: 'LimitedWater', label: 'Limited water', color: '#facc15' },
  { id: 'ScrambleSteep', label: 'Scramble / steep', color: '#fb7185' },
  { id: 'UnbridgedRiverCrossings', label: 'Unbridged crossings', color: '#38bdf8' },
  { id: 'NoCellService', label: 'Especially Unreliable Cell Service', color: '#94a3b8' }
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
const ALLOWED_RISK_IDS = new Set(RISK_FACTORS.map((risk) => risk.id));

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
  const seen = new Set();
  serialized.forEach((item) => {
    if (item.type === 'group') {
      const items = (item.items || [])
        .map((slug) => peaksMap[slug])
        .filter(Boolean)
        .filter((peak) => {
          if (seen.has(peak.slug)) return false;
          seen.add(peak.slug);
          return true;
        })
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
      if (peak && !seen.has(peak.slug)) {
        seen.add(peak.slug);
        list.push(buildPeakItem(peak));
      }
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

// Returns the primary photo URL for a given peak slug.
// This follows the naming pattern used on the site: slug/slug__001.jpg.
function getPeakPhotoUrl(slug) {
  return `https://photos.nh48.info/${slug}/${slug}__001.jpg`;
}

function getPeakDetailUrl(slug) {
  return `/peak/${slug}/`;
}

function buildImageAdditionalProperties(photo) {
  const specs = [
    ['cameraMaker', 'Camera Maker'],
    ['cameraModel', 'Camera Model'],
    ['camera', 'Camera'],
    ['lens', 'Lens'],
    ['fStop', 'Aperture'],
    ['shutterSpeed', 'Shutter Speed'],
    ['iso', 'ISO'],
    ['focalLength', 'Focal Length']
  ];
  const props = [];
  specs.forEach(([field, label]) => {
    if (!photo[field]) return;
    props.push({
      '@type': 'PropertyValue',
      name: label,
      value: String(photo[field])
    });
  });
  return props;
}

function buildPlannerImageObjectGraph(rawNh48Data) {
  if (!rawNh48Data || typeof rawNh48Data !== 'object') return [];
  const graph = [];
  Object.entries(rawNh48Data).forEach(([slugKey, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const slug = entry.slug || slugKey;
    if (!slug) return;
    const photos = Array.isArray(entry.photos) ? entry.photos : [];
    const primary = photos.find((photo) => photo && photo.isPrimary)
      || photos.find((photo) => typeof photo?.filename === 'string' && photo.filename.includes('__001'))
      || photos[0]
      || null;
    const photoUrl = primary?.url || getPeakPhotoUrl(slug);
    const creatorName = primary?.author || primary?.iptc?.creator || 'Unknown';
    const altText = primary?.alt || entry.peakName || entry['Peak Name'] || slug;
    const description = primary?.extendedDescription || primary?.title || altText;
    const keywords = Array.from(new Set([
      ...(Array.isArray(primary?.tags) ? primary.tags : []),
      ...(Array.isArray(primary?.iptc?.keywords) ? primary.iptc.keywords : [])
    ].filter(Boolean).map((keyword) => String(keyword))));
    const additionalProperty = buildImageAdditionalProperties(primary || {});
    const imageObject = {
      '@type': 'ImageObject',
      '@id': `${photoUrl}#planner-image`,
      name: primary?.title || `${entry.peakName || entry['Peak Name'] || slug} summit photo`,
      description,
      caption: altText,
      contentUrl: photoUrl,
      url: photoUrl,
      creator: {
        '@type': 'Person',
        name: creatorName
      },
      associatedArticle: `https://nh48.info/peak/${slug}/`
    };
    if (primary?.width) imageObject.width = primary.width;
    if (primary?.height) imageObject.height = primary.height;
    if (primary?.captureDate) imageObject.dateCreated = primary.captureDate;
    if (primary?.captureDate || primary?.fileCreateDate) {
      imageObject.datePublished = primary.captureDate || primary.fileCreateDate;
    }
    if (keywords.length) imageObject.keywords = keywords;
    if (additionalProperty.length) imageObject.additionalProperty = additionalProperty;
    graph.push(imageObject);
  });
  return graph;
}

function sortPeaksByDifficulty(peaks) {
  return [...peaks].sort((a, b) => {
    const aTier = DIFFICULTY_ORDER.indexOf(a.difficulty || 'moderate');
    const bTier = DIFFICULTY_ORDER.indexOf(b.difficulty || 'moderate');
    if (aTier !== bTier) return aTier - bTier;
    const aOverride = DIFFICULTY_SORT_OVERRIDES[a.slug] ?? 0;
    const bOverride = DIFFICULTY_SORT_OVERRIDES[b.slug] ?? 0;
    if (aOverride !== bOverride) return aOverride - bOverride;
    const aVal = Number.isFinite(a.elevation) ? a.elevation : null;
    const bVal = Number.isFinite(b.elevation) ? b.elevation : null;
    if (aVal !== null && bVal !== null && aVal !== bVal) return aVal - bVal;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function classifySeasonBucket(text) {
  const value = (text || '').toLowerCase();
  const hasWinter = value.includes('winter');
  const hasSpring = value.includes('spring');
  const hasSummer = value.includes('summer');
  const hasFall = value.includes('fall') || value.includes('foliage');
  if (hasWinter && !hasSummer && !hasFall && !hasSpring) return 'winter';
  if (hasWinter && (hasSummer || hasFall)) return 'shoulder';
  if (hasSpring) return 'shoulder';
  return 'summer';
}

function reorder(list, startIndex, endIndex) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  let insertIndex = endIndex;
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
  const [rangeColors, setRangeColors] = useState({});
  const [rangeOrder, setRangeOrder] = useState([]);
  const [finishStrategies, setFinishStrategies] = useState([]);
  const [dayTripGroups, setDayTripGroups] = useState([]);
  const [activeStrategyId, setActiveStrategyId] = useState(null);
  const [pendingStrategyId, setPendingStrategyId] = useState(null);
  const [pendingStrategySource, setPendingStrategySource] = useState(null);
  const [showStrategyPrompt, setShowStrategyPrompt] = useState(false);
  const [loadedSavedItinerary, setLoadedSavedItinerary] = useState(false);
  const [seasonBuckets, setSeasonBuckets] = useState({});
  const [rawNh48Data, setRawNh48Data] = useState(null);
  const [routeMetricsOpen, setRouteMetricsOpen] = useState(() => {
    try {
      return window.localStorage.getItem(ROUTE_METRICS_KEY) === 'true';
    } catch (err) {
      return false;
    }
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(() => {
    try {
      return window.localStorage.getItem(FILTER_DRAWER_KEY) === 'true';
    } catch (err) {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRiskChips, setShowAllRiskChips] = useState(false);
  const [showAllRangeChips, setShowAllRangeChips] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState(null);
  const [adjacencyMap, setAdjacencyMap] = useState({});
  const [selectionWarning, setSelectionWarning] = useState('');
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const [activeRiskFilters, setActiveRiskFilters] = useState(new Set());
  const [activeRangeGroups, setActiveRangeGroups] = useState(new Set());
  const [distanceFilter, setDistanceFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [gainFilter, setGainFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [timeFilter, setTimeFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [bailoutFilter, setBailoutFilter] = useState({ ...DEFAULT_NUMERIC_FILTER });
  const [selectedPeakIds, setSelectedPeakIds] = useState(new Set());
  const [draggingType, setDraggingType] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const groupCounterRef = useRef(1);
  const templateMenuRef = useRef(null);
  const strategyParam = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('strategy');
  }, []);
  useEffect(() => {
    Promise.all([
      fetch('/manifest_out.json').then((r) => {
        if (!r.ok) throw new Error('Failed to load manifest');
        return r.json();
      }),
      fetch('/data/nh48_enriched_overlay.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/data/wmnf-ranges.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/data/nh48.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/data/nh48-planner-templates.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
      .then(([data, overlay, ranges, nh48, templates]) => {
        const colorMap = {};
        const orderedRanges = [];
        let localSeasonBuckets = {};
        if (ranges) {
          Object.values(ranges).forEach((range) => {
            if (range.rangeName) {
              colorMap[range.rangeName] = range.color || RANGE_COLOR_FALLBACK;
              orderedRanges.push(range.rangeName);
            }
          });
        }
        setRangeColors(colorMap);
        setRangeOrder(orderedRanges);
        const templateStrategies = Array.isArray(templates?.finishStrategies) ? templates.finishStrategies : [];
        const templateDayTrips = Array.isArray(templates?.dayTripGroups) ? templates.dayTripGroups : [];
        setFinishStrategies(templateStrategies);
        setDayTripGroups(templateDayTrips);
        setRawNh48Data(nh48 || null);
        let allowedSlugs = null;
        if (nh48) {
          const nameToSlug = {};
          const graph = {};
          const seasonalMap = {};
          const canonicalSlugs = new Set();
          Object.values(nh48).forEach((entry) => {
            const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (!slug) return;
            canonicalSlugs.add(slug);
            graph[slug] = new Set();
            if (entry.peakName) nameToSlug[entry.peakName] = slug;
            if (entry['Peak Name']) nameToSlug[entry['Peak Name']] = slug;
            seasonalMap[slug] = classifySeasonBucket(entry['Best Seasons to Hike']);
          });
          Object.values(nh48).forEach((entry) => {
            const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (!slug || !graph[slug]) return;
            const neighbors = Array.isArray(entry['Nearby 4000-footer Connections'])
              ? entry['Nearby 4000-footer Connections']
              : [];
            neighbors.forEach((name) => {
              const neighborSlug = nameToSlug[name];
              if (neighborSlug && neighborSlug !== slug) {
                graph[slug].add(neighborSlug);
                if (graph[neighborSlug]) {
                  graph[neighborSlug].add(slug);
                }
              }
            });
          });
          const finalized = {};
          Object.entries(graph).forEach(([slug, set]) => {
            finalized[slug] = Array.from(set);
          });
          setAdjacencyMap(finalized);
          setSeasonBuckets(seasonalMap);
          localSeasonBuckets = seasonalMap;
          allowedSlugs = canonicalSlugs;
        } else {
          setAdjacencyMap({});
          setSeasonBuckets({});
          localSeasonBuckets = {};
          const overlaySlugs = new Set();
          if (overlay) {
            Object.entries(overlay).forEach(([slugKey, overlayEntry]) => {
              if (slugKey) overlaySlugs.add(slugKey);
              if (overlayEntry?.slug) overlaySlugs.add(overlayEntry.slug);
            });
          }
          if (overlaySlugs.size > 0) {
            allowedSlugs = overlaySlugs;
            console.warn('NH48 adjacency dataset unavailable; using overlay slugs for planner scope.');
          } else {
            console.warn('NH48 adjacency and overlay datasets unavailable; using full manifest scope.');
          }
        }
        const map = {};
        Object.values(data).forEach((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          if (!slug) return;
          if (allowedSlugs && !allowedSlugs.has(slug)) return;
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
            const rawRiskFactors = Array.isArray(overlayEntry.risk_factors)
              ? overlayEntry.risk_factors
              : (Array.isArray(overlayEntry.riskFactors) ? overlayEntry.riskFactors : []);
            const filteredRiskFactors = rawRiskFactors.filter((risk) => ALLOWED_RISK_IDS.has(risk));
            map[slug] = {
              ...map[slug],
              riskFactors: filteredRiskFactors,
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
        setLoadedSavedItinerary(Boolean(saved));
        const baseItinerary = saved || buildDifficultyGroups(map);
        undoStackRef.current = [];
        redoStackRef.current = [];
        setUndoCount(0);
        setRedoCount(0);
        setItinerary(baseItinerary);
        setActiveStrategyId(null);
        if (strategyParam) {
          const requestedStrategy = templateStrategies.find((strategy) => strategy.id === strategyParam);
          if (requestedStrategy) {
            if (saved) {
              setPendingStrategyId(requestedStrategy.id);
              setPendingStrategySource('query');
              setShowStrategyPrompt(true);
            } else {
              const generated = buildItineraryFromStrategy(requestedStrategy, {
                dayTripGroups: templateDayTrips,
                rangeOrder: orderedRanges,
                seasonBuckets: localSeasonBuckets
              });
              if (generated.length) {
                setItinerary(generated);
                setActiveStrategyId(requestedStrategy.id);
              }
            }
          }
        }
        setSelectedPeakIds(new Set());
        setSelectionWarning('');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest', err);
        setRawNh48Data(null);
        setLoadError('Unable to load peak data. Please refresh or try again later.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const scriptId = 'plannerImageObjectSchema';
    const existing = document.getElementById(scriptId);
    const graph = buildPlannerImageObjectGraph(rawNh48Data);
    if (!graph.length) {
      if (existing) existing.remove();
      return;
    }
    const payload = {
      '@context': 'https://schema.org',
      '@graph': graph
    };
    const scriptEl = existing || document.createElement('script');
    scriptEl.type = 'application/ld+json';
    scriptEl.id = scriptId;
    scriptEl.textContent = JSON.stringify(payload);
    if (!existing) {
      document.head.appendChild(scriptEl);
    }
  }, [rawNh48Data]);

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
      setLastSaveTimestamp(Date.now());
    } catch (err) {
      console.warn('Failed to save itinerary', err);
    }
  }, [itinerary]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ROUTE_METRICS_KEY, routeMetricsOpen ? 'true' : 'false');
    } catch (err) {
      console.warn('Failed to persist route metrics state', err);
    }
  }, [routeMetricsOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_DRAWER_KEY, filterDrawerOpen ? 'true' : 'false');
    } catch (err) {
      console.warn('Failed to persist filter drawer state', err);
    }
  }, [filterDrawerOpen]);

  const isSelectionContiguous = useMemo(() => {
    const ids = Array.from(selectedPeakIds);
    if (ids.length <= 1) return true;
    if (!adjacencyMap || !Object.keys(adjacencyMap).length) return false;
    const selectedSet = new Set(ids);
    const queue = [ids[0]];
    const seen = new Set([ids[0]]);
    while (queue.length) {
      const current = queue.shift();
      const neighbors = adjacencyMap[current] || [];
      neighbors.forEach((neighbor) => {
        if (selectedSet.has(neighbor) && !seen.has(neighbor)) {
          seen.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    return ids.every((id) => seen.has(id));
  }, [selectedPeakIds, adjacencyMap]);

  useEffect(() => {
    if (selectedPeakIds.size === 0) {
      setSelectionWarning('');
      return;
    }
    if (!adjacencyMap || !Object.keys(adjacencyMap).length) {
      setSelectionWarning('Adjacency data is unavailable. Grouping is disabled right now.');
      return;
    }
    if (!isSelectionContiguous) {
      setSelectionWarning('Selected peaks aren’t contiguous. Group only adjacent/related peaks.');
      return;
    }
    setSelectionWarning('');
  }, [selectedPeakIds, adjacencyMap, isSelectionContiguous]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
        setTemplateMenuOpen(false);
        setFilterDrawerOpen(false);
      }
    };
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!templateMenuOpen) return;
    const handleWindowClick = (event) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target)) {
        setTemplateMenuOpen(false);
      }
    };
    window.addEventListener('click', handleWindowClick, true);
    return () => window.removeEventListener('click', handleWindowClick, true);
  }, [templateMenuOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setTemplateMenuOpen(false);
      setFilterDrawerOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const filtersActive = useMemo(() => (
    activeRiskFilters.size > 0
    || activeRangeGroups.size > 0
    || isFilterActive(distanceFilter)
    || isFilterActive(gainFilter)
    || isFilterActive(timeFilter)
    || isFilterActive(bailoutFilter)
  ), [activeRiskFilters, activeRangeGroups, distanceFilter, gainFilter, timeFilter, bailoutFilter]);
  const searchActive = searchQuery.trim().length > 0;

  const activeDayTripIds = useMemo(() => {
    const active = new Set();
    itinerary.forEach((item) => {
      if (item.type === 'group' && item.kind === 'day-trip' && item.id?.startsWith('daytrip-')) {
        active.add(item.id.replace('daytrip-', ''));
      }
    });
    return active;
  }, [itinerary]);

  const plannerStats = useMemo(() => {
    let plannedCount = 0;
    let groupCount = 0;
    let totalDistanceMi = 0;
    let totalGainFt = 0;
    const seen = new Set();
    const addPeak = (peak) => {
      if (!peak || seen.has(peak.id)) return;
      seen.add(peak.id);
      plannedCount += 1;
      if (Number.isFinite(peak.primaryDistanceMi)) totalDistanceMi += peak.primaryDistanceMi;
      if (Number.isFinite(peak.primaryGainFt)) totalGainFt += peak.primaryGainFt;
    };
    itinerary.forEach((item) => {
      if (item.type === 'group') {
        groupCount += 1;
        item.items.forEach(addPeak);
      } else {
        addPeak(item);
      }
    });
    return {
      plannedCount,
      groupCount,
      totalDistanceMi: Number(totalDistanceMi.toFixed(1)),
      totalGainFt: Math.round(totalGainFt)
    };
  }, [itinerary]);

  const activeFilterBadges = useMemo(() => {
    const badges = [];
    if (searchActive) {
      badges.push({ id: 'search', label: `Search: "${searchQuery.trim()}"` });
    }
    activeRiskFilters.forEach((riskId) => {
      badges.push({ id: `risk-${riskId}`, label: RISK_LABEL_LOOKUP[riskId] || riskId });
    });
    activeRangeGroups.forEach((group) => {
      badges.push({ id: `range-${group}`, label: group });
    });
    const numericPairs = [
      ['distance', 'Distance', distanceFilter],
      ['gain', 'Gain', gainFilter],
      ['time', 'Time', timeFilter],
      ['bailout', 'Bailout', bailoutFilter]
    ];
    numericPairs.forEach(([id, label, filter]) => {
      const min = parseNumberInput(filter.min);
      const max = parseNumberInput(filter.max);
      if (min === null && max === null) return;
      if (min !== null && max !== null) {
        badges.push({ id: `${id}-range`, label: `${label}: ${min}-${max}` });
      } else if (min !== null) {
        badges.push({ id: `${id}-min`, label: `${label} >= ${min}` });
      } else if (max !== null) {
        badges.push({ id: `${id}-max`, label: `${label} <= ${max}` });
      }
    });
    return badges;
  }, [
    searchActive,
    searchQuery,
    activeRiskFilters,
    activeRangeGroups,
    distanceFilter,
    gainFilter,
    timeFilter,
    bailoutFilter
  ]);

  const pushUndoSnapshot = (snapshot) => {
    const nextUndo = [...undoStackRef.current, snapshot];
    if (nextUndo.length > 20) nextUndo.shift();
    undoStackRef.current = nextUndo;
    redoStackRef.current = [];
    setUndoCount(nextUndo.length);
    setRedoCount(0);
  };
  const applyItineraryUpdate = (updater) => {
    setItinerary((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      pushUndoSnapshot(serializeItinerary(prev));
      return next;
    });
  };

  const handleUndo = () => {
    if (!undoStackRef.current.length) return;
    const currentSnapshot = serializeItinerary(itinerary);
    const previous = undoStackRef.current.pop();
    redoStackRef.current = [...redoStackRef.current, currentSnapshot].slice(-20);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    const restored = hydrateItinerary(previous, peaksMap) || [];
    setItinerary(restored);
    setSelectedPeakIds(new Set());
    setSelectionWarning('');
  };

  const handleRedo = () => {
    if (!redoStackRef.current.length) return;
    const currentSnapshot = serializeItinerary(itinerary);
    const nextSnapshot = redoStackRef.current.pop();
    undoStackRef.current = [...undoStackRef.current, currentSnapshot].slice(-20);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    const restored = hydrateItinerary(nextSnapshot, peaksMap) || [];
    setItinerary(restored);
    setSelectedPeakIds(new Set());
    setSelectionWarning('');
  };

  const resolveRangeName = (value) => {
    if (!value || typeof value !== 'string') return null;
    if (rangeColors[value]) return value;
    const normalized = value.toLowerCase();
    if (normalized.includes('presidential')) return 'Presidential Range';
    if (normalized.includes('franconia')) return 'Franconia Range';
    if (normalized.includes('kinsman') || normalized.includes('moosilauke') || normalized.includes('cannon')) {
      return 'Kinsman Range';
    }
    if (normalized.includes('carter') || normalized.includes('moriah') || normalized.includes('wildcat')) {
      return 'Carter-Moriah Range';
    }
    if (normalized.includes('twin') || normalized.includes('bond')) return 'Twin Range';
    if (normalized.includes('willey') || normalized.includes('field') || normalized.includes('tom')) return 'Willey Range';
    if (normalized.includes('pilot') || normalized.includes('pliny') || normalized.includes('kilkenny') || normalized.includes('cabot') || normalized.includes('waumbek')) {
      return 'Pilot–Pliny Range';
    }
    if (normalized.includes('sandwich') || normalized.includes('waterville') || normalized.includes('osceola') || normalized.includes('tripyramid') || normalized.includes('tecumseh') || normalized.includes('passaconaway') || normalized.includes('whiteface')) {
      return 'Sandwich / Waterville Range';
    }
    if (normalized.includes('pemigewasset') || normalized.includes('pemi') || normalized.includes('wilderness')) {
      return 'Pemigewasset Wilderness';
    }
    return value;
  };

  const getRangeColor = (value) => {
    const resolved = resolveRangeName(value);
    if (resolved && rangeColors[resolved]) return rangeColors[resolved];
    return RANGE_COLOR_FALLBACK;
  };

  const getGroupGradient = (group) => {
    const counts = new Map();
    group.items.forEach((peak) => {
      const rangeName = resolveRangeName(peak.rangeGroup || peak.range);
      if (!rangeName) return;
      counts.set(rangeName, (counts.get(rangeName) || 0) + 1);
    });
    if (!counts.size) return null;
    const ordered = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([rangeName]) => getRangeColor(rangeName));
    const uniqueColors = Array.from(new Set(ordered));
    const topColors = uniqueColors.slice(0, 3);
    const accent = topColors[0];
    if (topColors.length === 1) {
      return { border: topColors[0], accent };
    }
    const gradient = `linear-gradient(120deg, ${topColors.join(', ')})`;
    return { border: gradient, accent };
  };

  const clearStrategyQueryParam = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('strategy')) return;
    url.searchParams.delete('strategy');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
  };

  const buildItineraryFromStrategy = (strategy, overrides = {}) => {
    if (!strategy || !strategy.layout) return [];

    const strategyDayTripGroups = Array.isArray(overrides.dayTripGroups) ? overrides.dayTripGroups : dayTripGroups;
    const strategyRangeOrder = Array.isArray(overrides.rangeOrder) ? overrides.rangeOrder : rangeOrder;
    const strategySeasonBuckets = overrides.seasonBuckets || seasonBuckets;
    const used = new Set();
    const groupedItems = [];
    const allPeaks = Object.values(peaksMap);
    const dayTripMap = new Map(strategyDayTripGroups.map((group) => [group.id, group]));

    const addGroupBySlugs = (groupId, groupName, kind, slugs) => {
      const items = [];
      (slugs || []).forEach((slug) => {
        if (!slug || used.has(slug)) return;
        const peak = peaksMap[slug];
        if (!peak) return;
        used.add(slug);
        items.push(buildPeakItem(peak));
      });
      if (!items.length) return;
      groupedItems.push({
        type: 'group',
        id: groupId,
        name: groupName,
        kind,
        items
      });
    };

    const addLeftovers = () => {
      const leftovers = sortPeaksByDifficulty(
        allPeaks.filter((peak) => !used.has(peak.slug))
      ).map((peak) => buildPeakItem(peak));
      return leftovers;
    };

    if (strategy.layout.type === 'groupings') {
      (strategy.layout.groupOrder || []).forEach((groupId) => {
        const group = dayTripMap.get(groupId);
        if (!group) return;
        addGroupBySlugs(`daytrip-${group.id}`, group.name, 'day-trip', group.peaks);
      });
      return [...groupedItems, ...addLeftovers()];
    }

    if (strategy.layout.type === 'range') {
      const rangeBuckets = new Map();
      allPeaks.forEach((peak) => {
        const label = resolveRangeName(peak.rangeGroup || peak.range) || 'Other';
        if (!rangeBuckets.has(label)) rangeBuckets.set(label, []);
        rangeBuckets.get(label).push(peak);
      });

      const orderedRanges = [];
      strategyRangeOrder.forEach((name) => {
        const normalized = resolveRangeName(name) || name;
        if (rangeBuckets.has(normalized) && !orderedRanges.includes(normalized)) {
          orderedRanges.push(normalized);
        }
      });
      Array.from(rangeBuckets.keys())
        .sort((a, b) => a.localeCompare(b))
        .forEach((name) => {
          if (!orderedRanges.includes(name)) orderedRanges.push(name);
        });

      orderedRanges.forEach((rangeName) => {
        const peaks = sortPeaksByDifficulty(rangeBuckets.get(rangeName) || []);
        addGroupBySlugs(`strategy-range-${rangeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, rangeName, 'range', peaks.map((peak) => peak.slug));
      });
      return [...groupedItems, ...addLeftovers()];
    }

    if (strategy.layout.type === 'seasonal') {
      const seasonalOrder = [
        ['winter', 'Winter-friendly'],
        ['shoulder', 'Shoulder Season'],
        ['summer', 'Summer/Fall']
      ];
      seasonalOrder.forEach(([bucketId, label]) => {
        const peaks = sortPeaksByDifficulty(
          allPeaks.filter((peak) => (strategySeasonBuckets[peak.slug] || 'summer') === bucketId)
        );
        addGroupBySlugs(`strategy-season-${bucketId}`, label, 'seasonal', peaks.map((peak) => peak.slug));
      });
      return [...groupedItems, ...addLeftovers()];
    }

    if (strategy.layout.type === 'flat') {
      return sortPeaksByDifficulty(allPeaks).map((peak) => buildPeakItem(peak));
    }

    return [];
  };

  const peakMatchesSearch = (peak) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      peak.name || '',
      peak.rangeGroup || '',
      peak.range || '',
      ...(peak.riskFactors || []).map((risk) => RISK_LABEL_LOOKUP[risk] || risk)
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  };

  const peakMatchesFilters = (peak) => {
    if (activeRangeGroups.size > 0 && !activeRangeGroups.has(peak.rangeGroup || peak.range)) {
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
    if (!peakMatchesSearch(peak)) return false;
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
    setSearchQuery('');
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

  const clearSelection = () => {
    setSelectedPeakIds(new Set());
    setSelectionWarning('');
  };

  const handleSaveNow = () => {
    try {
      const payload = serializeItinerary(itinerary);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaveTimestamp(Date.now());
    } catch (err) {
      console.warn('Failed to save itinerary', err);
    }
  };

  const handleExport = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        itinerary: serializeItinerary(itinerary)
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'nh48-planner-itinerary.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Failed to export itinerary', err);
    }
  };

  const handleGroupSelected = () => {
    if (selectedPeaks.length < 2) return;
    if (!isSelectionContiguous) {
      setSelectionWarning('Selected peaks aren’t contiguous. Group only adjacent/related peaks.');
      return;
    }
    const groupId = `custom-${Date.now()}-${groupCounterRef.current}`;
    const groupName = `Custom Group ${groupCounterRef.current}`;
    groupCounterRef.current += 1;

    applyItineraryUpdate((prev) => {
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
    applyItineraryUpdate((prev) => {
      const index = prev.findIndex((item) => item.type === 'group' && item.id === groupId);
      if (index === -1) return prev;
      const group = prev[index];
      const next = [...prev.slice(0, index), ...group.items, ...prev.slice(index + 1)];
      return next;
    });
    clearSelection();
  };

  const applyStrategyById = (strategyId, options = {}) => {
    const { skipUndo = false } = options;
    const strategy = finishStrategies.find((entry) => entry.id === strategyId);
    if (!strategy) return;
    const nextItinerary = buildItineraryFromStrategy(strategy);
    if (!nextItinerary.length) return;
    if (skipUndo) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      setUndoCount(0);
      setRedoCount(0);
      setItinerary(nextItinerary);
    } else {
      applyItineraryUpdate(() => nextItinerary);
    }
    setActiveStrategyId(strategyId);
    clearSelection();
  };

  const requestStrategyApply = (strategyId, source = 'toolbar') => {
    if (!strategyId) return;
    if (loadedSavedItinerary) {
      setPendingStrategyId(strategyId);
      setPendingStrategySource(source);
      setShowStrategyPrompt(true);
      return;
    }
    applyStrategyById(strategyId);
  };

  const confirmStrategyReplace = () => {
    if (!pendingStrategyId) return;
    applyStrategyById(pendingStrategyId);
    if (pendingStrategySource === 'query') {
      clearStrategyQueryParam();
    }
    setPendingStrategyId(null);
    setPendingStrategySource(null);
    setShowStrategyPrompt(false);
  };

  const cancelStrategyReplace = () => {
    if (pendingStrategySource === 'query') {
      clearStrategyQueryParam();
    }
    setPendingStrategyId(null);
    setPendingStrategySource(null);
    setShowStrategyPrompt(false);
  };

  const handleAutoGroupById = (presetId) => {
    if (!presetId) return;
    const preset = dayTripGroups.find((set) => set.id === presetId);
    if (!preset) return;
    const slugSet = new Set(preset.peaks);
    const groupId = `daytrip-${preset.id}`;

    applyItineraryUpdate((prev) => {
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
    clearSelection();
  };

  const openContextMenu = (event, payload) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      ...payload,
      x: event.clientX,
      y: event.clientY
    });
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
    if (result.draggableId.startsWith('group-') && destination.droppableId.startsWith('group-')) {
      return;
    }

    applyItineraryUpdate((prev) => {
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
    const color = getRangeColor(group);
    return React.createElement('button', {
      key: group,
      type: 'button',
      className: `chip-button${isActive ? ' is-active' : ''}${!hasOverlay ? ' is-disabled' : ''}`,
      onClick: () => toggleRangeGroup(group),
      disabled: !hasOverlay,
      'aria-pressed': isActive ? 'true' : 'false',
      style: { '--chip-color': color }
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
    const safeRisks = peak.riskFactors.filter((risk) => ALLOWED_RISK_IDS.has(risk));
    if (!safeRisks.length) return null;
    return React.createElement('div', { className: 'risk-tags' },
      safeRisks.map((risk) => React.createElement('span', { key: risk, className: 'risk-tag' }, [
        React.createElement('span', { className: 'risk-tag-dot', style: { background: RISK_COLOR_LOOKUP[risk] || '#94a3b8' } }),
        React.createElement('span', null, RISK_LABEL_LOOKUP[risk] || risk)
      ]))
    );
  };

  const renderPeakRow = (peak, displayIndex, provided, snapshot) => {
    const matchesFilters = filtersActive && peakMatchesFilters(peak);
    const highlightColor = matchesFilters ? getHighlightColor(peak) : null;
    const photoUrl = getPeakPhotoUrl(peak.slug);
    const dragStyle = provided.draggableProps?.style || {};
    const style = highlightColor
      ? { ...dragStyle, '--highlight-color': highlightColor }
      : dragStyle;
    const indexStyle = highlightColor
      ? {
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.96))',
        boxShadow: `0 0 0 1px ${highlightColor}88, 0 6px 14px rgba(2, 6, 23, 0.56)`,
        color: '#f8fafc'
      }
      : undefined;
    const isSelected = selectedPeakIds.has(peak.id);

    return React.createElement('div', {
      ref: provided.innerRef,
      ...provided.draggableProps,
      ...provided.dragHandleProps,
      style,
      className: `itinerary-row${snapshot.isDragging ? ' is-dragging' : ''}${matchesFilters ? ' is-highlighted' : ''}${isSelected ? ' is-selected' : ''}`,
      onContextMenu: (event) => openContextMenu(event, { type: 'peak', id: peak.id })
    }, [
      React.createElement('div', {
        className: 'itinerary-photo-banner',
        style: { backgroundImage: `url('${photoUrl}')` }
      }, [
        React.createElement('span', { className: 'itinerary-grab-rail', 'aria-hidden': 'true' }),
        React.createElement('div', { className: 'itinerary-banner-top' }, [
          React.createElement('span', {
            className: 'itinerary-index',
            style: indexStyle
          }, displayIndex),
          React.createElement('span', { className: 'itinerary-range' }, peak.rangeGroup || peak.range || 'Range TBD')
        ]),
        React.createElement('div', { className: 'itinerary-details' }, [
          React.createElement('div', { className: 'itinerary-name-row' }, [
            React.createElement('input', {
              type: 'checkbox',
              className: 'row-checkbox',
              checked: isSelected,
              onChange: () => togglePeakSelection(peak.id),
              onMouseDown: (event) => event.stopPropagation(),
              onTouchStart: (event) => event.stopPropagation(),
              'aria-label': isSelected ? `Deselect ${peak.name}` : `Select ${peak.name}`
            }),
            React.createElement('a', {
              className: 'itinerary-name itinerary-peak-link',
              href: getPeakDetailUrl(peak.slug),
              target: '_blank',
              rel: 'noopener',
              onMouseDown: (event) => event.stopPropagation(),
              onTouchStart: (event) => event.stopPropagation(),
              onClick: (event) => event.stopPropagation(),
              'aria-label': `Open ${peak.name} peak details`
            }, peak.name)
          ]),
          renderMetrics(peak)
        ]),
        renderRiskTags(peak)
      ])
    ]);
  };

  const getGroupLabel = (group) => {
    if (group.kind === 'day-trip') return 'Day-trip group';
    if (group.kind === 'difficulty') return 'Difficulty group';
    return 'Custom group';
  };

  const emptyMessage = 'No peaks available.';
  const canGroupSelection = selectedPeaks.length >= 2 && isSelectionContiguous;

  const displayOrderMap = useMemo(() => {
    const map = new Map();
    let index = 1;
    const addPeak = (peak) => {
      if (!map.has(peak.id)) {
        map.set(peak.id, index);
        index += 1;
      }
    };
    itinerary.forEach((item) => {
      if (item.type === 'peak') {
        addPeak(item);
      } else {
        item.items.forEach(addPeak);
      }
    });
    return map;
  }, [itinerary]);
  const getDisplayIndexForPeak = (peakId, fallbackIndex) => {
    const mapped = displayOrderMap.get(peakId);
    if (Number.isFinite(mapped)) return mapped;
    let index = 1;
    for (const item of itinerary) {
      if (item.type === 'peak') {
        if (item.id === peakId) return index;
        index += 1;
        continue;
      }
      for (const peak of item.items) {
        if (peak.id === peakId) return index;
        index += 1;
      }
    }
    return fallbackIndex;
  };

  const segmentedStrategies = useMemo(
    () => finishStrategies.filter((strategy) => SEGMENTED_TEMPLATE_IDS.includes(strategy.id)),
    [finishStrategies]
  );
  const overflowStrategies = useMemo(
    () => finishStrategies.filter((strategy) => !SEGMENTED_TEMPLATE_IDS.includes(strategy.id)),
    [finishStrategies]
  );
  const visibleRiskFactors = useMemo(
    () => (showAllRiskChips ? RISK_FACTORS : RISK_FACTORS.slice(0, 6)),
    [showAllRiskChips]
  );
  const visibleRangeGroups = useMemo(
    () => (showAllRangeChips ? rangeGroupOptions : rangeGroupOptions.slice(0, 8)),
    [showAllRangeChips, rangeGroupOptions]
  );
  const activeFilterCount = activeFilterBadges.length;
  const hasAnySearchOrFilter = filtersActive || searchActive;
  const isListLocked = hasAnySearchOrFilter;
  const renderedItinerary = useMemo(() => {
    if (!hasAnySearchOrFilter) return itinerary;
    return itinerary
      .map((item) => {
        if (item.type === 'peak') {
          return peakMatchesFilters(item) ? item : null;
        }
        const visibleItems = item.items.filter(peakMatchesFilters);
        return { ...item, items: visibleItems };
      })
      .filter(Boolean);
  }, [
    itinerary,
    hasAnySearchOrFilter,
    activeRiskFilters,
    activeRangeGroups,
    distanceFilter,
    gainFilter,
    timeFilter,
    bailoutFilter,
    searchQuery
  ]);

  const progressText = `${plannerStats.plannedCount}/48 planned • ${plannerStats.groupCount} grouped • ${plannerStats.totalDistanceMi} mi • ${plannerStats.totalGainFt.toLocaleString()} ft`;
  const activeTemplate = finishStrategies.find((strategy) => strategy.id === activeStrategyId) || null;

  const filtersPanel = React.createElement('div', { className: `planner-filters${!hasOverlay ? ' is-disabled' : ''}` }, [
    React.createElement('div', { className: 'filters-header' }, [
      React.createElement('h3', null, 'Filters'),
      React.createElement('button', {
        type: 'button',
        className: 'filter-clear',
        onClick: clearFilters,
        disabled: !hasOverlay
      }, 'Clear all')
    ]),
    activeFilterBadges.length
      ? React.createElement('div', { className: 'active-filter-row' },
        activeFilterBadges.map((badge) => React.createElement('span', { key: badge.id, className: 'active-filter-chip' }, badge.label))
      )
      : React.createElement('div', { className: 'filter-empty' }, 'No active filters.'),
    React.createElement('div', { className: 'filters-grid drawer-columns' }, [
      React.createElement('div', { className: 'filter-block' }, [
        React.createElement('span', { className: 'filter-title' }, 'Risk factors'),
        React.createElement('div', { className: `filter-chips${showAllRiskChips ? '' : ' chip-grid-limited'}` }, visibleRiskFactors.map(riskChip)),
        RISK_FACTORS.length > visibleRiskFactors.length
          ? React.createElement('button', {
            type: 'button',
            className: 'show-more-button',
            onClick: () => setShowAllRiskChips(true)
          }, `Show ${RISK_FACTORS.length - visibleRiskFactors.length} more`)
          : null,
        showAllRiskChips && RISK_FACTORS.length > 6
          ? React.createElement('button', {
            type: 'button',
            className: 'show-more-button',
            onClick: () => setShowAllRiskChips(false)
          }, 'Show less')
          : null
      ]),
      React.createElement('div', { className: 'filter-block' }, [
        React.createElement('span', { className: 'filter-title' }, 'Grouping helpers'),
        React.createElement('div', { className: `filter-chips${showAllRangeChips ? '' : ' chip-grid-limited'}` },
          visibleRangeGroups.length
            ? visibleRangeGroups.map(rangeChip)
            : React.createElement('span', { className: 'filter-empty' }, 'Range groups unavailable.')
        ),
        rangeGroupOptions.length > visibleRangeGroups.length
          ? React.createElement('button', {
            type: 'button',
            className: 'show-more-button',
            onClick: () => setShowAllRangeChips(true)
          }, `Show ${rangeGroupOptions.length - visibleRangeGroups.length} more`)
          : null,
        showAllRangeChips && rangeGroupOptions.length > 8
          ? React.createElement('button', {
            type: 'button',
            className: 'show-more-button',
            onClick: () => setShowAllRangeChips(false)
          }, 'Show less')
          : null,
        React.createElement('div', { className: 'auto-group' }, [
          React.createElement('span', { className: 'filter-title' }, 'Auto-group day trips'),
          React.createElement('div', { className: 'auto-group-toggles' },
            dayTripGroups.length
              ? dayTripGroups.map((set) => {
                const isActive = activeDayTripIds.has(set.id);
                return React.createElement('button', {
                  key: set.id,
                  type: 'button',
                  className: `toggle-button${isActive ? ' is-active' : ''}`,
                  onClick: () => handleAutoGroupById(set.id),
                  title: set.description
                }, set.name);
              })
              : React.createElement('span', { className: 'filter-empty' }, 'Templates unavailable.')
          ),
          React.createElement('span', { className: 'filter-note' }, 'Create a grouped panel for a classic NH48 day-trip.')
        ])
      ])
    ]),
    React.createElement('div', { className: `filter-block metrics-block${routeMetricsOpen ? ' is-open' : ''}` }, [
      React.createElement('button', {
        type: 'button',
        className: 'metrics-toggle',
        onClick: () => setRouteMetricsOpen((prev) => !prev),
        'aria-expanded': routeMetricsOpen ? 'true' : 'false',
        'aria-controls': 'routeMetricsPanel'
      }, [
        React.createElement('span', null, 'Route metrics'),
        React.createElement('span', { className: 'metrics-toggle-icon' }, routeMetricsOpen ? 'Hide' : 'Show')
      ]),
      routeMetricsOpen
        ? React.createElement('div', { className: 'filter-numbers', id: 'routeMetricsPanel' }, [
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
        : null
    ]),
    !hasOverlay
      ? React.createElement('div', { className: 'filter-note' }, 'Risk and route filters are unavailable because the overlay failed to load.')
      : null
  ]);

  const commandBar = React.createElement('div', { className: 'planner-command-bar' }, [
    React.createElement('div', { className: 'command-left' }, [
      React.createElement('h3', { className: 'command-title' }, 'NH48 Peak Planner'),
      React.createElement('div', { className: 'command-progress' }, progressText),
      activeTemplate
        ? React.createElement('span', { className: 'command-badge' }, `Template: ${activeTemplate.name}`)
        : null
    ]),
    React.createElement('div', { className: 'command-search-wrap' }, [
      React.createElement('input', {
        type: 'search',
        className: 'command-search',
        value: searchQuery,
        onChange: (event) => setSearchQuery(event.target.value),
        placeholder: 'Search peaks, groups, routes...',
        'aria-label': 'Search peaks, groups, routes'
      })
    ]),
    React.createElement('div', { className: 'command-right' }, [
      React.createElement('div', { className: 'template-segment', ref: templateMenuRef }, [
        ...segmentedStrategies.map((strategy) =>
          React.createElement('button', {
            key: strategy.id,
            type: 'button',
            className: `command-btn template-btn${activeStrategyId === strategy.id ? ' is-active' : ''}`,
            onClick: () => requestStrategyApply(strategy.id, 'toolbar'),
            title: `${strategy.duration} | ${strategy.tripRange}`
          }, `${strategy.icon || ''} ${strategy.name}`.trim())
        ),
        overflowStrategies.length
          ? React.createElement('div', { className: 'template-more-wrap' }, [
            React.createElement('button', {
              type: 'button',
              className: `command-btn template-btn${templateMenuOpen ? ' is-open' : ''}`,
              onClick: () => setTemplateMenuOpen((prev) => !prev),
              'aria-expanded': templateMenuOpen ? 'true' : 'false',
              'aria-controls': 'templateMoreMenu'
            }, 'More'),
            templateMenuOpen
              ? React.createElement('div', { className: 'template-more-menu', id: 'templateMoreMenu' },
                overflowStrategies.map((strategy) =>
                  React.createElement('button', {
                    key: strategy.id,
                    type: 'button',
                    className: `template-more-item${activeStrategyId === strategy.id ? ' is-active' : ''}`,
                    onClick: () => {
                      requestStrategyApply(strategy.id, 'toolbar');
                      setTemplateMenuOpen(false);
                    }
                  }, `${strategy.icon || ''} ${strategy.name}`.trim())
                )
              )
              : null
          ])
          : null
      ]),
      React.createElement('button', {
        type: 'button',
        className: `command-btn${filterDrawerOpen ? ' is-active' : ''}`,
        onClick: () => setFilterDrawerOpen((prev) => !prev),
        'aria-expanded': filterDrawerOpen ? 'true' : 'false',
        'aria-controls': 'plannerFilterDrawer'
      }, `Filters (${activeFilterCount})`),
      React.createElement('button', {
        type: 'button',
        className: 'command-btn',
        onClick: handleUndo,
        disabled: undoCount === 0
      }, 'Undo'),
      React.createElement('button', {
        type: 'button',
        className: 'command-btn',
        onClick: handleRedo,
        disabled: redoCount === 0
      }, 'Redo'),
      React.createElement('button', {
        type: 'button',
        className: 'command-btn',
        onClick: handleSaveNow
      }, lastSaveTimestamp ? 'Saved' : 'Save'),
      React.createElement('button', {
        type: 'button',
        className: 'command-btn',
        onClick: handleExport
      }, 'Export')
    ])
  ]);

  return React.createElement('div', { className: 'planner-shell' },
    USE_COMMAND_BAR_LAYOUT
      ? commandBar
      : (
        finishStrategies.length
          ? React.createElement('div', { className: 'strategy-toolbar' }, [
            React.createElement('span', { className: 'strategy-toolbar-label' }, 'Finish strategy templates'),
            React.createElement('div', { className: 'strategy-toolbar-list' },
              finishStrategies.map((strategy) => {
                const isActive = activeStrategyId === strategy.id;
                return React.createElement('button', {
                  key: strategy.id,
                  type: 'button',
                  className: `strategy-pill${isActive ? ' is-active' : ''}`,
                  onClick: () => requestStrategyApply(strategy.id, 'toolbar'),
                  title: `${strategy.duration} | ${strategy.tripRange}`
                }, [
                  React.createElement('span', { className: 'strategy-pill-icon' }, strategy.icon || ' '),
                  React.createElement('span', { className: 'strategy-pill-name' }, strategy.name)
                ]);
              })
            )
          ])
          : null
      ),
    USE_COMMAND_BAR_LAYOUT
      ? React.createElement('div', {
        id: 'plannerFilterDrawer',
        className: `planner-filter-drawer${filterDrawerOpen ? ' is-open' : ''}`
      }, [filtersPanel])
      : filtersPanel,
    selectedPeakIds.size > 0
      ? React.createElement('div', { className: 'selection-actions' }, [
        React.createElement('span', { className: 'group-status' }, `${selectedPeaks.length} selected`),
        React.createElement('button', {
          type: 'button',
          className: 'group-btn',
          onClick: handleGroupSelected,
          disabled: !canGroupSelection
        }, 'Group selected'),
        React.createElement('button', {
          type: 'button',
          className: 'group-btn ghost',
          onClick: clearSelection
        }, 'Clear'),
        React.createElement('button', {
          type: 'button',
          className: 'group-btn ghost',
          onClick: handleUndo,
          disabled: undoCount === 0
        }, 'Undo'),
        React.createElement('button', {
          type: 'button',
          className: 'group-btn ghost',
          onClick: handleRedo,
          disabled: redoCount === 0
        }, 'Redo')
      ])
      : null,
    selectionWarning
      ? React.createElement('div', { className: 'selection-warning' }, selectionWarning)
      : null,
    loading
      ? React.createElement('div', { className: 'planner-status' }, 'Loading peak data...')
      : null,
    loadError
      ? React.createElement('div', { className: 'planner-status' }, loadError)
      : null,
    isListLocked
      ? React.createElement('div', { className: 'planner-status' }, 'Filtering is active. Clear filters to drag and reorder the full itinerary.')
      : null,
    React.createElement(DragDropContext, {
      onDragStart: (start) => {
        if (isListLocked) return;
        const isGroup = start.draggableId.startsWith('group-');
        setDraggingType(isGroup ? 'group' : 'peak');
        setContextMenu(null);
      },
      onDragEnd: (result) => {
        setDraggingType(null);
        if (isListLocked) return;
        onDragEnd(result);
      }
    },
      React.createElement(Droppable, { droppableId: 'root', isDropDisabled: isListLocked }, (provided) =>
        React.createElement('div', {
          ref: provided.innerRef,
          ...provided.droppableProps,
          className: 'itinerary-list'
        }, [
          ...renderedItinerary.map((item, index) => {
            if (item.type === 'group') {
              return React.createElement(Draggable, {
                key: `group-${item.id}`,
                draggableId: `group-${item.id}`,
                index,
                isDragDisabled: isListLocked
              }, (prov, snapshot) =>
                (() => {
                  const groupMeta = getGroupGradient(item);
                  const dragStyle = prov.draggableProps?.style || {};
                  const style = groupMeta
                    ? { ...dragStyle, '--group-border': groupMeta.border, '--group-accent': groupMeta.accent }
                    : dragStyle;
                  return React.createElement('div', {
                  ref: prov.innerRef,
                  ...prov.draggableProps,
                  style,
                  className: `itinerary-group${snapshot.isDragging ? ' is-dragging' : ''}`
                }, [
                  React.createElement('div', {
                    className: 'group-header',
                    ...prov.dragHandleProps,
                    onContextMenu: (event) => openContextMenu(event, { type: 'group', id: item.id })
                  }, [
                    React.createElement('span', {
                      className: 'drag-handle group-handle'
                    }, 'drag'),
                    React.createElement('div', { className: 'group-title' }, [
                      React.createElement('strong', null, item.name),
                      React.createElement('span', { className: 'group-badge' }, getGroupLabel(item)),
                      React.createElement('span', { className: 'group-meta' }, `${item.items.length} peaks`)
                    ]),
                    React.createElement('button', {
                      type: 'button',
                      className: 'group-btn ghost',
                      onClick: () => handleUngroup(item.id),
                      onMouseDown: (event) => event.stopPropagation(),
                      onTouchStart: (event) => event.stopPropagation()
                    }, 'Ungroup')
                  ]),
                  React.createElement(Droppable, { droppableId: `group-${item.id}`, isDropDisabled: draggingType === 'group' || isListLocked }, (groupProvided) =>
                    React.createElement('div', {
                      ref: groupProvided.innerRef,
                      ...groupProvided.droppableProps,
                      className: `group-list${draggingType === 'group' || isListLocked ? ' is-disabled' : ''}`
                    }, [
                      ...(item.items.length ? item.items.map((peak, peakIndex) =>
                        React.createElement(Draggable, {
                          key: `peak-${peak.id}`,
                          draggableId: `peak-${peak.id}`,
                          index: peakIndex,
                          isDragDisabled: isListLocked
                        }, (peakProvided, peakSnapshot) =>
                          renderPeakRow(peak, getDisplayIndexForPeak(peak.id, peakIndex + 1), peakProvided, peakSnapshot)
                        )
                      ) : [React.createElement('div', { key: 'empty', className: 'group-empty' }, hasAnySearchOrFilter ? 'No peaks match current filters.' : 'Group is empty.')]),
                      groupProvided.placeholder
                    ])
                  )
                ]);
                })()
              );
            }

            return React.createElement(Draggable, {
              key: `peak-${item.id}`,
              draggableId: `peak-${item.id}`,
              index,
              isDragDisabled: isListLocked
            }, (prov, snapshot) =>
              renderPeakRow(item, getDisplayIndexForPeak(item.id, index + 1), prov, snapshot)
            );
          }),
          renderedItinerary.length === 0 && !loading && !loadError
            ? React.createElement('div', { className: 'itinerary-empty' }, hasAnySearchOrFilter ? 'No peaks match the active filters.' : emptyMessage)
            : null,
          provided.placeholder
        ])
      )
    ),
    showStrategyPrompt
      ? React.createElement('div', { className: 'strategy-modal-backdrop', role: 'presentation' },
        React.createElement('div', { className: 'strategy-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'strategyModalTitle' }, [
          React.createElement('h3', { id: 'strategyModalTitle' }, 'Replace saved itinerary?'),
          React.createElement('p', null, 'A saved itinerary already exists. Applying this strategy will replace your current list.'),
          React.createElement('div', { className: 'strategy-modal-actions' }, [
            React.createElement('button', {
              type: 'button',
              className: 'group-btn ghost',
              onClick: cancelStrategyReplace
            }, 'Cancel'),
            React.createElement('button', {
              type: 'button',
              className: 'group-btn',
              onClick: confirmStrategyReplace
            }, 'Replace')
          ])
        ])
      )
      : null,
    contextMenu
      ? React.createElement('div', {
        className: 'context-menu',
        style: {
          top: `${contextMenu.y}px`,
          left: `${contextMenu.x}px`
        }
      }, [
        contextMenu.type === 'peak'
          ? React.createElement('button', {
            type: 'button',
            onClick: (event) => {
              event.stopPropagation();
              togglePeakSelection(contextMenu.id);
              setContextMenu(null);
            }
          }, selectedPeakIds.has(contextMenu.id) ? 'Remove from selection' : 'Add to selection')
          : null,
        contextMenu.type === 'group'
          ? React.createElement('button', {
            type: 'button',
            onClick: (event) => {
              event.stopPropagation();
              handleUngroup(contextMenu.id);
              setContextMenu(null);
            }
          }, 'Ungroup')
          : null,
        React.createElement('button', {
          type: 'button',
          onClick: (event) => {
            event.stopPropagation();
            handleUndo();
            setContextMenu(null);
          },
          disabled: undoCount === 0
        }, 'Undo'),
        React.createElement('button', {
          type: 'button',
          onClick: (event) => {
            event.stopPropagation();
            handleRedo();
            setContextMenu(null);
          },
          disabled: redoCount === 0
        }, 'Redo')
      ])
      : null
  );
}

const rootEl = document.getElementById('planner-root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(React.createElement(PeakPlannerApp));
}
