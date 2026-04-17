<script lang="ts">
	import { renderings, type RenderingAsset } from '$lib/generated/renderings';

	type RenderingGroup = {
		key: string;
		competition: string;
		season: string;
		setup: string;
		view: string;
		theme: string;
		versions: RenderingAsset[];
	};

	type FilterValue = 'All' | string;

	const ALL_FILTER = 'All';
	const seasonIntroductionYear: Record<string, number> = {
		OverUnder: 2023,
		FullVolume: 2023,
		HighStakes: 2024,
		RapidRelay: 2024,
		PushBack: 2025,
		MixAndMatch: 2025,
		FieldPerimeter: 0
	};
	const setupLabels: Record<string, string> = {
		H2H: 'Head-to-Head',
		Skills: 'Skills',
		'12ft12ft': '12ft × 12ft'
	};
	const viewLabels: Record<string, string> = {
		TopDown: 'Top Down',
		TopDownHighlighted: 'Top Down Highlighted'
	};

	const makeGroupKey = (asset: RenderingAsset) =>
		`${asset.competition}|${asset.season}|${asset.setup}|${asset.view}|${asset.theme}`;

	const sortStringsAsc = (values: string[]) => values.toSorted((a, b) => a.localeCompare(b));
	const splitCamelPascalWords = (value: string) =>
		value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
	const getSeasonSortYear = (season: string) => seasonIntroductionYear[season] ?? -1;
	const getSeasonLabel = (season: string) => splitCamelPascalWords(season);
	const getSetupLabel = (setup: string) => setupLabels[setup] ?? splitCamelPascalWords(setup);
	const getViewLabel = (view: string) => viewLabels[view] ?? splitCamelPascalWords(view);
	const sortByLabelAsc = (values: string[], getLabel: (value: string) => string) =>
		values.toSorted(
			(a, b) => getLabel(a).localeCompare(getLabel(b)) || a.localeCompare(b)
		);
	const compareSeasons = (a: string, b: string) =>
		getSeasonSortYear(b) - getSeasonSortYear(a) ||
		getSeasonLabel(a).localeCompare(getSeasonLabel(b)) ||
		a.localeCompare(b);
	const compareGroups = (a: RenderingGroup, b: RenderingGroup) =>
		getSeasonSortYear(b.season) - getSeasonSortYear(a.season) ||
		getSeasonLabel(a.season).localeCompare(getSeasonLabel(b.season)) ||
		a.competition.localeCompare(b.competition) ||
		getSetupLabel(a.setup).localeCompare(getSetupLabel(b.setup)) ||
		getViewLabel(a.view).localeCompare(getViewLabel(b.view)) ||
		a.theme.localeCompare(b.theme);
	const sortVersionsDesc = (versions: RenderingAsset[]) =>
		versions.toSorted((a, b) => b.version.localeCompare(a.version));

	const formatBytes = (bytes: number) => {
		if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
		if (bytes === 0) return '0 B';

		const units = ['B', 'KB', 'MB', 'GB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** index;

		return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
	};

	let search = $state('');
	let competitionFilter = $state<FilterValue>(ALL_FILTER);
	let seasonFilter = $state<FilterValue>(ALL_FILTER);
	let setupFilter = $state<FilterValue>(ALL_FILTER);
	let viewFilter = $state<FilterValue>(ALL_FILTER);
	let themeFilter = $state<FilterValue>(ALL_FILTER);

	let selectedVersionOverrides = $state<Record<string, string>>({});

	let groupedRenderings = $derived.by(() => {
		const groupsByKey: Record<string, RenderingGroup> = {};

		for (const asset of renderings) {
			const key = makeGroupKey(asset);
			const existing = groupsByKey[key];

			if (existing) {
				existing.versions.push(asset);
				continue;
			}

			groupsByKey[key] = {
				key,
				competition: asset.competition,
				season: asset.season,
				setup: asset.setup,
				view: asset.view,
				theme: asset.theme,
				versions: [asset]
			};
		}

		return Object.values(groupsByKey)
			.map((group) => ({ ...group, versions: sortVersionsDesc(group.versions) }))
			.toSorted(compareGroups);
	});

	let competitionOptions = $derived(sortStringsAsc([...new Set(renderings.map((item) => item.competition))]));
	let seasonOptions = $derived([...new Set(renderings.map((item) => item.season))].toSorted(compareSeasons));
	let setupOptions = $derived(sortByLabelAsc([...new Set(renderings.map((item) => item.setup))], getSetupLabel));
	let viewOptions = $derived(sortByLabelAsc([...new Set(renderings.map((item) => item.view))], getViewLabel));
	let themeOptions = $derived(sortStringsAsc([...new Set(renderings.map((item) => item.theme))]));

	const matchesFilter = (value: string, selected: FilterValue) => selected === ALL_FILTER || value === selected;

	const matchesSearch = (group: RenderingGroup, normalizedSearch: string) => {
		if (!normalizedSearch) return true;

		const searchSource = [
			group.competition,
			group.season,
			group.setup,
			group.view,
			group.theme,
			...group.versions.map((version) => version.filename)
		]
			.join(' ')
			.toLowerCase();

		return searchSource.includes(normalizedSearch);
	};

	const selectedAssetForGroup = (group: RenderingGroup) => {
		const selectedVersion = selectedVersionOverrides[group.key] ?? group.versions[0]?.version;
		return group.versions.find((version) => version.version === selectedVersion) ?? group.versions[0];
	};

	let filteredGroups = $derived.by(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return groupedRenderings.filter(
			(group) =>
				matchesFilter(group.competition, competitionFilter) &&
				matchesFilter(group.season, seasonFilter) &&
				matchesFilter(group.setup, setupFilter) &&
				matchesFilter(group.view, viewFilter) &&
				matchesFilter(group.theme, themeFilter) &&
				matchesSearch(group, normalizedSearch)
		);
	});
</script>

<main class="min-h-screen bg-[#1e1e1e] text-zinc-100">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
		<header class="space-y-2">
			<p class="text-sm uppercase tracking-[0.18em] text-[#a77ad3]">field-rendering.jerryio</p>
			<h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Field Rendering Gallery</h1>
			<p class="max-w-3xl text-sm text-zinc-300 sm:text-base">
				Browse render packs across competitions and seasons. Filter, search, choose a version, and download
				the exact asset you want.
			</p>
		</header>

		<section class="rounded-2xl border border-[#353535] bg-[#292929] p-4 shadow-2xl shadow-black/40 sm:p-5">
			<div class="mb-4 rounded-lg border border-[#4a3a5f] bg-[#221b2d] px-3 py-2 text-xs text-zinc-300 sm:text-sm">
				<p class="font-medium text-[#cfb2ea]">FieldCAD standardized camera conditions</p>
				<ul class="mt-1 list-disc space-y-1 pl-4">
					<li>Top-down renders use fixed camera extents for consistent comparisons.</li>
					<li>369mm camera height for V5 fields.</li>
					<li>192mm camera height for IQ fields.</li>
				</ul>
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
				<label class="xl:col-span-2">
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Search</span>
					<input
						type="search"
						bind:value={search}
						placeholder="Filename, competition, season, setup, view, theme..."
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					/>
				</label>

				<label>
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Competition</span>
					<select
						bind:value={competitionFilter}
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					>
						<option value={ALL_FILTER}>All</option>
						{#each competitionOptions as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Season</span>
					<select
						bind:value={seasonFilter}
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					>
						<option value={ALL_FILTER}>All</option>
						{#each seasonOptions as option (option)}
							<option value={option}>{getSeasonLabel(option)}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Setup</span>
					<select
						bind:value={setupFilter}
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					>
						<option value={ALL_FILTER}>All</option>
						{#each setupOptions as option (option)}
							<option value={option}>{getSetupLabel(option)}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">View</span>
					<select
						bind:value={viewFilter}
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					>
						<option value={ALL_FILTER}>All</option>
						{#each viewOptions as option (option)}
							<option value={option}>{getViewLabel(option)}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Theme</span>
					<select
						bind:value={themeFilter}
						class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
					>
						<option value={ALL_FILTER}>All</option>
						{#each themeOptions as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>
			</div>
		</section>

		<div class="flex items-center justify-between">
			<p class="text-sm text-zinc-300">
				<span class="font-semibold text-[#cfb2ea]">{filteredGroups.length}</span>
				{filteredGroups.length === 1 ? ' result' : ' results'}
			</p>
		</div>

		{#if filteredGroups.length === 0}
			<section class="rounded-2xl border border-[#353535] bg-[#292929] p-10 text-center">
				<p class="text-lg font-medium text-zinc-100">No renderings match your current filters.</p>
				<p class="mt-2 text-sm text-zinc-400">Try clearing one or more filters or broadening your search.</p>
			</section>
		{:else}
			<section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
				{#each filteredGroups as group (group.key)}
					{@const selectedAsset = selectedAssetForGroup(group)}
					<article class="overflow-hidden rounded-2xl border border-[#353535] bg-[#292929] shadow-xl shadow-black/40">
						<div class="aspect-square border-b border-[#3f2f54] bg-[#1e1e1e]">
							<img
								src={selectedAsset.path}
								alt={selectedAsset.filename}
								loading="lazy"
								class="h-full w-full object-cover"
							/>
						</div>

						<div class="space-y-4 p-4">
							<div class="space-y-2">
								<p class="text-sm font-semibold text-white">{group.competition} · {getSeasonLabel(group.season)}</p>
								<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-300">
									<div>
										<dt class="text-zinc-500">Setup</dt>
										<dd>{getSetupLabel(group.setup)}</dd>
									</div>
									<div>
										<dt class="text-zinc-500">View</dt>
										<dd>{getViewLabel(group.view)}</dd>
									</div>
									<div class="col-span-2">
										<dt class="text-zinc-500">Theme</dt>
										<dd>{group.theme}</dd>
									</div>
								</dl>
							</div>

							<div class="flex items-end gap-2">
								<label class="flex-1">
									<span class="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">Version</span>
									<select
										value={selectedAsset.version}
										onchange={(event) => {
											selectedVersionOverrides[group.key] = (event.currentTarget as HTMLSelectElement).value;
										}}
										class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#7f47b3] transition focus:border-[#7f47b3] focus:ring-2"
									>
										{#each group.versions as versionAsset (versionAsset.version)}
											<option value={versionAsset.version}>{versionAsset.version}</option>
										{/each}
									</select>
								</label>

								<a
									href={selectedAsset.path}
									download={selectedAsset.filename}
									class="inline-flex h-10 items-center justify-center rounded-lg bg-[#7f47b3] px-4 text-sm font-medium text-zinc-100 transition hover:bg-[#9660ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b287dd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292929]"
								>
									Download
								</a>
							</div>

							<div class="space-y-1 text-xs text-zinc-400">
								<p class="truncate" title={selectedAsset.filename}>{selectedAsset.filename}</p>
								<p>{formatBytes(selectedAsset.sizeBytes)}</p>
							</div>
						</div>
					</article>
				{/each}
			</section>
		{/if}
	</div>
</main>
