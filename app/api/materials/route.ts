import { requireAuth } from "@/lib/auth";
import { auditLog, errorLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/utils";
import { materialSchema } from "@/lib/validators";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  await requireAuth();

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return jsonOk(data || []);
}

export async function POST(req: Request) {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  try {
    const parsed = materialSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError("Données invalides.", 422);

    const quantityTotal = parsed.data.quantity_total;

    const { data, error } = await supabase
      .from("materials")
      .insert({
        ...parsed.data,
        organization_id: profile.organization_id,
        quantity_available: quantityTotal,
        quantity_reserved: 0
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);

    await auditLog({
      organization_id: profile.organization_id,
      action: "created",
      entity_type: "material",
      entity_id: data.id,
      metadata: { name: data.name }
    });

    return jsonOk(data, 201);
  } catch (err) {
    await errorLog({
      organization_id: profile.organization_id,
      source: "api/materials",
      message: err instanceof Error ? err.message : "Unknown error"
    });
    return jsonError("Erreur serveur.", 500);
  }
}
