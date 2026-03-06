import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || !code) {
		throw redirect(303, '/login?error=auth_denied');
	}

	const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);

	if (exchangeError) {
		throw redirect(303, '/login?error=auth_failed');
	}

	throw redirect(303, '/dashboard');
};
