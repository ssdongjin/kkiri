const assert = require("node:assert/strict");
const esbuild = require("esbuild");

async function check() {
  process.env.TZ = "Asia/Seoul";
  const build = await esbuild.build({ entryPoints: ["src/lib/nearby-restaurants.ts"], bundle: true, platform: "node", format: "cjs", write: false, define: { "import.meta.env": "{}" } });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", build.outputFiles[0].text)(require, loaded, loaded.exports);
  const { classifyRestaurant, distanceInMetres, openingStatus, filterRestaurants, pickRandomRestaurant } = loaded.exports;

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
  console.log("Nearby recommendation checks passed: distances, categories, opening hours, midnight hours, exclusions, random re-pick.");
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
