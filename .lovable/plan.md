# Chat WhatsApp Interno via Evolution API

## Objetivo
Substituir o "abrir nova guia do WhatsApp Web" por um **chat drawer dentro do CRM** que envia e recebe mensagens reais do WhatsApp através da Evolution API.

## O que vou construir

### 1. Banco de dados (1 migration)
- Adicionar 3 colunas em `settings`:
  - `evolution_url` (text) — URL base da Evolution API
  - `evolution_api_key` (text) — API key global
  - `evolution_instance` (text) — nome da instância
- Nova tabela `messages`:
  - `id`, `user_id`, `lead_id`, `whatsapp` (número normalizado), `direction` (`in`|`out`), `content`, `status`, `created_at`
  - RLS: usuário só lê/escreve mensagens onde `user_id = auth.uid()`
  - Realtime habilitado (chat ao vivo)
  - Índice por `(lead_id, created_at)`

### 2. Configurações (`src/pages/Configuracoes.tsx`)
Nova seção **"WhatsApp (Evolution API)"** com 3 campos:
- URL da Evolution (ex: `https://evo.seudominio.com`)
- API Key
- Nome da instância

Mais um campo somente-leitura com a **URL de Webhook** que o usuário deve colar no painel da Evolution para receber mensagens recebidas.

### 3. Edge Functions (2 novas)

**`wa-send`** (autenticada com JWT do usuário)
- Recebe `{ lead_id, content }`
- Busca credenciais Evolution em `settings`
- Chama `POST {url}/message/sendText/{instance}` com a API key
- Salva a mensagem em `messages` (direction = `out`)

**`wa-webhook`** (pública, com token por usuário, igual ao webhook-lead)
- URL: `/functions/v1/wa-webhook?token=<webhook_token>`
- Recebe payload da Evolution (`messages.upsert` event)
- Normaliza o número, encontra o `lead` correspondente (por `whatsapp`)
- Insere em `messages` (direction = `in`) e atualiza `last_interaction` do lead
- Ignora mensagens enviadas pelo próprio usuário (`fromMe: true`)

### 4. UI Chat (`src/components/ChatDrawer.tsx`)
- Drawer lateral (shadcn `Sheet`) com:
  - Header: nome + WhatsApp do lead, badge de temperatura
  - Lista de mensagens (bolhas estilo WhatsApp, douradas/escuras seguindo tema)
  - Subscription realtime em `messages` filtrado por `lead_id`
  - Input + botão "Enviar" (chama `wa-send`)
  - Atalho Enter para enviar

### 5. Mudança no botão Atender
Em `LeadCard.tsx`:
- "Atender" agora abre o `ChatDrawer` (em vez de `window.open`)
- Sem 30 guias abertas

### 6. Fluxo do usuário (uma única vez)
1. Vai em **Configurações → WhatsApp**, preenche URL/API Key/Instância e salva
2. Copia a **URL de Webhook** e cola no painel da Evolution (eventos `MESSAGES_UPSERT`)
3. Pronto — clica em "Atender" e conversa dentro do CRM

## O que NÃO faço nesta etapa
- Envio de mídia (áudio/imagem) — só texto nessa primeira versão
- QR code / pareamento da instância (isso o usuário faz no painel da Evolution)
- Lista geral de conversas — o chat é sempre por lead

## Observações técnicas
- A Evolution API roda no servidor do próprio usuário, então as credenciais ficam por-usuário em `settings` (não em secrets globais)
- O `wa-webhook` reusa o `webhook_token` já existente em `settings` para autenticar (mesmo modelo do `webhook-lead`)
- Mensagens enviadas aparecem otimisticamente e são confirmadas pelo realtime
