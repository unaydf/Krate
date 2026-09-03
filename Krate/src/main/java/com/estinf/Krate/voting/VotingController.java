package com.estinf.Krate.voting;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.CurrentUser;
import com.estinf.Krate.voting.VotingDtos.VotingRequest;
import com.estinf.Krate.voting.VotingDtos.VotingResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/votings")
public class VotingController {

	private final VotingService service;
	private final CurrentUser currentUser;

	public VotingController(VotingService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<VotingResponse> list() {
		return service.list(currentUser.id());
	}

	@GetMapping("/{id}")
	public VotingResponse get(@PathVariable long id) {
		return service.get(currentUser.id(), id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public VotingResponse create(@Valid @RequestBody VotingRequest req) {
		return service.create(currentUser.id(), req);
	}

	@PutMapping("/{id}")
	public VotingResponse update(@PathVariable long id, @Valid @RequestBody VotingRequest req) {
		return service.update(currentUser.id(), id, req);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable long id) {
		service.delete(currentUser.id(), id);
	}
}
