"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { fetchUserProjects, getMe } from "@/lib/api/client";
import type { ProjectSummary, SecurityLevel, SessionContext, UserPublicOut } from "@/lib/api/types";

const STORAGE_KEY = "dap-mock-user-id";
const DUMMY_AGENT_ID = "agent-default";
const DEFAULT_PROJECT_ID = "proj-default";

interface SessionState {
  userId: string;
  ctx: SessionContext;
  user: UserPublicOut;
  isAdmin: boolean;
  isAuthenticated: boolean;
  setUserId: (id: string) => void;
  signOut: () => void;
}

const SessionCtx = createContext<SessionState | null>(null);

function buildCtx(
  userId: string,
  profile: UserPublicOut,
  projects: ProjectSummary[],
): SessionContext {
  const defaultProject = projects.find((p) => p.id === DEFAULT_PROJECT_ID) ?? projects[0];
  return {
    session_id: `session-${userId}`,
    principal: { user_id: profile.id, level: profile.level as SecurityLevel },
    membership: {
      project_id: defaultProject?.id ?? DEFAULT_PROJECT_ID,
      role: defaultProject?.my_role ?? "viewer",
    },
    active_agent_id: DUMMY_AGENT_ID,
  };
}

const NULL_CTX: SessionContext = {
  session_id: "",
  principal: { user_id: "", level: 1 },
  membership: { project_id: DEFAULT_PROJECT_ID, role: "viewer" },
  active_agent_id: null,
};
const NULL_USER: UserPublicOut = { id: "", name: "", level: 1, dept: "" };

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserPublicOut | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  async function loadSession(id: string) {
    const [prof, projs] = await Promise.all([getMe(id), fetchUserProjects(id)]);
    setProfile(prof);
    setProjects(projs);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserIdState(stored);
      loadSession(stored)
        .catch(() => {
          window.localStorage.removeItem(STORAGE_KEY);
          setUserIdState(null);
        })
        .finally(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, []);

  const setUserId = (id: string) => {
    setUserIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
    loadSession(id).catch(console.error);
  };

  const signOut = () => {
    setUserIdState(null);
    setProfile(null);
    setProjects([]);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  // 미수화 또는 userId는 있지만 profile이 아직 로드 중일 때 렌더 차단
  if (!hydrated || (userId && !profile)) return null;

  if (!userId || !profile) {
    return (
      <SessionCtx.Provider
        value={{
          userId: "",
          ctx: NULL_CTX,
          user: NULL_USER,
          isAdmin: false,
          isAuthenticated: false,
          setUserId,
          signOut,
        }}
      >
        {children}
      </SessionCtx.Provider>
    );
  }

  const ctx = buildCtx(userId, profile, projects);

  return (
    <SessionCtx.Provider
      value={{
        userId,
        ctx,
        user: profile,
        isAdmin: profile.level >= 5,
        isAuthenticated: true,
        setUserId,
        signOut,
      }}
    >
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionState {
  const value = useContext(SessionCtx);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
