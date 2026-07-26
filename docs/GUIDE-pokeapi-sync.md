# 가이드 — 포켓몬 데이터 최신화 (PokeAPI 동기화)

> 최초 작성: 2026-04-27
> 상태: **설계 완료 / 스크립트 미구현**
> 관련 문서: [`ROADMAP-version-based-moves.md`](./ROADMAP-version-based-moves.md)

---

## 1. 왜 주기적 동기화가 필요한가

### 1-1. 포켓몬 Champions는 라이브 서비스형 타이틀

개발사가 **주기적 밸런스 패치 및 신규 포켓몬·기술 추가/제거**를 예고했다.
기술의 위력·명중률이 조정되거나, 특정 포켓몬의 학습 목록이 변경될 수 있다.
→ 한 번 수집하고 끝나는 데이터가 아니다.

### 1-2. PokeAPI 자체도 변경된다 — 실제 사례

2026-04-27 조사에서 발견된 실제 변경:

| 유형 | 내용 |
|------|------|
| **버전명 변경** | `brilliant-diamond-and-shining-pearl` → `brilliant-diamond-shining-pearl` |
| **신규 데이터** | `champions` 학습 데이터 제공 시작 |
| **신규 등재** | `red-green-japan`, `blue-japan` version-group 추가 |

버전명 변경은 특히 위험하다. 조용히 발생하며, 우리 DB의 24,324행이 매칭 불가 상태가 되었는데도 **에러 없이 그냥 조회 결과가 0건**이 될 뿐이다.

---

## 2. 실행 방법

```bash
# 1) 변경사항 미리보기 (DB 미반영)
npm run sync:pokeapi -- --dry-run

# 2) 실제 적용
npm run sync:pokeapi
```

**권장 주기:** 월 1회 + 포켓몬 Champions 패치 노트 발표 직후

---

## 3. 스크립트가 하는 일

`scripts/sync-pokeapi.mjs`

```
┌─ Step 1. 대상 목록 로드 ──────────────────────────────┐
│  TB_POKEMONS   → pokemonId 1,077개                    │
│  TB_GEN_INFO   → hasData=true 버전 목록               │
│  TB_MOVES      → 기존 기술 id 집합 (FK 검사용)        │
└───────────────────────────────────────────────────────┘
                        ↓
┌─ Step 2. PokeAPI 수집 ────────────────────────────────┐
│  GET /pokemon/{id}  ×1,077  (10개 병렬 + 400ms 딜레이)│
│  → moves[].version_group_details[] 평탄화              │
└───────────────────────────────────────────────────────┘
                        ↓
┌─ Step 3. 필터링 ──────────────────────────────────────┐
│  대상 22개 버전만 통과                                 │
│  제외: colosseum, xd, 일본판 2종, DLC 4종,            │
│        legends-za, mega-dimension                     │
└───────────────────────────────────────────────────────┘
                        ↓
┌─ Step 4. 사전 검사 (중요) ────────────────────────────┐
│  ① 미지의 versionName 발견 시 → 경고 후 중단          │
│  ② TB_MOVES에 없는 moveId 발견 시 → 신규 기술 수집    │
│  ③ 수집 행 수가 기존 대비 ±30% 초과 시 → 확인 요구    │
└───────────────────────────────────────────────────────┘
                        ↓
┌─ Step 5. diff 계산 & 적용 ────────────────────────────┐
│  --dry-run 이면 리포트만 출력하고 종료                 │
│  아니면 TRUNCATE → 청크 INSERT                        │
└───────────────────────────────────────────────────────┘
                        ↓
┌─ Step 6. 후처리 ──────────────────────────────────────┐
│  TB_GEN_INFO.hasData 재계산                           │
│  리포트 출력                                          │
└───────────────────────────────────────────────────────┘
```

---

## 4. 리포트 읽는 법

```
── 동기화 리포트 ─────────────────────────────────
📅 2026-05-27 14:03  (소요 42분)

➕ 신규 버전
   champions                          12,431행

♻️  버전명 변경 감지
   brilliant-diamond-and-shining-pearl
   → brilliant-diamond-shining-pearl   24,324행 이관

➕ 신규 기술 (TB_MOVES 추가됨)
   #921  (koreanName 없음 → 수동 보완 필요)
   #922  (koreanName 없음 → 수동 보완 필요)

✏️  변경된 학습 정보
   가디안(282) × 사이코키네시스 × champions
     레벨 42 → 38

➖ 제거된 항목
   0건

📊 총계   556,738행 → 571,169행  (+14,431)
─────────────────────────────────────────────────
```

### 각 항목별 대응

| 리포트 항목 | 대응 |
|------------|------|
| ➕ 신규 버전 | `TB_GEN_INFO`에 `koreanName`·`displayOrder` 부여 → §5 참조 |
| ♻️ 버전명 변경 | `TB_GEN_INFO`의 `versionName` 수정 필요 |
| ➕ 신규 기술 | **한국어명·설명이 비어 있음.** 별도 보완 작업 필요 |
| ✏️ 변경된 학습 정보 | 자동 반영됨. 확인만 |
| ➖ 제거된 항목 | 밸런스 패치로 기술이 삭제된 경우. 확인 권장 |
| 📊 총계 급변 | ±30% 이상이면 PokeAPI 장애 가능성 → 재실행 검토 |

---

## 5. 신규 버전이 나타났을 때

예: `legends-za`가 데이터를 제공하기 시작한 경우

```sql
UPDATE "TB_GEN_INFO"
SET "koreanName"   = 'Pokémon LEGENDS Z-A',
    "displayOrder" = 23,
    "hasData"      = true
WHERE "versionName" = 'legends-za';
```

`displayOrder`는 **출시 순**으로 부여한다. 중간 삽입이 필요하면 이후 버전들을 밀어야 한다.

---

## 6. 신규 기술이 나타났을 때

Champions 패치로 신규 기술이 추가되면 `TB_MOVES`에 행은 생기지만
`koreanName`·`korDescription`이 비어 있다.

### 보완 절차

```
1. PokeAPI /move/{id} 재조회
   names[]         에서 language.name === "ko" 탐색
   flavor_text_entries[] 에서 ko 마지막 항목 탐색
        ↓
2. ko가 있으면       → koreanName / korDescription 채움
   ko가 없으면       → altKorName / altKorDescription 사용
        ↓
3. alt 컬럼은 웹 검색으로 공식 한국어명 확인 후 수동 입력
```

> ⚠️ **주의:** 영문명을 직역하지 말 것.
> 과거 `quark-drive`를 "쿼크충전"으로 직역했으나 공식명은 **"쿼크차지"** 였고,
> 이런 오류가 31개 특성 중 18개에서 발생했다.
> 반드시 나무위키·포켓몬 위키 등에서 **공식 한국어명을 검색 확인**할 것.

---

## 7. 실행 전 체크리스트

- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 유효한지 확인
- [ ] `--dry-run`으로 먼저 변경사항 확인
- [ ] 총계 변동폭이 상식적인지 검토 (±30% 이내)
- [ ] 미지의 versionName 경고가 없는지 확인
- [ ] 실행 후 검증 쿼리 실행 (§8)

---

## 8. 실행 후 검증 쿼리

```sql
-- ① 버전별 행 수 (급감한 버전이 없는지)
SELECT g."displayOrder", g."koreanName", COUNT(m.*) AS rows
FROM "TB_GEN_INFO" g
LEFT JOIN "TB_CXN_POKEMON_MOVES" m ON m."versionName" = g."versionName"
WHERE g."hasData" = true
GROUP BY g."displayOrder", g."koreanName"
ORDER BY g."displayOrder";

-- ② FK 무결성 (0이어야 정상)
SELECT
  COUNT(*) FILTER (WHERE "moveId"    NOT IN (SELECT "id" FROM "TB_MOVES"))          AS orphan_move,
  COUNT(*) FILTER (WHERE "pokemonId" NOT IN (SELECT "pokemonId" FROM "TB_POKEMONS")) AS orphan_pokemon,
  COUNT(*) FILTER (WHERE "versionName" NOT IN (SELECT "versionName" FROM "TB_GEN_INFO")) AS orphan_version
FROM "TB_CXN_POKEMON_MOVES";

-- ③ 한국어명 없는 기술 (신규 기술 보완 대상)
SELECT "id", "name"
FROM "TB_MOVES"
WHERE "koreanName" IS NULL AND "altKorName" IS NULL
ORDER BY "id";

-- ④ 가디안 회귀 테스트 (버전별 기술 수가 유의미하게 다른지)
SELECT m."versionName", COUNT(DISTINCT m."moveId") AS move_count
FROM "TB_CXN_POKEMON_MOVES" m
WHERE m."pokemonId" = 282
GROUP BY m."versionName"
ORDER BY move_count DESC;
```

---

## 9. 동기화 이력

| 날짜 | 작업 | 결과 |
|------|------|------|
| 2026-01-XX | 최초 수집 | 556,738행 / 23개 버전 |
| 2026-04-27 | 변경 감지 (수동 조사) | BDSP 이름 변경·champions 데이터 발견 |
| — | *Phase 0 실행 예정* | — |

> 실행할 때마다 이 표에 한 줄씩 추가할 것.
