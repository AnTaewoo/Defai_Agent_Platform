"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/api/client";
import { SECURITY_LEVEL_NAMES } from "@/lib/api/mock";
import type { SecurityLevel } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { Plus } from "lucide-react";

/** CONSOLE.md §5.1 — 프로젝트 생성: 이름 · 설명 · 최고 등급(≤ 본인 클리어런스). 생성자 = project_admin. */
export function CreateProjectDialog() {
  const { ctx } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxLevel, setMaxLevel] = useState<SecurityLevel>(ctx.principal.level);
  const [loading, setLoading] = useState(false);

  const levels: SecurityLevel[] = [1, 2, 3, 4, 5].filter(
    (l) => l <= ctx.principal.level,
  ) as SecurityLevel[];

  function reset() {
    setName("");
    setDescription("");
    setMaxLevel(ctx.principal.level);
  }

  async function handleCreate() {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const project = await createProject(ctx, name.trim(), description.trim(), maxLevel);
      setOpen(false);
      reset();
      router.push(`/p/${project.id}/overview`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        프로젝트 생성
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로젝트</DialogTitle>
          <DialogDescription>
            프로젝트를 만들면 본인이 project_admin이 됩니다. 최고 등급은 본인 클리어런스(L
            {ctx.principal.level}) 이하만 지정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">이름</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신규 사업 제안 TF"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc">설명</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목적을 간단히 적어주세요."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-level">최고 보안등급</Label>
            <Select
              value={String(maxLevel)}
              onValueChange={(v) => setMaxLevel(Number(v) as SecurityLevel)}
            >
              <SelectTrigger id="project-level" className="w-full">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading ? "생성 중…" : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
