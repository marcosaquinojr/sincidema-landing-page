import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe';

export const sql = neon(process.env.DATABASE_URL);
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const SITE_URL = process.env.SITE_URL || 'https://sincidema.com.br';
export const MAX_PARCELAS = 12;

// Categorias de filiação: valor da anuidade e meta da campanha de sindicalização
export const CATEGORIAS = {
  profissional: { valor_centavos: 24000, meta: 2000, rotulo: 'Profissional' }, // R$ 240,00
  estudante:    { valor_centavos: 10000, meta: 1000, rotulo: 'Estudante' },    // R$ 100,00
};

// Competência = ano-calendário vigente em São Paulo (exercício anual, não 12 meses corridos)
export function competenciaAtual() {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric' })
      .format(new Date())
  );
}

export function validaCPF(cpf) {
  cpf = String(cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.charAt(i - 1)) * (11 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let j = 1; j <= 10; j++) sum += parseInt(cpf.charAt(j - 1)) * (12 - j);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.charAt(10));
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
