<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>field-rendering.jerryio - VEX Field Rendering Gallery</title>
	<meta
		name="description"
		content="Download VEX field rendering images by competition, season, setup, view, theme, and version."
	/>
</svelte:head>
{@render children()}
