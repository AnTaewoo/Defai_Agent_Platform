# D2. 사용자 인터페이스 설계서 — D.A.P

문서정보: D.A.P · 설계 · D2 · 근거 `docs/design-system.md`, `frontend/`

## 1. 개요
"Mission Console / Daylight" 라이트 미니멀 콘솔. shadcn/ui 강제, 5색 무채색 팔레트.

## 2. 디자인 토큰
- 컬러: ink `#1c1c1c` / sage `#daddd8` / cream `#ecebe4` / mist `#eef0f2` / ghost `#fafaff`
- 폰트: Chakra Petch(display) / Geist(body) / JetBrains Mono(data)
- 보안등급: 기능색 L1~L5(녹→적) 배지·출처·필터에 한정.

## 3. 주요 화면
| 화면 | 구성(shadcn) | 비고 |
|---|---|---|
| 로그인 | Card + Button | SSO/LDAP |
| 프로젝트 스위처 | Command(⌘K) | 멤버 프로젝트만 |
| 챗 | ScrollArea + 스트리밍 + 출처 사이드패널 | SSE, Citation, 멀티모달 |
| 에이전트 선택 | Select/Command | available_agents(ctx)만 |
| 프로젝트 문서함 | Table + Sheet | RBAC 필터, 등급 배지 |
| Agent 빌더(대시보드) | Form + Sheet | project_admin |

## 4. 추적성
R2 유스케이스 → 화면. 설계 규칙 상세 `docs/design-system.md`. 구현 P7·P8.
