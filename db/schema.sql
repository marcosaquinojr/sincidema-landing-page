-- Schema SINCIDEMA — filiados e pagamentos de anuidade por competência (ano-calendário)

CREATE TABLE IF NOT EXISTS filiados (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  cpf           TEXT NOT NULL UNIQUE,          -- somente dígitos
  data_nascimento DATE,
  email         TEXT NOT NULL,
  telefone      TEXT,
  cro           TEXT,
  cro_uf        TEXT,
  local_trabalho TEXT,
  cep           TEXT,
  logradouro    TEXT,
  numero        TEXT,
  complemento   TEXT,
  bairro        TEXT,
  cidade        TEXT,
  uf            TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id                 SERIAL PRIMARY KEY,
  filiado_id         INTEGER NOT NULL REFERENCES filiados(id),
  competencia        INTEGER NOT NULL,          -- ano-calendário que o pagamento quita (ex.: 2026)
  valor_centavos     INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pendente',  -- pendente | pago | falhou | expirado
  metodo             TEXT,                      -- pix | card (preenchido pelo webhook)
  parcelas           INTEGER,                   -- nº de parcelas quando cartão
  stripe_session_id  TEXT UNIQUE,
  stripe_payment_intent TEXT,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  pago_em            TIMESTAMPTZ
);

-- Uma competência só pode ter um pagamento efetivado por filiado
CREATE UNIQUE INDEX IF NOT EXISTS uq_pagamento_pago
  ON pagamentos (filiado_id, competencia) WHERE status = 'pago';

CREATE INDEX IF NOT EXISTS idx_pagamentos_filiado ON pagamentos (filiado_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_competencia ON pagamentos (competencia);
