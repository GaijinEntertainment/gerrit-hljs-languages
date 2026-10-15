import {defineConfig} from 'vite-plus';
import javascript from '@ver0/oxlint-config/javascript.js';
import typescript from '@ver0/oxlint-config/typescript.js';
import vitest from '@ver0/oxlint-config/vitest.js';
import {grammarScripts} from './grammar-scripts.ts';

export default defineConfig({
	fmt: {
		printWidth: 120,
		useTabs: true,
		tabWidth: 2,
		semi: true,
		singleQuote: true,
		trailingComma: 'all',
		bracketSpacing: false,
	},
	lint: {
		extends: [javascript, typescript, vitest],
		ignorePatterns: ['**/dist/**'],
		options: {
			typeAware: true,
			typeCheck: true,
		},
		rules: {
			// Request, Response, URL, Worker, and the parameters of fetch are mutable types of the DOM.
			'typescript/prefer-readonly-parameter-types': 'off',
		},
	},
	test: {
		include: ['test/**/*.test.ts'],
	},
	pack: {
		entry: {'hljs-languages': 'src/plugin.ts'},
		platform: 'browser',
		target: 'es2022',
		dts: false,
		plugins: [grammarScripts()],
		format: {
			iife: {
				minify: true,
				outputOptions: {entryFileNames: '[name].js'},
			},
		},
	},
});
