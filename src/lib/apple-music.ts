// src/lib/apple-music.ts
// Client-side helper for MusicKit JS initialization and authorization.

/**
 * Load the MusicKit JS SDK from Apple's CDN.
 * Returns a promise that resolves when the SDK is ready.
 */
export function loadMusicKit(): Promise<typeof MusicKit> {
	return new Promise((resolve, reject) => {
		// Already loaded
		if (window.MusicKit) {
			resolve(window.MusicKit);
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
		script.async = true;
		script.crossOrigin = 'anonymous';

		script.onload = () => {
			// MusicKit fires a 'musickitloaded' event when ready
			document.addEventListener('musickitloaded', () => {
				resolve(window.MusicKit);
			});

			// If MusicKit is already available (loaded fast)
			if (window.MusicKit) {
				resolve(window.MusicKit);
			}
		};

		script.onerror = () => reject(new Error('Failed to load MusicKit JS'));
		document.head.appendChild(script);
	});
}

/**
 * Configure MusicKit with your Developer Token and authorize the user.
 * Returns the Music User Token on success.
 */
export async function authorizeAppleMusic(developerToken: string): Promise<string> {
	const MK = await loadMusicKit();

	await MK.configure({
		developerToken,
		app: {
			name: 'PresaleTickets',
			build: '1.0.0'
		}
	});

	const music = MK.getInstance();

	// This opens Apple's authorization popup
	const userToken = await music.authorize();

	return userToken;
}

/**
 * Check if the user currently has an active MusicKit session.
 */
export function isAppleMusicAuthorized(): boolean {
	if (!window.MusicKit) return false;

	try {
		const music = window.MusicKit.getInstance();
		return music.isAuthorized;
	} catch {
		return false;
	}
}

// Type declaration for MusicKit on the window object
declare global {
	interface Window {
		MusicKit: typeof MusicKit;
	}
}
