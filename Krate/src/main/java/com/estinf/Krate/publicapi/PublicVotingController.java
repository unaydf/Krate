package com.estinf.Krate.publicapi;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.publicapi.PublicDtos.PublicPointResponse;
import com.estinf.Krate.publicapi.PublicDtos.VoteRequest;
import com.estinf.Krate.publicapi.PublicDtos.VoteResponse;

import jakarta.validation.Valid;

/** API publica consumida por la voting app. No requiere autenticacion. */
@RestController
@RequestMapping("/api/public/points")
public class PublicVotingController {

	private final PublicVotingService service;

	public PublicVotingController(PublicVotingService service) {
		this.service = service;
	}

	@GetMapping("/{code}")
	public PublicPointResponse getPoint(@PathVariable String code,
			@RequestHeader(name = "X-Voter-Token", required = false) String voterToken) {
		return service.getPoint(code, voterToken);
	}

	@PostMapping("/{code}/votes")
	@ResponseStatus(HttpStatus.CREATED)
	public VoteResponse vote(@PathVariable String code, @Valid @RequestBody VoteRequest req) {
		return service.vote(code, req);
	}
}
