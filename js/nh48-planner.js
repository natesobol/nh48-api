// NH48 Peak Planning Tool
// React 18 + @hello-pangea/dnd (loaded via CDN in nh48-planner.html)

const { useEffect, useMemo, useState } = React;
const { DragDropContext, Droppable, Draggable } = window.PangeaDnD || {};

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

function buildItinerary(preset, peaksMap) {
  if (!preset) return [];
  return preset.peaks.map((slug, index) => {
    const details = peaksMap[slug] || { slug, name: slug, range: '' };
    return {
      id: slug,
      slug,
      name: details.name,
      range: details.range
    };
  });
}

function PeakPlannerApp() {
  const [peaksMap, setPeaksMap] = useState({});
  const [itinerary, setItinerary] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch('/manifest_out.json')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load manifest');
        return r.json();
      })
      .then((data) => {
        const map = {};
        Object.values(data).forEach((entry) => {
          const slug = entry.slug || entry.peakName?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          map[slug] = {
            slug,
            name: entry.peakName || entry['Peak Name'] || slug,
            elevation: entry['Elevation (ft)'] || '',
            range: entry['Range / Subrange'] || ''
          };
        });
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
      return;
    }
    const preset = PRESET_SETS.find((set) => set.id === selectedSetId);
    setItinerary(buildItinerary(preset, peaksMap));
  }, [selectedSetId, peaksMap]);

  const activePreset = useMemo(
    () => PRESET_SETS.find((set) => set.id === selectedSetId),
    [selectedSetId]
  );

  const handleSetChange = (e) => {
    setSelectedSetId(e.target.value);
  };

  const onDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    const updated = Array.from(itinerary);
    const [moved] = updated.splice(source.index, 1);
    updated.splice(destination.index, 0, moved);
    setItinerary(updated);
  };

  if (!window.PangeaDnD) {
    return React.createElement('div', { className: 'planner-shell' },
      React.createElement('p', { className: 'planner-status' },
        'Drag-and-drop libraries failed to load. Please refresh the page.'
      )
    );
  }

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
          React.createElement('strong', null, activePreset.name + ': '),
          activePreset.description
        )
      : React.createElement('div', { className: 'preset-meta' },
          'Select a preset to populate your itinerary.'
        ),
    loading
      ? React.createElement('div', { className: 'planner-status' }, 'Loading peak data...')
      : null,
    loadError
      ? React.createElement('div', { className: 'planner-status' }, loadError)
      : null,
    React.createElement(DragDropContext, { onDragEnd },
      React.createElement(Droppable, { droppableId: 'planList' }, (provided) =>
        React.createElement('div', {
          ref: provided.innerRef,
          ...provided.droppableProps,
          className: 'itinerary-list'
        }, [
          ...itinerary.map((item, index) =>
            React.createElement(Draggable, {
              key: item.id,
              draggableId: item.id,
              index
            }, (prov, snapshot) =>
              React.createElement('div', {
                ref: prov.innerRef,
                ...prov.draggableProps,
                ...prov.dragHandleProps,
                className: `itinerary-row${snapshot.isDragging ? ' is-dragging' : ''}`
              }, [
                React.createElement('span', { className: 'itinerary-index' }, index + 1),
                React.createElement('span', { className: 'itinerary-name' }, item.name),
                React.createElement('span', { className: 'itinerary-range' }, item.range || 'Range TBD')
              ])
            )
          ),
          itinerary.length === 0 && !loading && !loadError
            ? React.createElement('div', { className: 'itinerary-empty' },
                'Choose a preset to load peaks, then drag items to reorder your day.'
              )
            : null,
          provided.placeholder
        ])
      )
    )
  );
}

const rootEl = document.getElementById('planner-root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(PeakPlannerApp));
}
