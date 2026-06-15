/**
 * Public types for the renderer. The renderer is deterministic: it turns a
 * (validated) `GeoNarrative` plus the raw geo data into a set of text files and
 * a list of media/vendor files to copy. No LLM, no network.
 */

/** A map of `DataSource.id` → GeoJSON FeatureCollection (the actual features). */
export type DataMap = Record<string, unknown>;

export interface RenderOptions {
  /**
   * Base directory that local `MediaAsset.path` values resolve against (e.g. the
   * folder the narrative JSON lives in). Defaults to the current directory.
   */
  assetBaseDir?: string;
}

/** A local media file to copy into the bundle. */
export interface MediaCopy {
  assetId: string;
  /** Absolute (or base-resolved) source path on disk. */
  from: string;
  /** Bundle-relative destination, matching the `src` used in the HTML/JS. */
  to: string;
}

/** The pure output of `render()` — generated text plus a copy manifest. */
export interface RenderedBundle {
  /** Bundle-relative path → text content (e.g. `index.html`, `bundle-data.js`). */
  files: Record<string, string>;
  /** Local media files the writer must copy in (URL media is referenced in place). */
  mediaCopies: MediaCopy[];
  /** Non-fatal issues worth surfacing (e.g. a data source with no data). */
  warnings: string[];
}
