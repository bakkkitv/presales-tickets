import { redirect } from '@sveltejs/kit';
import { SPOTIFY_CLIENT_ID } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const redirectUri = `${url.origin}/api/spotify/callback`;
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: SPOTIFY_CLIENT_ID,
		scope: 'user-read-recently-played user-read-email user-top-read',
		redirect_uri: redirectUri,
		show_dialog: 'true'
	});
	throw redirect(302, `https://accounts.spotify.com/authorize?${params.toString()}`);
};
