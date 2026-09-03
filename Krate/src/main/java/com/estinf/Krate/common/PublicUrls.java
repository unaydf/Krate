package com.estinf.Krate.common;

import org.springframework.stereotype.Component;

import com.estinf.Krate.config.AppProperties;

/** Construye las URL publicas (enlace de un punto de votacion, imagenes). */
@Component
public class PublicUrls {

	private final String votingBase;

	public PublicUrls(AppProperties props) {
		this.votingBase = props.publicVotingUrl().replaceAll("/+$", "");
	}

	public String votingPoint(String code) {
		return votingBase + "/p/" + code;
	}

	public String image(String imagePath) {
		return imagePath == null ? null : "/api/files/" + imagePath;
	}
}
