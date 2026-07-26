# 로드맵 — 기술 학습 정보를 "세대별" → "게임 버전별"로 전환

> 최초 작성: 2026-04-27
> **전면 개정: 2026-04-27** (PokeAPI 변경사항 반영 → Phase 0 신설)
> 상태: **계획 수립 완료 / 구현 대기**
> 관련 문서: [`GUIDE-pokeapi-sync.md`](./GUIDE-pokeapi-sync.md)

---

## 1. 배경 및 문제 정의

### 문제 A — 세대 단위 집계로 인한 정보 왜곡

같은 세대에 속한 게임이라도 배우는 기술의 폭이 근본적으로 다르다.

**실측 — 가디안(`pokemonId=282`) 8세대**

| 게임 버전 | 배우는 기술 수 |
|-----------|--------------|
| 소드·실드 | **75개** |
| 브릴리언트 다이아몬드·샤이닝 펄 | **53개** |
| 레전드 아르세우스 | **10개** |

현재 API는 세 버전을 **합집합(OR)** 으로 처리하여 부정확한 정보를 제공한다.

```ts
// 문제의 지점 — lib/supabase/queryHelpers.ts
const versionNames = await fetchGenVersionNames(genNumber);  // 8 → 3개 버전
.in("versionName", versionNames)                             // ← 합집합으로 뭉갬 ❌
```

### 문제 B — PokeAPI와 DB의 동기화 붕괴 🆕

2026-04-27 조사에서 확인된 사항:

| # | 항목 | 우리 DB | PokeAPI 현재 |
|---|------|---------|-------------|
| 1 | BDSP 버전명 | `brilliant-diamond-and-shining-pearl` | `brilliant-diamond-shining-pearl` |
| 2 | `champions` | 데이터 0행 | **데이터 존재** (피카츄·루카리오·가디안 확인) |
| 3 | 일본판 1세대 | 없음 | `red-green-japan`, `blue-japan` 신규 등재 |

→ **BDSP 24,324행이 PokeAPI와 매칭 불가능한 키를 사용 중.**
→ 포켓몬 Champions는 개발사가 주기적 밸런스 패치를 예고한 타이틀이므로 **지속적 동기화 체계가 필요**하다.

---

## 2. 대상 버전 확정 — 22개

### 포함 (22개)

| order | versionName | koreanName | gen |
|-------|-------------|-----------|-----|
| 1 | `red-blue` | 레드·블루 | 1 |
| 2 | `yellow` | 옐로 | 1 |
| 3 | `gold-silver` | 골드·실버 | 2 |
| 4 | `crystal` | 크리스탈 | 2 |
| 5 | `ruby-sapphire` | 루비·사파이어 | 3 |
| 6 | `firered-leafgreen` | 파이어레드·리프그린 | 3 |
| 7 | `emerald` | 에메랄드 | 3 |
| 8 | `diamond-pearl` | 다이아몬드·펄 | 4 |
| 9 | `platinum` | 플라티나 | 4 |
| 10 | `heartgold-soulsilver` | 하트골드·소울실버 | 4 |
| 11 | `black-white` | 블랙·화이트 | 5 |
| 12 | `black-2-white-2` | 블랙2·화이트2 | 5 |
| 13 | `x-y` | X·Y | 6 |
| 14 | `omega-ruby-alpha-sapphire` | 오메가루비·알파사파이어 | 6 |
| 15 | `sun-moon` | 썬·문 | 7 |
| 16 | `ultra-sun-ultra-moon` | 울트라썬·울트라문 | 7 |
| 17 | `lets-go-pikachu-lets-go-eevee` | 레츠고! 피카츄·이브이 | 7 |
| 18 | `sword-shield` | 소드·실드 | 8 |
| 19 | `brilliant-diamond-shining-pearl` ⚠️ | 브릴리언트 다이아몬드·샤이닝 펄 | 8 |
| 20 | `legends-arceus` | 레전드 아르세우스 | 8 |
| 21 | `scarlet-violet` | 스칼렛·바이올렛 | 9 |
| 22 | `champions` 🆕 | 포켓몬 챔피언스 | 9 |

⚠️ 19번은 **기존 DB값에서 `and` 제거된 이름**으로 교체 필요

### 제외 (10개)

| 사유 | versionName |
|------|-------------|
| 서비스 범위 밖 (사용자 결정) | `colosseum`, `xd` |
| 일본판 (사용자 결정) | `red-green-japan`, `blue-japan` |
| DLC — PokeAPI가 본편에 통합 제공 | `the-isle-of-armor`, `the-crown-tundra`, `the-teal-mask`, `the-indigo-disk` |
| 학습 데이터 미제공 (2026-04-27 기준) | `legends-za`, `mega-dimension` |

> `legends-za` / `mega-dimension`은 메가진화 포켓몬 5종(이상해꽃·리자몽·후딘·팬텀·한카리아스)으로 교차 검증했으나 학습 데이터가 없음. PokeAPI가 향후 제공하면 동기화 스크립트가 자동 감지한다.

---

## 3. 확정된 설계 결정

| # | 항목 | 결정 |
|---|------|------|
| 1 | 세대 선택 UI | **버전 단일 드롭다운으로 완전 대체**. 목록 내부는 세대별 구분선(optgroup) 그룹핑 |
| 2 | 제외 버전 처리 | `hasData=false`로 표시, API가 반환하지 않음. **DB 행은 보존** |
| 3 | 데이터 최신화 | `npm run sync:pokeapi` 수동 실행 + **변경사항 리포트 출력** |

### UI 목표 형태

```
┌─────────────────────────┐
│ 스칼렛·바이올렛      ▾ │
└─────────────────────────┘
  ── 9세대 ──
    포켓몬 챔피언스
  ✓ 스칼렛·바이올렛
  ── 8세대 ──
    레전드 아르세우스
    브릴리언트 다이아몬드·샤이닝 펄
    소드·실드
  ── 7세대 ──
    ...
```

---

## 4. Phase별 작업 계획

> **Phase 0이 신설되어 기존 Phase 1 작업 일부를 재수행해야 한다.**
> (colosseum·xd 제외, BDSP 이름 수정, champions 추가)

---

### Phase 0 — 데이터 재수집 🆕 **선행 필수**

**목적:** PokeAPI 최신 상태로 `TB_CXN_POKEMON_MOVES` 전면 갱신

**산출물:** `scripts/sync-pokeapi.mjs` + `package.json`에 `sync:pokeapi` 등록

#### 처리 흐름

```
1. TB_POKEMONS에서 pokemonId 목록 로드 (1,077마리)
        ↓
2. GET /pokemon/{id} 배치 호출 (10개씩 병렬 + 딜레이)
   → moves[].version_group_details[] 추출
        ↓
3. 대상 22개 버전만 필터링 (제외 10개 스킵)
        ↓
4. 기존 DB와 diff 계산
   ├─ 신규 (version, move, learn 조합)
   ├─ 변경 (levelLearnedAt 등)
   └─ 제거 (PokeAPI에서 사라진 항목)
        ↓
5. TB_CXN_POKEMON_MOVES 교체 (TRUNCATE → INSERT)
        ↓
6. 리포트 출력
```

#### 처리해야 할 특수사항

- **BDSP 이름 변경**: 기존 `brilliant-diamond-and-shining-pearl` 행은 TRUNCATE로 자연 소멸
- **champions 신규 편입**: 필터 목록에 포함되어 자동 수집
- **TB_MOVES 동기화**: 신규 기술이 있으면 `TB_MOVES`에도 추가 필요 (없으면 FK 위반)

예상 소요: **30~60분** (PokeAPI 1,077회 호출)

---

### Phase 1 — DB 스키마 재정비

> Phase 1은 2026-04-27에 1차 완료했으나, Phase 0 결과에 맞춰 **일부 재작업** 필요

#### 이미 완료된 부분 ✅
```sql
ALTER TABLE "TB_GEN_INFO"
  ADD COLUMN "koreanName"   text,
  ADD COLUMN "displayOrder" smallint,
  ADD COLUMN "hasData"      boolean NOT NULL DEFAULT false;
```

#### 재작업 필요 항목

| 작업 | 내용 |
|------|------|
| BDSP 행 교체 | `brilliant-diamond-and-shining-pearl` → `brilliant-diamond-shining-pearl` |
| `champions` 메타 부여 | `koreanName='포켓몬 챔피언스'`, `displayOrder=22` |
| `colosseum`·`xd` 제외 | `koreanName=NULL`, `displayOrder=NULL`, `hasData=false` |
| `displayOrder` 재정렬 | 기존 1~23 → 신규 1~22 (§2 표 기준) |
| 일본판 2종 추가 | 행만 삽입, `hasData=false` (추후 대비) |
| `hasData` 재계산 | Phase 0 완료 **후** 실행 |

---

### Phase 2 — 백엔드 API 전환 (5개 파일)

#### 2-1. `lib/supabase/queryHelpers.ts`
```diff
- export async function fetchGenVersionNames(genNumber: number): Promise<string[]>
+ export async function fetchPlayableVersions(): Promise<VersionInfo[]>
+ export async function isPlayableVersion(versionName: string): Promise<boolean>
```
- `fetchGenVersionNames` **제거** (세대 합집합의 원흉)
- `fetchLearnInfoMap`의 `versionNames: string[]` → `versionName: string` 단일값

#### 2-2. `app/api/versions/route.ts` 🆕
```
GET /api/versions
→ hasData=true인 22개를 displayOrder DESC로 반환
  [{ versionName, koreanName, genNumber, displayOrder }]
```

#### 2-3~2-5. 기존 3개 라우트
| 파일 | 변경 |
|------|------|
| `app/api/pokemons/[id]/moves/route.ts` | `?gen=8` → `?version=sword-shield` |
| `app/api/moves/[id]/learning-pokemons/route.ts` | 동일 |
| `app/api/search-learning-pokemons/route.ts` | body `genNumber` → `versionName` |

공통: `.in("versionName", [...])` → `.eq("versionName", v)` / 버전 간 dedup 로직 제거

---

### Phase 3 — 타입 & React Query 훅 (5개 파일)

```ts
// types/apiTypes.ts — 신규
export interface VersionInfo {
  versionName:  string;
  koreanName:   string;
  genNumber:    number;
  displayOrder: number;
}
export type VersionListResponse = VersionInfo[];

// 수정
export interface SearchLearningPokemonsRequest {
-  genNumber:   number;
+  versionName: string;
   // ... 나머지 동일
}
```

| 파일 | 변경 |
|------|------|
| `queries/versionQueries.tsx` 🆕 | `useVersions()` — `staleTime: Infinity` |
| `queries/pokemonQueries.tsx` | `usePokemonMoves(id, versionName)` |
| `queries/moveQueries.tsx` | `useMoveLearningPokemons(id, versionName)` |
| `queries/searchLearningPokemonsQueries.tsx` | queryKey `genNumber` → `versionName` |

---

### Phase 4 — UI 컴포넌트 (4개 파일)

| 파일 | 변경 |
|------|------|
| `context/LearningSearchContext.tsx` | `genNumber: number` → `versionName: string` (기본값 `"scarlet-violet"`) |
| `SearchControls/SearchControls.tsx` | `GEN_OPTIONS` 하드코딩 제거 → `useVersions()` |
| `LearningPokemonsSection.tsx` | 컨텍스트에서 `versionName` 읽어 전달 |
| `common-ui/Dropdown/SelectDropdown.tsx` | **그룹 헤더(optgroup) 지원 추가** |

---

### Phase 5 — 검증

| 검증 항목 | 기대 결과 |
|----------|---------|
| 가디안(282) + `sword-shield` | 75개 |
| 가디안(282) + `brilliant-diamond-shining-pearl` | 53개 |
| 가디안(282) + `legends-arceus` | 10개 |
| 가디안(282) + `champions` | **0개 초과** (Phase 0 성공 지표) |
| `GET /api/versions` | 22개 반환 |
| 드롭다운 UI | 세대별 그룹 헤더 정상 |
| `npx tsc --noEmit` | 에러 0건 |

---

## 5. 영향 범위 요약

```
Phase 0    2  scripts/sync-pokeapi.mjs                        🆕
              package.json (스크립트 등록)

Phase 1    1  TB_GEN_INFO (재정비)

Phase 2    5  lib/supabase/queryHelpers.ts
              app/api/versions/route.ts                       🆕
              app/api/pokemons/[id]/moves/route.ts
              app/api/moves/[id]/learning-pokemons/route.ts
              app/api/search-learning-pokemons/route.ts

Phase 3    5  types/apiTypes.ts
              queries/versionQueries.tsx                      🆕
              queries/pokemonQueries.tsx
              queries/moveQueries.tsx
              queries/searchLearningPokemonsQueries.tsx

Phase 4    4  components/.../context/LearningSearchContext.tsx
              components/.../SearchControls/SearchControls.tsx
              components/.../LearningPokemonsSection.tsx
              components/common-ui/Dropdown/SelectDropdown.tsx
──────────────────────────────────────────────────────────────
합계      17  파일 (신규 4개 포함)
```

**PokeAPI 재호출: 있음 (Phase 0, 1,077회 / 30~60분)**

---

## 6. 남은 논의거리 (구현 시점 결정)

- [ ] `SelectDropdown` 그룹 지원 — 기존 확장 vs 신규 컴포넌트 분리
- [ ] 버전 기본값 — `scarlet-violet` 고정 vs `displayOrder` 최대값 자동
- [ ] `champions` 한국어명 — "포켓몬 챔피언스" 확정 여부 (국내 정식 명칭 확인 필요)
- [ ] 포켓몬 상세에서 "이 버전에 미등장" 케이스 UI 처리
- [ ] Phase 0에서 신규 기술 발견 시 `TB_MOVES` 자동 추가 정책
      (한국어명 없는 신규 기술을 어떻게 표시할지 — `altKorName` 패턴 재사용 검토)
