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
  3. Forma de pagamento (Pix / cartão à vista / cartão parcelado até 12x)
- Validações cliente (CPF com dígito verificador, e-mail, telefone, CEP)
- Página de confirmação pós-pagamento (`obrigado.html`)
- Rascunho do formulário em localStorage

## ✅ Implementado (Fase 2 — jul/2026): pagamento Stripe + Neon

- **Modelo:** anuidade por **exercício anual** (competência = ano-calendário, válida até 31/12)
  - **Profissional:** R$ 240 · meta da campanha: 2.000 sindicalizados
  - **Estudante:** R$ 100 · meta da campanha: 1.000 sindicalizados (CRO opcional no formulário)
- **Banco:** Neon Postgres `sincidema-db` (integração Vercel Marketplace, env `DATABASE_URL`)
  - Tabelas `filiados` e `pagamentos` (schema em `db/schema.sql`)
  - Índice único impede pagar duas vezes a mesma competência
- **API (funções Vercel, runtime Node, Web handlers):**
  - `api/checkout.js` — upsert filiado + pagamento pendente + sessão Stripe Checkout (Pix ou cartão; parcelado envia `installments.enabled`)
  - `api/webhook.js` — eventos `checkout.session.*` marcam pago/falhou/expirado (assinatura verificada)
  - `api/admin.js` — lista filiados + competências (Bearer token `ADMIN_TOKEN`)
  - `api/stats.js` — público, alimenta o contador regressivo da landing (pagos/restantes por categoria, cache de 60s)
  - `api/_email.js` — e-mail de confirmação de pagamento via **Resend** (disparado pelo webhook; no-op sem `RESEND_API_KEY`)
- **Contador regressivo** na landing (seção "Meta"): profissionais e estudantes separados, diminui a cada pagamento confirmado da competência atual
- **Admin:** `admin.html` (senha = `ADMIN_TOKEN` do Vercel env; badge por competência, busca)
- **Webhook Stripe (PRODUÇÃO):** endpoint `we_1TqdiADn6jxMVcX6GGs61y3D` → https://sincidema.com.br/api/webhook (conta oficial `acct_1TqYfyDn6jxMVcX6`, criado em 07/07/2026)
- **Env vars (Vercel):** `STRIPE_SECRET_KEY` (LIVE em production desde 07/07/2026; development segue com a chave de sandbox), `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN`, `SITE_URL`, `DATABASE_URL` (Neon)
- **Testado ponta a ponta** em sandbox: cartão de teste → webhook → status `pago` no banco → admin exibe
- **GO-LIVE feito em 07/07/2026:** chave live em produção, webhook da conta oficial, banco zerado (registros de teste apagados), sessão `cs_live_` de verificação criada e expirada com sucesso

## ⏳ Pendências Fase 2

- [ ] **Ativar Pix no Stripe** (dashboard → Settings → Payment methods). Conta BR é *invite-only*: solicitar acesso. Capacidade `pix_payments` ainda ausente na conta oficial (verificado 07/07/2026). Enquanto não ativo, opção Pix do formulário retorna erro.
- [ ] **Parcelamento no Checkout:** a sessão aceita `installments.enabled`, mas o seletor de parcelas não apareceu no sandbox. Conferir/habilitar "Parcelamento" nas configurações de formas de pagamento da conta oficial e validar no primeiro pagamento real parcelado.
- [ ] **Boleto:** capacidade `boleto_payments` está ativa na conta oficial; dá para oferecer como forma de pagamento futuramente se o sindicato quiser.
- [ ] **Ativar o e-mail de confirmação (Resend):** código pronto; falta (1) criar conta gratuita em https://resend.com, (2) verificar o domínio sincidema.com.br (adicionar os registros DNS que o Resend pedir; o DNS é gerenciado pela Vercel), (3) criar API key e salvar como `RESEND_API_KEY` no Vercel. Opcional: `EMAIL_FROM` (padrão `SINCIDEMA <contato@sincidema.com.br>`). Sem a key, o pagamento confirma normalmente, só não envia e-mail.
- [ ] **Acompanhar o primeiro pagamento real:** conferir no dashboard do Stripe (Developers → Webhooks) se a entrega do webhook retornou 200 e se o admin exibiu o pagamento como `pago`.

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
