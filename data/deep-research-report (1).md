{
  "_generatedAt": "2026-02-14T00:25:57.235359Z",
  "_summary": "This TODO file covers the first 25 peaks in NH52WAV_enriched_fixed.json. For each peak, fieldsToCheck lists every field still null or left as the placeholder \"Unknown — needs research\" (per NH52WAV_todos.json). Sources were checked in the user’s priority order where possible: Peakbagger (list/peak pages for authoritative summit metrics), NHMountainHiking (info/directions pages for route stats, trail names, and trailhead coordinates), and targeted secondary sources (USFS trailhead pages and selected trip-report style references for peaks where they were retrieved). Most remaining TODOs are experiential fields (cell service, reliable water sources, scrambling/exposure details, flora zones) that are usually not explicit on index-style hike pages and require trip-report consensus; automation confidence is therefore mostly Medium, with Low for peaks where a dedicated route page was not located (e.g., Mount Resolution, Imp Face).",
  "peaks": [
    {
      "slug": "sandwich-mountain",
      "peakName": "Sandwich Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak is part of the Peakbagger 'New Hampshire 52 With a View' list; coordinates require opening the peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sandwich/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and route/trail mentions for Sandwich Dome (Sandwich Mountain) + Jennings."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sandwich/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead parking coordinates and access notes for Sandwich Dome."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-webster",
      "peakName": "Mount Webster",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "USFS trailhead pages provide lat/lon, facility notes (e.g., restrooms), and parking description; use those instead of guessing.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "USFS trailhead pages state potable water not available at those trailheads; on-route water must be verified separately; set null if unknown.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/webster/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats (distance/time/difficulty) and trail name for Mount Webster."
        },
        {
          "url": "https://www.fs.usda.gov/r09/whitemountain/recreation/webster-jackson-trailhead",
          "site": "USFS",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead details incl. lat/lon, facilities, water statement."
        },
        {
          "url": "https://www.fs.usda.gov/r09/whitemountain/recreation/webster-cliff-trailhead",
          "site": "USFS",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Alternate trailhead details incl. lat/lon and water statement."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-starr-king",
      "peakName": "Mount Starr King",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://nhmountainhiking.com/hike/waumbek/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Waumbek hike page includes Mount Starr King as a subpeak; provides trail name and hike stats used for verification context."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 35
    },
    {
      "slug": "the-horn",
      "peakName": "The Horn",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/horn/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats, approach trails, and difficulty context for The Horn."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "shelburne-moriah-mountain",
      "peakName": "Shelburne Moriah Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "SectionHiker mentions autumn appeal and winter inaccessibility; verify and summarize season guidance; otherwise null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "SectionHiker mentions a large cairn near highpoint; confirm and encode (e.g., \"Large cairn\" or \"Cairn on open summit\").",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Use SectionHiker narrative + photos to classify (likely open-summit/near-treeline views); confirm before setting controlled value.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/shelburne/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and named trails (Rattle River, Kenduskeag)."
        },
        {
          "url": "https://sectionhiker.com/lenticular-clouds-on-shelburne-moriah-mountain/",
          "site": "SectionHiker",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Narrative details supporting summit characteristics (views, cairn/krummholz) and seasonality notes."
        },
        {
          "url": "https://www.gaiagps.com/hike/246790/shelburne-moriah-mountain-via-rattle-river-appalachian-trail/",
          "site": "Gaia GPS",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Route distance/gain/time estimates as secondary validation."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 40
    },
    {
      "slug": "sugarloaf-mountain",
      "peakName": "Sugarloaf Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sugarloaf4/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and primary trail name for Sugarloaf (Groveton)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sugarloaf4/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates and access notes (seasonal road closure)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "north-baldface",
      "peakName": "North Baldface",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "USFS trailhead page mentions Emerald Pool access plus South Baldface Shelter; confirm which are on the chosen standard route and list them.",
        "Parking Notes": "USFS trailhead page provides parking capacity (~15 cars), overflow note, and lat/lon; use that and note seasonal access if any.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "USFS trailhead page states potable water not available at the trailhead; verify on-route streams/pools separately; if not verified, leave null.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/lists/52view.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Confirmed Baldface entries and link targets for Baldface Range."
        },
        {
          "url": "https://www.nhmountainhiking.com/baldface.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Peak hub page (North/South Baldface) listing hike/driving entry points."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/baldface/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Baldface Circle parking coordinates."
        },
        {
          "url": "https://www.fs.usda.gov/r09/whitemountain/recreation/baldface-trailhead",
          "site": "USFS",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking capacity, lat/lon, potable-water note, and key trail/shelter mentions."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) use USFS Baldface Trailhead page for parking capacity/water-at-trailhead statements; (3) attempt to re-fetch NHMountainHiking Baldface hiking page for route stats; (4) use trip reports for scramble/exposure/cell; otherwise set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 45
    },
    {
      "slug": "mount-success",
      "peakName": "Mount Success",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/success/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and main trail name (Success Trail)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "south-baldface",
      "peakName": "South Baldface",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "USFS trailhead page mentions Emerald Pool access plus South Baldface Shelter; confirm which are on the chosen standard route and list them.",
        "Parking Notes": "USFS trailhead page provides parking capacity (~15 cars), overflow note, and lat/lon; use that and note seasonal access if any.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "USFS trailhead page states potable water not available at the trailhead; verify on-route streams/pools separately; if not verified, leave null.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/lists/52view.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Confirmed Baldface entries and link targets for Baldface Range."
        },
        {
          "url": "https://www.nhmountainhiking.com/baldface.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Peak hub page (North/South Baldface) listing hike/driving entry points."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/baldface/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Baldface Circle parking coordinates."
        },
        {
          "url": "https://www.fs.usda.gov/r09/whitemountain/recreation/baldface-trailhead",
          "site": "USFS",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking capacity, lat/lon, potable-water note, and key trail/shelter mentions."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) use USFS Baldface Trailhead page for parking capacity/water-at-trailhead statements; (3) attempt to re-fetch NHMountainHiking Baldface hiking page for route stats; (4) use trip reports for scramble/exposure/cell; otherwise set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 45
    },
    {
      "slug": "mount-chocorua",
      "peakName": "Mount Chocorua",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/chocorua/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and primary trail name (Champney Falls Trail)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/chocorua/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead parking coordinates."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "stairs-mountain",
      "peakName": "Stairs Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "NHMountainHiking directions page could not be retrieved in this pass (cache miss). Re-fetch directly and/or use alternate sources for trailhead name/coords.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/stairs.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Peak hub page linking to hike/driving."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/stairs/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and main trail name (Davis Path)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking stairs/info.html for route stats; (3) re-fetch NHMountainHiking stairs/directions.html for trailhead coordinates; (4) use trip reports for exposure/scramble/cell; otherwise set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 40
    },
    {
      "slug": "jennings-peak",
      "peakName": "Jennings Peak",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/lists/52view.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Confirmed Jennings entry points to Sandwich Dome hub."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sandwich/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike page covers Jennings Peak + Sandwich Dome; includes trail/route context."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sandwich/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead parking coordinates for main access used in Jennings/Sandwich hikes."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-avalon",
      "peakName": "Mount Avalon",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/avalon/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail name (Avalon Trail)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/avalon/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead parking coordinates."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "percy-peaks-north",
      "peakName": "Percy Peaks — North Peak",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/percy/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats, trail names, and loop components for North/South Percy."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/percy/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates and road-closure note."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-resolution",
      "peakName": "Mount Resolution",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on Peakbagger NH 52 list as 'Mount Resolution - Southwest Summit'; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/parker.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "NHMountainHiking uses Mount Parker hub for some 'Resolution' trip references; no dedicated Resolution hike stats located."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/parker/storm.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trip-photo page explicitly referencing Mount Resolution as part of Parker/Resolution hike."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/parker/stream.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trip-photo page referencing Davis Path approach used in Crawford/Resolution trip."
        }
      ],
      "recommendedNextAction": "Manual+scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) verify standard route(s) and trailhead from AMC White Mountain Guide and at least one GPX-backed source (AllTrails/Gaia); (3) only after routes are verified, fill experiential fields from 2–3 trip reports; otherwise set null.",
      "confidence": "Low",
      "estimatedEffortMinutes": 60
    },
    {
      "slug": "magalloway-mountain",
      "peakName": "Magalloway Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/magalloway/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail names (Coot Trail, Bobcat Trail); indicates tower context."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/magalloway/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Trailhead/road-access coordinates; winter road-closure note."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-tremont",
      "peakName": "Mount Tremont",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/tremont/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail name (Mount Tremont Trail)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "three-sisters",
      "peakName": "Three Sisters",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Most Common Trailhead",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Most Common Trailhead": "Missing/uncertain. Prefer official trailhead name + coordinates from NHMountainHiking directions or USFS trailhead pages; set null if unverified.",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/lists/52view.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Confirmed 'Sister, Middle' entry, used as proxy for Three Sisters area in this dataset."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/sister/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail name (Champney Falls Trail) for Middle Sister Mountain."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "kearsarge-north",
      "peakName": "Kearsarge North",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/kearsarge_north/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail name (Mount Kearsarge North Trail)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/kearsarge_north/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-martha",
      "peakName": "Mount Martha",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/peak.aspx?pid=6947",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Cherry Mountain page documents 'Mount Martha' as an alternate name and provides summit coordinates/elevation/prominence."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) use Peakbagger Cherry Mountain page (alternate name Mount Martha) for summit coordinates; (2) identify the correct hiking route source for Cherry/Martha (avoid confusing with the unrelated 'Mount Martha' in Australia); (3) fill remaining fields from route writeups/trip reports; otherwise set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 40
    },
    {
      "slug": "smarts-mountain",
      "peakName": "Smarts Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/smarts/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats (AT approach) and tower-list context."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/smarts/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates and winter plowing note."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "west-royce-mountain",
      "peakName": "West Royce Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/royce/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail names (East Royce Trail, Royce Trail)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/royce/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates and winter access note."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "mount-paugus",
      "peakName": "Mount Paugus",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/paugus/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and route description (includes bushwhack mention)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "north-moat-mountain",
      "peakName": "North Moat Mountain",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Most Common Trailhead",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Most Common Trailhead": "Missing/uncertain. Prefer official trailhead name + coordinates from NHMountainHiking directions or USFS trailhead pages; set null if unverified.",
        "Nearby Notable Features": "NHMountainHiking references Diana's Baths along approach; include as a notable feature if using that trailhead/route.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.peakbagger.com/list.aspx?lid=5170&cid=36516",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Verified peak appears on list; coordinates require peak page."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/moat/info.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Hike stats and trail names (Moat Mountain Trail, Red Ridge Trail)."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/moat/directions.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Parking coordinates."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/moat/diana.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Diana's Baths noted as on-route feature (useful for Nearby Notable Features)."
        }
      ],
      "recommendedNextAction": "Scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) scrape NHMountainHiking info/directions pages for route stats, trail names, trailhead coordinates, and access notes; (3) fill experiential fields (cell, water, scramble, seasons, flora) only from explicit statements in trip reports/USFS/AllTrails; else set null.",
      "confidence": "Medium",
      "estimatedEffortMinutes": 25
    },
    {
      "slug": "imp-face",
      "peakName": "Imp Face",
      "fieldsToCheck": [
        "Best Seasons to Hike",
        "Cell Reception Quality",
        "Coordinates",
        "Dog Friendly",
        "Emergency Bailout Options",
        "Exposure Level",
        "Flora/Environment Zones",
        "Nearby Notable Features",
        "Parking Notes",
        "Scramble Sections",
        "Summit Marker Type",
        "Terrain Character",
        "View Type",
        "Water Availability",
        "Weather Exposure Rating"
      ],
      "fieldNotes": {
        "Best Seasons to Hike": "Still placeholder. Prefer explicit 'best times to visit' (AllTrails) or season guidance from guide/trip reports; if not explicit, set null.",
        "Cell Reception Quality": "Still placeholder. Requires trip-report consensus (None/Limited/Variable/Good); if no reliable reports found, set null.",
        "Coordinates": "Missing in dataset. Extract summit lat/lon from Peakbagger peak page (WGS84 dec deg) and store as \"lat, lon\" with 5 decimals.",
        "Dog Friendly": "Still placeholder. Requires explicit rules (state park/USFS/private land). If unknown, set null; do not assume.",
        "Emergency Bailout Options": "Still placeholder. Identify alternate trail junctions, shelters, or return-to-trailhead constraints from maps/guide; set null if unverified.",
        "Exposure Level": "Still placeholder. Use guide/trip reports to assess exposure (Low/Moderate/High); avoid guessing; set null if not explicitly supported.",
        "Flora/Environment Zones": "Still placeholder. Use explicit ecology/trail descriptions if available; otherwise set null (do not infer from elevation alone).",
        "Nearby Notable Features": "Still placeholder. Replace with an array of specific named features mentioned in sources (e.g., waterfalls, pools, towers); empty array only if verified none.",
        "Parking Notes": "Still placeholder. Use NHMountainHiking directions page or USFS trailhead page for location/capacity/fees/seasonal closures; set null if not found.",
        "Scramble Sections": "Still placeholder. Check route descriptions for hands-on moves; set 'None' only with corroboration; otherwise null.",
        "Summit Marker Type": "Still placeholder. Identify from sources (tower/cairn/sign/benchmark/none). If unverified, set null.",
        "Terrain Character": "Still placeholder. Summarize trail surface/grade from trail descriptions (NHMountainHiking/guide/trip reports); keep 3–12 words; set null if insufficient detail.",
        "View Type": "Still placeholder. Assign controlled value (360° (fire tower)|360° (open summit)|180° (open ledge)|Partial|Limited) using hike descriptions/photos; if not explicit, set null.",
        "Water Availability": "Still placeholder. Identify named brooks/streams or confirm 'None' from multiple sources; USFS trailhead water statements apply only to trailhead; set null if uncertain.",
        "Weather Exposure Rating": "Still placeholder. Use only if supported (Low/Moderate/High) based on exposure and summit type; otherwise null."
      },
      "_sourcesChecked": [
        {
          "url": "file:/mnt/data/NH52WAV_enriched_fixed.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Input dataset inspected for null/placeholder fields."
        },
        {
          "url": "file:/mnt/data/NH52WAV_todos.json",
          "site": "local",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Derived fieldsToCheck list for this peak."
        },
        {
          "url": "https://www.nhmountainhiking.com/hike/lists/52view.html",
          "site": "NHMountainHiking",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Confirmed the peak is listed; link target to 'carter.html' could not be retrieved in this pass (cache miss)."
        },
        {
          "url": "https://www.peakbagger.com/peak.aspx?pid=12515",
          "site": "Peakbagger",
          "checkedDate": "2026-02-13T00:00:00-05:00",
          "note": "Imp Face peak page used for coordinates/elevation/prominence reference availability."
        }
      ],
      "recommendedNextAction": "Manual+scriptable: (1) scrape Peakbagger peak page for summit coordinates; (2) locate a reliable route page (AllTrails/HikeNewEngland/NHFamilyHikes) for mileage/gain/time; (3) confirm trailheads (north vs south) and parking constraints; (4) fill experiential fields from multiple trip reports; otherwise set null.",
      "confidence": "Low",
      "estimatedEffortMinutes": 60
    }
  ]
}