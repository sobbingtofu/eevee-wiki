# 로드맵 — 기술 학습 정보를 "세대별" → "게임 버전별"로 전환

> 최초 작성: 2026-04-27
> **전면 개정: 2026-04-27** (PokeAPI 변경사항 반영 → Phase 0 신설)
> **최종 갱신: 2026-07-26**
> 상태: **Phase 0~4 완료 / Phase 5 일부 수동 검증 대기**
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
> Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 4 ✅ · Phase 5 일부
> → **전환 완료.** `tsc` / `eslint` / `npm run build` 모두 통과.
> → Phase 5 검증 중 "기술 담아 검색 실행"만 수동 확인이 남아 있다.

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

### Phase 3 — React Query 훅 ✅ **완료 (2026-07-26)**

> `types/apiTypes.ts`는 백엔드가 의존하므로 **Phase 2에서 이미 완료**했다.
> `VersionInfo`(+`learnMethods`), `LearnMethod.train`, `SearchLearningPokemonsRequest.versionName` 모두 반영됨.
>
| 파일 | 변경 |
|------|------|
| `queries/versionQueries.tsx` 🆕 | `useVersions()` — `staleTime: Infinity` + `groupVersionsByGen()` |
| `queries/pokemonQueries.tsx` | `usePokemonMoves(id, versionName)` |
| `queries/moveQueries.tsx` | `useMoveLearningPokemons(id, versionName)` |
| `queries/searchLearningPokemonsQueries.tsx` | queryKey `genNumber` → `versionName` |

#### 실행 결과 (2026-07-26) ✅

- **queryKey가 `versionName` 기준으로 바뀌었다.** 세대 번호로 캐싱하던 시절에는
  소드·실드와 레전드 아르세우스가 같은 캐시(`8`)를 공유했다. 이제 버전마다 분리된다
- `useVersions()`는 `staleTime: Infinity` + `gcTime: Infinity`.
  이 목록은 `npm run sync:pokeapi` 때만 바뀌므로 세션 내내 다시 받을 이유가 없다
- `placeholderData: []`로 로딩 중에도 배열이라 호출부에 undefined 분기가 필요 없다
- `enabled`에 `versionName.length > 0` 추가 — 버전 목록 로딩 전 빈 요청을 막는다
- `versionName`은 `encodeURIComponent`로 감싼다

**`groupVersionsByGen()` 신설** — 드롭다운 그룹 헤더용. `genNumber`는 **표시 그룹을 만드는 데만** 쓴다.
조회 조건으로 되돌아가면 세대 합집합 문제가 되살아난다.

실제 `/api/versions` 응답으로 검증한 결과가 §3의 UI 목표 형태와 일치한다:

```
9세대: 포켓몬 챔피언스, 스칼렛·바이올렛
8세대: 레전드 아르세우스, 브릴리언트 다이아몬드·샤이닝 펄, 소드·실드
7세대: 레츠고! 피카츄·이브이, 울트라썬·울트라문, 썬·문
...
1세대: 옐로, 레드·블루
```
그룹 9개 / 총 22개 / 버전 최신순·세대 내림차순 모두 유지 ✓

> `usePokemonMoves`·`useMoveLearningPokemons`는 **아직 소비하는 컴포넌트가 없어**
> 시그니처 변경의 파급이 없었다. 해당 UI는 아직 구현 전이다.

**남은 `tsc` 에러 1건** — `LearningPokemonsSection.tsx`가 아직 `genNumber`를 넘긴다. Phase 4에서 해소된다.

---

### Phase 4 — UI 컴포넌트 ✅ **완료 (2026-07-26)**

| 파일 | 변경 |
|------|------|
| `context/LearningSearchContext.tsx` | `genNumber: number` → `versionName: string` (기본값은 서버가 결정) |
| `SearchControls/SearchControls.tsx` | `GEN_OPTIONS` 하드코딩 제거 → `useVersions()` |
| `LearningPokemonsSection.tsx` | 컨텍스트에서 `versionName` 읽어 전달 |
| `common-ui/Dropdown/SelectDropdown.tsx` | **그룹 헤더(optgroup) 지원 추가** |

#### 배우는 방법 필터도 버전에 따라 바뀐다 🆕

선택된 버전의 `VersionInfo.learnMethods`로 `CheckboxDropdown` 옵션을 좁혀야 한다.
그러지 않으면 "champions + 기술머신"처럼 **반드시 0건인 조합**을 사용자가 고를 수 있다.

버전을 바꿀 때 현재 선택된 필터가 새 버전에 없으면 정리해야 한다.
예: 스칼렛·바이올렛(레벨업·기술머신·기술가르침) → champions(트레이닝)로 전환하면
기존 선택 3개가 모두 무효가 되므로, 새 버전의 가용 목록으로 초기화하는 편이 자연스럽다.

#### 실행 결과 (2026-07-26) ✅

**기본 버전은 코드가 아니라 데이터가 정한다.**
`"scarlet-violet"`을 상수로 박아두지 않았으므로, 기본 버전을 바꾸려면 코드 수정 없이
`TB_GEN_INFO.displayOrder`만 조정하면 된다. (`displayOrder` **최댓값**이 기본 선택)

> Phase 6에서 `groupLabel`이 생기며 **목록 순서와 기본 선택이 분리**됐다.
> 처음엔 "배열 첫 원소 = 기본값"이었지만, 단독 타이틀이 맨 앞으로 오면서
> 첫 원소가 챔피언스가 됐다. 그래서 이제 `displayOrder` 최댓값을 명시적으로 고른다.

> 2026-07-26 사용자가 `scarlet-violet`(22) ↔ `champions`(21)를 교체해
> 스칼렛·바이올렛이 기본값이 되도록 했다.
> **따라서 `displayOrder`는 순수한 출시 순이 아니라 "표시 우선순위"다.**
> 동기화 스크립트는 `displayOrder`를 건드리지 않으므로 이 조정은 유지된다.

**`SelectDropdown` 그룹 지원** — `groups` prop을 따로 두는 대신 `SelectOption.group?`를 추가했다.
옵션 배열은 평평하게 유지되고, 직전 옵션과 그룹이 달라지는 지점에만 헤더를 끼운다.
`group`을 안 쓰는 기존 호출부(정렬 방향·정렬 기준)는 그대로 동작한다.

**버전 전환 시 배우는 방법 자동 초기화** — 새 버전의 가용 목록으로 교체한다.
이전 버전에만 있던 선택이 남아 반드시 0건이 되는 상태를 원천 차단한다.

#### 브라우저 실측 ✅

| 검증 | 결과 |
|------|------|
| 기본 버전 | 스칼렛·바이올렛 |
| 드롭다운 | 22개 · 세대별 그룹 헤더(9세대~1세대) · §3 목표 형태와 일치 |
| 스칼렛·바이올렛 | 레벨업 · 기술머신 · 기술가르침 (3) |
| **포켓몬 챔피언스** | **트레이닝 (1)** — 자동 체크됨 |
| **레전드 아르세우스** | **레벨업 · 기술가르침 (2)** — 기술머신 사라짐 |
| 콘솔 에러 | 0건 |
| `npm run build` | 성공 (`/api/versions` 라우트 등록 확인) |
| `npx tsc --noEmit` / `eslint` | 0건 |

> ⚠️ **UI로 끝까지 확인하지 못한 것**: 기술을 담아 실제 검색을 실행하는 흐름.
> 기술 검색 입력이 브라우저 자동화(IME)로 트리거되지 않았다.
> 해당 컴포넌트는 이번 변경 대상이 아니며, **검색 자체는 API 레벨에서 검증했다**
> (champions + 파괴광선 → 205마리). 수동 확인이 필요한 유일한 항목이다.

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
                (useVersions + groupVersionsByGen)
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

- [x] ~~`SelectDropdown` 그룹 지원~~ → 기존 컴포넌트에 `SelectOption.group?` 추가로 해결 (Phase 4)
- [x] ~~버전 기본값~~ → `displayOrder` 최대값 자동. 사용자가 `displayOrder`를 조정해
      스칼렛·바이올렛이 기본이 되도록 했다 (Phase 4)
- [x] ~~버전 전환 시 배우는 방법 필터 초기화 정책~~ → 새 버전의 가용 목록으로 교체 (Phase 4)
- [ ] 포켓몬 상세에서 "이 버전에 미등장" 케이스 UI 처리
- [x] ~~`champions` 한국어명~~ → "포켓몬 챔피언스" 확정 (Phase 1)
- [x] ~~신규 기술 발견 시 `TB_MOVES` 자동 추가 정책~~ → 스크립트가 자동 삽입 + 한국어명 없으면 리포트에 경고 (Phase 0)
      *2026-07-26 동기화 기준 신규 기술 0개라 아직 실제로 겪지는 않았다*

---

## Phase 6 — 드롭다운 그룹 분리 & 응답 지연 개선 (2026-07-26) ✅

### 6-1. 포켓몬 챔피언스를 단독 항목으로

`TB_GEN_INFO`에 `groupLabel text NULL` 추가. `NULL`이면 세대에 묶이지 않는 단독 타이틀이고,
목록 최상단에 헤더 없이 표시된다.

`displayOrder`를 23으로 올려 맨 위로 보내는 방법도 있었지만, 그러면 기본 선택까지 챔피언스로 넘어간다.
**"어디에 그리는가"와 "무엇을 처음 고르는가"는 다른 축**이라 컬럼을 나눴다.

- 정렬: `groupLabel IS NULL` 먼저 → `displayOrder` DESC (`fetchPlayableVersions()`에서 JS 정렬)
- 기본 선택: `displayOrder` 최댓값 = 스칼렛·바이올렛 (22) — 변함없음
- `groupVersionsByGen()` 제거 — 그룹이 데이터로 표현되면서 불필요해졌다

### 6-2. 응답 지연 — 원인이 셋 다 달랐다

| 사용자 측정 | 실제 원인 | 조치 | 결과 |
| --- | --- | --- | --- |
| 배우는 포켓몬 검색 1053ms | **인덱스 부재** | 커버링 인덱스 추가 | DB 1497ms → **4.6ms** |
| 기술 드롭다운 443ms | 디바운스 400ms (서버는 ~40ms) | 250ms로 단축 | 체감 ~290ms |
| 기술 담기 1014ms | 왕복 2회 + dev 컴파일 | 타입 캐시로 왕복 1회 제거, 가리킬 때 prefetch | 클릭 시점엔 캐시 적중 |

#### 인덱스 (가장 컸다)

`TB_CXN_POKEMON_MOVES`(54만 행)의 PK는 `(pokemonId, moveId, versionName, learnMethod)`인데
검색은 `moveId`부터 건다. **선두 컬럼이 비어 인덱스를 탐색하지 못하고 전 구간을 훑고 있었다.**

```sql
CREATE INDEX "TB_CXN_POKEMON_MOVES_move_version_idx"
  ON "TB_CXN_POKEMON_MOVES" ("moveId", "versionName", "learnMethod", "pokemonId");
```

마지막 `pokemonId`는 index-only scan용(커버링). `Buffers: 4184 → 10`.

> 세대 단위였던 시절엔 `.in("versionName", [...])`라 어차피 느렸고,
> 데이터도 지금의 절반이라 티가 덜 났다. 버전 단위 전환으로 접근 패턴이 고정되면서
> 비로소 인덱스를 걸 수 있는 모양이 됐다.

#### 왕복 횟수

- `TB_TYPES`(18행, 사실상 불변)를 매 요청 조회하고 있었다 → 프로세스 내 캐시.
  brief·detail·search 모든 경로에서 왕복 1회씩 사라진다.
- `search-learning-pokemons`의 Step 3·4·5는 서로 의존하지 않는데 순차 `await`였다 → `Promise.all`.
  순차 4회 → 2라운드.

#### brief 대기 제거 — 한 번 잘못 짚었다가 되돌린 부분

**처음 시도(폐기):** `/api/moves/search`가 `MoveBrief` 전체를 반환하게 하고,
클릭 시 `setQueryData`로 brief 캐시를 심어 요청 자체를 없앴다.

**되돌린 이유:** 검색과 brief를 분리해 둔 것은 원래 설계의 의도였는데 그걸 지웠다.

- 검색은 **후보 N건**, brief는 **고른 1건**이다. 둘은 필요해지는 시점도 캐시 수명도 다르다.
  `MoveSearchItem = MoveBrief`로 묶으면 검색 응답이 *바구니 카드의 표시 항목*에 끌려다닌다.
  카드에 PP를 넣고 싶어지는 날 검색 응답이 또 커진다.
- `SearchInput`은 `common-ui`에 있는데, 그 계약이 도메인 컴포넌트의 표시 항목에 묶인다.
- 무엇보다 **얻는 게 생각보다 작았다.** 바구니 카드는 이미 드롭다운에서 받은
  이름·타입으로 미리보기를 즉시 그린다. 지워지는 건 "빈 카드 90ms"가 아니라
  "스탯 줄에 뜨는 작은 로더 90ms"다.
- 비용은 **선택하든 말든 모든 검색이** 낸다. 이득은 선택할 때 한 번만 생긴다.

> 바이트 자체는 문제가 아니었다 — 실측상 20건 기준 추가 약 2.4KB다.
> 잘못은 계약을 섞은 쪽이었고, 나는 그걸 왕복 1회로 정당화했다.

**채택안: 가리킬 때 미리 가져오기.**

두 API는 그대로 두고, 드롭다운 항목에 **호버하거나 방향키로 이동한 시점**에
`queryClient.prefetchQuery`로 brief를 미리 받는다. 가리킨 뒤 클릭까지 보통 수백 ms가 뜨므로
실제로 담을 때는 캐시 적중이다.

- 계약은 분리된 채로 유지된다 (`SearchResultDropdown`은 `onResultItemFocus`만 호출할 뿐
  그게 무엇에 쓰이는지 모른다 — prefetch는 도메인 컴포넌트가 한다)
- 요청은 **실제로 가리킨 항목**에만 나간다. 후보 20건 전체가 아니다
- `staleTime`을 훅과 공유하므로(`moveBriefQueryOptions`) 같은 항목을 여러 번 지나가도 요청은 한 번

### 실측 (프로덕션 빌드, warm)

| 엔드포인트 | 응답 |
| --- | --- |
| `/api/moves/search?q=문포` | 173ms |
| `/api/moves/[id]/brief` | 91ms — *클릭 전에 미리 나가므로 대기로 체감되지 않음* |
| `POST /api/search-learning-pokemons` (SV, 파괴광선 → 432마리) | 440ms |
| 〃 (champions → 205마리) | 309ms |

회귀 지표 유지 확인: SV 432마리 / champions 205마리.

### 남은 여지

`search-learning-pokemons` 440ms 중 상당 부분은 Supabase 왕복 2라운드와 **241KB 응답 전송**이다.
더 줄이려면 Postgres 함수(RPC)로 묶어 1왕복으로 만들거나, 결과를 페이지네이션해야 한다.
지금 구조를 크게 건드려야 해서 보류한다.
