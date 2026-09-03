package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Flujos de los tipos de votacion LIMITED y RANKING a traves de la API. */
class VotingTypesFlowTest extends ApiTestSupport {

	private String token;

	private int createItem(String name) throws Exception {
		String json = mvc.perform(multipart("/api/items").param("name", name).header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	private String votingBody(String name, String type, Integer max, int... itemIds) {
		StringBuilder ids = new StringBuilder();
		for (int id : itemIds) {
			ids.append(ids.isEmpty() ? "" : ",").append(id);
		}
		return "{\"name\":\"%s\",\"description\":\"\",\"type\":\"%s\",\"maxSelections\":%s,\"itemIds\":[%s]}"
			.formatted(name, type, max, ids);
	}

	private int createVoting(String name, String type, Integer max, int... itemIds) throws Exception {
		String json = mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content(votingBody(name, type, max, itemIds)).header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.type").value(type))
			.andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	private String launch(int votingId, String pointName) throws Exception {
		String p = mvc.perform(post("/api/voting-points").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"description\":\"\",\"votingId\":%d}".formatted(pointName, votingId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		int pointId = read(p, "$.id");
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated());
		return read(p, "$.code");
	}

	private void ballot(String code, String voter, int expectedStatus, int... itemIds) throws Exception {
		StringBuilder ids = new StringBuilder();
		for (int id : itemIds) {
			ids.append(ids.isEmpty() ? "" : ",").append(id);
		}
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[%s],\"voterToken\":\"%s\"}".formatted(ids, voter)))
			.andExpect(status().is(expectedStatus));
	}

	@Test
	void limitedVoting() throws Exception {
		token = registerAndGetToken(uniqueEmail("limited"));
		int a = createItem("A");
		int b = createItem("B");
		int c = createItem("C");

		// Configuracion invalida
		mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content(votingBody("Mal", "LIMITED", null, a, b, c)).header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content(votingBody("Mal", "LIMITED", 4, a, b, c)).header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content(votingBody("Mal", "SINGLE", 2, a, b, c)).header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest());

		int votingId = createVoting("Menú", "LIMITED", 2, a, b, c);
		String code = launch(votingId, "Comedor");

		mvc.perform(get("/api/public/points/" + code))
			.andExpect(jsonPath("$.voting.type").value("LIMITED"))
			.andExpect(jsonPath("$.voting.maxSelections").value(2))
			.andExpect(jsonPath("$.voting.instructions").value(org.hamcrest.Matchers.containsString("hasta 2")));

		ballot(code, "v1", 400, a, b, c);   // demasiados
		ballot(code, "v1", 400, a, a);      // repetido
		ballot(code, "v1", 201, a, b);
		ballot(code, "v1", 409, c);         // ya voto
		ballot(code, "v2", 201, b);
		ballot(code, "v3", 201, b, c);

		// Cambiar el tipo con instancia activa -> 409
		mvc.perform(put("/api/votings/" + votingId).contentType(MediaType.APPLICATION_JSON)
				.content(votingBody("Menú", "SINGLE", null, a, b, c)).header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());

		String instances = mvc.perform(get("/api/stats/instances").header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$[0].totalVotes").value(3))
			.andReturn().getResponse().getContentAsString();
		int instanceId = read(instances, "$[0].id");
		mvc.perform(get("/api/stats/instances/" + instanceId).header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.type").value("LIMITED"))
			.andExpect(jsonPath("$.scoringLabel").value("votos"))
			.andExpect(jsonPath("$.results[0].itemName").value("B"))
			.andExpect(jsonPath("$.results[0].votes").value(3))
			.andExpect(jsonPath("$.results[0].percentage").value(100.0))
			.andExpect(jsonPath("$.results[1].votes").value(1));
	}

	@Test
	void rankingVoting() throws Exception {
		token = registerAndGetToken(uniqueEmail("ranking"));
		int a = createItem("A");
		int b = createItem("B");
		int c = createItem("C");
		int votingId = createVoting("Podio", "RANKING", null, a, b, c);
		String code = launch(votingId, "Escenario");

		mvc.perform(get("/api/public/points/" + code))
			.andExpect(jsonPath("$.voting.type").value("RANKING"))
			.andExpect(jsonPath("$.voting.maxSelections").doesNotExist());

		ballot(code, "r1", 201, a, b, c); // A3 B2 C1
		ballot(code, "r2", 201, b, a);    // B3 A2
		ballot(code, "r3", 201, a);       // A3
		ballot(code, "r3", 409, b);
		ballot(code, "r4", 400, a, a);

		String instances = mvc.perform(get("/api/stats/instances").header("Authorization", "Bearer " + token))
			.andReturn().getResponse().getContentAsString();
		int instanceId = read(instances, "$[0].id");
		mvc.perform(get("/api/stats/instances/" + instanceId).header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.type").value("RANKING"))
			.andExpect(jsonPath("$.scoringLabel").value("puntos"))
			.andExpect(jsonPath("$.instance.totalVotes").value(3))
			.andExpect(jsonPath("$.results[0].itemName").value("A"))
			.andExpect(jsonPath("$.results[0].points").value(8))
			.andExpect(jsonPath("$.results[0].firstPlaces").value(2))
			.andExpect(jsonPath("$.results[0].averageRank").value(1.33))
			.andExpect(jsonPath("$.results[1].itemName").value("B"))
			.andExpect(jsonPath("$.results[1].points").value(5))
			.andExpect(jsonPath("$.results[2].itemName").value("C"))
			.andExpect(jsonPath("$.results[2].points").value(1));
	}

	@Test
	void launchFailsWhenLimitExceedsRemainingItems() throws Exception {
		token = registerAndGetToken(uniqueEmail("limit-launch"));
		int a = createItem("A");
		int b = createItem("B");
		int c = createItem("C");
		int votingId = createVoting("Tres", "LIMITED", 3, a, b, c);
		// Borrar un item deja 2 items y un maximo de 3 -> no se puede lanzar
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/items/" + c)
				.header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
		String p = mvc.perform(post("/api/voting-points").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"P\",\"description\":\"\",\"votingId\":%d}".formatted(votingId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		int pointId = read(p, "$.id");
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());
	}
}
