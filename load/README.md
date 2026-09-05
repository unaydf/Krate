# Pruebas de carga con k6

Guion de carga para la API pública de Krate, la única parte del sistema que recibe peticiones simultáneas (varios votantes escaneando el mismo QR). No forma parte del workflow de GitHub Actions: se ejecuta a mano contra la pila Docker local.

## Qué mide

`vote.js` ejecuta dos escenarios a la vez durante el tiempo indicado:

| Escenario | Usuarios virtuales | Qué hace |
| --- | --- | --- |
| `votantes` | `VUS` (100 por defecto) | Cada iteración simula un dispositivo nuevo: `GET /api/public/points/{code}` con su `X-Voter-Token`, elige items según el tipo de votación (uno en SINGLE, hasta `maxSelections` en LIMITED, todos ordenados en RANKING) y envía `POST /api/public/points/{code}/votes`. |
| `duplicados` | `VUS / 10` | Envía dos papeletas idénticas en paralelo con el mismo token y comprueba que exactamente una recibe 201 y la otra 409. Ejercita la restricción única de papeleta por votante bajo concurrencia real. |

Umbrales declarados en el guion (k6 termina con error si no se cumplen):

| Métrica | Umbral |
| --- | --- |
| `krate_get_point_duration` | p95 < 300 ms |
| `krate_vote_duration` | p95 < 500 ms |
| `krate_unexpected_errors` (respuestas 5xx o sin respuesta) | < 1 % |
| `krate_duplicate_accepted` (dos 201 para el mismo token) | 0 |

## Requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado (`k6 version`).
- La pila levantada con Docker desde la raíz del repositorio:

```bash
docker compose up --build -d
```

- Un punto de votación con una votación **activa**. Con `APP_SEED_ENABLED=true` en `.env` el arranque crea el gestor `gestor-test@gmail.com` / `gestor-test123` y dos puntos ya configurados; solo hay que lanzar uno desde el panel (`http://localhost:8081`) y copiar el código del enlace público (`/p/{code}`).

También se puede lanzar desde la terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gestor-test@gmail.com","password":"gestor-test123"}' | jq -r .token)

# Listar puntos y quedarse con el id y el código del primero
curl -s http://localhost:8080/api/voting-points -H "Authorization: Bearer $TOKEN" | jq '.[] | {id, name, code}'

# Lanzar la votación asignada a ese punto
curl -s -X POST http://localhost:8080/api/instances \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"votingPointId": <id>}'
```

## Ejecución

Desde la raíz del repositorio:

```bash
CODE=<código> k6 run load/vote.js
```

Variables opcionales:

| Variable | Por defecto | Significado |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:8080` | URL del backend. Para probar a través de nginx usar `http://localhost:8082`. |
| `VUS` | `100` | Usuarios virtuales del escenario `votantes`. |
| `DURATION` | `30s` | Duración de ambos escenarios. |

Ejemplo con más carga a través del proxy de la voting app:

```bash
CODE=<código> BASE_URL=http://localhost:8082 VUS=300 DURATION=1m k6 run load/vote.js
```

## Informes

Cada ejecución escribe un informe HTML autocontenido en `load/results/` con el nombre `<fecha>_<tipo>_<vus>vus_<duración>.html` (por ejemplo `2026-09-05_13-36-46_ranking_100vus_30s.html`). Lo genera `load/report.js` desde `handleSummary`, sin dependencias externas, y recoge la configuración (punto, votación, tipo, usuarios virtuales, destino), los indicadores principales, los umbrales con su valor respecto al límite, los tiempos de respuesta por endpoint con percentiles y las comprobaciones funcionales agrupadas por escenario. Se puede abrir en cualquier navegador o capturar para la memoria:

```bash
chromium --headless=new --hide-scrollbars --window-size=1040,1750 \
  --screenshot=informe.png file://$PWD/load/results/<fichero>.html
```

La carpeta de salida se cambia con `OUT_DIR`. El guion debe ejecutarse desde la raíz del repositorio, ya que la ruta por defecto es relativa. Por consola solo se imprime un resumen breve con los umbrales, las peticiones y las comprobaciones.

Alternativas descartadas: el dashboard integrado de k6 (`K6_WEB_DASHBOARD_EXPORT`), que exporta gráficas temporales genéricas en inglés sin el contexto de la votación, y la librería externa `benc-uk/k6-reporter`, que se importa desde una URL y solapa con el informe propio.

## Cómo leer la salida

- **Umbrales**: cada uno aparece con su valor y estado. Si alguno falla, k6 sale con código distinto de 0.
- **Comprobaciones funcionales**: códigos de estado, contenido de la respuesta y una sola 201 por token duplicado. Deben estar al 100 %.
- **Tiempos de respuesta**: se miden por separado para la consulta del punto y el envío de la papeleta, con mínimo, media, mediana, p90, p95, p99 y máximo.
- **Errores inesperados**: respuestas 5xx o sin respuesta. Las 409 del escenario `duplicados` son correctas y no cuentan como error.

Cada ejecución inserta tantas papeletas como iteraciones del escenario `votantes`. Para repetir con la base de datos limpia basta reiniciar el backend con el seed activado (`docker compose restart backend`), que vacía todas las tablas, y volver a lanzar la votación.
