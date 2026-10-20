import { createClient } from "@supabase/supabase-js";

// Solo para tareas de administración en el servidor (invitar usuarios).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
