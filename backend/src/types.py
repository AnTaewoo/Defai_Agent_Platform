"""프로젝트 공통 타입. 권한 분리의 핵심 계약이 여기 있다."""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Principal:
    """로그인 사용자의 권한 주체(전역 클리어런스: 보안등급). 부서는 접근 게이트가 아니다."""
    user_id: str
    level: int                       # 보안등급 (이 값 이하 데이터만 접근)


@dataclass(frozen=True)
class ProjectMembership:
    """(유저, 프로젝트) 단위 권한. 같은 유저도 프로젝트마다 역할이 다르다.

    유저가 쓸 수 있는 에이전트는 여기 수동으로 담지 않는다 — 프로젝트가 보유한
    에이전트 중 '등급 <= 유저등급'인 것이 자동으로 가용해진다(아래 SessionContext 참고).
    """
    project_id: str
    role: str                            # "viewer" | "member" | "editor" | "manager" | "project_admin"


@dataclass(frozen=True)
class SessionContext:
    """유저별 세션의 요청 컨텍스트 = 신원(Principal) + 활성 프로젝트 권한(Membership).

    보안에 민감한 모든 호출(검색·에이전트·도구·생성)은 principal 단독이 아니라
    이 ctx를 받는다. 프로젝트 격리와 등급 기반 에이전트 가용성이 여기서 강제된다.
    active_agent_id: 유저가 이 세션에서 골라 쓰는 에이전트(가용 목록 내에서만).
    """
    session_id: str
    principal: Principal
    membership: ProjectMembership
    active_agent_id: str | None = None


@dataclass(frozen=True)   # 보안 메타는 태깅 후 불변 — 분류 등급 변조 차단
class SecurityMeta:
    """청크가 빠짐없이 들고 다니는 보안/출처 메타.

    〔개정〕 데이터는 프로젝트 독립 라이브러리에 업로드되므로 project_id/agent_id는
    청크에 박지 않는다. 프로젝트 스코프는 project_data(N:M, P13)로 연결하고,
    에이전트 가용성은 청크가 아니라 프로젝트가 보유한 에이전트 집합에서 파생된다.
    """
    security_level: int
    dept: str                  # 출처 부서(메타데이터 — 접근 게이트 아님)
    source: str
    doc_type: str
    owner_id: str               # 업로더(데이터 라이브러리 소유자)
    visibility: str             # "shared" | "private" — private는 owner_id만 접근


@dataclass(frozen=True)
class DataItem:
    """[P13] 데이터 라이브러리의 1단위(프로젝트 독립, 업로드 단위). Postgres `data` 행에 대응.

    〔개정〕 청크에 project_id를 박지 않는 대신, 라이브러리 데이터를 project_data(N:M)로
    프로젝트에 연결(attach)한다.

    조인키: `id`(PK) == `project_data.data_id` == 청크 `SecurityMeta.source`.
    즉 검색 격리(게이트 ①)는 '활성 프로젝트에 연결된 data.id 집합'으로 청크의 `source`를 filter한다.
    `source`는 원본 문서 경로/식별자(출처·provenance)일 뿐 조인키가 아니다.
    보안 메타(등급/visibility/owner/dept)는 청크의 SecurityMeta와 동일 값으로 전파된다.
    """
    id: str                     # PK == project_data.data_id == 청크 meta.source (조인키)
    owner_id: str               # 업로더(라이브러리 소유자)
    doc_type: str
    security_level: int
    visibility: str             # "shared" | "private"
    dept: str                   # 출처 부서(메타데이터 — 접근 게이트 아님)
    source: str | None = None   # 원본 문서 경로/식별자(provenance, 조인키 아님)
    filename: str = ""          # 원본 업로드 파일명(표시용)


@dataclass
class Chunk:
    text: str
    meta: SecurityMeta
    # embedding은 OpenSearch ML Commons 인게스트 파이프라인이 서버측에서 생성한다.
    # 클라이언트는 채우지 않는다(None). 클라이언트측 임베딩이 필요할 때만 사용하는 예비 필드.
    embedding: list[float] | None = None


@dataclass
class ParsedDocument:
    """모든 파서의 표준 출력 형태."""
    source: str
    doc_type: str
    text_blocks: list[str] = field(default_factory=list)
    tables: list[list[list[str]]] = field(default_factory=list)  # 표 구조 보존


@dataclass(frozen=True)   # 생성물 등급은 전파 후 불변
class Artifact:
    """워크플로우가 생성한 산출물(문서/코드/답변). 보안등급은 소스에서 전파된다."""
    kind: str                          # "document" | "code" | "answer"
    security_level: int                # = 사용된 모든 소스의 max 등급 (절대원칙 7)
    source_ids: tuple[str, ...]        # 출처/근거 청크·도구결과 ID (provenance)
    path: str | None = None            # 파일 산출물 경로(docx/pdf/pptx/xlsx 등)
    content: str | None = None         # 텍스트/코드 본문


@dataclass(frozen=True)   # 도구결과 등급도 불변
class ToolResult:
    """에이전트 도구 실행 결과. 결과도 등급을 가진다."""
    tool: str
    security_level: int
    output: str
    source_ids: tuple[str, ...] = ()


def propagate_level(*levels: int, floor: int = 1) -> int:
    """보안등급 전파 규칙: 접한 모든 것의 최고 등급을 상속한다(fail-closed).

    생성물(Artifact)·도구결과는 이 함수로 등급을 계산한다. 절대 더 낮게 매기지 않는다.
    소스가 0건이어도 floor(기본 L1) 미만으로는 내려가지 않는다 — 출처 없는 생성물이
    '최저=최대공개' 등급(0)으로 새는 fail-open을 막는다. 호출부(docgen/codegen/workflows)는
    floor=ctx.principal.level 로 '행위자 클리어런스'를 바닥에 깔아야 한다.
    단, 생성물 분류는 직접 호출하지 말고 classify_artifact(ctx, ...)를 쓴다(정책 단일 강제).
    """
    return max((*levels, floor))


def classify_artifact(ctx: "SessionContext", *source_levels: int) -> int:
    """생성물(Artifact/ToolResult) 등급 = max(소스 등급, 행위자 클리어런스).

    정책(명시적): 출처가 없거나 모두 낮아도 **행위자 클리어런스 이상으로 과분류**한다(안전 우선).
    → 출처 없는 답변·코드가 L1로 새는 과소분류를 구조적으로 차단. 생성 모듈(docgen/codegen/
    workflows)은 propagate_level을 직접 부르지 말고 이 함수만 사용한다(floor 우회 표면 제거).
    """
    return propagate_level(*source_levels, floor=ctx.principal.level)
