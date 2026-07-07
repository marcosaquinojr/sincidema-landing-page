import { CATEGORIAS } from './_lib.js';

// E-mail transacional via Resend (https://resend.com — plano gratuito: 3.000/mês, 100/dia).
// Sem RESEND_API_KEY configurada, vira no-op: o pagamento segue confirmado normalmente.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'SINCIDEMA <contato@sincidema.com.br>';

function formatBRL(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function enviarConfirmacaoPagamento({ nome, email, competencia, categoria, valor_centavos, metodo, parcelas }) {
  if (!RESEND_API_KEY || !email) return { skipped: true };

  const rotulo = (CATEGORIAS[categoria] || CATEGORIAS.profissional).rotulo;
  const valor = formatBRL(valor_centavos);
  const pagamento = metodo === 'pix'
    ? `Pix (${valor})`
    : (parcelas > 1 ? `Cartão de crédito em ${parcelas}x (total ${valor})` : `Cartão de crédito (${valor})`);
  const primeiroNome = String(nome || '').trim().split(/\s+/)[0] || 'colega';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
    <div style="background:#0F0F0F;padding:20px 28px;border-radius:12px 12px 0 0;">
      <span style="display:inline-block;background:#DC2626;color:#fff;font-weight:bold;border-radius:8px;padding:6px 10px;font-size:14px;">S</span>
      <span style="color:#fff;font-size:18px;font-weight:bold;margin-left:10px;">SINCIDEMA</span>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
      <h1 style="font-size:20px;margin:0 0 12px;">Pagamento confirmado 🎉</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${primeiroNome}</strong>! Recebemos o pagamento da sua anuidade e sua
        filiação ao SINCIDEMA está <strong>ativa</strong>.
      </p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:18px;">
        <tr><td style="padding:8px 0;color:#6B7280;">Anuidade</td><td style="padding:8px 0;text-align:right;font-weight:bold;">${competencia} · ${rotulo}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;border-top:1px solid #F3F4F6;">Validade</td><td style="padding:8px 0;text-align:right;border-top:1px solid #F3F4F6;">até 31/12/${competencia}</td></tr>
        <tr><td style="padding:8px 0;color:#6B7280;border-top:1px solid #F3F4F6;">Pagamento</td><td style="padding:8px 0;text-align:right;border-top:1px solid #F3F4F6;">${pagamento}</td></tr>
      </table>
      <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 6px;">
        Lembrete: a sindicalização vale por exercício anual (ano-calendário). Para continuar
        filiado em ${competencia + 1}, basta renovar a anuidade no próximo ano.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#374151;margin:18px 0 0;">
        Dúvidas? Fale com a gente pelo WhatsApp <strong>(98) 98478-5809</strong>.
      </p>
    </div>
    <p style="font-size:12px;color:#9CA3AF;text-align:center;margin-top:14px;">
      SINCIDEMA · Sindicato dos Cirurgiões-Dentistas do Estado do Maranhão · sincidema.com.br
    </p>
  </div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: `Filiação SINCIDEMA ${competencia} confirmada ✔`,
      html,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Resend ${resp.status}: ${body}`);
  }
  return resp.json();
}
