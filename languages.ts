export type Language = {
	/** The name under which `script` registers the grammar with `hljs.registerLanguage`. */
	readonly name: string;
	/** The script of an npm package that registers the grammar on the global `hljs`, as `<package>/<path>`. */
	readonly script: string;
	/** File name suffixes such as `.dshl` and whole file names such as `jamfile`, compared without letter case. */
	readonly files: readonly string[];
};

export const languages: readonly Language[] = [
	{name: 'blk', script: '@gaijin/highlightjs-blk/dist/blk.min.js', files: ['.blk']},
	{name: 'daslang', script: '@gaijin/highlightjs-daslang/dist/daslang.min.js', files: ['.das']},
	{name: 'dshl', script: '@gaijin/highlightjs-dshl/dist/dshl.min.js', files: ['.dshl']},
	{name: 'jam', script: '@gaijin/highlightjs-jam/dist/jam.min.js', files: ['.jam', 'jamfile']},
	{name: 'quirrel', script: '@gaijin/highlightjs-quirrel/dist/quirrel.min.js', files: ['.nut']},
];
