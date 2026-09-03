package com.estinf.Krate.instance;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.CurrentUser;
import com.estinf.Krate.instance.InstanceDtos.InstanceResponse;
import com.estinf.Krate.instance.InstanceDtos.LaunchRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/instances")
public class InstanceController {

	private final InstanceService service;
	private final CurrentUser currentUser;

	public InstanceController(InstanceService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<InstanceResponse> list(@RequestParam(required = false) InstanceStatus status) {
		return service.list(currentUser.id(), status);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public InstanceResponse launch(@Valid @RequestBody LaunchRequest req) {
		return service.launch(currentUser.id(), req.votingPointId());
	}

	@PostMapping("/{id}/stop")
	public InstanceResponse stop(@PathVariable long id) {
		return service.stop(currentUser.id(), id);
	}
}
