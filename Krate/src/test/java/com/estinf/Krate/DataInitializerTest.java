package com.estinf.Krate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.estinf.Krate.config.DataInitializer;
import com.estinf.Krate.item.ItemRepository;
import com.estinf.Krate.user.UserRepository;
import com.estinf.Krate.voting.VotingRepository;
import com.estinf.Krate.votingpoint.VotingPointRepository;

/** Arranca con app.seed.enabled=true en un contexto propio y comprueba los datos de prueba. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = { "app.seed.enabled=true", "app.upload-dir=target/test-uploads-seed" })
@AutoConfigureMockMvc
class DataInitializerTest {

	@Autowired MockMvc mvc;
	@Autowired UserRepository users;
	@Autowired ItemRepository items;
	@Autowired VotingRepository votings;
	@Autowired VotingPointRepository points;

	@Test
	void seedsTestManagerWithItemsVotingsAndPoints() throws Exception {
		assertThat(users.count()).isEqualTo(1);
		long owner = users.findByEmailIgnoreCase(DataInitializer.EMAIL).orElseThrow().getId();
		assertThat(items.findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(owner)).hasSize(10);
		assertThat(votings.findAllActiveByOwner(owner)).hasSize(3)
			.extracting(v -> v.getType().name()).containsExactlyInAnyOrder("SINGLE", "LIMITED", "RANKING");
		assertThat(points.findAllByOwnerIdAndDeletedAtIsNullOrderByNameAsc(owner)).hasSize(2)
			.allSatisfy(p -> assertThat(p.getVoting()).isNotNull());

		String json = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(DataInitializer.EMAIL, DataInitializer.PASSWORD)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user.name").value(DataInitializer.NAME))
			.andReturn().getResponse().getContentAsString();
		String token = com.jayway.jsonpath.JsonPath.read(json, "$.token");
		mvc.perform(get("/api/voting-points").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].voting.name").isNotEmpty());
	}
}
