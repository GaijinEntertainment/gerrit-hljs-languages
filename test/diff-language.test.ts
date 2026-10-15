import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {languageOfPath, setDiffLanguages} from '../src/diff-language.ts';

beforeEach(() => {
	vi.stubGlobal('location', {href: 'http://gerrit.test/c/p/+/1'});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const LANGUAGES = [
	{name: 'dshl', files: ['.dshl']},
	{name: 'jam', files: ['.jam', 'jamfile']},
];
const PREFIX = ")]}'\n";
const DIFF_URL = 'http://gerrit.test/changes/p~1/revisions/2/files/shaders%2Fsample.dshl/diff?context=ALL';

function gerritResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(PREFIX + JSON.stringify(body), init);
}

async function gerritJson(response: Response): Promise<unknown> {
	const text = await response.text();
	expect(text.startsWith(PREFIX)).toBe(true);
	return JSON.parse(text.slice(PREFIX.length));
}

function hostFor(response: Response): {fetch: typeof fetch} {
	const host = {fetch: vi.fn<typeof fetch>().mockResolvedValue(response)};
	setDiffLanguages(LANGUAGES, host);
	return host;
}

describe('languageOfPath', () => {
	test.for([
		['shaders/sample.dshl', 'dshl'],
		['SHADERS/SAMPLE.DSHL', 'dshl'],
		['prog/rules.jam', 'jam'],
		['prog/jamfile', 'jam'],
		['prog/Jamfile', 'jam'],
		['prog/jamfile.txt', undefined],
		['prog/notjamfile', undefined],
		['shaders/sample.dshl.orig', undefined],
	] as const)('%s is %s', ([path, language]) => {
		expect(languageOfPath(path, LANGUAGES)).toBe(language);
	});
});

describe('setDiffLanguages', () => {
	test('sets the language of each side from the file name of that side', async () => {
		const host = hostFor(
			gerritResponse({meta_a: {name: 'rules.jam'}, meta_b: {name: 'shaders/sample.dshl'}, content: []}),
		);

		const response = await host.fetch(DIFF_URL);

		await expect(gerritJson(response)).resolves.toStrictEqual({
			meta_a: {name: 'rules.jam', language: 'jam'},
			meta_b: {name: 'shaders/sample.dshl', language: 'dshl'},
			content: [],
		});
	});

	test('keeps a language that a side already has', async () => {
		const host = hostFor(gerritResponse({meta_b: {name: 'sample.dshl', language: 'cpp'}}));

		const response = await host.fetch(DIFF_URL);

		await expect(gerritJson(response)).resolves.toStrictEqual({meta_b: {name: 'sample.dshl', language: 'cpp'}});
	});

	test('keeps the status and the headers', async () => {
		const host = hostFor(gerritResponse({meta_b: {name: 'sample.dshl'}}, {headers: {'X-Gerrit-Trace': '7'}}));

		const response = await host.fetch(DIFF_URL);

		expect(response.status).toBe(200);
		expect(response.headers.get('X-Gerrit-Trace')).toBe('7');
	});

	test.for([
		{name: 'a request that is no diff', url: 'http://gerrit.test/changes/p~1/revisions/2/files', status: 200},
		{
			name: 'a diff of a file of no language',
			url: 'http://gerrit.test/changes/p~1/revisions/2/files/README.md/diff',
			status: 200,
		},
		{name: 'a failed diff request', url: DIFF_URL, status: 404},
	])('returns the response to $name unchanged', async ({url, status}) => {
		const original = gerritResponse({meta_b: {name: 'sample.dshl'}}, {status});
		const host = hostFor(original);

		await expect(host.fetch(url)).resolves.toBe(original);
	});

	test('returns a diff response without the JSON prefix unchanged', async () => {
		const original = new Response('{}');
		const host = hostFor(original);

		await expect(host.fetch(DIFF_URL)).resolves.toBe(original);
	});

	test.for([
		{name: 'a URL', input: () => new URL(DIFF_URL)},
		{name: 'a Request', input: () => new Request(DIFF_URL)},
		{name: 'a path of the page origin', input: () => '/changes/p~1/revisions/2/files/sample.dshl/diff'},
	])('reads the file name from $name', async ({input}) => {
		const host = hostFor(gerritResponse({meta_b: {name: 'sample.dshl'}}));

		const response = await host.fetch(input());

		await expect(gerritJson(response)).resolves.toStrictEqual({meta_b: {name: 'sample.dshl', language: 'dshl'}});
	});
});
