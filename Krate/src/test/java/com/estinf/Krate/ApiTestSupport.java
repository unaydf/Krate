package com.estinf.Krate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

/** Base para tests de integracion: arranca la app con PostgreSQL en Testcontainers y expone MockMvc. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "app.upload-dir=target/test-uploads")
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

	@Autowired
	protected MockMvc mvc;

	/** Registra un usuario nuevo y devuelve su token JWT. */
	protected String registerAndGetToken(String email) throws Exception {
		String body = """
			{"email":"%s","name":"Usuario %s","password":"secreto123"}
			""".formatted(email, email);
		String json = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		return JsonPath.read(json, "$.token");
	}

	protected static String uniqueEmail(String prefix) {
		return prefix + "-" + System.nanoTime() + "@test.local";
	}

	protected static <T> T read(String json, String path) {
		return JsonPath.read(json, path);
	}
}
