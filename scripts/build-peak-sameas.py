#!/usr/bin/env python3
import json, re, math, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NH48 = ROOT / 'data' / 'nh48.json'
OUT = ROOT / 'data' / 'peak-sameas.json'
OVERRIDES = ROOT / 'data' / 'peak-sameas.overrides.json'

UA = 'nh48-sameas-builder/1.2 (https://nh48.info)'
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
WD_API = 'https://www.wikidata.org/w/api.php'


def req_json(url, timeout=12, retries=2):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception:
            if i == retries:
                raise
            time.sleep(0.3 * (i + 1))


def parse_coords(text):
    m = re.findall(r'-?\d+(?:\.\d+)?', str(text or ''))
    return (float(m[0]), float(m[1])) if len(m) >= 2 else None


def norm(s):
    s = re.sub(r'[^a-z0-9\s]', ' ', str(s or '').lower())
    s = re.sub(r'\b(mount|mt|mountain|peak)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def sim(a, b):
    sa, sb = set(norm(a).split()), set(norm(b).split())
    return (len(sa & sb) / len(sa | sb)) if sa and sb else 0.0


def km(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    x = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6371 * 2 * math.atan2(math.sqrt(x), math.sqrt(1-x))


def nominatim_lookup(name, coords):
    query = f'{name}, New Hampshire'
    params = urllib.parse.urlencode({
        'q': query,
        'format': 'jsonv2',
        'limit': 10,
        'addressdetails': 1,
        'extratags': 1,
        'namedetails': 1,
    })
    rows = req_json(f'{NOMINATIM}?{params}', timeout=15)
    best = None
    for row in rows:
        lat = float(row.get('lat', 0))
        lon = float(row.get('lon', 0))
        d = km(coords, (lat, lon)) if coords else 20
        title = row.get('namedetails', {}).get('name') or row.get('display_name', '')
        s = sim(name, title)
        if row.get('class') != 'natural' or row.get('type') not in {'peak', 'mountain'}:
            s *= 0.7
        score = s * 4 - d * 0.25
        if not best or score > best[0]:
            best = (score, row)
    return best[1] if best else None


def wd_entity(qid):
    if not qid:
        return {}
    params = urllib.parse.urlencode({
        'action': 'wbgetentities',
        'ids': qid,
        'props': 'claims|sitelinks',
        'languages': 'en|fr',
        'format': 'json',
        'origin': '*',
    })
    data = req_json(f'{WD_API}?{params}')
    return data.get('entities', {}).get(qid, {})


def claim(entity, pid):
    try:
        v = entity['claims'][pid][0]['mainsnak']['datavalue']['value']
        return v['numeric-id'] if isinstance(v, dict) and 'numeric-id' in v else v
    except Exception:
        return None


def build_links(name, hit):
    if not hit:
        return []
    links = []

    # OSM canonical
    osm_type = {'N': 'node', 'W': 'way', 'R': 'relation'}.get(hit.get('osm_type', '').upper()[:1])
    if osm_type and hit.get('osm_id'):
        links.append(f"https://www.openstreetmap.org/{osm_type}/{hit['osm_id']}")

    tags = hit.get('extratags', {}) or {}
    wd = tags.get('wikidata')
    wiki = tags.get('wikipedia')

    if wiki and ':' in wiki:
        lang, title = wiki.split(':', 1)
        if lang == 'en':
            links.insert(0, 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')))
        elif lang == 'fr':
            links.insert(0, 'https://fr.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')))

    if wd:
        entity = wd_entity(wd)
        en = entity.get('sitelinks', {}).get('enwiki', {}).get('title')
        fr = entity.get('sitelinks', {}).get('frwiki', {}).get('title')
        if en:
            links.insert(0, 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(en.replace(' ', '_')))
        if fr:
            links.insert(1, 'https://fr.wikipedia.org/wiki/' + urllib.parse.quote(fr.replace(' ', '_')))
        links.append(f'https://www.wikidata.org/wiki/{wd}')
        pid = claim(entity, 'P3109')
        if pid:
            links.append(f'https://www.peakbagger.com/peak.aspx?pid={pid}')
        for prop, kind in [('P402', 'relation'), ('P10689', 'way'), ('P11693', 'node')]:
            val = claim(entity, prop)
            if val:
                links.append(f'https://www.openstreetmap.org/{kind}/{val}')

    # dedupe https and avoid search-like URLs
    out, seen = [], set()
    for u in links:
        if not isinstance(u, str) or not u.startswith('https://'):
            continue
        if re.search(r'/search\b|[?&](q|query|search)=', u, re.I):
            continue
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def main():
    peaks = json.loads(NH48.read_text())
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    out = {}
    for slug, peak in peaks.items():
        name = peak.get('Peak Name') or peak.get('peakName') or slug
        coords = parse_coords(peak.get('Coordinates'))
        hit = None
        try:
            hit = nominatim_lookup(name, coords)
        except Exception:
            hit = None
        links = build_links(name, hit)

        if slug in overrides and isinstance(overrides[slug], list):
            links = [u for u in overrides[slug] if isinstance(u, str) and u.startswith('https://')]

        # hard fallback: always provide at least OSM object when available
        if not links and hit and hit.get('osm_type') and hit.get('osm_id'):
            kind = {'N': 'node', 'W': 'way', 'R': 'relation'}.get(hit['osm_type'].upper()[:1])
            if kind:
                links = [f"https://www.openstreetmap.org/{kind}/{hit['osm_id']}"]

        out[slug] = links
        print(f'{slug}: {len(links)}')

    OUT.write_text(json.dumps({k: out.get(k, []) for k in sorted(peaks.keys())}, indent=2) + '\n')
    print(f'Wrote {OUT}')

if __name__ == '__main__':
    main()
