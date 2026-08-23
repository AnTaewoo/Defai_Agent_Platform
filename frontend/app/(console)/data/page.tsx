"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataSheet } from "@/components/data/data-sheet";
import { LibraryTable } from "@/components/data/library-table";
import { UploadDropzone, type UploadDraft } from "@/components/data/upload-dropzone";
import { ApiError, listLibraryData, uploadData } from "@/lib/api/client";
import type { DataItemOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

type FilterTab = "all" | "shared" | "private";

/** CONSOLE.md §5.2 — 데이터함(top-level 라이브러리): 업로드 + 테이블 + 필터 + Data Sheet. */
export default function DataLibraryPage() {
  const { ctx, user } = useSession();

  const [items, setItems] = useState<DataItemOut[]>([]);
  const [uploadedAt, setUploadedAt] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<DataItemOut | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 실제 백엔드에서 목록 로드. 사용자 전환 시에도 재요청.
  useEffect(() => {
    listLibraryData(ctx).then(setItems).catch(console.error);
  }, [ctx.principal.user_id]);

  const filtered = items.filter((d) => {
    if (filter === "shared") return d.visibility === "shared";
    if (filter === "private") return d.visibility === "private";
    return true;
  });

  async function handleUpload(draft: UploadDraft) {
    const now = new Date().toISOString();
    const placeholderId = `uploading-${Date.now()}`;
    const placeholder: DataItemOut = {
      id: placeholderId,
      owner_id: ctx.principal.user_id,
      security_level: draft.securityLevel,
      visibility: draft.visibility,
      doc_type: draft.docType,
      index_status: "indexing",
      dept: user.dept,
      chunk_count: 0,
      attached_project_count: 0,
    };
    setItems((prev) => [placeholder, ...prev]);
    setUploadedAt((prev) => ({ ...prev, [placeholderId]: now }));

    try {
      const result = await uploadData(
        ctx,
        draft.file,
        draft.securityLevel,
        draft.visibility,
        user.dept ?? "",
      );
      setItems((prev) => prev.map((d) => (d.id === placeholderId ? result : d)));
      setUploadedAt((prev) => {
        const next = { ...prev, [result.id]: now };
        delete next[placeholderId];
        return next;
      });
    } catch (err) {
      const msg = err instanceof ApiError ? `(${err.status}) ${err.message}` : "업로드 실패";
      setItems((prev) =>
        prev.map((d) =>
          d.id === placeholderId ? { ...d, index_status: `error: ${msg}` } : d,
        ),
      );
    }
  }

  function handleRowClick(item: DataItemOut) {
    setSelected(item);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-wide text-foreground">
          데이터함
        </h1>
        <p className="text-sm text-muted-foreground">
          top-level 라이브러리 — 업로드 → 파싱 → 청킹·태깅 → 임베딩(local) → 색인까지 한 줄기로
          진행됩니다. 프로젝트와 독립적으로 내 소유로 쌓입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">업로드</CardTitle>
          <CardDescription>MVP 지원 형식: PDF · XLSX</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone onUpload={(d) => void handleUpload(d)} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-medium text-foreground">내 라이브러리</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="shared">공용</TabsTrigger>
              <TabsTrigger value="private">PRIVATE</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Card className="p-0">
          <CardContent className="p-0">
            <LibraryTable data={filtered} uploadedAt={uploadedAt} onRowClick={handleRowClick} />
          </CardContent>
        </Card>
      </div>

      <DataSheet item={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
