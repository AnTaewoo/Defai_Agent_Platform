"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session-context";

/** `/chat` -> `/p/[projectId]/chat/[sessionId]`(현재 활성 프로젝트, ctx.session_id)로 진입. */
export default function ChatIndexPage() {
  const { ctx } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/p/${ctx.membership.project_id}/chat/${ctx.session_id}`);
  }, [ctx.membership.project_id, ctx.session_id, router]);

  return null;
}
