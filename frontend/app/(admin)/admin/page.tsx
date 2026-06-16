import { redirect } from "next/navigation";

/** `/admin` -> `/admin/overview` (관리자 사이드바·콘솔 진입점에 기본 인덱스가 없어 404 방지). */
export default function AdminIndexPage() {
  redirect("/admin/overview");
}
