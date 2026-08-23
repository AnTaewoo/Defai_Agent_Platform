"use client";

import { useEffect, useState } from "react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addProjectMember, listUsers } from "@/lib/api/client";
import type { ProjectRole, UserPublicOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";
import { UserPlus } from "lucide-react";

const ROLE_OPTIONS: ProjectRole[] = ["viewer", "member", "editor", "manager", "project_admin"];

interface InviteMemberDialogProps {
  projectId: string;
  existingUserIds: string[];
  onInvite: () => void;
}

/**
 * CONSOLE.md §6 — 멤버 초대 = 직접 추가(수락 없음). manager·project_admin만 노출.
 * POST /projects/{id}/members로 실제 DB에 멤버를 추가한다.
 */
export function InviteMemberDialog({ projectId, existingUserIds, onInvite }: InviteMemberDialogProps) {
  const { ctx } = useSession();
  const [open, setOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserPublicOut[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      listUsers()
        .then((users) => {
          const candidates = users.filter((u) => !existingUserIds.includes(u.id));
          setAllUsers(candidates);
          setUserId(candidates[0]?.id ?? "");
        })
        .catch(console.error);
    }
  }, [open, existingUserIds.join(",")]);

  async function handleInvite() {
    if (!userId || loading) return;
    setLoading(true);
    try {
      await addProjectMember(ctx, projectId, userId, role);
      setOpen(false);
      onInvite();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus />
        멤버 추가
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>멤버 직접 추가</DialogTitle>
          <DialogDescription>
            추가된 user의 대시보드에 이 프로젝트가 즉시 등장합니다. 수락 절차는 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-user">사용자</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v ?? "")}>
              <SelectTrigger id="invite-user" className="w-full">
                <SelectValue placeholder="사용자 선택" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.id} · {u.dept || "-"} · L{u.level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="font-mono uppercase">
                    {r}
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
          <Button onClick={handleInvite} disabled={!userId || loading}>
            {loading ? "추가 중…" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
