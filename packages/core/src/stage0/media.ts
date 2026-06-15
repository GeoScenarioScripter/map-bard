/**
 * Media registration: turn a `--media` input (local path or URL) into a
 * validated `MediaAsset`. Classifies kind/source/mimeType, reads best-effort
 * image dimensions for local images, validates local files exist and URLs are
 * well-formed. No transcoding, no LLM.
 */
import { basename, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { MediaAsset } from '@mapbard/schema';
import { sniffImageSize } from './image-size.js';
import { slugify } from './ingest-types.js';

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};
const VIDEO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
};

/** What the caller passes per `--media`: a string path/URL or an override bag. */
export interface MediaInput {
  path: string;
  id?: string;
  name?: string;
  caption?: string;
  credit?: string;
  poster?: string;
  location?: [number, number];
}

interface Classification {
  kind: MediaAsset['kind'];
  source: MediaAsset['source'];
  mimeType?: string;
}

function isUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/** Pure classification from a path/URL string (no I/O). Throws on unknown kind. */
export function classifyMedia(path: string): Classification {
  const source: MediaAsset['source'] = isUrl(path) ? 'url' : 'local';
  // Use the URL pathname for extension when classifying a URL.
  const forExt = source === 'url' ? safeUrlPathname(path) : path;
  const ext = extname(forExt).toLowerCase();
  if (ext in IMAGE_MIME) return { kind: 'image', source, mimeType: IMAGE_MIME[ext] };
  if (ext in VIDEO_MIME) return { kind: 'video', source, mimeType: VIDEO_MIME[ext] };
  throw new Error(`media: unrecognized file type "${ext || path}" (expected an image or video)`);
}

function safeUrlPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Register one media input into a validated-shape `MediaAsset`. Async (reads local images). */
export async function registerMedia(input: MediaInput): Promise<MediaAsset> {
  const { path } = input;
  const { kind, source, mimeType } = classifyMedia(path);

  if (source === 'url') {
    // Validate the URL is well-formed.
    try {
      new URL(path);
    } catch {
      throw new Error(`media: malformed URL "${path}"`);
    }
  } else if (!existsSync(path)) {
    throw new Error(`media: local file not found "${path}"`);
  }

  const name = input.name ?? basename(safeUrlPathname(path));
  const asset: MediaAsset = {
    id: input.id ?? slugify(name),
    name,
    kind,
    source,
    path,
  };
  if (mimeType) asset.mimeType = mimeType;
  if (input.caption) asset.caption = input.caption;
  if (input.credit) asset.credit = input.credit;
  if (input.poster) asset.poster = input.poster;
  if (input.location) asset.location = input.location;

  // Best-effort intrinsic size for local images.
  if (kind === 'image' && source === 'local') {
    try {
      const size = sniffImageSize(await readFile(path));
      if (size) {
        asset.width = size.width;
        asset.height = size.height;
      }
    } catch {
      // best-effort only
    }
  }

  return asset;
}

/** Register many media inputs (string paths or override bags). */
export async function registerMediaInputs(
  inputs: ReadonlyArray<string | MediaInput>,
): Promise<MediaAsset[]> {
  return Promise.all(
    inputs.map((i) => registerMedia(typeof i === 'string' ? { path: i } : i)),
  );
}
