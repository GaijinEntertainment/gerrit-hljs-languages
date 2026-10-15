// constraint: Gerrit sends this URL in the init message of each syntax worker (services/highlight/highlight-service.ts)
const HIGHLIGHT_JS_PATH = '/bower_components/highlightjs/highlight.min.js';

// constraint: SyntaxWorkerMessageType.INIT of the Gerrit web app (types/syntax-worker-api.ts)
const INIT_MESSAGE_TYPE = 0;

type InitMessage = {
	readonly type: number;
	readonly url: string;
};

function isHighlightJsInit(message: unknown): message is InitMessage {
	if (typeof message !== 'object' || message === null || !('type' in message) || !('url' in message)) {
		return false;
	}
	return (
		message.type === INIT_MESSAGE_TYPE && typeof message.url === 'string' && message.url.endsWith(HIGHLIGHT_JS_PATH)
	);
}

/**
 * Makes each syntax worker of the diff view run `grammarScripts` after it loads highlight.js, by giving the init message
 * of the worker a script that loads both. The workers start with the first diff view, so call this when the plugin
 * loads.
 */
export function addGrammarsToSyntaxWorkers(
	grammarScripts: string,
	workerPrototype: Pick<Worker, 'postMessage'> = Worker.prototype,
): void {
	const postMessage = workerPrototype.postMessage;
	let scriptUrl: string | undefined;
	workerPrototype.postMessage = function (this: unknown, message: unknown, ...rest: unknown[]): void {
		if (isHighlightJsInit(message)) {
			const script = `importScripts(${JSON.stringify(message.url)});\n${grammarScripts}`;
			scriptUrl ??= URL.createObjectURL(new Blob([script], {type: 'text/javascript'}));
			Reflect.apply(postMessage, this, [{...message, url: scriptUrl}, ...rest]);
			return;
		}
		Reflect.apply(postMessage, this, [message, ...rest]);
	};
}
