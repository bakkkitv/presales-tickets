/// <reference types="@sveltejs/kit" />

import type { Session, SupabaseClient } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			getSession: () => Promise<Session | null>;
		}
	}

	interface ImportMetaEnv {
		readonly PUBLIC_SUPABASE_URL: string;
		readonly PUBLIC_SUPABASE_ANON_KEY: string;
		readonly PUBLIC_APPLE_MUSIC_DEV_TOKEN: string;
		readonly SPOTIFY_CLIENT_ID: string;
		readonly SPOTIFY_CLIENT_SECRET: string;
		readonly SUPABASE_SERVICE_ROLE_KEY: string;
	}

	interface Window {
		MusicKit: any;
	}
}

export {};
