import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script } from 'node:vm';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Compiled, PublicationInputs } from '@mapbard/schema';
import { renderCompiled } from './compiled.js';
import { writeCompiledBundle } from './write-compiled.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('../../core/src/compile/fixtures/compiled.g1-r1.json', import.meta.url),
    'utf8',
  ),
) as Compiled;
const dataBytes = ['period-a', 'period-b'].map((id) => ({
  id,
  bytes: readFileSync(
    new URL(`../../../docs/stage-1/specimens/data/${id}.geojson`, import.meta.url),
  ),
}));
const publication = (): PublicationInputs => ({
  currentInput: structuredClone(fixture.input),
  dataBytes,
  assets: [],
});
const digest = (bytes: Uint8Array) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const codes = (result: { diagnostics: { code: string }[] }) =>
  result.diagnostics.map((item) => item.code);

describe('compiled publication', () => {
  it('wires the actual compiled fixture and full data into a direct-file page', async () => {
    const result = renderCompiled(fixture, publication());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.files['index.html']).toContain('data-scene-id="a"');
    expect(result.value.files['index.html']).toContain('player.js');
    expect(result.value.files['index.html']).toContain('mb-legend-host');
    expect(result.value.files['compiled-app.js']).toContain('createMapLibreAdapter');
    expect(result.value.files['compiled-app.js']).toContain('map.scrollZoom.disable()');
    expect(result.value.files['compiled-data.js']).toContain('"period-a"');
    expect(result.value.files['compiled-data.js']).not.toContain('</script>');
    expect(() => new Script(result.value.files['compiled-data.js']!)).not.toThrow();
    expect(() => new Script(result.value.files['compiled-app.js']!)).not.toThrow();
    const root = await mkdtemp(join(tmpdir(), 'mapbard-publish-'));
    try {
      const out = join(root, 'story');
      const written = await writeCompiledBundle(result.value, out);
      expect(written.ok).toBe(true);
      if (written.ok) expect(written.value.written).toContain('player.js');
      expect((await readFile(join(out, 'player.js'), 'utf8')).length).toBeGreaterThan(1000);
      expect(await readFile(join(out, 'index.html'), 'utf8')).toContain('Sources');
      expect(codes(await writeCompiledBundle(result.value, out))).toContain('ASSET_COLLISION');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects stale authored snapshots and changed data buffers', () => {
    const changed = publication();
    changed.currentInput.designSha256 = digest(new TextEncoder().encode('changed'));
    expect(codes(renderCompiled(fixture, changed))).toContain('INPUT_STALE');
    const staleData = publication();
    staleData.dataBytes = [
      { id: 'period-a', bytes: new TextEncoder().encode('{}') },
      dataBytes[1]!,
    ];
    expect(codes(renderCompiled(fixture, staleData))).toContain('INPUT_STALE');
  });

  it('escapes authored text and declares remote media dependencies', () => {
    const story = structuredClone(fixture);
    story.title = '<img src=x onerror=alert(1)>';
    story.scenes[0]!.narration = '</script>\u2028';
    story.resources.push({
      id: 'clip',
      kind: 'video',
      remoteUrl: 'https://example.org/clip.mp4',
      credit: 'Supplied clip',
    });
    story.scenes[0]!.media.push({ assetId: 'clip', placement: 'figure' });
    story.requiredNetwork = ['https://example.org/clip.mp4'];
    const result = renderCompiled(story, publication());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.files['index.html']).toContain('&lt;img');
    expect(result.value.files['index.html']).not.toContain('<img src=x');
    expect(result.value.files['compiled-data.js']).not.toContain('</script>');
    expect(result.value.requiredNetwork).toEqual(['https://example.org/clip.mp4']);
    story.requiredNetwork = [];
    expect(codes(renderCompiled(story, publication()))).toContain('VALUE_INVALID');
  });

  it('rejects changed media, linked media, and case-insensitive destination collisions before writing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mapbard-assets-'));
    try {
      const source = join(root, 'photo.png');
      const bytes = new Uint8Array([1, 2, 3]);
      await writeFile(source, bytes);
      const story = structuredClone(fixture);
      story.input.resources.push({ id: 'photo', sha256: digest(bytes) });
      story.resources.push({
        id: 'photo',
        kind: 'image',
        bundlePath: 'media/photo.png',
        credit: 'Creator',
        qualification: 'Illustrative only',
      });
      const inputs: PublicationInputs = {
        currentInput: structuredClone(story.input),
        dataBytes,
        assets: [
          {
            id: 'photo',
            sourcePath: source,
            projectRoot: root,
            bundlePath: 'media/photo.png',
            sha256: digest(bytes),
          },
        ],
      };
      const rendered = renderCompiled(story, inputs);
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) return;
      expect(rendered.value.files['index.html']).toContain('Illustrative only');
      await writeFile(source, new Uint8Array([9]));
      expect(codes(await writeCompiledBundle(rendered.value, join(root, 'stale')))).toContain(
        'RESOURCE_HASH_MISMATCH',
      );
      await writeFile(source, bytes);
      const linked = join(root, 'linked.png');
      try {
        await symlink(source, linked);
        const linkedBundle = structuredClone(rendered.value);
        linkedBundle.mediaCopies[0]!.sourcePath = linked;
        expect(
          codes(await writeCompiledBundle(linkedBundle, join(root, 'linked-output'))),
        ).toContain('ASSET_PATH_INVALID');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
      }
      const collision = structuredClone(rendered.value);
      collision.mediaCopies.push({
        ...collision.mediaCopies[0]!,
        id: 'another',
        bundlePath: 'MEDIA/PHOTO.PNG',
      });
      expect(codes(await writeCompiledBundle(collision, join(root, 'collision')))).toContain(
        'ASSET_COLLISION',
      );
      const prefix = structuredClone(rendered.value);
      prefix.mediaCopies.push({
        ...prefix.mediaCopies[0]!,
        id: 'directory-file',
        bundlePath: 'media',
      });
      expect(codes(await writeCompiledBundle(prefix, join(root, 'prefix')))).toContain(
        'ASSET_COLLISION',
      );
      const outside = structuredClone(rendered.value);
      outside.mediaCopies[0]!.projectRoot = join(root, 'different-root');
      expect(codes(await writeCompiledBundle(outside, join(root, 'outside')))).toContain(
        'ASSET_PATH_INVALID',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('retains local video poster IDs and copies both declared assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mapbard-poster-'));
    try {
      const image = join(root, 'poster.png');
      const video = join(root, 'clip.mp4');
      const imageBytes = new Uint8Array([1, 2]);
      const videoBytes = new Uint8Array([3, 4]);
      await writeFile(image, imageBytes);
      await writeFile(video, videoBytes);
      const story = structuredClone(fixture);
      story.input.resources.push(
        { id: 'poster', sha256: digest(imageBytes) },
        { id: 'clip', sha256: digest(videoBytes) },
      );
      story.resources.push(
        { id: 'poster', kind: 'image', bundlePath: 'media/poster.png' },
        { id: 'clip', kind: 'video', bundlePath: 'media/clip.mp4', posterId: 'poster' },
      );
      story.scenes[0]!.media.push({ assetId: 'clip', placement: 'figure' });
      const inputs: PublicationInputs = {
        currentInput: structuredClone(story.input),
        dataBytes,
        assets: [
          {
            id: 'poster',
            sourcePath: image,
            projectRoot: root,
            bundlePath: 'media/poster.png',
            sha256: digest(imageBytes),
          },
          {
            id: 'clip',
            sourcePath: video,
            projectRoot: root,
            bundlePath: 'media/clip.mp4',
            sha256: digest(videoBytes),
          },
        ],
      };
      const rendered = renderCompiled(story, inputs);
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) return;
      expect(rendered.value.files['compiled-data.js']).toContain('"posterId":"poster"');
      const out = join(root, 'story');
      const written = await writeCompiledBundle(rendered.value, out);
      expect(written.ok).toBe(true);
      expect(await readFile(join(out, 'media/poster.png'))).toEqual(Buffer.from(imageBytes));
      expect(await readFile(join(out, 'media/clip.mp4'))).toEqual(Buffer.from(videoBytes));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
