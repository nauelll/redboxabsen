import { createBrowserClient } from "@supabase/ssr";
<<<<<<< HEAD
import {
  Attendance,
  DEFAULT_HOSTS,
  HostPhotoRequest,
  HostRecord,
} from "@/lib/types";

type MockUser = { id: string; email: string } | null;

const SB_COOKIE_FALLBACK_KEY = "__redbox_sb_auth_cookies__";
const MOCK_USER_KEY = "redbox_mock_user_v1";

function readMockUser(): MockUser {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MOCK_USER_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

function writeMockUser(user: MockUser) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(MOCK_USER_KEY);
  } catch {}
}

const mockStore = {
  user: null as MockUser,
  listeners: new Set<() => void>(),
  hosts: DEFAULT_HOSTS.map((name, idx) => ({
    id: `host-${idx + 1}`,
    name,
    avatar_url: null,
    created_at: new Date(2026, 0, idx + 1).toISOString(),
  })) as HostRecord[],
  photoRequests: [] as HostPhotoRequest[],
  attendance: [] as Attendance[],
};

function readCookieMapFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SB_COOKIE_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCookieMapToStorage(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SB_COOKIE_FALLBACK_KEY, JSON.stringify(map));
  } catch {}
}

function parseDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return { name: decodeURIComponent(part), value: "" };
      return {
        name: decodeURIComponent(part.slice(0, idx)),
        value: decodeURIComponent(part.slice(idx + 1)),
      };
    });
}

function createMockClient() {
  const notify = () => mockStore.listeners.forEach((cb) => cb());

  return {
    auth: {
      async getUser() {
        const user = mockStore.user ?? readMockUser();
        mockStore.user = user;
        return { data: { user }, error: null };
      },
      onAuthStateChange(callback: () => void) {
        mockStore.listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mockStore.listeners.delete(callback);
              },
            },
          },
        };
      },
      async signInWithPassword({ email }: { email: string; password: string }) {
        const user = { id: "demo-admin", email: email || "admin@redbox.local" };
        mockStore.user = user;
        writeMockUser(user);
        notify();
        return { data: { user }, error: null };
      },
      async signOut() {
        mockStore.user = null;
        writeMockUser(null);
        notify();
        return { error: null };
      },
    },
    from(table: string) {
      if (table === "admin_users") {
        return {
          select() {
            return {
              eq(_col: string, val: string) {
                return {
                  async maybeSingle() {
                    const user = mockStore.user ?? readMockUser();
                    return {
                      data: user && user.id === val ? { user_id: val } : null,
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "hosts") {
        return {
          select() {
            return {
              async order(_col: string, opts?: { ascending?: boolean }) {
                const sorted = [...mockStore.hosts].sort((a, b) =>
                  opts?.ascending === false
                    ? (b.created_at || "").localeCompare(a.created_at || "")
                    : (a.created_at || "").localeCompare(b.created_at || "")
                );
                return { data: sorted, error: null };
              },
            };
          },
          insert(payload: { name: string; avatar_url?: string | null } | { name: string; avatar_url?: string | null }[]) {
            const items = Array.isArray(payload) ? payload : [payload];
            const created: HostRecord[] = [];
            for (const item of items) {
              const trimmed = item.name.trim();
              if (
                mockStore.hosts.some(
                  (h) => h.name.toLowerCase() === trimmed.toLowerCase()
                )
              ) {
                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: null,
                          error: { message: `Host "${trimmed}" sudah terdaftar.` },
                        };
                      },
                    };
                  },
                  then(resolve: (val: { data: null; error: { message: string } }) => void) {
                    resolve({
                      data: null,
                      error: { message: `Host "${trimmed}" sudah terdaftar.` },
                    });
                  },
                };
              }
              const rec: HostRecord = {
                id: `host-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: trimmed,
                avatar_url: item.avatar_url ?? null,
                created_at: new Date().toISOString(),
              };
              mockStore.hosts.push(rec);
              created.push(rec);
            }
            return {
              select() {
                return {
                  async single() {
                    return { data: created[0] ?? null, error: null };
                  },
                };
              },
              then(resolve: (val: { data: HostRecord[]; error: null }) => void) {
                resolve({ data: created, error: null });
              },
            };
          },
          update(payload: { name?: string; avatar_url?: string | null }) {
            return {
              async eq(col: string, val: string) {
                if (payload.name !== undefined) {
                  const trimmed = payload.name.trim();
                  if (
                    mockStore.hosts.some(
                      (h) =>
                        h.name.toLowerCase() === trimmed.toLowerCase() &&
                        (col === "id" ? h.id !== val : h.name !== val)
                    )
                  ) {
                    return {
                      data: null,
                      error: { message: `Nama host "${trimmed}" sudah digunakan.` },
                    };
                  }
                }
                mockStore.hosts = mockStore.hosts.map((h) =>
                  (col === "id" ? h.id === val : h.name === val)
                    ? {
                        ...h,
                        ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
                        ...(payload.avatar_url !== undefined
                          ? { avatar_url: payload.avatar_url }
                          : {}),
                      }
                    : h
                );
                return { data: null, error: null };
              },
            };
          },
          delete() {
            return {
              async eq(col: string, val: string) {
                mockStore.hosts = mockStore.hosts.filter((h) =>
                  col === "id" ? h.id !== val : h.name !== val
                );
                return { data: null, error: null };
              },
            };
          },
        };
      }

      if (table === "host_photo_requests") {
        return {
          select() {
            return {
              async order(_col: string, opts?: { ascending?: boolean }) {
                const sorted = [...mockStore.photoRequests].sort((a, b) =>
                  opts?.ascending
                    ? a.created_at.localeCompare(b.created_at)
                    : b.created_at.localeCompare(a.created_at)
                );
                return { data: sorted, error: null };
              },
            };
          },
          async insert(payload: Omit<HostPhotoRequest, "id" | "created_at">) {
            const rec: HostPhotoRequest = {
              id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              created_at: new Date().toISOString(),
              ...payload,
            };
            mockStore.photoRequests.unshift(rec);
            return { data: [rec], error: null };
          },
          update(payload: Partial<HostPhotoRequest>) {
            return {
              async eq(_col: string, id: string) {
                mockStore.photoRequests = mockStore.photoRequests.map((r) =>
                  r.id === id ? { ...r, ...payload } : r
                );
                return { data: null, error: null };
              },
            };
          },
          delete() {
            return {
              async eq(_col: string, id: string) {
                mockStore.photoRequests = mockStore.photoRequests.filter((r) => r.id !== id);
                return { data: null, error: null };
              },
            };
          },
        };
      }

      return {
        select() {
          let start = "";
          let end = "9999-12-31";
          const builder = {
            gte(_col: string, val: string) {
              start = val;
              return builder;
            },
            lte(_col: string, val: string) {
              end = val;
              return builder;
            },
            async order(_col: string, opts?: { ascending?: boolean }) {
              const filtered = mockStore.attendance
                .filter((r) => r.attendance_date >= start && r.attendance_date <= end)
                .sort((a, b) =>
                  opts?.ascending
                    ? a.attendance_date.localeCompare(b.attendance_date)
                    : b.attendance_date.localeCompare(a.attendance_date)
                );
              return { data: filtered, error: null };
            },
          };
          return builder;
        },
        update(payload: Partial<Attendance>) {
          return {
            async eq(col: string, val: string) {
              mockStore.attendance = mockStore.attendance.map((r) => {
                if (col === "id" && r.id === val) return { ...r, ...payload };
                if (col === "host" && r.host === val) return { ...r, ...payload };
                return r;
              });
              return { data: null, error: null };
            },
          };
        },
        async upsert(payload: Omit<Attendance, "id" | "created_at">) {
          const idx = mockStore.attendance.findIndex(
            (r) => r.attendance_date === payload.attendance_date && r.host === payload.host
          );
          if (idx >= 0) {
            mockStore.attendance[idx] = { ...mockStore.attendance[idx], ...payload };
          } else {
            mockStore.attendance.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              created_at: new Date().toISOString(),
              ...payload,
            });
          }
          return { data: null, error: null };
        },
      };
    },
    channel() {
      const ch = {
        on() {
          return ch;
        },
        subscribe() {
          return ch;
        },
      };
      return ch;
    },
    removeChannel() {},
  } as unknown as ReturnType<typeof createBrowserClient>;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return createMockClient();
  }

  // Use hybrid cookie + localStorage adapter so Supabase sessions survive
  // cross-origin iframe contexts (where SameSite=Lax cookies are blocked).
  return createBrowserClient(url, anonKey, {
    cookies: {
      getAll() {
        const docCookies = parseDocumentCookies();
        const stored = readCookieMapFromStorage();
        const merged = new Map<string, string>();
        for (const [k, v] of Object.entries(stored)) {
          merged.set(k, v);
        }
        for (const c of docCookies) {
          merged.set(c.name, c.value);
        }
        return Array.from(merged.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: {
            path?: string;
            maxAge?: number;
          };
        }[]
      ) {
        if (typeof document === "undefined") return;
        const stored = readCookieMapFromStorage();
        const isHttps =
          typeof window !== "undefined" && window.location.protocol === "https:";

        for (const { name, value, options } of cookiesToSet) {
          const isDelete = options?.maxAge === 0 || value === "";
          if (isDelete) {
            delete stored[name];
          } else {
            stored[name] = value;
          }

          const parts = [
            `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
            `Path=${options?.path || "/"}`,
          ];
          if (options?.maxAge !== undefined) {
            parts.push(`Max-Age=${options.maxAge}`);
          } else if (!isDelete) {
            parts.push("Max-Age=31536000");
          }
          if (isHttps) {
            parts.push("SameSite=None");
            parts.push("Secure");
          } else {
            parts.push("SameSite=Lax");
          }
          document.cookie = parts.join("; ");
        }

        writeCookieMapToStorage(stored);
      },
    },
  });
=======

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
}