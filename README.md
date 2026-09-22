# Krate · Plataforma de votaciones

Aplicación web modular para crear, lanzar y gestionar votaciones en puntos de votación físicos.

| Módulo | Tecnología | Descripción |
| --- | --- | --- |
| `Krate/` | Java 21 · Spring Boot 4.1 · PostgreSQL · Flyway | API REST (gestión + pública), autenticación JWT, imágenes |
| `management-app/` | Angular 22 | Panel de gestión: cuenta, dashboard, votaciones, items, puntos, estadísticas |
| `voting-app/` | Angular 22 | Interfaz pública de voto, pensada para móvil, sin registro |
| `load/` | k6 | Prueba de carga de la API pública, ejecución manual |

## Conceptos

- **Item**: opción votable (nombre, descripción breve, imagen opcional).
- **Votación**: nombre, descripción y lista ordenada de items.
- **Punto de votación**: lugar físico con un **enlace público fijo** (`/p/{código}`) y una votación asignada.
- **Instancia**: un lanzamiento de la votación asignada en un punto. Solo puede haber una instancia activa por punto. Al detenerla, el enlace muestra "Votación desactivada".
- **Papeleta** (en la interfaz se muestra como "participación"): la participación de un dispositivo (identificado con un token anónimo en el navegador) en una instancia. Solo se admite una papeleta por dispositivo e instancia. Lo que contiene depende del tipo de votación.

Tipos de votación (patrón Strategy en el backend, `voting/strategy`):

| Tipo | Papeleta | Resultados |
| --- | --- | --- |
| **Voto único** (`SINGLE`) | Exactamente una opción. | Recuento de papeletas por item y % sobre el total. |
| **Votos limitados** (`LIMITED`) | Entre 1 y N opciones distintas; N lo fija el gestor (mínimo 2, máximo el número de items). | Papeletas que incluyen cada item y % sobre el total. |
| **Ranking** (`RANKING`) | Las opciones que quiera, en orden de preferencia (mínimo 1). | Puntos Borda: con M items, la posición p vale M − p + 1. Se muestran también la posición media y los primeros puestos. |

Reglas de negocio:

- Cada gestor solo ve y administra sus propios datos.
- Mientras una votación está activa no se pueden borrar ni ella, ni sus items, ni el punto, ni cambiar la lista de items, el tipo de votación, el máximo de votos o la votación asignada al punto. Nombre y descripción sí.
- El borrado es **lógico**: lo borrado desaparece de los listados y deja de poder usarse, pero las estadísticas históricas se conservan (los items borrados se marcan como tales).
- Las estadísticas se consultan a tres niveles: por lanzamiento, agregadas por votación (con filtro por punto de votación) y como historial de un item a lo largo de todas las votaciones en las que ha participado.

## Arranque con Docker (local)

```bash
cp .env.example .env
# Edita .env: como mínimo APP_JWT_SECRET (p. ej. openssl rand -base64 48) y POSTGRES_PASSWORD
docker compose up --build -d
```

| Servicio | URL |
| --- | --- |
| Panel de gestión | http://localhost:8081 |
| Voting app | http://localhost:8082/p/{código} |
| API + Swagger | http://localhost:8080/swagger-ui.html |

Los frontends se sirven con nginx, que hace proxy de `/api/` al backend, por lo que no necesitan configuración de URL. Si despliegas la voting app en otro dominio, cambia `APP_PUBLIC_VOTING_URL` (se usa para construir los enlaces de los puntos) y `APP_CORS_ORIGINS`.

Las imágenes subidas se guardan en el volumen `uploads`; la base de datos en `pgdata`.

### Datos de prueba

Con `APP_SEED_ENABLED=true` (en `.env` o en el entorno de `./mvnw spring-boot:run`), `DataInitializer` **vacía toda la base de datos en cada arranque** y crea:

- Gestor `Gestor-Test` con correo `gestor-test@gmail.com` y contraseña `gestor-test123`.
- Diez items que simulan productos de una máquina expendedora (sin imagen).
- Tres votaciones, una de cada tipo: "Producto favorito" (voto único), "Tus tres imprescindibles" (hasta 3 votos) y "Ranking de snacks" (ranking).
- Dos puntos de votación que simulan dos máquinas: "Hall principal" con la votación de voto único y "Cafetería" con la de votos limitados. El ranking queda sin asignar para poder probar el cambio de votación.

Déjalo en `false` en cualquier entorno con datos reales.

## Despliegue en servidor

La aplicación está desplegada en un VPS (Hetzner CX22, Ubuntu 24.04) con HTTPS y despliegue continuo:

| Servicio | URL pública |
| --- | --- |
| Voting app (enlaces y QR de los puntos) | `https://<VOTING_HOST>/p/{código}` |
| Panel de gestión | `https://<PANEL_HOST>` |

- **Dominios**: dos subdominios gratuitos de DuckDNS apuntando a la IP del servidor.
- **HTTPS**: Caddy (`deploy/Caddyfile`) delante de los dos nginx, con certificados Let's Encrypt automáticos. Es el único contenedor expuesto; el resto solo es accesible en la red interna de Compose.
- **Despliegue continuo**: cada `push` a `main` ejecuta `.github/workflows/deploy.yml`, que pasa los tests, publica las tres imágenes en GitHub Container Registry y entra por SSH al servidor para hacer `pull` y reiniciar lo que haya cambiado.
- **Servidor**: preparado con `deploy/install-server.sh` (Docker, `ufw`, `fail2ban`, usuario de despliegue, `.env`); copias diarias con `deploy/backup.sh`.

En el servidor la pila se gestiona con los dos ficheros de Compose:

```bash
cd /opt/krate
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

La guía paso a paso (crear el VPS, DuckDNS, secretos de GitHub, operación, restaurar copias y apagado final) está en `deploy/DESPLIEGUE.md`.

> **Cambiar `POSTGRES_PASSWORD` después del primer arranque:** la imagen de PostgreSQL solo usa esa variable al inicializar el volumen. Si la cambias más tarde, el backend no podrá conectar (502 en los frontends). Sincroniza la contraseña sin perder datos con
> `docker compose exec postgres psql -U krate -d krate -c "ALTER USER krate WITH PASSWORD 'nueva';"` y `docker compose restart backend`, o empieza de cero con `docker compose down -v && docker compose up -d`.

## Desarrollo local

Requisitos: Java 21, Node 22, Docker.

```bash
# Backend (levanta PostgreSQL automáticamente con Krate/compose.yaml)
cd Krate && ./mvnw spring-boot:run

# Panel de gestión -> http://localhost:4200 (proxy /api -> :8080)
cd management-app && npm install && npm start

# Voting app -> http://localhost:4300 (proxy /api -> :8080)
cd voting-app && npm install && npm start
```

## Verificación

```bash
cd Krate && ./mvnw verify                    # tests con Testcontainers (requiere Docker) + informe de cobertura en target/site/jacoco/
cd management-app && npm run build && npx ng test --watch=false
cd voting-app && npm run build && npx ng test --watch=false
```

Estos mismos comandos los ejecuta GitHub Actions antes de cada despliegue; si alguno falla, no se publica ninguna imagen.

La prueba de carga de la API pública (`CODE=<código> k6 run load/vote.js`, con la pila Docker levantada y una votación activa) se ejecuta a mano y no forma parte del workflow. Genera un informe HTML en `load/results/`. Detalles en `load/README.md`.

Qué prueba cada nivel, cómo está construido y qué valor aporta se describe en `TESTING.md`.

## API (resumen)

| Método y ruta | Auth | Descripción |
| --- | --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | — / JWT | Cuenta de gestor |
| `GET/POST /api/items`, `GET/PUT/DELETE /api/items/{id}`, `DELETE /api/items/{id}/image` | JWT | Items (multipart: `name`, `description`, `image`, `removeImage`) |
| `GET/POST /api/votings`, `GET/PUT/DELETE /api/votings/{id}` | JWT | Votaciones (`type`, `maxSelections`, `itemIds` ordenados) |
| `GET/POST /api/voting-points`, `GET/PUT/DELETE /api/voting-points/{id}` | JWT | Puntos (devuelven `code` y `publicUrl`) |
| `GET /api/instances?status=ACTIVE`, `POST /api/instances`, `POST /api/instances/{id}/stop` | JWT | Lanzar y detener |
| `GET /api/stats/instances?votingId=&votingPointId=`, `GET /api/stats/instances/{id}` | JWT | Lanzamientos (filtros opcionales por votación y punto) y resultados de uno |
| `GET /api/stats/votings/{id}?votingPointId=` | JWT | Resultados agregados de una votación: suma de todos sus lanzamientos o solo los de un punto |
| `GET /api/stats/items/{id}` | JWT | Historial de un item: posición, votos y porcentaje en cada lanzamiento en el que fue candidato |
| `GET /api/public/points/{code}` (header `X-Voter-Token`), `POST /api/public/points/{code}/votes` (`itemIds` en orden de preferencia) | — | API pública de la voting app |
| `GET /api/files/{nombre}` | — | Imágenes de items |

Los errores siguen RFC 9457 (`application/problem+json`) con `detail` y, en validaciones, un mapa `errors` por campo.
