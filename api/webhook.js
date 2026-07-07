import { sql, stripe, json } from './_lib.js';

// Webhook Stripe — confirma/atualiza o status do pagamento da anuidade.
// Eventos: checkout.session.completed | .async_payment_succeeded | .async_payment_failed | .expired
export async function POST(request) {

  const raw = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return json({ error: 'Assinatura inválida: ' + err.message }, 400);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
      if (session.payment_status === 'paid') await marcarPago(session);
      break;
    case 'checkout.session.async_payment_succeeded':
      await marcarPago(session);
      break;
    case 'checkout.session.async_payment_failed':
      await atualizar(session.id, 'falhou');
      break;
    case 'checkout.session.expired':
      await atualizar(session.id, 'expirado');
      break;
  }

  return json({ received: true });
}

async function marcarPago(session) {
  await sql`
    UPDATE pagamentos SET
      status = 'pago',
      pago_em = now(),
      stripe_payment_intent = ${typeof session.payment_intent === 'string' ? session.payment_intent : null}
    WHERE stripe_session_id = ${session.id} AND status <> 'pago'`;
}

async function atualizar(sessionId, status) {
  await sql`
    UPDATE pagamentos SET status = ${status}
    WHERE stripe_session_id = ${sessionId} AND status <> 'pago'`;
}
