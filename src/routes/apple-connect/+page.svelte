<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';

	// The developer token was passed in the URL from the authorize route
	const developerToken = $derived($page.url.searchParams.get('dt') ?? '');

	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let errorMsg = $state('');

	// ── Load MusicKit JS and authorize the user ──────────────────
	// This runs as soon as the page loads.
	// MusicKit JS is Apple's official browser library for Apple Music auth.
	async function authorize() {
		status = 'loading';

		try {
			// Load MusicKit JS from Apple's CDN if not already loaded
			if (!(window as any).MusicKit) {
				await new Promise<void>((resolve, reject) => {
					const script = document.createElement('script');
					script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
					script.onload = () => resolve();
					script.onerror = () => reject(new Error('Failed to load MusicKit JS'));
					document.head.appendChild(script);
				});
			}

			// Configure MusicKit with your developer token
			const music = await (window as any).MusicKit.configure({
				developerToken,
				app: {
					name: 'PresaleTickets',
					build: '1.0'
				}
			});

			// This pops up Apple's login/permission dialog for the user
			await music.authorize();

			// After the user approves, MusicKit gives us a Music User Token
			const musicUserToken = music.musicUserToken;

			if (!musicUserToken) {
				throw new Error('No Music User Token received');
			}

			// Send the token to our server to save it
			const res = await fetch('/api/apple/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ musicUserToken })
});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message ?? 'Failed to save Apple Music connection');
			}

			status = 'success';

			// Redirect back to the feed
			setTimeout(() => goto('/dashboard'), 1200);

		} catch (err: any) {
			status = 'error';
			const msg = err?.message || 'Something went wrong';
			
			if (msg.toLowerCase().includes('unauthorized') || msg.includes('Music User Token')) {
				errorMsg = "Apple Music authorization failed. An active Apple Music subscription is required, or the prompt was cancelled.";
			} else {
				errorMsg = msg;
			}
		}
	}
</script>

<svelte:head>
	<title>Connect Apple Music · PresaleTickets</title>
</svelte:head>

<div class="page">
	<div class="card">
		<div class="apple-icon">
			<svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
				<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.4.07 2.38.74 3.2.76 1.22-.24 2.39-.93 3.68-.84 1.55.13 2.72.72 3.5 1.9-3.25 1.9-2.77 5.87.62 7.04zm-3.23-13.15c-.03 2.21 1.92 3.72 3.83 3.31-.26-2.26-1.99-3.71-3.83-3.31z"/>
			</svg>
		</div>

		<h1>Connect Apple Music</h1>
		<p>We'll find upcoming shows from artists in your library.</p>

		{#if status === 'idle'}
			<button class="connect-btn" onclick={authorize}>
				Authorize Apple Music
			</button>
		{/if}

		{#if status === 'loading'}
			<div class="spinner"></div>
			<p class="status-text">Waiting for Apple Music…</p>
		{/if}

		{#if status === 'success'}
			<div class="success">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="28" height="28">
					<polyline points="20 6 9 17 4 12"/>
				</svg>
				Connected! Taking you to your feed…
			</div>
		{/if}

		{#if status === 'error'}
			<div class="error">{errorMsg}</div>
			<button class="connect-btn" onclick={authorize}>Try again</button>
		{/if}

		<div class="footer-links">
			<a class="back-link" href="/dashboard">← Go back</a>
			<button class="signout-link" onclick={async () => { await supabase.auth.signOut(); goto('/login'); }}>Log out</button>
		</div>
	</div>
</div>

<style>
	:global(body) { background: #080f1e; color: #f0ece4; font-family: 'DM Sans', system-ui, sans-serif; }

	.page {
		min-height: 100vh;
		display: flex; align-items: center; justify-content: center;
		padding: 24px;
	}
	.card {
		background: #0d1829;
		border: 1px solid rgba(255,255,255,0.07);
		border-radius: 20px;
		padding: 40px 28px;
		max-width: 340px;
		width: 100%;
		text-align: center;
		display: flex; flex-direction: column; align-items: center; gap: 14px;
	}
	.apple-icon { color: #f0ece4; }
	h1 { font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 800; margin: 0; }
	p { color: rgba(240,236,228,0.5); font-size: 0.88rem; line-height: 1.6; margin: 0; }

	.connect-btn {
		background: #f0ece4; color: #080f1e;
		border: none; border-radius: 10px;
		padding: 13px 28px;
		font-size: 0.9rem; font-weight: 700;
		cursor: pointer; width: 100%;
		transition: transform 0.15s, box-shadow 0.15s;
	}
	.connect-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,255,255,0.1); }

	.spinner {
		width: 36px; height: 36px;
		border: 3px solid rgba(255,255,255,0.1);
		border-top-color: #f0ece4;
		border-radius: 50%;
		animation: spin 0.75s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.status-text { color: rgba(240,236,228,0.5); font-size: 0.82rem; }

	.success {
		display: flex; align-items: center; gap: 10px;
		color: #1db954; font-size: 0.9rem; font-weight: 600;
	}
	.error {
		color: #ff5c1a; font-size: 0.82rem;
		background: rgba(255,92,26,0.1);
		border: 1px solid rgba(255,92,26,0.2);
		border-radius: 8px; padding: 10px 14px;
		width: 100%;
	}
	.footer-links {
		display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 6px;
	}
	.back-link, .signout-link {
		font-family: inherit;
		font-size: 0.78rem; color: rgba(240,236,228,0.35); text-decoration: none; 
		background: none; border: none; padding: 0; cursor: pointer;
	}
	.back-link:hover, .signout-link:hover { color: rgba(240,236,228,0.6); }
</style>
