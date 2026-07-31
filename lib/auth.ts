import { cookies } from "next/headers";
import { prisma } from "./db";
import type { User } from "./generated/prisma/client";

// Every API request resolves the session, and that lookup is a full round trip
// to the database — which is in another region, so it costs ~180ms of pure
// latency before any real work starts. With every dashboard list polling on a
// 4s timer, that dominates the request.
//
// The cache is deliberately short-lived and is invalidated explicitly on logout
// and on any user change, so the only way to observe a stale entry is editing
// the database out of band. Trade-off: a session revoked directly in SQL stays
// usable for up to TTL_MS.
const TTL_MS = 5_000;

type Entry = { user: User; expiresAt: number; checkedAt: number };
const cache = new Map<string, Entry>();

export function invalidateSession(token: string) {
  cache.delete(token);
}

export function invalidateAllSessions() {
  cache.clear();
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const now = Date.now();
  const hit = cache.get(token);
  if (hit && now - hit.checkedAt < TTL_MS) {
    // Session expiry is still enforced on every call, cached or not.
    return hit.expiresAt > now ? hit.user : null;
  }

  const session = await prisma.sessions.findUnique({
    where: {
      token: token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    cache.delete(token);
    return null;
  }
  if (session.expires_at < new Date()) {
    cache.delete(token);
    return null;
  }
  if (!session.user.active) {
    cache.delete(token);
    return null;
  }

  cache.set(token, {
    user: session.user,
    expiresAt: session.expires_at.getTime(),
    checkedAt: now,
  });

  return session.user;
}
