/**
 * Typed Supabase client helpers.
 *
 * NOTE: The manual Database type doesn't fully satisfy @supabase/supabase-js
 * generic constraints. Once connected to Supabase, run:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * and these wrappers become unnecessary.
 *
 * Until then, use `db()` for operations that fail type-checking.
 */

import { createClient } from "./client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createClient> & { from: (table: string) => any };

/**
 * Returns an untyped Supabase client for operations where the manual
 * Database type causes TypeScript issues.
 */
export function db() {
  return createClient() as unknown as AnySupabaseClient;
}
