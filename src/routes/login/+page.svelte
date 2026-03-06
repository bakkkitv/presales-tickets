<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	let errorMsg = $state('');

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const err = params.get('error');
		if (err) {
			errorMsg = {
				auth_denied: 'Sign-in was denied.',
				auth_failed: 'Sign-in failed. Please try again.',
				spotify_denied: 'Spotify authorization was denied.',
				token_failed: 'Failed to exchange Spotify token.',
				profile_failed: 'Failed to fetch Spotify profile.',
				not_authenticated: 'Session expired. Please sign in again.',
				save_failed: 'Failed to save your connection. Try again.'
			}[err] || 'Something went wrong. Try again.';
		}

		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			goto('/dashboard');
		}
	});

	function signInSpotify() {
		supabase.auth.signInWithOAuth({
			provider: 'spotify',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
	}

	function signInApple() {
		supabase.auth.signInWithOAuth({
			provider: 'apple',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
	}
</script>

<nav class="nav">
	<div class="nav-logo">Presale<b>Tickets</b></div>
</nav>

<div class="center-page">
	<h1 class="headline">Shows from artists you <b>actually listen to</b></h1>
	<p class="sub">Connect your streaming account and we'll surface presales and upcoming concerts for your top artists — automatically.</p>

	{#if errorMsg}
		<p class="error-msg">{errorMsg}</p>
	{/if}

	<div class="btns">
		<button class="cbtn cbtn-spotify" onclick={signInSpotify}>
			<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
			Continue with Spotify
		</button>
		<div class="or-div">or</div>
		<button class="cbtn cbtn-apple" onclick={signInApple}>
			<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.4.07 2.38.74 3.2.76 1.22-.24 2.39-.93 3.68-.84 1.55.13 2.72.72 3.5 1.9-3.25 1.9-2.77 5.87.62 7.04zm-3.23-13.15c-.03 2.21 1.92 3.72 3.83 3.31-.26-2.26-1.99-3.71-3.83-3.31z"/></svg>
			Continue with Apple Music
		</button>
	</div>
</div>

<style>
	.nav { position: sticky; top: 0; z-index: 99; background: rgba(12,29,58,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid var(--dim2); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 56px; }
	.nav-logo { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; }
	.nav-logo b { color: var(--yellow); }

	.center-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 56px); padding: 40px 24px; text-align: center; }

	.headline { font-family: 'Syne', sans-serif; font-size: clamp(1.9rem,6vw,3rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; max-width: 480px; margin-bottom: 14px; }
	.headline b { color: var(--yellow); }
	.sub { color: var(--dim); font-size: 0.9rem; line-height: 1.65; max-width: 340px; margin-bottom: 36px; }

	.error-msg { color: #f55; font-size: 0.82rem; margin-bottom: 18px; max-width: 320px; line-height: 1.5; }

	.btns { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px; }

	.cbtn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 20px; border-radius: 8px; font-size: 0.92rem; font-weight: 600; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; width: 100%; }
	.cbtn:hover { transform: translateY(-2px); }
	.cbtn svg { width: 19px; height: 19px; flex-shrink: 0; }
	.cbtn-spotify { background: #1DB954; color: #fff; }
	.cbtn-spotify:hover { box-shadow: 0 8px 24px rgba(29,185,84,0.3); }
	.cbtn-apple { background: var(--offwhite); color: var(--navy); }
	.cbtn-apple:hover { box-shadow: 0 8px 24px rgba(244,239,230,0.15); }

	.or-div { color: var(--dim); font-size: 0.75rem; display: flex; align-items: center; gap: 10px; }
	.or-div::before, .or-div::after { content: ''; flex: 1; height: 1px; background: var(--dim2); }
</style>
