# SINCIDEMA — Documentação do Sistema

Sistema de landing page e sindicalização online do SINCIDEMA (Sindicato dos Cirurgiões-Dentistas do Estado do Maranhão). Este documento registra a arquitetura, as decisões e a operação do sistema. Atualizado em: **07/07/2026**.

> Pendências e checklists operacionais vivem em [PENDENCIAS.md](PENDENCIAS.md). Este arquivo descreve **como o sistema é**.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Site | https://sincidema.com.br |
| Repositório | github.com/marcosaquinojr/sincidema-landing-page |
| Hospedagem | Vercel (projeto `sincidema-landing-page`, team `marcosaknos-projects`) |
| Deploy | push no branch `main` = deploy automático em produção |
| Banco | Neon Postgres (`sincidema-db`, via Vercel Marketplace) |
| Pagamentos | Stripe **em produção** (conta oficial `acct_1TqYfyDn6jxMVcX6`) |
| E-mail (envio) | Resend, remetente `contato@sincidema.com.br` |
| E-mail (recebimento) | Zoho Mail plano gratuito, caixa `contato@sincidema.com.br` |
| DNS | Gerenciado pela Vercel (nameservers `ns1/ns2.vercel-dns.com`; domínio registrado no Hostinger) |
| WhatsApp oficial | (98) 98478-5809 |

## 2. Modelo de negócio da sindicalização

- **Anuidade por exercício anual (ano-calendário)**, nunca 12 meses corridos. Quem paga em novembro/2026 está quite só até 31/12/2026; em 2027 paga de novo. O ano ("competência") é calculado no fuso `America/Sao_Paulo`.
- **Categorias e valores:**
  - Profissional (cirurgião-dentista com CRO): **R$ 240,00**
  - Estudante (graduando em Odontologia, sem CRO): **R$ 100,00**
- **Formas de pagamento:** cartão de crédito à vista ou parcelado em **até 12x sem juros para o filiado** (custo do parcelamento é do sindicato). **Pix está desabilitado no formulário com selo "Em breve"** até o Stripe liberar a capacidade na conta (invite-only no Brasil). Boleto está habilitado na conta Stripe, mas não é oferecido no site.
- **Trava anti-duplicidade:** um CPF não consegue pagar duas vezes a mesma competência (índice único no banco + checagem na API, que responde "Sua anuidade já está quitada").
- **Campanha de metas (contador regressivo na landing):** 2.000 profissionais e 1.000 estudantes por ano. Cada pagamento confirmado da competência atual decrementa o contador correspondente.

## 3. Páginas

| Rota | Arquivo | Função |
|---|---|---|
| `/` | `index.html` | Landing institucional (hero, sobre, experiência, serviços, piso, campanha de metas, filie-se, contato) |
| `/filiacao` | `filiacao.html` | Formulário de filiação em 3 passos (dados pessoais + categoria, profissional/endereço, pagamento) |
| `/obrigado` | `obrigado.html` | Pós-pagamento (retorno do Stripe Checkout) |
| `/admin` | `admin.html` | Painel administrativo (lista de filiados, busca, competências pagas) |

- **URLs limpas** (`cleanUrls: true` no `vercel.json`); os caminhos com `.html` redirecionam (308) para as rotas limpas.
- **Ano dinâmico:** os textos com o ano usam `<span class="js-ano">` preenchido via `getFullYear()`; viram sozinhos em 01/janeiro.
- **Identidade:** logo oficial (mapa do MA com serpente) em `assets/img/logo-sincidema.png` (fundo removido; original de baixa resolução em `logo-original.jpg`), favicon `assets/img/favicon.png`. Fontes: Inter (corpo) + Plus Jakarta Sans (títulos, sem serifa). Tom dos textos: acolhedor, **sem travessões**.

## 4. Formulário de filiação (`assets/js/filiacao.js`)

- Passo 1: escolha de categoria (Profissional R$ 240 / Estudante R$ 100) + nome, CPF (validação de dígito verificador), data de nascimento, e-mail, telefone.
- Passo 2: CRO + UF (**só para profissional**; o campo some para estudante), local de trabalho/faculdade, endereço completo (CEP com autopreenchimento ViaCEP).
- Passo 3: forma de pagamento, seletor de parcelas (2 a 12), resumo, envio para `/api/checkout` e redirecionamento pro Stripe Checkout.
- Rascunho salvo em `localStorage` (`sincidema_filiacao_rascunho`); ao restaurar, opções desabilitadas (ex.: Pix) não são re-marcadas.
- Máscaras de CPF/telefone/CEP reposicionam o cursor contando dígitos (correção do bug de digitação rápida, 07/07/2026).

## 5. Backend (funções Vercel em `/api`, runtime Node)

> **Atenção:** handlers usam **export nomeado por método HTTP** (`export async function POST(request)`). `export default` com assinatura Web trava no runtime da Vercel.

| Arquivo | Função |
|---|---|
| `api/_lib.js` | Conexões (Neon `sql`, Stripe), `CATEGORIAS` (valores e metas), `MAX_PARCELAS = 12`, `competenciaAtual()`, `validaCPF()`, helper `json()` |
| `api/checkout.js` | `POST` valida dados → upsert do filiado (por CPF) → recusa competência já paga (409) → insere pagamento `pendente` → cria sessão Stripe Checkout (nome do produto "Anuidade SINCIDEMA {ano} ({categoria})") → devolve URL. Parcelado envia `payment_method_options.card.installments.enabled = true` (com fallback sem parcelamento). Falha na sessão apaga o pagamento pendente. |
| `api/webhook.js` | `POST` verifica assinatura Stripe. `checkout.session.completed`/`async_payment_succeeded` → marca `pago` e dispara e-mail de confirmação (falha no e-mail não derruba o webhook); `async_payment_failed` → `falhou`; `expired` → `expirado`. |
| `api/admin.js` | `GET` protegido por Bearer token (`ADMIN_TOKEN`); lista filiados com pagamentos agregados; filtro `?q=` por nome/CPF/e-mail. |
| `api/stats.js` | `GET` público; pagos e restantes por categoria na competência atual; cache de borda 60s (`s-maxage=60`). Alimenta o contador da landing. |
| `api/_email.js` | Template e envio do e-mail de confirmação via API do Resend (fetch puro). No-op se `RESEND_API_KEY` não existir. Remetente padrão `SINCIDEMA <contato@sincidema.com.br>` (sobrescreve com env `EMAIL_FROM`). |

## 6. Banco de dados (Neon Postgres)

Schema em [`db/schema.sql`](db/schema.sql). Duas tabelas:

- **`filiados`**: nome, `cpf` (único, só dígitos), `categoria` (profissional|estudante), nascimento, e-mail, telefone, CRO/UF, local de trabalho, endereço, timestamps. Upsert por CPF a cada nova tentativa de pagamento (dados sempre atualizados).
- **`pagamentos`**: `filiado_id`, `competencia` (ano), `categoria`, `valor_centavos`, `status` (pendente|pago|falhou|expirado), `metodo` (pix|card), `parcelas`, `stripe_session_id` (único), `stripe_payment_intent`, `criado_em`, `pago_em`.
- Índice único parcial `uq_pagamento_pago (filiado_id, competencia) WHERE status='pago'` garante um pagamento efetivado por competência.

Acesso manual: `psql` com a `DATABASE_URL` do `.env.local` (obtido com `vercel env pull`; o arquivo NÃO é commitado).

## 7. Stripe (produção desde 07/07/2026)

- Conta oficial `acct_1TqYfyDn6jxMVcX6` (BR). Capacidades: `card_payments` ativo, `boleto_payments` ativo, `pix_payments` **pendente de solicitação**.
- Webhook de produção: `we_1TqdiADn6jxMVcX6GGs61y3D` → `https://sincidema.com.br/api/webhook` (eventos `checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed`, `.expired`).
- Ambiente `development` da Vercel mantém a chave de **sandbox** para testes sem cobrança.
- Custos (tabela pública, jul/2026): cartão nacional 3,99% + R$ 0,39; Pix 1,19%; boleto R$ 3,45. Parcelado tem custo adicional não publicado (ver tarifas da conta) e o repasse chega parcela a parcela.
- Estorno de um pagamento: `stripe.refunds.create({ payment_intent })` ou pelo dashboard; a taxa do Stripe não é devolvida.

## 8. E-mail

- **Envio (transacional):** Resend, domínio `sincidema.com.br` verificado (id `87ed396e-e8ce-4fe8-a065-19edd4e5308a`). Plano gratuito: 3.000/mês, 100/dia. Registros DNS: DKIM `resend._domainkey`, SPF/MX no subdomínio `send.`.
- **Recebimento:** Zoho Mail plano gratuito (até 5 usuários, 5 GB cada, acesso por webmail https://mail.zoho.com e app; sem IMAP/POP). Registros: MX `mx/mx2/mx3.zoho.com`, SPF raiz `v=spf1 include:zohomail.com ~all`, DKIM `zmail._domainkey`, verificação `zoho-verification=zb51978995`.
- Login administrativo do Resend e do Zoho: Gmail pessoal do Marcos.
- Os SPFs não conflitam: Resend usa o subdomínio `send.`, Zoho usa o domínio raiz.

## 9. Variáveis de ambiente (Vercel)

Sem valores aqui (repo público). Gerenciar em Vercel → Settings → Environment Variables, ou `vercel env`.

| Env | Uso |
|---|---|
| `DATABASE_URL` | Neon Postgres (criada pela integração) |
| `STRIPE_SECRET_KEY` | Production = chave live; Development = sandbox |
| `STRIPE_WEBHOOK_SECRET` | Assinatura do webhook (recriar se recriar o webhook) |
| `ADMIN_TOKEN` | Senha do `/admin` |
| `RESEND_API_KEY` | Envio de e-mails |
| `SITE_URL` | Base das URLs de retorno do Stripe |
| `EMAIL_FROM` | (Opcional) sobrescreve o remetente padrão |

## 10. Operação (runbooks)

- **Reativar o Pix** (quando o Stripe liberar): em `filiacao.html`, remover `disabled` do radio do Pix e a classe `pay-option--disabled`, restaurar título/descrição originais; ajustar o subtítulo do card Filie-se na landing ("Pix em breve").
- **Mudar valores/metas:** `api/_lib.js` (`CATEGORIAS`) + `assets/js/filiacao.js` (`VALORES`) + textos do formulário/landing (`data-meta` dos contadores).
- **Mudar limite de parcelas:** `api/_lib.js` (`MAX_PARCELAS`) + `assets/js/filiacao.js` (`MAX_PARCELAS`/`PARCELAS_SEM_JUROS`) + textos "até 12x".
- **Trocar senha do admin:** trocar env `ADMIN_TOKEN` na Vercel + redeploy.
- **Consultar filiados:** `/admin` no site, ou SQL direto no Neon.
- **Virada de ano:** nada a fazer; competência e textos viram sozinhos. Os contadores da campanha zeram naturalmente (contam só a competência atual).

## 11. Histórico de fases

- **Fase 1 (mai/2026):** landing + formulário 3 passos (sem pagamento real).
- **Fase 2 (jul/2026):** Stripe + Neon + admin + webhook; go-live com conta oficial em 07/07/2026; categoria Estudante; contador regressivo de metas; e-mail de confirmação (Resend); e-mail do sindicato (Zoho); logo oficial + favicon; URLs limpas; fonte sem serifa; correções (máscara CPF, CRO oculto para estudante, Pix "Em breve").

## 12. Roadmap — Fase 3: Espaço do Filiado

Próxima grande entrega: área logada para o filiado acompanhar **seus pagamentos e benefícios**.

Escopo previsto (a refinar):

- **Autenticação sem senha** (proposta): filiado informa o CPF → sistema envia um link mágico/código de 6 dígitos pro e-mail cadastrado (via Resend) → sessão criada. Evita gestão de senhas e usa a infra de e-mail já pronta.
- **Meus pagamentos:** histórico de competências (pagas, pendentes), status da anuidade vigente, botão "Pagar anuidade {ano}" reaproveitando o checkout atual.
- **Meus dados:** visualizar/atualizar cadastro (telefone, e-mail, endereço, local de trabalho).
- **Benefícios:** vitrine dos convênios/parcerias com detalhe de como usar; conteúdo gerenciável (tabela `beneficios` no banco + tela no admin).
- **Carteirinha digital** (ideia): comprovante de filiado ativo com validade 31/12 da competência paga.
- Infra: mesmas funções Vercel + Neon; novas tabelas (`sessoes` ou tokens de acesso, `beneficios`); página `/filiado`.

---

*Documento mantido junto do código; atualizar a cada mudança relevante de arquitetura ou operação.*
