"""[P6] SSO/LDAP 인증 + 인가. 사용자 등급을 Principal로 변환해 검색 필터로 전달."""
from .sso import principal_from_session

__all__ = ["principal_from_session"]
