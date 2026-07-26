GET /api/versions
기술 학습 정보가 있는 게임 버전 목록 (22개, 최신순)

GET /api/moves/search?q=
기술 국문명 검색

GET /api/moves/[id]/brief
기술 간략 정보

GET /api/moves/[id]/detail
기술 상세 정보

GET /api/moves/[id]/learning-pokemons?version=
버전별 기술 배우는 포켓몬

GET /api/pokemons/search?q=
포켓몬 국문명 검색

GET /api/pokemons/[id]
포켓몬 상세 정보 (타입·특성·스탯)

GET /api/pokemons/[id]/evol
포켓몬 진화 체인

GET /api/pokemons/[id]/moves?version=
버전별 특정 포켓몬이 배우는 기술 목록

POST /api/search-learning-pokemons
복수 기술 모두 배우는 포켓몬 검색 (body: versionName)

---

기술 학습 정보는 세대(gen)가 아니라 게임 버전(version) 단위로 조회한다.
version 값은 GET /api/versions 의 versionName을 사용한다.
같은 8세대라도 소드·실드 / BDSP / 레전드 아르세우스는 배우는 기술이 크게 다르므로,
세대로 묶으면 합집합이 되어 실제 게임과 어긋난다.
