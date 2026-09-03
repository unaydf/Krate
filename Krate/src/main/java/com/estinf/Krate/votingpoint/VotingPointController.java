package com.estinf.Krate.votingpoint;

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
import com.estinf.Krate.votingpoint.VotingPointDtos.VotingPointRequest;
import com.estinf.Krate.votingpoint.VotingPointDtos.VotingPointResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/voting-points")
public class VotingPointController {

	private final VotingPointService service;
	private final CurrentUser currentUser;

	public VotingPointController(VotingPointService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<VotingPointResponse> list() {
		return service.list(currentUser.id());
	}

	@GetMapping("/{id}")
	public VotingPointResponse get(@PathVariable long id) {
		return service.get(currentUser.id(), id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public VotingPointResponse create(@Valid @RequestBody VotingPointRequest req) {
		return service.create(currentUser.id(), req);
	}

	@PutMapping("/{id}")
	public VotingPointResponse update(@PathVariable long id, @Valid @RequestBody VotingPointRequest req) {
		return service.update(currentUser.id(), id, req);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable long id) {
		service.delete(currentUser.id(), id);
	}
}
