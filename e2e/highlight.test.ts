import {type Browser, chromium, type Page} from 'playwright';
import {afterAll, beforeAll, expect, inject, test} from 'vitest';
import {languages} from '../languages.ts';
import {languageOfPath} from '../src/diff-language.ts';
import {ADMIN_ACCOUNT_ID} from './gerrit.ts';

const gerrit = inject('gerrit');

let browser: Browser;
let page: Page;

beforeAll(async () => {
	browser = await chromium.launch();
	page = await browser.newPage();
	await page.goto(`${gerrit.origin}/login/?account_id=${ADMIN_ACCOUNT_ID}`);
});

afterAll(async () => {
	await browser.close();
});

function syntaxClasses(): string[] {
	const found = new Set<string>();
	const visit = (root: Document | ShadowRoot): void => {
		for (const element of root.querySelectorAll('*')) {
			for (const name of element.classList) {
				if (name.startsWith('gr-syntax-')) {
					found.add(name);
				}
			}
			if (element.shadowRoot !== null) {
				visit(element.shadowRoot);
			}
		}
	};
	visit(document);
	return [...found].toSorted();
}

async function openDiff(file: string): Promise<() => Promise<string[]>> {
	await page.goto(`${gerrit.origin}${gerrit.patchSetPath}/${file}`);
	return async () => page.evaluate(syntaxClasses);
}

const HIGHLIGHT_TIMEOUT = {timeout: 30_000};

const samples = gerrit.files.flatMap((file) => {
	const language = languageOfPath(file, languages);
	return language === undefined ? [] : [{file, language}];
});

test('each language has a sample file', () => {
	expect(samples.map((sample) => sample.language).toSorted()).toStrictEqual(
		languages.map((language) => language.name).toSorted(),
	);
});

test.for(samples)('$file gets the highlighting of $language', async ({file}) => {
	const classes = await openDiff(file);

	await expect.poll(classes, HIGHLIGHT_TIMEOUT).toContain('gr-syntax-keyword');
});

test('a language that Gerrit bundles keeps its highlighting', async () => {
	const classes = await openDiff('greet.py');

	await expect.poll(classes, HIGHLIGHT_TIMEOUT).toContain('gr-syntax-keyword');
});
