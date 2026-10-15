declare module 'virtual:grammar-scripts' {
	const grammarScripts: string;
	export default grammarScripts;
}

declare var Gerrit: {
	install(callback: () => void): void;
};
