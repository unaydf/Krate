// Prueba de carga de la API pública de Krate con k6.
//
// Simula votantes que escanean el mismo QR: cada usuario virtual consulta el
// punto de votación y envía una papeleta con un token de dispositivo propio.
// Un segundo escenario envía dos papeletas idénticas en paralelo para
// comprobar que la restricción única de papeleta por votante aguanta bajo
// concurrencia real (exactamente una 201 y una 409).
//
// Uso (desde la raíz del repositorio):
//   CODE=<código del punto> k6 run load/vote.js
// Variables opcionales: BASE_URL (http://localhost:8080), VUS (100), DURATION (30s),
// OUT_DIR (load/results). Al terminar escribe un informe HTML en OUT_DIR.
// Requiere una votación activa en ese punto. Ver load/README.md.

import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { buildReport, textReport } from './report.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CODE = __ENV.CODE;
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '30s';
const DUP_VUS = Math.max(1, Math.floor(VUS / 10));
const OUT_DIR = __ENV.OUT_DIR || 'load/results';

if (!CODE) {
	fail('Falta la variable CODE con el código del punto de votación (p. ej. CODE=abc123 k6 run load/vote.js)');
}

const POINT_URL = `${BASE_URL}/api/public/points/${CODE}`;
const VOTES_URL = `${POINT_URL}/votes`;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Métricas propias, separadas por endpoint para poder poner umbrales distintos.
const getPointDuration = new Trend('krate_get_point_duration', true);
const voteDuration = new Trend('krate_vote_duration', true);
const unexpectedErrors = new Rate('krate_unexpected_errors');
const duplicateAccepted = new Rate('krate_duplicate_accepted');

export const options = {
	scenarios: {
		votantes: {
			executor: 'constant-vus',
			exec: 'votante',
			vus: VUS,
			duration: DURATION,
		},
		duplicados: {
			executor: 'constant-vus',
			exec: 'duplicado',
			vus: DUP_VUS,
			duration: DURATION,
		},
	},
	thresholds: {
		krate_get_point_duration: ['p(95)<300'],
		krate_vote_duration: ['p(95)<500'],
		krate_unexpected_errors: ['rate<0.01'],
		krate_duplicate_accepted: ['rate==0'],
	},
	summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// Comprueba una sola vez que el punto existe y tiene votación activa antes de cargar.
export function setup() {
	const res = http.get(POINT_URL);
	if (res.status !== 200) {
		fail(`GET ${POINT_URL} devolvió ${res.status}: ${res.body}`);
	}
	const point = res.json();
	if (point.status !== 'ACTIVE' || !point.voting) {
		fail(`El punto "${point.pointName}" no tiene ninguna votación activa. Lánzala desde el panel.`);
	}
	console.log(`Punto "${point.pointName}", votación "${point.voting.name}" (${point.voting.type}), ${point.voting.items.length} items`);
	return { voting: point.voting };
}

function newToken() {
	// Token distinto por papeleta, como haría cada dispositivo real.
	return `k6-${__VU}-${__ITER}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shuffle(list) {
	const a = list.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// Elige items según el tipo de votación, igual que haría la voting app.
function pickItems(voting) {
	const ids = shuffle(voting.items.map((it) => it.id));
	switch (voting.type) {
		case 'SINGLE':
			return ids.slice(0, 1);
		case 'LIMITED': {
			const max = Math.min(voting.maxSelections || 1, ids.length);
			return ids.slice(0, 1 + Math.floor(Math.random() * max));
		}
		case 'RANKING':
			return ids;
		default:
			fail(`Tipo de votación desconocido: ${voting.type}`);
	}
}

function isUnexpected(res) {
	return res.status === 0 || res.status >= 500;
}

// Escenario principal: consultar el punto y votar una vez.
export function votante(data) {
	const token = newToken();

	const get = http.get(POINT_URL, { headers: { 'X-Voter-Token': token }, tags: { name: 'GET point' } });
	getPointDuration.add(get.timings.duration);
	unexpectedErrors.add(isUnexpected(get));
	check(get, {
		'GET point 200': (r) => r.status === 200,
		'GET point ACTIVE': (r) => r.status === 200 && r.json('status') === 'ACTIVE',
		'GET point alreadyVoted=false': (r) => r.status === 200 && r.json('alreadyVoted') === false,
	});

	const itemIds = pickItems(data.voting);
	const post = http.post(VOTES_URL, JSON.stringify({ itemIds, voterToken: token }), {
		headers: JSON_HEADERS,
		tags: { name: 'POST vote' },
	});
	voteDuration.add(post.timings.duration);
	unexpectedErrors.add(isUnexpected(post));
	check(post, {
		'POST vote 201': (r) => r.status === 201,
		'POST vote devuelve los itemIds enviados': (r) =>
			r.status === 201 && JSON.stringify(r.json('itemIds')) === JSON.stringify(itemIds),
		'POST vote devuelve instanceId': (r) => r.status === 201 && r.json('instanceId') != null,
	});
}

// Escenario de duplicados: dos papeletas iguales a la vez con el mismo token.
export function duplicado(data) {
	const token = newToken();
	const body = JSON.stringify({ itemIds: pickItems(data.voting), voterToken: token });
	const req = { method: 'POST', url: VOTES_URL, body, params: { headers: JSON_HEADERS, tags: { name: 'POST vote (dup)' } } };

	const [a, b] = http.batch([req, req]);
	for (const r of [a, b]) {
		voteDuration.add(r.timings.duration);
		unexpectedErrors.add(isUnexpected(r));
	}
	const created = [a, b].filter((r) => r.status === 201).length;
	const conflicts = [a, b].filter((r) => r.status === 409).length;
	duplicateAccepted.add(created > 1);
	check({ created, conflicts }, {
		'duplicado: exactamente una 201': (x) => x.created === 1,
		'duplicado: exactamente una 409': (x) => x.conflicts === 1,
	});
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dos = (n) => String(n).padStart(2, '0');

function formatDate(d) {
	return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// Al terminar: informe HTML en OUT_DIR y resumen breve por consola.
// Los datos del setup no llegan aquí, así que se vuelve a consultar el punto.
export function handleSummary(data) {
	let point = {};
	try {
		const res = http.get(POINT_URL);
		if (res.status === 200) point = res.json();
	}
	catch (e) {
		console.warn(`No se pudo consultar el punto para el informe: ${e}`);
	}
	const voting = point.voting || {};
	const now = new Date();
	const stamp = `${now.getFullYear()}-${dos(now.getMonth() + 1)}-${dos(now.getDate())}_${dos(now.getHours())}-${dos(now.getMinutes())}-${dos(now.getSeconds())}`;
	const file = `${OUT_DIR}/${stamp}_${(voting.type || 'desconocido').toLowerCase()}_${VUS}vus_${DURATION}.html`;
	const meta = {
		code: CODE,
		baseUrl: BASE_URL,
		vus: VUS,
		dupVus: DUP_VUS,
		duration: DURATION,
		pointName: point.pointName,
		votingName: voting.name,
		votingType: voting.type,
		items: voting.items ? voting.items.length : 0,
		date: formatDate(now),
		command: `CODE=${CODE}${__ENV.BASE_URL ? ` BASE_URL=${BASE_URL}` : ''}${__ENV.VUS ? ` VUS=${VUS}` : ''}${__ENV.DURATION ? ` DURATION=${DURATION}` : ''} k6 run load/vote.js`,
	};
	return {
		[file]: buildReport(data, meta),
		stdout: textReport(data, meta, file),
	};
}
