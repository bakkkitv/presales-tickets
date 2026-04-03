import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		throw redirect(303, '/login?error=auth_denied');
	}

	const { data: sessionData, error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);

	if (exchangeError || !sessionData?.session) {
		throw redirect(303, '/login?error=auth_failed');
	}

	const session = sessionData.session;
	const provider = session.user?.app_metadata?.provider;

	// When signing in with Spotify, Supabase already holds the Spotify OAuth tokens.
	// Extract and save them now so the user lands on a connected dashboard immediately.
	if (provider === 'spotify' && session.provider_token) {
		try {
			const profileRes = await fetch('https://api.spotify.com/v1/me', {
				headers: { Authorization: `Bearer ${session.provider_token}` }
			});

			if (profileRes.ok) {
				const profile = await profileRes.json();
				const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
				const authUserId = session.user.id;

				const payload = {
					auth_user_id: authUserId,
					spotify_user_id: profile.id,
					streaming_service: 'spotify',
					access_token: session.provider_token,
					refresh_token: session.provider_refresh_token ?? null,
					// Spotify tokens expire in 3600s; use that as a safe default
					token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
					is_authorized: true,
					display_name: profile.display_name || null,
					email: profile.email || null
				};

				// Update existing row first; insert only if none found
				const { data: updated } = await admin
					.from('users')
					.update(payload)
					.eq('auth_user_id', authUserId)
					.select('id');

				if (!updated || updated.length === 0) {
					await admin.from('users').insert([payload]);
				}
			}
		} catch (err) {
			console.error('Failed to save Spotify tokens in auth/callback:', err);
			// Non-fatal — user lands on dashboard and can connect manually
		}
	}

	throw redirect(303, '/dashboard');
};
