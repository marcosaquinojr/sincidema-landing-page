# SINCIDEMA — Pendências

## 🌐 Deploy

- **Repositório:** github.com/marcosaquinojr/sincidema-landing-page
- **Projeto Vercel:** `sincidema-landing-page` (team `marcosaknos-projects`)
- **URL provisória:** https://sincidema-landing-page.vercel.app
- **Domínio final:** https://sincidema.com.br (registrado na Hostinger)
- **Status DNS:** ⏳ aguardando troca de nameservers
  - Trocar `ns1.dns-parking.com` / `ns2.dns-parking.com` → `ns1.vercel-dns.com` / `ns2.vercel-dns.com`
  - Painel Hostinger → Domínios → sincidema.com.br → DNS/Nameservers → Editar
  - Propagação: 1–24h. Vercel emite SSL automaticamente quando detectar.

## ✅ Implementado (Fase 1)

- Landing page (`index.html`) com CTAs apontando para `filiacao.html`
- Formulário de filiação em 3 passos (`filiacao.html`):
  1. Dados pessoais (nome, CPF, data nascimento, e-mail, telefone)
  2. Dados profissionais e endereço (CRO/UF, local de trabalho, CEP com ViaCEP, endereço completo)
  3. Forma de pagamento (Pix / cartão à vista / cartão parcelado)
- Validações cliente (CPF com dígito verificador, e-mail, telefone, CEP)
- Auto-preenchimento de endereço via API ViaCEP
- Página de confirmação pós-cadastro (`obrigado.html`) com protocolo
- Persistência local (localStorage como rascunho; sessionStorage do último envio)

## ⏳ Fase 2 — Backend e pagamento real

### Backend (Supabase)
- [ ] Criar projeto no Supabase (supabase.com — plano grátis)
- [ ] Rodar migration para criar tabelas:
  - `associados` (cadastro + status: pendente_pagamento / ativo / expirado)
  - `pagamentos` (vinculados ao associado, com asaas_id, valor, forma, parcelas, status)
- [ ] Configurar RLS (Row Level Security) para proteger dados
- [ ] Trocar persistência localStorage em `assets/js/filiacao.js` por insert no Supabase
- [ ] Configurar trigger / Edge Function para enviar e-mail de confirmação (Resend ou SMTP)

### Pagamento (PagSeguro)
- [ ] Gerar **token de API PagSeguro** no painel (Integrações → Token de Segurança)
- [ ] Definir ambiente: sandbox (testes) e produção
- [ ] Criar Edge Function `criar-cobranca` no Supabase que:
  - Recebe dados do associado
  - Cria pedido (`POST https://api.pagseguro.com/orders`) com `payment_method` Pix ou cartão
  - Retorna `qr_code` (Pix) ou `payment_url` (cartão)
- [ ] Criar Edge Function `pagseguro-webhook` que:
  - Recebe notificações de status (`POST` enviado pelo PagSeguro)
  - Valida assinatura do webhook
  - Atualiza status do associado para `ativo` quando confirmado
  - Calcula `data_expiracao = data_pagamento + 365 dias`
- [ ] Configurar URL de notificação no painel PagSeguro apontando para a Edge Function
- [ ] **Atenção às taxas:** crédito ~3,99% à vista / ~4,99%+ parcelado; Pix 0,99%. Recebimento padrão D+14 (ou ativar antecipação automática)

### Configuração no código
- [ ] Definir valor da anuidade (`VALOR_ANUIDADE` em `assets/js/filiacao.js`)
- [ ] Definir limite máximo de parcelas (`MAX_PARCELAS`) e parcelas sem juros (`PARCELAS_SEM_JUROS`)
- [ ] Adicionar variáveis de ambiente no Vercel + Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `PAGSEGURO_TOKEN` (somente no Supabase Edge Functions, NÃO no frontend)
  - `PAGSEGURO_ENV` (`sandbox` ou `production`)

## 📞 Informações com placeholders (dados reais necessários)

- [x] **Telefone / WhatsApp** — `(98) 98478-5809` ✅ aplicado em todos os pontos (card contato, FAB WhatsApp, página obrigado)
- [ ] **E-mail** — `contato@sincidema.com.br` — confirmar se o endereço existe e está ativo.
- [ ] **Endereço** — `Rua Sotero dos Reis, 111, Vila Bessa, São Luís/MA, CEP 65.015-480` — validar.
- [ ] **CNPJ** — `23.614.399/0001-04` — confirmar se é o correto.
- [ ] **Valores de piso salarial** — R$ 5.430 (MA), R$ 5.825 (São Luís), R$ 5.709 (média MA), R$ 6.121 (média SLZ) — validar/atualizar com dados da última convenção coletiva.
- [ ] **Número de CDs no Maranhão** — `5.700+` no hero e seção experiência — confirmar dado oficial.
- [ ] **Horário de funcionamento** — "8h às 17h, segunda a sexta" — confirmar.

## 🛠️ Ajustes técnicos / funcionais

- [ ] **Favicon** — Não existe `<link rel="icon">`. Adicionar favicon com a identidade do sindicato.
- [ ] **Meta tags Open Graph** — Falta `og:image`, `og:title`, `og:description`. Necessário para compartilhamento em WhatsApp/Instagram/Facebook.

## 🎨 Identidade visual

- [ ] **Logo** — Atualmente é um quadrado vermelho com a letra "S". Substituir pela logo oficial do SINCIDEMA.
- [ ] **Imagens** — Todas são fotos genéricas do Unsplash. Substituir por fotos reais do sindicato, diretoria, eventos ou sede.

## 📝 Conteúdo a considerar

- [ ] **Diretoria** — Não há seção com nomes e cargos da diretoria atual.
- [ ] **Redes sociais** — Não há links para Instagram, Facebook ou outras redes do sindicato.
