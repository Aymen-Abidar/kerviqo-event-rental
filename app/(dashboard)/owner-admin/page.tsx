import { requireAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/KpiCard";
import { Building2, Database, ShieldAlert, Users } from "lucide-react";

export default async function OwnerAdminPage() {
  const { profile } = await requireAuth();
  const supabase = await createSupabaseServerClient();

  if (profile.role !== "saas_owner") {
    return (
      <div className="premium-card p-8">
        <h2 className="text-2xl font-black text-ink">Accès réservé</h2>
        <p className="mt-2 text-stone-500">Cette page est réservée au propriétaire du SaaS.</p>
      </div>
    );
  }

  const [{ count: orgs }, { count: users }, { count: errors }] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("error_logs").select("*", { count: "exact", head: true })
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-gold">SaaS owner</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-ink">Admin panel</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Clients SaaS" value={`${orgs || 0}`} hint="Organisations" icon={Building2} />
        <KpiCard title="Utilisateurs" value={`${users || 0}`} hint="Tous les comptes" icon={Users} />
        <KpiCard title="Erreurs" value={`${errors || 0}`} hint="Logs API/upload/auth" icon={ShieldAlert} />
      </div>
      <div className="premium-card p-6">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-gold" />
          <h3 className="font-black text-ink">À connecter ensuite</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Liste clients, abonnements actifs/expirés, usage stockage, blocage/déblocage, limites plans et analytics MRR.
        </p>
      </div>
    </div>
  );
}
