import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

// This runs after the user approves Apple Music in their browser.
// The apple-connect page sends us the Music User Token via POST.
// We save it to the users table so the feed can use it later.
export const POST: RequestHandler = async ({ request, locals }) => {
	const localsAny = locals as any;

	// Make sure the user is logged in
	const { data: { user }, error: userError } = await localsAny.supabase.auth.getUser();
	if (userError || !user) {
		return json({ message: 'Not authenticated' }, { status: 401 });
	}

	// Get the Music User Token from the request body
	const body = await request.json();
	const musicUserToken: string = body.musicUserToken;

	if (!musicUserToken) {
		return json({ message: 'Missing musicUserToken' }, { status: 400 });
	}

	const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	// The trigger already created the user row with id = auth UUID.
	// Just update it with the Music User Token from MusicKit.
	const { error } = await admin
		.from('users')
		.update({
			apple_music_user_token: musicUserToken,
			streaming_service: 'apple',
			is_authorized: true,
			updated_at: new Date().toISOString()
		})
		.eq('id', user.id);

	if (error) {
		console.error('Failed to save Apple Music token:', error);
		return json({ message: 'Failed to save connection' }, { status: 500 });
	}

	return json({ ok: true });
};