import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cleanFileName, jsonError, jsonOk } from "@/lib/utils";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

export async function POST(req: Request) {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Aucun fichier reçu.", 400);
  }

  if (!allowedMimeTypes.includes(file.type)) {
    return jsonError("Type de fichier non autorisé.", 415);
  }

  const module = String(formData.get("module") || "general");
  const ownerType = String(formData.get("owner_type") || "organization");
  const ownerId = String(formData.get("owner_id") || profile.organization_id);

  const { data: usageRows } = await supabase
    .from("files")
    .select("size_bytes")
    .eq("organization_id", profile.organization_id);

  const usedBytes = (usageRows || []).reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(storage_limit_mb)")
    .eq("organization_id", profile.organization_id)
    .in("status", ["trial", "active"])
    .limit(1)
    .single();

  const storageLimitMb = Number((sub?.plans as any)?.storage_limit_mb || 512);
  const limitBytes = storageLimitMb * 1024 * 1024;

  if (usedBytes + file.size > limitBytes) {
    return jsonError("Limite de stockage atteinte. Supprimez des fichiers ou changez de plan.", 403);
  }

  const safeName = cleanFileName(file.name);
  const path = `${profile.organization_id}/${module}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("tenant-files")
    .upload(path, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return jsonError(uploadError.message, 400);
  }

  const { data: saved, error: dbError } = await supabase
    .from("files")
    .insert({
      organization_id: profile.organization_id,
      owner_type: ownerType,
      owner_id: ownerId,
      module,
      original_name: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size
    })
    .select("*")
    .single();

  if (dbError) return jsonError(dbError.message, 400);

  await auditLog({
    organization_id: profile.organization_id,
    action: "uploaded",
    entity_type: "file",
    entity_id: saved.id,
    metadata: { original_name: file.name, size_bytes: file.size }
  });

  return jsonOk(saved, 201);
}
