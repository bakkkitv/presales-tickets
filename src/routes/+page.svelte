<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<div class="center-page">
	<div class="spinner"></div>
</div>

<style>
	.center-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
	.spinner { width: 40px; height: 40px; border: 3px solid var(--dim2); border-top-color: var(--yellow); border-radius: 50%; animation: spin 0.75s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>