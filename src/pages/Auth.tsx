import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gem, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [empresa, setEmpresa] = useState("");

  const acceptInviteIfAny = async () => {
    if (!inviteToken) return;
    const { data, error } = await supabase.rpc("accept_team_invite", { _token: inviteToken });
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error("Convite: " + (data as any).error); return; }
    toast.success("Bem-vindo à equipe!");
  };

  useEffect(() => {
    if (!loading && user) {
      acceptInviteIfAny().finally(() => navigate("/", { replace: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + (inviteToken ? `/auth?invite=${inviteToken}` : ""), data: { empresa_nome: empresa || "Funcionário" } },
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada! Verifique seu email para confirmar.");
  };

  const handleGoogle = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + (inviteToken ? `/auth?invite=${inviteToken}` : "") });
    if (r.error) toast.error("Erro Google: " + r.error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center mb-3">
            <Gem className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-gold-text">Nexus CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">Gold Premium</p>
        </div>

        {inviteToken && (
          <div className="mb-4 p-3 rounded-xl bg-gold/10 border border-gold/30 flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-gold shrink-0" />
            <span>Você foi convidado para uma equipe. Entre ou cadastre-se para aceitar.</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <Tabs defaultValue={inviteToken ? "signup" : "login"}>
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground">Entrar</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                {!inviteToken && <div><Label>Nome da empresa</Label><Input required value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Minha Empresa" /></div>}
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground">Criar conta</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continuar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}
