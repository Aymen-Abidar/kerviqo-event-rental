import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validators";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  await requireAuth();

  const { data, error } = await supabase
    .from("payments")
    .select("*, bookings(event_type, event_date, clients(full_name))")
    .order("payment_date", { ascending: false });

  if (error) return jsonError(error.message, 500);
  return jsonOk(data || []);
}

export async function POST(req: Request) {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const parsed = paymentSchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Données invalides.", 422);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      ...parsed.data,
      organization_id: profile.organization_id
    })
    .select("*")
    .single();

  if (error || !payment) return jsonError(error?.message || "Erreur paiement.", 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, total_amount, avance_paid")
    .eq("id", parsed.data.booking_id)
    .single();

  if (booking) {
    const newPaid = Number(booking.avance_paid || 0) + parsed.data.amount;
    await supabase
      .from("bookings")
      .update({
        avance_paid: newPaid,
        reste_amount: Math.max(Number(booking.total_amount || 0) - newPaid, 0)
      })
      .eq("id", booking.id);
  }

  await auditLog({
    organization_id: profile.organization_id,
    action: "created",
    entity_type: "payment",
    entity_id: payment.id,
    metadata: { amount: payment.amount }
  });

  return jsonOk(payment, 201);
}
