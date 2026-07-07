# SINCIDEMA — Pendências

## 🌐 Deploy

- **Repositório:** github.com/marcosaquinojr/sincidema-landing-page (push no `main` = deploy)
- **Projeto Vercel:** `sincidema-landing-page` (team `marcosaknos-projects`)
- **Domínio:** https://sincidema.com.br ✅ NO AR (Hostinger → nameservers Vercel, SSL automático)

## ✅ Implementado (Fase 1 — mai/2026)

- Landing page (`index.html`) com CTAs apontando para `filiacao.html`
- Formulário de filiação em 3 passos (`filiacao.html`):
  1. Dados pessoais (nome, CPF, data nascimento, e-mail, telefone)
  2. Dados profissionais e endereço (CRO/UF, local de trabalho, CEP com ViaCEP, endereço completo)
  3. Forma de pagamento (Pix / cartão à vista / cartão parcelado até 6x)
- Validações cliente (CPF com dígito verificador, e-mail, telefone, CEP)
- Página de confirmação pós-pagamento (`obrigado.html`)
- Rascunho do formulário em localStorage

## ✅ Implementado (Fase 2 — jul/2026): pagamento Stripe + Neon

- **Modelo:** anuidade R$ 240 por **exercício anual** (competência = ano-calendário, válida até 31/12)
- **Banco:** Neon Postgres `sincidema-db` (integração Vercel Marketplace, env `DATABASE_URL`)
  - Tabelas `filiados` e `pagamentos` (schema em `db/schema.sql`)
  - Índice único impede pagar duas vezes a mesma competência
- **API (funções Vercel, runtime Node, Web handlers):**
  - `api/checkout.js` — upsert filiado + pagamento pendente + sessão Stripe Checkout (Pix ou cartão; parcelado envia `installments.enabled`)
  - `api/webhook.js` — eventos `checkout.session.*` marcam pago/falhou/expirado (assinatura verificada)
  - `api/admin.js` — lista filiados + competências (Bearer token `ADMIN_TOKEN`)
- **Admin:** `admin.html` (senha = `ADMIN_TOKEN` do Vercel env; badge por competência, busca)
- **Webhook Stripe:** endpoint `we_1TqYzrDUREk3qUbH1lxAXEsd` → https://sincidema.com.br/api/webhook
- **Env vars (Vercel):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN`, `SITE_URL`, `DATABASE_URL` (Neon)
- **Testado ponta a ponta** em sandbox: cartão de teste → webhook → status `pago` no banco → admin exibe

## ⏳ Pendências Fase 2

- [ ] **Ativar Pix no Stripe** (dashboard → Settings → Payment methods). Para conta BR real é *invite-only* — solicitar acesso. Enquanto não ativo, opção Pix do formulário retorna erro.
- [ ] **Parcelamento no Checkout:** a sessão aceita `installments.enabled`, mas o seletor de parcelas não apareceu no sandbox — verificar/habilitar "Parcelamento" nas configurações de formas de pagamento da conta.
- [ ] **Go-live Stripe:** criar/ativar conta real (CNPJ do sindicato), trocar `STRIPE_SECRET_KEY`, recriar webhook (novo `STRIPE_WEBHOOK_SECRET`).
- [ ] **E-mail de confirmação próprio** (opcional — o Stripe já envia recibo se configurado no dashboard).
- [ ] **Limpar registros de teste** do banco antes do go-live (`DELETE FROM pagamentos; DELETE FROM filiados;`).

## 📞 Informações com placeholders (dados reais necessários)

- [x] **Telefone / WhatsApp** — `(98) 98478-5809` ✅ aplicado em todos os pontos (card contato, FAB WhatsApp, página obrigado)
- [ ] **E-mail** — `contato@sincidema.com.br` — confirmar se o endereço existe e está ativo.
- [ ] **Endereço** — `Rua Sotero dos Reis, 111, Vila Bessa, São Luís/MA, CEP 65.015-480` — validar.
- [ ] **CNPJ** — `23.614.399/0001-04` — confirmar se é o correto.
- [ ] **Valores de piso salarial** — R$ 5.430 (MA), R$ 5.825 (São Luís), R$ 5.709 (média MA), R$ 6.121 (média SLZ) — validar/atualizar com dados da última convenção coletiva.
- [ ] **Número de CDs no Maranhão** — `5.700+` no hero e seção experiência — confirmar dado oficial.
- [ ] **Horário de funcionamento** — "8h às 17h, segunda a sexta" — confirmar.

## 🛠️ Ajustes técnicos / funcionais

- [ ] **Favicon** — Não existe `<link rel="icon">`. Adicionar favicon com a identidade do sindicato (o 404 aparece no console).
- [ ] **Meta tags Open Graph** — Falta `og:image`, `og:title`, `og:description`. Necessário para compartilhamento em WhatsApp/Instagram/Facebook.

## 🎨 Identidade visual

- [ ] **Logo** — Atualmente é um quadrado vermelho com a letra "S". Substituir pela logo oficial do SINCIDEMA.
- [ ] **Imagens** — Todas são fotos genéricas do Unsplash. Substituir por fotos reais do sindicato, diretoria, eventos ou sede.

## 📝 Conteúdo a considerar

- [ ] **Diretoria** — Não há seção com nomes e cargos da diretoria atual.
- [ ] **Redes sociais** — Não há links para Instagram, Facebook ou outras redes do sindicato.
