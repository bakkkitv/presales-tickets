import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { fetchSpotifyTopArtists, refreshSpotifyAccessToken } from '$lib/server/spotify';
import { fetchAppleMusicTopArtists } from '$lib/server/apple';

export const load: PageServerLoad = async ({ locals, url }) => {
	const localsAny = locals as any;

	const { data: { user }, error: userError } = await localsAny.supabase.auth.getUser();
	if (userError || !user) throw redirect(303, '/login?error=not_authenticated');

	const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	// Look up by auth_user_id first (reliable across both schema versions).
	// Only select columns that are guaranteed to exist in the current schema.
	let { data: userRow, error: userErr } = await admin
		.from('users')
		.select('id, auth_user_id, streaming_service, is_authorized, access_token, refresh_token, token_expires_at')
		.eq('auth_user_id', user.id)
		.maybeSingle();

	// Fall back to id = auth UUID (post-migration schema where id IS the auth UUID).
	if (!userRow && !userErr) {
		const fallback = await admin
			.from('users')
			.select('id, auth_user_id, streaming_service, is_authorized, access_token, refresh_token, token_expires_at')
			.eq('id', user.id)
			.maybeSingle();
		userErr = fallback.error;
		userRow = fallback.data;
	}

	if (userErr) console.error('Load users row failed:', userErr);

	// Not connected to anything yet
	if (!userRow || !userRow.is_authorized) {
		return { email: user.email ?? null, connected: false, topArtists: [], feed: [] };
	}

	// ── SPOTIFY ─────────────────────────────────────────────────
	if (userRow.streaming_service === 'spotify') {
		let accessToken: string | null = userRow.access_token ?? null;
		const refreshToken: string | null = userRow.refresh_token ?? null;
		const expiresAt: string | null = userRow.token_expires_at ?? null;

		const isExpired = expiresAt ? Date.now() >= new Date(expiresAt).getTime() - 60_000 : false;
		if (isExpired && refreshToken) {
			const refreshed = await refreshSpotifyAccessToken(refreshToken);
			if (refreshed.ok) {
				accessToken = refreshed.access_token;
				await admin.from('users').update({
					access_token: refreshed.access_token,
					token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
					refresh_token: refreshed.refresh_token ?? refreshToken
				}).eq('id', userRow.id);
			} else {
				console.error('Spotify refresh failed:', refreshed.error);
			}
		}

		if (!accessToken) return { email: user.email ?? null, connected: false, topArtists: [], feed: [] };

		const topArtistsRes = await fetchSpotifyTopArtists(accessToken, 15);
		if (!topArtistsRes.ok) {
			console.error('Spotify top artists failed:', topArtistsRes.error);
			return { email: user.email ?? null, connected: true, topArtists: [], feed: [] };
		}

		const topArtists = topArtistsRes.items;
		if (topArtists.length === 0) return { email: user.email ?? null, connected: true, topArtists: [], feed: [] };

		const spotifyIds = topArtists.map((a) => a.id);
		console.log('Spotify IDs:', spotifyIds);

		const { data: events, error: eventsErr } = await admin
			.from('events')
			.select('*')
			.in('artist_spotify_id', spotifyIds)
			.gte('date', new Date('2026-01-01').toISOString())
			.order('date', { ascending: true })
			.limit(50);

		if (eventsErr) console.error('Events query failed:', eventsErr);
		console.log('Events found:', events?.length ?? 0);

		const rankByArtistId = new Map<string, number>();
		topArtists.forEach((a, i) => rankByArtistId.set(a.id, i));

		return {
			email: user.email ?? null,
			connected: true,
			streamingService: 'spotify' as const,
			topArtists: topArtists.map((a, i) => ({
				artist_id: a.id,
				artist_name: a.name,
				image_url: a.images?.[0]?.url ?? null,
				play_count: Math.max(1, 100 - i * 5)
			})),
			feed: buildFeed(events ?? [], rankByArtistId)
		};
	}

	// ── APPLE MUSIC ──────────────────────────────────────────────
	if (userRow.streaming_service === 'apple') {
		if (!url.searchParams.has('fresh')) {
			throw redirect(303, '/api/apple/authorize');
		}
		const musicUserToken: string | null = (userRow as any).apple_music_user_token ?? userRow.access_token ?? null;
		if (!musicUserToken) return { email: user.email ?? null, connected: false, topArtists: [], feed: [] };

		const topArtistsRes = await fetchAppleMusicTopArtists(musicUserToken, 15);
		if (!topArtistsRes.ok) {
			console.error('Apple Music top artists failed:', topArtistsRes.error);
			return { email: user.email ?? null, connected: true, topArtists: [], feed: [] };
		}

		const topArtists = topArtistsRes.items;
		if (topArtists.length === 0) return { email: user.email ?? null, connected: true, topArtists: [], feed: [] };

		const { data: events, error: eventsErr } = await admin
			.from('events')
			.select('*')
			.gte('date', new Date('2026-01-01').toISOString())
			.order('date', { ascending: true })
			.limit(200);

		if (eventsErr) console.error('Events query failed:', eventsErr);

		const nameToRank = new Map<string, number>();
		topArtists.forEach((a: { id: string; name: string; image_url: string | null }, i: number) => nameToRank.set(a.name.toLowerCase(), i));

		const matchedEvents = (events ?? []).filter((ev) =>
			ev.artist_name && nameToRank.has(ev.artist_name.toLowerCase())
		);

		const rankByArtistId = new Map<string, number>();
		matchedEvents.forEach((ev) => {
			const rank = nameToRank.get(ev.artist_name?.toLowerCase() ?? '') ?? 14;
			if (ev.artist_spotify_id) rankByArtistId.set(ev.artist_spotify_id, rank);
		});

		console.log('Apple Music events matched:', matchedEvents.length);

		return {
			email: user.email ?? null,
			connected: true,
			streamingService: 'apple' as const,
			topArtists: topArtists.map((a: { id: string; name: string; image_url: string | null }, i: number) => ({
				artist_id: a.id,
				artist_name: a.name,
				image_url: a.image_url ?? null,
				play_count: Math.max(1, 100 - i * 5)
			})),
			feed: buildFeed(matchedEvents, rankByArtistId)
		};
	}

	return { email: user.email ?? null, connected: false, topArtists: [], feed: [] };
};

// ── Shared feed builder ───────────────────────────────────────────
function buildFeed(events: any[], rankByArtistId: Map<string, number>) {
	return events.map((event) => {
		const rank = event.artist_spotify_id ? rankByArtistId.get(event.artist_spotify_id) : undefined;
		const match = rank === undefined ? 55 : Math.max(40, Math.round(100 - (rank / 14) * 60));

		let formattedDate = 'TBD';
		if (event.local_date) {
			try {
				const d = new Date(event.local_date + 'T00:00:00');
				formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
				if (event.local_time) {
					const [h, m] = event.local_time.split(':');
					const hour = parseInt(h);
					const ampm = hour >= 12 ? 'PM' : 'AM';
					const h12 = hour % 12 || 12;
					formattedDate += ` · ${h12}:${m} ${ampm}`;
				}
			} catch { formattedDate = 'TBD'; }
		}

		return {
			id: event.id,
			artist_name: event.artist_name ?? 'Unknown Artist',
			artist_id: event.artist_spotify_id ?? null,
			match,
			title: event.name ?? event.artist_name ?? 'Upcoming Show',
			date: formattedDate,
			venue: event.venue ?? 'TBD',
			city: event.city ?? null,
			state: event.state ?? null,
			image_url: event.image_url ?? null,
			ticket_url: event.url ?? '#',
			presale_status: event.sale_status ?? 'onsale',
			presale_start: event.presale_start ?? null,
			onsale_start: event.onsale_start ?? null,
			price_min: event.price_min ?? null,
			price_max: event.price_max ?? null,
			category: event.category ?? 'concert'
		};
	});
}