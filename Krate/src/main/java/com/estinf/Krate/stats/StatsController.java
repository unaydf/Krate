package com.estinf.Krate.stats;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.estinf.Krate.common.CurrentUser;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsDetail;
import com.estinf.Krate.stats.StatsDtos.InstanceStatsSummary;
import com.estinf.Krate.stats.StatsDtos.ItemHistory;
import com.estinf.Krate.stats.StatsDtos.VotingStatsDetail;

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
	public List<InstanceStatsSummary> instances(@RequestParam(required = false) Long votingId,
			@RequestParam(required = false) Long votingPointId) {
		return service.listInstances(currentUser.id(), votingId, votingPointId);
	}

	@GetMapping("/instances/{id}")
	public InstanceStatsDetail instance(@PathVariable long id) {
		return service.instanceDetail(currentUser.id(), id);
	}

	@GetMapping("/votings/{id}")
	public VotingStatsDetail voting(@PathVariable long id, @RequestParam(required = false) Long votingPointId) {
		return service.votingDetail(currentUser.id(), id, votingPointId);
	}

	@GetMapping("/items/{id}")
	public ItemHistory item(@PathVariable long id) {
		return service.itemHistory(currentUser.id(), id);
	}
}
