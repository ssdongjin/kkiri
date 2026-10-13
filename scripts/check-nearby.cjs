const assert = require("node:assert/strict");
const esbuild = require("esbuild");

async function check() {
  process.env.TZ = "Asia/Seoul";
  const build = await esbuild.build({ entryPoints: ["src/lib/nearby-restaurants.ts"], bundle: true, platform: "node", format: "cjs", write: false, define: { "import.meta.env": "{}" } });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", build.outputFiles[0].text)(require, loaded, loaded.exports);
  const { classifyRestaurant, distanceInMetres, openingStatus, filterRestaurants, pickRandomRestaurant, enrichSelectedRestaurant } = loaded.exports;

  assert.equal(distanceInMetres({ latitude: 37.48, longitude: 126.95 }, { latitude: 37.48, longitude: 126.95 }), 0);
  const distance = distanceInMetres({ latitude: 37.48, longitude: 126.95 }, { latitude: 37.481, longitude: 126.95 });
  assert.ok(distance > 100 && distance < 115, "Distance must be in metres, not degrees");
  assert.equal(classifyRestaurant("팔도국밥"), "한식");
  assert.equal(classifyRestaurant("신촌 마라탕"), "마라탕");
  assert.equal(classifyRestaurant("Restaurant", "japanese;sushi"), "일식");
  assert.equal(classifyRestaurant("식당명만 있는 곳"), "기타");

  const noon = new Date("2026-10-13T12:00:00+09:00");
  assert.equal(openingStatus(undefined, 37.48, 126.95, "kr", noon), "unknown");
  assert.equal(openingStatus("unparseable schedule", 37.48, 126.95, "kr", noon), "unknown");
  assert.equal(openingStatus("24/7", 37.48, 126.95, "kr", noon), "open");
  assert.equal(openingStatus("Tu 10:00-20:00", 37.48, 126.95, "kr", noon), "open");
  assert.equal(openingStatus("Tu off", 37.48, 126.95, "kr", noon), "closed");
  assert.equal(openingStatus("Mo-Su 22:00-02:00", 37.48, 126.95, "kr", new Date("2026-10-14T01:00:00+09:00")), "open");

  const restaurants = [
    { id: "a", category: "한식", openingStatus: "open" },
    { id: "b", category: "한식", openingStatus: "unknown" },
    { id: "c", category: "한식", openingStatus: "closed" },
    { id: "d", category: "일식", openingStatus: "open" },
  ];
  assert.deepEqual(filterRestaurants(restaurants, "한식", false).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(filterRestaurants(restaurants, "전체", true).map((r) => r.id), ["a", "d"]);
  assert.equal(pickRandomRestaurant([]), null);
  assert.equal(pickRandomRestaurant([restaurants[0]], "a").id, "a");
  let previous;
  for (let i = 0; i < 100; i++) {
    const selected = pickRandomRestaurant(filterRestaurants(restaurants, "한식", false), previous);
    assert.notEqual(selected.id, previous, "Re-picking must avoid the previous restaurant when alternatives exist");
    previous = selected.id;
  }

  const originalFetch = global.fetch, originalWindow = global.window;
  let detailRequests = 0;
  global.window = { setTimeout, clearTimeout };
  global.fetch = async (url) => {
    detailRequests++;
    assert.match(url, /^https:\/\/api\.openstreetmap\.org\/api\/0\.6\/(node|way)\/\d+\.json$/);
    const closed = url.endsWith("/2.json");
    return { ok: true, json: async () => ({ elements: [{ type: closed ? "way" : "node", id: closed ? 2 : 1,
      tags: closed ? { "disused:amenity": "restaurant" } : { amenity: "restaurant", cuisine: "sushi", "website:menu": "https://example.com/menu", brand: "Test brand" } }] }) };
  };
  try {
    const basePlace = { id: "node/1", name: "식당", category: "기타", categoryInferred: true, latitude: 37.48, longitude: 126.95, countryCode: "kr", openingStatus: "unknown" };
    const enriched = await enrichSelectedRestaurant(basePlace, new AbortController().signal);
    assert.equal(enriched.category, "일식");
    assert.equal(enriched.categoryInferred, false);
    assert.equal(enriched.cuisine, "sushi");
    assert.equal(enriched.menuUrl, "https://example.com/menu");
    assert.equal(enriched.brand, "Test brand");
    await enrichSelectedRestaurant(basePlace, new AbortController().signal);
    assert.equal(detailRequests, 1, "Repeated picks reuse the exact record cache");
    assert.equal(await enrichSelectedRestaurant({ ...basePlace, id: "way/2" }, new AbortController().signal), null, "Closed venues must be excluded");
    assert.equal(await enrichSelectedRestaurant({ ...basePlace, id: "invalid/3" }, new AbortController().signal) !== null, true);
    assert.equal(detailRequests, 2, "Invalid IDs must not be used in API URLs");
    global.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(enrichSelectedRestaurant({ ...basePlace, id: "node/3" }, new AbortController().signal), /503/);
  } finally { global.fetch = originalFetch; global.window = originalWindow; }
  console.log("Nearby recommendation checks passed: distances, categories, opening hours, exclusions, random re-pick, selected menu metadata, detail cache, failed lookup.");
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
