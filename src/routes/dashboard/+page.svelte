<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import type { PageData } from './$types';

	// ── State ──────────────────────────────────────────────────
	type Phase = 'loading' | 'connect' | 'syncing' | 'feed';
	let phase: Phase = 'loading';

	export let data: PageData;
	const email = data.email;

	// Feed data
	let topArtists: any[] = [];
	let events: any[] = [];

	// Loading animation steps
	let syncSteps = [
		{ label: 'Reading your top artists...', done: false },
		{ label: 'Finding shows near you...', done: false },
		{ label: 'Building your personalized feed...', done: false }
	];

	// UI state
	let liked: Record<string, boolean> = {};
	let saved: Record<string, boolean> = {};
	let toastMsg = '';
	let toastTimer: any;
	let connectingApple = false;

	// Bug report modal
	let bugOpen = false;
	let bugTag = '';
	let bugText = '';

	// ── Init (server-provided data) ─────────────────────────────
	topArtists = data.topArtists ?? [];
	events = data.feed ?? [];
	phase = data.connected ? 'feed' : 'connect';

	// ── Sync animation then load data ─────────────────────────
	async function doSyncAnimation() {
		phase = 'syncing';

		// Step 1: top artists
		await sleep(600);
		topArtists = topArtists || [];
		syncSteps[0].done = true;
		syncSteps = syncSteps; // trigger reactivity

		// Step 2: matching events
		await sleep(500);
		events = events || [];
		syncSteps[1].done = true;
		syncSteps = syncSteps;

		// Step 3: done
		await sleep(400);
		syncSteps[2].done = true;
		syncSteps = syncSteps;

		await sleep(500);
		phase = 'feed';
	}

	function buildFeed(tmEvents: any[], presales: any[]): any[] {
		const maxPlays = topArtists.length > 0 ? topArtists[0].play_count : 1;
		const artistMap = new Map(topArtists.map(a => [a.artist_id, a]));
		const artistNameMap = new Map(topArtists.map(a => [a.artist_name.toLowerCase(), a]));

		// Presale lookup by artist name (lowercase)
		const presaleByArtist = new Map<string, any>();
		for (const p of presales) {
			presaleByArtist.set(p.artist_name.toLowerCase(), p);
		}

		const feed: any[] = [];

		for (const ev of tmEvents) {
			const artist = artistMap.get(ev.artist_spotify_id);
			if (!artist) continue;

			const matchPct = Math.round((artist.play_count / maxPlays) * 100);
			const presale = presaleByArtist.get(artist.artist_name.toLowerCase());

			feed.push({
				id: ev.id,
				artist_name: artist.artist_name,
				artist_id: artist.artist_id,
				match: matchPct,
				title: ev.name,
				date: formatEventDate(ev.local_date, ev.local_time),
				venue: ev.venue || 'TBA',
				image_url: ev.image_url,
				ticket_url: ev.url || presale?.ticket_url || '#',
				presale_status: presale ? 'live' : 'soon',
				category: ev.category || ''
			});
		}

		// Add presale events that don't have a ticketmaster match
		const tmArtistIds = new Set(tmEvents.map(e => e.artist_spotify_id));
		for (const p of presales) {
			const artist = artistNameMap.get(p.artist_name.toLowerCase());
			if (!artist || tmArtistIds.has(artist.artist_id)) continue;

			const matchPct = Math.round((artist.play_count / maxPlays) * 100);
			feed.push({
				id: p.id,
				artist_name: p.artist_name,
				artist_id: artist.artist_id,
				match: matchPct,
				title: p.artist_name + ' — Presale',
				date: formatEventDate(p.event_date, null),
				venue: p.venue || 'TBA',
				image_url: null,
				ticket_url: p.ticket_url || '#',
				presale_status: 'live',
				category: ''
			});
		}

		// Sort by match percentage descending
		feed.sort((a, b) => b.match - a.match);
		return feed;
	}

	function formatEventDate(dateStr: string | null, timeStr: string | null): string {
		if (!dateStr) return 'Date TBA';
		try {
			const d = new Date(dateStr + 'T00:00:00');
			const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
			if (timeStr) {
				// timeStr is like "19:30:00"
				const [h, m] = timeStr.split(':');
				const hour = parseInt(h);
				const ampm = hour >= 12 ? 'PM' : 'AM';
				const h12 = hour % 12 || 12;
				return `${day} · ${h12}:${m} ${ampm}`;
			}
			return day;
		} catch {
			return 'Date TBA';
		}
	}

	// ── Spotify connect ───────────────────────────────────────
	function connectSpotify() {
		window.location.href = '/api/spotify/authorize';
	}

	function connectAppleMusic() {
		toast('Apple Music connect is not set up yet');
	}

	// ── Actions ───────────────────────────────────────────────
	function toggleLike(id: string) {
		liked[id] = !liked[id];
		if (liked[id]) toast('Liked!');
	}

	function toggleSave(id: string) {
		saved[id] = !saved[id];
		if (saved[id]) toast('Saved!');
	}

	async function doDisconnect() {
		if (!confirm('Disconnect your account?')) return;
		await supabase.auth.signOut();
		goto('/');
	}

	function toast(msg: string) {
		toastMsg = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => { toastMsg = ''; }, 2400);
	}

	function submitBug() {
		if (!bugText.trim() && !bugTag) { toast('Please describe the bug or pick a category'); return; }
		bugOpen = false; bugTag = ''; bugText = '';
		toast('Bug reported — thank you!');
	}

	function getArtistInitial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	function getEventColor(idx: number): string {
		const colors = ['#3d1254', '#131340', '#0d2010', '#2a1506', '#2a0813', '#0d2030', '#1a0a2e', '#2d1a00'];
		return colors[idx % colors.length];
	}

	function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
</script>

<!-- NAV -->
<nav class="nav">
	<div class="nav-logo">Presale<b>Tickets</b></div>
	{#if phase === 'feed'}
		<div class="nav-avatar">{getArtistInitial(email || 'U')}</div>
	{/if}
</nav>

<!-- CONNECT SCREEN -->
{#if phase === 'connect'}
	<div class="center-page">
		<h1 class="connect-headline">Connect your <b>streaming</b></h1>
		<p class="connect-sub">Link your account so we can find shows from artists you actually listen to.</p>

		<div class="connect-btns">
			<button class="cbtn cbtn-spotify" onclick={connectSpotify}>
				<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
				Connect Spotify
			</button>
			<div class="or-div">or</div>
			<button class="cbtn cbtn-apple" onclick={connectAppleMusic}>
				<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.4.07 2.38.74 3.2.76 1.22-.24 2.39-.93 3.68-.84 1.55.13 2.72.72 3.5 1.9-3.25 1.9-2.77 5.87.62 7.04zm-3.23-13.15c-.03 2.21 1.92 3.72 3.83 3.31-.26-2.26-1.99-3.71-3.83-3.31z"/></svg>
				Connect Apple Music
			</button>
		</div>

		<button class="sign-out-link" onclick={() => { supabase.auth.signOut(); goto('/login'); }}>
			Sign out and use a different account
		</button>
	</div>
{/if}

<!-- SYNCING SCREEN -->
{#if phase === 'syncing'}
	<div class="center-page">
		<div class="spinner"></div>
		<div class="load-steps">
			{#each syncSteps as step}
				<div class="load-step" class:done={step.done}>
					{#if step.done}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
					{/if}
					{step.label}
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- FEED SCREEN -->
{#if phase === 'feed'}
	<div class="feed-wrap">
		<!-- Stories row: top artists sorted by play count -->
		{#if topArtists.length > 0}
			<div class="stories">
				{#each topArtists as artist, i}
					<div class="story" onclick={() => toast(`${artist.artist_name} · ${artist.play_count} plays`)} role="button" tabindex="0" onkeydown={() => {}}>
						<div class="story-ring">
							<div class="story-inner">{getArtistInitial(artist.artist_name)}</div>
						</div>
						<div class="story-name">{artist.artist_name.split(' ')[0]}</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Event posts -->
		{#if events.length === 0}
			<div class="empty-state">
				<p>No upcoming shows found for your top artists yet.</p>
				<p class="empty-hint">Keep listening — we check for new events regularly.</p>
			</div>
		{:else}
			{#each events as ev, i}
				<div class="post" style="animation-delay: {i * 0.07}s">
					<div class="post-header">
						<div class="post-avatar">{getArtistInitial(ev.artist_name)}</div>
						<div style="flex:1">
							<div class="post-artist">{ev.artist_name}</div>
							<div class="post-meta">⚡ {ev.match}% match</div>
						</div>
					</div>

					<div class="post-img">
						<div class="post-img-bg" style="background: radial-gradient(circle at 50% 60%, {getEventColor(i)} 0%, var(--navy2) 100%)"></div>
						{#if ev.image_url}
							<img class="post-img-photo" src={ev.image_url} alt={ev.title} />
						{:else}
							<div class="post-emoji">{getArtistInitial(ev.artist_name)}</div>
						{/if}
						<div class="post-overlay">
							<div class="post-event-title">{ev.title}</div>
							<div class="post-event-date">{ev.date}</div>
						</div>
						<div class="presale-tag" class:soon={ev.presale_status !== 'live'}>
							<span class="pdot"></span>
							{ev.presale_status === 'live' ? 'Presale Live' : 'On Sale Soon'}
						</div>
					</div>

					<div class="post-actions">
						<button class="act-btn" class:liked={liked[ev.id]} onclick={() => toggleLike(ev.id)} title="Like">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
						</button>
						<button class="act-btn" class:saved={saved[ev.id]} onclick={() => toggleSave(ev.id)} title="Save">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
						</button>
						<div class="spacer"></div>
						<a class="tickets-btn" href={ev.ticket_url} target="_blank" rel="noopener noreferrer">
							Get Tickets
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
						</a>
					</div>

					<div class="post-caption">
						<span class="name">{ev.artist_name}</span>
						<span class="dim-text"> has a show near you</span>
						<div class="venue">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
							{ev.venue}
						</div>
					</div>
				</div>
			{/each}
		{/if}

		<!-- Footer -->
		<footer class="site-footer">
			<div class="f-logo">Presale<b>Tickets</b></div>
			<div class="f-copy">2025 PresaleTickets · Beta</div>
			<button class="bug-btn" onclick={() => bugOpen = true}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6z"/><path d="M6 13H2M22 13h-4M6 17H2M22 17h-4"/></svg>
				Found a bug? Report it
			</button>
		</footer>
	</div>

	<!-- Bottom bar -->
	<div class="bot-bar">
		<button class="bbar-btn active">
			<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
			Feed
		</button>
		<button class="bbar-btn" onclick={() => toast('Search coming in v2!')}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
			Search
		</button>
		<button class="bbar-btn" onclick={() => toast('Alerts coming in v2!')}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
			Alerts
		</button>
		<button class="bbar-btn" onclick={doDisconnect}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
			Account
		</button>
	</div>
{/if}

<!-- Bug report modal -->
{#if bugOpen}
	<div class="modal-bg" onclick={(e) => { if (e.target === e.currentTarget) bugOpen = false; }} onkeydown={() => {}} role="dialog" tabindex="-1">
		<div class="modal-box">
			<div class="modal-handle"></div>
			<h3>Found a bug?</h3>
			<p>Tell us what broke and we will fix it fast.</p>
			<div class="m-tags">
				{#each ['Wrong show info', 'Login issue', 'Missing artist', 'Broken ticket link', 'Other'] as tag}
					<span class="mtag" class:sel={bugTag === tag} onclick={() => bugTag = tag} onkeydown={() => {}} role="button" tabindex="0">{tag}</span>
				{/each}
			</div>
			<textarea class="m-ta" bind:value={bugText} placeholder="What happened? What did you expect?"></textarea>
			<button class="m-submit" onclick={submitBug}>Submit Report</button>
			<button class="m-cancel" onclick={() => bugOpen = false}>Cancel</button>
		</div>
	</div>
{/if}

<!-- Toast -->
{#if toastMsg}
	<div class="toast show">{toastMsg}</div>
{/if}

<style>
	/* ── Nav ── */
	.nav { position: sticky; top: 0; z-index: 99; background: rgba(12,29,58,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid var(--dim2); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 56px; }
	.nav-logo { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; }
	.nav-logo b { color: var(--yellow); }
	.nav-avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--navy3); border: 2px solid var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }

	/* ── Center page (connect + syncing) ── */
	.center-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 56px); padding: 40px 24px; text-align: center; }
	.connect-headline { font-family: 'Syne', sans-serif; font-size: clamp(1.9rem,6vw,3rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; max-width: 480px; margin-bottom: 14px; }
	.connect-headline b { color: var(--yellow); }
	.connect-sub { color: var(--dim); font-size: 0.9rem; line-height: 1.65; max-width: 340px; margin-bottom: 36px; }
	.connect-btns { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px; }

	.cbtn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 20px; border-radius: 8px; font-size: 0.92rem; font-weight: 600; transition: transform 0.15s, box-shadow 0.15s; width: 100%; }
	.cbtn:hover { transform: translateY(-2px); }
	.cbtn:disabled { opacity: 0.6; cursor: wait; }
	.cbtn svg { width: 19px; height: 19px; flex-shrink: 0; }
	.cbtn-spotify { background: #1DB954; color: #fff; }
	.cbtn-spotify:hover { box-shadow: 0 8px 24px rgba(29,185,84,0.3); }
	.cbtn-apple { background: var(--offwhite); color: var(--navy); }
	.cbtn-apple:hover { box-shadow: 0 8px 24px rgba(244,239,230,0.15); }

	.or-div { color: var(--dim); font-size: 0.75rem; display: flex; align-items: center; gap: 10px; }
	.or-div::before, .or-div::after { content: ''; flex: 1; height: 1px; background: var(--dim2); }
	.sign-out-link { background: none; border: none; color: var(--dim); font-size: 0.78rem; margin-top: 28px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; transition: color 0.15s; }
	.sign-out-link:hover { color: var(--offwhite); }

	/* ── Spinner + loading steps ── */
	.spinner { width: 40px; height: 40px; border: 3px solid var(--dim2); border-top-color: var(--yellow); border-radius: 50%; animation: spin 0.75s linear infinite; margin-bottom: 18px; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.load-steps { display: flex; flex-direction: column; gap: 9px; }
	.load-step { font-size: 0.8rem; color: var(--dim); display: flex; align-items: center; gap: 8px; transition: color 0.3s; }
	.load-step.done { color: var(--yellow); }
	.load-step svg { width: 13px; height: 13px; flex-shrink: 0; }

	/* ── Feed ── */
	.feed-wrap { max-width: 480px; margin: 0 auto; padding-bottom: 80px; }

	/* Stories */
	.stories { display: flex; gap: 10px; padding: 14px 16px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--dim2); }
	.stories::-webkit-scrollbar { display: none; }
	.story { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; cursor: pointer; }
	.story-ring { width: 54px; height: 54px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, var(--yellow), var(--orange)); transition: transform 0.18s; }
	.story-ring:hover { transform: scale(1.07); }
	.story-inner { width: 100%; height: 100%; border-radius: 50%; background: var(--navy2); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; border: 2px solid var(--navy); }
	.story-name { font-size: 0.6rem; color: var(--dim); max-width: 60px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	/* Posts */
	.post { border-bottom: 1px solid var(--dim2); animation: fadeUp 0.4s ease both; }
	@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
	.post-header { display: flex; align-items: center; gap: 10px; padding: 11px 14px 9px; }
	.post-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--navy3); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; border: 1.5px solid var(--dim2); flex-shrink: 0; }
	.post-artist { font-size: 0.86rem; font-weight: 600; }
	.post-meta { font-size: 0.68rem; color: var(--yellow); margin-top: 1px; }

	.post-img { width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden; background: var(--navy2); display: flex; align-items: center; justify-content: center; }
	.post-img-bg { position: absolute; inset: 0; }
	.post-img-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
	.post-emoji { font-size: 5rem; position: relative; z-index: 1; font-weight: 800; color: rgba(244,239,230,0.15); }
	.post-overlay { position: absolute; bottom: 0; left: 0; right: 0; z-index: 2; background: linear-gradient(to top, rgba(12,29,58,0.95) 0%, transparent 100%); padding: 40px 14px 14px; }
	.post-event-title { font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 800; line-height: 1.2; }
	.post-event-date { font-size: 0.78rem; color: var(--yellow); margin-top: 3px; font-weight: 500; }

	.presale-tag { position: absolute; top: 10px; left: 10px; z-index: 3; background: var(--orange); color: #fff; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 9px; border-radius: 100px; display: flex; align-items: center; gap: 4px; }
	.presale-tag.soon { background: rgba(12,29,58,0.85); border: 1px solid var(--yellow); color: var(--yellow); }
	.pdot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: blink 1.4s infinite; }
	@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

	/* Actions */
	.post-actions { display: flex; align-items: center; gap: 12px; padding: 9px 14px 8px; }
	.act-btn { background: none; border: none; color: var(--dim); cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 3px 0; transition: color 0.15s; }
	.act-btn svg { width: 20px; height: 20px; }
	.act-btn:hover { color: var(--offwhite); }
	.act-btn.liked svg { fill: var(--orange); stroke: var(--orange); }
	.act-btn.saved svg { fill: var(--yellow); stroke: var(--yellow); }
	.spacer { flex: 1; }

	.tickets-btn { background: var(--yellow); color: var(--navy); border: none; border-radius: 6px; padding: 9px 16px; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; text-decoration: none; transition: background 0.15s, transform 0.15s; flex-shrink: 0; }
	.tickets-btn:hover { background: #ffd740; transform: scale(1.02); }
	.tickets-btn svg { width: 12px; height: 12px; }

	/* Caption */
	.post-caption { padding: 0 14px 13px; }
	.post-caption .name { font-weight: 600; font-size: 0.84rem; }
	.dim-text { color: var(--dim); font-size: 0.84rem; }
	.venue { font-size: 0.75rem; color: var(--dim); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
	.venue svg { width: 11px; height: 11px; }

	/* Empty state */
	.empty-state { text-align: center; padding: 60px 24px; color: var(--dim); line-height: 1.6; }
	.empty-hint { font-size: 0.8rem; margin-top: 6px; opacity: 0.6; }

	/* Footer */
	.site-footer { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 24px; text-align: center; border-top: 1px solid var(--dim2); }
	.f-logo { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 800; }
	.f-logo b { color: var(--yellow); }
	.f-copy { font-size: 0.72rem; color: var(--dim); }
	.bug-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--dim2); color: var(--dim); padding: 8px 16px; border-radius: 6px; font-size: 0.76rem; font-weight: 500; transition: all 0.15s; }
	.bug-btn:hover { border-color: var(--orange); color: var(--orange); }
	.bug-btn svg { width: 13px; height: 13px; }

	/* Bottom bar */
	.bot-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(12,29,58,0.97); backdrop-filter: blur(20px); border-top: 1px solid var(--dim2); display: flex; justify-content: space-around; padding: 8px 0 18px; z-index: 50; }
	.bbar-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--dim); font-size: 0.58rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; background: none; border: none; padding: 4px 18px; transition: color 0.15s; }
	.bbar-btn.active { color: var(--yellow); }
	.bbar-btn svg { width: 20px; height: 20px; margin-bottom: 1px; }

	/* Modal */
	.modal-bg { position: fixed; inset: 0; background: rgba(12,29,58,0.82); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
	.modal-box { background: var(--navy2); border: 1px solid var(--dim2); border-radius: 14px 14px 0 0; padding: 24px 22px 36px; width: 100%; max-width: 480px; animation: slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1); }
	@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
	.modal-handle { width: 34px; height: 4px; background: var(--dim2); border-radius: 2px; margin: 0 auto 18px; }
	.modal-box h3 { font-family: 'Syne', sans-serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 6px; }
	.modal-box p { font-size: 0.81rem; color: var(--dim); margin-bottom: 16px; line-height: 1.55; }
	.m-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
	.mtag { padding: 5px 13px; border-radius: 100px; font-size: 0.73rem; font-weight: 500; background: var(--dim2); border: 1px solid transparent; cursor: pointer; transition: all 0.15s; }
	.mtag.sel { background: rgba(245,197,24,0.12); border-color: var(--yellow); color: var(--yellow); }
	.m-ta { width: 100%; height: 90px; background: rgba(244,239,230,0.04); border: 1px solid var(--dim2); border-radius: 7px; color: var(--offwhite); font-family: 'DM Sans', sans-serif; font-size: 0.83rem; padding: 11px; resize: none; outline: none; margin-bottom: 12px; transition: border-color 0.2s; }
	.m-ta:focus { border-color: rgba(245,197,24,0.4); }
	.m-ta::placeholder { color: rgba(244,239,230,0.2); }
	.m-submit { width: 100%; background: var(--orange); color: #fff; border: none; border-radius: 7px; padding: 12px; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
	.m-submit:hover { background: #ff7030; }
	.m-cancel { width: 100%; background: none; border: none; color: var(--dim); font-size: 0.8rem; padding: 11px; cursor: pointer; margin-top: 3px; }

	/* Toast */
	.toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(14px); background: var(--navy2); border: 1px solid var(--dim2); color: var(--offwhite); padding: 9px 18px; border-radius: 100px; font-size: 0.8rem; opacity: 0; transition: all 0.22s; pointer-events: none; white-space: nowrap; z-index: 999; }
	.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>