import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./solo.css";
import {
  enrichRestaurantHours, filterRestaurants, formatDistance, getCurrentLocation,
  NearbyRestaurant, pickRandomRestaurant, restaurantMapUrl, SearchLocation,
  searchLocations, searchNearbyRestaurants, soloCategories, SoloCategory,
} from "../lib/nearby-restaurants";

const icons: Record<string, string> = { 한식: "🍚", 양식: "🍝", 중식: "🥟", 일식: "🍱", 분식: "🍜", 피자: "🍕", 마라탕: "🌶️", 버거: "🍔", 기타: "🍽️" };
const statusLabels = { open: "영업시간상 영업 중", closed: "영업시간상 휴무", unknown: "영업 정보 확인 필요" };

function RestaurantCard({ place, featured = false }: { place: NearbyRestaurant; featured?: boolean }) {
  return <article className={`solo-place ${featured ? "solo-pick" : ""}`}>
    {featured && <p className="eyebrow">오늘은 여기 어때요?</p>}
    <div className="flex items-start gap-3">
      <span className="food-icon" aria-hidden="true">{icons[place.category]}</span>
      <div className="min-w-0 flex-1">
        <h3>{place.name}</h3>
        <p className="solo-meta">{place.category}{place.categoryInferred && place.category !== "기타" ? " · 식당명 기준 분류" : ""} · 직선거리 {formatDistance(place.distanceMetres)}</p>
      </div>
    </div>
    {place.address && <p className="solo-address">{place.address}</p>}
    <span className={`opening-label ${place.openingStatus}`}>{statusLabels[place.openingStatus]}</span>
    {place.openingHours && <details className="solo-hours"><summary>등록된 영업시간 보기</summary><p>{place.openingHours}</p></details>}
    <a className={featured ? "map-link mt-4" : "solo-map-link"} href={restaurantMapUrl(place)} target="_blank" rel="noopener noreferrer">네이버지도에서 확인 ↗</a>
  </article>;
}

export default function Solo() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<SearchLocation[]>([]);
  const [location, setLocation] = useState<SearchLocation | null>(null);
  const [finding, setFinding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [radius, setRadius] = useState(1000);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [category, setCategory] = useState<SoloCategory>("전체");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [chosenId, setChosenId] = useState<string | undefined>();
  const [searchCount, setSearchCount] = useState(0);
  const locationRequest = useRef<AbortController>();

  useEffect(() => () => locationRequest.current?.abort(), []);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    setLoading(true); setRestaurants([]); setChosenId(undefined); setSearchError(""); setHoursLoading(false);
    void (async () => {
      try {
        const places = await searchNearbyRestaurants(location, radius, controller.signal);
        if (controller.signal.aborted) return;
        setRestaurants(places); setLoading(false);
        if (places.length) {
          setHoursLoading(true);
          try {
            const enriched = await enrichRestaurantHours(places, controller.signal);
            if (!controller.signal.aborted) setRestaurants(enriched);
          } catch { /* Missing opening-hour data stays explicitly unknown. */ }
          finally { if (!controller.signal.aborted) setHoursLoading(false); }
        }
      } catch {
        if (!controller.signal.aborted) { setLoading(false); setSearchError("주변 식당을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 검색해 주세요."); }
      }
    })();
    return () => controller.abort();
  }, [location, radius, searchCount]);

  const findLocation = async (event: FormEvent) => {
    event.preventDefault();
    locationRequest.current?.abort();
    const controller = new AbortController(); locationRequest.current = controller;
    setFinding(true); setLocationError(""); setLocations([]);
    try {
      const matches = await searchLocations(query, controller.signal);
      if (controller.signal.aborted) return;
      setLocations(matches);
      if (!matches.length) setLocationError("검색 결과가 없어요. 역 이름이나 동네 이름을 바꿔 보세요.");
    } catch (error) {
      if (!controller.signal.aborted) setLocationError(error instanceof Error && error.message.startsWith("동네") ? error.message : "동네 검색에 실패했어요. 다시 시도하거나 현재 위치를 사용해 주세요.");
    } finally { if (!controller.signal.aborted) setFinding(false); }
  };

  const locate = async () => {
    setLocating(true); setLocationError("");
    try { setLocation(await getCurrentLocation()); setLocations([]); }
    catch (error) { setLocationError(error instanceof Error ? error.message : "위치를 찾지 못했어요."); }
    finally { setLocating(false); }
  };

  const eligible = filterRestaurants(restaurants, category, onlyOpen);
  const chosen = eligible.find((place) => place.id === chosenId);
  const closedCount = restaurants.filter((place) => place.openingStatus === "closed").length;

  return <main className="shell solo-page">
    <header className="topbar"><Link to="/" className="back" aria-label="홈으로">←</Link><div className="brand">🍚 끼리</div><span className="room-code">혼밥 추천</span></header>
    <section className="solo-heading"><p className="eyebrow">한 명이어도, 잘 먹자</p><h1>오늘 혼밥,<br /><em>어디서 먹을까?</em></h1><p>내 주변 실제 식당을 찾고, 딱 한 곳을 골라요.</p></section>

    <section className="solo-location" aria-labelledby="location-title">
      <h2 id="location-title">어디에서 먹을까요?</h2>
      <button type="button" className="button primary w-full" onClick={() => void locate()} disabled={locating || finding}>{locating ? "위치를 찾는 중…" : "현재 위치로 식당 찾기"}</button>
      <form onSubmit={(event) => void findLocation(event)} className="solo-location-search">
        <label htmlFor="solo-query">또는 동네·역 이름으로 위치 설정</label>
        <div className="flex gap-2"><input id="solo-query" value={query} maxLength={80} placeholder="예: 서울대입구, 성수동" onChange={(event) => { locationRequest.current?.abort(); setFinding(false); setQuery(event.target.value); setLocations([]); setLocationError(""); }} /><button type="submit" disabled={finding || locating || query.trim().length < 2}>{finding ? "검색 중…" : "검색"}</button></div>
      </form>
      {locationError && <p className="solo-error" role="alert">{locationError}</p>}
      {locations.length > 0 && <ul className="location-matches" aria-label="검색된 위치">{locations.map((match) => <li key={match.id}><button type="button" onClick={() => { setLocation(match); setLocations([]); }}><strong>{match.label}</strong><span>{match.address || "이 위치 주변 검색"}</span></button></li>)}</ul>}
      <p className="solo-privacy">위치는 주변 검색을 위해 지도 서비스에 전달되며, 끼리 데이터베이스에는 저장하지 않아요.</p>
    </section>

    {location && <>
      <section className="solo-filters" aria-label="추천 조건">
        <div className="solo-location-summary"><div><p className="eyebrow">선택한 위치</p><strong>{location.label}</strong>{location.address && <p>{location.address}</p>}</div><label htmlFor="solo-radius">검색 반경<select id="solo-radius" value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value={500}>500m</option><option value={1000}>1km</option><option value={2000}>2km</option><option value={3000}>3km</option></select></label></div>
        {location.accuracy !== undefined && location.accuracy > 200 && <p className="solo-hint">현재 위치 오차가 약 {formatDistance(Math.round(location.accuracy))}예요. 동네 검색으로 더 정확한 위치를 선택할 수 있어요.</p>}
        <fieldset><legend>오늘 끌리는 음식</legend><div className="chip-row">{soloCategories.map((item) => {
          const count = filterRestaurants(restaurants, item, onlyOpen).length;
          return <button type="button" key={item} className={`chip ${item === category ? "selected" : ""}`} aria-pressed={item === category} onClick={() => { setCategory(item); setChosenId(undefined); }}>{item}{!loading && <small> {count}</small>}</button>;
        })}</div></fieldset>
        <label className="solo-open-toggle"><input type="checkbox" checked={onlyOpen} onChange={(event) => { setOnlyOpen(event.target.checked); setChosenId(undefined); }} /><span>영업시간상 영업 중인 곳만</span></label>
      </section>

      <section className="solo-results" aria-busy={loading}>
        {loading ? <div className="solo-empty" role="status"><h2>주변 식당을 찾고 있어요</h2><p>{location.label} 반경 {formatDistance(radius)}의 등록 식당을 검색 중이에요.</p></div> : searchError ? <div className="solo-empty" role="alert"><p>{searchError}</p><button className="button secondary" type="button" onClick={() => setSearchCount((count) => count + 1)}>다시 검색</button></div> : <>
          <div className="section-title"><div><p className="eyebrow">내 주변 혼밥</p><h2>{category === "전체" ? "가까운 식당 추천" : `${category} 식당 추천`}</h2></div><span>{eligible.length}곳</span></div>
          {hoursLoading && <p className="solo-hint" role="status">등록된 영업시간도 확인하고 있어요.</p>}
          {eligible.length > 0 ? <>
            <button type="button" className="button primary solo-random" onClick={() => setChosenId(pickRandomRestaurant(eligible, chosenId)?.id)}>{chosen ? "다른 식당 다시 뽑기" : "주변 식당 랜덤으로 뽑기"}<span aria-hidden="true">↻</span></button>
            <div aria-live="polite" aria-atomic="true">{chosen && <RestaurantCard place={chosen} featured />}</div>
            <p className="solo-sort">가까운 순 · 최대 50개 등록 식당에서 추천</p>
            <div className="solo-place-list">{eligible.slice(0, 12).map((place) => <RestaurantCard key={place.id} place={place} />)}</div>
            {eligible.length > 12 && <p className="solo-hint">가까운 12곳을 보여드려요. 랜덤 뽑기는 조건에 맞는 {eligible.length}곳 전체에서 골라요.</p>}
          </> : <div className="solo-empty"><h3>{onlyOpen ? "영업 중으로 확인된 식당이 없어요" : "조건에 맞는 식당이 없어요"}</h3><p>{onlyOpen ? "영업시간이 미등록된 곳이 많을 수 있어요. 필터를 해제하면 확인이 필요한 식당도 볼 수 있어요." : "음식 종류를 전체로 바꾸거나 검색 반경을 넓혀 보세요. 지역에 따라 지도에 등록된 식당이 적을 수 있어요."}</p>{onlyOpen && <button className="button secondary" type="button" onClick={() => setOnlyOpen(false)}>영업 정보 미등록 식당도 보기</button>}</div>}
          {closedCount > 0 && <p className="solo-hint">등록 영업시간상 휴무인 {closedCount}곳은 추천에서 제외했어요.</p>}
          <p className="solo-data-note">카테고리는 등록 정보와 식당명을 기준으로 분류해요. 지도 정보는 최신 영업 상황과 다를 수 있으니 방문 전 네이버지도에서 메뉴와 영업 여부를 확인해 주세요.</p>
        </>}
      </section>
    </>}

    <footer className="solo-attribution">식당·위치 데이터: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon</a></footer>
    <Link className="solo-group-link" to="/create">친구들과 먹을 땐, 밥약 만들기 →</Link>
  </main>;
}
