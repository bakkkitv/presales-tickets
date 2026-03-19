<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Phase = 'connect' | 'feed';

	let phase = $derived<Phase>(data.connected ? 'feed' : 'connect');
	let topArtists = $derived(data.topArtists ?? []);
	let events = $derived(data.feed ?? []);
	let liked = $state<Record<string, boolean>>({});
	let saved = $state<Record<string, boolean>>({});
	let toastMsg = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;
	let bugOpen = $state(false);
	let bugTag = $state('');
	let bugText = $state('');

	function connectSpotify() {
		window.location.href = '/api/spotify/authorize';
	}

	function connectAppleMusic() {
		window.location.href = '/api/apple/authorize';
	}

	function toggleLike(id: string) {
		liked[id] = !liked[id];
		if (liked[id]) showToast('Liked!');
	}

	function toggleSave(id: string) {
		saved[id] = !saved[id];
		if (saved[id]) showToast('Saved to your list!');
	}

	async function doDisconnect() {
		if (!confirm('Sign out?')) return;
		await supabase.auth.signOut();
		goto('/login');
	}

	function showToast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => { toastMsg = ''; }, 2400);
	}

	function submitBug() {
		if (!bugText.trim() && !bugTag) {
			showToast('Please describe the bug or pick a category');
			return;
		}
		bugOpen = false;
		bugTag = '';
		bugText = '';
		showToast('Bug reported — thanks!');
	}

	function initial(name: string) {
		return name.charAt(0).toUpperCase();
	}

	function cardGradient(i: number) {
		const gradients = [
			'135deg, #1a0533 0%, #0c1d3a 100%',
			'135deg, #0d1f12 0%, #0c1d3a 100%',
			'135deg, #1f0d0d 0%, #1a0533 100%',
			'135deg, #0d1a2e 0%, #0f1a10 100%',
			'135deg, #1f1206 0%, #0c1d3a 100%',
			'135deg, #06141f 0%, #1a0533 100%',
		];
		return gradients[i % gradients.length];
	}

	function formatPrice(min: number | null, max: number | null) {
		if (!min && !max) return null;
		if (min && max && min !== max) return `$${Math.round(min)}–$${Math.round(max)}`;
		return `$${Math.round(min ?? max ?? 0)}`;
	}
</script>

<!-- NAV -->
<nav>
	<div class="logo">Presale<strong>Tickets</strong></div>
	<div class="nav-right">
		<button class="avatar-btn" onclick={doDisconnect} title="Sign out">
			{initial(data.email || 'U')}
		</button>
	</div>
</nav>

<!-- CONNECT SCREEN -->
{#if phase === 'connect'}
	<div class="center-page">
		<div class="connect-card">
			<div class="connect-icon">🎵</div>
			<h1>Your shows,<br /><strong>before they sell out.</strong></h1>
			<p>Connect your streaming account and we'll show you upcoming concerts from artists you actually listen to.</p>

			<div class="connect-btns">
				<button class="cbtn spotify" onclick={connectSpotify}>
					<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
						<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
					</svg>
					Connect Spotify
				</button>

				<div class="or-divider"><span>or</span></div>

				<button class="cbtn apple" onclick={connectAppleMusic}>
					<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
						<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.4.07 2.38.74 3.2.76 1.22-.24 2.39-.93 3.68-.84 1.55.13 2.72.72 3.5 1.9-3.25 1.9-2.77 5.87.62 7.04zm-3.23-13.15c-.03 2.21 1.92 3.72 3.83 3.31-.26-2.26-1.99-3.71-3.83-3.31z"/>
					</svg>
					Connect Apple Music
				</button>
			</div>

			<button class="signout-link" onclick={() => { supabase.auth.signOut(); goto('/login'); }}>
				Log out
			</button>
		</div>
	</div>
{/if}

<!-- FEED SCREEN -->
{#if phase === 'feed'}
	<div class="feed">

		<!-- Artist stories -->
		{#if topArtists.length > 0}
			<div class="stories-wrap">
				<div class="stories">
					{#each topArtists as artist}
						<button class="story" onclick={() => showToast(`${artist.artist_name}`)}>
							<div class="story-ring">
								{#if artist.image_url}
									<img src={artist.image_url} alt={artist.artist_name} class="story-img" />
								{:else}
									<div class="story-initial">{initial(artist.artist_name)}</div>
								{/if}
							</div>
							<span class="story-label">{artist.artist_name.split(' ')[0]}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Events -->
		{#if events.length === 0}
			<div class="empty">
				<div class="empty-icon">🎸</div>
				<p>No upcoming shows found for your top artists yet.</p>
				<p class="empty-hint">We sync events regularly — check back soon.</p>
			</div>
		{:else}
			<div class="posts">
				{#each events as ev, i}
					<article class="post" style="animation-delay: {i * 0.06}s">

						<!-- Post header -->
						<div class="post-head">
							<div class="post-avatar">{initial(ev.artist_name)}</div>
							<div class="post-head-info">
								<div class="post-artist">{ev.artist_name}</div>
								<div class="post-match">⚡ {ev.match}% match</div>
							</div>
							{#if ev.category}
								<div class="post-category">{ev.category}</div>
							{/if}
						</div>

						<!-- Event image / visual -->
						<div class="post-visual" style="background: linear-gradient({cardGradient(i)})">
							{#if ev.image_url}
								<img src={ev.image_url} alt={ev.title} class="post-photo" />
							{:else}
								<div class="post-big-initial">{initial(ev.artist_name)}</div>
							{/if}

							<!-- Overlay -->
							<div class="post-overlay">
								<div class="post-title">{ev.title}</div>
								<div class="post-date">{ev.date}</div>
							</div>

							<!-- Sale badge -->
							<div class="sale-badge" class:presale={ev.presale_status === 'presale'} class:onsale={ev.presale_status === 'onsale'}>
								<span class="pulse-dot"></span>
								{#if ev.presale_status === 'presale'}
									Presale Live
								{:else if ev.presale_status === 'onsale'}
									On Sale Now
								{:else}
									Coming Soon
								{/if}
							</div>
						</div>

						<!-- Actions -->
						<div class="post-actions">
							<button
								class="act"
								class:active-like={liked[ev.id]}
								onclick={() => toggleLike(ev.id)}
								aria-label="Like"
							>
								<svg viewBox="0 0 24 24" fill={liked[ev.id] ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" width="22" height="22">
									<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
								</svg>
							</button>
							<button
								class="act"
								class:active-save={saved[ev.id]}
								onclick={() => toggleSave(ev.id)}
								aria-label="Save"
							>
								<svg viewBox="0 0 24 24" fill={saved[ev.id] ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" width="22" height="22">
									<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
								</svg>
							</button>

							{#if formatPrice(ev.price_min, ev.price_max)}
								<div class="price-tag">{formatPrice(ev.price_min, ev.price_max)}</div>
							{/if}

							<div class="spacer"></div>

							<a class="ticket-btn" href={ev.ticket_url} target="_blank" rel="noopener noreferrer">
								Get Tickets
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
									<path d="M5 12h14M12 5l7 7-7 7"/>
								</svg>
							</a>
						</div>

						<!-- Caption -->
						<div class="post-caption">
							<span class="caption-artist">{ev.artist_name}</span>
							<span class="caption-text"> · {ev.venue}</span>
							{#if ev.city}
								<span class="caption-text">, {ev.city}{ev.state ? `, ${ev.state}` : ''}</span>
							{/if}
						</div>

					</article>
				{/each}
			</div>
		{/if}

		<!-- Footer -->
		<footer>
			<div class="f-logo">Presale<strong>Tickets</strong></div>
			<div class="f-copy">© 2026 · Beta</div>
			<button class="bug-btn" onclick={() => bugOpen = true}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
					<path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>
					<path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6z"/>
					<path d="M6 13H2M22 13h-4M6 17H2M22 17h-4"/>
				</svg>
				Report a bug
			</button>
		</footer>
	</div>

	<!-- Bottom nav -->
	<nav class="bottom-nav">
		<button class="bnav active">
			<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
			Feed
		</button>
		<button class="bnav" onclick={() => showToast('Search coming soon!')}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
				<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
			</svg>
			Search
		</button>
		<button class="bnav" onclick={() => showToast('Alerts coming soon!')}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
			</svg>
			Alerts
		</button>
		<button class="bnav" onclick={doDisconnect}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
			</svg>
			Account
		</button>
	</nav>
{/if}

<!-- Bug modal -->
{#if bugOpen}
	<div
		class="modal-backdrop"
		role="dialog"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) bugOpen = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') bugOpen = false; }}
	>
		<div class="modal">
			<div class="modal-handle"></div>
			<h3>Found a bug?</h3>
			<p>Tell us what happened and we'll fix it fast.</p>
			<div class="bug-tags">
				{#each ['Wrong show info', 'Login issue', 'Missing artist', 'Broken link', 'Other'] as tag}
					<button
						class="bug-tag"
						class:selected={bugTag === tag}
						onclick={() => bugTag = tag}
					>{tag}</button>
				{/each}
			</div>
			<textarea
				class="bug-textarea"
				bind:value={bugText}
				placeholder="What happened? What did you expect?"
			></textarea>
			<button class="modal-submit" onclick={submitBug}>Submit</button>
			<button class="modal-cancel" onclick={() => bugOpen = false}>Cancel</button>
		</div>
	</div>
{/if}

<!-- Toast -->
{#if toastMsg}
	<div class="toast">{toastMsg}</div>
{/if}

<style>
	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
	:global(body) {
		background: #080f1e;
		color: #f0ece4;
		font-family: 'DM Sans', system-ui, sans-serif;
		min-height: 100vh;
	}

	/* ── Variables ── */
	:global(:root) {
		--bg: #080f1e;
		--bg2: #0d1829;
		--bg3: #111f35;
		--border: rgba(255,255,255,0.07);
		--text: #f0ece4;
		--dim: rgba(240,236,228,0.45);
		--dim2: rgba(240,236,228,0.1);
		--yellow: #f5c518;
		--orange: #ff5c1a;
		--green: #1db954;
	}

	/* ── Nav ── */
	nav {
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(8,15,30,0.95);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 18px;
		height: 54px;
	}
	.logo { font-family: 'Syne', sans-serif; font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em; }
	.logo strong { color: var(--yellow); }
	.avatar-btn {
		width: 32px; height: 32px;
		border-radius: 50%;
		background: var(--bg3);
		border: 1.5px solid var(--yellow);
		color: var(--yellow);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: transform 0.15s;
	}
	.avatar-btn:hover { transform: scale(1.08); }

	/* ── Connect screen ── */
	.center-page {
		min-height: calc(100vh - 54px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 20px;
	}
	.connect-card {
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 40px 28px;
		max-width: 360px;
		width: 100%;
		text-align: center;
	}
	.connect-icon { font-size: 2.5rem; margin-bottom: 18px; }
	.connect-card h1 {
		font-family: 'Syne', sans-serif;
		font-size: clamp(1.6rem, 5vw, 2.2rem);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.03em;
		margin-bottom: 14px;
	}
	.connect-card h1 strong { color: var(--yellow); }
	.connect-card p { color: var(--dim); font-size: 0.88rem; line-height: 1.65; margin-bottom: 28px; }
	.connect-btns { display: flex; flex-direction: column; gap: 10px; }
	.cbtn {
		display: flex; align-items: center; justify-content: center; gap: 10px;
		padding: 13px 20px;
		border-radius: 10px;
		font-size: 0.9rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		width: 100%;
		transition: transform 0.15s, box-shadow 0.15s;
	}
	.cbtn:hover { transform: translateY(-2px); }
	.cbtn.spotify { background: var(--green); color: #fff; }
	.cbtn.spotify:hover { box-shadow: 0 8px 24px rgba(29,185,84,0.3); }
	.cbtn.apple { background: #f4efe6; color: #111; }
	.cbtn.apple:hover { box-shadow: 0 8px 24px rgba(255,255,255,0.1); }
	.or-divider {
		display: flex; align-items: center; gap: 10px;
		color: var(--dim); font-size: 0.75rem;
	}
	.or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
	.signout-link {
		background: none; border: none; color: var(--dim);
		font-size: 0.77rem; margin-top: 22px; cursor: pointer;
		text-decoration: underline; text-underline-offset: 3px;
		transition: color 0.15s;
	}
	.signout-link:hover { color: var(--text); }

	/* ── Feed ── */
	.feed { max-width: 480px; margin: 0 auto; padding-bottom: 90px; }

	/* Stories */
	.stories-wrap {
		border-bottom: 1px solid var(--border);
		padding: 12px 0;
	}
	.stories {
		display: flex;
		gap: 12px;
		padding: 0 16px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.stories::-webkit-scrollbar { display: none; }
	.story {
		display: flex; flex-direction: column; align-items: center; gap: 5px;
		flex-shrink: 0;
		background: none; border: none; cursor: pointer;
	}
	.story-ring {
		width: 52px; height: 52px;
		border-radius: 50%;
		padding: 2px;
		background: linear-gradient(135deg, var(--yellow), var(--orange));
		transition: transform 0.18s;
	}
	.story-ring:hover { transform: scale(1.08); }
	.story-img {
		width: 100%; height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--bg);
	}
	.story-initial {
		width: 100%; height: 100%;
		border-radius: 50%;
		background: var(--bg3);
		border: 2px solid var(--bg);
		display: flex; align-items: center; justify-content: center;
		font-size: 1rem; font-weight: 700;
	}
	.story-label {
		font-size: 0.6rem;
		color: var(--dim);
		max-width: 58px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Posts */
	.posts { display: flex; flex-direction: column; }
	.post {
		border-bottom: 1px solid var(--border);
		animation: fadeUp 0.4s ease both;
	}
	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.post-head {
		display: flex; align-items: center; gap: 10px;
		padding: 12px 14px 10px;
	}
	.post-avatar {
		width: 36px; height: 36px;
		border-radius: 50%;
		background: var(--bg3);
		border: 1.5px solid var(--border);
		display: flex; align-items: center; justify-content: center;
		font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
	}
	.post-head-info { flex: 1; min-width: 0; }
	.post-artist { font-size: 0.88rem; font-weight: 600; }
	.post-match { font-size: 0.68rem; color: var(--yellow); margin-top: 1px; }
	.post-category {
		font-size: 0.62rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.07em;
		color: var(--dim);
		background: var(--bg3);
		border: 1px solid var(--border);
		padding: 3px 8px;
		border-radius: 100px;
		flex-shrink: 0;
	}

	.post-visual {
		width: 100%;
		aspect-ratio: 1;
		position: relative;
		overflow: hidden;
		display: flex; align-items: center; justify-content: center;
	}
	.post-photo {
		position: absolute; inset: 0;
		width: 100%; height: 100%;
		object-fit: cover;
		z-index: 1;
	}
	.post-big-initial {
		font-family: 'Syne', sans-serif;
		font-size: 6rem;
		font-weight: 900;
		color: rgba(240,236,228,0.08);
		user-select: none;
	}
	.post-overlay {
		position: absolute; bottom: 0; left: 0; right: 0;
		z-index: 2;
		background: linear-gradient(to top, rgba(8,15,30,0.97) 0%, transparent 100%);
		padding: 48px 16px 16px;
	}
	.post-title {
		font-family: 'Syne', sans-serif;
		font-size: 1.1rem; font-weight: 800; line-height: 1.2;
	}
	.post-date { font-size: 0.78rem; color: var(--yellow); margin-top: 4px; font-weight: 500; }

	.sale-badge {
		position: absolute; top: 12px; left: 12px; z-index: 3;
		font-size: 0.62rem; font-weight: 700;
		letter-spacing: 0.08em; text-transform: uppercase;
		padding: 4px 10px;
		border-radius: 100px;
		display: flex; align-items: center; gap: 5px;
		background: rgba(8,15,30,0.6);
		border: 1px solid var(--border);
		color: var(--dim);
	}
	.sale-badge.presale { background: var(--orange); border-color: var(--orange); color: #fff; }
	.sale-badge.onsale  { background: var(--green);  border-color: var(--green);  color: #fff; }
	.pulse-dot {
		width: 5px; height: 5px;
		border-radius: 50%; background: currentColor;
		animation: pulse 1.4s infinite;
	}
	@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

	/* Actions */
	.post-actions {
		display: flex; align-items: center; gap: 12px;
		padding: 10px 14px 8px;
	}
	.act {
		background: none; border: none;
		color: var(--dim); cursor: pointer;
		display: flex; align-items: center;
		padding: 3px; transition: color 0.15s, transform 0.15s;
	}
	.act:hover { color: var(--text); transform: scale(1.1); }
	.act.active-like { color: var(--orange); }
	.act.active-save { color: var(--yellow); }
	.price-tag {
		font-size: 0.73rem; font-weight: 600;
		color: var(--dim);
		background: var(--bg3);
		border: 1px solid var(--border);
		padding: 3px 9px;
		border-radius: 100px;
	}
	.spacer { flex: 1; }
	.ticket-btn {
		display: flex; align-items: center; gap: 6px;
		background: var(--yellow); color: #080f1e;
		border: none; border-radius: 8px;
		padding: 9px 16px;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.82rem; font-weight: 700;
		text-decoration: none; cursor: pointer;
		transition: background 0.15s, transform 0.15s;
		flex-shrink: 0;
	}
	.ticket-btn:hover { background: #ffd740; transform: scale(1.02); }

	.post-caption {
		padding: 0 14px 14px;
		font-size: 0.82rem;
		line-height: 1.5;
	}
	.caption-artist { font-weight: 600; }
	.caption-text { color: var(--dim); }

	/* Empty */
	.empty {
		text-align: center;
		padding: 64px 24px;
		color: var(--dim);
	}
	.empty-icon { font-size: 2.5rem; margin-bottom: 14px; }
	.empty p { line-height: 1.6; }
	.empty-hint { font-size: 0.8rem; margin-top: 6px; opacity: 0.6; }

	/* Footer */
	footer {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 32px 24px;
		border-top: 1px solid var(--border);
		text-align: center;
	}
	.f-logo { font-family: 'Syne', sans-serif; font-size: 0.9rem; font-weight: 800; }
	.f-logo strong { color: var(--yellow); }
	.f-copy { font-size: 0.7rem; color: var(--dim); }
	.bug-btn {
		display: inline-flex; align-items: center; gap: 6px;
		background: none;
		border: 1px solid var(--border);
		color: var(--dim);
		padding: 7px 14px;
		border-radius: 6px;
		font-size: 0.75rem; font-weight: 500;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.bug-btn:hover { border-color: var(--orange); color: var(--orange); }

	/* Bottom nav */
	.bottom-nav {
		position: fixed; bottom: 0; left: 0; right: 0;
		background: rgba(8,15,30,0.97);
		backdrop-filter: blur(20px);
		border-top: 1px solid var(--border);
		display: flex; justify-content: space-around;
		padding: 8px 0 20px;
		z-index: 50;
	}
	.bnav {
		display: flex; flex-direction: column; align-items: center; gap: 3px;
		color: var(--dim);
		font-size: 0.58rem; font-weight: 600;
		letter-spacing: 0.05em; text-transform: uppercase;
		background: none; border: none; cursor: pointer;
		padding: 4px 20px;
		transition: color 0.15s;
	}
	.bnav:hover { color: var(--text); }
	.bnav.active { color: var(--yellow); }

	/* Modal */
	.modal-backdrop {
		position: fixed; inset: 0;
		background: rgba(8,15,30,0.85);
		backdrop-filter: blur(10px);
		z-index: 200;
		display: flex; align-items: flex-end; justify-content: center;
	}
	.modal {
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: 18px 18px 0 0;
		padding: 22px 22px 36px;
		width: 100%; max-width: 480px;
		animation: slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
	}
	@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
	.modal-handle {
		width: 36px; height: 4px;
		background: var(--dim2);
		border-radius: 2px;
		margin: 0 auto 18px;
	}
	.modal h3 { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
	.modal p { font-size: 0.82rem; color: var(--dim); margin-bottom: 16px; line-height: 1.55; }
	.bug-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
	.bug-tag {
		padding: 5px 13px;
		border-radius: 100px;
		font-size: 0.73rem; font-weight: 500;
		background: var(--bg3);
		border: 1px solid var(--border);
		color: var(--dim);
		cursor: pointer;
		transition: all 0.15s;
	}
	.bug-tag.selected { background: rgba(245,197,24,0.12); border-color: var(--yellow); color: var(--yellow); }
	.bug-textarea {
		width: 100%; height: 88px;
		background: rgba(255,255,255,0.04);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		font-family: 'DM Sans', sans-serif;
		font-size: 0.83rem;
		padding: 10px 12px;
		resize: none; outline: none;
		margin-bottom: 12px;
		transition: border-color 0.2s;
	}
	.bug-textarea:focus { border-color: rgba(245,197,24,0.4); }
	.bug-textarea::placeholder { color: rgba(240,236,228,0.2); }
	.modal-submit {
		width: 100%; background: var(--orange); color: #fff;
		border: none; border-radius: 8px; padding: 12px;
		font-size: 0.88rem; font-weight: 600; cursor: pointer;
		transition: background 0.15s;
	}
	.modal-submit:hover { background: #ff7030; }
	.modal-cancel {
		width: 100%; background: none; border: none;
		color: var(--dim); font-size: 0.8rem;
		padding: 10px; cursor: pointer; margin-top: 4px;
	}

	/* Toast */
	.toast {
		position: fixed; bottom: 84px; left: 50%;
		transform: translateX(-50%);
		background: var(--bg2);
		border: 1px solid var(--border);
		color: var(--text);
		padding: 9px 18px;
		border-radius: 100px;
		font-size: 0.8rem;
		white-space: nowrap;
		z-index: 999;
		animation: toastIn 0.2s ease;
	}
	@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
</style>