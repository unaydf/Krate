# Tecnologías de Krate

Este documento recoge los lenguajes, frameworks, librerías y herramientas que forman el proyecto. Para cada una se indica qué es, para qué se usa en Krate, qué alternativas destacadas existen y por qué se ha elegido.

La pila base (Angular, Java 21 con Spring Boot, PostgreSQL y Docker) venía fijada por los requisitos del proyecto. El resto de decisiones se han tomado dentro de ese marco, con dos criterios constantes: **no añadir dependencias sin una necesidad concreta** y **que todo funcione sin servicios externos**, ya que la voting app puede operar en redes sin salida a internet.

## Índice

1. [Backend](#1-backend)
2. [Frontend](#2-frontend)
3. [Base de datos](#3-base-de-datos)
4. [Despliegue e infraestructura](#4-despliegue-e-infraestructura)
5. [Pruebas](#5-pruebas)
6. [Herramientas de desarrollo](#6-herramientas-de-desarrollo)
7. [Resumen de versiones](#7-resumen-de-versiones)

---

## 1. Backend

### Java 21

**Qué es.** Lenguaje de programación de propósito general, compilado a bytecode y ejecutado en la máquina virtual de Java (JVM). La versión 21 es una versión de soporte extendido (LTS).

**En Krate.** Lenguaje de todo el backend: entidades, servicios, controladores, estrategias de votación y tests. Se usan características modernas como *records* para los DTOs, *pattern matching* con `instanceof` y bloques de texto en los tests.

**Alternativas.** Kotlin (también sobre la JVM, más conciso), C# con .NET, Go, Node.js con TypeScript, Python con Django o FastAPI.

**Por qué.** Requisito del proyecto. Además, Java 21 es la versión LTS más reciente compatible con Spring Boot 4, tiene un ecosistema muy maduro para aplicaciones empresariales y un tipado estático que facilita mantener un dominio con reglas de negocio claras.

### Spring Boot 4.1

**Qué es.** Framework que empaqueta el ecosistema Spring (inyección de dependencias, web, seguridad, datos) con configuración automática, un servidor embebido y un único ejecutable.

**En Krate.** Esqueleto de toda la API REST. Aporta el contenedor de inyección de dependencias sobre el que se apoyan los servicios y el patrón Strategy de tipos de votación, la configuración por propiedades y variables de entorno, y el arranque como un `jar` autocontenido dentro de Docker.

**Alternativas.** Quarkus y Micronaut (arranque más rápido, orientados a nativo), Jakarta EE, Spring Framework sin Boot.

**Por qué.** Requisito del proyecto y el estándar de facto en Java. La versión 4.1 es la más reciente y viene con Spring Framework 7, Spring Security 7 y Hibernate 7, lo que evita migraciones a corto plazo. Nota: el proyecto inicial incluía Spring AI, que se retiró por no tener uso y exigir una clave de API para arrancar.

### Spring Web MVC

**Qué es.** Módulo de Spring para construir aplicaciones web y APIs REST sobre el modelo servlet, con controladores anotados y conversión automática a JSON.

**En Krate.** Todos los controladores (`/api/auth`, `/api/items`, `/api/votings`, `/api/voting-points`, `/api/instances`, `/api/stats`, `/api/public`, `/api/files`), la subida de imágenes multipart y la conversión de errores a `ProblemDetail` (RFC 9457).

**Alternativas.** Spring WebFlux (reactivo, no bloqueante), JAX-RS con Jersey, Javalin.

**Por qué.** La carga es moderada y las operaciones son cortas y transaccionales, donde el modelo bloqueante clásico es más sencillo de escribir, depurar y probar que el reactivo. WebFlux no aportaría ventaja y complicaría el uso de JPA.

### Spring Data JPA e Hibernate 7

**Qué es.** JPA es la especificación estándar de persistencia objeto-relacional en Java; Hibernate es su implementación más extendida. Spring Data JPA añade repositorios cuyas consultas se generan a partir del nombre del método o de JPQL.

**En Krate.** Mapeo de las entidades (`User`, `Item`, `Voting`, `VotingPoint`, `VotingInstance`, `Ballot`, `Vote`), repositorios con consultas de dominio (`findByIdAndOwnerIdAndDeletedAtIsNull`, recuentos por instancia, proyecciones para las estrategias) y transacciones declarativas con `@Transactional`.

**Alternativas.** Spring Data JDBC (más simple, sin carga perezosa), jOOQ (SQL tipado), MyBatis, JDBC directo.

**Por qué.** El modelo tiene relaciones que se recorren en ambos sentidos (votación ↔ items ordenados, papeleta → votos) y JPA las resuelve con poco código. El patrón Repository que impone encaja con la separación por dominios del backend. Se evitan las funciones más "mágicas" (`@SoftDelete`, `@SQLRestriction`) para conservar control sobre qué consultas filtran el borrado lógico y cuáles no.

### Spring Security 7 y OAuth2 Resource Server

**Qué es.** Framework de seguridad de Spring: cadena de filtros, autenticación, autorización y utilidades criptográficas. El módulo *OAuth2 Resource Server* valida tokens JWT en cada petición.

**En Krate.** Autenticación *stateless* de los gestores con JWT firmados con HMAC-SHA256, hash de contraseñas con BCrypt, rutas públicas para la voting app y las imágenes, y configuración de CORS. El mismo módulo aporta `JwtEncoder` y `JwtDecoder` (implementación Nimbus), por lo que no hace falta ninguna librería de JWT adicional.

**Alternativas.** Sesiones HTTP con cookie (Spring Security clásico), librerías JWT independientes como jjwt o Auth0, proveedores de identidad externos (Keycloak, Auth0, Firebase Auth).

**Por qué.** JWT sin estado permite escalar el backend y simplifica el despliegue con dos frontends. Usar el soporte JWT integrado en Spring Security evita una dependencia extra y aprovecha el filtro `BearerTokenAuthenticationFilter` ya probado. Un proveedor externo se descartó por el requisito de no depender de servicios de terceros.

### Jakarta Bean Validation (Hibernate Validator)

**Qué es.** Especificación de validación declarativa mediante anotaciones (`@NotBlank`, `@Size`, `@Email`, `@Min`).

**En Krate.** Validación de los DTOs de entrada (registro, votaciones, puntos, papeletas). Los errores se devuelven como un mapa campo → mensaje en castellano dentro del `ProblemDetail`.

**Alternativas.** Validación manual en los servicios, librerías como Yavi.

**Por qué.** Es el estándar, viene con Spring Boot y mantiene las reglas junto a los datos que validan. La validación que depende del estado (por ejemplo, que el máximo de votos no supere el número de items) se hace en las estrategias, donde hay contexto.

### Flyway

**Qué es.** Herramienta de migraciones de base de datos versionadas: scripts SQL numerados que se aplican en orden y quedan registrados.

**En Krate.** Dos migraciones: `V1__init.sql` crea el esquema y `V2__voting_types.sql` añade los tipos de votación y separa papeletas de selecciones migrando los datos existentes. Hibernate se limita a validar que el esquema coincide con las entidades (`ddl-auto=validate`).

**Alternativas.** Liquibase (XML/YAML, más funciones de *rollback*), generación automática del esquema por Hibernate (`ddl-auto=update`).

**Por qué.** Los scripts SQL planos son fáciles de leer y revisar, y permiten expresar exactamente lo que PostgreSQL necesita (índices únicos parciales, migración de datos). Dejar que Hibernate modifique el esquema en producción es arriesgado y no permite migrar datos.

### springdoc-openapi

**Qué es.** Librería que genera la especificación OpenAPI de la API a partir de los controladores de Spring y sirve la interfaz Swagger UI.

**En Krate.** Documentación interactiva en `/swagger-ui.html`, con soporte para introducir el token Bearer y probar los endpoints.

**Alternativas.** Escribir la especificación OpenAPI a mano, Spring REST Docs (documentación generada desde los tests).

**Por qué.** Cero mantenimiento: la documentación se genera del código y siempre está actualizada. Útil para el desarrollo de los frontends y para la memoria del proyecto.

### Maven

**Qué es.** Herramienta de construcción y gestión de dependencias para Java, basada en un `pom.xml` declarativo.

**En Krate.** Compilación, ejecución de tests, empaquetado del `jar` y construcción de la imagen Docker (etapa de *build*). Se incluye el *wrapper* `mvnw` para no exigir una instalación local.

**Alternativas.** Gradle (más flexible y rápido con caché, scripts en Kotlin o Groovy).

**Por qué.** Es lo que genera Spring Initializr por defecto y lo más habitual en proyectos Spring. La configuración es puramente declarativa y sin lógica, suficiente para este proyecto.

---

## 2. Frontend

### TypeScript 6

**Qué es.** Superconjunto de JavaScript con tipado estático que se compila a JavaScript.

**En Krate.** Lenguaje de los dos frontends. Las interfaces de `core/models.ts` reflejan los DTOs del backend, de modo que el compilador detecta desajustes con la API al cambiar el contrato.

**Alternativas.** JavaScript sin tipos, Dart (Flutter Web), Elm.

**Por qué.** Angular está escrito en TypeScript y lo exige. El tipado ha sido especialmente útil al introducir los tipos de votación: cambiar `itemId` por `itemIds` o añadir `points` a los resultados hizo saltar errores de compilación en cada punto que había que adaptar.

### Angular 22

**Qué es.** Framework de aplicaciones web de una sola página (SPA) mantenido por Google, con componentes, inyección de dependencias, enrutador y cliente HTTP integrados.

**En Krate.** Las dos aplicaciones: el panel de gestión (`management-app`) y la interfaz de voto (`voting-app`). Se usan componentes *standalone* (sin NgModules), señales (`signal`, `computed`, `effect`) para el estado, la nueva sintaxis de control de flujo (`@if`, `@for`, `@switch`), rutas cargadas de forma diferida, guardas funcionales e interceptores HTTP funcionales.

**Alternativas.** React (con Vite o Next.js), Vue, Svelte, SolidJS.

**Por qué.** Requisito del proyecto. Como ventaja propia, Angular trae en el propio framework todo lo que estas aplicaciones necesitan (enrutador, formularios reactivos, HttpClient, inyección de dependencias), lo que reduce la lista de dependencias a elegir y mantener. Las señales de Angular 22 permiten un estado reactivo simple sin librerías de gestión de estado.

### RxJS 7

**Qué es.** Librería de programación reactiva con *observables*.

**En Krate.** Uso mínimo: `HttpClient` devuelve observables, que se convierten a promesas con `firstValueFrom` en los servicios de API, y el interceptor de autenticación usa `catchError`.

**Alternativas.** Promesas nativas con `fetch`, la API `httpResource` de Angular.

**Por qué.** Viene con Angular y es la interfaz de `HttpClient`. Se ha preferido convertir a promesas en los servicios porque los flujos de las páginas son secuenciales (cargar, guardar, recargar) y `async/await` resulta más legible que cadenas de operadores.

### CSS propio con variables

**Qué es.** Hojas de estilo estándar, sin preprocesador ni framework de utilidades, con *custom properties* como sistema de diseño.

**En Krate.** Un fichero `styles.css` por aplicación con los tokens (colores, radios, sombras, fuente) y las clases base (botones, tarjetas, tablas, formularios, badges); cada componente añade solo sus estilos locales.

**Alternativas.** Angular Material o PrimeNG (componentes listos), Tailwind CSS (utilidades), Bootstrap, Sass.

**Por qué.** Decisión del proyecto: se quería una interfaz ligera y con identidad propia. Los tokens en `:root` permitieron cambiar toda la paleta, la fuente y el redondeado tocando un solo bloque. La voting app se beneficia especialmente de no cargar una librería de componentes.

### Nunito (vía Fontsource)

**Qué es.** Tipografía de código abierto de trazos redondeados. Fontsource la distribuye como paquete npm con los ficheros de fuente.

**En Krate.** Fuente de ambas aplicaciones, incluida en el *build* con `@fontsource-variable/nunito`.

**Alternativas.** Google Fonts por CDN, fuentes del sistema, Inter, Poppins, Quicksand.

**Por qué.** Se buscaba una fuente "natural y relajada" acorde con los bordes redondeados y la paleta verde. Empaquetarla evita una petición a Google Fonts en tiempo de ejecución, necesario para que la voting app funcione sin internet.

### lucide-angular

**Qué es.** Conjunto de iconos SVG de código abierto (Lucide) con un componente para Angular.

**En Krate.** Todos los iconos del panel y de la voting app (navegación, acciones, estados, tipos de votación). Se importan solo los iconos usados, que quedan incluidos en el *bundle*.

**Alternativas.** Material Symbols (fuente de iconos por CDN), Font Awesome, Heroicons, SVG inline a mano.

**Por qué.** Decisión del proyecto de no usar emojis y sí una librería de iconos coherente. Lucide es SVG puro, sin fuentes ni CDN, y su importación selectiva mantiene el tamaño pequeño. La versión actual declara compatibilidad hasta Angular 21, por lo que se instala con `legacy-peer-deps`; funciona sin incidencias con Angular 22.

### qrcode

**Qué es.** Librería JavaScript que genera códigos QR en un `canvas` o como imagen.

**En Krate.** Botón "QR" del panel que genera en el navegador el código del enlace de un punto de votación y permite descargarlo como PNG para imprimirlo.

**Alternativas.** Servicios web de generación de QR, `qr-code-styling`, `angularx-qrcode`.

**Por qué.** Genera el código localmente, sin enviar la URL a ningún servicio, y produce directamente un PNG descargable. Es una dependencia pequeña y sin transitivas problemáticas.

---

## 3. Base de datos

### PostgreSQL 17

**Qué es.** Sistema gestor de bases de datos relacional de código abierto.

**En Krate.** Única fuente de datos: usuarios, items, votaciones, puntos, instancias, papeletas y votos. Se aprovechan características propias como los índices únicos parciales (`UNIQUE ... WHERE status = 'ACTIVE'`) para garantizar en la propia base de datos que solo hay una instancia activa por punto, y columnas `TIMESTAMP WITH TIME ZONE`.

**Alternativas.** MySQL o MariaDB, SQLite (embebida), bases de datos documentales como MongoDB.

**Por qué.** Requisito del proyecto. Además, el dominio es claramente relacional (integridad referencial entre siete tablas) y PostgreSQL ofrece las restricciones necesarias para que las reglas críticas no dependan solo del código.

---

## 4. Despliegue e infraestructura

### Docker

**Qué es.** Plataforma de contenedores: empaqueta una aplicación con todo lo necesario para ejecutarla de forma reproducible.

**En Krate.** Tres imágenes propias construidas en dos etapas: el backend (Maven compila, Eclipse Temurin JRE 21 ejecuta, con usuario sin privilegios) y los dos frontends (Node compila, nginx sirve). Más la imagen oficial de PostgreSQL.

**Alternativas.** Podman (compatible), despliegue directo en máquinas virtuales, plataformas gestionadas.

**Por qué.** Requisito del proyecto y la forma más sencilla de garantizar que el entorno de despliegue coincide con el de desarrollo. Las construcciones en dos etapas dejan imágenes finales pequeñas y sin herramientas de compilación.

### Docker Compose

**Qué es.** Herramienta para definir y ejecutar aplicaciones de varios contenedores con un fichero YAML.

**En Krate.** `docker-compose.yml` en la raíz orquesta los cuatro servicios, la red interna, los volúmenes `pgdata` y `uploads`, el orden de arranque (el backend espera a que PostgreSQL esté sano) y las variables de entorno leídas de `.env`. En desarrollo, Spring Boot usa `Krate/compose.yaml` para levantar solo PostgreSQL.

**Alternativas.** Kubernetes (orquestación a gran escala), Docker Swarm, scripts manuales.

**Por qué.** Un único host y cuatro servicios: Compose cubre la necesidad con un fichero legible. Kubernetes añadiría una complejidad que el proyecto no necesita.

### nginx

**Qué es.** Servidor web y proxy inverso de alto rendimiento.

**En Krate.** Sirve los ficheros estáticos de cada SPA con *fallback* a `index.html` para las rutas de Angular, y hace de proxy de `/api/` hacia el backend. Gracias a esto los frontends llaman a rutas relativas y no necesitan conocer la URL del backend en ningún entorno.

**Alternativas.** Apache HTTP Server, Caddy (HTTPS automático), servir los estáticos desde el propio Spring Boot.

**Por qué.** Ligero, estándar en imágenes Docker y con una configuración de pocas líneas. Servir los frontends desde Spring Boot habría acoplado los despliegues y obligado a una sola aplicación. Caddy sería una buena opción si se añade HTTPS automático más adelante.

---

## 5. Pruebas

### JUnit 5, AssertJ y MockMvc

**Qué es.** JUnit 5 es el framework de pruebas estándar en Java; AssertJ aporta aserciones fluidas; MockMvc (Spring Test) permite ejecutar peticiones HTTP contra los controladores sin levantar un servidor.

**En Krate.** Tests unitarios de las estrategias de votación (sin Spring, con ejemplos numéricos de Borda) y tests de integración de la API completa: autenticación, aislamiento entre gestores, flujo lanzar → votar → detener → estadísticas, tipos de votación, borrado lógico y datos de prueba.

**Alternativas.** TestNG, Spock (Groovy), tests con `RestClient` contra un puerto real.

**Por qué.** Vienen con Spring Boot. MockMvc permite probar el contrato HTTP real (códigos de estado, JSON, validaciones) con la rapidez de un test en proceso.

### Testcontainers

**Qué es.** Librería que arranca servicios reales (aquí PostgreSQL 17) en contenedores Docker efímeros durante los tests.

**En Krate.** Todos los tests de integración se ejecutan contra un PostgreSQL real, lo que valida también las migraciones de Flyway y las restricciones de la base de datos (índices únicos parciales, unicidad de papeletas).

**Alternativas.** H2 en memoria, una base de datos compartida de pruebas, *mocks* de los repositorios.

**Por qué.** H2 no soporta los índices únicos parciales ni se comporta igual que PostgreSQL; probar contra el motor real evita sorpresas en despliegue. Requiere Docker en la máquina de desarrollo, que ya es un requisito del proyecto.

### Vitest

**Qué es.** Ejecutor de tests para JavaScript y TypeScript, rápido y compatible con la API de Jest.

**En Krate.** Tests unitarios de los frontends (por ahora, arranque de los componentes raíz), con jsdom como entorno de navegador simulado.

**Alternativas.** Karma con Jasmine (la opción histórica de Angular, ya en desuso), Jest, Web Test Runner.

**Por qué.** Es el ejecutor que Angular 22 configura por defecto y el reemplazo oficial de Karma. Arranca en menos de un segundo.

---

## 6. Herramientas de desarrollo

### Node.js 22 y npm

**Qué es.** Entorno de ejecución de JavaScript fuera del navegador y su gestor de paquetes.

**En Krate.** Ejecutan la CLI de Angular, el servidor de desarrollo con proxy a la API y la construcción de los frontends, tanto en local como dentro de las imágenes Docker.

**Alternativas.** Bun, Deno; pnpm o Yarn como gestores de paquetes.

**Por qué.** Angular 22 requiere Node 20.19 o superior; la versión 22 es LTS. npm es el gestor que usa la CLI de Angular por defecto y el que reproduce exactamente las dependencias con `package-lock.json` en Docker.

### Prettier

**Qué es.** Formateador de código con opiniones fijas.

**En Krate.** Formato uniforme de todo el TypeScript de los frontends, con la configuración que genera Angular (`printWidth` 100, comillas simples).

**Alternativas.** ESLint con reglas de formato, Biome, dprint.

**Por qué.** Viene configurado con el proyecto Angular y elimina discusiones de estilo. El backend sigue las convenciones de formato del propio Spring (tabuladores, llaves en línea).

### Chromium en modo headless

**Qué es.** Navegador Chromium sin interfaz gráfica, controlable por el protocolo de depuración de Chrome (CDP).

**En Krate.** Verificación visual durante el desarrollo: capturas de pantalla de las páginas servidas por Docker, con inyección de la sesión y simulación de toques en la papeleta. No forma parte del código entregado.

**Alternativas.** Playwright o Cypress (tests de extremo a extremo), pruebas manuales.

**Por qué.** Estaba disponible en la máquina y bastaba para comprobar el resultado real sin añadir dependencias. Si el proyecto crece, Playwright sería el paso natural para automatizar estos flujos como tests.

---

## 7. Resumen de versiones

| Componente | Versión | Dónde |
| --- | --- | --- |
| Java | 21 (LTS) | `Krate/pom.xml` |
| Spring Boot | 4.1.1 | `Krate/pom.xml` |
| Spring Framework / Security / Data JPA | 7.0.9 / 7.1.1 / 4.1.1 | gestionadas por Spring Boot |
| Hibernate ORM | 7.4.5 | gestionada por Spring Boot |
| Flyway | 12.4.0 | gestionada por Spring Boot |
| springdoc-openapi | 3.1.0 | `Krate/pom.xml` |
| PostgreSQL | 17 | `docker-compose.yml`, `Krate/compose.yaml`, Testcontainers |
| Testcontainers | 2.0.5 | gestionada por Spring Boot |
| TypeScript | 6.0 | `package.json` de cada frontend |
| Angular | 22.1.5 | `package.json` de cada frontend |
| RxJS | 7.8 | `package.json` de cada frontend |
| lucide-angular | 1.0 | `package.json` de cada frontend |
| @fontsource-variable/nunito | 5.3.0 | `package.json` de cada frontend |
| qrcode | 1.5 | `management-app/package.json` |
| Vitest | 4.1 | `package.json` de cada frontend |
| Node.js | 22 (LTS) | Dockerfiles de los frontends |
| nginx | 1.27 | Dockerfiles de los frontends |
| Docker / Docker Compose | 29 / 5 | máquina de desarrollo |
