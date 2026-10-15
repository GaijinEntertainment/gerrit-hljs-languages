import {resolveObjectURL} from 'node:buffer';
import {describe, expect, test} from 'vitest';
import {addGrammarsToSyntaxWorkers} from '../src/syntax-worker.ts';

const HIGHLIGHT_JS_URL = 'http://gerrit.test/bower_components/highlightjs/highlight.min.js';
const GRAMMARS = 'hljs.registerLanguage("dshl", () => ({}));';

class FakeWorker {
	readonly calls: unknown[][] = [];

	postMessage(...args: unknown[]): void {
		this.calls.push(args);
	}
}

function patchedWorkers(): [FakeWorker, FakeWorker] {
	class Worker extends FakeWorker {}
	addGrammarsToSyntaxWorkers(GRAMMARS, Worker.prototype);
	return [new Worker(), new Worker()];
}

async function scriptText(message: unknown): Promise<string> {
	if (typeof message !== 'object' || message === null || !('url' in message) || typeof message.url !== 'string') {
		throw new Error(`no script URL in ${JSON.stringify(message)}`);
	}
	const blob = resolveObjectURL(message.url);
	if (blob === undefined) {
		throw new Error(`no blob behind ${message.url}`);
	}
	return blob.text();
}

describe('addGrammarsToSyntaxWorkers', () => {
	test('gives the init message a script that loads highlight.js and then the grammars', async () => {
		const [worker] = patchedWorkers();
		worker.postMessage({type: 0, url: HIGHLIGHT_JS_URL});

		expect(worker.calls).toHaveLength(1);
		const message = worker.calls[0]?.[0];
		expect(message).toMatchObject({type: 0});
		await expect(scriptText(message)).resolves.toBe(`importScripts(${JSON.stringify(HIGHLIGHT_JS_URL)});\n${GRAMMARS}`);
	});

	test('gives every worker the same script', () => {
		const [first, second] = patchedWorkers();
		first.postMessage({type: 0, url: HIGHLIGHT_JS_URL});
		second.postMessage({type: 0, url: HIGHLIGHT_JS_URL});

		expect(first.calls[0]?.[0]).toStrictEqual(second.calls[0]?.[0]);
	});

	test.for([
		{name: 'a highlight request', message: {type: 1, language: 'dshl', code: 'int x;'}},
		{name: 'an init message of another script', message: {type: 0, url: 'http://gerrit.test/other.js'}},
		{name: 'a message that is no object', message: 'ping'},
	])('passes $name unchanged', ({message}) => {
		const [worker] = patchedWorkers();
		worker.postMessage(message, {transfer: []});

		expect(worker.calls).toStrictEqual([[message, {transfer: []}]]);
	});
});
