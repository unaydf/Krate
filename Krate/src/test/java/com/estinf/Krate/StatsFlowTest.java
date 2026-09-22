package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** RF-30 (resultados por votacion), RF-31 (filtro por punto) y RF-32 (historico por item) a traves de la API. */
class StatsFlowTest extends ApiTestSupport {

	private String token;

	private int createItem(String name) throws Exception {
		String json = mvc.perform(multipart("/api/items").param("name", name).header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	private int createVoting(String name, String type, int... itemIds) throws Exception {
		StringBuilder ids = new StringBuilder();
		for (int id : itemIds) {
			ids.append(ids.isEmpty() ? "" : ",").append(id);
		}
		String json = mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"description\":\"\",\"type\":\"%s\",\"maxSelections\":null,\"itemIds\":[%s]}"
					.formatted(name, type, ids))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	/** Crea un punto con la votacion asignada y la lanza. Devuelve el JSON del punto. */
	private String launchPoint(String name, int votingId) throws Exception {
		String point = mvc.perform(post("/api/voting-points").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"description\":\"\",\"votingId\":%d}".formatted(name, votingId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		int pointId = read(point, "$.id");
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated());
		return point;
	}

	private int activeInstanceOf(String code) throws Exception {
		String json = mvc.perform(get("/api/public/points/" + code)).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		return read(json, "$.instanceId");
	}

	private void stop(int instanceId) throws Exception {
		mvc.perform(post("/api/instances/" + instanceId + "/stop").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk());
	}

	private void ballot(String code, String voter, int... itemIds) throws Exception {
		StringBuilder ids = new StringBuilder();
		for (int id : itemIds) {
			ids.append(ids.isEmpty() ? "" : ",").append(id);
		}
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[%s],\"voterToken\":\"%s\"}".formatted(ids, voter)))
			.andExpect(status().isCreated());
	}

	@Test
	void votingAggregatesAcrossPointsAndFiltersByPoint() throws Exception {
		token = registerAndGetToken(uniqueEmail("stats-voting"));
		int pizza = createItem("Pizza");
		int pasta = createItem("Pasta");
		int votingId = createVoting("Cena", "SINGLE", pizza, pasta);
		int neverLaunched = createVoting("Sin lanzar", "SINGLE", pizza);

		String entrada = launchPoint("Entrada", votingId);
		String salida = launchPoint("Salida", votingId);
		int entradaId = read(entrada, "$.id");
		int salidaId = read(salida, "$.id");
		String entradaCode = read(entrada, "$.code");
		String salidaCode = read(salida, "$.code");

		// Entrada: 2 papeletas a Pizza · Salida: 1 a Pizza y 1 a Pasta
		ballot(entradaCode, "e1", pizza);
		ballot(entradaCode, "e2", pizza);
		ballot(salidaCode, "s1", pizza);
		ballot(salidaCode, "s2", pasta);
		int entradaInstance = activeInstanceOf(entradaCode);
		int salidaInstance = activeInstanceOf(salidaCode);
		stop(entradaInstance);

		// RF-30: suma de los dos lanzamientos
		mvc.perform(get("/api/stats/votings/" + votingId).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.votingId").value(votingId))
			.andExpect(jsonPath("$.votingName").value("Cena"))
			.andExpect(jsonPath("$.votingDeleted").value(false))
			.andExpect(jsonPath("$.type").value("SINGLE"))
			.andExpect(jsonPath("$.scoringLabel").value("votos"))
			.andExpect(jsonPath("$.votingPointId").doesNotExist())
			.andExpect(jsonPath("$.instanceCount").value(2))
			.andExpect(jsonPath("$.totalVotes").value(4))
			.andExpect(jsonPath("$.points.length()").value(2))
			.andExpect(jsonPath("$.points[*].name").value(Matchers.containsInAnyOrder("Entrada", "Salida")))
			.andExpect(jsonPath("$.results[0].itemName").value("Pizza"))
			.andExpect(jsonPath("$.results[0].votes").value(3))
			.andExpect(jsonPath("$.results[0].percentage").value(75.0))
			.andExpect(jsonPath("$.results[1].itemName").value("Pasta"))
			.andExpect(jsonPath("$.results[1].votes").value(1))
			.andExpect(jsonPath("$.results[1].percentage").value(25.0))
			.andExpect(jsonPath("$.instances.length()").value(2))
			.andExpect(jsonPath("$.instances[*].status").value(Matchers.containsInAnyOrder("ACTIVE", "CLOSED")));

		// RF-31: solo los lanzamientos del punto Salida
		mvc.perform(get("/api/stats/votings/" + votingId).param("votingPointId", String.valueOf(salidaId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.votingPointId").value(salidaId))
			.andExpect(jsonPath("$.instanceCount").value(1))
			.andExpect(jsonPath("$.totalVotes").value(2))
			.andExpect(jsonPath("$.points.length()").value(2))
			.andExpect(jsonPath("$.results[0].votes").value(1))
			.andExpect(jsonPath("$.results[0].percentage").value(50.0))
			.andExpect(jsonPath("$.results[1].votes").value(1))
			.andExpect(jsonPath("$.instances.length()").value(1))
			.andExpect(jsonPath("$.instances[0].id").value(salidaInstance))
			.andExpect(jsonPath("$.instances[0].votingPointId").value(salidaId))
			.andExpect(jsonPath("$.instances[0].votingId").value(votingId));

		// Punto sin lanzamientos de esta votacion: resultados vacios, sin error
		mvc.perform(get("/api/stats/votings/" + votingId).param("votingPointId", "999999")
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.instanceCount").value(0))
			.andExpect(jsonPath("$.totalVotes").value(0))
			.andExpect(jsonPath("$.results.length()").value(2))
			.andExpect(jsonPath("$.results[0].votes").value(0))
			.andExpect(jsonPath("$.instances.length()").value(0));

		// RF-31: filtros en el listado de lanzamientos
		mvc.perform(get("/api/stats/instances").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[*].votingId").value(Matchers.everyItem(Matchers.is(votingId))))
			.andExpect(jsonPath("$[*].votingPointId").value(Matchers.containsInAnyOrder(entradaId, salidaId)));
		mvc.perform(get("/api/stats/instances").param("votingPointId", String.valueOf(entradaId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value(entradaInstance))
			.andExpect(jsonPath("$[0].votingPointName").value("Entrada"))
			.andExpect(jsonPath("$[0].totalVotes").value(2));
		mvc.perform(get("/api/stats/instances").param("votingId", String.valueOf(votingId))
				.param("votingPointId", String.valueOf(salidaId)).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].id").value(salidaInstance));
		mvc.perform(get("/api/stats/instances").param("votingId", String.valueOf(neverLaunched))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));

		// Aislamiento entre gestores
		String other = registerAndGetToken(uniqueEmail("stats-voting-other"));
		mvc.perform(get("/api/stats/votings/" + votingId).header("Authorization", "Bearer " + other))
			.andExpect(status().isNotFound());
		mvc.perform(get("/api/stats/instances").param("votingId", String.valueOf(votingId))
				.header("Authorization", "Bearer " + other))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));

		// La votacion borrada conserva sus resultados agregados
		stop(salidaInstance);
		mvc.perform(delete("/api/votings/" + votingId).header("Authorization", "Bearer " + token))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/stats/votings/" + votingId).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.votingDeleted").value(true))
			.andExpect(jsonPath("$.instanceCount").value(2))
			.andExpect(jsonPath("$.totalVotes").value(4))
			.andExpect(jsonPath("$.results[0].votes").value(3));
	}

	@Test
	void itemHistoryAcrossVotings() throws Exception {
		token = registerAndGetToken(uniqueEmail("stats-item"));
		int pizza = createItem("Pizza");
		int pasta = createItem("Pasta");
		int ensalada = createItem("Ensalada");
		int tacos = createItem("Tacos");
		int sushi = createItem("Sushi"); // nunca participa

		// Votacion SINGLE: Pizza gana con 3 de 4 papeletas; Ensalada no recibe votos
		int cena = createVoting("Cena", "SINGLE", pizza, pasta, ensalada);
		String cenaPoint = launchPoint("Comedor", cena);
		String cenaCode = read(cenaPoint, "$.code");
		ballot(cenaCode, "c1", pizza);
		ballot(cenaCode, "c2", pizza);
		ballot(cenaCode, "c3", pizza);
		ballot(cenaCode, "c4", pasta);
		int cenaInstance = activeInstanceOf(cenaCode);
		stop(cenaInstance);

		// Votacion RANKING (Borda, M=3): Pasta 8 pts, Pizza 7 pts, Tacos 3 pts sobre un maximo de 9
		int podio = createVoting("Podio", "RANKING", pizza, pasta, tacos);
		String podioPoint = launchPoint("Salon", podio);
		String podioCode = read(podioPoint, "$.code");
		ballot(podioCode, "p1", pasta, pizza, tacos);
		ballot(podioCode, "p2", pasta, pizza, tacos);
		ballot(podioCode, "p3", pizza, pasta, tacos);
		int podioInstance = activeInstanceOf(podioCode);

		// RF-32: historico de Pizza en las dos votaciones
		mvc.perform(get("/api/stats/items/" + pizza).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.itemId").value(pizza))
			.andExpect(jsonPath("$.itemName").value("Pizza"))
			.andExpect(jsonPath("$.deleted").value(false))
			.andExpect(jsonPath("$.participations").value(2))
			.andExpect(jsonPath("$.totalVotes").value(6))
			.andExpect(jsonPath("$.wins").value(1))
			.andExpect(jsonPath("$.averagePercentage").value(76.4))
			.andExpect(jsonPath("$.history.length()").value(2))
			// El mas reciente primero
			.andExpect(jsonPath("$.history[0].instanceId").value(podioInstance))
			.andExpect(jsonPath("$.history[0].votingName").value("Podio"))
			.andExpect(jsonPath("$.history[0].votingPointName").value("Salon"))
			.andExpect(jsonPath("$.history[0].type").value("RANKING"))
			.andExpect(jsonPath("$.history[0].scoringLabel").value("puntos"))
			.andExpect(jsonPath("$.history[0].status").value("ACTIVE"))
			.andExpect(jsonPath("$.history[0].totalBallots").value(3))
			.andExpect(jsonPath("$.history[0].position").value(2))
			.andExpect(jsonPath("$.history[0].candidates").value(3))
			.andExpect(jsonPath("$.history[0].votes").value(3))
			.andExpect(jsonPath("$.history[0].points").value(7))
			.andExpect(jsonPath("$.history[0].averageRank").value(1.67))
			.andExpect(jsonPath("$.history[0].firstPlaces").value(1))
			.andExpect(jsonPath("$.history[0].percentage").value(77.8))
			.andExpect(jsonPath("$.history[1].instanceId").value(cenaInstance))
			.andExpect(jsonPath("$.history[1].votingName").value("Cena"))
			.andExpect(jsonPath("$.history[1].type").value("SINGLE"))
			.andExpect(jsonPath("$.history[1].scoringLabel").value("votos"))
			.andExpect(jsonPath("$.history[1].status").value("CLOSED"))
			.andExpect(jsonPath("$.history[1].endedAt").isNotEmpty())
			.andExpect(jsonPath("$.history[1].totalBallots").value(4))
			.andExpect(jsonPath("$.history[1].position").value(1))
			.andExpect(jsonPath("$.history[1].candidates").value(3))
			.andExpect(jsonPath("$.history[1].votes").value(3))
			.andExpect(jsonPath("$.history[1].points").value(3))
			.andExpect(jsonPath("$.history[1].averageRank").doesNotExist())
			.andExpect(jsonPath("$.history[1].percentage").value(75.0));

		// Item candidato sin votos: cuenta como participacion en ultimo puesto, sin victorias
		mvc.perform(get("/api/stats/items/" + ensalada).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.participations").value(1))
			.andExpect(jsonPath("$.totalVotes").value(0))
			.andExpect(jsonPath("$.wins").value(0))
			.andExpect(jsonPath("$.averagePercentage").value(0.0))
			.andExpect(jsonPath("$.history[0].position").value(3))
			.andExpect(jsonPath("$.history[0].votes").value(0));

		// Item que nunca ha participado
		mvc.perform(get("/api/stats/items/" + sushi).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.participations").value(0))
			.andExpect(jsonPath("$.wins").value(0))
			.andExpect(jsonPath("$.averagePercentage").doesNotExist())
			.andExpect(jsonPath("$.history.length()").value(0));

		// Aislamiento entre gestores
		String other = registerAndGetToken(uniqueEmail("stats-item-other"));
		mvc.perform(get("/api/stats/items/" + pizza).header("Authorization", "Bearer " + other))
			.andExpect(status().isNotFound());

		// El item borrado logicamente conserva su historico
		stop(podioInstance);
		mvc.perform(delete("/api/items/" + pizza).header("Authorization", "Bearer " + token))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/stats/items/" + pizza).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.deleted").value(true))
			.andExpect(jsonPath("$.participations").value(2))
			.andExpect(jsonPath("$.wins").value(1));
	}
}
