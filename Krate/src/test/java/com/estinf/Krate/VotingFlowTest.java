package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class VotingFlowTest extends ApiTestSupport {

	private String token;

	private int createItem(String name) throws Exception {
		String json = mvc.perform(multipart("/api/items").param("name", name).header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	private int createVoting(String name, int... itemIds) throws Exception {
		StringBuilder ids = new StringBuilder();
		for (int id : itemIds) {
			ids.append(ids.isEmpty() ? "" : ",").append(id);
		}
		String json = mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"description\":\"desc\",\"itemIds\":[%s]}".formatted(name, ids))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return read(json, "$.id");
	}

	private String createPoint(String name, Integer votingId) throws Exception {
		return mvc.perform(post("/api/voting-points").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"%s\",\"description\":\"\",\"votingId\":%s}".formatted(name, votingId))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
	}

	@Test
	void fullLaunchVoteStopAndStatsFlow() throws Exception {
		token = registerAndGetToken(uniqueEmail("flow"));
		int pizza = createItem("Pizza");
		int pasta = createItem("Pasta");
		int votingId = createVoting("Cena", pizza, pasta);

		String point = createPoint("Entrada", votingId);
		int pointId = read(point, "$.id");
		String code = read(point, "$.code");
		String publicUrl = read(point, "$.publicUrl");
		org.assertj.core.api.Assertions.assertThat(publicUrl).endsWith("/p/" + code);
		org.assertj.core.api.Assertions.assertThat(code).hasSize(8);

		// Sin instancia: desactivada
		mvc.perform(get("/api/public/points/" + code))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("INACTIVE"))
			.andExpect(jsonPath("$.voting").doesNotExist());

		// Codigo inexistente
		mvc.perform(get("/api/public/points/zzzzzzzz")).andExpect(status().isNotFound());

		// Lanzar
		String launched = mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("ACTIVE"))
			.andExpect(jsonPath("$.votingName").value("Cena"))
			.andReturn().getResponse().getContentAsString();
		int instanceId = read(launched, "$.id");

		// Segundo lanzamiento del mismo punto -> 409
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());

		// Con instancia activa no se puede borrar la votacion, el item ni el punto, ni cambiar items
		mvc.perform(delete("/api/votings/" + votingId).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
		mvc.perform(delete("/api/items/" + pizza).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
		mvc.perform(delete("/api/voting-points/" + pointId).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
		mvc.perform(put("/api/votings/" + votingId).contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Cena\",\"description\":\"\",\"itemIds\":[" + pizza + "]}")
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());
		// Pero si se puede cambiar el nombre manteniendo los items
		mvc.perform(put("/api/votings/" + votingId).contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Cena de viernes\",\"description\":\"\",\"itemIds\":[" + pizza + "," + pasta + "]}")
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.hasActiveInstance").value(true));

		// Vista publica activa
		mvc.perform(get("/api/public/points/" + code).header("X-Voter-Token", "voter-1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("ACTIVE"))
			.andExpect(jsonPath("$.instanceId").value(instanceId))
			.andExpect(jsonPath("$.alreadyVoted").value(false))
			.andExpect(jsonPath("$.voting.items.length()").value(2))
			.andExpect(jsonPath("$.voting.items[0].name").value("Pizza"));

		// Votar
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[" + pizza + "],\"voterToken\":\"voter-1\"}"))
			.andExpect(status().isCreated());
		mvc.perform(get("/api/public/points/" + code).header("X-Voter-Token", "voter-1"))
			.andExpect(jsonPath("$.alreadyVoted").value(true));
		// Doble voto -> 409
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[" + pasta + "],\"voterToken\":\"voter-1\"}"))
			.andExpect(status().isConflict());
		// Item ajeno -> 400
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[999999],\"voterToken\":\"voter-2\"}"))
			.andExpect(status().isBadRequest());
		// Otro votante
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[" + pizza + "],\"voterToken\":\"voter-2\"}"))
			.andExpect(status().isCreated());

		// Instancias activas del gestor
		mvc.perform(get("/api/instances").param("status", "ACTIVE").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1))
			.andExpect(jsonPath("$[0].publicUrl").value(publicUrl));

		// Detener
		mvc.perform(post("/api/instances/" + instanceId + "/stop").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("CLOSED"))
			.andExpect(jsonPath("$.endedAt").isNotEmpty());
		mvc.perform(post("/api/instances/" + instanceId + "/stop").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());
		mvc.perform(get("/api/public/points/" + code))
			.andExpect(jsonPath("$.status").value("INACTIVE"));
		mvc.perform(post("/api/public/points/" + code + "/votes").contentType(MediaType.APPLICATION_JSON)
				.content("{\"itemIds\":[" + pizza + "],\"voterToken\":\"voter-3\"}"))
			.andExpect(status().isConflict());

		// Estadisticas
		mvc.perform(get("/api/stats/instances").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(instanceId))
			.andExpect(jsonPath("$[0].totalVotes").value(2));
		mvc.perform(get("/api/stats/instances/" + instanceId).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.instance.totalVotes").value(2))
			.andExpect(jsonPath("$.results[0].itemName").value("Pizza"))
			.andExpect(jsonPath("$.results[0].votes").value(2))
			.andExpect(jsonPath("$.results[0].percentage").value(100.0))
			.andExpect(jsonPath("$.results[1].itemName").value("Pasta"))
			.andExpect(jsonPath("$.results[1].votes").value(0));

		// Borrado logico del item: desaparece de la votacion pero sigue en estadisticas
		mvc.perform(delete("/api/items/" + pizza).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
		mvc.perform(get("/api/votings/" + votingId).header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].name").value("Pasta"));
		mvc.perform(get("/api/stats/instances/" + instanceId).header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.results[0].itemName").value("Pizza"))
			.andExpect(jsonPath("$.results[0].deleted").value(true))
			.andExpect(jsonPath("$.results[0].votes").value(2));

		// Borrar la votacion: el punto queda sin votacion y no se puede lanzar
		mvc.perform(delete("/api/votings/" + votingId).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
		mvc.perform(get("/api/voting-points/" + pointId).header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.voting").doesNotExist());
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());

		// Borrar el punto: su enlace publico deja de resolver
		mvc.perform(delete("/api/voting-points/" + pointId).header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
		mvc.perform(get("/api/public/points/" + code)).andExpect(status().isNotFound());
		mvc.perform(get("/api/voting-points").header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.length()").value(0));
		// Las estadisticas historicas se conservan
		mvc.perform(get("/api/stats/instances").header("Authorization", "Bearer " + token))
			.andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void launchRequiresAssignedVotingWithItems() throws Exception {
		token = registerAndGetToken(uniqueEmail("launch"));
		String noVoting = createPoint("Sin votacion", null);
		int noVotingId = read(noVoting, "$.id");
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + noVotingId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());

		int emptyVoting = createVoting("Vacia");
		String p = createPoint("Con votacion vacia", emptyVoting);
		int pId = read(p, "$.id");
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value(Matchers.containsString("no tiene items")));
	}

	@Test
	void votingWithForeignItemIsRejected() throws Exception {
		token = registerAndGetToken(uniqueEmail("owner-a"));
		int mine = createItem("Mio");
		String other = registerAndGetToken(uniqueEmail("owner-b"));
		String json = mvc.perform(multipart("/api/items").param("name", "Ajeno").header("Authorization", "Bearer " + other))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		int foreign = read(json, "$.id");

		mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"X\",\"itemIds\":[" + mine + "," + foreign + "]}")
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest());
	}

	private String pointBody(String name, String description, Integer votingId) {
		return "{\"name\":\"%s\",\"description\":\"%s\",\"votingId\":%s}".formatted(name, description, votingId);
	}

	@Test
	void editPointAndVotingReassignmentBlockedWhileActive() throws Exception {
		token = registerAndGetToken(uniqueEmail("edit-point"));
		int pizza = createItem("Pizza");
		int pasta = createItem("Pasta");
		int cena = createVoting("Cena", pizza, pasta);
		int postre = createVoting("Postre", pizza);
		int pointId = read(createPoint("Entrada", cena), "$.id");

		// Sin instancia: se edita todo, incluida la votacion asignada
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada principal", "Junto a la puerta", postre))
				.header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Entrada principal"))
			.andExpect(jsonPath("$.description").value("Junto a la puerta"))
			.andExpect(jsonPath("$.voting.id").value(postre));

		// Nombre en blanco -> 400
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("  ", "", postre)).header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.name").exists());

		// Votacion de otro gestor -> 404
		String other = registerAndGetToken(uniqueEmail("edit-point-other"));
		String foreignVoting = mvc.perform(post("/api/votings").contentType(MediaType.APPLICATION_JSON)
				.content("{\"name\":\"Ajena\",\"itemIds\":[]}").header("Authorization", "Bearer " + other))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		int foreignId = read(foreignVoting, "$.id");
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada principal", "", foreignId)).header("Authorization", "Bearer " + token))
			.andExpect(status().isNotFound());

		// Lanzar
		mvc.perform(post("/api/instances").contentType(MediaType.APPLICATION_JSON)
				.content("{\"votingPointId\":" + pointId + "}").header("Authorization", "Bearer " + token))
			.andExpect(status().isCreated());

		// Con instancia activa: cambiar o quitar la votacion asignada -> 409
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada principal", "", cena)).header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value(Matchers.containsString("instancia activa")));
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada principal", "", null)).header("Authorization", "Bearer " + token))
			.andExpect(status().isConflict());

		// Pero nombre y descripcion si se pueden editar manteniendo la votacion
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada norte", "Planta baja", postre)).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Entrada norte"))
			.andExpect(jsonPath("$.description").value("Planta baja"))
			.andExpect(jsonPath("$.voting.id").value(postre))
			.andExpect(jsonPath("$.activeInstance.status").value("ACTIVE"));

		// Tras detener, la votacion vuelve a poder cambiarse
		int instanceId = read(mvc.perform(get("/api/voting-points/" + pointId).header("Authorization", "Bearer " + token))
			.andReturn().getResponse().getContentAsString(), "$.activeInstance.id");
		mvc.perform(post("/api/instances/" + instanceId + "/stop").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk());
		mvc.perform(put("/api/voting-points/" + pointId).contentType(MediaType.APPLICATION_JSON)
				.content(pointBody("Entrada norte", "Planta baja", cena)).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.voting.id").value(cena))
			.andExpect(jsonPath("$.activeInstance").doesNotExist());
	}
}
