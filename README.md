# 끼리

친구들과 밥약을 잡을 때 선호와 불가 메뉴를 빠르게 모아, 모두가 납득할 식당을 골라 주는 모바일 우선 PWA입니다.

- React + Vite + TypeScript + Tailwind CSS
- `HashRouter` 기반 정적 라우팅
- `vite-plugin-pwa` 기반 설치 가능한 PWA
- Supabase의 UUID 방, 익명 닉네임 참여, Realtime 투표 동기화
- Dexie/IndexedDB에는 마지막으로 열람한 방의 **오프라인 읽기 캐시만** 저장

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

GitHub는 코드 저장소와 Vercel 자동 배포 트리거로만 사용합니다. GitHub Pages 워크플로는 사용하지 않습니다.

1. [Vercel](https://vercel.com/new)에서 연결된 GitHub의 이 저장소를 Import합니다.
2. Framework Preset은 **Vite**를 선택합니다. (`vercel.json`에도 설정되어 있습니다.)
3. Vercel Project Settings > Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 Production/Preview 환경 모두에 추가합니다.
4. Deploy를 누릅니다. 이후 `main` 브랜치에 push하면 Vercel이 자동 배포합니다.

배포된 URL은 Vercel 프로젝트의 `*.vercel.app` 주소 또는 연결한 커스텀 도메인입니다.
