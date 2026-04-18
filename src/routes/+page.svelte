<script lang="ts">
	import { asset } from '$app/paths';
	import { renderings, type RenderingAsset } from '$lib/renderings';
	import FullVolumeSymbol from '$lib/assets/FullVolumeSymbol.svg';
	import HighStakesSymbol from '$lib/assets/HighStakesSymbol.svg';
	import IQFieldPerimeterSymbol from '$lib/assets/IQFieldPerimeter.svg';
	import MixAndMatchSymbol from '$lib/assets/MixAndMatchSymbol.svg';
	import OverUnderSymbol from '$lib/assets/OverUnderSymbol.svg';
	import PushBackSymbol from '$lib/assets/PushBackSymbol.svg';
	import RapidRelaySymbol from '$lib/assets/RapidRelaySymbol.svg';
	import V5FieldPerimeterSymbol from '$lib/assets/V5FieldPerimeter.svg';

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
	type ResolutionMode = 'high' | 'low';

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
	const getVersionFamily = (version: string) => version.split('+')[0] ?? version;
	const normalizeSeasonKey = (season: string) => season.replace(/[^a-z0-9]/gi, '').toLowerCase();
	const seasonIconBySeason: Record<string, string> = {
		highstakes: HighStakesSymbol,
		overunder: OverUnderSymbol,
		pushback: PushBackSymbol,
		fullvolume: FullVolumeSymbol,
		mixandmatch: MixAndMatchSymbol,
		rapidrelay: RapidRelaySymbol
	};
	const getSeasonIcon = (season: string, program: ProgramGroup) => {
		if (normalizeSeasonKey(season) === 'fieldperimeter') {
			return program === 'VEX IQ' ? IQFieldPerimeterSymbol : V5FieldPerimeterSymbol;
		}
		return seasonIconBySeason[normalizeSeasonKey(season)];
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
	let selectedResolutionModeByGroup = $state<Record<string, ResolutionMode>>({});
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

	const getVersionFamilies = (group: RenderingGroup) => {
		const seen: Record<string, true> = {};
		const families: string[] = [];
		for (const versionAsset of group.versions) {
			const family = getVersionFamily(versionAsset.version);
			if (seen[family]) continue;
			seen[family] = true;
			families.push(family);
		}
		return families;
	};

	const getFamilyAssets = (group: RenderingGroup, family: string) =>
		group.versions
			.filter((versionAsset) => getVersionFamily(versionAsset.version) === family)
			.toSorted((a, b) => a.resolution.width - b.resolution.width);

	const getSelectedFamily = (group: RenderingGroup) => {
		const families = getVersionFamilies(group);
		const preferredFamily = selectedVersionOverrides[group.key];
		return preferredFamily && families.includes(preferredFamily)
			? preferredFamily
			: (families[0] ?? '');
	};

	const getFamilyAssetsForSelected = (group: RenderingGroup) =>
		getFamilyAssets(group, getSelectedFamily(group));

	const getLowAsset = (group: RenderingGroup) => getFamilyAssetsForSelected(group)[0];
	const getHighAsset = (group: RenderingGroup) => {
		const assets = getFamilyAssetsForSelected(group);
		return assets[assets.length - 1];
	};

	const isSameAsset = (a?: RenderingAsset, b?: RenderingAsset) =>
		Boolean(a && b && a.path === b.path);

	const getAvailableResolutionModes = (group: RenderingGroup): ResolutionMode[] => {
		const lowAsset = getLowAsset(group);
		const highAsset = getHighAsset(group);

		if (!lowAsset && !highAsset) return [];
		if (lowAsset && highAsset && !isSameAsset(lowAsset, highAsset)) return ['high', 'low'];

		const singleAsset = highAsset ?? lowAsset;
		if (!singleAsset) return [];
		return singleAsset.resolution.width >= 3000 ? ['high'] : ['low'];
	};

	const getSelectedResolutionMode = (group: RenderingGroup): ResolutionMode => {
		const availableModes = getAvailableResolutionModes(group);
		const preferredMode = selectedResolutionModeByGroup[group.key];
		if (preferredMode && availableModes.includes(preferredMode)) return preferredMode;
		return availableModes[0] ?? 'high';
	};

	const selectedAssetForGroup = (group: RenderingGroup) => {
		const lowAsset = getLowAsset(group);
		const highAsset = getHighAsset(group);
		const selectedResolutionMode = getSelectedResolutionMode(group);

		if (selectedResolutionMode === 'low') return lowAsset ?? highAsset;
		return highAsset ?? lowAsset;
	};

	const familyAssetLabel = (asset?: RenderingAsset) => {
		if (!asset) return 'N/A';
		return asset.resolution.width >= 3000
			? `High (${asset.resolution.width}×${asset.resolution.height})`
			: `Low (${asset.resolution.width}×${asset.resolution.height})`;
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
				Developers and teams can download them for custom editors and engineering notebooks,
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
										'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition cursor-pointer',
										treeKey === activeSeasonTreeKey
											? 'bg-[#3b2b4e] text-white ring-1 ring-[#7f47b3]'
											: 'text-zinc-300 hover:bg-[#353535]'
									]}
								>
									<img
										src={getSeasonIcon(season, program)}
										alt={`${getSeasonLabel(season)} symbol`}
										class="h-6 w-6 shrink-0 select-none"
									/>
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
										class="h-full w-full object-contain p-2"
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
											<div>
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
												value={getSelectedFamily(group)}
												onchange={(event) => {
													selectedVersionOverrides[group.key] = (
														event.currentTarget as HTMLSelectElement
													).value;
												}}
												class="h-10 w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 text-sm text-zinc-100 ring-[#7f47b3] transition outline-none focus:border-[#7f47b3] focus:ring-2"
											>
												{#each getVersionFamilies(group) as versionFamily (versionFamily)}
													<option value={versionFamily}>{versionFamily}</option>
												{/each}
											</select>
										</label>

										<label class="w-26">
											<span
												class="mb-1 block text-xs font-medium tracking-wide text-zinc-400 uppercase"
												>Resolution</span
											>
											<select
												value={getSelectedResolutionMode(group)}
												onchange={(event) => {
													selectedResolutionModeByGroup[group.key] = (
														event.currentTarget as HTMLSelectElement
													).value as ResolutionMode;
												}}
												class="h-10 w-full rounded-lg border border-[#353535] bg-[#1e1e1e] px-3 text-sm text-zinc-100 ring-[#7f47b3] transition outline-none focus:border-[#7f47b3] focus:ring-2"
												title={familyAssetLabel(selectedAsset)}
											>
												{#each getAvailableResolutionModes(group) as mode (mode)}
													<option value={mode}>{mode === 'high' ? 'High' : 'Low'}</option>
												{/each}
											</select>
										</label>

										<a
											href={asset(selectedAsset.path)}
											download={selectedAsset.filename}
											class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#7f47b3] px-5 text-sm font-medium text-zinc-100 transition hover:bg-[#9660ca] focus-visible:ring-2 focus-visible:ring-[#b287dd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292929] focus-visible:outline-none"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 640 640"
												class="h-4 w-4"
												fill="currentColor"
												><!--!Font Awesome Free 7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2026 Fonticons, Inc.--><path
													d="M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z"
												/></svg
											>
										</a>
									</div>

									<div class="space-y-1 text-xs text-zinc-400">
										<!-- <p class="truncate" title={selectedAsset.filename}>{selectedAsset.filename}</p> -->
										<p>
											{selectedAsset.resolution.width} px × {selectedAsset.resolution.height} px
										</p>
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
