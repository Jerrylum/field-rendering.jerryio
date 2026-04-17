<script lang="ts">
	import { asset } from '$app/paths';
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

	type ProgramGroup = 'VEX V5' | 'VEX IQ';

	const programGroups: ProgramGroup[] = ['VEX V5', 'VEX IQ'];
	const setupLabels: Record<string, string> = {
		H2H: 'Head-to-Head',
		Skills: 'Skills',
		'12ft12ft': '12ft × 12ft',
		'8ft6ft': '8ft × 6ft'
	};
	const viewLabels: Record<string, string> = {
		TopDown: 'Plain',
		TopDownHighlighted: 'Highlighted'
	};
	const competitionLabels: Record<string, string> = {
		V5RC: 'VEX V5',
		VURC: 'VEX U',
		VIQRC: 'VEX IQ'
	};

	const makeGroupKey = (asset: RenderingAsset) =>
		`${asset.competition}|${asset.season}|${asset.setup}|${asset.view}|${asset.theme}`;

	const splitCamelPascalWords = (value: string) =>
		value
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.trim();
	const getSeasonLabel = (season: string) => splitCamelPascalWords(season);
	const getSetupLabel = (setup: string) => setupLabels[setup] ?? splitCamelPascalWords(setup);
	const getViewLabel = (view: string) => viewLabels[view] ?? splitCamelPascalWords(view);
	const getCompetitionLabel = (competition: string) =>
		competitionLabels[competition] ?? splitCamelPascalWords(competition);
	const sortVersionsDesc = (versions: RenderingAsset[]) =>
		versions.toSorted((a, b) => b.version.localeCompare(a.version));
	const getProgramGroup = (competition: string): ProgramGroup =>
		competition === 'VIQRC' ? 'VEX IQ' : 'VEX V5';
	const makeSeasonTreeKey = (program: ProgramGroup, season: string) => `${program}|${season}`;
	const parseSeasonTreeKey = (key: string) => {
		const [program, season] = key.split('|');
		return { program: program as ProgramGroup, season: season ?? '' };
	};

	const formatBytes = (bytes: number) => {
		if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
		if (bytes === 0) return '0 B';

		const units = ['B', 'KB', 'MB', 'GB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** index;

		return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
	};

	let selectedVersionOverrides = $state<Record<string, string>>({});
	let selectedSeasonTreeKey = $state('');

	let seasonYearBySeason = $derived.by(() => {
		const years: Record<string, number> = {};
		for (const asset of renderings) {
			years[asset.season] = Math.max(years[asset.season] ?? -1, asset.year);
		}
		return years;
	});

	const getSeasonSortYear = (season: string) => seasonYearBySeason[season] ?? -1;
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

	let seasonsByProgram = $derived.by(() => {
		const mapping: Record<ProgramGroup, string[]> = {
			'VEX V5': [],
			'VEX IQ': []
		};
		const seen: Record<string, true> = {};

		for (const asset of renderings) {
			const program = getProgramGroup(asset.competition);
			const key = makeSeasonTreeKey(program, asset.season);
			if (seen[key]) continue;
			seen[key] = true;
			mapping[program].push(asset.season);
		}

		for (const program of programGroups) {
			mapping[program] = mapping[program].toSorted(compareSeasons);
		}

		return mapping;
	});

	let allSeasonTreeKeys = $derived.by(() =>
		programGroups.flatMap((program) =>
			seasonsByProgram[program].map((season) => makeSeasonTreeKey(program, season))
		)
	);

	let activeSeasonTreeKey = $derived(
		allSeasonTreeKeys.includes(selectedSeasonTreeKey)
			? selectedSeasonTreeKey
			: (allSeasonTreeKeys[0] ?? '')
	);

	let activeSelection = $derived(parseSeasonTreeKey(activeSeasonTreeKey));

	const selectedAssetForGroup = (group: RenderingGroup) => {
		const selectedVersion = selectedVersionOverrides[group.key] ?? group.versions[0]?.version;
		return (
			group.versions.find((version) => version.version === selectedVersion) ?? group.versions[0]
		);
	};

	let filteredGroups = $derived.by(() => {
		if (!activeSelection.season) return [];
		return groupedRenderings.filter(
			(group) =>
				getProgramGroup(group.competition) === activeSelection.program &&
				group.season === activeSelection.season
		);
	});
</script>

<main class="min-h-screen bg-[#1e1e1e] text-zinc-100">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
		<header class="space-y-2">
			<p class="text-sm tracking-[0.18em] text-[#a77ad3] uppercase">field-rendering.jerryio</p>
			<h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
				Field Rendering Gallery
			</h1>
			<p class="max-w-3xl text-sm text-zinc-300 sm:text-base">
				These standardized field renders are made for precise route planning in tools like
				PATH.JERRYIO and other path editors, so waypoint placement maps to expected robot locations.
			</p>
			<p class="max-w-3xl text-sm text-zinc-400 sm:text-base">
				Developers and teams can also download them for custom editors and engineering notebooks,
				avoiding manual game-manual screenshots. Renders use fixed top-down camera extents for
				consistency: 3690mm for V5 and 1920mm for IQ.
			</p>
		</header>

		<!-- Search/filter panel intentionally disabled. Replaced by season index tree on the left. -->

		<section class="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr]">
			<aside
				class="rounded-2xl border border-[#353535] bg-[#292929] px-3 py-5 shadow-2xl shadow-black/40"
			>
				{#each programGroups as program (program)}
					<div class="mb-4 last:mb-0">
						<p class="mb-3 px-2 text-xs font-semibold tracking-[0.14em] text-[#cfb2ea] uppercase">
							{program}
						</p>
						<div class="space-y-1">
							{#each seasonsByProgram[program] as season (season)}
								{@const treeKey = makeSeasonTreeKey(program, season)}
								<button
									type="button"
									onclick={() => {
										selectedSeasonTreeKey = treeKey;
									}}
									class={[
										'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition',
										treeKey === activeSeasonTreeKey
											? 'bg-[#3b2b4e] text-white ring-1 ring-[#7f47b3]'
											: 'text-zinc-300 hover:bg-[#353535]'
									]}
								>
									<svg viewBox="0 0 20 20" class="h-5 w-5 shrink-0" aria-hidden="true">
										<rect
											x="2.5"
											y="2.5"
											width="15"
											height="15"
											rx="2"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
										/>
									</svg>
									<span>{getSeasonLabel(season)}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</aside>

			<div class="space-y-4">
				<div
					class="flex items-center justify-between rounded-2xl border border-[#353535] bg-[#292929] px-4 py-3"
				>
					<p class="text-sm text-zinc-300">
						<span class="font-semibold text-[#cfb2ea]">{activeSelection.program}</span>
						{#if activeSelection.season}
							<span> · {getSeasonLabel(activeSelection.season)}</span>
						{/if}
					</p>
					<p class="text-sm text-zinc-300">
						<span class="font-semibold text-[#cfb2ea]">{filteredGroups.length}</span>
						{filteredGroups.length === 1 ? ' result' : ' results'}
					</p>
				</div>

				{#if filteredGroups.length === 0}
					<section class="rounded-2xl border border-[#353535] bg-[#292929] p-10 text-center">
						<p class="text-lg font-medium text-zinc-100">
							No renderings available for this season yet.
						</p>
					</section>
				{:else}
					<section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
						{#each filteredGroups as group (group.key)}
							{@const selectedAsset = selectedAssetForGroup(group)}
							<article
								class="overflow-hidden rounded-2xl border border-[#353535] bg-[#292929] shadow-xl shadow-black/40"
							>
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
										<p class="text-sm font-semibold text-white">
											{getCompetitionLabel(group.competition)} · {getSetupLabel(group.setup)}
										</p>
										<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-300">
											<div>
												<dt class="text-zinc-500">View</dt>
												<dd>{getViewLabel(group.view)}</dd>
											</div>
											<div class="">
												<dt class="text-zinc-500">Theme</dt>
												<dd>{group.theme}</dd>
											</div>
										</dl>
									</div>

									<div class="flex items-end gap-2">
										<label class="flex-1">
											<span
												class="mb-1 block text-xs font-medium tracking-wide text-zinc-400 uppercase"
												>Version</span
											>
											<select
												value={selectedAsset.version}
												onchange={(event) => {
													selectedVersionOverrides[group.key] = (
														event.currentTarget as HTMLSelectElement
													).value;
												}}
												class="w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 py-2 text-sm text-zinc-100 ring-[#7f47b3] transition outline-none focus:border-[#7f47b3] focus:ring-2"
											>
												{#each group.versions as versionAsset (versionAsset.version)}
													<option value={versionAsset.version}>{versionAsset.version}</option>
												{/each}
											</select>
										</label>

										<a
											href={asset(selectedAsset.path)}
											download={selectedAsset.filename}
											class="inline-flex h-10 items-center justify-center rounded-lg bg-[#7f47b3] px-4 text-sm font-medium text-zinc-100 transition hover:bg-[#9660ca] focus-visible:ring-2 focus-visible:ring-[#b287dd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292929] focus-visible:outline-none"
										>
											Download
										</a>
									</div>

									<div class="space-y-1 text-xs text-zinc-400">
										<p class="truncate" title={selectedAsset.filename}>{selectedAsset.filename}</p>
										<p>{selectedAsset.resolution.width} × {selectedAsset.resolution.height}</p>
										<p>{formatBytes(selectedAsset.sizeBytes)}</p>
									</div>
								</div>
							</article>
						{/each}
					</section>
				{/if}
			</div>
		</section>
	</div>
</main>
