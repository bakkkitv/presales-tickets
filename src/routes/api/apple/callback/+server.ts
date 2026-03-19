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

	// Check if user row exists
	const { data: existingRow } = await admin
		.from('users')
		.select('id')
		.eq('auth_user_id', user.id)
		.maybeSingle();

	const payload = {
		auth_user_id: user.id,
		streaming_service: 'apple',
		is_authorized: true,
		access_token: musicUserToken,
		refresh_token: null,       // Apple Music tokens don't need refreshing
		token_expires_at: null     // They last ~6 months
	};

	let error;

	if (existingRow) {
		const { error: updateErr } = await admin.from('users').update(payload).eq('id', existingRow.id);
		error = updateErr;
	} else {
		const { error: insertErr } = await admin.from('users').insert([payload]);
		error = insertErr;
	}

	if (error) {
		console.error('Failed to save Apple Music token:', error);
		return json({ message: 'Failed to save connection' }, { status: 500 });
	}

	return json({ ok: true });
};