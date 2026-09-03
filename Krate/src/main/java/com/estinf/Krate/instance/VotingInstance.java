package com.estinf.Krate.instance;

import java.time.Instant;

import com.estinf.Krate.voting.Voting;
import com.estinf.Krate.votingpoint.VotingPoint;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "voting_instances")
public class VotingInstance {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "voting_point_id", nullable = false)
	private VotingPoint votingPoint;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "voting_id", nullable = false)
	private Voting voting;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InstanceStatus status = InstanceStatus.ACTIVE;

	@Column(name = "started_at", nullable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	protected VotingInstance() {
	}

	public VotingInstance(VotingPoint votingPoint, Voting voting) {
		this.votingPoint = votingPoint;
		this.voting = voting;
		this.startedAt = Instant.now();
	}

	public void close() {
		this.status = InstanceStatus.CLOSED;
		this.endedAt = Instant.now();
	}

	public boolean isActive() {
		return status == InstanceStatus.ACTIVE;
	}

	public Long getId() { return id; }
	public VotingPoint getVotingPoint() { return votingPoint; }
	public Voting getVoting() { return voting; }
	public InstanceStatus getStatus() { return status; }
	public Instant getStartedAt() { return startedAt; }
	public Instant getEndedAt() { return endedAt; }
}
