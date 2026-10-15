import {runInNewContext} from 'node:vm';
import hljs from 'highlight.js/lib/core';
import {expect, test} from 'vitest';
import {readGrammarScript} from '../grammar-scripts.ts';
import {languages} from '../languages.ts';

test.for(languages)('the script of $name registers the grammar under that name', ({name, script}) => {
	const instance = hljs.newInstance();

	runInNewContext(readGrammarScript(script), {hljs: instance});

	expect(instance.listLanguages()).toContain(name);
});

test('no two languages share a name or a file pattern', () => {
	const names = languages.map((language) => language.name);
	const files = languages.flatMap((language) => language.files.map((file) => file.toLowerCase()));

	expect(new Set(names).size).toBe(names.length);
	expect(new Set(files).size).toBe(files.length);
});
