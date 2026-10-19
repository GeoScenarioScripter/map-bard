import type { SceneView } from './types.js';

export interface DomViewHosts {
  scenes: readonly HTMLElement[];
  media: HTMLElement;
  controls: HTMLElement;
  legends: HTMLElement;
}

export function sliderKeyValue(
  key: string,
  current: number,
  range: readonly [number, number],
): number | undefined {
  const [min, max] = range;
  if (key === 'Home') return min;
  if (key === 'End') return max;
  const unit = (max - min) / 100;
  const direction =
    key === 'ArrowRight' || key === 'ArrowUp' || key === 'PageUp'
      ? 1
      : key === 'ArrowLeft' || key === 'ArrowDown' || key === 'PageDown'
        ? -1
        : 0;
  if (!direction) return undefined;
  const step = key.startsWith('Page') ? unit * 10 : unit;
  return Math.min(max, Math.max(min, current + direction * step));
}

/** Scene text is authored by the page; only generated media markup enters innerHTML. */
export function createDomView(hosts: DomViewHosts): SceneView {
  return {
    showScene(scene, mediaHtml, onControl, legendHtml = '') {
      hosts.scenes.forEach((element) =>
        element.classList.toggle('is-active', element.dataset.sceneId === scene.id),
      );
      hosts.media.innerHTML = mediaHtml;
      hosts.legends.innerHTML = legendHtml;
      hosts.legends.querySelectorAll<HTMLElement>('[data-mb-color]').forEach((swatch) => {
        swatch.style.backgroundColor = swatch.dataset.mbColor ?? '';
      });
      hosts.legends.hidden = !legendHtml;
      hosts.controls.replaceChildren();
      hosts.controls.hidden = scene.controls.length === 0;
      const removeListeners: (() => void)[] = [];
      for (const control of scene.controls) {
        const label = document.createElement('label');
        label.className = 'mb-control';
        const name = document.createElement('span');
        name.className = 'mb-control-label';
        name.textContent = control.label;
        label.appendChild(name);
        const input = document.createElement('input');
        input.setAttribute('aria-label', control.label);
        input.className = 'mb-control-input';
        if (control.kind === 'toggle') {
          input.type = 'checkbox';
          input.checked = control.default === true;
          const handler = () => onControl(control.id, input.checked);
          input.addEventListener('change', handler);
          removeListeners.push(() => input.removeEventListener('change', handler));
        } else {
          input.type = 'range';
          input.min = String(control.range?.[0] ?? 0);
          input.max = String(control.range?.[1] ?? 1);
          input.step = 'any';
          input.value = String(control.default);
          const output = document.createElement('output');
          output.className = 'mb-control-value';
          output.value = input.value;
          const handler = () => {
            output.value = input.value;
            onControl(control.id, input.valueAsNumber);
          };
          const keyHandler = (event: KeyboardEvent) => {
            if (!control.range) return;
            const value = sliderKeyValue(event.key, input.valueAsNumber, control.range);
            if (value === undefined) return;
            event.preventDefault();
            input.value = String(value);
            handler();
          };
          input.addEventListener('input', handler);
          input.addEventListener('keydown', keyHandler);
          removeListeners.push(() => input.removeEventListener('input', handler));
          removeListeners.push(() => input.removeEventListener('keydown', keyHandler));
          label.appendChild(output);
        }
        label.appendChild(input);
        hosts.controls.appendChild(label);
      }
      return () => {
        for (const remove of removeListeners) remove();
        hosts.controls.replaceChildren();
        hosts.legends.replaceChildren();
        hosts.legends.hidden = true;
      };
    },
    clear() {
      hosts.scenes.forEach((element) => element.classList.remove('is-active'));
      hosts.media.replaceChildren();
      hosts.controls.replaceChildren();
      hosts.controls.hidden = true;
      hosts.legends.replaceChildren();
      hosts.legends.hidden = true;
    },
  };
}
