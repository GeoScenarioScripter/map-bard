import type { IControl } from 'maplibre-gl';
import type { LayerTrackProperty, Stagger, StaggeredTrackProperty } from '@mapbard/schema';
import type { TierFactory, TierLayers } from '../../tiers.js';
import type { CompiledLayer } from '../../types.js';
import {
  arcRows,
  clockLabel,
  staggerOrder,
  tripRows,
  type ArcRow,
  type Rgba,
  type TripRow,
} from './flows-data.js';

/**
 * The deck.gl tier (step 5.2, N): arcs and trips in deck.gl's `MapLibreOverlay`, interleaved
 * in MapLibre's WebGL2 context below the first label layer. deck.gl itself is injected, so this
 * module's logic is tested without WebGL.
 */

/** A deck.gl layer instance; only `isLoaded` is read, once deck.gl has matched it. */
export type DeckLayer = { readonly isLoaded?: boolean };

export type DeckOverlay = IControl & { setProps(props: { layers: DeckLayer[] }): void };

export type DeckLibrary = {
  overlay(props: {
    interleaved: true;
    layers: DeckLayer[];
    onAfterRender: () => void;
    onError: (error: Error) => void;
  }): DeckOverlay;
  arcLayer(props: Record<string, unknown>): DeckLayer;
  tripsLayer(props: Record<string, unknown>): DeckLayer;
};

/** Default opacity of flows without an authored constant. */
const FLOW_OPACITY = 0.9;
/** Frames drawn after the last change before captures may read the canvas. */
const SETTLE_FRAMES = 2;
const DRAWN_TIMEOUT_MS = 10000;

type Bound = {
  layer: CompiledLayer;
  beforeId: string | undefined;
  /** Track and control state. */
  opacity: number;
  baseOpacity: number;
  visible: boolean;
  highlight: number;
  reveal: number;
  /** Trip clock as a share of the time domain; undefined draws the full tracks. */
  trail: number | undefined;
  /** Per-row opacity factors of a staggered opacity track, in row order. */
  rowOpacity: number[] | undefined;
  /** Bumped whenever accessor output changes, so deck.gl recomputes attributes. */
  version: number;
} & ({ kind: 'arc'; rows: ArcRow[] } | { kind: 'trip'; rows: TripRow[] });

const fade = (color: Rgba, factor: number): Rgba => [
  color[0],
  color[1],
  color[2],
  Math.round(color[3] * factor),
];

export function createDeckTier(deck: DeckLibrary): TierFactory {
  return ({ story, data, map }): TierLayers => {
    const bound = new Map<string, Bound>();
    let rendered = 0;
    let changedAt = 0;
    const overlay = deck.overlay({
      interleaved: true,
      layers: [],
      onAfterRender: () => {
        rendered += 1;
      },
      onError: (error) => console.error(error),
    });
    map.addControl(overlay);
    const reduceQuery =
      typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;

    /** Under reduced motion (unless the scene keeps motion) a trip shows its full tracks. */
    function fullTracks(layer: CompiledLayer): boolean {
      if (!reduceQuery?.matches) return false;
      const scene = story.scenes.find((item) => item.id === layer.sceneId);
      return scene?.motion.reducedMotion !== 'keep';
    }

    function firstLabelId(): string | undefined {
      return map
        .getStyle()
        .layers?.find((item) => item.type === 'symbol' && /label|place/i.test(item.id))?.id;
    }

    function rowFactor(entry: Bound, position: number): number {
      return entry.rowOpacity?.[position] ?? 1;
    }

    function deckLayer(entry: Bound): DeckLayer {
      const { layer } = entry;
      const common = {
        id: layer.runtimeId,
        beforeId: entry.beforeId,
        pickable: false,
        visible: entry.visible,
        opacity: entry.baseOpacity * entry.opacity,
        widthUnits: 'pixels',
        widthScale: 1 + 0.8 * entry.highlight,
      };
      const triggers = entry.version;
      if (entry.kind === 'arc') {
        const rows = entry.rows;
        const position = new Map(rows.map((row, index) => [row, index]));
        const factor = (row: ArcRow) => rowFactor(entry, position.get(row) ?? 0);
        return deck.arcLayer({
          ...common,
          data: rows,
          getSourcePosition: (row: ArcRow) => row.from,
          getTargetPosition: (row: ArcRow) => row.to,
          getSourceColor: (row: ArcRow) => fade(row.origin, factor(row)),
          getTargetColor: (row: ArcRow) => fade(row.destination, factor(row)),
          getWidth: (row: ArcRow) => row.width,
          getHeight: layer.arc!.height,
          greatCircle: layer.arc!.greatCircle,
          revealFraction: entry.reveal,
          updateTriggers: { getSourceColor: triggers, getTargetColor: triggers },
        });
      }
      const rows = entry.rows;
      const trip = layer.trip!;
      const position = new Map(rows.map((row, index) => [row, index]));
      const span = Math.max(trip.durationSeconds, 1);
      // A trail track moves the clock with a fading trail; line-reveal draws the tracks on whole.
      const clocked = entry.trail !== undefined && !fullTracks(layer);
      const revealing = !clocked && entry.reveal < 1;
      const currentTime = clocked
        ? entry.trail! * trip.durationSeconds
        : revealing
          ? entry.reveal * trip.durationSeconds
          : trip.durationSeconds;
      return deck.tripsLayer({
        ...common,
        data: rows,
        getPath: (row: TripRow) => row.path,
        getTimestamps: (row: TripRow) => row.timestamps,
        getColor: (row: TripRow) => fade(row.color, rowFactor(entry, position.get(row) ?? 0)),
        getWidth: trip.width,
        capRounded: true,
        jointRounded: true,
        currentTime,
        trailLength: clocked ? trip.trailSeconds : span + 1,
        fadeTrail: clocked,
        updateTriggers: { getColor: triggers },
      });
    }

    function showClock(entry: Bound): void {
      const trip = entry.layer.trip;
      if (!trip) return;
      const clocked = entry.trail !== undefined && !fullTracks(entry.layer);
      const text = clocked
        ? clockLabel(trip.clock, entry.trail! * trip.durationSeconds)
        : trip.rangeLabel;
      if (typeof document === 'undefined') return;
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-mb-clock]')))
        if (element.dataset.mbClock === entry.layer.runtimeId && element.textContent !== text)
          element.textContent = text;
    }

    function refresh(): void {
      overlay.setProps({ layers: [...bound.values()].map(deckLayer) });
      changedAt = rendered;
      map.triggerRepaint();
    }

    function entryOf(runtimeId: string): Bound {
      const entry = bound.get(runtimeId);
      if (!entry) throw new Error(`Missing active deck layer ${runtimeId}`);
      return entry;
    }

    return {
      bindLayer(layer) {
        if (bound.has(layer.runtimeId)) throw new Error(`Layer already bound ${layer.runtimeId}`);
        const source = data[layer.sourceId] as { features?: unknown[] } | undefined;
        if (!source) throw new Error(`Missing GeoJSON source ${layer.sourceId}`);
        const scale = layer.scaleId
          ? story.scales.find((item) => item.id === layer.scaleId)
          : undefined;
        if (layer.scaleId && !scale) throw new Error(`Missing resolved scale ${layer.scaleId}`);
        const state = {
          layer,
          beforeId: firstLabelId(),
          opacity: 1,
          baseOpacity: layer.constant?.opacity ?? FLOW_OPACITY,
          visible: true,
          highlight: 0,
          reveal: 1,
          trail: undefined,
          rowOpacity: undefined,
          version: 0,
        };
        let entry: Bound;
        if (layer.technique === 'arc')
          entry = { ...state, kind: 'arc', rows: arcRows(layer, scale, source) };
        else if (layer.technique === 'trip')
          entry = {
            ...state,
            kind: 'trip',
            rows: tripRows(layer, scale, source, story.theme.colors.accent),
          };
        else throw new Error(`The deck tier does not draw ${layer.technique} layers`);
        bound.set(layer.runtimeId, entry);
        showClock(entry);
        refresh();
      },
      unbindLayer(runtimeId) {
        if (!bound.delete(runtimeId)) return;
        refresh();
      },
      setControl(runtimeId, property, value) {
        const entry = entryOf(runtimeId);
        if (property === 'visibility') entry.visible = Boolean(value);
        else if (property === 'opacity' && typeof value === 'number') entry.baseOpacity = value;
        else throw new Error(`Flows have no ${property} control (${runtimeId})`);
        refresh();
      },
      setLayerProperty(runtimeId, property: LayerTrackProperty, value) {
        const entry = entryOf(runtimeId);
        if (property === 'opacity') entry.opacity = value;
        else if (property === 'highlight') entry.highlight = value;
        else if (property === 'line-reveal') entry.reveal = value;
        else if (property === 'trail' && entry.kind === 'trip') {
          entry.trail = value;
          showClock(entry);
        } else throw new Error(`The deck tier does not draw ${property} tracks (${runtimeId})`);
        refresh();
      },
      staggerCount(runtimeId) {
        return entryOf(runtimeId).rows.length;
      },
      setLayerFeatureValues(
        runtimeId,
        property: StaggeredTrackProperty,
        stagger: Stagger,
        valueAt,
      ) {
        const entry = entryOf(runtimeId);
        if (property !== 'opacity')
          throw new Error(`The deck tier does not stagger ${property} (${runtimeId})`);
        const values = new Array<number>(entry.rows.length).fill(1);
        staggerOrder(entry.rows, stagger).forEach((position, rank) => {
          values[position] = valueAt(rank);
        });
        entry.rowOpacity = values;
        entry.version += 1;
        refresh();
      },
      whenDrawn() {
        if (!bound.size) return Promise.resolve();
        const since = changedAt;
        const started = performance.now();
        return new Promise<void>((resolve) => {
          const check = () => {
            const settled = rendered - since >= SETTLE_FRAMES;
            const loaded = (overlayLayers() ?? []).every((item) => item.isLoaded !== false);
            if ((settled && loaded) || performance.now() - started > DRAWN_TIMEOUT_MS)
              return resolve();
            map.triggerRepaint();
            requestAnimationFrame(check);
          };
          check();
        });
      },
      dispose() {
        bound.clear();
        map.removeControl(overlay);
      },
    };

    /** The live deck.gl layers, which carry `isLoaded` once deck.gl has matched them. */
    function overlayLayers(): DeckLayer[] | undefined {
      return (overlay as { _props?: { layers?: DeckLayer[] } })._props?.layers;
    }
  };
}
