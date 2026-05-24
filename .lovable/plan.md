Vou transformar o Nexus CRM atual (mock data, frontend-only) em um SaaS multi-tenant real, usando o código GS compartilhado como referência funcional.

## 1. Backend (Lovable Cloud)

**Ativar Lovable Cloud** e criar schema:

- `profiles` (id=auth.uid, empresa_nome, criado_em)
- `user_roles` (user_id, role: 'admin'|'user') + função `has_role()` security definer
- `leads` (id, user_id, nome, whatsapp, origem, origem_tag, score, status, notas, prox_acao, nascimento, **campanha_nome, conjunto_nome, anuncio_nome**, campanha_id, last_interaction, created_at)
- `settings` (user_id PK, empresa_nome, logo_url, mensagem_padrao, webhook_token UNIQUE)
- `campanhas_log` (id, user_id, mensagem, qtd_leads, criado_em) — histórico de disparos manuais
- RLS em todas: `user_id = auth.uid()` para CRUD; admin via `has_role`
- Trigger `on_auth_user_created` → cria profile + settings + gera `webhook_token` aleatório

## 2. Autenticação

- Página `/auth` com tabs Login/Cadastro (email+senha, Google)
- Auto-cadastro público + área `/admin` (só role=admin) para criar/listar/desativar contas
- `ProtectedRoute` envolvendo o app; redirect para `/auth` se não logado
- `useAuth` hook com `onAuthStateChange` + `getSession`

## 3. Edge Function pública: webhook n8n

`supabase/functions/webhook-lead/index.ts` (verify_jwt=false)
- Recebe `POST /functions/v1/webhook-lead?token=XYZ` com payload do n8n
- Valida token → encontra `user_id` em `settings`
- Insere lead com `user_id` correto, incluindo campanha_nome/conjunto_nome/anuncio_nome
- Retorna URL única para o usuário copiar no n8n: exibida em Configurações

## 4. Realtime

- Habilitar replicação na tabela `leads`
- Substituir `LeadsContext` por hook `useLeadsRealtime` que faz `supabase.channel().on('postgres_changes')` filtrado por user_id → atualiza estado sem reload

## 5. Novos menus (espelhando o GS)

**Follow-up** vira página com 3 abas (Tabs do shadcn):
- *Agenda* — leads com prox_acao vencido/hoje
- *Aniversariantes* — leads cujo `nascimento` é hoje/semana, com botão "Parabenizar" (abre WhatsApp com template)
- *Campanha Manual* — selecionar leads (checkboxes), escrever mensagem com `{nome}`, opcional imagem, botão "Disparar Campanha" → abre WhatsApp em sequência + grava em `campanhas_log`

**Configurações** (novo menu, ícone Settings):
- *Identidade (Whitelabel)*: nome da empresa, upload de logo → atualiza sidebar/título em tempo real
- *Webhooks & Integrações*: protegido por senha (`nexus2026`); mostra URL única do webhook + botão copiar, exemplo de payload JSON para n8n
- *Informações do Sistema*: versão, total de leads, e-mail logado, botão Sair

**Novo Lead** (botão no header): modal com formulário (nome, whatsapp, origem, score, status, campanha_nome…) → insert no banco.

## 6. Card do Lead (LeadCard.tsx)

Adicionar bloco condicional Gold Premium logo abaixo do nome:
```
📣 {campanha_nome}
   └ {conjunto_nome} · {anuncio_nome}
```
Estilo: badge dourado com borda sutil, só renderiza se houver dados. Também ícone de lixeira para deletar.

## 7. Dashboard

- KPIs lidos do banco (Total, Em Negociação, Follow-ups hoje, Leads quentes)
- Funil de Vendas com barras proporcionais por coluna (igual ao screenshot)

## 8. Detalhes técnicos

- Mantém design Gold Premium e tema claro/escuro existente
- React Query para cache + invalidate em mutations
- Zod para validação de formulários (Novo Lead, Configurações, Auth)
- Toast (sonner) para feedback de ações
- Estrutura de arquivos:
  - `src/integrations/supabase/` (auto-gerada)
  - `src/hooks/useAuth.tsx`, `useLeadsRealtime.tsx`, `useSettings.tsx`
  - `src/pages/Auth.tsx`, `Admin.tsx`, `Configuracoes.tsx`
  - `src/components/NewLeadModal.tsx`, `ProtectedRoute.tsx`
  - `src/pages/FollowUp.tsx` reescrito com abas
  - Edge function: `supabase/functions/webhook-lead/index.ts`

## Fora de escopo (avisar)
- Disparo automático de WhatsApp (precisa Evolution API ou similar — n8n cuida disso do lado dele)
- Upload real de imagem em "Campanha Manual" — vou guardar URL/base64 mas o envio fica no n8n
