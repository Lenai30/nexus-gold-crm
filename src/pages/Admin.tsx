import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users } from "lucide-react";
import { format } from "date-fns";

interface ProfileRow { id: string; email: string | null; empresa_nome: string | null; created_at: string; }

export default function Admin() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setProfiles((data || []) as ProfileRow[]); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold gradient-gold-text flex items-center gap-2"><Shield className="w-6 h-6" />Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão de contas dos clientes</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-gold" />Contas ({profiles.length})</h2>
        {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div>
                  <p className="font-semibold text-sm">{p.empresa_nome || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy")}</span>
              </div>
            ))}
            {profiles.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta encontrada</p>}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">Para criar contas manualmente, peça o email do cliente e use a página de cadastro pública, ou crie via dashboard do backend.</p>
      </div>
    </div>
  );
}
