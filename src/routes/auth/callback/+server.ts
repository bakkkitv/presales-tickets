import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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

	const provider = sessionData.session.user?.app_metadata?.provider;

	// For Spotify sign-ins, kick off the full Spotify API token exchange so
	// we get a proper access/refresh token with the right scopes. The user is
	// already authenticated at this point, so the authorize flow runs silently
	// (Spotify skips the consent screen when scopes are already granted).
	if (provider === 'spotify') {
		throw redirect(303, '/api/spotify/authorize');
	}

	throw redirect(303, '/dashboard');
};
