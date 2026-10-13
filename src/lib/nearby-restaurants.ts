import OpeningHours from "opening_hours";
import { LocationRequestOptions, requestDeviceLocation } from "./geolocation";

export interface SearchLocation {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export const soloCategories = ["전체", "한식", "양식", "중식", "일식", "분식", "피자", "마라탕", "버거", "기타"] as const;
export type SoloCategory = typeof soloCategories[number];
export type OpeningStatus = "open" | "closed" | "unknown";

export interface NearbyRestaurant {
  id: string;
  name: string;
  category: Exclude<SoloCategory, "전체">;
  categoryInferred: boolean;
  address: string;
  latitude: number;
  longitude: number;
  distanceMetres: number;
  openingHours?: string;
  openingStatus: OpeningStatus;
  countryCode: string;
  phone?: string;
}

interface PhotonFeature {
  geometry: { type: string; coordinates: number[] };
  properties: {
    osm_type?: string; osm_id?: number; osm_key?: string; osm_value?: string;
    name?: string; street?: string; housenumber?: string; district?: string;
    city?: string; state?: string; country?: string; countrycode?: string;
    extra?: Record<string, string>;
  };
}

interface OverpassElement {
  type: string; id: number; tags?: Record<string, string>;
}

const photonUrl = import.meta.env.VITE_PHOTON_URL || "https://photon.komoot.io";
const overpassUrl = import.meta.env.VITE_OVERPASS_URL || "https://overpass.private.coffee/api/interpreter";
const locationCache = new Map<string, SearchLocation[]>();
const restaurantCache = new Map<string, { at: number; places: NearbyRestaurant[] }>();
const hoursCache = new Map<string, Record<string, string>>();

// Search results are held in memory only. Coordinates are never stored in Supabase or browser storage.
async function requestJson<T>(url: string, signal: AbortSignal, timeout = 12000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = window.setTimeout(abort, timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`검색 서버 응답 오류 (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export function distanceInMetres(a: Pick<SearchLocation, "latitude" | "longitude">, b: Pick<SearchLocation, "latitude" | "longitude">) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value))));
}

function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function placeId(feature: PhotonFeature) {
  const type = ({ N: "node", W: "way", R: "relation" } as Record<string, string>)[feature.properties.osm_type ?? ""];
  return type && feature.properties.osm_id ? `${type}/${feature.properties.osm_id}` : "";
}

function placeAddress(feature: PhotonFeature) {
  const p = feature.properties;
  return [p.city || p.state, p.district, p.street, p.housenumber].filter(Boolean).join(" ");
}

export async function searchLocations(query: string, signal: AbortSignal): Promise<SearchLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) throw new Error("동네나 역 이름을 두 글자 이상 입력해 주세요.");
  if (locationCache.has(trimmed)) return locationCache.get(trimmed)!;
  const url = new URL("api/", `${photonUrl.replace(/\/$/, "")}/`);
  url.search = new URLSearchParams({ q: trimmed, limit: "8", countrycode: "KR" }).toString();
  const response = await requestJson<{ features: PhotonFeature[] }>(url.toString(), signal);
  const seen = new Set<string>();
  const locations = response.features.flatMap((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    const name = feature.properties.name;
    if (!name || !validCoordinates(latitude, longitude)) return [];
    const labelKey = `${name}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    if (seen.has(labelKey)) return [];
    seen.add(labelKey);
    return [{ id: placeId(feature) || labelKey, label: name, address: placeAddress(feature), latitude, longitude }];
  });
  locationCache.set(trimmed, locations);
  return locations;
}

export async function getCurrentLocation(options?: LocationRequestOptions): Promise<SearchLocation> {
  const position = await requestDeviceLocation(options);
  return { id: "current-position", label: "내 현재 위치", address: "", ...position };
}

export async function getLocationAddress(location: SearchLocation, signal: AbortSignal): Promise<string> {
  const url = new URL("reverse", `${photonUrl.replace(/\/$/, "")}/`);
  url.search = new URLSearchParams({ lat: String(location.latitude), lon: String(location.longitude), radius: "0.2", limit: "1" }).toString();
  const response = await requestJson<{ features: PhotonFeature[] }>(url.toString(), signal, 7000);
  const properties = response.features[0]?.properties;
  if (!properties) return "";
  // Show the nearby neighbourhood, not an inferred exact home or restaurant address.
  return [...new Set([properties.city || properties.state, properties.district, properties.street].filter(Boolean))].join(" ");
}

export function locationMapUrl(location: SearchLocation) {
  const latitude = location.latitude.toFixed(5), longitude = location.longitude.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

export function classifyRestaurant(name: string, cuisine = ""): NearbyRestaurant["category"] {
  const text = `${cuisine} ${name}`.toLowerCase();
  if (/마라|malatang|mala\b/.test(text)) return "마라탕";
  if (/피자|pizza/.test(text)) return "피자";
  if (/버거|맥도날드|롯데리아|맘스터치|burger|mcdonald/.test(text)) return "버거";
  if (/떡볶이|김밥|분식|순대|toppokki|kimbap/.test(text)) return "분식";
  if (/일식|초밥|스시|돈[가카]츠|라멘|우동|규[동카츠]|텐동|은행골|japanese|sushi|ramen/.test(text)) return "일식";
  if (/중식|중국|짜장|짬뽕|탕수육|양꼬치|홍콩반점|chinese|dim_sum/.test(text)) return "중식";
  if (/양식|파스타|스테이크|이탈리|프렌치|pasta|steak|italian|french|western/.test(text)) return "양식";
  if (/한식|국밥|국수|칼국수|냉면|찌개|백반|비빔밥|삼겹|갈비|설렁|감자탕|보쌈|족발|닭갈비|해장|곰탕|korean/.test(text)) return "한식";
  return "기타";
}

export function openingStatus(hours: string | undefined, latitude: number, longitude: number, countrycode = "kr", date = new Date()): OpeningStatus {
  if (!hours) return "unknown";
  try {
    // The hours library uses the device timezone. Avoid claiming an open state in a different timezone.
    if (countrycode.toLowerCase() === "kr" && Intl.DateTimeFormat().resolvedOptions().timeZone !== "Asia/Seoul") return "unknown";
    const schedule = new OpeningHours(hours, { lat: latitude, lon: longitude, address: { country_code: countrycode.toLowerCase(), state: "" } });
    return schedule.getUnknown(date) ? "unknown" : schedule.getState(date) ? "open" : "closed";
  } catch { return "unknown"; }
}

export async function searchNearbyRestaurants(location: SearchLocation, radius: number, signal: AbortSignal): Promise<NearbyRestaurant[]> {
  if (!validCoordinates(location.latitude, location.longitude) || ![500, 1000, 2000, 3000].includes(radius)) throw new Error("위치와 검색 반경을 확인해 주세요.");
  const cacheKey = `${location.latitude}:${location.longitude}:${radius}`;
  const cached = restaurantCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60000) return cached.places.map((place) => ({ ...place, openingStatus: openingStatus(place.openingHours, place.latitude, place.longitude, place.countryCode) }));
  const url = new URL("reverse", `${photonUrl.replace(/\/$/, "")}/`);
  url.search = new URLSearchParams({ lat: String(location.latitude), lon: String(location.longitude), radius: String(radius / 1000), limit: "50" }).toString();
  for (const type of ["restaurant", "fast_food", "food_court"]) url.searchParams.append("osm_tag", `amenity:${type}`);
  const response = await requestJson<{ features: PhotonFeature[] }>(url.toString(), signal, 18000);
  const places: NearbyRestaurant[] = [];
  for (const feature of response.features) {
    const p = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;
    const id = placeId(feature);
    if (!id || !p.name || p.osm_key !== "amenity" || !["restaurant", "fast_food", "food_court"].includes(p.osm_value ?? "") || !validCoordinates(latitude, longitude)) continue;
    const tags = p.extra || {};
    if (["disused", "abandoned", "demolished", "closed"].some((key) => tags[key] === "yes") || tags["disused:amenity"] || tags["abandoned:amenity"]) continue;
    const distanceMetres = distanceInMetres(location, { latitude, longitude });
    if (distanceMetres > radius || places.some((place) => place.id === id || (place.name === p.name && distanceInMetres(place, { latitude, longitude }) < 30))) continue;
    places.push({ id, name: p.name, category: classifyRestaurant(p.name, tags.cuisine), categoryInferred: !tags.cuisine,
      address: placeAddress(feature), latitude, longitude, distanceMetres,
      openingHours: tags.opening_hours, openingStatus: openingStatus(tags.opening_hours, latitude, longitude, p.countrycode), countryCode: p.countrycode?.toLowerCase() || "kr", phone: tags.phone || tags["contact:phone"],
    });
  }
  places.sort((a, b) => a.distanceMetres - b.distanceMetres);
  restaurantCache.set(cacheKey, { at: Date.now(), places });
  return places;
}

// Enrichment is optional: a slow hours server never blocks the actual nearby results.
export async function enrichRestaurantHours(places: NearbyRestaurant[], signal: AbortSignal): Promise<NearbyRestaurant[]> {
  if (!places.length) return places;
  const cacheKey = places.map((place) => place.id).sort().join(",");
  let tagsById = hoursCache.get(cacheKey);
  if (!tagsById) {
    const selections = places.map((place) => { const [type, id] = place.id.split("/"); return /^(node|way|relation)$/.test(type) && /^\d+$/.test(id) ? `${type}(${id});` : ""; }).join("");
    const query = `[out:json][timeout:6];(${selections});out tags;`;
    const url = new URL(overpassUrl);
    url.searchParams.set("data", query);
    const response = await requestJson<{ elements: OverpassElement[]; remark?: string }>(url.toString(), signal, 9000);
    if (response.remark) throw new Error("영업시간을 불러오지 못했어요.");
    tagsById = Object.fromEntries(response.elements.map((element) => [`${element.type}/${element.id}`, JSON.stringify(element.tags || {})]));
    hoursCache.set(cacheKey, tagsById);
  }
  return places.flatMap((place) => {
    const tags: Record<string, string> = JSON.parse(tagsById[place.id] || "{}");
    if (["disused", "abandoned", "demolished", "closed"].some((key) => tags[key] === "yes") || tags["disused:amenity"] || tags["abandoned:amenity"]) return [];
    const openingHours = tags.opening_hours || place.openingHours;
    return [{ ...place, category: classifyRestaurant(place.name, tags.cuisine), categoryInferred: !tags.cuisine,
      openingHours, openingStatus: openingStatus(openingHours, place.latitude, place.longitude, place.countryCode), phone: tags.phone || tags["contact:phone"] || place.phone }];
  });
}

export function filterRestaurants(places: NearbyRestaurant[], category: SoloCategory, onlyOpen: boolean) {
  return places.filter((place) => (category === "전체" || place.category === category) && place.openingStatus !== "closed" && (!onlyOpen || place.openingStatus === "open"));
}

export function pickRandomRestaurant(places: NearbyRestaurant[], previousId?: string) {
  const pool = places.length > 1 ? places.filter((place) => place.id !== previousId) : places;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

export function formatDistance(metres: number) { return metres < 1000 ? `${metres}m` : `${(metres / 1000).toFixed(1)}km`; }

export function restaurantMapUrl(place: NearbyRestaurant) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${place.address} ${place.name}`.trim())}`;
}
