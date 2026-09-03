package com.estinf.Krate.stats;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.CurrentUser;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsDetail;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsSummary;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

	private final StatsService service;
	private final CurrentUser currentUser;

	public StatsController(StatsService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@GetMapping("/instances")
	public List<InstanceStatsSummary> instances() {
		return service.listInstances(currentUser.id());
	}

	@GetMapping("/instances/{id}")
	public InstanceStatsDetail instance(@PathVariable long id) {
		return service.instanceDetail(currentUser.id(), id);
	}
}
