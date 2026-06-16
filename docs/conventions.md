# 코딩 컨벤션

- 언어: Python 3.11, 타입힌트 필수. 포매터/린터 = ruff.
- 검색/권한 함수는 `ctx: SessionContext`(Principal + 프로젝트 권한 포함)를 키워드-온리 인자로 강제: `def search(query, *, ctx): ...`
- 라우터 응답은 반드시 `response_model=*Out`(api/schemas)로 선언 — 도메인 dataclass 직접 반환 금지(계약 강제).
- 모듈 경계 간 직접 import 금지. 조립은 `api/`에서만. 〔예외〕 권한 코어(projects↔sessions↔agents)는 SessionContext 구성을 위해 상호 import 허용(예: sessions가 membership_of·available_agents 사용). 그 외 페이즈 모듈은 반드시 api/에서 조립.
- 테스트: 각 페이즈 모듈에 최소 1개 권한 격리 테스트(등급 밖 청크 미노출) 포함.
- 커밋: `[P{n}] module: summary`
