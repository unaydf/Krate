# Estrategia de pruebas de Krate

Este documento recoge todas las pruebas que se realizan sobre Krate, cómo están construidas, qué garantiza cada nivel y por qué se ha repartido el esfuerzo de esta manera. Complementa a `ARQUITECTURA.md` (diseño del sistema y reglas de negocio) y a `TECNOLOGÍAS.md` (catálogo de herramientas, con alternativas y motivos de elección). El paso a paso para lanzar la prueba de carga está en `load/README.md`.

---

## Índice

1. [Objetivos y criterio de reparto](#1-objetivos-y-criterio-de-reparto)
2. [Resumen por niveles](#2-resumen-por-niveles)
3. [Pruebas unitarias del backend](#3-pruebas-unitarias-del-backend)
   1. [Infraestructura: sin Spring ni base de datos](#31-infraestructura-sin-spring-ni-base-de-datos)
   2. [Casos por clase](#32-casos-por-clase)
   3. [Valor que aportan](#33-valor-que-aportan)
4. [Pruebas de integración del backend](#4-pruebas-de-integración-del-backend)
   1. [Infraestructura: aplicación completa sobre PostgreSQL real](#41-infraestructura-aplicación-completa-sobre-postgresql-real)
   2. [Por qué PostgreSQL en Testcontainers y no H2](#42-por-qué-postgresql-en-testcontainers-y-no-h2)
   3. [Casos por clase](#43-casos-por-clase)
   4. [Trazabilidad con las reglas de negocio](#44-trazabilidad-con-las-reglas-de-negocio)
5. [Pruebas unitarias de los frontends](#5-pruebas-unitarias-de-los-frontends)
6. [Comprobaciones manuales de extremo a extremo](#6-comprobaciones-manuales-de-extremo-a-extremo)
7. [Pruebas de carga de la API pública](#7-pruebas-de-carga-de-la-api-pública)
   1. [Qué se carga y por qué](#71-qué-se-carga-y-por-qué)
   2. [Diseño del guion](#72-diseño-del-guion)
   3. [Umbrales](#73-umbrales)
   4. [Resultados](#74-resultados)
   5. [Interpretación y límites de la medida](#75-interpretación-y-límites-de-la-medida)
8. [Ejecución y automatización](#8-ejecución-y-automatización)
9. [Limitaciones y ampliaciones](#9-limitaciones-y-ampliaciones)

---

## 1. Objetivos y criterio de reparto

Las pruebas de Krate buscan garantizar cuatro cosas, por orden de importancia:

1. **Que el recuento es correcto.** Una plataforma de votaciones vale lo que valen sus resultados. Las tres formas de puntuar (recuento simple, recuento con varias opciones y puntos Borda) tienen que dar exactamente el número esperado en casos calculados a mano, incluidas papeletas parciales, porcentajes y desempates.
2. **Que las reglas de negocio se cumplen en la API, no solo en la interfaz.** El aislamiento entre gestores, la papeleta única por dispositivo, los bloqueos mientras hay una votación activa y el borrado lógico se aplican en el backend; la interfaz solo los refleja. Por eso se prueban contra la API real con códigos de estado HTTP.
3. **Que el esquema de base de datos y el código coinciden.** Las migraciones de Flyway, `ddl-auto=validate` y las restricciones únicas de PostgreSQL forman parte del comportamiento: una restricción que falta o un índice parcial mal definido no se detectan con una base de datos en memoria.
4. **Que la parte pública aguanta a muchos votantes a la vez.** Los únicos endpoints que reciben peticiones simultáneas son los de consulta del punto y envío de la papeleta. La restricción de papeleta única tiene que resistir dos envíos idénticos en el mismo instante.

De ahí el reparto: la mayor parte del esfuerzo está en **pruebas de integración del backend contra PostgreSQL real**, porque ahí viven las reglas de negocio y el contrato HTTP que consumen las dos aplicaciones Angular. La lógica de puntuación, que es pura y no depende de Spring, se prueba **de forma unitaria** con ejemplos numéricos. Los frontends son capas finas sobre la API (formularios, listados y una pantalla de voto) y se validan con la compilación, con un test de arranque por aplicación y con comprobaciones manuales sobre la pila Docker. La concurrencia se mide con una **prueba de carga** que se ejecuta a mano.

---

## 2. Resumen por niveles

| Nivel | Herramienta | Dónde | Casos | Cuándo se ejecuta |
| --- | --- | --- | --- | --- |
| Unitarias del backend | JUnit 5 + AssertJ, sin Spring | `Krate/src/test/java/com/estinf/Krate/voting/strategy/` | 15 | `./mvnw verify` en local y en el trabajo `test` de GitHub Actions |
| Integración del backend | JUnit 5 + Spring Boot Test + MockMvc + Testcontainers (PostgreSQL 17) | `Krate/src/test/java/com/estinf/Krate/` | 18 | Igual que las anteriores; requiere Docker |
| Unitarias de los frontends | Vitest + jsdom + Angular TestBed | `management-app/src/app/**/*.spec.ts` (raíz, lista de estadísticas y componente de resultados), `voting-app/src/app/app.spec.ts` | 7 | `ng test` en local y en GitHub Actions, tras `ng build` |
| Extremo a extremo manual | `curl` y Chromium en modo headless contra la pila Docker | No forma parte del código entregado | — | Durante el desarrollo y antes del primer despliegue |
| Carga de la API pública | k6 (`load/vote.js`) | `load/` | 2 escenarios, 4 umbrales | A mano contra la pila Docker local; fuera de CI |

En total, el backend ejecuta 33 casos automáticos repartidos en 11 clases de test, más 4 clases de soporte. La última ejecución registrada en `Krate/target/surefire-reports/` terminó con 33 tests, 0 fallos y 0 errores.

La cobertura de código del backend la mide JaCoCo en cada `./mvnw verify` (sección 8). En la ejecución del 5 de septiembre de 2026, sobre 44 clases y 756 líneas (excluidos el punto de entrada, los DTOs y las propiedades de configuración):

| Medida | Cobertura |
| --- | --- |
| Instrucciones | 92,0 % |
| Ramas | 81,9 % |
| Líneas | 91,8 % (694 de 756) |
| Métodos | 87,3 % |

Por paquete, la cobertura de instrucciones va del 67,0 % de `vote` (entidades `Ballot` y `Vote`, con accesores que ningún test lee) y el 79,0 % de `item` al 97,4 % de `auth` y el 97,8 % de `publicapi`. Las estrategias de votación quedan al 95,2 % de instrucciones y al 88,9 % de ramas. No hay umbral mínimo configurado: el informe es informativo (sección 9).

---

## 3. Pruebas unitarias del backend

### 3.1 Infraestructura: sin Spring ni base de datos

Las estrategias de votación (`SingleChoiceStrategy`, `LimitedChoiceStrategy`, `RankingStrategy`) son objetos sin estado que reciben listas y devuelven resultados. Se prueban instanciándolas directamente, sin contexto de Spring, de modo que cada clase de test se ejecuta en unas milésimas de segundo y el fallo señala de forma inequívoca a la función de puntuación.

`voting/strategy/StrategyTestSupport` concentra los tres apoyos que hacen falta:

- `urls()` construye un `PublicUrls` con un `AppProperties` montado a mano (secreto JWT de relleno, base pública `http://voting.test`), porque las estrategias lo necesitan para componer la URL de las imágenes en los resultados.
- `item(id, name)` crea un `Item` con un identificador fijo. La entidad no expone `setId`, así que el id se asigna por reflexión sobre el campo privado; es el único punto del proyecto donde se recurre a ello y está aislado en esta clase.
- `vote(itemId, rank)` crea el `RankedVote` que las estrategias reciben como entrada de puntuación.

### 3.2 Casos por clase

| Clase | Casos | Qué comprueban |
| --- | --- | --- |
| `SingleChoiceStrategyTest` | `configRejectsMaxSelections`, `ballotMustHaveExactlyOneAllowedItem`, `scoreCountsBallotsPerItem`, `metadata` | La configuración no admite `maxSelections`. La papeleta debe contener exactamente un item y ha de estar entre los permitidos: se rechazan la papeleta vacía, la de dos items y la de un id desconocido. Con tres papeletas (A, A, B), A obtiene 2 votos y el 66,7 %, C queda a cero y `averageRank` es nulo. El tipo es `SINGLE`, la etiqueta de puntuación es "votos" y las instrucciones mencionan "una opción". |
| `LimitedChoiceStrategyTest` | `configRequiresMaxBetweenTwoAndItemCount`, `ballotAllowsBetweenOneAndMaxDistinctItems`, `scoreCountsBallotsThatIncludeEachItem`, `metadata` | `maxSelections` es obligatorio, mínimo 2 y no mayor que el número de items; al crear la votación aún sin items solo se exige el mínimo. La papeleta admite entre 1 y `maxSelections` items distintos: se rechazan el exceso, el repetido y la vacía. Con las papeletas [A, B] y [B], B recibe 2 votos (100 % de las papeletas) y A el 50 %. Las instrucciones para un máximo de 3 contienen "hasta 3". |
| `RankingStrategyTest` | `configRejectsMaxSelections`, `ballotAllowsPartialOrderWithDistinctAllowedItems`, `bordaScoringWithPartialBallots`, `tieBreaksByBetterAveragePosition`, `metadata` | La papeleta puede ser parcial (un solo item) o completa, siempre con items distintos y permitidos. Recuento Borda con M = 3 y las papeletas [A, B, C], [B, A] y [A]: A suma 3 + 2 + 3 = 8 puntos (88,9 % de los 9 posibles), 2 primeros puestos y posición media 1,33; B suma 5 con media 1,5; C suma 1 con media 3,0 y el 11,1 %. En un segundo caso, B gana por puntos aunque A tenga mejor posición media, y sin papeletas todos quedan a 0 puntos con `averageRank` nulo. La etiqueta de puntuación es "puntos". |
| `VotingStrategiesTest` | `resolvesEveryTypeAndDefaultsToSingle`, `failsFastIfAStrategyIsMissing` | El registro devuelve una estrategia para cada valor de `VotingType` y usa `SINGLE` cuando no se indica tipo. Si al construirlo falta una estrategia, lanza `IllegalStateException` indicando el tipo ausente, de modo que un error de configuración se detecta al arrancar y no en la primera votación. |

### 3.3 Valor que aportan

- **Verificación numérica del recuento.** Los ejemplos están calculados a mano en los comentarios del propio test (`// 3 items (M = 3): posicion 1 -> 3 puntos, 2 -> 2, 3 -> 1`). Cualquier cambio en el reparto de puntos, el redondeo de porcentajes o el cálculo de la posición media rompe una aserción concreta con un número concreto.
- **Documentación ejecutable de las reglas de papeleta.** Las combinaciones válidas e inválidas para cada tipo (vacía, repetida, ajena, exceso) están enumeradas en un solo sitio y sirven de especificación para la voting app.
- **Protección del patrón Strategy.** El test del registro garantiza que añadir un valor a `VotingType` sin su estrategia falla en el arranque, y que las votaciones sin tipo siguen funcionando como `SINGLE`.
- **Coste casi nulo.** Las cuatro clases suman menos de una décima de segundo en la última ejecución, así que se pueden lanzar continuamente durante el desarrollo.

---

## 4. Pruebas de integración del backend

### 4.1 Infraestructura: aplicación completa sobre PostgreSQL real

Todos los tests de integración arrancan la aplicación Spring Boot completa (seguridad, JPA, Flyway, controladores) y hablan con ella por HTTP simulado con MockMvc, sin abrir un puerto. La base de datos es un contenedor PostgreSQL 17 que Testcontainers levanta al inicio de la ejecución y destruye al final.

| Pieza | Ruta | Función |
| --- | --- | --- |
| `TestcontainersConfiguration` | `Krate/src/test/java/com/estinf/Krate/TestcontainersConfiguration.java` | `@TestConfiguration` que declara un `PostgreSQLContainer` con la imagen `postgres:17` anotado con `@ServiceConnection`. Spring Boot toma de ahí la URL, el usuario y la contraseña, así que no hace falta ningún `application-test.properties`: los tests usan el mismo `application.properties` que producción. |
| `ApiTestSupport` | `Krate/src/test/java/com/estinf/Krate/ApiTestSupport.java` | Clase base abstracta: importa la configuración anterior, activa `@SpringBootTest` con `app.upload-dir=target/test-uploads` (las imágenes subidas en los tests van a `target/` y desaparecen con `mvn clean`) y `@AutoConfigureMockMvc`. Expone `mvc` y tres ayudas: `registerAndGetToken(email)` registra un gestor por la API y devuelve su JWT; `uniqueEmail(prefix)` genera un correo distinto en cada llamada con `System.nanoTime()`; `read(json, path)` extrae un valor con JsonPath. |
| `TestKrateApplication` | `Krate/src/test/java/com/estinf/Krate/TestKrateApplication.java` | No es un test: un `main` alternativo que arranca la aplicación con el contenedor de Testcontainers para desarrollar sin instalar PostgreSQL. |

Tres decisiones de diseño explican cómo son estos tests:

- **Autenticación real, sin `@WithMockUser`.** Cada test registra un gestor nuevo y usa el JWT que devuelve la API. Así se ejercita el filtro de seguridad, la firma del token y el `PasswordEncoder` en cada petición, exactamente como en producción. La dependencia `spring-security-test` está disponible pero no se usa.
- **Sin mocks ni slices.** No hay Mockito, `@WebMvcTest` ni `@DataJpaTest`. Cada caso atraviesa controlador, servicio, repositorio y base de datos. Se pierde granularidad al diagnosticar, pero se gana que cada aserción sobre un código de estado confirma la cadena completa, incluida la traducción de excepciones en `ApiExceptionHandler`.
- **Aislamiento por datos, no por transacción.** No se usa `@Transactional` para deshacer cambios al terminar cada test. En su lugar, cada test crea su propio gestor con un correo único y solo consulta lo que ese gestor ve. Es la misma regla de aislamiento por `owner_id` que garantiza la aplicación, y de paso la pone a prueba: si un test viera datos de otro, fallaría la propia regla de negocio. La contrapartida es que la base de datos del contenedor acumula filas durante la ejecución; al ser un contenedor desechable, no tiene consecuencias.

Hay dos contextos de Spring distintos en la suite: el compartido por `ApiTestSupport` y `KrateApplicationTests`, y el de `DataInitializerTest`, que arranca con `app.seed.enabled=true` y un directorio de subida propio (`target/test-uploads-seed`) para no mezclar el seed con el resto de casos.

### 4.2 Por qué PostgreSQL en Testcontainers y no H2

El esquema de Krate depende de características que H2 no reproduce fielmente:

- El **índice único parcial** que garantiza una sola instancia activa por punto (`WHERE status = 'ACTIVE'`), del que depende la regla de negocio más importante del lanzamiento.
- La **restricción única de papeleta** por instancia y token de votante, que es lo que convierte un doble voto en un 409 también bajo concurrencia.
- Las **migraciones de Flyway** (`V1__init.sql`, `V2__voting_types.sql`) se aplican en cada arranque de test y, con `ddl-auto=validate`, Hibernate comprueba que las entidades coinciden con las tablas. Cualquier desajuste entre una entidad y su migración hace fallar `contextLoads` antes de ejecutar ningún caso.

El precio es necesitar Docker en la máquina de desarrollo y en el *runner* de CI, requisito que el proyecto ya tenía por el propio despliegue. El arranque del contenedor y del contexto supone unos segundos al principio de la ejecución; después, cada clase de test corre en décimas de segundo porque el contexto se reutiliza.

### 4.3 Casos por clase

| Clase | Casos | Qué comprueban |
| --- | --- | --- |
| `KrateApplicationTests` | `contextLoads` | La aplicación arranca contra PostgreSQL real: migraciones aplicadas, entidades validadas, beans construidos. Es el test que falla primero si una migración y una entidad divergen. |
| `AuthFlowTest` | `registerLoginAndMe`, `duplicateEmailIsRejected`, `wrongPasswordIsUnauthorized`, `protectedEndpointsRequireToken`, `validationErrorsAreReported` | Registro (201) seguido de `GET /api/auth/me` con el token y de un login que devuelve token y usuario. Registrar dos veces el mismo correo responde 409. Contraseña incorrecta responde 401. Sin token, `/api/auth/me` y `/api/items` responden 401. Un registro con correo mal formado, nombre vacío y contraseña corta responde 400 con un error por campo en `$.errors`. |
| `ItemsTest` | `crudWithImageAndOwnerIsolation`, `nameIsRequired` | Alta de un item con imagen PNG por `multipart` (201 con `imageUrl`); la imagen se sirve públicamente con `Content-Type: image/png`. Un segundo gestor no ve el item en su listado ni puede consultarlo por id (404). Edición con `removeImage=true` elimina la URL. Un fichero `text/plain` como imagen responde 400. El borrado responde 204 y el item desaparece del listado y del acceso por id. Un nombre en blanco responde 400 con `errors.name`. |
| `VotingFlowTest` | `fullLaunchVoteStopAndStatsFlow`, `launchRequiresAssignedVotingWithItems`, `votingWithForeignItemIsRejected`, `editPointAndVotingReassignmentBlockedWhileActive` | El caso principal recorre el ciclo completo: el punto nace con un código de 8 caracteres y una `publicUrl` que termina en `/p/{código}`; sin instancia responde `INACTIVE` y un código inexistente 404; lanzar devuelve `ACTIVE` y un segundo lanzamiento 409; con la instancia activa no se puede borrar la votación, un item ni el punto, ni cambiar la lista de items (409), pero sí renombrar la votación; la vista pública devuelve los items y `alreadyVoted=false`; votar responde 201, la misma consulta pasa a `alreadyVoted=true`, el segundo voto del mismo token 409 y un item inexistente 400; el listado de instancias activas del gestor contiene una; detener devuelve `CLOSED` con `endedAt`, detener dos veces 409 y votar tras el cierre 409; las estadísticas muestran 2 votos totales y el 100 % para Pizza; borrar el item Pizza lo quita de la votación pero sigue en las estadísticas con `deleted=true` y sus votos; borrar la votación deja el punto sin votación y sin poder lanzarse; borrar el punto hace que su código responda 404 y el histórico de estadísticas se conserva. Los dos casos siguientes comprueban que no se lanza un punto sin votación ni con una votación sin items (409 con el detalle "no tiene items"), y que una votación no puede incluir un item de otro gestor (400). El cuarto caso cubre la edición de un punto por `PUT /api/voting-points/{id}`: sin instancia se cambian nombre, descripción y votación asignada (200); un nombre en blanco responde 400 con `errors.name`; asignar una votación de otro gestor responde 404; con la instancia lanzada, cambiar la votación por otra o quitarla responde 409 con el detalle "instancia activa", mientras que renombrar y cambiar la descripción manteniendo la votación responde 200 con `activeInstance` en `ACTIVE`; tras detener la instancia, la votación vuelve a poder cambiarse. |
| `VotingTypesFlowTest` | `limitedVoting`, `rankingVoting`, `launchFailsWhenLimitExceedsRemainingItems` | Para `LIMITED`: crear sin `maxSelections`, con un máximo superior al número de items o con `maxSelections` en una votación `SINGLE` responde 400; la vista pública expone tipo, máximo e instrucciones "hasta 2"; una papeleta con tres items o con uno repetido responde 400, la válida 201, la segunda del mismo token 409; cambiar el tipo con instancia activa responde 409; las estadísticas muestran `scoringLabel="votos"` y el item más votado con 3 votos y el 100 %. Para `RANKING`: la vista pública no expone `maxSelections`; con las papeletas [A, B, C], [B, A] y [A] las estadísticas devuelven `scoringLabel="puntos"`, A con 8 puntos, 2 primeros puestos y posición media 1,33, B con 5 y C con 1, los mismos números que el test unitario de Borda, ahora atravesando la base de datos. El tercer caso borra un item de una votación `LIMITED` con máximo 3 y comprueba que, al quedar 2 items, el lanzamiento responde 409. |
| `StatsFlowTest` | `votingAggregatesAcrossPointsAndFiltersByPoint`, `itemHistoryAcrossVotings` | Estadísticas por votación, por punto y por item (RF-30, RF-31 y RF-32). El primer caso lanza la misma votación `SINGLE` en dos puntos y reparte cuatro papeletas (3 a Pizza, 1 a Pasta): `GET /api/stats/votings/{id}` suma los dos lanzamientos (2 lanzamientos, 4 participaciones, Pizza al 75 %, dos puntos en el selector), con `votingPointId` solo cuenta el punto elegido (1 lanzamiento, 2 participaciones, 50 % cada item) y con un punto ajeno devuelve resultados a cero sin error; `GET /api/stats/instances` acepta los filtros `votingPointId` y `votingId` (una fila, una fila combinando ambos, ninguna para una votación nunca lanzada) y cada fila expone `votingPointId` y `votingId`; otro gestor recibe 404 y un listado vacío; tras detener ambos lanzamientos y borrar la votación, los resultados agregados se conservan con `votingDeleted=true`. El segundo caso hace participar a Pizza en una votación `SINGLE` (gana con 3 de 4 papeletas, 75 %) y en una `RANKING` de tres items (7 puntos Borda de 9, segundo puesto, posición media 1,67, un primer puesto, 77,8 %): `GET /api/stats/items/{id}` devuelve 2 participaciones ordenadas de la más reciente a la más antigua, 6 papeletas, 1 victoria y un porcentaje medio de 76,4; un item candidato sin votos cuenta como participación en último puesto sin victorias; un item nunca usado devuelve cero participaciones e historial vacío; otro gestor recibe 404; y el item borrado lógicamente conserva su historial con `deleted=true`. |
| `DataInitializerTest` | `seedsTestManagerWithItemsVotingsAndPoints` | Con `app.seed.enabled=true` el arranque crea exactamente 1 gestor, 10 items, 3 votaciones (una de cada tipo) y 2 puntos con votación asignada. El gestor semilla puede hacer login y listar sus dos puntos por la API. Protege el flujo de demostración y la prueba de carga, que dependen de estos datos. |

### 4.4 Trazabilidad con las reglas de negocio

Las reglas transversales enumeradas en la sección 2.7 de `ARQUITECTURA.md` quedan cubiertas así:

| Regla | Test que la ejercita |
| --- | --- |
| Aislamiento por gestor: un id ajeno devuelve 404 | `ItemsTest.crudWithImageAndOwnerIsolation` (listado vacío y 404 para el segundo gestor); `VotingFlowTest.votingWithForeignItemIsRejected` (item ajeno en una votación, 400) |
| Una instancia activa por punto | `VotingFlowTest.fullLaunchVoteStopAndStatsFlow` (segundo lanzamiento 409) |
| Una papeleta por dispositivo e instancia | `VotingFlowTest.fullLaunchVoteStopAndStatsFlow`, `VotingTypesFlowTest.limitedVoting` y `rankingVoting` (segundo voto del mismo token 409); bajo concurrencia, escenario `duplicados` de k6 (sección 7) |
| Contenido de la papeleta validado por la estrategia | Los cuatro tests unitarios de `voting/strategy`; por API, los 400 de `limitedVoting` y `rankingVoting` |
| Bloqueos con instancia activa (borrar votación, items o punto; cambiar items, tipo o máximo; cambiar la votación asignada al punto) | `VotingFlowTest.fullLaunchVoteStopAndStatsFlow` (borrados y cambio de items); `VotingTypesFlowTest.limitedVoting` (cambio de tipo); `VotingFlowTest.editPointAndVotingReassignmentBlockedWhileActive` (cambiar o quitar la votación del punto, 409) |
| Nombre y descripción editables con instancia activa | `VotingFlowTest.fullLaunchVoteStopAndStatsFlow` (renombrado de la votación a "Cena de viernes", 200); `VotingFlowTest.editPointAndVotingReassignmentBlockedWhileActive` (renombrado del punto manteniendo la votación, 200) |
| Borrado lógico: desaparece de listados, no se lanza, el código responde 404, las estadísticas lo conservan | `ItemsTest.crudWithImageAndOwnerIsolation`; `VotingFlowTest.fullLaunchVoteStopAndStatsFlow` (item borrado con `deleted=true` en estadísticas, punto borrado con 404 público e histórico intacto) |
| Votación asignada borrada: el punto queda sin votación y no se lanza | `VotingFlowTest.fullLaunchVoteStopAndStatsFlow`; `VotingFlowTest.launchRequiresAssignedVotingWithItems` |
| Resultados agregados por votación y filtro por punto (RF-30, RF-31) | `StatsFlowTest.votingAggregatesAcrossPointsAndFiltersByPoint` (suma de dos lanzamientos, filtro por punto en el agregado y en el listado, votación borrada con histórico intacto) |
| Historial de un item a lo largo de las votaciones (RF-32) | `StatsFlowTest.itemHistoryAcrossVotings` (puesto, puntos y porcentaje en `SINGLE` y `RANKING`, victorias, media, item sin votos, item nunca usado, item borrado) |
| Lanzamiento exige votación con items suficientes | `VotingFlowTest.launchRequiresAssignedVotingWithItems`; `VotingTypesFlowTest.launchFailsWhenLimitExceedsRemainingItems` |
| Imágenes: solo JPEG, PNG y WebP; se sirven públicamente | `ItemsTest.crudWithImageAndOwnerIsolation` (PNG aceptado y servido, `text/plain` rechazado) |
| Validación de entrada con un error por campo | `AuthFlowTest.validationErrorsAreReported`; `ItemsTest.nameIsRequired` |
| Endpoints de gestión protegidos por JWT | `AuthFlowTest.protectedEndpointsRequireToken`; todos los demás tests, que solo obtienen acceso con un token emitido por la propia API |

Las únicas reglas de la sección 2.7 sin test automático propio son el límite de 5 MB por imagen y el nombrado UUID de los ficheros subidos (véase la sección 9).

---

## 5. Pruebas unitarias de los frontends

Las dos aplicaciones Angular 22 usan el ejecutor que la CLI configura por defecto: el *builder* `@angular/build:unit-test` con **Vitest 4** y **jsdom** como entorno de navegador simulado. No hay Karma ni Jasmine. La configuración es mínima:

- `angular.json`: el objetivo `test` solo declara el *builder*; el patrón `src/**/*.spec.ts` y el entorno jsdom son los valores por defecto.
- `tsconfig.spec.json`: extiende el `tsconfig.json` de la aplicación y añade `"types": ["vitest/globals"]`, por lo que `describe`, `it` y `expect` están disponibles sin importarlos.
- `package.json`: script `test` (`ng test`) y dependencias de desarrollo `vitest` y `jsdom`.

Cada aplicación tiene un fichero de pruebas de arranque, `src/app/app.spec.ts`, que monta el componente raíz con `TestBed`, proporcionando un enrutador vacío (`provideRouter([])`) y un cliente HTTP (`provideHttpClient()`). El panel añade dos ficheros que prueban piezas con lógica propia sustituyendo `ApiService` por un doble (`vi.fn()`), sin cliente HTTP real:

| Aplicación | Fichero | Casos | Qué comprueban |
| --- | --- | --- | --- |
| `management-app` | `app.spec.ts` | `should create the app`, `should render the router outlet` | El componente raíz se instancia con sus dependencias y, una vez estable, el DOM contiene el `router-outlet` sobre el que se montan las páginas. |
| `management-app` | `features/stats/stats-list.page.spec.ts` | `deriva las opciones de los selectores de los lanzamientos cargados`, `vuelve a pedir los lanzamientos al backend con el punto elegido` | Con dos lanzamientos de la misma votación en puntos distintos, los selectores ofrecen "Todos" más cada punto y una sola entrada por votación; al elegir un punto la página vuelve a llamar a `listStats` con `votingPointId`, muestra solo la fila devuelta y el botón "Quitar filtros", y limpiar vuelve a pedir el listado sin filtros (RF-31). |
| `management-app` | `shared/results-list.component.spec.ts` | `destaca al ganador, marca los items eliminados y enlaza al historial`, `muestra los datos de ranking solo en votaciones RANKING` | El componente de clasificación compartido por el detalle de un lanzamiento y los resultados por votación: la primera fila con puntos lleva la clase `winner`, el item borrado muestra su badge, la unidad se pluraliza ("3 votos", "1 voto"), la barra mide el porcentaje y el nombre enlaza a `/estadisticas/items/{id}` (entrada al historial, RF-32); los datos de posición media solo aparecen en `RANKING`. |
| `voting-app` | `app.spec.ts` | `should create the app` | El componente raíz se instancia con sus dependencias. |

Los tests de arranque son una **prueba de humo de la configuración**: confirman que el árbol de inyección de dependencias del componente raíz se resuelve, que la configuración de Vitest y jsdom funciona en cada aplicación y que el paso `ng test` del workflow tiene algo que ejecutar y que puede fallar. Los dos ficheros de estadísticas muestran el patrón para probar páginas sin backend: un objeto con funciones `vi.fn()` en lugar de `ApiService` y aserciones sobre el DOM renderizado. El resto de la lógica de las páginas descansa en dos apoyos distintos:

- **`ng build` como comprobación estática.** Ambos proyectos compilan con las comprobaciones adicionales del compilador de TypeScript que activa la CLI (`noImplicitReturns`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`) y con compilación anticipada de plantillas, de modo que un componente o una propiedad desconocidos en una plantilla, o un tipo incompatible en el código, hacen fallar la construcción. El workflow ejecuta `ng build` antes que `ng test` por eso.
- **La API probada de extremo a extremo.** Los frontends no contienen reglas de negocio: muestran lo que la API devuelve y envían lo que el usuario elige. Los códigos de estado que interpretan (400, 401, 404, 409) son exactamente los que los tests de integración del backend fijan.

La sección 9 recoge qué partes del frontend merecerían tests unitarios propios.

---

## 6. Comprobaciones manuales de extremo a extremo

No hay una herramienta de extremo a extremo automatizada (Playwright, Cypress). En su lugar, durante el desarrollo y antes del primer despliegue se hicieron comprobaciones manuales sobre la pila Docker completa, que es el único entorno donde intervienen nginx, el proxy hacia el backend y los volúmenes:

- **`curl` contra la pila local** (`docker compose up --build -d`): confirma que el panel en `:8081` y la voting app en `:8082` sirven la aplicación, que `/api/` llega al backend a través de nginx y que las imágenes subidas se sirven desde el volumen `uploads`.
- **Capturas con Chromium en modo headless**: renderizado real de las pantallas servidas por Docker, con inyección de la sesión del gestor y simulación de toques en la papeleta. Sirve para revisar la presentación en móvil de la voting app y el resultado de los estados de la pantalla de voto (activa, ya votado, inactiva). El mismo mecanismo se usa para capturar los informes de carga para la memoria (`load/README.md`).
- **Validación de la pila de producción en local** antes del primer despliegue: se levantó el *override* completo con `VOTING_HOST=voto.localhost` y `PANEL_HOST=panel.localhost` (Caddy emite certificados internos para `*.localhost`), se comprobó con `curl -k` que ambas aplicaciones y la API respondían a través de Caddy y que ningún puerto interno quedaba publicado. `docker compose config` con los dos ficheros de Compose valida la sintaxis del *override* antes de cada cambio.

Estas comprobaciones no forman parte del código entregado ni del workflow: cubren lo que los tests automáticos no ven (configuración de nginx, cabeceras del proxy, TLS de Caddy, apariencia) a cambio de tener que repetirlas a mano cuando cambia la infraestructura.

---

## 7. Pruebas de carga de la API pública

### 7.1 Qué se carga y por qué

El panel de gestión lo usa un gestor a la vez; la parte pública, en cambio, la usan muchos dispositivos simultáneamente cuando varios votantes escanean el mismo QR. Solo dos endpoints reciben esa concurrencia:

- `GET /api/public/points/{code}`: consulta del punto, con el estado de la votación y, si el dispositivo envía `X-Voter-Token`, si ya ha votado.
- `POST /api/public/points/{code}/votes`: envío de la papeleta.

La prueba de carga se limita a ellos y persigue dos objetivos: medir el tiempo de respuesta bajo carga sostenida y demostrar que la restricción única de papeleta resiste envíos simultáneos con el mismo token, algo que los tests de integración, secuenciales, no pueden probar.

### 7.2 Diseño del guion

`load/vote.js` es un guion de k6 parametrizado por variables de entorno: `CODE` (obligatoria, el código del punto), `BASE_URL` (`http://localhost:8080` por defecto; `http://localhost:8082` para pasar por el nginx de la voting app), `VUS` (100), `DURATION` (`30s`) y `OUT_DIR` (`load/results`).

Antes de cargar, `setup()` consulta el punto una sola vez y aborta si no responde 200 o no tiene una votación activa, para que un código equivocado no produzca treinta segundos de errores 404 en lugar de un mensaje claro. Devuelve la votación a los escenarios, que la usan para elegir items.

Dos escenarios corren en paralelo durante toda la duración, ambos con el ejecutor `constant-vus`:

| Escenario | Usuarios virtuales | Iteración |
| --- | --- | --- |
| `votantes` | `VUS` (100) | Genera un token de dispositivo nuevo (`k6-{VU}-{iteración}-{tiempo}-{aleatorio}`), hace el `GET` del punto con ese token y comprueba 200, `ACTIVE` y `alreadyVoted=false`. Elige items como haría la voting app según el tipo: uno en `SINGLE`, entre 1 y `maxSelections` en `LIMITED`, todos en orden aleatorio en `RANKING`. Envía el `POST` y comprueba 201, que la respuesta devuelve los mismos `itemIds` en el mismo orden (lo que en `RANKING` verifica que se conserva la posición) y que incluye `instanceId`. |
| `duplicados` | `VUS / 10` (10) | Genera un token y un cuerpo de papeleta, y envía dos `POST` idénticos **a la vez** con `http.batch`. Cuenta cuántas respuestas son 201 y cuántas 409, registra en `krate_duplicate_accepted` si hubo más de una 201 y comprueba que hay exactamente una de cada. |

Cada petición alimenta métricas propias, separadas por endpoint para poder ponerles umbrales distintos: `krate_get_point_duration` y `krate_vote_duration` (tendencias de tiempo de respuesta), `krate_unexpected_errors` (proporción de respuestas 5xx o sin respuesta) y `krate_duplicate_accepted`. Las 409 del escenario `duplicados` son el comportamiento correcto y no cuentan como error.

Al terminar, `handleSummary` vuelve a consultar el punto (los datos de `setup` no llegan a esa fase), compone el nombre `<fecha>_<tipo>_<vus>vus_<duración>.html` y delega en `load/report.js`, un generador sin dependencias externas que produce un informe HTML autocontenido en español: configuración de la ejecución, indicadores principales, cada umbral frente a su límite, tabla de percentiles por endpoint y comprobaciones funcionales agrupadas por escenario. Por consola solo se imprime un resumen breve. Se descartaron el panel integrado de k6, que exporta gráficas genéricas sin el contexto de la votación, y la librería `benc-uk/k6-reporter`, que se importa desde una URL externa.

### 7.3 Umbrales

k6 termina con código de salida distinto de cero si alguno no se cumple, de modo que la prueba tiene un resultado binario además de las cifras:

| Métrica | Umbral | Qué protege |
| --- | --- | --- |
| `krate_get_point_duration` | p95 < 300 ms | La pantalla de voto aparece sin espera perceptible tras escanear el QR. |
| `krate_vote_duration` | p95 < 500 ms | La confirmación del voto llega antes de que el votante dude si ha funcionado. |
| `krate_unexpected_errors` | tasa < 1 % | El backend no devuelve 5xx ni cierra conexiones bajo carga. |
| `krate_duplicate_accepted` | tasa == 0 | Ningún par de envíos simultáneos con el mismo token produce dos papeletas. |

Los dos primeros son objetivos de experiencia de usuario fijados con margen sobre lo que se esperaba medir en local; los dos últimos son condiciones de corrección y no admiten margen.

### 7.4 Resultados

El repositorio incluye en `load/results/` un informe por tipo de votación, generados el 5 de septiembre de 2026 contra el backend directo (`http://localhost:8080`) con la pila Docker local, los datos del seed, 100 usuarios virtuales en `votantes`, 10 en `duplicados` y 30 segundos de duración. Los cuatro umbrales se cumplieron en los tres, con 0 errores inesperados y 0 duplicados aceptados.

| Informe | Votación | Items | Peticiones | Peticiones/s | Papeletas (201) | Pares duplicados | p95 GET | p95 POST |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `2026-09-05_14-08-17_single_100vus_30s.html` | Producto favorito (`SINGLE`) | 10 | 204.849 | 6.821 | 102.424 | 15.199 | 29,9 ms | 31,4 ms |
| `2026-09-05_14-07-47_limited_100vus_30s.html` | Tus tres imprescindibles (`LIMITED`) | 10 | 199.227 | 6.634 | 99.613 | 14.789 | 30,8 ms | 32,4 ms |
| `2026-09-05_14-07-16_ranking_100vus_30s.html` | Ranking de snacks (`RANKING`) | 6 | 169.815 | 5.653 | 84.907 | 12.474 | 35,8 ms | 38,2 ms |

Percentiles completos por endpoint (milisegundos):

| Tipo | Endpoint | mín | media | mediana | p90 | p95 | p99 | máx |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SINGLE` | GET | 0,35 | 16,4 | 16,0 | 18,8 | 29,9 | 34,1 | 116 |
| `SINGLE` | POST | 1,45 | 17,8 | 17,9 | 21,0 | 31,4 | 35,9 | 128 |
| `LIMITED` | GET | 0,33 | 16,8 | 16,4 | 19,3 | 30,8 | 35,1 | 90,9 |
| `LIMITED` | POST | 1,53 | 18,4 | 18,4 | 21,6 | 32,4 | 36,9 | 104 |
| `RANKING` | GET | 0,30 | 19,4 | 18,0 | 31,4 | 35,8 | 64,7 | 239 |
| `RANKING` | POST | 1,73 | 21,7 | 20,4 | 33,7 | 38,2 | 68,0 | 234 |

Todas las comprobaciones funcionales (códigos de estado, contenido de la respuesta, una sola 201 por par duplicado) pasaron al 100 % en las tres ejecuciones.

### 7.5 Interpretación y límites de la medida

- **Margen sobre los umbrales.** Los p95 medidos están un orden de magnitud por debajo de los límites (30-38 ms frente a 300 y 500 ms). Con 100 usuarios virtuales sin pausa, el backend sostiene entre 5.600 y 6.800 peticiones por segundo en un portátil de desarrollo, que equivale a unas 85.000-102.000 papeletas en medio minuto: muy por encima de cualquier votación presencial real.
- **La papeleta única resiste la concurrencia.** Entre 12.000 y 15.000 pares de envíos simultáneos por ejecución, ninguno produjo dos papeletas. Es la restricción única de `ballots` en PostgreSQL, traducida a 409 por el backend, la que lo garantiza; el escenario `duplicados` es su única prueba bajo concurrencia real.
- **`RANKING` es el tipo más costoso.** Cada papeleta inserta una fila de voto por item ordenado, frente a una en `SINGLE`, y el p99 sube de 34-37 ms a 65-68 ms. La comparación no es del todo homogénea porque la votación del seed de tipo `RANKING` tiene 6 items y las otras dos 10, pero la tendencia es la esperada.
- **Es una prueba de capacidad, no de usuarios reales.** El escenario `votantes` no incluye tiempo de reflexión (`sleep`) entre peticiones: cada usuario virtual vota tantas veces como puede. Por tanto 100 usuarios virtuales representan una carga muy superior a 100 personas votando, y las cifras deben leerse como capacidad máxima sostenida, no como "100 votantes concurrentes".
- **Solo contra el backend directo.** Los tres informes se generaron contra `:8080`. El guion permite medir a través del nginx de la voting app (`BASE_URL=http://localhost:8082`), pero no hay ninguna ejecución guardada con esa configuración.

La prueba de carga queda **fuera del workflow de GitHub Actions** a propósito: sobre un *runner* compartido las cifras no son reproducibles ni comparables entre ejecuciones, y alargarían cada despliegue sin aportar una comprobación de corrección que los tests de integración no den ya. Se lanza a mano contra la pila local siguiendo `load/README.md`, que explica cómo dejar una votación activa, las variables disponibles y cómo leer el informe.

---

## 8. Ejecución y automatización

**En local.** Los tres niveles automáticos se ejecutan con los comandos de la sección "Verificación" de `README.md`:

```bash
cd Krate && ./mvnw verify                    # unitarias + integración; requiere Docker en marcha
cd management-app && npm run build && npx ng test --watch=false
cd voting-app && npm run build && npx ng test --watch=false
```

En el backend no hay separación entre fases `test` e `integration-test`: al no usar el plugin Failsafe ni el sufijo `*IT`, todos los tests corren en Surefire durante la fase `test`. Lo que `verify` añade es el informe de cobertura.

**Cobertura con JaCoCo.** `jacoco-maven-plugin` (versión fijada en la propiedad `jacoco.version` de `Krate/pom.xml`, porque el BOM de Spring Boot no la gestiona) tiene dos ejecuciones: `prepare-agent` engancha el agente a la JVM de Surefire, de modo que se registra el código ejecutado tanto por los tests unitarios como por los de integración, que arrancan la aplicación en el mismo proceso; `report`, en la fase `verify`, escribe el informe en `Krate/target/site/jacoco/` en tres formatos: `index.html` para navegarlo por paquete, clase y línea, `jacoco.xml` para herramientas externas y `jacoco.csv` para extraer cifras. Se excluyen del cálculo `KrateApplication`, las clases `*Dtos` (records sin lógica) y `AppProperties`, para que la cifra refleje el código con comportamiento. No hay ejecución `check`: un descenso de cobertura no hace fallar la construcción. La ejecución de referencia está resumida en la sección 2.

**En GitHub Actions.** El trabajo `test` de `.github/workflows/deploy.yml` ejecuta esos mismos comandos en un *runner* `ubuntu-latest` en cada `push` a `main`: Java 21 con `./mvnw -B verify` (Testcontainers usa el Docker del *runner*) y Node 22 con `npm ci`, `ng build` y `ng test` en las dos aplicaciones. Los trabajos `build-push` y `deploy` dependen de él con `needs`, de modo que una versión que no pasa los tests nunca se publica en GHCR ni llega al servidor. El detalle del flujo de despliegue está en la sección 1.2 de `ARQUITECTURA.md`.

**En la imagen Docker.** `Krate/Dockerfile` compila con `mvn -B -q -DskipTests package`. Los tests no se ejecutan dentro de la construcción de la imagen porque Testcontainers necesitaría acceso a un demonio Docker desde dentro del *build*, y porque ya se han ejecutado en el trabajo anterior del workflow sobre el mismo *commit*.

**Datos de prueba.** El `DataInitializer` (activado con `APP_SEED_ENABLED=true` en `.env`) vacía todas las tablas en cada arranque y crea el gestor `gestor-test@gmail.com` con contraseña `gestor-test123`, 10 items, 3 votaciones (una por tipo) y 2 puntos. Es el estado de partida de la prueba de carga y de las comprobaciones manuales; `DataInitializerTest` garantiza que sigue existiendo con esa forma. En producción el seed está forzado a `false`.

---

## 9. Limitaciones y ampliaciones

Lo que no se prueba, o se prueba solo de forma indirecta, y cuál sería el siguiente paso en cada caso:

- **Frontends con pocas pruebas unitarias.** Fuera de la lista de estadísticas y del componente de resultados, las piezas con lógica propia no tienen tests unitarios: en `management-app`, `core/auth.service.ts` (persistencia del token y del usuario en `localStorage`), `core/auth.guard.ts`, `core/auth.interceptor.ts` (cabecera `Authorization` y cierre de sesión al recibir 401) y la traducción de errores HTTP a mensajes de `core/errors.ts`; en `voting-app`, `core/voter-token.service.ts` (generación con `crypto.randomUUID` y persistencia del token de dispositivo) y la máquina de estados de `pages/vote.page.ts` (`loading`, `not-found`, `inactive`, `vote`, `done`, `error`). Son candidatos directos a tests con Vitest y `HttpTestingController`, sin necesidad de navegador.
- **Sin umbral de cobertura.** JaCoCo mide la cobertura del backend, pero no hay una ejecución `check` que haga fallar `verify` si baja de un mínimo, así que nada impide que una parte nueva quede sin tests. Con la cifra actual (92 % de instrucciones, 82 % de ramas) un umbral razonable sería 85 % y 75 % respectivamente, con margen para no romper la construcción por un cambio pequeño. En los frontends no se mide cobertura: con tres tests de arranque la cifra sería casi cero y no aportaría información hasta que existan tests de servicios.
- **Sin extremo a extremo automatizado.** Las comprobaciones de la sección 6 son manuales y se repiten a mano cuando cambia nginx, Caddy o una pantalla. Playwright contra la pila Docker sería el paso natural, empezando por el flujo lanzar desde el panel, votar desde la voting app y ver la estadística.
- **Clases del backend sin test unitario propio.** `auth/JwtService` (token expirado o con firma manipulada), `votingpoint/CodeGenerator` (solo se comprueba la longitud del código dentro del flujo), `item/ImageStorageService` (límite de 5 MB, nombrado UUID, recorrido de ruta) y la configuración CORS de `SecurityConfig`. Todas se ejercitan de refilón por los tests de integración, pero un fallo en ellas se manifestaría como un error de flujo, no como un caso dirigido. El informe de JaCoCo lo ilustra: `JwtService` está al 100 % de líneas y `SecurityConfig` también, porque cada petición autenticada las atraviesa, y sin embargo ningún test comprueba qué pasa con un token caducado o un origen CORS no permitido. La cobertura de líneas mide qué código se ejecuta, no qué escenarios se verifican.
- **Paquete con menos cobertura.** `item` (79,0 % de instrucciones, 62,5 % de ramas) es el que más código con lógica deja sin recorrer. Según el informe, no se ejecutan la sustitución de una imagen por otra en `ItemService`, el rechazo de nombres de fichero no válidos y los errores de escritura en disco de `ImageStorageService`, ni el 404 y los tipos JPEG y WebP de `FileController`. Son los primeros candidatos si se añade un umbral. El informe ya sirvió para detectar y cerrar un hueco funcional: la edición de un punto de votación y el bloqueo del cambio de votación asignada con instancia activa no tenían test hasta que la cobertura de `VotingPointService` lo hizo visible.
- **Repositorios sin `@DataJpaTest`.** Las consultas propias (`findAllActiveByOwner`, `findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc`) solo se validan a través de los listados de la API.
- **Acumulación de datos entre tests.** Al no usar rollback, la base de datos del contenedor crece durante la ejecución. Hoy es inocuo porque cada test crea su propio gestor, pero un test que consultara datos globales (por ejemplo, el total de usuarios) dependería del orden de ejecución. `DataInitializerTest` evita el problema con un contexto propio.
- **Carga solo contra el backend directo.** Falta una ejecución guardada a través del nginx de la voting app (`BASE_URL=http://localhost:8082`) que mida el coste del proxy, y un escenario con tiempo de reflexión que se aproxime a votantes reales en lugar de a capacidad máxima.
