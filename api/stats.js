import { sql, json, competenciaAtual, CATEGORIAS } from './_lib.js';

// Público — alimenta o contador regressivo da campanha de sindicalização.
// Conta pagamentos efetivados da competência atual, separados por categoria.
export async function GET() {
  const competencia = competenciaAtual();

  const rows = await sql`
    SELECT categoria, COUNT(*)::int AS pagos
    FROM pagamentos
    WHERE competencia = ${competencia} AND status = 'pago'
    GROUP BY categoria`;

  const pagosPor = Object.fromEntries(rows.map(r => [r.categoria, r.pagos]));

  const data = { competencia };
  for (const [cat, cfg] of Object.entries(CATEGORIAS)) {
    const pagos = pagosPor[cat] || 0;
    data[cat] = {
      meta: cfg.meta,
      pagos,
      restantes: Math.max(cfg.meta - pagos, 0),
    };
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Cache na borda da Vercel: contador pode atrasar até 1 min, sem custo de banco por visita
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
