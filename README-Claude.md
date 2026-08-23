# D.A.P — Claude Code 하네스

> Deployable Enterprise-first AI agent Platform

권한분리형 멀티에이전트 RAG 플랫폼을 **Claude Code로 빌드하기 위한 프로젝트 하네스**다.
회의록의 확정 아키텍처/기술스택/마일스톤이 코드와 가드레일로 박혀 있다.

## 이 하네스에 들어있는 것

- `CLAUDE.md` — Claude Code가 자동으로 읽는 프로젝트 헌법(절대원칙·스택·금지사항)
- `ROADMAP.md` — 대회 일정 + 13단계 페이즈별 완료조건(DoD)
- `docs/` — 아키텍처 결정, 데이터/권한 스키마, 코딩 컨벤션
- `.claude/commands/` — 반복 작업용 슬래시 커맨드 (`/prototype-check`, `/build-parser`, `/add-agent`, `/index-status`)
- `.claude/agents/` — 전문 서브에이전트 (파서/검색/보안리뷰)
- `infra/` — OpenSearch + Postgres + Airflow docker-compose
- `backend/src/` — 페이즈별 모듈 스켈레톤(인터페이스 + TODO)
- `frontend/` — P7~P9 자리표시

## 사용법

```bash
# 1. 이 폴더를 git 저장소로
cd dap-harness && git init

# 2. Claude Code 실행 (이 디렉토리에서)
claude

# 3. 첫 지시 예시
#   "ROADMAP의 P1부터 시작하자. PDF/Excel 파서를 CLAUDE.md 규칙대로 구현해줘."
#   또는 슬래시 커맨드: /prototype-check
```

Claude Code는 매 세션 `CLAUDE.md`를 읽고, 절대원칙(벡터DB 분리 금지, 권한 pre-filter,
핵심 파싱 직접 제어, 에이전트 격리, MVP 우선)을 지키며 작업한다.

## 기본 전제 (필요시 변경)

- 백엔드: Python 3.11 + FastAPI / 프론트: Next.js + shadcn/ui (Mission Console / Daylight 라이트 테마, `docs/design-system.md`)
- 메타 DB: PostgreSQL (MariaDB로 교체 가능)

## 망분리 · LLM 소스 (정책)

- **기본값 = 망분리(air-gap):** 생성 LLM은 사내 vLLM, 임베딩은 OpenSearch ML Commons(둘 다 local). 기본 상태에서 외부 LLM 호출 0건 · EGRESS 0이 불변식.
- **클라우드 토글(예외):** admin 전역 토글(on-prem↔cloud)로만 외부 클라우드 LLM을 켤 수 있다. 켜면 **경고·명시적 확인** 후 전 에이전트 파이프라인이 동시 전환되고, cloud 동안 L3↑ 사용 시 사용자 콘솔에 경고가 전파된다(차단 아님 — admin 책임).
- **감사:** 소스 전환·cloud 진행 확인·클리어런스 변경은 전부 `audit_log`에 기록(`frontend/OPS_CONSOLE.md`). 임베딩은 토글과 무관하게 항상 local.
- 근거: `CLAUDE.md` 절대원칙 6 · `docs/architecture.md` ADR-6.
