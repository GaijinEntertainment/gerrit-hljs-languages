import grammarScripts from 'virtual:grammar-scripts';
import {languages} from '../languages.ts';
import {setDiffLanguages} from './diff-language.ts';
import {addGrammarsToSyntaxWorkers} from './syntax-worker.ts';

addGrammarsToSyntaxWorkers(grammarScripts);
setDiffLanguages(languages);
globalThis.Gerrit.install(() => {});
