function toNumberIfNumeric(value) {
  if (typeof value !== 'string') return value;
  if (!value.length) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function parsePayloadString(rawPayload) {
  const payload = String(rawPayload || '').trim();
  if (!payload) return null;

  const search = payload.startsWith('?') ? payload.slice(1) : payload;
  const query = new URLSearchParams(search);
  const eventName = query.get('en');
  if (!eventName) return null;

  const params = {};
  for (const [key, value] of query.entries()) {
    if (key.startsWith('ep.')) {
      params[key.slice(3)] = value;
      continue;
    }
    if (key.startsWith('epn.')) {
      params[key.slice(4)] = toNumberIfNumeric(value);
      continue;
    }
  }

  return {
    eventName,
    params,
    raw: Object.fromEntries(query.entries())
  };
}

function parseGARequest(request) {
  const url = new URL(request.url());
  const payloads = [url.searchParams.toString()];
  const postData = request.postData();
  if (postData) {
    payloads.push(...String(postData).split(/\n+/));
  }

  return payloads
    .map(parsePayloadString)
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      method: request.method(),
      requestUrl: request.url(),
      timestamp: Date.now()
    }));
}

async function installGACapture(page, options = {}) {
  const events = [];
  const gaCollectRegex = /https?:\/\/[^/]*google-analytics\.com\/(?:g|j)\/collect(?:\?|$)/i;
  const localOverrides = options.localOverrides || {};

  const handler = async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const override = localOverrides[requestUrl.pathname];
    const isGaCollect = gaCollectRegex.test(request.url());

    if (override) {
      const body = typeof override.body === 'string' ? override.body : String(override.body || '');
      await route.fulfill({
        status: override.status || 200,
        headers: {
          'content-type': override.contentType || 'text/plain; charset=utf-8',
          ...(override.headers || {})
        },
        body
      });
      return;
    }

    if (isGaCollect) {
      const records = parseGARequest(request);
      records.forEach((record) => events.push(record));
      await route.fulfill({
        status: 204,
        headers: { 'content-type': 'text/plain' },
        body: ''
      });
      return;
    }

    await route.continue();
  };

  await page.route('**/*', handler);

  const getEvents = (eventName) =>
    events.filter((entry) => entry.eventName === eventName);

  return {
    events,
    getEvents
  };
}

async function waitForEvent(capture, eventName, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const minCount = options.minCount || 1;
  const predicate = options.predicate || (() => true);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const matches = capture
      .getEvents(eventName)
      .filter((event) => predicate(event));
    if (matches.length >= minCount) {
      return matches;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const seen = capture.getEvents(eventName).map((event) => event.params);
  throw new Error(
    `Timed out waiting for event "${eventName}" (${minCount}+). Seen count: ${seen.length}. Seen params: ${JSON.stringify(seen.slice(0, 10))}`
  );
}

module.exports = {
  installGACapture,
  waitForEvent
};
