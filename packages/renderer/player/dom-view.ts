import type { SceneView } from './types.js';

export interface DomViewHosts {
  scenes: readonly HTMLElement[];
  media: HTMLElement;
  controls: HTMLElement;
}

/** Scene text is authored by the page; only generated media markup enters innerHTML. */
export function createDomView(hosts: DomViewHosts): SceneView {
  return {
    showScene(scene, mediaHtml, onControl) {
      hosts.scenes.forEach((element) =>
        element.classList.toggle('is-active', element.dataset.sceneId === scene.id),
      );
      hosts.media.innerHTML = mediaHtml;
      hosts.controls.replaceChildren();
      hosts.controls.hidden = scene.controls.length === 0;
      const removeListeners: (() => void)[] = [];
      for (const control of scene.controls) {
        const label = document.createElement('label');
        label.className = 'mb-control';
        const name = document.createElement('span');
        name.textContent = control.label;
        label.appendChild(name);
        const input = document.createElement('input');
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
          const handler = () => onControl(control.id, input.valueAsNumber);
          input.addEventListener('input', handler);
          removeListeners.push(() => input.removeEventListener('input', handler));
        }
        label.appendChild(input);
        hosts.controls.appendChild(label);
      }
      return () => {
        for (const remove of removeListeners) remove();
        hosts.controls.replaceChildren();
      };
    },
    clear() {
      hosts.scenes.forEach((element) => element.classList.remove('is-active'));
      hosts.media.replaceChildren();
      hosts.controls.replaceChildren();
      hosts.controls.hidden = true;
    },
  };
}
