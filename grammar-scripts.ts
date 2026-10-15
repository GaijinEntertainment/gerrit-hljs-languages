import {readFileSync} from 'node:fs';
import {findPackageJSON} from 'node:module';
import path from 'node:path';
import {languages} from './languages.ts';

const MODULE_ID = 'virtual:grammar-scripts';
const RESOLVED_ID = `\0${MODULE_ID}`;

/** Returns the text of `script`, a file of an installed npm package written as `<package>/<path>`. */
export function readGrammarScript(script: string): string {
	const segments = script.split('/');
	const nameLength = script.startsWith('@') ? 2 : 1;
	const packageName = segments.slice(0, nameLength).join('/');
	const packageJson = findPackageJSON(packageName, import.meta.url);
	if (packageJson === undefined) {
		throw new Error(`grammar script ${script}: package ${packageName} is not installed`);
	}
	return readFileSync(path.join(path.dirname(packageJson), ...segments.slice(nameLength)), 'utf8');
}

type ModulePlugin = {
	readonly name: string;
	resolveId(id: string): string | undefined;
	load(id: string): string | undefined;
};

/**
 * Returns the build plugin of the module `virtual:grammar-scripts`, whose default export is the text of the script of
 * each language in `languages.ts`, joined in that order.
 */
export function grammarScripts(): ModulePlugin {
	return {
		name: 'grammar-scripts',
		resolveId: (id) => (id === MODULE_ID ? RESOLVED_ID : undefined),
		load(id) {
			if (id !== RESOLVED_ID) {
				return undefined;
			}
			const scripts = languages.map((language) => readGrammarScript(language.script));
			return `export default ${JSON.stringify(scripts.join('\n'))};`;
		},
	};
}
