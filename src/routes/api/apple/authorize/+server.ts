import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAppleDeveloperToken } from '$lib/server/apple';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// When the user clicks "Connect Apple Music", this runs first.
// It generates a developer token and sends the user to Apple's login page.
export const GET: RequestHandler = async () => {
	const developerToken = await generateAppleDeveloperToken();

	// Apple's MusicKit auth happens on the frontend via MusicKit JS.
	// We redirect to a special page that loads MusicKit JS,
	// authorizes the user, then sends us their Music User Token.
	// We embed the developer token in the URL so the page can use it.
	throw redirect(302, `/apple-connect?dt=${developerToken}`);
};