import { redirect } from "next/navigation";

/** `/p/[projectId]` -> `/p/[projectId]/overview` (프로젝트 루트에 기본 인덱스가 없어 404 방지). */
export default function ProjectIndexPage({ params }: { params: { projectId: string } }) {
  redirect(`/p/${params.projectId}/overview`);
}
