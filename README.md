# 끼리

친구들과 밥약을 잡을 때 선호와 불가 메뉴를 빠르게 모아, 모두가 납득할 식당을 골라 주는 모바일 우선 PWA입니다.

- React + Vite + TypeScript + Tailwind CSS
- `HashRouter` 기반 정적 라우팅
- `vite-plugin-pwa` 기반 설치 가능한 PWA
- Supabase의 UUID 방, 익명 닉네임 참여, Realtime 투표 동기화
- Dexie/IndexedDB에는 마지막으로 열람한 방의 **오프라인 읽기 캐시만** 저장
- 현재 위치·동네 검색 기반 혼밥 추천: 실제 주변 식당, 음식 카테고리, 검색 반경, 랜덤 선택

## 혼밥 추천

홈의 **혼밥 추천 · 내 위치 불러오기**에서 현재 위치를 허용하거나 동네·역 이름을 검색해 위치를 선택합니다. 검색 반경(500m~3km)과 음식 종류를 고르고, 가까운 식당을 확인하거나 랜덤으로 한 곳을 뽑을 수 있습니다. 다시 뽑으면 후보가 둘 이상일 때 직전 식당은 피합니다.

**내 위치 불러오기**를 누르면 브라우저 위치 권한을 요청하고, 새 위치를 받아 주변 식당을 자동 검색합니다. 동네 이름, 위치 정확도, 확인 시간을 표시하고 지도에서 위치를 확인할 수 있습니다. 동네 이름 조회에 실패해도 좌표 기반 식당 검색은 계속됩니다. 권한이 차단되면 사이트 설정과 기기의 위치 서비스 안내를 표시합니다. 시간 초과·위치 조회 실패 시 대략적인 위치로 재시도하거나 동네를 직접 검색할 수 있으며, 요청 도중 취소도 가능합니다. 위치 요청은 HTTPS 또는 localhost에서 사용해야 합니다.

식당은 [Photon](https://github.com/komoot/photon)의 OpenStreetMap 근접 검색에서 최대 50곳을 가져옵니다. 실제 검색 결과만 사용하며 예시 식당으로 대체하지 않습니다. [공개 Overpass 서버](https://wiki.openstreetmap.org/wiki/Overpass_API)의 등록 영업시간·음식 종류도 가능할 때 확인합니다. 카테고리는 음식 태그 또는 식당명으로 분류합니다. 데이터가 없는 식당의 가격·평점·메뉴를 임의로 만들지 않습니다.

등록된 영업시간상 휴무인 식당은 추천에서 제외하며, **영업시간상 영업 중인 곳만** 필터는 확인된 식당만 표시합니다. 영업시간이 없거나 해석할 수 없으면 **영업 정보 확인 필요**로 표시합니다. 공개 지도는 실시간 폐업·영업 상태를 보장하지 않으므로 방문 전 네이버지도 검색 링크로 확인해야 합니다. 위치 정확도와 지역에 따라 식당 수가 달라질 수 있습니다.

별도 API 키는 필요하지 않습니다. 위치 권한은 버튼을 눌렀을 때만 요청합니다. 검색 위치는 지도 조회 서비스에 전달되지만 Supabase, localStorage, IndexedDB에는 저장하지 않습니다. 지도 요청은 수동 검색으로만 실행하고 결과는 메모리에서 잠시 재사용합니다. 공개 서버가 혼잡하면 검색이 지연되거나 실패할 수 있으며, 혼밥 추천은 오프라인 조회를 지원하지 않습니다.

선택적으로 `VITE_PHOTON_URL`, `VITE_OVERPASS_URL`을 설정하면 운영 중인 다른 제공 서버로 변경할 수 있습니다. 대규모 서비스에서는 공개 서버의 [이용 정책](https://github.com/komoot/photon#demo-server)에 맞춰 자체 서버나 상용 제공 서비스를 사용하세요.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run build`는 배포용 정적 파일을 `dist/`에 생성합니다.

## Supabase 설정

실제 방·식당·참여자·투표 데이터의 유일한 원본은 Supabase입니다. 이메일, 전화번호 같은 개인정보는 받거나 저장하지 않고 닉네임만 저장합니다.

1. Supabase에서 프로젝트를 만들고 SQL Editor에 [supabase/schema.sql](supabase/schema.sql)을 실행합니다.
2. Project Settings > API에서 Project URL과 **anon public** key를 복사합니다.
3. `.env.local`에 다음 값을 설정합니다.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`restaurants`, `participants`, `votes` 테이블은 스키마에서 Realtime publication에 추가됩니다. 설정 전에는 정적 데모 방만 표시되며, 실제 방 생성·투표는 하지 않습니다.

## Vercel 배포

GitHub에 코드를 push하면 연결된 Vercel 프로젝트가 자동 배포됩니다.

1. [Vercel](https://vercel.com/new)에서 연결된 GitHub의 이 저장소를 Import합니다.
2. Framework Preset은 **Vite**를 선택합니다. (`vercel.json`에도 설정되어 있습니다.)
3. Vercel Project Settings > Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 Production/Preview 환경 모두에 추가합니다.
4. Deploy를 누릅니다. 이후 `main` 브랜치에 push하면 Vercel이 자동 배포합니다.

배포된 URL은 Vercel 프로젝트의 `*.vercel.app` 주소 또는 연결한 커스텀 도메인입니다.

## GitHub Pages 배포

현재 저장소는 GitHub Pages도 제공합니다. `.github/workflows/deploy-pages.yml`이 `main` push 시 `dist/`를 빌드하고 배포합니다. 저장소 이름을 Vite base 경로에 자동 반영하며 HashRouter로 하위 화면 새로고침을 지원합니다. Supabase 설정은 Repository Actions Secrets의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 사용합니다. Vercel 환경변수와 별도로 관리합니다.

- Vercel: https://kkiri-three.vercel.app/
- GitHub Pages: https://ssdongjin.github.io/kkiri/
