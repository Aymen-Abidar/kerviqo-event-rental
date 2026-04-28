import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validators";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  await requireAuth();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return jsonOk(data || []);
}

export async function POST(req: Request) {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const parsed = clientSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Données invalides.", 422);

  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      organization_id: profile.organization_id,
      email: parsed.data.email || null
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  await auditLog({
    organization_id: profile.organization_id,
    action: "created",
    entity_type: "client",
    entity_id: data.id
  });

  return jsonOk(data, 201);
}
