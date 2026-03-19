import { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } from '$env/static/private';
import * as jose from 'jose';

// ─────────────────────────────────────────────
// Generate a Developer Token (JWT)
// Apple requires this to prove requests come from your app.
// It expires after 6 months max — we use 180 days here.
// ─────────────────────────────────────────────
export async function generateAppleDeveloperToken(): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const expiry = now + 60 * 60 * 24 * 180; // 180 days

	// Handle standard newlines, escaped newlines, and strip accidental quotes
	const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
	const key = await jose.importPKCS8(privateKey, 'ES256');

	const token = await new jose.SignJWT({})
		.setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID })
		.setIssuer(APPLE_TEAM_ID)
		.setIssuedAt(now)
		.setExpirationTime(expiry)
		.sign(key);

	return token;
}

// ─────────────────────────────────────────────
// Fetch the user's heavy rotation (most played)
// This is the Apple Music equivalent of Spotify's top artists.
// Requires the user's Music User Token (from the frontend MusicKit flow).
// ─────────────────────────────────────────────
export async function fetchAppleMusicTopArtists(musicUserToken: string, limit = 15) {
	const developerToken = await generateAppleDeveloperToken();

	// Apple doesn't have a direct "top artists" endpoint.
	// We use heavy-rotation (most played recently) and extract unique artists.
	const res = await fetch(
		`https://api.music.apple.com/v1/me/history/heavy-rotation?limit=25&types=artists`,
		{
			headers: {
				Authorization: `Bearer ${developerToken}`,
				'Music-User-Token': musicUserToken
			}
		}
	);

	const json = await res.json();
	if (!res.ok) return { ok: false as const, error: json };

	const artists = (json.data ?? [])
		.filter((item: any) => item.type === 'artists')
		.slice(0, limit)
		.map((item: any) => ({
			id: item.id,
			name: item.attributes?.name ?? 'Unknown',
			image_url: item.attributes?.artwork?.url
				? item.attributes.artwork.url
						.replace('{w}', '300')
						.replace('{h}', '300')
				: null
		}));

	return { ok: true as const, items: artists };
}

// ─────────────────────────────────────────────
// Look up a Spotify ID for an Apple Music artist name.
// We use this to match Apple Music artists against your events table
// which stores artist_spotify_id. We do a simple name lookup.
// ─────────────────────────────────────────────
export async function lookupSpotifyIdsByNames(
	names: string[],
	spotifyAccessToken: string
): Promise<Map<string, string>> {
	const map = new Map<string, string>();

	await Promise.all(
		names.map(async (name) => {
			try {
				const res = await fetch(
					`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
					{ headers: { Authorization: `Bearer ${spotifyAccessToken}` } }
				);
				const json = await res.json();
				const artist = json.artists?.items?.[0];
				if (artist) map.set(name.toLowerCase(), artist.id);
			} catch {
				// silently skip if lookup fails for one artist
			}
		})
	);

	return map;
}