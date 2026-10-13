const assert = require("node:assert/strict");
const esbuild = require("esbuild");

async function check() {
  const build = await esbuild.build({ entryPoints: ["src/lib/restaurant-menu.ts"], bundle: true, platform: "node", format: "cjs", write: false });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", build.outputFiles[0].text)(require, loaded, loaded.exports);
  const { getRestaurantMenu, safeMenuUrl } = loaded.exports;
  const place = (name, category = "기타", extra = {}) => ({ name, category, ...extra });

  const unknown = getRestaurantMenu(place("이름만 있는 식당"));
  assert.equal(unknown.evidence, "unknown");
  assert.deepEqual(unknown.mains, []);
  assert.deepEqual(unknown.sides, []);
  assert.equal(unknown.signature, undefined, "Unknown venues must not get an invented famous dish");

  const noodles = getRestaurantMenu(place("야콘냉면칼국수", "한식"));
  assert.equal(noodles.evidence, "name-inferred");
  assert.deepEqual(noodles.mains, ["칼국수", "냉면"]);
  assert.deepEqual(noodles.sides, ["만두"]);
  assert.equal(noodles.signature, undefined, "Name matching is not evidence of popularity");
  assert.deepEqual(getRestaurantMenu(place("팔도국밥", "한식")).mains, ["국밥"]);
  assert.deepEqual(getRestaurantMenu(place("춘천닭갈비", "한식")).mains, ["닭갈비"]);
  assert.deepEqual(getRestaurantMenu(place("우장군보쌈&족발", "한식")).mains, ["보쌈", "족발"]);

  const registered = getRestaurantMenu(place("이름에 버거", "일식", { cuisine: "Japanese; sushi" }));
  assert.equal(registered.evidence, "registered-cuisine");
  assert.deepEqual(registered.mains, ["초밥"], "Specific registered cuisine takes precedence over name guesses");
  const examples = getRestaurantMenu(place("일식당", "일식"));
  assert.equal(examples.evidence, "category-example");
  assert.ok(examples.mains.includes("초밥"));
  assert.equal(examples.signature, undefined);

  const mom = getRestaurantMenu(place("맘스터치 서울대입구역점", "버거"));
  assert.equal(mom.evidence, "official-brand");
  assert.ok(mom.mains.includes("싸이버거"));
  assert.ok(mom.sides.includes("케이준양념감자"));
  assert.match(mom.signature, /싸이버거/);
  assert.ok(mom.sources.length && mom.checkedAt, "Official menus need source links and verification dates");
  assert.equal(getRestaurantMenu(place("Mom's Touch", "버거")).evidence, "official-brand");
  assert.equal(getRestaurantMenu(place("홍콩반점0410 성수점", "중식")).evidence, "official-brand");
  assert.match(getRestaurantMenu(place("홍콩반점", "중식")).signature, /짬뽕/);
  const kyochon = getRestaurantMenu(place("교촌치킨", "기타"));
  assert.equal(kyochon.evidence, "official-brand");
  assert.ok(kyochon.sides.includes("웨지감자"));
  assert.equal(kyochon.signature, undefined, "A listed dish is not automatically a signature dish");
  assert.equal(getRestaurantMenu(place("다른 상호", "기타", { brand: "Kyochon" })).evidence, "official-brand");
  assert.notEqual(getRestaurantMenu(place("맘스터치 옆 국밥집", "한식")).evidence, "official-brand");
  assert.notEqual(getRestaurantMenu(place("교촌치킨스타일치킨점", "기타")).evidence, "official-brand");

  for (const unsafe of [undefined, "", "yes", "/menu", "javascript:alert(1)", "data:text/html,hello", "https://user:pass@example.com/"]) assert.equal(safeMenuUrl(unsafe), undefined);
  assert.equal(safeMenuUrl("https://example.com/menu?q=1"), "https://example.com/menu?q=1");
  assert.equal(safeMenuUrl("http://example.com/menu"), "http://example.com/menu");
  for (const entry of [mom, kyochon, getRestaurantMenu(place("홍콩반점"))]) {
    for (const source of entry.sources) assert.ok(safeMenuUrl(source.url));
  }
  console.log("Restaurant menu checks passed: official sources, main/side/signature separation, inference labels, unknown data, brand matching, safe links.");
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
