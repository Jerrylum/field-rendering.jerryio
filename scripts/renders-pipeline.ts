import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

type ParsedName = {
	competition: string;
	season: string;
	setup: string;
	view: string;
	theme: string;
	version: string;
	extension: string;
	filename: string;
};

type RenderingAsset = {
	id: string;
	competition: string;
	season: string;
	setup: string;
	view: string;
	theme: string;
	version: string;
	extension: string;
	filename: string;
	path: string;
	sizeBytes: number;
	year: number;
	resolution: {
		width: number;
		height: number;
	};
};

const projectRoot = process.cwd();
const rendersDir = join(projectRoot, 'static', 'renders');
const renderingsTsPath = join(projectRoot, 'src', 'lib', 'renderings.ts');

const seasonYearBySeason: Record<string, number> = {
	FieldPerimeter: 0,
	OverUnder: 2023,
	FullVolume: 2023,
	HighStakes: 2024,
	RapidRelay: 2024,
	PushBack: 2025,
	MixAndMatch: 2025
};

const isImageFile = (name: string) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(name).toLowerCase());
const sortStrings = (values: string[]) => [...values].sort((a, b) => a.localeCompare(b));

const parseFilename = (filename: string): ParsedName | null => {
	const atIndex = filename.lastIndexOf('@');
	if (atIndex === -1) return null;

	const namePart = filename.slice(0, atIndex);
	const versionAndExt = filename.slice(atIndex + 1);
	const dotIndex = versionAndExt.lastIndexOf('.');
	if (dotIndex === -1) return null;

	const version = versionAndExt.slice(0, dotIndex);
	const extension = versionAndExt.slice(dotIndex + 1);

	const segments = namePart.split('-');
	if (segments.length < 5) return null;

	return {
		competition: segments[0] ?? '',
		season: segments[1] ?? '',
		setup: segments[2] ?? '',
		view: segments[3] ?? '',
		theme: segments.slice(4).join('-'),
		version,
		extension,
		filename
	};
};

const swapVersion = (filename: string, nextVersion: string) => {
	const parsed = parseFilename(filename);
	if (!parsed) return filename;
	const namePart = filename.slice(0, filename.lastIndexOf('@'));
	return `${namePart}@${nextVersion}.${parsed.extension}`;
};

const runCommand = async (command: string, args: string[]) =>
	await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code) => {
			resolve({
				stdout,
				stderr,
				exitCode: code ?? -1
			});
		});
	});

const runSipsResampleWidth = async (sourcePath: string, targetPath: string, width: number) => {
	const result = await runCommand('sips', ['--resampleWidth', String(width), sourcePath, '--out', targetPath]);
	if (result.exitCode !== 0) {
		throw new Error(`sips failed for ${sourcePath}: ${result.stderr.trim()}`);
	}
};

const getResolution = async (filePath: string) => {
	const result = await runCommand('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
	if (result.exitCode !== 0) {
		throw new Error(`Unable to read image size for ${filePath}: ${result.stderr.trim()}`);
	}

	const widthMatch = result.stdout.match(/pixelWidth:\s*(\d+)/);
	const heightMatch = result.stdout.match(/pixelHeight:\s*(\d+)/);
	if (!widthMatch || !heightMatch) {
		throw new Error(`Unable to parse resolution from sips output for ${filePath}`);
	}

	return {
		width: Number(widthMatch[1]),
		height: Number(heightMatch[1])
	};
};

const toTsFileContent = (assets: RenderingAsset[]) =>
	`// Auto-generated metadata for local static renders.
// Do not edit by hand.

export type RenderingAsset = {
\tid: string;
\tcompetition: string;
\tseason: string;
\tsetup: string;
\tview: string;
\ttheme: string;
\tversion: string;
\textension: string;
\tfilename: string;
\tpath: string;
\tsizeBytes: number;
\tyear: number;
\tresolution: {
\t\twidth: number;
\t\theight: number;
\t};
};

export const renderings: RenderingAsset[] = ${JSON.stringify(assets, null, 2)};
`;

const main = async () => {
	await mkdir(rendersDir, { recursive: true });

	let allFiles = sortStrings((await readdir(rendersDir)).filter(isImageFile));
	const fileSet = new Set<string>(allFiles);

	let renamedCount = 0;
	for (const filename of allFiles) {
		const parsed = parseFilename(filename);
		if (!parsed) continue;
		if (parsed.season !== 'HighStakes') continue;
		if (!parsed.version.startsWith('0.1')) continue;

		const nextVersion = parsed.version.replace(/^0\.1/, '4.0');
		const targetFilename = swapVersion(filename, nextVersion);
		if (targetFilename === filename) continue;

		const sourcePath = join(rendersDir, filename);
		const targetPath = join(rendersDir, targetFilename);

		if (fileSet.has(targetFilename)) {
			await unlink(sourcePath);
			fileSet.delete(filename);
		} else {
			await rename(sourcePath, targetPath);
			fileSet.delete(filename);
			fileSet.add(targetFilename);
		}
		renamedCount += 1;
	}

	allFiles = sortStrings([...fileSet]);

	let generated2000Count = 0;
	for (const filename of allFiles) {
		const parsed = parseFilename(filename);
		if (!parsed) continue;
		if (parsed.version.includes('+')) continue;

		const targetFilename = swapVersion(filename, `${parsed.version}+2000px`);
		if (fileSet.has(targetFilename)) continue;

		await runSipsResampleWidth(join(rendersDir, filename), join(rendersDir, targetFilename), 2000);
		fileSet.add(targetFilename);
		generated2000Count += 1;
	}

	allFiles = sortStrings([...fileSet]);

	let generated500Count = 0;
	for (const filename of allFiles) {
		const parsed = parseFilename(filename);
		if (!parsed) continue;
		if (parsed.version.includes('+')) continue;

		const targetFilename = swapVersion(filename, `${parsed.version}+500px`);
		if (fileSet.has(targetFilename)) continue;

		await runSipsResampleWidth(join(rendersDir, filename), join(rendersDir, targetFilename), 500);
		fileSet.add(targetFilename);
		generated500Count += 1;
	}

	const metadataFiles = [...fileSet]
		.filter((filename) => {
			const parsed = parseFilename(filename);
			return parsed && !parsed.version.endsWith('+500px');
		})
		.sort((a, b) => a.localeCompare(b));

	const assets: RenderingAsset[] = [];
	for (const filename of metadataFiles) {
		const parsed = parseFilename(filename);
		if (!parsed) continue;

		const filePath = join(rendersDir, filename);
		const fileStat = await stat(filePath);
		const resolution = await getResolution(filePath);

		assets.push({
			id: `${parsed.competition}-${parsed.season}-${parsed.setup}-${parsed.view}-${parsed.theme}@${parsed.version}`,
			competition: parsed.competition,
			season: parsed.season,
			setup: parsed.setup,
			view: parsed.view,
			theme: parsed.theme,
			version: parsed.version,
			extension: parsed.extension,
			filename,
			path: `/renders/${filename}`,
			sizeBytes: fileStat.size,
			year: seasonYearBySeason[parsed.season] ?? 0,
			resolution
		});
	}

	await writeFile(renderingsTsPath, toTsFileContent(assets), 'utf8');

	console.log(
		[
			`Renamed HighStakes 0.1 files: ${renamedCount}`,
			`Generated +2000px files: ${generated2000Count}`,
			`Generated +500px preview files: ${generated500Count}`,
			`Metadata entries written: ${assets.length}`
		].join('\n')
	);
};

await main();
