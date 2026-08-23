"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/api/client";
import { useSession } from "@/lib/session-context";

/**
 * CONSOLE.md §5.0 `/join` [public].
 * POST /auth/register로 실제 유저를 생성하고 자동 로그인.
 * 클리어런스 L1 고정 — 프로젝트는 관리자나 매니저가 멤버로 추가할 때 등장.
 */
export default function JoinPage() {
  const { setUserId } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const user = await registerUser(name.trim());
      setUserId(user.id);
      router.push("/dashboard");
    } catch {
      setError("가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
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

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>회원가입</CardTitle>
              <CardDescription>
                가입 시 클리어런스 <span className="font-mono">L1</span>로 시작하며, 프로젝트는
                관리자나 매니저가 멤버로 추가할 때 등장합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={!name.trim() || loading}>
                {loading ? "가입 중…" : "가입하고 시작하기"}
              </Button>
              <p className="text-center font-mono text-[11px] text-muted-foreground">
                이미 계정이 있으신가요?{" "}
                <a href="/login" className="underline">
                  로그인
                </a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
