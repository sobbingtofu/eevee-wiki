#!/usr/bin/env node
/**
 * PokeAPI → Supabase 동기화 스크립트
 *
 *   npm run sync:pokeapi -- --dry-run    변경사항 미리보기 (DB 미반영)
 *   npm run sync:pokeapi                 실제 적용
 *
 * 옵션
 *   --dry-run        DB에 쓰지 않고 리포트만 출력
 *   --refresh        디스크 캐시를 무시하고 PokeAPI 재호출
 *   --limit N        앞에서 N마리만 처리 (동작 확인용)
 *   --concurrency N  동시 요청 수 (기본 10)
 *
 * 상세 배경은 docs/GUIDE-pokeapi-sync.md 참조.
 */

import {readFileSync, existsSync, mkdirSync, writeFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createClient} from "@supabase/supabase-js";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(PROJECT_ROOT, ".env.local");
const CACHE_DIR = join(PROJECT_ROOT, ".cache", "pokeapi");
const REPORT_DIR = join(PROJECT_ROOT, ".cache", "reports");

const POKEAPI = "https://pokeapi.co/api/v2";

/**
 * 우리가 다루는 22개 버전. 여기 없는 version_group은 전부 버려진다.
 * displayOrder는 TB_GEN_INFO와 맞춰 출시 순으로 유지한다.
 */
const TARGET_VERSIONS = [
  "red-blue",
  "yellow",
  "gold-silver",
  "crystal",
  "ruby-sapphire",
  "firered-leafgreen",
  "emerald",
  "diamond-pearl",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "black-2-white-2",
  "x-y",
  "omega-ruby-alpha-sapphire",
  "sun-moon",
  "ultra-sun-ultra-moon",
  "lets-go-pikachu-lets-go-eevee",
  "sword-shield",
  "brilliant-diamond-shining-pearl",
  "legends-arceus",
  "scarlet-violet",
  "champions",
];

/**
 * 의도적으로 제외한 버전. 여기에도 TARGET에도 없는 이름이 나타나면
 * PokeAPI에 신규 버전이 등재된 것이므로 경고를 띄운다.
 */
const KNOWN_EXCLUDED = [
  "colosseum", // 사용자 결정 — 본편 아님
  "xd", // 사용자 결정 — 본편 아님
  "red-green-japan", // 일본판
  "blue-japan", // 일본판
  "the-isle-of-armor", // DLC (본편에 통합)
  "the-crown-tundra",
  "the-teal-mask",
  "the-indigo-disk",
  "legends-za", // 데이터 미제공
  "mega-dimension",
];

const TARGET_SET = new Set(TARGET_VERSIONS);
const EXCLUDED_SET = new Set(KNOWN_EXCLUDED);

/** types/apiTypes.ts의 LearnMethod와 일치. 새 값이 나타나면 경고한다. */
const KNOWN_LEARN_METHODS = new Set([
  "level-up",
  "machine",
  "egg",
  "tutor",
  "train",
  "light-ball-egg",
  "form-change",
  "stadium-surfing-pikachu",
]);

/** types/apiTypes.ts의 LearnMethodFilter와 일치 (UI 필터에 노출하는 것) */
const FILTERABLE_LEARN_METHODS = new Set(["level-up", "machine", "tutor", "train"]);

// ── CLI ───────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const flagValue = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};

const DRY_RUN = hasFlag("--dry-run");
const REFRESH = hasFlag("--refresh");
const LIMIT = flagValue("--limit", Infinity);
const CONCURRENCY = flagValue("--concurrency", 10);

// ── 유틸 ──────────────────────────────────────────────────────────
function parseEnv(filePath) {
  const env = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const m = line.match(/^([^=\s#][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {signal: AbortSignal.timeout(30_000)});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw new Error(`${url} 실패: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

/** 디스크 캐시를 끼운 fetch. --refresh 시 캐시를 무시하고 갱신한다. */
async function fetchCached(cacheKey, url) {
  const path = join(CACHE_DIR, `${cacheKey}.json`);
  if (!REFRESH && existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      // 캐시 손상 시 재수집
    }
  }
  const json = await fetchJson(url);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, JSON.stringify(json));
  return json;
}

/** Supabase 기본 row limit(1000)을 우회하는 전량 조회 */
async function fetchAllRows(supabase, table, columns) {
  const PAGE = 1000;
  const all = [];
  let from = 0;
  for (;;) {
    const {data, error} = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} 로드 실패: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/** 동시성 제한 병렬 실행 (진행률 표시 포함) */
async function mapWithConcurrency(items, limit, worker, label) {
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;

  async function runner() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      if (done % 50 === 0 || done === items.length) {
        process.stdout.write(`\r   ${label} ${done}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, items.length)}, runner));
  process.stdout.write("\n");
  return results;
}

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const rowKey = (r) => `${r.pokemonId}|${r.moveId}|${r.versionName}|${r.learnMethod}`;

// ── 메인 ──────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now();

  console.log("═".repeat(60));
  console.log(`PokeAPI 동기화${DRY_RUN ? "  [DRY RUN — DB 미반영]" : ""}`);
  console.log("═".repeat(60));

  const env = parseEnv(ENV_PATH);
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {autoRefreshToken: false, persistSession: false},
  });

  // ── Step 1. 기준 데이터 로드 ────────────────────────────────────
  console.log("\n[1/6] 기준 데이터 로드");

  const [pokemonRows, genRows, moveRows, typeRows] = await Promise.all([
    fetchAllRows(supabase, "TB_POKEMONS", "pokemonId"),
    fetchAllRows(supabase, "TB_GEN_INFO", "versionName"),
    fetchAllRows(supabase, "TB_MOVES", "id"),
    fetchAllRows(supabase, "TB_TYPES", "id"),
  ]);

  const pokemonIds = pokemonRows
    .map((r) => r.pokemonId)
    .sort((a, b) => a - b)
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);
  const knownVersions = new Set(genRows.map((r) => r.versionName));
  const knownMoveIds = new Set(moveRows.map((r) => r.id));
  const knownTypeIds = new Set(typeRows.map((r) => r.id));

  console.log(`   포켓몬 ${pokemonIds.length}마리 / 기술 ${knownMoveIds.size}개 / 버전 ${knownVersions.size}개`);

  // FK 대상이 준비되지 않았다면 여기서 멈춘다 (INSERT 도중 실패 방지)
  const missingVersionRows = TARGET_VERSIONS.filter((v) => !knownVersions.has(v));
  if (missingVersionRows.length > 0) {
    console.error("\n❌ TB_GEN_INFO에 없는 대상 버전이 있습니다. FK 위반이 발생합니다.");
    for (const v of missingVersionRows) console.error(`   - ${v}`);
    console.error("\n   TB_GEN_INFO에 해당 행을 먼저 추가한 뒤 다시 실행하세요.");
    process.exit(1);
  }

  console.log("\n[2/6] 기존 학습 정보 로드");
  const oldRows = await fetchAllRows(
    supabase,
    "TB_CXN_POKEMON_MOVES",
    "pokemonId,moveId,versionName,learnMethod,levelLearnedAt",
  );
  const oldMap = new Map(oldRows.map((r) => [rowKey(r), r.levelLearnedAt]));
  console.log(`   ${oldRows.length.toLocaleString()}행`);

  // ── Step 3. PokeAPI 수집 ────────────────────────────────────────
  console.log(`\n[3/6] PokeAPI 수집 (동시 ${CONCURRENCY}개, 캐시 ${REFRESH ? "무시" : "사용"})`);

  const newRows = [];
  const unknownVersions = new Map(); // versionName → 등장 횟수
  const excludedCounts = new Map();
  const seenMoveIds = new Set();
  const failures = [];

  await mapWithConcurrency(
    pokemonIds,
    CONCURRENCY,
    async (pokemonId) => {
      let data;
      try {
        data = await fetchCached(`pokemon/${pokemonId}`, `${POKEAPI}/pokemon/${pokemonId}`);
      } catch (err) {
        failures.push({pokemonId, message: err.message});
        return;
      }

      for (const entry of data.moves ?? []) {
        const moveId = Number(entry.move.url.match(/\/move\/(\d+)\//)?.[1]);
        if (!moveId) continue;

        for (const detail of entry.version_group_details ?? []) {
          const versionName = detail.version_group.name;

          if (!TARGET_SET.has(versionName)) {
            const bucket = EXCLUDED_SET.has(versionName) ? excludedCounts : unknownVersions;
            bucket.set(versionName, (bucket.get(versionName) ?? 0) + 1);
            continue;
          }

          seenMoveIds.add(moveId);
          newRows.push({
            pokemonId,
            moveId,
            versionName,
            learnMethod: detail.move_learn_method.name,
            levelLearnedAt: detail.level_learned_at ?? 0,
          });
        }
      }
    },
    "수집",
  );

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length}마리 수집 실패 — 데이터가 불완전하므로 중단합니다.`);
    for (const f of failures.slice(0, 10)) console.error(`   #${f.pokemonId}: ${f.message}`);
    process.exit(1);
  }

  // PK가 겹치는 중복 제거 (같은 조합이 두 번 오는 경우 마지막 값 채택)
  const dedup = new Map();
  for (const r of newRows) dedup.set(rowKey(r), r);
  const finalRows = [...dedup.values()];

  console.log(`   수집 ${finalRows.length.toLocaleString()}행 (중복 ${newRows.length - finalRows.length}건 제거)`);

  // ── Step 4. 사전 검사 ───────────────────────────────────────────
  console.log("\n[4/6] 사전 검사");

  if (unknownVersions.size > 0) {
    console.log("   ⚠️  알려지지 않은 버전 발견 — 이번 실행에서는 제외됨");
    for (const [v, c] of [...unknownVersions].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${v}  (${c.toLocaleString()}건)`);
    }
    console.log("      → 다룰 대상이라면 TARGET_VERSIONS와 TB_GEN_INFO에 추가하세요.");
  } else {
    console.log("   ✓ 알려지지 않은 버전 없음");
  }

  const newMoveIds = [...seenMoveIds].filter((id) => !knownMoveIds.has(id)).sort((a, b) => a - b);
  console.log(`   ${newMoveIds.length === 0 ? "✓ " : "➕ "}신규 기술 ${newMoveIds.length}개`);

  const delta = finalRows.length - oldRows.length;
  const deltaPct = oldRows.length === 0 ? 0 : (delta / oldRows.length) * 100;
  console.log(
    `   ${Math.abs(deltaPct) > 30 ? "⚠️ " : "✓ "}행 수 변동 ${delta >= 0 ? "+" : ""}${delta.toLocaleString()} (${deltaPct.toFixed(1)}%)`,
  );
  if (Math.abs(deltaPct) > 30 && !DRY_RUN) {
    console.error("\n❌ 변동폭이 30%를 넘습니다. PokeAPI 이상 가능성이 있어 중단합니다.");
    console.error("   --dry-run으로 내역을 확인한 뒤, 정상이라면 SAFETY_OVERRIDE=1 을 붙여 실행하세요.");
    if (process.env.SAFETY_OVERRIDE !== "1") process.exit(1);
    console.error("   SAFETY_OVERRIDE=1 → 계속 진행합니다.");
  }

  // ── Step 5. diff 계산 ───────────────────────────────────────────
  console.log("\n[5/6] 변경사항 계산");

  const added = [];
  const changed = [];
  for (const r of finalRows) {
    const key = rowKey(r);
    if (!oldMap.has(key)) added.push(r);
    else if (oldMap.get(key) !== r.levelLearnedAt) changed.push({...r, oldLevel: oldMap.get(key)});
  }
  const newKeys = new Set(finalRows.map(rowKey));
  const removed = oldRows.filter((r) => !newKeys.has(rowKey(r)));

  const byVersion = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.versionName, (m.get(r.versionName) ?? 0) + 1);
    return m;
  };
  const addedByVersion = byVersion(added);
  const removedByVersion = byVersion(removed);
  const finalByVersion = byVersion(finalRows);
  const oldByVersion = byVersion(oldRows);

  console.log(`   ➕ 추가 ${added.length.toLocaleString()} / ✏️  변경 ${changed.length.toLocaleString()} / ➖ 제거 ${removed.length.toLocaleString()}`);

  console.log("\n   버전별 행 수 (기존 → 신규)");
  for (const v of TARGET_VERSIONS) {
    const before = oldByVersion.get(v) ?? 0;
    const after = finalByVersion.get(v) ?? 0;
    const mark = before === after ? " " : after > before ? "▲" : "▼";
    console.log(`      ${mark} ${v.padEnd(34)} ${String(before).padStart(7)} → ${String(after).padStart(7)}`);
  }
  const goneVersions = [...oldByVersion.keys()].filter((v) => !TARGET_SET.has(v));
  for (const v of goneVersions) {
    console.log(`      ✖ ${v.padEnd(34)} ${String(oldByVersion.get(v)).padStart(7)} →       0  (대상 제외)`);
  }

  // 리포트 파일 저장
  mkdirSync(REPORT_DIR, {recursive: true});
  const reportPath = join(REPORT_DIR, `sync-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        dryRun: DRY_RUN,
        totals: {before: oldRows.length, after: finalRows.length},
        addedByVersion: Object.fromEntries(addedByVersion),
        removedByVersion: Object.fromEntries(removedByVersion),
        finalByVersion: Object.fromEntries(finalByVersion),
        unknownVersions: Object.fromEntries(unknownVersions),
        newMoveIds,
        changedSample: changed.slice(0, 200),
      },
      null,
      2,
    ),
  );
  console.log(`\n   리포트 저장: ${reportPath.replace(PROJECT_ROOT + "/", "")}`);

  if (DRY_RUN) {
    console.log("\n[6/6] DRY RUN — DB에 반영하지 않고 종료합니다.");
    console.log(`\n소요 ${((Date.now() - startedAt) / 1000 / 60).toFixed(1)}분`);
    return;
  }

  // ── Step 6. 적용 ────────────────────────────────────────────────
  console.log("\n[6/6] DB 반영");

  // 신규 기술을 먼저 넣어야 학습 정보 INSERT에서 FK 위반이 나지 않는다
  if (newMoveIds.length > 0) {
    console.log(`   신규 기술 ${newMoveIds.length}개 수집 중`);
    const moveInserts = await mapWithConcurrency(
      newMoveIds,
      CONCURRENCY,
      async (id) => {
        const m = await fetchCached(`move/${id}`, `${POKEAPI}/move/${id}`);
        const typeId = Number(m.type?.url?.match(/\/type\/(\d+)\//)?.[1]) || null;
        const korName = m.names?.find((n) => n.language.name === "ko")?.name ?? null;
        const korEntries = (m.flavor_text_entries ?? []).filter((e) => e.language.name === "ko");
        const korDescription = korEntries.length > 0 ? korEntries[korEntries.length - 1].flavor_text : null;
        return {
          id: m.id,
          name: m.name,
          korName,
          typeId: typeId && knownTypeIds.has(typeId) ? typeId : null,
          power: m.power,
          accuracy: m.accuracy,
          pp: m.pp,
          priority: m.priority,
          effectChance: m.effect_chance,
          damageClass: m.damage_class?.name ?? null,
          target: m.target?.name ?? null,
          korDescription,
          hasKoreanDescription: korDescription !== null,
          url: `${POKEAPI}/move/${m.id}/`,
        };
      },
      "기술",
    );

    const {error} = await supabase.from("TB_MOVES").upsert(moveInserts, {onConflict: "id"});
    if (error) throw new Error(`TB_MOVES 삽입 실패: ${error.message}`);

    const needsManual = moveInserts.filter((m) => !m.korName);
    console.log(`   ✓ TB_MOVES ${moveInserts.length}개 추가 (한국어명 없음 ${needsManual.length}개)`);
    for (const m of needsManual) console.log(`      #${m.id} ${m.name} → 공식 한국어명 수동 보완 필요`);
  }

  // 전량 교체. 버전 단위로 나눠 지워야 대량 DELETE 타임아웃을 피할 수 있다.
  console.log("   기존 행 삭제 중");
  const versionsToClear = [...new Set([...oldByVersion.keys(), ...TARGET_VERSIONS])];
  for (const v of versionsToClear) {
    const {error} = await supabase.from("TB_CXN_POKEMON_MOVES").delete().eq("versionName", v);
    if (error) throw new Error(`삭제 실패(${v}): ${error.message}`);
  }

  const {count: leftover} = await supabase
    .from("TB_CXN_POKEMON_MOVES")
    .select("*", {count: "exact", head: true});
  if (leftover && leftover > 0) throw new Error(`삭제 후에도 ${leftover}행이 남아 있습니다. 중단합니다.`);

  console.log("   삽입 중");
  const batches = chunk(finalRows, 2000);
  let inserted = 0;
  for (const [i, batch] of batches.entries()) {
    const {error} = await supabase.from("TB_CXN_POKEMON_MOVES").insert(batch);
    if (error) throw new Error(`삽입 실패(배치 ${i + 1}/${batches.length}): ${error.message}`);
    inserted += batch.length;
    if ((i + 1) % 20 === 0 || i === batches.length - 1) {
      process.stdout.write(`\r      ${inserted.toLocaleString()}/${finalRows.length.toLocaleString()}`);
    }
  }
  process.stdout.write("\n");

  // hasData / learnMethods 재계산 — TB_GEN_INFO를 실제 데이터와 다시 맞춘다
  console.log("   TB_GEN_INFO.hasData / learnMethods 재계산");

  // 버전별로 실제 존재하는 "배우는 방법"(UI 필터 대상 4종)을 집계.
  // 버전마다 다르다 — champions는 train만, 레전드 아르세우스는 기술머신이 없다.
  const methodsByVersion = new Map();
  for (const r of finalRows) {
    if (!FILTERABLE_LEARN_METHODS.has(r.learnMethod)) continue;
    if (!methodsByVersion.has(r.versionName)) methodsByVersion.set(r.versionName, new Set());
    methodsByVersion.get(r.versionName).add(r.learnMethod);
  }

  for (const v of knownVersions) {
    const hasData = (finalByVersion.get(v) ?? 0) > 0;
    const learnMethods = [...(methodsByVersion.get(v) ?? [])].sort();
    const {error} = await supabase.from("TB_GEN_INFO").update({hasData, learnMethods}).eq("versionName", v);
    if (error) throw new Error(`TB_GEN_INFO 갱신 실패(${v}): ${error.message}`);
  }

  // 타입에 없는 학습 방법이 새로 등장하면 UI에서 한국어 라벨이 비게 된다.
  // (champions의 "train"이 실제로 이렇게 유입됐다)
  const unknownMethods = [...new Set(finalRows.map((r) => r.learnMethod))].filter(
    (m) => !KNOWN_LEARN_METHODS.has(m),
  );
  if (unknownMethods.length > 0) {
    console.log(`\n   ⚠️  타입에 정의되지 않은 학습 방법: ${unknownMethods.join(", ")}`);
    console.log("      → types/apiTypes.ts의 LearnMethod / LEARN_METHOD_KOR에 추가하세요.");
    console.log("      → 한국어명은 직역하지 말고 공식 표기를 확인할 것.");
  }

  console.log(`\n✅ 완료 — ${oldRows.length.toLocaleString()}행 → ${finalRows.length.toLocaleString()}행`);
  console.log(`소요 ${((Date.now() - startedAt) / 1000 / 60).toFixed(1)}분`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
