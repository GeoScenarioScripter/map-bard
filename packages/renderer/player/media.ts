import type { CompiledResource, CompiledScene } from './types.js';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function resourceUrl(resource: CompiledResource): string {
  if (resource.bundlePath) {
    const path = resource.bundlePath;
    if (
      path.startsWith('/') ||
      path.includes('\\') ||
      path.split('/').some((part) => !part || part === '.' || part === '..') ||
      /^[A-Za-z]:/.test(path)
    ) {
      throw new Error(`Unsafe bundle path for ${resource.id}`);
    }
    return path;
  }
  if (resource.remoteUrl && /^https?:\/\//i.test(resource.remoteUrl)) return resource.remoteUrl;
  throw new Error(`No safe location for media ${resource.id}`);
}

function getResource(resources: readonly CompiledResource[], id: string): CompiledResource {
  const resource = resources.find((item) => item.id === id);
  if (!resource || resource.kind === 'data') throw new Error(`Missing media resource ${id}`);
  return resource;
}

export function mediaMarkup(
  resources: readonly CompiledResource[],
  assetId: string,
  captionOverride?: string,
  placement: 'inline' | 'figure' | 'background' = 'figure',
): string {
  const resource = getResource(resources, assetId);
  const src = escapeHtml(resourceUrl(resource));
  const caption = captionOverride ?? resource.caption ?? '';
  const credit = resource.credit ?? '';
  const qualification = resource.qualification ?? '';
  let content: string;
  if (resource.kind === 'video') {
    const poster = resource.posterId ? getResource(resources, resource.posterId) : undefined;
    if (poster && poster.kind !== 'image') throw new Error(`Invalid poster ${poster.id}`);
    const posterAttr = poster ? ` poster="${escapeHtml(resourceUrl(poster))}"` : '';
    content = `<video controls preload="metadata" src="${src}"${posterAttr}></video>`;
  } else {
    content = `<img loading="lazy" src="${src}" alt="${escapeHtml(caption || resource.name || '')}">`;
  }
  const creditHtml = credit ? `<span class="mb-credit">${escapeHtml(credit)}</span>` : '';
  const qualificationHtml = qualification
    ? `<span class="mb-qualification">${escapeHtml(qualification)}</span>`
    : '';
  const captionHtml =
    caption || creditHtml || qualificationHtml
      ? `<figcaption>${escapeHtml(caption)}${creditHtml}${qualificationHtml}</figcaption>`
      : '';
  return `<figure class="mb-media mb-media--${placement}">${content}${captionHtml}</figure>`;
}

export function sceneMediaMarkup(
  scene: CompiledScene,
  resources: readonly CompiledResource[],
): string {
  return scene.media
    .map((item) => mediaMarkup(resources, item.assetId, item.caption, item.placement))
    .join('');
}

export function anchorMarkup(
  anchor: CompiledScene['mediaAnchors'][number],
  resources: readonly CompiledResource[],
): string {
  const title = anchor.label
    ? `<strong class="mb-popup-title">${escapeHtml(anchor.label)}</strong>`
    : '';
  return title + mediaMarkup(resources, anchor.assetId);
}
