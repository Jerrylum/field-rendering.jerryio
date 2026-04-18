<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const siteName = 'field-rendering.jerryio';
	const siteTitle = 'VEX Field Rendering Gallery';
	const siteDescription =
		'Browse and download standardized VEX field rendering images for path planning, simulation, and engineering notebooks.';
	const siteUrl = 'https://field-rendering.jerryio.com';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{siteTitle}</title>
	<meta name="description" content={siteDescription} />
	<link rel="canonical" href={siteUrl} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:title" content={siteTitle} />
	<meta property="og:description" content={siteDescription} />
	<meta property="og:url" content={siteUrl} />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={siteTitle} />
	<meta name="twitter:description" content={siteDescription} />
</svelte:head>
{@render children()}
