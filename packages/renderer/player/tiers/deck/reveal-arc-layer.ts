import type { DefaultProps } from '@deck.gl/core';
import { ArcLayer, type ArcLayerProps } from '@deck.gl/layers';
import type { ShaderModule } from '@luma.gl/shadertools';

/**
 * `line-reveal` for arcs: an `ArcLayer` whose fragment shader discards everything past a
 * fraction of each arc, measured from the origin. The arc shader passes the position along
 * the arc (0 at the origin, 1 at the destination) to the fragment as `geometry.uv.x`.
 */

type RevealProps = { fraction: number };

const revealUniforms = {
  name: 'reveal',
  fs: `\
layout(std140) uniform revealUniforms {
  float fraction;
} reveal;
`,
  uniformTypes: { fraction: 'f32' },
} as const satisfies ShaderModule<RevealProps>;

export type RevealArcLayerProps<DataT = unknown> = ArcLayerProps<DataT> & {
  /** Share of each arc drawn, from its origin: 0 draws nothing, 1 the whole arc. */
  revealFraction?: number;
};

export class RevealArcLayer<DataT = unknown> extends ArcLayer<DataT, { revealFraction?: number }> {
  static override layerName = 'MapBardRevealArcLayer';
  static override defaultProps = {
    ...ArcLayer.defaultProps,
    revealFraction: { type: 'number', value: 1, min: 0, max: 1 },
  } as DefaultProps<RevealArcLayerProps>;

  override getShaders() {
    const shaders = super.getShaders();
    return {
      ...shaders,
      modules: [...shaders.modules, revealUniforms],
      inject: {
        ...shaders.inject,
        'fs:DECKGL_FILTER_COLOR': 'if (geometry.uv.x > reveal.fraction) discard;',
      },
    };
  }

  override draw(options: Parameters<ArcLayer['draw']>[0]): void {
    const model = (this.state as { model?: { shaderInputs: { setProps(props: object): void } } })
      .model;
    model?.shaderInputs.setProps({ reveal: { fraction: this.props.revealFraction ?? 1 } });
    super.draw(options);
  }
}
