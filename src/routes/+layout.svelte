<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const siteName = 'field-rendering.jerryio';
	const siteTitle = 'VEX Field Rendering Gallery';
	const siteDescription =
		'Browse and download standardized VEX field rendering images for path planning, simulation, and engineering notebooks.';
	const siteUrl = 'https://field-rendering.jerryio.com';
	const socialImageUrl = `${siteUrl}/social-banner.png`;
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
	<meta property="og:image" content={socialImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={siteTitle} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={siteTitle} />
	<meta name="twitter:description" content={siteDescription} />
	<meta name="twitter:image" content={socialImageUrl} />
</svelte:head>
{@render children()}
