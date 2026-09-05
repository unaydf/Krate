# Krate · Desarrollo del proyecto

Este documento recoge cómo se construyó Krate sprint a sprint: qué se había planificado, qué se hizo realmente, en qué se desvió el trabajo del plan y por qué, qué patrones de diseño fueron apareciendo, qué dificultades surgieron y cómo se resolvieron. Complementa a `ARQUITECTURA.md` (qué es el sistema), `TECNOLOGÍAS.md` (con qué está hecho) y `TESTING.md` (cómo se verifica), que describen el resultado final; aquí se describe el camino.

## 1. Metodología

El proyecto lo desarrolló una sola persona, por lo que se adoptó una versión reducida de Scrum:

- **Sprints de una semana**, nueve en total (Sprint 0 a Sprint 8), con una dedicación de entre 20 y 25 horas por sprint (4-5 horas diarias de lunes a viernes).
- **Product Owner (PO)**: el papel lo asumió el tutor, con quien se validaron los requisitos y se consultaron las decisiones que afectaban al alcance.
- **Planificación al inicio de cada sprint**: se seleccionan del backlog las historias que caben en la capacidad de la semana y se descomponen en tareas con estimación en horas.
- **Revisión y retrospectiva al cierre**: se comprueba qué historias quedaron terminadas (criterio: funcionalidad probada de extremo a extremo, no solo escrita), se anotan las horas reales y se decide qué pasa al sprint siguiente.
- **Tablero Kanban** con columnas *Backlog*, *Sprint*, *En curso*, *Bloqueado* y *Hecho*. Se empezó con Jira y se cambió a Trello (Sprint 1).
- **Sin ramas de larga duración**: al ser un único desarrollador se trabajó sobre `main`, con la regla de no dejar el proyecto sin compilar al final del día.

La planificación inicial se hizo antes de escribir la primera línea de código y no se modificó después: sirvió como referencia fija contra la que medir la desviación. Las secciones de cada sprint reflejan esa comparación.

## 2. Planificación inicial

Los nueve sprints se organizaron en cuatro fases según los objetivos generales que abordan:

| Fase | Sprints | Objetivo |
| --- | --- | --- |
| **Fase 0: Lanzamiento y requisitos** | 0 y 1 | Sprint 0: preparación logística, entornos de desarrollo locales y herramientas de gestión. Sprint 1: ingeniería de requisitos, backlog inicial y modelo de dominio. |
| **Fase 1: Núcleo del sistema y administración** | 2 y 3 | Sprint 2: infraestructura del backend, base de datos relacional en contenedor, operaciones CRUD esenciales e integración continua básica. Sprint 3: panel de gestión. |
| **Fase 2: Funcionalidad cliente y analítica** | 4 y 5 | Sprint 4: lógica e interfaz de votación, generación y permanencia de códigos QR. Sprint 5: dashboard visual de estadísticas. |
| **Fase 3: Calidad, despliegue y cierre** | 6, 7 y 8 | Sprint 6: refuerzo de la seguridad y pruebas de rendimiento. Sprint 7: despliegue continuo hacia la nube y testing final. Sprint 8: margen de estabilización, corrección de defectos menores y puesta a punto. |

Capacidad prevista: 9 sprints × 20-25 h = 180-225 h.

## 3. Cómo leer las fichas de sprint

Cada sprint tiene las mismas secciones:

- **Objetivo planificado**: lo que decía la planificación inicial.
- **Trabajo realizado**: qué se construyó.
- **Desviación**: qué entró que no estaba previsto, qué salió y a dónde se movió.
- **Horas**: tabla de tareas con horas reales (redondeadas a la hora).
- **Patrones aplicados**: patrones de diseño que aparecen por primera vez en ese sprint.
- **Dificultades**: problemas encontrados y su solución.
- **Capturas**: figuras a incluir. El documento deja el marcador y el nombre de fichero sugerido dentro de `capturas/`; las imágenes se toman del producto final, así que muestran la versión definitiva de cada pantalla aunque la primera versión se hiciera en ese sprint.
- **Estado al cierre**: qué se podía hacer con el sistema al terminar la semana.

---

## 4. Sprint 0 · Lanzamiento

### Objetivo planificado

Preparación logística, aprovisionamiento de los entornos de desarrollo locales y configuración inicial de las herramientas de gestión.

### Trabajo realizado

Se preparó el entorno de desarrollo sobre **Windows**, que era el sistema habitual del portátil: Java 21, Node 22, Docker Desktop, IntelliJ IDEA para el backend y VS Code para las aplicaciones Angular. Se creó el repositorio en GitHub con un `.gitignore` que excluye secretos, configuración de IDE y salidas de compilación.

Para la gestión se configuró un proyecto en **Jira** con un tablero Scrum, las cuatro fases como épicas y los nueve sprints creados por adelantado. Se definió el flujo de estados y se cargaron las primeras historias de alto nivel.

Se generaron los esqueletos de las tres aplicaciones: el backend desde Spring Initializr (Spring Boot 4.1, Java 21, Maven, con Web, Data JPA, Validation, Security, Flyway, PostgreSQL y soporte de Docker Compose, que levanta la base de datos al arrancar la aplicación) y las dos aplicaciones Angular 22 con `ng new`, ambas con Prettier, configuración estricta de TypeScript y un proxy de desarrollo que reenvía `/api` al backend para que ningún componente conozca su URL.

Se mantuvo una primera reunión con el PO para fijar el alcance general y el calendario de revisiones, y se dedicaron dos horas a leer las notas de versión de Spring Boot 4 y Angular 22, ambas muy recientes en el momento de empezar.

### Desviación

Mínima en contenido. Jira consumió más tiempo del previsto (cinco horas frente a dos estimadas) por la cantidad de opciones que hubo que configurar o desactivar para un proyecto de una persona. Ese exceso ya anticipaba el cambio de herramienta del sprint siguiente.

### Horas

| Tarea | Horas |
| --- | --- |
| Instalación y verificación de entornos en Windows (Java, Node, Docker Desktop, IDEs) | 4 |
| Repositorio GitHub y convenciones | 2 |
| Configuración de Jira (proyecto, épicas, sprints, flujo) | 5 |
| Esqueletos del backend y de las dos aplicaciones Angular | 6 |
| Lectura de notas de versión de Spring Boot 4 y Angular 22 | 2 |
| Reunión inicial con el PO y planificación | 2 |
| **Total** | **21** |

### Patrones aplicados

Ninguno de diseño todavía. Se fijaron dos convenciones que condicionan lo que viene después: en el backend, un paquete por concepto de negocio (no por capa técnica); en los frontends, componentes standalone con plantilla y estilos en el propio fichero.

### Dificultades

- **Spring Boot 4 recién publicado.** Los starters cambiaron de nombre respecto a la versión 3 y buena parte de los ejemplos disponibles fallaban al compilar. Se resolvió leyendo la guía de migración oficial en lugar de tutoriales.
- **Docker Desktop en Windows.** El arranque era lento y la primera ejecución del backend con la base de datos en contenedor tardaba mucho más de lo esperado. Se anotó como algo a vigilar.

### Capturas

No hay pantallas de producto en este sprint.

### Estado al cierre

Tres aplicaciones vacías que compilan y arrancan; el backend responde con la base de datos en contenedor; repositorio y tablero listos.

---

## 5. Sprint 1 · Ingeniería de requisitos (I)

### Objetivo planificado

Ingeniería de requisitos: obtención y especificación de requisitos, estructuración del backlog inicial y diseño del modelo de dominio.

### Trabajo realizado

Se decidió hacer una especificación de requisitos completa y no un simple listado, con la idea de que sirviera de base para la memoria y de contrato con el PO. El trabajo siguió este orden:

- **Obtención.** Dos reuniones con el PO y análisis del caso de uso de referencia: votaciones en puntos físicos, por ejemplo elegir los productos de una máquina expendedora escaneando un QR. Se recogieron también escenarios en los que el "punto" no es un lugar sino un canal (una clase, un stand, un grupo).
- **Actores y modelo de personas.** Dos actores: el **gestor**, que crea el contenido y lanza votaciones desde un panel, y el **votante**, que solo dispone de un móvil y un enlace o QR. Para cada uno se redactó una *persona* con contexto, objetivos y frustraciones, que después sirvió para decidir qué pantallas debían ser más simples.
- **Requisitos funcionales (RF)** numerados y priorizados: registro e inicio de sesión de gestores; gestión de items con imagen opcional; votaciones como lista ordenada de items; puntos de votación con enlace público fijo; lanzar y detener la votación de un punto; votar sin registro; una sola participación por dispositivo; estadísticas por lanzamiento; conservación del histórico aunque se borre contenido.
- **Requisitos no funcionales (RNF)**: interfaz de voto pensada para móvil y utilizable con una mano; sin dependencias de red externas en la aplicación de voto; cada gestor ve solo sus datos; API única documentada; despliegue con contenedores; **plataforma generalizada**, es decir, no atada a un dominio de aplicación concreto.
- **Casos de uso** con flujo principal y alternativos para gestor y votante.
- **Historias de usuario** derivadas de los casos de uso, con criterios de aceptación, que pasaron a ser el backlog.

**Cambio de Jira a Trello.** Al cargar las historias se hizo evidente que Jira añadía fricción sin aportar nada a un equipo de una persona: campos obligatorios, estimaciones en puntos que nadie iba a comparar, informes que no se consultarían. Se migró el backlog a un tablero de Trello con etiquetas por fase y un campo de horas en la descripción de cada tarjeta.

**Cambio de Windows a Linux.** Las molestias con Docker Desktop del sprint anterior se repitieron: funciona sobre una máquina virtual (WSL 2), el arranque y los volúmenes montados desde el sistema de ficheros de Windows eran lentos, y los scripts de shell del proyecto (el *wrapper* de Maven y los que se preveían para el despliegue) exigían adaptaciones. Para evitar problemas en el futuro y aprovechando la familiaridad con Linux se migró el entorno. A partir de aquí Docker Engine corre de forma nativa.

### Desviación
tados desde el sistema de ficheros de Windows eran lentos, y los scripts de shell del proyecto (el *wrapper* de Maven y los que se preveían para el
- **La especificación no terminó en el sprint.** Faltaban las matrices de trazabilidad, la revisión con el PO y el modelo de dominio, previstos para esta semana. Se decidió no recortar la especificación y continuar en el Sprint 2, asumiendo que toda la planificación posterior se desplazaría.
- La migración a Linux no estaba prevista (cuatro horas).

### Horas

| Tarea | Horas |
| --- | --- |
| Reuniones con el PO y análisis del caso de uso | 3 |
| Actores y modelo de personas | 3 |
| Requisitos funcionales y no funcionales | 6 |
| Casos de uso | 4 |
| Historias de usuario y backlog (migración de Jira a Trello) | 4 |
| Migración del entorno de Windows a Linux | 4 |
| **Total** | **24** |

### Patrones aplicados

Ninguno en código.

### Dificultades

- **Identidad del votante sin cuentas.** No hay forma fiable de identificar a una persona que no se registra. Se asumió explícitamente que el objetivo es disuadir el voto repetido casual, no impedir el fraude deliberado, y se documentó como límite del sistema.
- **Alcance de "plataforma generalizada".** Cada ejemplo concreto del PO (máquinas expendedoras) empujaba hacia requisitos específicos. El modelo de personas ayudó a separar lo que necesita cualquier gestor de lo que necesita ese caso concreto.

### Capturas

No hay pantallas de producto en este sprint.

### Estado al cierre

Especificación de requisitos avanzada (actores, personas, RF, RNF, casos de uso, historias), backlog en Trello, entorno en Linux. Sin código nuevo.

---

## 6. Sprint 2 · Ingeniería de requisitos (II) y arquitectura

### Objetivo planificado

Definición de la infraestructura del backend, inicialización de la base de datos relacional mediante contenedores, operaciones CRUD esenciales y flujo de integración continua básico.

### Trabajo realizado

**Cierre de la especificación.** Se construyeron las **matrices de trazabilidad** (objetivos → requisitos → casos de uso → historias de usuario) y se revisó el documento completo con el PO en una sesión de validación. La trazabilidad hizo visible un requisito sin respaldo: el mapa (ver desviación).

**Modelo de dominio (versión 1).** Cinco entidades: usuario (gestor), item, votación, punto de votación y voto. El punto tenía una votación asignada y un indicador de si estaba activo; un voto era exactamente un item. No existía todavía el concepto de instancia: se pensaba que "lanzar" y "detener" eran cambios de estado del punto.

**Decisiones de arquitectura**, tomadas y anotadas para la memoria:

- Dos SPAs independientes (panel de gestión y aplicación de voto) contra una API REST única. La aplicación de voto debía ser mínima: sin sesión, sin menús, una sola pantalla.
- Autenticación JWT sin estado para gestores, sin cuentas para votantes.
- Borrado lógico para preservar las estadísticas.
- Enlace de punto con código aleatorio fijo de ocho caracteres bajo `/p/{código}`, de modo que un QR impreso siga siendo válido indefinidamente.
- Organización del backend por dominios funcionales; frontends sin librería de componentes ni recursos externos.

**Docker desde el principio.** Se escribió el `docker-compose.yml` inicial con PostgreSQL y un servicio de backend vacío, con la intención de que la pila completa se levantara siempre con un solo comando y de que las pruebas manuales se hicieran sobre contenedores y no sobre el servidor de desarrollo. La integración continua, en cambio, se dejó explícitamente para el final: sin código ni tests no había nada que integrar.

**Replanificación.** Con la especificación cerrada se reasignó el backlog: el contenido previsto para los Sprints 2, 3 y 4 pasaba a los Sprints 3, 4 y 5, y se aceptó que la Fase 3 tendría que comprimirse.

### Desviación

- **Sprint completo dedicado a requisitos y arquitectura** en lugar de al backend. Fue la mayor desviación del proyecto y la más consciente: se prefirió una especificación completa a empezar a programar sobre requisitos a medias.
- **El mapa se descartó.** La idea inicial era que cada punto de votación representara un lugar físico con coordenadas y que el panel mostrara un mapa con los puntos y su estado. En la matriz de trazabilidad el mapa no respondía a ningún objetivo del gestor y entraba en conflicto con el RNF de plataforma generalizada: si alguien usa los puntos como elementos lógicos sin ubicación (una clase, un turno, un grupo), el mapa queda fuera de lugar; y cuando los puntos sí son físicos, el gestor ya sabe dónde están sus máquinas, así que el mapa aportaba poco valor real a cambio de una dependencia externa de mapas y de datos de geolocalización que mantener. Se retiró de los requisitos y el punto quedó como nombre, descripción y enlace público.
- Docker entró antes de lo previsto; la integración continua salió hacia la Fase 3.

### Horas

| Tarea | Horas |
| --- | --- |
| Matrices de trazabilidad | 4 |
| Revisión y validación de la especificación con el PO | 3 |
| Modelo de dominio v1 y esquema relacional preliminar | 4 |
| Decisiones de arquitectura (incluida la retirada del mapa) | 5 |
| Docker Compose inicial con PostgreSQL | 4 |
| Replanificación del backlog | 3 |
| **Total** | **23** |

### Patrones aplicados

A nivel de diseño se fijaron el **borrado lógico** (Soft Delete) para items, votaciones y puntos, la separación **DTO / entidad** y la organización en **capas** (controlador, servicio, repositorio) dentro de cada dominio.

### Dificultades

- **Decir que no al mapa.** Era la parte visualmente más atractiva de la propuesta inicial y costó retirarla. La trazabilidad dio el argumento objetivo.
- **Modelar "activo".** Se dudó entre un indicador en el punto y una entidad aparte, y se optó por lo más simple. La decisión se revisaría en el sprint siguiente.

### Capturas

![Figura 2.1 — Modelo de dominio](capturas/modelo-dominio.png)
*Figura 2.1. Modelo de dominio final (opcional; puede tomarse del diagrama de `ARQUITECTURA.md`).*

### Estado al cierre

Especificación de requisitos completa y validada, modelo de dominio v1, decisiones de arquitectura documentadas, pila Docker mínima. El desarrollo del backend empieza con un sprint de retraso.

---

## 7. Sprint 3 · Núcleo del backend

### Objetivo planificado

Desarrollo del panel de gestión (según la planificación inicial). En la replanificación del Sprint 2 este sprint absorbe el contenido previsto para el Sprint 2: infraestructura del backend, base de datos y operaciones CRUD.

### Trabajo realizado

**Esquema y entidades.** Primera migración de Flyway con las tablas de usuarios, items, votaciones (con su lista ordenada de items), puntos y votos. Tres decisiones se tomaron aquí y se mantuvieron hasta el final: índices parciales que ignoran las filas borradas; todas las claves foráneas con `RESTRICT`, porque nunca se hace un borrado físico; y Hibernate en modo de validación, de modo que el esquema lo gobierna Flyway y cualquier divergencia con las entidades impide el arranque.

**Aparece la instancia.** Al implementar "lanzar" y "detener" como un indicador en el punto quedó claro que las estadísticas se perderían en cada relanzamiento y que no habría forma de saber qué votación se había lanzado si el gestor la cambiaba después. Se consultó con el PO, que confirmó que el histórico por lanzamiento era imprescindible, y se introdujo la entidad **instancia de votación**: cada lanzamiento de una votación en un punto, con inicio, fin y estado. La garantía de "una sola instancia activa por punto" se implementó como índice único parcial en la base de datos, no solo en el código.

**Autenticación.** JWT firmado con HMAC usando el soporte de *resource server* de Spring Security, sin librería JWT adicional. El backend rechaza arrancar si el secreto es demasiado corto. Contraseñas con BCrypt.

**CRUD** de items, votaciones y puntos con la misma estructura en cada paquete (entidad, repositorio, servicio transaccional, DTOs, controlador). Los recursos de otro gestor devuelven 404 y no 403, para no revelar su existencia. Los puntos reciben su código de ocho caracteres al crearse.

**Errores** en formato RFC 9457 (*problem details*) para toda la API, con un mapa de errores por campo en las validaciones. **Documentación** interactiva de la API con Swagger, que sirvió como herramienta de prueba manual durante el sprint.

**Docker.** Primer `Dockerfile` del backend en dos etapas (compilación y JRE), con usuario sin privilegios y volumen para las imágenes; el `docker-compose.yml` pasa a levantar base de datos y backend.

### Desviación

- Todo el contenido llega con un sprint de retraso respecto al plan inicial, como se decidió en el Sprint 2.
- **La instancia no estaba en el modelo** y consumió dos horas de rediseño del esquema.
- **Las imágenes de item** no cupieron y se dejaron para hacerlas junto con la interfaz de subida.

### Horas

| Tarea | Horas |
| --- | --- |
| Migración inicial de Flyway y entidades JPA | 5 |
| Rediseño con la instancia de votación (consulta con el PO) | 2 |
| Autenticación JWT y configuración de seguridad | 5 |
| CRUD de items, votaciones y puntos | 7 |
| Manejo de errores y validación | 2 |
| Swagger y pruebas manuales | 1 |
| `Dockerfile` del backend y pila Docker con backend | 3 |
| **Total** | **25** |

### Patrones aplicados

| Patrón | Dónde |
| --- | --- |
| Repository | Repositorios de Spring Data por entidad |
| Service Layer | Un servicio transaccional por dominio |
| DTO | Records inmutables separados de las entidades |
| Template Method | Manejador de excepciones que extiende el de Spring y redefine casos concretos |
| Builder | Construcción de claims JWT y de la configuración de seguridad |
| Factory Method | Métodos `@Bean` de configuración |
| Chain of Responsibility | Cadena de filtros de Spring Security (CORS, token, autorización) |
| Soft Delete | Columna de borrado, métodos de dominio en las entidades, consultas que filtran borrados |
| Guard Clause | Validaciones al inicio de cada operación de servicio que terminan en 400, 404 o 409 |
| Value Object | Propiedades de configuración como record inmutable |
| Unit of Work | Transacciones de servicio que agrupan varios cambios |

### Dificultades

- **Secreto JWT demasiado corto.** La librería rechazaba la clave con un error poco descriptivo. Se añadió una comprobación explícita al arrancar con mensaje propio.
- **Validación del esquema.** Varios arranques fallidos hasta que tipos y longitudes de columna coincidieron con la migración. Se consideró una molestia útil: cualquier deriva futura se detecta al arrancar.
- **404 o 403** para recursos ajenos. Se eligió 404 y se documentó.

### Capturas

![Figura 3.1 — Documentación de la API](capturas/backend-swagger.png)
*Figura 3.1. Documentación interactiva de la API en Swagger UI.*

### Estado al cierre

API de gestión completa para cuentas, items, votaciones, puntos e instancias, probada a mano desde Swagger y ejecutable en Docker. Sin interfaz.

---

## 8. Sprint 4 · Panel de gestión

### Objetivo planificado

Implementación de la lógica e interfaz de las votaciones y de los códigos QR (según la planificación inicial). Tras la replanificación, este sprint absorbe el panel de gestión previsto para el Sprint 3.

### Trabajo realizado

**Base de la aplicación.** Rutas cargadas de forma diferida, estado de cada página con *signals*, localización en español para fechas y números. Un componente de armazón envuelve las pantallas autenticadas con una barra lateral que, en pantallas estrechas, se convierte en un cajón deslizante.

**Autenticación.** Servicio de sesión que guarda token y usuario en el almacenamiento del navegador, interceptor HTTP que añade la cabecera de autorización y cierra la sesión automáticamente ante un 401, y guards de ruta para las zonas privada y pública. Páginas de inicio de sesión y registro con su propia maquetación.

**Items.** Rejilla de tarjetas con imagen y formulario con **subida de imagen y vista previa**, con validación en cliente de tipo y tamaño (5 MB). Esto obligó a completar el backend: almacenamiento de ficheros con nombre aleatorio, comprobación de que la ruta resuelta no sale del directorio raíz, servicio público de imágenes con caché y un error 413 con mensaje claro cuando se supera el límite.

**Votaciones.** Formulario a dos columnas: datos generales y, a la derecha, buscador con casillas de items y lista de seleccionados reordenable.

**Puntos.** Lista con la votación asignada y el enlace público, y formulario con desplegable de votaciones.

**Componentes compartidos.** Tras escribir las tres parejas lista/formulario se extrajeron los elementos repetidos: encabezado de página, estado vacío, indicador de carga, avisos (*toasts*) y diálogo de confirmación, más una utilidad central que traduce los *problem details* del backend a mensajes y errores por campo, usada por todos los formularios.

**Docker.** `Dockerfile` de los dos frontends (compilación con Node, servido con nginx) y configuración de nginx que reenvía `/api` al backend, cachea los recursos con *hash* y hace el *fallback* de SPA. La pila completa se levanta ya con un solo comando.

### Desviación

- Contenido del Sprint 3 original, con un sprint de retraso.
- **Entró la subida de imágenes** pendiente del sprint anterior (tres horas de backend).
- **Salió lanzar y detener desde el panel**, que se hará junto con la aplicación de voto, que es quien lo necesita para probarse.
- La dockerización de los frontends no estaba prevista aquí (dos horas), pero permitió probar el panel exactamente como se desplegaría.

### Horas

| Tarea | Horas |
| --- | --- |
| Base del panel: rutas, armazón, barra lateral, cajón móvil, estilos | 4 |
| Autenticación (páginas, servicio, interceptor, guards) | 4 |
| Items (lista, formulario y subida de imagen) y backend de imágenes | 7 |
| Votaciones (lista, formulario, lista ordenable) | 4 |
| Puntos (lista, formulario) | 2 |
| Componentes compartidos y traducción de errores | 2 |
| `Dockerfile` de los frontends y nginx | 2 |
| **Total** | **25** |

### Patrones aplicados

| Patrón | Dónde |
| --- | --- |
| Presentacional / contenedor | Componentes compartidos sin estado frente a páginas que cargan datos |
| Facade | Un único servicio de API en el panel que oculta rutas y formatos |
| Interceptor | Interceptor de autenticación |
| Observer | Signals y `computed` para el estado; observables de HTTP |
| Singleton gestionado | Servicios provistos en raíz |
| Front Controller | Router con guards funcionales |
| Proxy | nginx delante de cada SPA |

### Dificultades

- **Librería de iconos y Angular 22.** La librería elegida declaraba compatibilidad solo hasta Angular 21 y la instalación fallaba por dependencias de pares. Se comprobó que funcionaba y se fijó la opción de instalación permisiva en el proyecto, de modo que se respete también dentro de Docker.
- **Multipart desde Angular.** Enviar datos, imagen y el indicador de borrado de imagen en una sola petición exigió construir el cuerpo a mano y no fijar el tipo de contenido.
- **Errores de servidor en los campos.** Hacer que aparezcan bajo el control correcto y desaparezcan al editarlo llevó a un helper que luego se reutilizó en todos los formularios.
- **Prioridad de reglas en nginx.** Las reglas de caché de recursos estáticos capturaban también las imágenes servidas bajo `/api`, que devolvían 404. Se resolvió dando prioridad al prefijo `/api`.

### Capturas

![Figura 4.1 — Inicio de sesión](capturas/panel-login.png)
*Figura 4.1. Inicio de sesión del panel (`/login`).*

![Figura 4.2 — Registro](capturas/panel-registro.png)
*Figura 4.2. Creación de cuenta de gestor (`/register`).*

![Figura 4.3 — Lista de items](capturas/panel-items-lista.png)
*Figura 4.3. Rejilla de items con imagen (`/items`).*

![Figura 4.4 — Formulario de item](capturas/panel-item-formulario.png)
*Figura 4.4. Alta de item con vista previa de la imagen (`/items/nuevo`).*

![Figura 4.5 — Lista de votaciones](capturas/panel-votaciones-lista.png)
*Figura 4.5. Lista de votaciones (`/votaciones`).*

![Figura 4.6 — Formulario de votación](capturas/panel-votacion-formulario.png)
*Figura 4.6. Formulario de votación con selección y orden de items (`/votaciones/nueva`).*

![Figura 4.7 — Lista de puntos](capturas/panel-puntos-lista.png)
*Figura 4.7. Puntos de votación con su enlace público (`/puntos`).*

![Figura 4.8 — Formulario de punto](capturas/panel-punto-formulario.png)
*Figura 4.8. Edición de punto con el enlace público fijo (`/puntos/:id`).*

![Figura 4.9 — Estado vacío](capturas/panel-estado-vacio.png)
*Figura 4.9. Estado vacío con llamada a la acción.*

### Estado al cierre

Un gestor puede registrarse, iniciar sesión y administrar items con imagen, votaciones y puntos, todo ejecutándose en la pila Docker. Todavía no puede lanzar nada ni nadie puede votar.

---

## 9. Sprint 5 · Aplicación de voto, instancias y códigos QR

### Objetivo planificado

Dashboard visual de estadísticas (según la planificación inicial). Tras la replanificación, este sprint absorbe la votación y los QR previstos para el Sprint 4.

### Trabajo realizado

**Instancias.** Lanzar comprueba que el punto tiene votación con items y que no hay otra instancia activa; detener cierra la instancia. Se implementaron las reglas de bloqueo mientras hay instancia activa: no se puede borrar la votación, sus items ni el punto, ni cambiar la lista de items o la votación asignada; nombre y descripción sí.

**API pública.** Dos endpoints sin autenticación: consultar un punto por su código (con una cabecera opcional que identifica el dispositivo, para saber si ya participó) y votar. Un único servicio concentra las reglas: punto no borrado, instancia activa, voto no duplicado. La comprobación de duplicado se hace dos veces a propósito: una consulta previa y, además, la captura de la violación de la restricción única al guardar, para el caso de dos peticiones simultáneas con el mismo identificador.

**Aplicación de voto.** Un servicio genera un identificador anónimo de dispositivo, lo guarda en el almacenamiento del navegador y lo conserva también en memoria por si el almacenamiento está bloqueado. La pantalla de voto es una máquina de seis estados (cargando, votar, gracias, desactivada, error, enlace no válido) y las pantallas de estado comparten un mismo componente. Diseño para móvil: altura de pantalla real, botón de confirmación fijo respetando el área segura, tarjetas grandes, ancho máximo de 480 px.

**QR y enlaces.** El panel genera el código QR en el navegador y permite descargarlo como PNG; el botón de copiar tiene alternativa para contextos sin HTTPS. El enlace que va dentro del QR lo construye el backend a partir de la URL pública configurada. La "permanencia" del requisito se resuelve con el código fijo del punto: el mismo QR impreso vale para todas las votaciones futuras de ese punto.

**Panel.** Acciones de lanzar y detener (con confirmación) y botones de copiar enlace y QR en la lista de puntos.

### Desviación

- Contenido del Sprint 4 original, con un sprint de retraso.
- **Entró lanzar y detener** desde el sprint anterior.
- La aplicación de voto resultó más simple en la pantalla principal y más compleja en estados: el plan contemplaba "votar" y "gracias"; la realidad exigió también desactivada, enlace no válido, error de red y ya votado. Cada uno apareció al probar en un móvil real.

### Horas

| Tarea | Horas |
| --- | --- |
| Instancias en el backend (lanzar, detener, reglas de bloqueo) | 4 |
| API pública y reglas de voto | 4 |
| Aplicación de voto: identificador de dispositivo, servicio, máquina de estados | 6 |
| Diseño móvil y accesibilidad de la pantalla de voto | 3 |
| QR y copiar enlace en el panel | 3 |
| Lanzar y detener desde la lista de puntos | 2 |
| Pruebas manuales con un móvil en la red local | 3 |
| **Total** | **25** |

### Patrones aplicados

| Patrón | Dónde |
| --- | --- |
| State (variante ligera) | Pantalla de voto con un estado y un `@switch`; estado de la instancia en el backend. Se descartó el State clásico con una clase por estado por tener una única transición. |
| Facade | Servicio público de la aplicación de voto; servicio de voto en el backend como fachada de las reglas |
| Mapper | Conversión de instancia a respuesta compartida por varios servicios |
| Defensa en profundidad | Comprobación previa más restricción única contra la papeleta duplicada |

### Dificultades

- **Navegación privada.** En algunos navegadores el almacenamiento lanza excepción en modo privado; el identificador se perdía y se podía votar dos veces en la misma sesión. Solución: conservarlo en memoria y proteger cada acceso al almacenamiento.
- **409 al confirmar.** Si el gestor detiene la votación mientras alguien la tiene abierta, el voto devuelve 409. Mostrar un error genérico confundía; ahora la página vuelve a cargar el estado real y acaba en "gracias" o "desactivada" según corresponda.
- **CORS en desarrollo.** Las primeras pruebas con la aplicación de voto y el backend en puertos distintos fallaban por CORS. Se resolvió con el proxy del servidor de desarrollo, y se dejó CORS configurado en el backend como defensa.
- **Lanzamientos simultáneos.** Dos clics rápidos en lanzar creaban una carrera; el índice único parcial la resuelve y el servicio la traduce a 409.

### Capturas

![Figura 5.1 — Pantalla de voto](capturas/voto-single.png)
*Figura 5.1. Pantalla de voto en una votación de voto único (`/p/{código}`).*

![Figura 5.2 — Gracias por votar](capturas/voto-gracias.png)
*Figura 5.2. Confirmación tras votar; también se muestra si el dispositivo ya participó.*

![Figura 5.3 — Votación desactivada](capturas/voto-desactivada.png)
*Figura 5.3. Punto sin instancia activa.*

![Figura 5.4 — Enlace no válido](capturas/voto-enlace-no-valido.png)
*Figura 5.4. Código inexistente o punto borrado.*

![Figura 5.5 — Código QR de un punto](capturas/panel-qr.png)
*Figura 5.5. Diálogo de QR con descarga en PNG.*

![Figura 5.6 — Lanzar y detener](capturas/panel-puntos-lanzar.png)
*Figura 5.6. Acciones de lanzar y detener en la lista de puntos.*

### Estado al cierre

Flujo completo funcionando: el gestor lanza una votación en un punto, muestra el QR, un móvil escanea, vota una vez y recibe confirmación. Solo existe el voto único y las estadísticas no tienen interfaz.

---

## 10. Sprint 6 · Tipos de votación y estadísticas

### Objetivo planificado

Refuerzo de la seguridad y pruebas de rendimiento (según la planificación inicial). Tras la replanificación le correspondía el dashboard de estadísticas del Sprint 5 original.

### Trabajo realizado

**Tipos de votación (no planificado).** La demostración del incremento anterior al PO y a un pequeño grupo de usuarios produjo dos peticiones inmediatas: poder elegir varias opciones y poder ordenarlas. Afectaban al núcleo del modelo (un voto era un item y la restricción de unicidad estaba sobre el voto) y cuanto más tarde se hicieran, más caras serían. Se decidió abordarlas en este sprint junto con las estadísticas, que dependían del resultado.

- **Modelo.** Se introdujo la **papeleta**: la participación de un dispositivo en una instancia, que contiene uno o varios votos, cada uno con una posición opcional. La segunda migración de Flyway añade tipo y máximo de selecciones a la votación, crea las papeletas, **migra los votos existentes** agrupándolos por instancia y dispositivo, y traslada la restricción de unicidad del voto a la papeleta.
- **Estrategias.** Una interfaz con tres responsabilidades (validar la configuración de la votación, validar una papeleta y puntuar los resultados) y tres implementaciones: voto único (exactamente un item), votos limitados (entre 1 y N distintos) y ranking (orden parcial con puntuación Borda: con M items la posición p vale M − p + 1, desempate por posición media). Un registro las descubre por inyección, las indexa por tipo y falla al arrancar si falta o sobra alguna.
- **Interfaces.** Selector visual de tipo en el formulario de votación con el campo de máximo solo para votos limitados. En la aplicación de voto, contador "2 de 3" con bloqueo al llegar al máximo, y numeración por orden de toque con renumeración al quitar y botón de reiniciar en los rankings.

**Estadísticas.** El servicio construye la lista de candidatos con los items actuales de la votación (incluidos los borrados, marcados como tales) más los que recibieron votos y ya no pertenecen a ella, y delega la puntuación en la estrategia. El listado usa una única consulta agregada para el recuento de participaciones. En el panel: lista de todos los lanzamientos y página de resultados con barras de progreso hechas en CSS, porcentaje, ganador destacado y, en rankings, posición media y primeros puestos; mientras la instancia está activa se refresca cada 5 s. Página de inicio con contadores y lo que está en marcha, y página de votaciones activas con lanzamiento y refresco automático.

### Desviación

- **Dos sprints de contenido en uno.** Tipos de votación (no planificados en ningún sitio) y estadísticas (desplazadas). Se consiguió a costa de dejar la revisión de seguridad y todo el testing automático para el Sprint 7, y de que las páginas de inicio y activas quedaran en versión básica.
- Se descartó incorporar una librería de gráficos: las barras CSS cubren la necesidad y mantienen el panel sin recursos externos.

### Horas

| Tarea | Horas |
| --- | --- |
| Análisis del cambio y diseño de papeleta y estrategias | 2 |
| Migración de datos y entidades de papeleta y voto | 4 |
| Estrategias de voto único, limitado y ranking, y registro | 5 |
| Panel: selector de tipo y máximo de votos | 2 |
| Aplicación de voto: contador y numeración | 3 |
| Servicio de estadísticas (candidatos, items borrados, consulta agregada) | 3 |
| Páginas de estadísticas (lista, resultados, refresco) | 4 |
| Inicio y votaciones activas | 2 |
| **Total** | **25** |

### Patrones aplicados

| Patrón | Dónde |
| --- | --- |
| **Strategy** | Interfaz de estrategia de votación y sus tres implementaciones. Es el patrón central del proyecto y apareció exactamente cuando hubo tres reglas distintas, no antes. |
| Registry / Factory Method | Registro que resuelve la estrategia por tipo |
| Fail Fast | El registro detiene el arranque si falta una estrategia |
| Value Object | Voto con posición como valor inmutable; tipo de votación como enumeración |
| Proyección de consulta | Recuento agregado de participaciones por instancia |
| Observer con ciclo de vida | Intervalos de refresco cancelados al destruir la página |

Añadir un cuarto tipo de votación se reduce a un valor en la enumeración y una clase de estrategia; el registro la descubre sola.

### Dificultades

- **Migrar sin perder votos.** La primera versión de la migración borraba y recreaba la tabla de votos. Se reescribió como migración de datos real y se probó contra una base con votos del sprint anterior.
- **Rankings parciales.** ¿Qué puntuación recibe un item que un votante no ordenó? Se optó por Borda con cero puntos para los no ordenados y porcentaje sobre papeletas × M, y se documentó la fórmula en la interfaz.
- **Items votados y luego retirados** de la votación desaparecían de los resultados; se añadió la consulta que los recupera y la marca de borrado.
- **Consulta por instancia en el listado.** Con unas decenas de lanzamientos ya se notaba; se sustituyó por la consulta agregada.
- En el frontend, el cambio de "un item" a "lista de items" se propagó con el compilador de TypeScript señalando cada punto afectado: fue el argumento definitivo a favor de los tipos estrictos.

### Capturas

![Figura 6.1 — Selector de tipo de votación](capturas/panel-votacion-tipo.png)
*Figura 6.1. Selector de tipo (voto único, votos limitados, ranking) en el formulario de votación.*

![Figura 6.2 — Voto con votos limitados](capturas/voto-limited.png)
*Figura 6.2. Votación limitada con contador de selección.*

![Figura 6.3 — Voto por ranking](capturas/voto-ranking.png)
*Figura 6.3. Ranking: numeración por orden de toque y "Reiniciar orden".*

![Figura 6.4 — Inicio](capturas/panel-inicio.png)
*Figura 6.4. Dashboard de inicio con contadores y votaciones en marcha (`/`).*

![Figura 6.5 — Votaciones activas](capturas/panel-activas.png)
*Figura 6.5. Votaciones activas con lanzamiento y refresco automático (`/activas`).*

![Figura 6.6 — Lista de estadísticas](capturas/panel-estadisticas-lista.png)
*Figura 6.6. Todos los lanzamientos (`/estadisticas`).*

![Figura 6.7 — Resultados de voto único](capturas/panel-resultados-single.png)
*Figura 6.7. Resultados con barras y porcentaje (`/estadisticas/:id`).*

![Figura 6.8 — Resultados de ranking](capturas/panel-resultados-ranking.png)
*Figura 6.8. Resultados de un ranking con puntos Borda, posición media y primeros puestos.*

### Estado al cierre

Producto funcionalmente completo: tres tipos de votación de extremo a extremo con migración de datos, estadísticas y dashboard. Sin tests automáticos ni medidas de rendimiento.

---

## 11. Sprint 7 · Testing, carga, seguridad y despliegue continuo

### Objetivo planificado

Automatización del despliegue continuo hacia la nube y ejecución del testing final.

### Trabajo realizado

**Tests unitarios.** Las tres estrategias y el registro, sin base de datos. Las entidades no exponen un modo de fijar el identificador, así que la clase de apoyo de los tests lo hace por reflexión: es el único uso de reflexión del proyecto y está aislado ahí.

**Tests de integración.** Se descartó H2 porque no soporta los índices únicos parciales del esquema; se usó **Testcontainers** con PostgreSQL 17, de modo que los tests corren contra la misma base de datos que producción y validan también las migraciones. Una clase base levanta el contenedor, registra un gestor y obtiene un token real (sin usuarios simulados). Las clases de test recorren por HTTP la autenticación, los items con imagen y el aislamiento entre gestores, el ciclo completo lanzar → votar → duplicado → detener → estadísticas → borrados, los tres tipos de votación con comprobación de los puntos Borda, y los datos de prueba. El aislamiento entre tests es por datos (un correo distinto por test), no por transacción.

**Datos de prueba.** Un inicializador opcional vacía la base de datos y crea un gestor, diez productos de máquina expendedora, una votación de cada tipo y dos puntos. Aceleró las pruebas manuales, la carga y las demostraciones.

**Revisión de seguridad.** Se recorrió una lista de riesgos habituales contra el código: recorrido de rutas en la lectura de imágenes, tipos MIME por lista cerrada, límite de tamaño, aislamiento por propietario en todas las consultas, respuestas 404 para recursos ajenos, CORS restringido, BCrypt, caducidad del token, validación de todas las entradas. No aparecieron fallos nuevos; se homogeneizaron mensajes y se añadieron tests para los puntos sensibles.

**Pruebas de carga.** Script de k6 con dos escenarios simultáneos: votantes (cada iteración genera un dispositivo nuevo, consulta el punto y vota según el tipo) y duplicados (dos papeletas idénticas en paralelo, que deben producir exactamente un 201 y un 409). Umbrales: p95 de consulta < 300 ms, p95 de voto < 500 ms, errores < 1 %, duplicados aceptados = 0. Se descartaron el panel integrado de k6 (gráficas genéricas en inglés) y un generador de informes externo (se importa desde una URL), y se escribió un informe HTML propio. Una ejecución por tipo de votación con 100 usuarios virtuales durante 30 s sobre la pila Docker: entre 5.600 y 6.800 peticiones por segundo, p95 entre 30 y 38 ms, cero errores y cero duplicados aceptados. Detalles en `TESTING.md`.

**Decisión de despliegue.** Con el producto ya maduro se planteó cómo publicarlo. La opción rápida era una plataforma gestionada como Railway o similar; se descartó porque los planes gratuitos duermen los servicios (el primer votante tras un rato de inactividad esperaría medio minuto), porque la URL que va en los QR debe ser estable y propia, y porque se quería controlar la pila completa. Se optó por un **VPS pequeño con dominio propio** (Hetzner, Ubuntu, dos subdominios gratuitos de DuckDNS) y **Caddy** como proxy inverso con certificados automáticos de Let's Encrypt, ya que HTTPS no era opcional: la generación de identificadores y el portapapeles solo funcionan en contextos seguros.

**Pipeline.** Workflow de GitHub Actions con tres trabajos encadenados: tests (backend con Testcontainers, compilación y tests de ambos frontends), construcción y publicación de las tres imágenes en GitHub Container Registry, y despliegue por SSH al servidor. Se escribió la variante de producción del `docker-compose.yml` (imágenes publicadas, sin puertos expuestos salvo Caddy, datos de prueba desactivados), la configuración de Caddy y la primera versión del script de preparación del servidor.

### Desviación

- Coincide en buena parte con el plan original del Sprint 7 (despliegue continuo y testing final), pero además absorbe el testing y la seguridad que no cupieron en el Sprint 6 y las pruebas de rendimiento previstas para ese sprint.
- **El despliegue quedó a medias.** El pipeline pasaba los tests y publicaba las imágenes, pero el primer despliegue real con HTTPS operativo y las copias de seguridad se completaron en el Sprint 8.

### Horas

| Tarea | Horas |
| --- | --- |
| Tests unitarios de estrategias | 3 |
| Testcontainers y suite de integración | 6 |
| Revisión de seguridad | 3 |
| k6: script, escenarios, umbrales e informe HTML | 5 |
| Ejecuciones de carga y análisis | 1 |
| Workflow de GitHub Actions | 4 |
| Decisión de despliegue, Compose de producción, Caddy y alta del VPS | 3 |
| **Total** | **25** |

### Patrones aplicados

| Patrón | Dónde |
| --- | --- |
| Template Method (tests) | Clase base de los tests de integración |
| Object Mother | Clases de apoyo que crean items, votos y gestores de prueba |
| Pipeline | Trabajos encadenados del workflow |
| Proxy | Caddy delante de los nginx |

### Dificultades

- **Testcontainers exige Docker** también en el runner; los de GitHub lo traen. Lo que no es posible es ejecutar los tests durante la construcción de la imagen, así que la imagen se construye sin tests y estos corren antes, en el primer trabajo del workflow.
- **Acumulación de datos entre tests.** Al no usar rollback, la base del contenedor acumula filas. Se aceptó el aislamiento por datos y se anotó como limitación.
- **Datos de prueba y tests** en el mismo contexto de Spring se estorbaban; el test del inicializador usa su propio contexto.
- **k6 fuera del pipeline.** En un runner compartido las cifras no son reproducibles; la carga se ejecuta a mano y el informe se guarda en el repositorio.
- **Tamaño de subida detrás del proxy.** nginx cortaba las imágenes grandes antes de llegar al backend; se elevó su límite por encima del de la aplicación para que el error lo dé siempre el backend con su mensaje.

### Capturas

![Figura 7.1 — Informe de carga](capturas/k6-informe.png)
*Figura 7.1. Informe HTML de k6 de una ejecución con 100 usuarios virtuales.*

![Figura 7.2 — Pipeline](capturas/github-actions.png)
*Figura 7.2. Ejecución del workflow con los tres trabajos (opcional).*

### Estado al cierre

30 tests automáticos en verde contra PostgreSQL real, capacidad medida con margen de un orden de magnitud sobre los umbrales, pipeline que prueba, construye y publica imágenes en cada `push`. Servidor contratado, sin HTTPS aún.

---

## 12. Sprint 8 · Estabilización, cobertura y cierre

### Objetivo planificado

Margen de estabilización para la corrección de defectos menores y puesta a punto final.

### Trabajo realizado

**Despliegue final.** Subdominios apuntando al servidor, Caddy obteniendo los certificados en el primer arranque, secretos de despliegue en GitHub y primer despliegue completo desde un `push`. Script de copias diarias de la base de datos y de las imágenes, y guía paso a paso del despliegue, incluido el apagado final del servidor.

**Cobertura.** Se añadió JaCoCo (con la versión fijada a mano, porque la gestión de dependencias de Spring Boot no la incluye), excluyendo el punto de entrada, los DTOs y la configuración. El informe dio un 92 % de instrucciones y un 82 % de ramas, y sobre todo señaló un hueco: la edición de un punto con instancia activa no estaba probada. Se añadió el test correspondiente. No se fijó umbral mínimo; se dejó anotado como mejora.

**Pruebas en dispositivos reales.** Con la URL pública se probó en varios móviles escaneando QR impresos. De ahí salió la lista de defectos menores corregidos: el cajón lateral del panel no se cerraba al navegar; en los rankings faltaba una forma rápida de deshacer todo; al cerrar la sesión automáticamente por un 401 no se volvía a la página solicitada tras entrar de nuevo; algunos textos de estado eran ambiguos en pantallas pequeñas.

**Documentación.** Revisión final de `README.md`, `ARQUITECTURA.md`, `TECNOLOGÍAS.md` y `TESTING.md`, y redacción de este documento. Retrospectiva global y cierre del tablero.

### Desviación

- El margen de estabilización se consumió en parte con el despliegue pendiente del Sprint 7 (seis horas).
- **Trabajo dejado explícitamente fuera**: tests unitarios de los frontends más allá de los de arranque, pruebas de extremo a extremo automatizadas y un umbral de cobertura. Todo ello está descrito en `TESTING.md`.

### Horas

| Tarea | Horas |
| --- | --- |
| Despliegue final (dominio, HTTPS, secretos, primer despliegue, copias, guía) | 6 |
| JaCoCo, análisis del informe y test nuevo | 3 |
| Pruebas en dispositivos reales y corrección de defectos | 5 |
| Documentación final | 6 |
| Retrospectiva y cierre del tablero | 1 |
| **Total** | **21** |

### Patrones aplicados

Ninguno nuevo. Se revisó el catálogo de `ARQUITECTURA.md` y se documentaron también los patrones **valorados y descartados** (Abstract Factory, Bridge, Decorator, Command, Adapter, Observer de dominio, State clásico), con el criterio de no añadir abstracciones sin al menos dos implementaciones reales.

### Dificultades

- **Primer despliegue con secreto JWT distinto** entre el entorno local y el servidor: todas las sesiones del panel caducaron a la vez. Comportamiento correcto, pero se documentó para no repetir la confusión.
- **Contraseña de la base de datos cambiada después del primer arranque.** La imagen de PostgreSQL solo la usa al inicializar el volumen; al cambiarla, el backend no conectaba y los frontends devolvían 502. Se documentó la solución en el README.
- **Cobertura alta no significa escenarios cubiertos.** La configuración de seguridad aparecía al 100 % de líneas y sin embargo nadie probaba un token caducado ni un origen no permitido. Se anotó como lección en `TESTING.md`.

### Capturas

![Figura 8.1 — Aplicación de voto en un móvil real](capturas/voto-movil-https.png)
*Figura 8.1. Aplicación de voto abierta desde un QR en un móvil, por HTTPS.*

![Figura 8.2 — Informe de cobertura](capturas/jacoco-informe.png)
*Figura 8.2. Informe de JaCoCo por paquete.*

![Figura 8.3 — Panel en móvil](capturas/panel-movil-menu.png)
*Figura 8.3. Barra lateral convertida en cajón deslizante en pantallas estrechas.*

### Estado al cierre

Sistema publicado con HTTPS y despliegue continuo, 31 tests automáticos, cobertura medida, carga medida y documentación completa.

---

## 13. Retrospectiva global

### 13.1 Planificado frente a realizado

| Sprint | Planificado | Realizado | Desviación |
| --- | --- | --- | --- |
| 0 | Entornos y herramientas de gestión | Lo previsto, en Windows y con Jira | Jira más costoso de lo estimado |
| 1 | Requisitos, backlog, dominio | Especificación extensa (actores, personas, RF, RNF, casos de uso, historias) | No termina; cambio a Trello; paso a Linux |
| 2 | Backend, BD en contenedor, CRUD, CI básica | Trazabilidad, validación con el PO, dominio v1, arquitectura, Docker inicial | Sprint entero en requisitos; mapa descartado; CI al final |
| 3 | Panel de gestión | Núcleo del backend | Un sprint de retraso; aparece la instancia |
| 4 | Voting app y QR | Panel de gestión e imágenes | Un sprint de retraso; frontends en Docker |
| 5 | Dashboard de estadísticas | Voting app, instancias, API pública, QR | Un sprint de retraso |
| 6 | Seguridad y rendimiento | Tipos de votación y estadísticas | Dos sprints en uno; testing y seguridad al 7 |
| 7 | Despliegue continuo y testing final | Tests, carga, seguridad, pipeline, decisión de VPS | Coincide con el plan más lo pendiente del 6 |
| 8 | Estabilización | Despliegue final, JaCoCo, defectos, documentación | Parte del margen absorbido por el despliegue |

Las cuatro fases se cumplieron en su orden, pero con un desplazamiento de un sprint desde el Sprint 2, causado por la decisión de completar la especificación de requisitos antes de programar. El retraso se recuperó en el Sprint 6 al juntar los tipos de votación con las estadísticas, a costa de mover el testing al Sprint 7, que era donde el plan original ya lo situaba. La retrospectiva consideró acertadas ambas decisiones: la especificación completa evitó cambios de rumbo posteriores (el único cambio de alcance, los tipos de votación, vino del PO y no de un requisito mal entendido), y hacer los tipos de votación en cuanto se pidieron evitó migrar más datos y reescribir estadísticas ya hechas.

### 13.2 Horas por sprint y por área

| Sprint | Horas |
| --- | --- |
| 0 | 21 |
| 1 | 24 |
| 2 | 23 |
| 3 | 25 |
| 4 | 25 |
| 5 | 25 |
| 6 | 25 |
| 7 | 25 |
| 8 | 21 |
| **Total** | **214** |

| Área | Horas | Sprints principales |
| --- | --- | --- |
| Gestión, requisitos y diseño | 53 | 0, 1, 2 |
| Backend | 51 | 3, 5, 6 |
| Frontends (panel y aplicación de voto) | 48 | 4, 5, 6 |
| Infraestructura y despliegue | 30 | 2, 3, 7, 8 |
| Pruebas (unitarias, integración, carga, cobertura) | 26 | 7, 8 |
| Documentación | 6 | 8 |
| **Total** | **214** |

La dedicación real (214 h) quedó dentro de la horquilla prevista de 180-225 h. Ningún sprint superó las 25 horas: cuando faltó tiempo se movió alcance, no se alargó la semana. La cuarta parte del esfuerzo fue a requisitos, diseño y gestión, muy por encima de lo planificado (dos sprints en lugar de uno y medio), y se considera bien invertida.

### 13.3 Lecciones

- **Una especificación completa vale un sprint.** Costó el retraso de toda la planificación, pero el resto del proyecto no tuvo que volver atrás por un requisito mal entendido. Las matrices de trazabilidad, además, dieron el argumento para retirar el mapa.
- **El modelo de dominio se termina programando.** La instancia de votación no apareció en la especificación sino al implementar "lanzar" y "detener". Consultarlo con el PO en cuanto surgió, en lugar de decidir en solitario, evitó una entidad mal definida.
- **Los tests deberían haber empezado antes.** Concentrarlos en el Sprint 7 hizo que el cambio de modelo del Sprint 6 se abordara sin red. En cuanto existió la suite, corregir defectos fue más rápido, no más lento.
- **Patrones cuando hay variabilidad real.** El Strategy de tipos de votación es el único patrón de objeto clásico del proyecto y apareció cuando hubo tres reglas distintas. Introducirlo antes "por si acaso" habría sido una abstracción sin implementaciones.
- **Docker desde el principio, pipeline al final.** Tener la pila en contenedores desde el Sprint 2 evitó los problemas de entorno y permitió medir la carga sobre lo mismo que se despliega; el pipeline, en cambio, solo tuvo sentido cuando hubo tests que ejecutar.
- **Herramientas proporcionales al equipo.** Jira no aportó nada frente a Trello para una persona, y Docker Desktop sobre Windows añadía una capa que Linux no necesita.
- **Probar en dispositivos reales pronto.** Los estados de error de la aplicación de voto, el modo privado y la necesidad de HTTPS aparecieron en móviles reales, no en el navegador del portátil.
- **La cobertura mide líneas, no escenarios.** JaCoCo sirvió para encontrar un hueco concreto, pero un 100 % en la configuración de seguridad no garantiza que se prueben los casos que importan.

---

## Anexo A · Patrones por sprint

| Patrón | Sprint | Dónde |
| --- | --- | --- |
| Soft Delete | 2 (decisión), 3 (código) | Columna de borrado y métodos de dominio en items, votaciones y puntos |
| Repository | 3 | Repositorios de Spring Data |
| Service Layer | 3 | Servicios transaccionales por dominio |
| DTO | 3 | Records de entrada y salida; modelos tipados en los frontends |
| Template Method | 3 | Manejador de excepciones; clase base de tests (7) |
| Builder | 3 | Claims JWT, configuración de seguridad |
| Factory Method | 3 | Métodos `@Bean` |
| Chain of Responsibility | 3 | Cadena de filtros de seguridad |
| Guard Clause / Fail Fast | 3 | Validaciones de servicio; comprobación del secreto; registro de estrategias (6) |
| Value Object | 3 | Propiedades de configuración; voto con posición (6) |
| Unit of Work | 3 | Transacciones de servicio |
| Presentacional / contenedor | 4 | Componentes compartidos frente a páginas |
| Facade | 4 | Servicio de API del panel; servicio público de voto (5) |
| Interceptor | 4 | Interceptor de autenticación |
| Observer | 4 | Signals; efectos reactivos (5); intervalos con ciclo de vida (6) |
| Singleton gestionado | 4 | Beans de Spring; servicios provistos en raíz |
| Front Controller | 4 | Router; `DispatcherServlet` |
| Proxy | 4 | nginx; Caddy (7) |
| State (ligero) | 5 | Pantalla de voto; estado de la instancia |
| Mapper | 5 | Conversión de instancias compartida |
| Defensa en profundidad | 5 | Comprobación más restricción única contra duplicados |
| **Strategy** | 6 | Tipos de votación |
| Registry / Factory Method | 6 | Registro de estrategias |
| Proyección de consulta | 6 | Recuento agregado de participaciones |
| Object Mother | 7 | Clases de apoyo de los tests |
| Pipeline | 7 | Workflow de despliegue |

## Anexo B · Dificultades y soluciones

| Sprint | Dificultad | Solución |
| --- | --- | --- |
| 0 | Starters renombrados en Spring Boot 4 | Guía de migración oficial en lugar de tutoriales |
| 0 | Jira sobredimensionado | Cambio a Trello (Sprint 1) |
| 0-1 | Docker Desktop lento sobre Windows | Migración del entorno a Linux (Sprint 1) |
| 1 | Identidad del votante sin cuentas | Identificador anónimo por dispositivo; límite documentado |
| 1-2 | Requisitos específicos del caso de ejemplo | Modelo de personas y RNF de plataforma generalizada |
| 2 | Mapa de puntos sin respaldo en los objetivos | Retirado tras la matriz de trazabilidad |
| 3 | Estado "activo" en el punto perdía el histórico | Entidad instancia de votación, consultada con el PO |
| 3 | Secreto JWT corto con error críptico | Comprobación explícita al arrancar |
| 3 | Validación del esquema frente a entidades | Ajuste fino; deriva detectada al arrancar |
| 4 | Librería de iconos incompatible en pares con Angular 22 | Instalación permisiva fijada en el proyecto |
| 4 | Multipart y errores de campo del servidor | Cuerpo construido a mano; helper de errores compartido |
| 4 | Reglas de nginx capturaban las imágenes de la API | Prioridad al prefijo `/api` |
| 5 | Almacenamiento bloqueado en navegación privada | Identificador en memoria y accesos protegidos |
| 5 | 409 al confirmar tras detener la votación | Recarga del estado real en lugar de error |
| 5 | CORS en desarrollo | Proxy del servidor de desarrollo; CORS como defensa |
| 5 | Lanzamientos simultáneos | Índice único parcial más 409 |
| 6 | Migrar votos existentes a papeletas | Migración de datos real, probada con datos previos |
| 6 | Puntuar rankings parciales | Borda con cero para no ordenados; desempate por posición media |
| 6 | Items votados y luego retirados | Consulta que los recupera y marca de borrado |
| 6 | Consulta por instancia en el listado | Consulta agregada |
| 7 | H2 no soporta índices parciales | Testcontainers con PostgreSQL real |
| 7 | Tests durante la construcción de la imagen | Imagen sin tests; tests en el primer trabajo del pipeline |
| 7 | Datos de prueba y tests en el mismo contexto | Contexto propio para el test del inicializador |
| 7 | Planes gratuitos de PaaS que duermen | VPS con dominio propio y Caddy |
| 7 | nginx cortaba subidas grandes | Límite del proxy por encima del de la aplicación |
| 8 | Secreto JWT distinto entre entornos | Documentado; sesiones caducan a la vez |
| 8 | Contraseña de la base de datos cambiada tras el primer arranque | Documentado en el README |
| 8 | Cobertura alta sin escenarios cubiertos | Test nuevo; limitación documentada |
