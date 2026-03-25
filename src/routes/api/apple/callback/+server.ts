import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const localsAny = locals as any;

	const { data: { user }, error: userError } = await localsAny.supabase.auth.getUser();
	if (userError || !user) {
		return json({ message: 'Not authenticated' }, { status: 401 });
	}

	const body = await request.json();
	const musicUserToken: string = body.musicUserToken;

	if (!musicUserToken) {
		return json({ message: 'Missing musicUserToken' }, { status: 400 });
	}

	const admin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	// Upsert keyed on auth_user_id so this works whether or not the trigger
	// already created the row. Writes to access_token (guaranteed to exist in
	// the current schema) so it works before the migration adds apple_music_user_token.
	const { error } = await admin
		.from('users')
		.upsert(
			{
				auth_user_id: user.id,
				access_token: musicUserToken,
				streaming_service: 'apple',
				is_authorized: true,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'auth_user_id' }
		);

	if (error) {
		// onConflict column may not be indexed — fall back to manual upsert
		const { data: existing } = await admin
			.from('users')
			.select('id')
			.eq('auth_user_id', user.id)
			.maybeSingle();

		const payload = {
			auth_user_id: user.id,
			access_token: musicUserToken,
			streaming_service: 'apple',
			is_authorized: true,
			updated_at: new Date().toISOString()
		};

		const { error: fallbackErr } = existing
			? await admin.from('users').update(payload).eq('auth_user_id', user.id)
			: await admin.from('users').insert([payload]);

		if (fallbackErr) {
			console.error('Failed to save Apple Music token:', fallbackErr);
			return json({ message: 'Failed to save connection' }, { status: 500 });
		}
	}

	return json({ ok: true });
};
