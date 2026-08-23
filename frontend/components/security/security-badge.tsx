import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SECURITY_LEVEL_NAMES } from "@/lib/api/mock";
import type { SecurityLevel, Visibility } from "@/lib/api/types";

const DOT_CLASS: Record<SecurityLevel, string> = {
  1: "bg-security-1",
  2: "bg-security-2",
  3: "bg-security-3",
  4: "bg-security-4",
  5: "bg-security-5",
};

interface SecurityBadgeProps {
  level: SecurityLevel;
  visibility: Visibility;
  className?: string;
}

/**
 * CONSOLE.md §8 시그니처:
 * - 공용: mono `L1`~`L5` + 등급명(공개~기밀) + 기능색 점
 * - PRIVATE: mono `PRIVATE` + ink 톤 점(기능색 아님)
 * 데이터·에이전트·프로젝트·출처·유저 어디서나 이 컴포넌트로 일관 부착.
 */
export function SecurityBadge({ level, visibility, className }: SecurityBadgeProps) {
  if (visibility === "private") {
    return (
      <Badge variant="outline" className={cn("gap-1.5 font-mono", className)}>
        <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
        PRIVATE
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-mono", className)}>
      <span className={cn("size-1.5 rounded-full", DOT_CLASS[level])} aria-hidden />
      {`L${level} ${SECURITY_LEVEL_NAMES[level]}`}
    </Badge>
  );
}
