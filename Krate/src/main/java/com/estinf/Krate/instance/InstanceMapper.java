package com.estinf.Krate.instance;

import org.springframework.stereotype.Component;

import com.estinf.Krate.common.PublicUrls;
import com.estinf.Krate.instance.InstanceDtos.InstanceResponse;

@Component
public class InstanceMapper {

	private final PublicUrls urls;

	public InstanceMapper(PublicUrls urls) {
		this.urls = urls;
	}

	public InstanceResponse toResponse(VotingInstance i) {
		var point = i.getVotingPoint();
		var voting = i.getVoting();
		return new InstanceResponse(i.getId(), point.getId(), point.getName(), point.getCode(),
			urls.votingPoint(point.getCode()), voting.getId(), voting.getName(), i.getStatus(),
			i.getStartedAt(), i.getEndedAt());
	}
}
