import path from 'node:path';
import {defineConfig} from 'vite-plus';

export default defineConfig({
	root: path.resolve(import.meta.dirname, '..'),
	test: {
		include: ['e2e/**/*.test.ts'],
		globalSetup: ['e2e/gerrit.ts'],
		testTimeout: 60_000,
		hookTimeout: 300_000,
	},
});
