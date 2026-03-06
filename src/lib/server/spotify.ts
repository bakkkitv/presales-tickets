import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from '$env/static/private';

export type SpotifyTopArtist = {
	id: string;
	name: string;
	images?: { url: string; height?: number; width?: number }[];
};

export type SpotifyRecentlyPlayedItem = {
	played_at: string;
	track: {
		id: string;
		name: string;
		external_urls?: { spotify?: string };
		album?: {
			name?: string;
			images?: { url: string; height?: number; width?: number }[];
		};
		artists: { id: string; name: string }[];
	};
};

function basicAuthHeader(clientId: string, clientSecret: string) {
	const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	return `Basic ${token}`;
}

export async function refreshSpotifyAccessToken(refreshToken: string) {
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: basicAuthHeader(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken
		})
	});

	const json = await res.json();
	if (!res.ok) {
		return { ok: false as const, error: json };
	}

	return {
		ok: true as const,
		access_token: json.access_token as string,
		expires_in: json.expires_in as number,
		refresh_token: (json.refresh_token as string | undefined) ?? null
	};
}

export async function fetchSpotifyTopArtists(accessToken: string, limit = 15) {
	const res = await fetch(
		`https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=${limit}`,
		{
			headers: { Authorization: `Bearer ${accessToken}` }
		}
	);

	const json = await res.json();
	if (!res.ok) return { ok: false as const, error: json };
	return { ok: true as const, items: (json.items ?? []) as SpotifyTopArtist[] };
}

export async function fetchSpotifyRecentlyPlayed(accessToken: string, limit = 20) {
	const res = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	const json = await res.json();
	if (!res.ok) return { ok: false as const, error: json };
	return { ok: true as const, items: (json.items ?? []) as SpotifyRecentlyPlayedItem[] };
}

