/**
 * `@types/prismjs` types the package entry but not the component files.
 *
 * The entry is the one we do not want: it hooks `DOMContentLoaded` and scans the
 * whole document for elements to highlight, which this app never has. `prism-core`
 * is the same tokeniser with none of that, and the grammars are loaded beside it.
 */
declare module 'prismjs/components/prism-core' {
  export * from 'prismjs';
  export { default } from 'prismjs';
}

declare module 'prismjs/components/prism-markup';
declare module 'prismjs/components/prism-markdown';
