"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SECURITY_LEVEL_NAMES } from "@/lib/api/mock";
import type { SecurityLevel, Visibility } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_EXT = [".pdf", ".xlsx"];

export interface UploadDraft {
  file: File;
  fileName: string;
  docType: string;
  securityLevel: SecurityLevel;
  visibility: Visibility;
}

interface UploadDropzoneProps {
  onUpload: (draft: UploadDraft) => void;
}

/**
 * CONSOLE.md §5.2 — 업로드 드롭존: 드래그&드롭/클릭 + 등급 셀렉터(L1~본인 클리어런스)
 * + 공개 토글(공용/PRIVATE) + 소속 부서(고정 표시). MVP 형식 PDF · XLSX.
 * 실제 업로드 fetch는 없음(Phase 4) — onUpload로 로컬 state에 행 추가.
 */
export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const { ctx, user } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(ctx.principal.level);
  const [shared, setShared] = useState(true);

  const levels: SecurityLevel[] = [1, 2, 3, 4, 5].filter(
    (l) => l <= ctx.principal.level,
  ) as SecurityLevel[];

  function fileExt(name: string) {
    const idx = name.lastIndexOf(".");
    return idx >= 0 ? name.slice(idx).toLowerCase() : "";
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFormatError(null);
    let rejected = false;
    Array.from(files).forEach((file) => {
      const ext = fileExt(file.name);
      if (!ACCEPTED_EXT.includes(ext)) {
        rejected = true;
        return;
      }
      onUpload({
        file,
        fileName: file.name,
        docType: ext.replace(".", ""),
        securityLevel,
        visibility: shared ? "shared" : "private",
      });
    });
    if (rejected) setFormatError(`지원 형식 외 파일이 포함되어 있습니다. PDF · XLSX만 허용됩니다.`);
  }

  return (
    <div className="space-y-3">
      {formatError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {formatError}
        </p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors",
          dragOver && "border-foreground/40 bg-muted",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          파일을 드래그하거나 클릭해 업로드
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          지원 형식: PDF · XLSX — 업로드 즉시 파싱 → 청킹 → 색인(local)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="space-y-1">
          <Label className="font-mono text-[11px] uppercase text-muted-foreground">소속 부서</Label>
          <p className="text-sm text-foreground">{user.dept}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="upload-level" className="font-mono text-[11px] uppercase text-muted-foreground">
            보안등급
          </Label>
          <Select
            value={String(securityLevel)}
            onValueChange={(v) => setSecurityLevel(Number(v) as SecurityLevel)}
          >
            <SelectTrigger id="upload-level" size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {`L${l} ${SECURITY_LEVEL_NAMES[l]}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="upload-shared" checked={shared} onCheckedChange={setShared} />
          <Label htmlFor="upload-shared" className="text-sm">
            {shared ? "공용" : "PRIVATE"}
          </Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => inputRef.current?.click()}
        >
          파일 선택
        </Button>
      </div>
    </div>
  );
}
