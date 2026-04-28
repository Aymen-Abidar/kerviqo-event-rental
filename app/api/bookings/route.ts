import { requireAuth } from "@/lib/auth";
import { auditLog, errorLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validators";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  await requireAuth();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      clients(full_name, phone),
      booking_items(*, materials(name, category))
    `)
    .order("event_date", { ascending: true });

  if (error) return jsonError(error.message, 500);
  return jsonOk(data || []);
}

export async function POST(req: Request) {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  try {
    const parsed = bookingSchema.safeParse(await req.json());
    if (!parsed.success) return jsonError("Données invalides.", 422);

    const input = parsed.data;
    const totalItems = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalServices = input.services.reduce((sum, item) => sum + item.price, 0);
    const totalAmount = totalItems + totalServices;
    const resteAmount = Math.max(totalAmount - input.avance_paid, 0);

    for (const item of input.items) {
      const { data: available, error: availabilityError } = await supabase.rpc("check_material_availability", {
        p_organization_id: profile.organization_id,
        p_material_id: item.material_id,
        p_start_date: input.delivery_date,
        p_end_date: input.return_date
      });

      if (availabilityError) {
        return jsonError("Impossible de vérifier le stock.", 400);
      }

      if (Number(available) < item.quantity) {
        return jsonError(`Stock insuffisant pour un article. Disponible: ${available}`, 409);
      }
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        organization_id: profile.organization_id,
        client_id: input.client_id,
        event_type: input.event_type,
        event_date: input.event_date,
        delivery_date: input.delivery_date,
        return_date: input.return_date,
        location_address: input.location_address,
        status: input.status,
        total_amount: totalAmount,
        avance_paid: input.avance_paid,
        reste_amount: resteAmount,
        notes: input.notes
      })
      .select("*")
      .single();

    if (bookingError || !booking) return jsonError(bookingError?.message || "Erreur réservation.", 400);

    const itemsToInsert = input.items.map((item) => ({
      organization_id: profile.organization_id,
      booking_id: booking.id,
      material_id: item.material_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price
    }));

    const servicesToInsert = input.services.map((service) => ({
      organization_id: profile.organization_id,
      booking_id: booking.id,
      name: service.name,
      price: service.price
    }));

    const { error: itemsError } = await supabase.from("booking_items").insert(itemsToInsert);
    if (itemsError) return jsonError(itemsError.message, 400);

    if (servicesToInsert.length > 0) {
      const { error: servicesError } = await supabase.from("booking_services").insert(servicesToInsert);
      if (servicesError) return jsonError(servicesError.message, 400);
    }

    if (input.avance_paid > 0) {
      await supabase.from("payments").insert({
        organization_id: profile.organization_id,
        booking_id: booking.id,
        amount: input.avance_paid,
        method: "cash",
        payment_date: new Date().toISOString().slice(0, 10),
        notes: "Avance initiale"
      });
    }

    await auditLog({
      organization_id: profile.organization_id,
      action: "created",
      entity_type: "booking",
      entity_id: booking.id,
      metadata: { totalAmount, items: input.items.length }
    });

    return jsonOk(booking, 201);
  } catch (err) {
    await errorLog({
      organization_id: profile.organization_id,
      source: "api/bookings",
      message: err instanceof Error ? err.message : "Unknown error"
    });
    return jsonError("Erreur serveur.", 500);
  }
}
