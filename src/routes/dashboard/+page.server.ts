import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import {
	fetchSpotifyRecentlyPlayed,
	fetchSpotifyTopArtists,
	refreshSpotifyAccessToken
} from '$lib/server/spotify';

export const load: PageServerLoad = async ({ locals }) => {
	const localsAny = locals as any;
	const {
		data: { session }
	} = await localsAny.supabase.auth.getSession();

	if (!session) {
		throw redirect(303, '/login?error=not_authenticated');
	}

	const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	const { data: userRow, error: userErr } = await admin
		.from('users')
		.select(
			'id, auth_user_id, streaming_service, is_authorized, access_token, refresh_token, token_expires_at'
		)
		.eq('auth_user_id', session.user.id)
		.limit(1)
		.maybeSingle();

	if (userErr) {
		console.error('Load users row failed:', userErr);
	}

	if (!userRow || !userRow.is_authorized || userRow.streaming_service !== 'spotify') {
		return {
		email: session.user.email ?? null,
			connected: false,
			topArtists: [],
			feed: []
		};
	}

	let accessToken: string | null = userRow.access_token ?? null;
	const refreshToken: string | null = userRow.refresh_token ?? null;
	const expiresAt: string | null = userRow.token_expires_at ?? null;

	const isExpired =
		!expiresAt ? false : Date.now() >= new Date(expiresAt).getTime() - 60_000; // refresh 1m early

	if (isExpired && refreshToken) {
		const refreshed = await refreshSpotifyAccessToken(refreshToken);
		if (refreshed.ok) {
			accessToken = refreshed.access_token;

			const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
			await admin
				.from('users')
				.update({
					access_token: refreshed.access_token,
					token_expires_at: newExpiresAt,
					refresh_token: refreshed.refresh_token ?? refreshToken
				})
				.eq('id', userRow.id);
		} else {
			console.error('Spotify refresh failed:', refreshed.error);
		}
	}

	if (!accessToken) {
		return {
		email: session.user.email ?? null,
			connected: false,
			topArtists: [],
			feed: []
		};
	}

	const [topArtistsRes, recentRes] = await Promise.all([
		fetchSpotifyTopArtists(accessToken, 15),
		fetchSpotifyRecentlyPlayed(accessToken, 20)
	]);

	if (!topArtistsRes.ok) console.error('Spotify top artists failed:', topArtistsRes.error);
	if (!recentRes.ok) console.error('Spotify recently played failed:', recentRes.error);

	const topArtists = topArtistsRes.ok ? topArtistsRes.items : [];
	const recentlyPlayed = recentRes.ok ? recentRes.items : [];

	const rankByArtistId = new Map<string, number>();
	for (let i = 0; i < topArtists.length; i++) rankByArtistId.set(topArtists[i].id, i);

	const feed = recentlyPlayed.map((item) => {
		const primary = item.track.artists?.[0];
		const rank = primary?.id ? rankByArtistId.get(primary.id) : undefined;
		const match = rank === undefined ? 55 : Math.max(40, Math.round(100 - (rank / 14) * 60));
		const img =
			item.track.album?.images?.[0]?.url ??
			topArtists.find((a) => a.id === primary?.id)?.images?.[0]?.url ??
			null;

		return {
			id: `${item.track.id}-${item.played_at}`,
			artist_name: primary?.name ?? 'Unknown Artist',
			artist_id: primary?.id ?? null,
			match,
			title: item.track.name,
			date: new Date(item.played_at).toLocaleString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			}),
			venue: item.track.album?.name ?? 'Spotify',
			image_url: img,
			ticket_url: item.track.external_urls?.spotify ?? '#',
			presale_status: 'live',
			category: 'recently played'
		};
	});

	return {
		email: session.user.email ?? null,
		connected: true,
		topArtists: topArtists.map((a) => ({
			artist_id: a.id,
			artist_name: a.name,
			play_count: Math.max(1, 100 - topArtists.findIndex((x) => x.id === a.id) * 5)
		})),
		feed
	};
};
