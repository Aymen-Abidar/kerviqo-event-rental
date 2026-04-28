import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-gold">Module</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-ink">Factures</h2>
          <p className="mt-2 max-w-2xl text-stone-500">Générez et imprimez les factures liées aux réservations.</p>
        </div>
        <Link href="#" className="btn-primary">Ajouter</Link>
      </div>
      <EmptyState
        title="Interface CRUD à connecter"
        text="La base de données, la sécurité RLS et les API sont déjà préparées. Connectez ce module avec les tables et routes API correspondantes."
      />
    </div>
  );
}
