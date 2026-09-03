package com.estinf.Krate;

import org.springframework.boot.SpringApplication;

public class TestKrateApplication {

	public static void main(String[] args) {
		SpringApplication.from(KrateApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
