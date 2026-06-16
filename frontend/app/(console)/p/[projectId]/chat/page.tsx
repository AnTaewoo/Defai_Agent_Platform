"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/session-context";

/** `/p/[projectId]/chat` -> `/p/[projectId]/chat/[sessionId]`(내 세션, ctx.session_id)로 진입. */
export default function ProjectChatIndexPage({ params }: { params: { projectId: string } }) {
  const { ctx } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/p/${params.projectId}/chat/${ctx.session_id}`);
  }, [ctx.session_id, params.projectId, router]);

  return null;
}
