# Guía de despliegue

Pasos para publicar Krate en un VPS con HTTPS y despliegue continuo desde GitHub.
La arquitectura está descrita en `ARQUITECTURA.md` (secciones 1.2 y 1.3).

Resumen: GitHub Actions pasa los tests, publica tres imágenes en GHCR y entra por
SSH al servidor, que solo ejecuta contenedores. Caddy es el único proceso expuesto
a internet y gestiona los certificados.

---

## 1. Requisitos previos

| Qué | Detalle |
|---|---|
| VPS | x86, Ubuntu 24.04, 2 GB de RAM o más. El servidor no compila nada. |
| Acceso | Tu clave SSH pública instalada en `root` al crear el servidor. |
| Cortafuegos del proveedor | Entrada permitida solo en TCP 22, 80 y 443, más UDP 443 si quieres HTTP/3. |
| Dominios | Dos subdominios apuntando a la IPv4 del VPS: uno para la voting app y otro para el panel. |
| Repositorio | En GitHub, con el workflow `.github/workflows/deploy.yml`. |

El subdominio de votación aparece en los enlaces y en los códigos QR impresos, así
que elígelo definitivo antes de imprimir nada.

## 2. Preparar el servidor

Comprueba primero que los dos nombres resuelven a la IP del VPS:

```bash
dig +short krate-vote.duckdns.org
dig +short krate-manage.duckdns.org
```

Entra como `root` y ejecuta el script de instalación:

```bash
ssh root@IP_DEL_VPS
curl -fsSL https://raw.githubusercontent.com/unaydf/Krate/main/deploy/install-server.sh -o install-server.sh
VOTING_HOST=krate-vote.duckdns.org \
PANEL_HOST=krate-manage.duckdns.org \
GHCR_OWNER=unaydf \
bash install-server.sh
```

El script es idempotente y hace todo esto:

1. Actualiza el sistema e instala Docker y Compose desde el repositorio oficial.
2. Crea el usuario `krate`, sin privilegios de administrador, en el grupo `docker`.
3. Deja `ufw` con solo 22, 80 y 443 abiertos y activa `fail2ban` para SSH.
4. Crea un fichero de intercambio de 2 GB.
5. Clona el repositorio en `/opt/krate`.
6. Genera `/opt/krate/.env` con `APP_JWT_SECRET` y `POSTGRES_PASSWORD` aleatorios.
7. Genera el par de claves SSH que usará GitHub Actions y programa la copia nocturna.

Al terminar imprime la clave privada de despliegue. Cópiala entera, incluidas las
líneas de principio y fin.

**Importante:** la contraseña de PostgreSQL se fija en el primer arranque. Si la
cambias después, el volumen de datos conserva la anterior y el backend no conecta.
Si necesitas cambiarla, hay que recrear el volumen y restaurar una copia.

## 3. Secretos en GitHub

En el repositorio, en Settings, Secrets and variables, Actions, añade tres secretos:

| Secreto | Valor |
|---|---|
| `DEPLOY_HOST` | IPv4 del VPS |
| `DEPLOY_USER` | `krate` |
| `DEPLOY_SSH_KEY` | La clave privada que imprimió el script |

## 4. Primer arranque

Desde el servidor, como usuario `krate`:

```bash
sudo -u krate -i
cd /opt/krate
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
```

Caddy pide los certificados en el primer arranque y tarda unos segundos. Si los
nombres todavía no resuelven a este servidor, la emisión falla y se reintenta.

Si el repositorio es privado, las imágenes de GHCR también lo son y hace falta un
único inicio de sesión en el registro antes del `pull`:

```bash
echo TOKEN_CON_read:packages | docker login ghcr.io -u unaydf --password-stdin
```

Con el repositorio público, marca los tres paquetes como públicos en GitHub tras la
primera publicación y no hace falta ningún token.

## 5. Comprobaciones

```bash
curl -I https://krate-vote.duckdns.org          # 200, servido por Caddy
curl -I http://krate-vote.duckdns.org           # 308, redirección a HTTPS
curl -s -o /dev/null -w "%{http_code}\n" https://krate-vote.duckdns.org/api/public/points/NOEXISTE   # 404: la API responde a través de nginx
ss -tlnp | grep -E ':(80|443|8080)'             # solo 80 y 443 escuchan hacia fuera
```

Después, desde el móvil: abre el panel, crea una votación, lanza un punto y escanea
su QR. El enlace debe llevar al subdominio de votación.

## 6. Operación diaria

```bash
cd /opt/krate
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE ps                  # estado de los cinco servicios
$COMPOSE logs -f backend     # logs de la API
$COMPOSE restart backend     # reinicio puntual
$COMPOSE pull && $COMPOSE up -d   # traer la última versión a mano
```

**Desplegar** es hacer push a `main`. El workflow pasa los tests, publica las
imágenes y actualiza el servidor. Si una etapa falla, las siguientes no se ejecutan
y el servidor sigue con la versión anterior.

**Volver a una versión anterior:** pon en `.env` la etiqueta del commit bueno y
levanta de nuevo.

```bash
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-abc1234/' .env
$COMPOSE up -d
```

**Rotar el secreto de los tokens:** cambia `APP_JWT_SECRET` en `.env` y reinicia el
backend. Todas las sesiones abiertas del panel caducan de golpe.

## 7. Copias de seguridad

`deploy/backup.sh` se ejecuta cada noche a las 03:30 por `cron` y deja en
`/opt/krate/backups/` un volcado de la base de datos y un archivo con las imágenes
subidas, conservando 14 días. Para lanzarlo a mano:

```bash
/opt/krate/deploy/backup.sh
```

Restaurar la base de datos:

```bash
cd /opt/krate
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE stop backend
gunzip -c backups/db_2026-09-22_03-30-00.sql.gz | $COMPOSE exec -T postgres psql -U krate -d krate
$COMPOSE start backend
```

Restaurar las imágenes subidas:

```bash
gunzip -c backups/uploads_2026-09-22_03-30-00.tar.gz | $COMPOSE exec -T backend tar -x -C /data
```

Conviene descargar de vez en cuando una copia a tu equipo:

```bash
scp krate@IP_DEL_VPS:/opt/krate/backups/db_*.sql.gz .
```

## 8. Probar la pila de producción en local

Sin tocar Let's Encrypt, usando nombres `.localhost` para los que Caddy emite
certificados internos:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null   # valida la sintaxis
VOTING_HOST=voto.localhost PANEL_HOST=panel.localhost GHCR_OWNER=unaydf \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
curl -k -I https://voto.localhost
```

## 9. Apagado final

Al terminar el periodo de uso:

1. Descarga la última copia de seguridad a tu equipo.
2. Borra el servidor desde el panel del proveedor. El cobro por horas se detiene.
3. Borra los dos subdominios en DuckDNS.
4. Borra los secretos del repositorio en GitHub y, si quieres, los paquetes de GHCR.
