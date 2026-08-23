"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SecurityBadge } from "@/components/security/security-badge";
import { listUsers } from "@/lib/api/client";
import type { UserPublicOut } from "@/lib/api/types";
import { useSession } from "@/lib/session-context";

/**
 * CONSOLE.md §3-1 `/login` [public].
 * GET /auth/users로 실제 유저 목록을 불러와 계정 선택 화면을 구성한다.
 * SSO/LDAP 연동(P6) 전까지는 이 계정 선택 방식으로 동작한다.
 */
export default function LoginPage() {
  const { setUserId } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublicOut[]>([]);

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error);
  }, []);

  function selectAccount(id: string) {
    setUserId(id);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-foreground">
            D.A.P
          </h1>
          <p className="font-mono text-xs text-muted-foreground">Mission Console / Daylight</p>
        </div>

        <Card className="[--card-spacing:--spacing(8)]">
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              계정을 선택해 로그인합니다. 클리어런스별로 보이는 화면이 달라집니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                유저 목록을 불러오는 중…
              </p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectAccount(u.id)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="text-sm font-medium text-foreground">{u.name || u.id}</span>
                  <SecurityBadge level={u.level} visibility="shared" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <p className="text-center font-mono text-[11px] text-muted-foreground">
          계정이 없으신가요?{" "}
          <a href="/join" className="underline">
            가입하기
          </a>
        </p>
      </div>
    </div>
  );
}
