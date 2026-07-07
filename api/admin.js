import { sql, json } from './_lib.js';

// Lista filiados + pagamentos por competência. Protegido por token (env ADMIN_TOKEN).
export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return json({ error: 'Não autorizado' }, 401);
  }

  const q = new URL(request.url).searchParams.get('q');
  const filtro = q ? `%${q}%` : null;

  const rows = await sql`
    SELECT f.id, f.nome, f.cpf, f.categoria, f.email, f.telefone, f.cro, f.cro_uf,
           f.cidade, f.uf, f.criado_em,
           COALESCE(json_agg(json_build_object(
             'competencia', p.competencia,
             'status', p.status,
             'valor_centavos', p.valor_centavos,
             'metodo', p.metodo,
             'parcelas', p.parcelas,
             'pago_em', p.pago_em,
             'criado_em', p.criado_em
           ) ORDER BY p.competencia DESC, p.criado_em DESC)
             FILTER (WHERE p.id IS NOT NULL), '[]') AS pagamentos
    FROM filiados f
    LEFT JOIN pagamentos p ON p.filiado_id = f.id
    WHERE ${filtro}::text IS NULL
       OR f.nome ILIKE ${filtro}
       OR f.cpf LIKE ${filtro}
       OR f.email ILIKE ${filtro}
    GROUP BY f.id
    ORDER BY f.nome`;

  return json({ filiados: rows, total: rows.length });
}
