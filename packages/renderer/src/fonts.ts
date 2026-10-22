// Bundled OFL font files (Latin subset, variable weight) and their licences, by family.
// Versions are pinned in package.json; the licence travels with the font in every build.
export const FONT_FILES: Record<string, { font: [string, string]; license: [string, string] }> = {
  Inter: {
    font: [
      '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
      'fonts/inter-latin-wght-normal.woff2',
    ],
    license: ['@fontsource-variable/inter/LICENSE', 'fonts/LICENSE-Inter.txt'],
  },
  'Source Serif 4': {
    font: [
      '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
      'fonts/source-serif-4-latin-wght-normal.woff2',
    ],
    license: ['@fontsource-variable/source-serif-4/LICENSE', 'fonts/LICENSE-Source-Serif-4.txt'],
  },
};
