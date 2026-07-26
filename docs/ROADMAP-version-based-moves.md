# 로드맵 — 기술 학습 정보를 "세대별" → "게임 버전별"로 전환

> 최초 작성: 2026-04-27
> **전면 개정: 2026-04-27** (PokeAPI 변경사항 반영 → Phase 0 신설)
> **최종 갱신: 2026-07-26**
> 상태: **Phase 0~2 완료 / Phase 3~5 진행 예정**
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

| order | versionName | korName | gen |
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

> **진행 현황 (2026-07-26 기준)**
> Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3~5 미착수
> → 데이터·API 계층 완료. 남은 것은 프론트엔드(쿼리 훅 + UI).
> → `npx tsc --noEmit` 에러 2건이 남아 있으며, Phase 3~4에서 해소된다.

---

### Phase 0 — 데이터 재수집 ✅ **완료 (2026-07-26)**

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

#### 실행 결과 (2026-07-26) ✅

**556,738행 → 542,723행** / 소요 5분 / 백업 `BAK_TB_CXN_POKEMON_MOVES_20260726`

| 항목 | 결과 |
|------|------|
| ➕ `champions` | 13,545행 신규 |
| ♻️ BDSP 이관 | 24,324행 (수량 동일) |
| ➖ `colosseum`·`xd` | 27,566행 제거 |
| 기존 20개 버전 | 사실상 무변동 (`firered-leafgreen` −2, `scarlet-violet` +8) |
| 신규 기술 | 0개 |
| 미지의 버전 | 0개 |
| FK 무결성 | orphan 0 / 0 / 0 |

**회귀 검증 — 가디안(282) 버전별 기술 수**
`champions` 80 · `scarlet-violet` 77 · `sword-shield` 75 · `brilliant-diamond-shining-pearl` 53 · `legends-arceus` 10

→ 같은 8세대 안에서 75 / 53 / 10. 이 프로젝트의 출발점이 된 문제가 데이터로 확정됐다.

> ⚠️ 스크립트는 PokeAPI 응답을 `.cache/pokeapi/`에 캐시한다.
> **다음 동기화 때 최신 데이터를 받으려면 `--refresh`가 필요하다.**

---

### Phase 1 — DB 스키마 재정비 ✅ **완료 (2026-07-26)**

#### 1차 (2026-04-27) — 컬럼 추가
```sql
ALTER TABLE "TB_GEN_INFO"
  ADD COLUMN "koreanName"   text,   -- 이후 korName으로 rename
  ADD COLUMN "displayOrder" smallint,
  ADD COLUMN "hasData"      boolean NOT NULL DEFAULT false;
```

#### 2차 (2026-07-26) — 마이그레이션 `phase1_gen_info_version_metadata`

| 작업 | 결과 |
|------|------|
| BDSP 행 교체 | 구 행 DELETE (참조 0건 확인 후) |
| `champions` 메타 부여 | 한국어명 `'포켓몬 챔피언스'`, `displayOrder=22` |
| `colosseum`·`xd` 제외 | 한국어명·`displayOrder` NULL, `hasData=false` |
| `displayOrder` 재정렬 | 전량 NULL 초기화 후 1~22 재부여 (중간값 충돌 방지) |
| 일본판 2종 추가 | `red-green-japan`, `blue-japan` 삽입 |
| `hasData` 재계산 | `EXISTS(TB_CXN_POKEMON_MOVES)` 기준 |

#### 최종 상태 — 32행 (PokeAPI version-group 32개와 일치)

- **playable 22 / hasData 22 / mismatch 0 / displayOrder 중복 0 / 한국어명 누락 0**
- `displayOrder IS NOT NULL` ⇔ `hasData` ⇔ 실제 학습 데이터 보유 — 세 조건이 완전히 일치

> **Phase 2 이후가 의존하는 규약**
> `displayOrder IS NOT NULL`인 행이 곧 "UI에 노출할 버전"이다.
> 세대 필터링(`genNumber`)은 **그룹 헤더 표시 용도로만** 쓰고, 조회 조건으로 쓰지 않는다.

---

### Phase 2 — 백엔드 API 전환 ✅ **완료 (2026-07-26)**

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
→ displayOrder가 있는 22개를 DESC로 반환
  [{ versionName, koreanName, genNumber, displayOrder, learnMethods }]
```

#### 2-3~2-5. 기존 3개 라우트
| 파일 | 변경 |
|------|------|
| `app/api/pokemons/[id]/moves/route.ts` | `?gen=8` → `?version=sword-shield` |
| `app/api/moves/[id]/learning-pokemons/route.ts` | 동일 |
| `app/api/search-learning-pokemons/route.ts` | body `genNumber` → `versionName` |

공통: `.in("versionName", [...])` → `.eq("versionName", v)` / 버전 간 dedup 로직 제거

#### 실행 결과 (2026-07-26) ✅

- `fetchGenVersionNames` 제거 → `fetchPlayableVersions` / `isPlayableVersion` / `fetchVersionLearnMethods`
  - 버전 목록은 5분 TTL 프로세스 캐시 (TB_GEN_INFO는 동기화 때만 바뀜)
- 존재하지 않는 버전명은 **400으로 거부**. BDSP 이름 변경 때처럼 조용히 0건이 되는 사고를 막는다
- dedup 로직 제거 — PK가 `(pokemonId, moveId, versionName, learnMethod)`라 단일 버전 내 중복이 없다

**API 실측 (가디안 282, `?version=`)**
`champions` 80 · `scarlet-violet` 77 · `sword-shield` 75 · `BDSP` 53 · `legends-arceus` 10 — DB 조회 결과와 일치

#### 🆕 작업 중 발견: `train` 학습 방법

`champions`는 **전 행(13,545건)의 learnMethod가 `train` 단 1종**이다. 기존 3종(레벨업/기술머신/기술가르침)은 0건.
그대로 두면 champions 선택 시 검색 결과가 **항상 0건**이 된다.

같은 문제가 champions만의 것이 아니었다:

| 버전 | 사용 가능한 배우는 방법 |
|------|------------------------|
| `champions` | 트레이닝 |
| `legends-arceus` | 레벨업, 기술가르침 (기술머신 없음) |
| `red-blue`·`yellow`·`gold-silver`·`ruby-sapphire`·`lets-go` | 레벨업, 기술머신 (기술가르침 없음) |
| 나머지 | 레벨업, 기술머신, 기술가르침 |

**대응 (사용자 결정: 버전별 동적 필터)**

- `TB_GEN_INFO.learnMethods text[]` 컬럼 추가 — 마이그레이션 `phase2_gen_info_learn_methods`
  - 542,723행 집계를 매 요청 돌리지 않도록 비정규화. 갱신 책임은 `sync-pokeapi.mjs`
- `LearnMethod`에 `train` 추가, 한국어 라벨 **"트레이닝"** (사용자 확인)
  - PokeAPI에 한국어명이 없어 직역 위험이 있었다 → 확인 후 확정
- `LearnMethodFilter` 3종 → 4종. 단, UI는 `VersionInfo.learnMethods`로 옵션을 좁힌다
- `/api/versions`가 버전별 `learnMethods`를 함께 반환
- 검색 API는 요청 필터를 버전 가용 목록과 교집합 → 비면 빈 결과
- `sync-pokeapi.mjs`가 **타입에 없는 learnMethod 등장 시 경고**한다 (`train`이 조용히 유입된 재발 방지)

#### 함께 고친 기존 버그 (Phase 2와 무관하게 깨져 있던 것)

| 파일 | 문제 |
|------|------|
| `pokemons/[id]/moves/route.ts` | `TB_MOVES.koreanName` select — 실제 컬럼은 **`korName`** |
| `moves/[id]/learning-pokemons/route.ts` | `TB_POKEMONS.korName` select — 실제 컬럼은 **`koreanName`** |
| `moves/[id]/detail/route.ts` | `typeMap` 타입 불일치 + `MoveDetail.description` 누락 |

두 버그의 원인은 같다 — **한국어명 컬럼 이름이 테이블마다 달랐다.**
`TB_MOVES.korName` / `TB_POKEMONS.koreanName`. 이름만 보고 짐작하면 반대 컬럼을 짚게 되고,
Supabase는 없는 컬럼을 select해도 타입 에러가 아니라 런타임 400을 낼 뿐이라 조용히 깨진다.

#### 컬럼명 전면 통일 ✅ (2026-07-26, 사용자 지시)

마이그레이션 2건 — `rename_pokemons_korean_name_to_kor_name` · `rename_remaining_korean_name_to_kor_name`

```sql
ALTER TABLE "TB_POKEMONS" RENAME COLUMN "koreanName" TO "korName";
ALTER TABLE "TB_TYPES"     RENAME COLUMN "koreanName" TO "korName";
ALTER TABLE "TB_GEN_INFO"  RENAME COLUMN "koreanName" TO "korName";
ALTER TABLE "TB_ABILITIES" RENAME COLUMN "koreanName" TO "korName";
```

**모든 테이블의 한국어명 컬럼이 `korName`으로 통일되었다.**

| 테이블 | 한국어명 컬럼 |
|--------|--------------|
| `TB_MOVES` · `TB_POKEMONS` · `TB_TYPES` · `TB_GEN_INFO` | `korName` |
| `TB_ABILITIES` | `korName` (+ 폴백 `altKorName`) |
| `TB_CXN_EVOLUTIONS` | 해당 없음 (`speciesNameKo` / `varietyNameKo`) |
| `OLD_TB_*` | 원본 보존용이므로 `koreanName` 유지 |

- 각 rename 전 참조하는 뷰·인덱스·제약이 없음을 확인
- `TB_ABILITIES.altKorName`은 이미 `kor` 접두라 그대로 둔다
- **API 응답 필드명 `koreanName`은 전부 유지** — 프론트엔드 계약이므로 건드리지 않는다.
  조회부에서 `koreanName: p.korName` 형태로 매핑한다.
  덕분에 컴포넌트·쿼리 훅은 한 줄도 바뀌지 않았다

> 응답 필드와 DB 컬럼 이름이 다른 지점은 `lib/supabase/queryHelpers.ts`의 `GenInfoRow`처럼
> **로우 인터페이스를 따로 두고 명시적으로 매핑**한다. PostgREST 별칭(`koreanName:korName`)을
> 쓰면 짧지만 둘이 다르다는 사실이 코드에서 안 보인다.

**검증** — 각 테이블을 실제로 읽는 경로를 전부 확인
`TB_TYPES` 타입명(`['에스퍼','페어리']`) · `TB_GEN_INFO` 22개 전부 `koreanName` 채워짐 ·
`TB_ABILITIES` 일반 특성(싱크로) 및 `altKorName` 폴백(파오젠 → 재앙의검) 정상

---

### Phase 3 — React Query 훅 (4개 파일)

> `types/apiTypes.ts`는 백엔드가 의존하므로 **Phase 2에서 이미 완료**했다.
> `VersionInfo`(+`learnMethods`), `LearnMethod.train`, `SearchLearningPokemonsRequest.versionName` 모두 반영됨.
>
> **현재 `npx tsc --noEmit` 에러 2건이 남아 있다** — 아래 두 파일이 아직 `genNumber`를 쓰기 때문이며,
> Phase 3~4를 마치면 해소된다.
> - `queries/searchLearningPokemonsQueries.tsx`
> - `components/.../LearningPokemonsSection.tsx`

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

#### 배우는 방법 필터도 버전에 따라 바뀐다 🆕

선택된 버전의 `VersionInfo.learnMethods`로 `CheckboxDropdown` 옵션을 좁혀야 한다.
그러지 않으면 "champions + 기술머신"처럼 **반드시 0건인 조합**을 사용자가 고를 수 있다.

버전을 바꿀 때 현재 선택된 필터가 새 버전에 없으면 정리해야 한다.
예: 스칼렛·바이올렛(레벨업·기술머신·기술가르침) → champions(트레이닝)로 전환하면
기존 선택 3개가 모두 무효가 되므로, 새 버전의 가용 목록으로 초기화하는 편이 자연스럽다.

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
| 포켓몬 이름 표시 | 숫자 폴백(`"282"`)이 아니라 `"가디안"` — `korName` 통일 회귀 검증 |

> API 계층은 Phase 2에서 이미 실측 검증했다 (80/77/75/53/10, versions 22개).
> 컬럼명 통일 후 4개 라우트 재검증도 완료 (이름 미해결 0건).
> Phase 5에 남은 것은 **UI 레벨 검증**이다.

| UI 검증 항목 | 기대 결과 |
|-------------|---------|
| 버전 드롭다운 | 22개 · 세대별 그룹 헤더 · 최신(champions)이 맨 위 |
| champions 선택 | 배우는 방법 필터가 "트레이닝" 하나로 바뀜 |
| 레전드 아르세우스 선택 | 기술머신이 옵션에서 사라짐 |
| champions에서 검색 | 결과가 나옴 (0건 아님) |
| 버전 전환 | 이전 버전에만 있던 필터 선택이 남지 않음 |

---

## 5. 영향 범위 요약

```
Phase 0    2  scripts/sync-pokeapi.mjs                        🆕
              package.json (스크립트 등록)

Phase 1    1  TB_GEN_INFO (재정비)

Phase 2   11  lib/supabase/queryHelpers.ts
              app/api/versions/route.ts                       🆕
              app/api/pokemons/[id]/moves/route.ts
              app/api/moves/[id]/learning-pokemons/route.ts
              app/api/search-learning-pokemons/route.ts
              types/apiTypes.ts                    (Phase 3에서 이동)
              app/api/moves/[id]/detail/route.ts   (기존 버그 수정)
              app/api/pokemons/search/route.ts     (컬럼명 통일)
              app/api/pokemons/[id]/route.ts       (컬럼명 통일)
              app/api/moves/[id]/brief/route.ts    (해당 없음 — 이미 korName)
              app/api/doc.md
              scripts/sync-pokeapi.mjs             (learnMethods 재계산)
              + TB_GEN_INFO.learnMethods 컬럼 추가
              + koreanName → korName 전면 통일
                (TB_POKEMONS·TB_TYPES·TB_GEN_INFO·TB_ABILITIES)

Phase 3    4  queries/versionQueries.tsx                      🆕
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
      (최대값 자동이면 champions가 기본이 된다. 트레이닝 필터 하나뿐인 화면이 첫인상으로 적절한지 판단 필요)
- [ ] 버전 전환 시 배우는 방법 필터 초기화 정책 — 전체 선택 vs 교집합 유지
- [ ] 포켓몬 상세에서 "이 버전에 미등장" 케이스 UI 처리
- [x] ~~`champions` 한국어명~~ → "포켓몬 챔피언스" 확정 (Phase 1)
- [x] ~~신규 기술 발견 시 `TB_MOVES` 자동 추가 정책~~ → 스크립트가 자동 삽입 + 한국어명 없으면 리포트에 경고 (Phase 0)
      *2026-07-26 동기화 기준 신규 기술 0개라 아직 실제로 겪지는 않았다*
