import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {readdirSync, readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {request} from 'playwright';
import type {TestProject} from 'vitest/node';

export type GerritChange = {
	/** The origin of the Gerrit web app, such as `http://localhost:41234`. */
	readonly origin: string;
	/** The path of the newest patch set of the change in the web app, such as `/c/e2e/+/1/2`. */
	readonly patchSetPath: string;
	/** The files of `e2e/samples`, which the patch set adds. */
	readonly files: readonly string[];
};

declare module 'vitest' {
	// oxlint-disable-next-line typescript/consistent-type-definitions -- only an interface merges into the one of vitest
	export interface ProvidedContext {
		gerrit: GerritChange;
	}
}

const IMAGE = `gerritcodereview/gerrit:${process.env.GERRIT_VERSION ?? '3.14.2'}`;
const ROOT = path.resolve(import.meta.dirname, '..');
const SAMPLES = path.join(import.meta.dirname, 'samples');
const PROJECT = 'e2e';
const JSON_PREFIX = ")]}'\n";

// constraint: the first account that a new Gerrit site creates in development login mode is the administrator
export const ADMIN_ACCOUNT_ID = 1_000_000;

async function freePort(): Promise<number> {
	const server = createServer().listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	server.close();
	await once(server, 'close');
	if (address === null || typeof address === 'string') {
		throw new Error(`no TCP port in the server address ${String(address)}`);
	}
	return address.port;
}

async function answers(url: string): Promise<boolean> {
	try {
		const response = await fetch(url);
		return response.ok;
	} catch {
		return false;
	}
}

async function waitForGerrit(origin: string, attemptsLeft = 90): Promise<void> {
	if (await answers(`${origin}/config/server/version`)) {
		return;
	}
	if (attemptsLeft === 0) {
		throw new Error(`Gerrit at ${origin} did not answer /config/server/version in 180 s`);
	}
	await sleep(2000);
	await waitForGerrit(origin, attemptsLeft - 1);
}

async function addSamples(origin: string, files: readonly string[]): Promise<string> {
	const api = await request.newContext({baseURL: origin});
	try {
		await api.get(`/login/?account_id=${ADMIN_ACCOUNT_ID}`);
		await api.get('/');
		const {cookies} = await api.storageState();
		const xsrfToken = cookies.find((cookie) => cookie.name === 'XSRF_TOKEN')?.value;
		if (xsrfToken === undefined) {
			throw new Error('Gerrit set no XSRF_TOKEN cookie after the development login');
		}
		const call = async (method: string, url: string, data?: unknown, contentType = 'application/json') => {
			const response = await api.fetch(url, {
				method,
				headers: {'X-Gerrit-Auth': xsrfToken, 'Content-Type': contentType},
				data,
			});
			const text = await response.text();
			if (!response.ok()) {
				throw new Error(`${method} ${url}: ${response.status()} ${text}`);
			}
			return text.startsWith(JSON_PREFIX) ? (JSON.parse(text.slice(JSON_PREFIX.length)) as unknown) : undefined;
		};
		await call('PUT', `/projects/${PROJECT}`, {create_empty_commit: true});
		const change = await call('POST', '/changes/', {project: PROJECT, branch: 'master', subject: 'add samples'});
		if (typeof change !== 'object' || change === null || !('_number' in change)) {
			throw new Error(`the created change has no number: ${JSON.stringify(change)}`);
		}
		// oxlint-disable-next-line no-underscore-dangle -- _number is a field of ChangeInfo in the Gerrit REST API
		const changeNumber = String(change._number);
		for (const file of files) {
			const content = readFileSync(path.join(SAMPLES, file));
			// oxlint-disable-next-line no-await-in-loop -- each file goes into the same change edit, one after another
			await call(
				'PUT',
				`/changes/${changeNumber}/edit/${encodeURIComponent(file)}`,
				content,
				'application/octet-stream',
			);
		}
		await call('POST', `/changes/${changeNumber}/edit:publish`, {});
		return `/c/${PROJECT}/+/${changeNumber}/2`;
	} finally {
		await api.dispose();
	}
}

/**
 * Builds the plugin, starts Gerrit in Docker with the plugin installed, and adds a change with the files of
 * `e2e/samples`. Gives the tests a `GerritChange` as `gerrit`, and removes the container at the end.
 */
export default async function setup(project: TestProject): Promise<() => void> {
	execFileSync('vp', ['pack'], {cwd: ROOT, stdio: 'inherit'});
	const port = await freePort();
	const origin = `http://localhost:${port}`;
	const plugin = path.join(ROOT, 'dist', 'hljs-languages.js');
	const container = execFileSync(
		'docker',
		['create', '--rm', '--publish', `127.0.0.1:${port}:8080`, '--env', `CANONICAL_WEB_URL=${origin}/`, IMAGE],
		{encoding: 'utf8'},
	).trim();
	const teardown = (): void => {
		execFileSync('docker', ['rm', '--force', container], {stdio: 'ignore'});
	};
	try {
		// constraint: Docker Desktop can mount no file at all for a single file that `vp pack` has just replaced
		execFileSync('docker', ['cp', plugin, `${container}:/var/gerrit/plugins/hljs-languages.js`]);
		execFileSync('docker', ['start', container], {stdio: 'ignore'});
		await waitForGerrit(origin);
		const files = readdirSync(SAMPLES).toSorted();
		const patchSetPath = await addSamples(origin, files);
		project.provide('gerrit', {origin, patchSetPath, files});
	} catch (error) {
		teardown();
		throw error;
	}
	return teardown;
}
