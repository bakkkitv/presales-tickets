import { redirect } from '@sveltejs/kit';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		throw redirect(302, '/login?error=spotify_denied');
	}

	const redirectUri = `${url.origin}/api/spotify/callback`;

	// 1) Exchange authorization code for tokens
	const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri
		})
	});

	const tokens = await tokenRes.json();
	if (!tokenRes.ok) {
		console.error('Token exchange failed:', tokens);
		throw redirect(302, '/login?error=token_failed');
	}

	// 2) Get Spotify profile
	const profileRes = await fetch('https://api.spotify.com/v1/me', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});
	const profile = await profileRes.json();
	if (!profileRes.ok) {
		console.error('Profile fetch failed:', profile);
		throw redirect(302, '/login?error=profile_failed');
	}

	// 3) Get currently signed-in app user (from SSR auth cookies)
	const session = await locals.getSession();
	const authUserId = session?.user?.id ?? null;

	if (!authUserId) {
		throw redirect(302, '/login?error=not_authenticated');
	}

	// 4) Write to public.users using service role key (bypasses RLS)
	const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	const { error: upsertErr } = await adminClient
		.from('users')
		.upsert(
			{
				auth_user_id: authUserId,
				spotify_user_id: profile.id,
				streaming_service: 'spotify',
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
				is_authorized: true,
				display_name: profile.display_name || null,
				email: profile.email || null
			},
			{ onConflict: 'spotify_user_id' }
		);

	if (upsertErr) {
		console.error('Upsert failed:', upsertErr);
		throw redirect(302, '/login?error=save_failed');
	}

	throw redirect(302, '/dashboard');
};