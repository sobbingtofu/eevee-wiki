# 로드맵 — 기술 학습 정보를 "세대별" → "게임 버전별"로 전환

> 작성일: 2026-04-27
> 상태: **계획 수립 완료 / 구현 대기**

---

## 1. 배경 및 문제 정의

### 문제
현재 시스템은 특정 포켓몬이 배우는 기술을 **세대(generation) 단위**로만 구분한다.
그러나 같은 세대에 속한 게임이라도 배우는 기술의 폭이 근본적으로 다르다.

### 실측 근거 — 가디안(`pokemonId=282`) 8세대

| 게임 버전 | 배우는 기술 수 |
|-----------|--------------|
| `sword-shield` (소드·실드) | **75개** |
| `brilliant-diamond-and-shining-pearl` (BDSP) | **53개** |
| `legends-arceus` (레전드 아르세우스) | **10개** |

현재 API는 이 세 버전을 **합집합(OR)** 으로 처리하여, 사용자에게
"8세대 가디안은 이 기술들을 배운다"는 **부정확한 정보**를 제공하고 있다.

```sql
-- 검증 쿼리
SELECT m."versionName", COUNT(DISTINCT m."moveId") AS move_count
FROM "TB_CXN_POKEMON_MOVES" m
JOIN "TB_GEN_INFO" g ON g."versionName" = m."versionName"
WHERE m."pokemonId" = 282 AND g."genNumber" = 8
GROUP BY m."versionName" ORDER BY move_count DESC;
```

### 문제의 원인 — DB가 아니라 API 레이어

```ts
// lib/supabase/queryHelpers.ts
const versionNames = await fetchGenVersionNames(genNumber);
// genNumber=8 → ["sword-shield", "brilliant-diamond-...", "legends-arceus"]

// app/api/pokemons/[id]/moves/route.ts
.in("versionName", versionNames)   // ← 3개 버전을 합집합으로 뭉갬 ❌
```

---

## 2. 조사 결과 — **데이터 재수집 불필요**

`TB_CXN_POKEMON_MOVES`는 이미 버전 단위로 저장되어 있다.

| 항목 | 현황 |
|------|------|
| 총 행 수 | **556,738행** |
| `versionName` 종류 | **23개** |
| PK | `(pokemonId, moveId, versionName, learnMethod)` |

**→ PokeAPI 재호출 없이, API/타입/UI 레이어만 수정하면 된다.**

### 부수적으로 발견한 이슈

1. **`TB_GEN_INFO`에 한국어 게임명이 없음**
   현재 컬럼은 `versionName`, `genNumber` 둘뿐 → UI 표기용 컬럼 필요

2. **7개 버전은 데이터가 0행**

   | 분류 | versionName |
   |------|------------|
   | DLC (PokeAPI가 본편에 통합 제공) | `the-isle-of-armor`, `the-crown-tundra`, `the-teal-mask`, `the-indigo-disk` |
   | 미출시 / 미수집 | `legends-za`, `mega-dimension`, `champions` |

3. **출시 순서 정보 없음**
   알파벳 정렬 시 `black-2-white-2`가 `black-white`보다 앞에 오는 문제

---

## 3. 확정된 설계 결정

| # | 항목 | 결정 |
|---|------|------|
| 1 | 세대 선택 UI | **버전 단일 드롭다운으로 완전 대체**. 목록 내부는 세대별 구분선(optgroup)으로 그룹핑 |
| 2 | 데이터 0행 버전 7개 | **목록에서 완전 제외**. `hasData` 플래그로 표시하고 API가 아예 반환하지 않음 |
| 3 | DB 행 | 7개 행은 **삭제하지 않고 보존** (추후 PokeAPI 제공 시 `hasData`만 true로 전환) |

### UI 목표 형태

```
┌─────────────────────────┐
│ 스칼렛·바이올렛      ▾ │
└─────────────────────────┘
  ── 9세대 ──
  ✓ 스칼렛·바이올렛
  ── 8세대 ──
    소드·실드
    브릴리언트 다이아몬드·샤이닝 펄
    레전드 아르세우스
  ── 7세대 ──
    울트라썬·울트라문
    ...
```

---

## 4. Phase별 작업 계획

### Phase 1 — DB 스키마 보강

**대상:** `TB_GEN_INFO`

```sql
ALTER TABLE "TB_GEN_INFO"
  ADD COLUMN "koreanName"   text,
  ADD COLUMN "displayOrder" smallint,
  ADD COLUMN "hasData"      boolean NOT NULL DEFAULT false;
```

| 컬럼 | 용도 |
|------|------|
| `koreanName` | UI 표기용 게임명 ("소드·실드") |
| `displayOrder` | 출시 순 정렬 (1~23) |
| `hasData` | `TB_CXN_POKEMON_MOVES`에 데이터 존재 여부 |

#### 채워 넣을 데이터 (23개 — 출시 순)

| order | versionName | koreanName | gen |
|-------|-------------|-----------|-----|
| 1 | `red-blue` | 레드·블루 | 1 |
| 2 | `yellow` | 옐로 | 1 |
| 3 | `gold-silver` | 골드·실버 | 2 |
| 4 | `crystal` | 크리스탈 | 2 |
| 5 | `ruby-sapphire` | 루비·사파이어 | 3 |
| 6 | `colosseum` | 콜로세움 | 3 |
| 7 | `firered-leafgreen` | 파이어레드·리프그린 | 3 |
| 8 | `emerald` | 에메랄드 | 3 |
| 9 | `xd` | XD 어둠의 선풍 다크 루기아 | 3 |
| 10 | `diamond-pearl` | 다이아몬드·펄 | 4 |
| 11 | `platinum` | 플라티나 | 4 |
| 12 | `heartgold-soulsilver` | 하트골드·소울실버 | 4 |
| 13 | `black-white` | 블랙·화이트 | 5 |
| 14 | `black-2-white-2` | 블랙2·화이트2 | 5 |
| 15 | `x-y` | X·Y | 6 |
| 16 | `omega-ruby-alpha-sapphire` | 오메가루비·알파사파이어 | 6 |
| 17 | `sun-moon` | 썬·문 | 7 |
| 18 | `ultra-sun-ultra-moon` | 울트라썬·울트라문 | 7 |
| 19 | `lets-go-pikachu-lets-go-eevee` | 레츠고! 피카츄·이브이 | 7 |
| 20 | `sword-shield` | 소드·실드 | 8 |
| 21 | `brilliant-diamond-and-shining-pearl` | 브릴리언트 다이아몬드·샤이닝 펄 | 8 |
| 22 | `legends-arceus` | 레전드 아르세우스 | 8 |
| 23 | `scarlet-violet` | 스칼렛·바이올렛 | 9 |

**나머지 7개** → `koreanName = NULL`, `displayOrder = NULL`, `hasData = false` 유지

`hasData`는 아래 쿼리로 일괄 갱신:
```sql
UPDATE "TB_GEN_INFO" g
SET "hasData" = EXISTS (
  SELECT 1 FROM "TB_CXN_POKEMON_MOVES" m WHERE m."versionName" = g."versionName"
);
```

---

### Phase 2 — 백엔드 API 전환 (5개 파일)

#### 2-1. `lib/supabase/queryHelpers.ts`
```diff
- export async function fetchGenVersionNames(genNumber: number): Promise<string[]>
+ export async function fetchPlayableVersions(): Promise<VersionInfo[]>
+ export async function assertVersionExists(versionName: string): Promise<boolean>
```
- 기존 `fetchGenVersionNames`는 **제거** (세대 합집합의 원흉)
- `fetchLearnInfoMap`의 `versionNames: string[]` 파라미터 → `versionName: string` 단일값으로 변경

#### 2-2. `app/api/versions/route.ts` 🆕 신규
```
GET /api/versions
→ hasData=true인 23개 버전을 displayOrder 순으로 반환
  [{ versionName, koreanName, genNumber, displayOrder }, ...]
```
드롭다운 옵션의 단일 소스가 된다.

#### 2-3. `app/api/pokemons/[id]/moves/route.ts`
```diff
- GET /api/pokemons/[id]/moves?gen=8
+ GET /api/pokemons/[id]/moves?version=sword-shield
```
- `.in("versionName", versionNames)` → `.eq("versionName", versionName)`
- 단일 버전이므로 **learnMethod dedup 로직 단순화 가능** (기존엔 버전 간 중복 제거가 필요했음)

#### 2-4. `app/api/moves/[id]/learning-pokemons/route.ts`
동일하게 `?gen=` → `?version=` 전환

#### 2-5. `app/api/search-learning-pokemons/route.ts`
```diff
  body: {
    moveIds: number[],
-   genNumber: number,
+   versionName: string,
    sortKey, sortDirection, learnMethods
  }
```

---

### Phase 3 — 타입 & React Query 훅 (4개 파일)

#### 3-1. `types/apiTypes.ts`
```ts
// 신규
export interface VersionInfo {
  versionName:  string;
  koreanName:   string;
  genNumber:    number;
  displayOrder: number;
}
export type VersionListResponse = VersionInfo[];

// 수정
export interface SearchLearningPokemonsRequest {
  moveIds:       number[];
  versionName:   string;   // ← genNumber에서 변경
  sortKey:       PokemonSortKey;
  sortDirection: SortDirection;
  learnMethods:  LearnMethodFilter[];
}
```

#### 3-2. `queries/versionQueries.tsx` 🆕 신규
```ts
export function useVersions()   // GET /api/versions, staleTime: Infinity (정적 데이터)
```

#### 3-3. `queries/pokemonQueries.tsx`
```diff
- usePokemonMoves(id, genNumber)
+ usePokemonMoves(id, versionName)
```

#### 3-4. `queries/moveQueries.tsx`
```diff
- useMoveLearningPokemons(id, genNumber)
+ useMoveLearningPokemons(id, versionName)
```

#### 3-5. `queries/searchLearningPokemonsQueries.tsx`
`buildSearchQueryKey`의 `genNumber` → `versionName` 교체

---

### Phase 4 — UI 컴포넌트 (3개 + α)

#### 4-1. `components/.../context/LearningSearchContext.tsx`
```diff
- genNumber: number
- setGenNumber: (n: number) => void
+ versionName: string          // 기본값 "scarlet-violet"
+ setVersionName: (v: string) => void
```

#### 4-2. `components/.../SearchControls/SearchControls.tsx`
```diff
- const GEN_OPTIONS = Array.from({length: 9}, (_, i) => ({value: i+1, label: `${i+1}세대`}));
+ const {data: versions = []} = useVersions();
+ // displayOrder 내림차순(최신 게임 우선) + genNumber로 그룹핑
```

#### 4-3. `components/common-ui/Dropdown/SelectDropdown.tsx`
현재 평면 리스트만 지원 → **그룹 헤더(optgroup) 지원 추가 필요**
- 옵션 타입에 `group?: string` 추가하거나
- `GroupedSelectDropdown` 별도 컴포넌트 신설

#### 4-4. `components/.../LearningPokemonsSection.tsx`
컨텍스트에서 `genNumber` 대신 `versionName`을 읽어 쿼리에 전달

---

### Phase 5 — 검증

| 검증 항목 | 기대 결과 |
|----------|---------|
| 가디안(282) + `sword-shield` | 기술 **75개** |
| 가디안(282) + `brilliant-diamond-and-shining-pearl` | 기술 **53개** |
| 가디안(282) + `legends-arceus` | 기술 **10개** |
| `GET /api/versions` | 23개 반환, 7개 제외 확인 |
| 드롭다운 UI | 세대별 그룹 헤더 정상 표시 |
| `npx tsc --noEmit` | 에러 0건 |

---

## 5. 영향 범위 요약

```
DB          1  TB_GEN_INFO (컬럼 3개 추가 + 데이터 갱신)

Backend     5  lib/supabase/queryHelpers.ts
               app/api/versions/route.ts                        🆕
               app/api/pokemons/[id]/moves/route.ts
               app/api/moves/[id]/learning-pokemons/route.ts
               app/api/search-learning-pokemons/route.ts

Types       1  types/apiTypes.ts

Queries     4  queries/versionQueries.tsx                       🆕
               queries/pokemonQueries.tsx
               queries/moveQueries.tsx
               queries/searchLearningPokemonsQueries.tsx

UI          4  components/.../context/LearningSearchContext.tsx
               components/.../SearchControls/SearchControls.tsx
               components/.../LearningPokemonsSection.tsx
               components/common-ui/Dropdown/SelectDropdown.tsx
──────────────────────────────────────────────────────────────
합계       15  파일 (신규 2개 포함)
```

**PokeAPI 재호출: 없음. 데이터 마이그레이션: 없음.**

---

## 6. 남은 논의거리 (구현 시점에 결정)

- [ ] `SelectDropdown` 그룹 지원을 기존 컴포넌트 확장 vs 신규 컴포넌트 분리
- [ ] 버전 선택 기본값을 `scarlet-violet` 고정 vs `displayOrder` 최대값 자동 선택
- [ ] 버전 미선택 상태를 허용할지 (전체 버전 합집합 모드가 필요한 UX가 있는지)
- [ ] 포켓몬 상세 페이지에서 "이 버전에는 등장하지 않음" 케이스 처리
      (예: 스칼렛·바이올렛에 없는 포켓몬 선택 시)
