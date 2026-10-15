export type LanguageFiles = {
	readonly name: string;
	readonly files: readonly string[];
};

// constraint: the Gerrit REST API starts each JSON response with this prefix against XSSI
const JSON_PREFIX = ")]}'\n";

const DIFF_PATH = /\/files\/(?<path>[^/]+)\/diff$/;

/** Returns the name of the first language whose file names match `path`, or `undefined`. */
export function languageOfPath(path: string, languages: readonly LanguageFiles[]): string | undefined {
	const fileName = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
	const matches = (pattern: string): boolean =>
		pattern.startsWith('.') ? fileName.endsWith(pattern.toLowerCase()) : fileName === pattern.toLowerCase();
	return languages.find((language) => language.files.some(matches))?.name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function requestUrl(input: RequestInfo | URL): URL {
	if (typeof input === 'string') {
		return new URL(input, globalThis.location.href);
	}
	return input instanceof URL ? input : new URL(input.url);
}

function diffPath(input: RequestInfo | URL): string | undefined {
	const encodedPath = DIFF_PATH.exec(requestUrl(input).pathname)?.groups?.path;
	return encodedPath === undefined ? undefined : decodeURIComponent(encodedPath);
}

/**
 * Sets the `language` of each side of a diff that the Gerrit REST API returns, from the file name of that side. The
 * diff view takes `language` before the content type, which knows no language that Gerrit does not bundle
 * (`embed/diff/gr-syntax-layer/gr-syntax-layer-worker.ts`). A side that already has a `language` keeps it.
 */
export function setDiffLanguages(languages: readonly LanguageFiles[], host: {fetch: typeof fetch} = globalThis): void {
	const originalFetch = host.fetch;
	host.fetch = async (input, init) => {
		const response = await originalFetch(input, init);
		const path = diffPath(input);
		if (!response.ok || path === undefined || languageOfPath(path, languages) === undefined) {
			return response;
		}
		const text = await response.clone().text();
		if (!text.startsWith(JSON_PREFIX)) {
			return response;
		}
		const diff: unknown = JSON.parse(text.slice(JSON_PREFIX.length));
		if (!isRecord(diff)) {
			return response;
		}
		for (const meta of [diff.meta_a, diff.meta_b]) {
			if (isRecord(meta) && typeof meta.name === 'string' && meta.language === undefined) {
				const language = languageOfPath(meta.name, languages);
				if (language !== undefined) {
					meta.language = language;
				}
			}
		}
		return new Response(JSON_PREFIX + JSON.stringify(diff), {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
}
