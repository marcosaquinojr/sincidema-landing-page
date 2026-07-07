import {
  sql, stripe, json, validaCPF, competenciaAtual,
  SITE_URL, VALOR_ANUIDADE_CENTAVOS, MAX_PARCELAS,
} from './_lib.js';

const FORMAS = ['pix', 'credito_avista', 'credito_parcelado'];

export async function POST(request) {

  let d;
  try { d = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  const cpf = String(d.cpf || '').replace(/\D/g, '');
  const nome = String(d.nome || '').trim();
  const email = String(d.email || '').trim().toLowerCase();
  const forma = d.forma_pagamento;

  if (!nome || nome.length < 5) return json({ error: 'Nome inválido' }, 400);
  if (!validaCPF(cpf)) return json({ error: 'CPF inválido' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'E-mail inválido' }, 400);
  if (!FORMAS.includes(forma)) return json({ error: 'Forma de pagamento inválida' }, 400);

  let parcelas = 1;
  if (forma === 'credito_parcelado') {
    parcelas = parseInt(d.parcelas, 10);
    if (!parcelas || parcelas < 2 || parcelas > MAX_PARCELAS) {
      return json({ error: `Parcelas deve ser entre 2 e ${MAX_PARCELAS}` }, 400);
    }
  }

  const competencia = competenciaAtual();

  const [filiado] = await sql`
    INSERT INTO filiados (nome, cpf, data_nascimento, email, telefone, cro, cro_uf,
                          local_trabalho, cep, logradouro, numero, complemento, bairro, cidade, uf)
    VALUES (${nome}, ${cpf}, ${d.data_nascimento || null}, ${email}, ${d.telefone || null},
            ${d.cro || null}, ${d.cro_uf || null}, ${d.local_trabalho || null},
            ${d.cep || null}, ${d.rua || null}, ${d.numero || null}, ${d.complemento || null},
            ${d.bairro || null}, ${d.cidade || null}, ${d.uf || null})
    ON CONFLICT (cpf) DO UPDATE SET
      nome = EXCLUDED.nome, data_nascimento = EXCLUDED.data_nascimento,
      email = EXCLUDED.email, telefone = EXCLUDED.telefone,
      cro = EXCLUDED.cro, cro_uf = EXCLUDED.cro_uf, local_trabalho = EXCLUDED.local_trabalho,
      cep = EXCLUDED.cep, logradouro = EXCLUDED.logradouro, numero = EXCLUDED.numero,
      complemento = EXCLUDED.complemento, bairro = EXCLUDED.bairro,
      cidade = EXCLUDED.cidade, uf = EXCLUDED.uf, atualizado_em = now()
    RETURNING id`;

  const [jaPago] = await sql`
    SELECT id FROM pagamentos
    WHERE filiado_id = ${filiado.id} AND competencia = ${competencia} AND status = 'pago'`;
  if (jaPago) {
    return json({ error: `Sua anuidade ${competencia} já está quitada. Nos vemos no próximo exercício!` }, 409);
  }

  const [pagamento] = await sql`
    INSERT INTO pagamentos (filiado_id, competencia, valor_centavos, parcelas, metodo)
    VALUES (${filiado.id}, ${competencia}, ${VALOR_ANUIDADE_CENTAVOS}, ${parcelas},
            ${forma === 'pix' ? 'pix' : 'card'})
    RETURNING id`;

  const metadata = {
    pagamento_id: String(pagamento.id),
    filiado_id: String(filiado.id),
    cpf,
    competencia: String(competencia),
    forma_pagamento: forma,
    parcelas: String(parcelas),
  };

  const params = {
    mode: 'payment',
    locale: 'pt-BR',
    customer_email: email,
    payment_method_types: forma === 'pix' ? ['pix'] : ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'brl',
        unit_amount: VALOR_ANUIDADE_CENTAVOS,
        product_data: {
          name: `Anuidade SINCIDEMA ${competencia}`,
          description: `Sindicalização exercício ${competencia} (válida até 31/12/${competencia})`,
        },
      },
    }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${SITE_URL}/obrigado.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/filiacao.html`,
  };
  if (forma === 'credito_parcelado') {
    params.payment_method_options = { card: { installments: { enabled: true } } };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (err) {
    // Parcelamento pode não estar habilitado na conta; tenta sem, cliente paga à vista
    if (forma === 'credito_parcelado' && params.payment_method_options) {
      delete params.payment_method_options;
      try {
        session = await stripe.checkout.sessions.create(params);
      } catch (err2) {
        await sql`DELETE FROM pagamentos WHERE id = ${pagamento.id}`;
        return json({ error: 'Falha ao iniciar pagamento: ' + err2.message }, 502);
      }
    } else {
      await sql`DELETE FROM pagamentos WHERE id = ${pagamento.id}`;
      return json({ error: 'Falha ao iniciar pagamento: ' + err.message }, 502);
    }
  }

  await sql`UPDATE pagamentos SET stripe_session_id = ${session.id} WHERE id = ${pagamento.id}`;

  return json({ url: session.url, competencia });
}
