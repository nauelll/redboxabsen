<<<<<<< HEAD
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      auth: {
        async getUser() {
          return { data: { user: null }, error: null };
        },
      },
    } as unknown as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();
  return createServerClient(
    url,
    anonKey,
=======
﻿import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        }
      }
    }
  );
}
<<<<<<< HEAD
=======


>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
