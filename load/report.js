// Genera el informe HTML autocontenido de una ejecución de load/vote.js.
// Se usa desde handleSummary; no tiene dependencias externas.

const COLOR = {
	good: '#0ca30c',
	goodText: '#006300',
	goodSoft: '#e3f5e3',
	critical: '#d03b3b',
	criticalSoft: '#fbe5e5',
	accent: '#256abf',
	accentSoft: '#e4eefb',
	ink: '#0b0b0b',
	ink2: '#52514e',
	muted: '#898781',
	line: '#e6e4dd',
	plane: '#f4f3ef',
	surface: '#ffffff',
};

const CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: ${COLOR.plane}; color: ${COLOR.ink}; font: 15px/1.5 "Inter", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 960px; margin: 0 auto; padding: 0 0 40px; }

  .hero { background: ${COLOR.surface}; border: 1px solid ${COLOR.line}; border-radius: 16px; margin: 24px 24px 0; padding: 26px 28px; box-shadow: inset 0 4px 0 ${COLOR.accent}; display: flex; justify-content: space-between; align-items: center; gap: 24px; box-shadow: 0 1px 2px rgba(11,11,11,0.03); }
  .hero .eyebrow { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: ${COLOR.accent}; font-weight: 700; margin-bottom: 6px; }
  .hero h1 { font-size: 26px; margin: 0 0 6px; font-weight: 700; letter-spacing: -0.01em; }
  .hero .sub { margin: 0; color: ${COLOR.ink2}; font-size: 14px; }
  .badge { display: inline-flex; align-items: center; gap: 10px; padding: 11px 18px; border-radius: 12px; font-weight: 700; font-size: 15px; white-space: nowrap; color: #fff; }
  .badge.good { background: ${COLOR.good}; }
  .badge.critical { background: ${COLOR.critical}; }
  .badge svg { width: 20px; height: 20px; }

  .content { padding: 0 24px; }
  .page { padding-top: 0; }
  section { background: ${COLOR.surface}; border: 1px solid ${COLOR.line}; border-radius: 16px; padding: 24px 28px; margin-top: 20px; box-shadow: 0 1px 2px rgba(11,11,11,0.03); }
  h2 { font-size: 13px; letter-spacing: 0.10em; text-transform: uppercase; color: ${COLOR.muted}; margin: 0 0 16px; font-weight: 700; }

  .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .chip { display: flex; gap: 12px; align-items: flex-start; background: ${COLOR.plane}; border-radius: 12px; padding: 12px 14px; }
  .chip svg { width: 20px; height: 20px; flex: none; color: ${COLOR.accent}; margin-top: 2px; }
  .chip .k { font-size: 12px; color: ${COLOR.muted}; }
  .chip .v { font-weight: 600; overflow-wrap: anywhere; }
  .chip .v small { color: ${COLOR.muted}; font-weight: 400; white-space: nowrap; }
  .tag { display: inline-block; background: ${COLOR.accentSoft}; color: ${COLOR.accent}; border-radius: 999px; padding: 1px 10px; font-size: 13px; font-weight: 600; }

  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .kpi { border: 1px solid ${COLOR.line}; border-left: 4px solid ${COLOR.line}; border-radius: 12px; padding: 14px 16px 12px; }
  .kpi.good { border-left-color: ${COLOR.good}; }
  .kpi.critical { border-left-color: ${COLOR.critical}; }
  .kpi.info { border-left-color: ${COLOR.accent}; }
  .kpi .label { color: ${COLOR.ink2}; font-size: 13px; }
  .kpi .value { font-size: 30px; font-weight: 700; line-height: 1.1; margin-top: 6px; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .kpi .unit { font-size: 15px; font-weight: 500; color: ${COLOR.ink2}; margin-left: 4px; }
  .kpi .note { color: ${COLOR.muted}; font-size: 12px; margin-top: 6px; }

  .thr { display: grid; grid-template-columns: 1fr 140px; gap: 6px 20px; align-items: center; padding: 14px 0; border-top: 1px solid ${COLOR.line}; }
  .thr:first-of-type { border-top: 0; padding-top: 4px; }
  .thr .name { font-weight: 600; }
  .thr .name small { color: ${COLOR.muted}; font-weight: 400; margin-left: 8px; }
  .thr .meter { position: relative; height: 12px; background: ${COLOR.plane}; border-radius: 6px; margin-top: 4px; }
  .thr .meter .fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; background: ${COLOR.accent}; }
  .thr .meter .fill.nonzero { min-width: 6px; }
  .thr .meter .fill.critical { background: ${COLOR.critical}; }
  .thr .scale { display: flex; justify-content: space-between; font-size: 12px; color: ${COLOR.muted}; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .thr .result { text-align: right; grid-row: span 2; }
  .thr .result .val { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .status { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; border-radius: 999px; padding: 3px 10px 3px 8px; white-space: nowrap; }
  .status svg { width: 14px; height: 14px; }
  .status.good { color: ${COLOR.goodText}; background: ${COLOR.goodSoft}; }
  .status.critical { color: ${COLOR.critical}; background: ${COLOR.criticalSoft}; }

  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th { text-align: left; color: ${COLOR.muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; padding: 6px 8px 10px; border-bottom: 1px solid ${COLOR.line}; white-space: nowrap; }
  td { padding: 12px 8px; border-bottom: 1px solid ${COLOR.line}; vertical-align: middle; }
  tr:last-child td { border-bottom: 0; }
  td.num, th.num { text-align: right; }
  td.p95 { font-weight: 700; }
  .ep { font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace; font-size: 13px; white-space: nowrap; }
  .ep b { color: ${COLOR.accent}; font-weight: 700; margin-right: 6px; }
  td.barcell { min-width: 210px; width: 210px; padding-right: 12px; }
  th.barhead { white-space: nowrap; }
  .bar { position: relative; height: 12px; background: ${COLOR.plane}; border-radius: 6px; }
  .bar .fill { position: absolute; left: 0; top: 0; bottom: 0; background: ${COLOR.accent}; border-radius: 6px; }
  .bar .fill.nonzero { min-width: 6px; }
  .bar .limit { position: absolute; top: -4px; bottom: -4px; width: 2px; background: ${COLOR.ink2}; margin-left: -1px; }
  .barscale { display: flex; justify-content: space-between; font-size: 11px; color: ${COLOR.muted}; margin-top: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .groups { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .group { border: 1px solid ${COLOR.line}; border-radius: 12px; overflow: hidden; }
  .group header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${COLOR.plane}; }
  .group header .t { font-weight: 700; }
  .group header .t small { display: block; color: ${COLOR.muted}; font-weight: 400; font-size: 12px; }
  .group ul { list-style: none; margin: 0; padding: 4px 16px; }
  .group li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid ${COLOR.line}; font-size: 14px; }
  .group li:first-child { border-top: 0; }
  .group li .n { color: ${COLOR.ink2}; font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 13px; }
  .group li .n b { color: ${COLOR.ink}; }
  .group li .n.bad b { color: ${COLOR.critical}; }
  .group li svg { width: 16px; height: 16px; flex: none; }
  .group li .ok { color: ${COLOR.good}; }
  .group li .ko { color: ${COLOR.critical}; }

  code { font-family: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace; font-size: 13px; background: ${COLOR.plane}; padding: 2px 6px; border-radius: 5px; white-space: nowrap; }
  footer { color: ${COLOR.muted}; font-size: 12px; text-align: center; margin-top: 24px; }
`;

const I = {
	ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
	ko: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
	pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
	vote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/></svg>',
	type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
	users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
	clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
	server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ms = (v) => (v == null ? '—' : (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : String(Math.round(v))).replace('.', ','));
// El motor JS de k6 no soporta toLocaleString con configuración regional.
const int = (v) => String(Math.round(v ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pct = (v) => `${(100 * (v ?? 0)).toFixed(2).replace('.', ',')} %`;

const status = (ok, a, b) => `<span class="status ${ok ? 'good' : 'critical'}">${ok ? I.ok : I.ko}${esc(ok ? a : b)}</span>`;

// Umbrales del guion, con su texto y cómo representarlos.
const THRESHOLDS = [
	{ metric: 'krate_get_point_duration', label: 'Consulta del punto', sub: 'GET · p95', kind: 'ms' },
	{ metric: 'krate_vote_duration', label: 'Envío de la papeleta', sub: 'POST · p95', kind: 'ms' },
	{ metric: 'krate_unexpected_errors', label: 'Errores inesperados', sub: 'respuestas 5xx o sin respuesta', kind: 'rate' },
	{ metric: 'krate_duplicate_accepted', label: 'Duplicados aceptados', sub: 'tokens con dos respuestas 201', kind: 'rate' },
];

function parseLimit(expr) {
	const m = /^(p\(95\)|rate)(==|<)(.+)$/.exec(expr);
	return m ? { op: m[2], n: Number(m[3]) } : null;
}

function thresholdModel(metrics) {
	const out = [];
	for (const t of THRESHOLDS) {
		const m = metrics[t.metric];
		if (!m || !m.thresholds) continue;
		for (const [expr, res] of Object.entries(m.thresholds)) {
			const lim = parseLimit(expr);
			if (!lim) continue;
			const v = m.values;
			if (t.kind === 'ms') {
				out.push({ ...t, ok: res.ok, value: v['p(95)'], display: `${ms(v['p(95)'])} ms`, limitText: `p95 < ${lim.n} ms`, ratio: v['p(95)'] / lim.n, scaleText: [`0 ms`, `umbral ${lim.n} ms`] });
			}
			else {
				const total = (v.passes || 0) + (v.fails || 0);
				const count = v.passes || 0;
				const limitText = lim.op === '==' ? 'ninguno' : `< ${(100 * lim.n).toString().replace('.', ',')} %`;
				out.push({ ...t, ok: res.ok, value: v.rate, display: lim.op === '==' ? `${int(count)} de ${int(total)}` : pct(v.rate), limitText, ratio: lim.op === '==' ? (count > 0 ? 1 : 0) : v.rate / lim.n, scaleText: ['0', lim.op === '==' ? `${int(total)} comprobados` : `umbral ${limitText.slice(2)}`] });
			}
		}
	}
	return out;
}

function thresholdRows(list) {
	return list.map((t) => {
		const width = Math.min(100, 100 * t.ratio);
		return `<div class="thr">
			<div>
				<div class="name">${esc(t.label)}<small>${esc(t.sub)} · umbral ${esc(t.limitText)}</small></div>
				<div class="meter"><div class="fill ${t.ok ? '' : 'critical'}${t.ratio > 0 ? ' nonzero' : ''}" style="width:${width.toFixed(1)}%"></div></div>
				<div class="scale"><span>${esc(t.scaleText[0])}</span><span>${esc(t.scaleText[1])}</span></div>
			</div>
			<div class="result"><div class="val">${esc(t.display)}</div>${status(t.ok, 'Superado', 'Incumplido')}</div>
		</div>`;
	}).join('');
}

function limitFor(metrics, name) {
	const t = metrics[name] && metrics[name].thresholds;
	if (!t) return null;
	const expr = Object.keys(t).find((e) => e.startsWith('p(95)<'));
	return expr ? Number(expr.slice('p(95)<'.length)) : null;
}

function latencyRows(metrics) {
	const stats = ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'];
	const rows = [
		{ verb: 'GET', path: '/api/public/points/{code}', m: metrics.krate_get_point_duration, limit: limitFor(metrics, 'krate_get_point_duration') },
		{ verb: 'POST', path: '/api/public/points/{code}/votes', m: metrics.krate_vote_duration, limit: limitFor(metrics, 'krate_vote_duration') },
	];
	return rows.filter((r) => r.m).map((r) => {
		const p95 = r.m.values['p(95)'];
		let bar = '';
		if (r.limit != null) {
			const scale = Math.max(r.limit * 1.12, p95 * 1.05);
			bar = `<div class="bar"><div class="fill${p95 > 0 ? ' nonzero' : ''}" style="width:${(100 * p95 / scale).toFixed(1)}%"></div><div class="limit" style="left:${(100 * r.limit / scale).toFixed(1)}%"></div></div><div class="barscale"><span>0 ms</span><span>umbral ${r.limit} ms</span></div>`;
		}
		return `<tr><td><span class="ep"><b>${r.verb}</b>${esc(r.path)}</span></td>${stats.map((s) => `<td class="num${s === 'p(95)' ? ' p95' : ''}">${ms(r.m.values[s])}</td>`).join('')}<td class="barcell">${bar}</td></tr>`;
	}).join('');
}

// Comprobaciones agrupadas por escenario.
const GROUPS = [
	{ title: 'Flujo de voto', sub: 'consulta del punto y envío de una papeleta por dispositivo', match: (n) => !n.startsWith('duplicado') },
	{ title: 'Papeletas duplicadas', sub: 'dos envíos simultáneos con el mismo token', match: (n) => n.startsWith('duplicado') },
];

const CHECK_LABELS = {
	'GET point 200': 'La consulta responde 200',
	'GET point ACTIVE': 'El punto está activo',
	'GET point alreadyVoted=false': 'El dispositivo aún no ha votado',
	'POST vote 201': 'La papeleta se registra (201)',
	'POST vote devuelve los itemIds enviados': 'La respuesta devuelve los items enviados',
	'POST vote devuelve instanceId': 'La respuesta incluye la instancia',
	'duplicado: exactamente una 201': 'Exactamente una papeleta aceptada (201)',
	'duplicado: exactamente una 409': 'Exactamente una rechazada (409)',
};

function checkGroups(root) {
	const checks = (root && root.checks) || [];
	return GROUPS.map((g) => {
		const list = checks.filter((c) => g.match(c.name));
		const passes = list.reduce((a, c) => a + c.passes, 0);
		const fails = list.reduce((a, c) => a + c.fails, 0);
		const items = list.map((c) => {
			const ok = c.fails === 0;
			return `<li><span>${ok ? `<span class="ok">${I.ok}</span>` : `<span class="ko">${I.ko}</span>`}</span><span style="flex:1">${esc(CHECK_LABELS[c.name] || c.name)}</span><span class="n ${ok ? '' : 'bad'}"><b>${int(c.passes)}</b>${c.fails ? ` · ${int(c.fails)} fallos` : ''}</span></li>`;
		}).join('');
		return `<div class="group">
			<header><div class="t">${esc(g.title)}<small>${esc(g.sub)}</small></div>${status(fails === 0, `${int(passes)} correctas`, `${int(fails)} fallidas`)}</header>
			<ul>${items}</ul>
		</div>`;
	}).join('');
}

const checkPasses = (root, name) => (((root && root.checks) || []).find((c) => c.name === name) || { passes: 0 }).passes;

/**
 * @param data   objeto que k6 pasa a handleSummary
 * @param meta   { code, baseUrl, vus, dupVus, duration, pointName, votingName, votingType, items, date, command }
 */
export function buildReport(data, meta) {
	const m = data.metrics;
	const thr = thresholdModel(m);
	const allOk = thr.every((t) => t.ok);
	const okFor = (metric) => { const t = thr.find((x) => x.metric === metric); return t ? (t.ok ? 'good' : 'critical') : 'info'; };
	const reqs = m.http_reqs ? m.http_reqs.values : { count: 0, rate: 0 };
	const ballots = checkPasses(data.root_group, 'POST vote 201') + checkPasses(data.root_group, 'duplicado: exactamente una 201');
	const dup = m.krate_duplicate_accepted ? m.krate_duplicate_accepted.values : { passes: 0, fails: 0 };
	const dupTotal = (dup.passes || 0) + (dup.fails || 0);
	const durationS = (data.state.testRunDurationMs / 1000).toFixed(1).replace('.', ',');
	const typeLabel = { SINGLE: 'Voto único', LIMITED: 'Votos limitados', RANKING: 'Ranking' }[meta.votingType] || meta.votingType || '—';

	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Krate · Prueba de carga · ${esc(meta.votingType || '')} · ${esc(meta.date)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">

<div class="hero">
	<div>
		<div class="eyebrow">Krate · API pública</div>
		<h1>Prueba de carga</h1>
		<p class="sub">${esc(meta.date)} · k6 · <code>load/vote.js</code></p>
	</div>
	<span class="badge ${allOk ? 'good' : 'critical'}">${allOk ? I.ok : I.ko}${allOk ? 'Umbrales superados' : 'Umbrales incumplidos'}</span>
</div>

<div class="content">

<section>
	<h2>Configuración</h2>
	<div class="chips">
		<div class="chip">${I.pin}<div><div class="k">Punto de votación</div><div class="v">${esc(meta.pointName || '—')} <small>${esc(meta.code)}</small></div></div></div>
		<div class="chip">${I.vote}<div><div class="k">Votación</div><div class="v">${esc(meta.votingName || '—')}</div></div></div>
		<div class="chip">${I.type}<div><div class="k">Tipo</div><div class="v"><span class="tag">${esc(typeLabel)}</span> <small>${meta.items ? `${meta.items} items` : ''}</small></div></div></div>
		<div class="chip">${I.users}<div><div class="k">Usuarios virtuales</div><div class="v">${meta.vus} votantes <small>+ ${meta.dupVus} duplicados</small></div></div></div>
		<div class="chip">${I.clock}<div><div class="k">Duración</div><div class="v">${esc(meta.duration)} <small>real ${durationS} s</small></div></div></div>
		<div class="chip">${I.server}<div><div class="k">Destino</div><div class="v">${esc(meta.baseUrl)}</div></div></div>
	</div>
</section>

<section>
	<h2>Resultados</h2>
	<div class="kpis">
		<div class="kpi info"><div class="label">Peticiones HTTP</div><div class="value">${int(reqs.count)}</div><div class="note">${int(reqs.rate)} por segundo</div></div>
		<div class="kpi info"><div class="label">Papeletas registradas</div><div class="value">${int(ballots)}</div><div class="note">respuestas 201 al enviar el voto</div></div>
		<div class="kpi ${okFor('krate_duplicate_accepted')}"><div class="label">Duplicados aceptados</div><div class="value">${int(dup.passes)}<span class="unit">de ${int(dupTotal)}</span></div><div class="note">pares de envíos con el mismo token</div></div>
		<div class="kpi ${okFor('krate_get_point_duration')}"><div class="label">Consulta del punto · p95</div><div class="value">${ms(m.krate_get_point_duration && m.krate_get_point_duration.values['p(95)'])}<span class="unit">ms</span></div><div class="note">GET /api/public/points/{code}</div></div>
		<div class="kpi ${okFor('krate_vote_duration')}"><div class="label">Envío de la papeleta · p95</div><div class="value">${ms(m.krate_vote_duration && m.krate_vote_duration.values['p(95)'])}<span class="unit">ms</span></div><div class="note">POST /api/public/points/{code}/votes</div></div>
		<div class="kpi ${okFor('krate_unexpected_errors')}"><div class="label">Errores inesperados</div><div class="value">${m.krate_unexpected_errors ? pct(m.krate_unexpected_errors.values.rate) : '—'}</div><div class="note">respuestas 5xx o sin respuesta</div></div>
	</div>
</section>

<section>
	<h2>Umbrales</h2>
	${thresholdRows(thr)}
</section>

<section>
	<h2>Tiempos de respuesta (ms)</h2>
	<table>
		<thead><tr><th>Endpoint</th><th class="num">mín</th><th class="num">media</th><th class="num">mediana</th><th class="num">p90</th><th class="num">p95</th><th class="num">p99</th><th class="num">máx</th><th class="barhead">p95 frente al umbral</th></tr></thead>
		<tbody>${latencyRows(m)}</tbody>
	</table>
</section>

<section>
	<h2>Comprobaciones funcionales</h2>
	<div class="groups">${checkGroups(data.root_group)}</div>
</section>

<footer>Generado por <code>${esc(meta.command)}</code></footer>
</div>
</div>
</body>
</html>
`;
}

// Resumen en texto para la consola, ya que al definir handleSummary k6 no imprime el suyo.
export function textReport(data, meta, file) {
	const m = data.metrics;
	const lines = [''];
	lines.push(`  Krate · prueba de carga · ${meta.votingType || '?'} · ${meta.vus} VUs · ${meta.duration}`);
	lines.push('');
	for (const t of thresholdModel(m)) {
		lines.push(`  ${t.ok ? '✓' : '✗'} ${`${t.label} (${t.sub})`.padEnd(48)} ${t.display.padStart(16)}   umbral ${t.limitText}`);
	}
	lines.push('');
	const reqs = m.http_reqs ? m.http_reqs.values : { count: 0, rate: 0 };
	lines.push(`  peticiones: ${int(reqs.count)} (${int(reqs.rate)}/s)`);
	const checks = (data.root_group && data.root_group.checks) || [];
	const passes = checks.reduce((a, c) => a + c.passes, 0);
	const fails = checks.reduce((a, c) => a + c.fails, 0);
	lines.push(`  checks: ${int(passes)} correctas, ${int(fails)} fallidas`);
	lines.push('');
	lines.push(`  informe: ${file}`);
	lines.push('');
	return lines.join('\n');
}
