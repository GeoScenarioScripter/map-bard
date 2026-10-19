/*
 * MapBard runtime — the deterministic player for a GeoNarrative bundle.
 *
 * Reads `window.MAPBARD = { narrative, data }` (injected by bundle-data.js),
 * builds a MapLibre map, and drives scenes from scroll via scrollama. This file
 * is shipped verbatim (no build step), so it is plain ES5-ish browser JS.
 *
 * Globals expected: `maplibregl`, `scrollama`.
 */
(function () {
  'use strict';

  var payload = window.MAPBARD || {};
  var narrative = payload.narrative;
  var data = payload.data || {};
  var localContextMap = payload.localContextMap;
  if (!narrative) {
    console.error('[mapbard] missing narrative payload (bundle-data.js not loaded?)');
    return;
  }

  var scenes = narrative.scenes || [];
  var theme = narrative.theme || {};
  var palette =
    theme.palette && theme.palette.length ? theme.palette : ['#dbe9ff', '#5b8def', '#0b3d91'];
  var accent = palette[palette.length - 1];

  // ---------------------------------------------------------------- helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function assetById(id) {
    var list = narrative.mediaAssets || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function mediaTag(asset, caption) {
    if (!asset) return '';
    var cap = caption || asset.caption || '';
    var inner;
    if (asset.kind === 'video') {
      inner =
        '<video controls preload="metadata"' +
        (asset.poster ? ' poster="' + esc(asset.poster) + '"' : '') +
        ' src="' +
        esc(asset.path) +
        '"></video>';
    } else {
      inner =
        '<img loading="lazy" src="' + esc(asset.path) + '" alt="' + esc(cap || asset.name) + '">';
    }
    var credit = asset.credit ? '<span class="mb-credit">' + esc(asset.credit) + '</span>' : '';
    var figcap =
      cap || credit ? '<figcaption>' + (cap ? esc(cap) : '') + credit + '</figcaption>' : '';
    return '<figure class="mb-media">' + inner + figcap + '</figure>';
  }

  // numeric [min,max] for an attribute across a source's features
  function domainOf(sourceId, attr) {
    var fc = data[sourceId];
    var min = Infinity;
    var max = -Infinity;
    if (fc && fc.features) {
      for (var i = 0; i < fc.features.length; i++) {
        var props = fc.features[i].properties || {};
        var v = Number(props[attr]);
        if (!isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (min === Infinity) {
      min = 0;
      max = 1;
    }
    if (min === max) max = min + 1;
    return [min, max];
  }

  // ----------------------------------------------- LayerBinding -> MapLibre
  function buildLayer(b) {
    var type;
    switch (b.technique) {
      case 'line':
        type = 'line';
        break;
      case 'heatmap':
        type = 'heatmap';
        break;
      case 'choropleth':
      case 'fill':
        type = 'fill';
        break;
      default:
        type = 'circle'; // point, graduated-symbol, categorical
    }

    var enc = b.encode || null;
    var paint = {};

    if (type === 'circle') {
      var radius = 7;
      var color = accent;
      if (enc && enc.attribute) {
        var d = domainOf(b.dataSourceId, enc.attribute);
        var getNum = ['to-number', ['get', enc.attribute]];
        if (enc.visualVariable === 'size' || b.technique === 'graduated-symbol') {
          radius = ['interpolate', ['linear'], getNum, d[0], 5, d[1], 22];
        }
        if (enc.visualVariable === 'color') {
          color = [
            'interpolate',
            ['linear'],
            getNum,
            d[0],
            palette[0],
            d[1],
            palette[palette.length - 1],
          ];
        }
      }
      paint = {
        'circle-radius': radius,
        'circle-color': color,
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      };
    } else if (type === 'fill') {
      var fillColor = accent;
      if (enc && enc.attribute && enc.visualVariable === 'color') {
        var df = domainOf(b.dataSourceId, enc.attribute);
        fillColor = [
          'interpolate',
          ['linear'],
          ['to-number', ['get', enc.attribute]],
          df[0],
          palette[0],
          df[1],
          palette[palette.length - 1],
        ];
      }
      paint = { 'fill-color': fillColor, 'fill-opacity': 0.55, 'fill-outline-color': '#ffffff' };
    } else if (type === 'line') {
      paint = { 'line-color': accent, 'line-width': 2.5 };
    } else if (type === 'heatmap') {
      paint = { 'heatmap-radius': 24, 'heatmap-opacity': 0.85 };
    }

    return {
      id: b.id,
      type: type,
      source: b.dataSourceId,
      paint: paint,
      layout: { visibility: 'none' },
    };
  }

  // tiny "attr OP value" filter parser -> MapLibre expression
  function parseFilter(expr) {
    if (!expr) return null;
    var m = String(expr).match(/^\s*([A-Za-z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/);
    if (!m) return null;
    var get = ['get', m[1]];
    var raw = m[3].trim().replace(/^['"]|['"]$/g, '');
    var val = isNaN(Number(raw)) ? raw : Number(raw);
    switch (m[2]) {
      case '==':
        return ['==', get, val];
      case '!=':
        return ['!=', get, val];
      case '>':
        return ['>', ['to-number', get], val];
      case '<':
        return ['<', ['to-number', get], val];
      case '>=':
        return ['>=', ['to-number', get], val];
      case '<=':
        return ['<=', ['to-number', get], val];
    }
    return null;
  }

  // ------------------------------------------------------------------- map
  var sources = {};
  (narrative.dataSources || []).forEach(function (ds) {
    sources[ds.id] = {
      type: 'geojson',
      data: data[ds.id] || { type: 'FeatureCollection', features: [] },
    };
  });
  if (localContextMap) {
    sources.__mb_context_land = { type: 'geojson', data: localContextMap.land };
    sources.__mb_context_streets = { type: 'geojson', data: localContextMap.streets };
  }

  var baseLayers = [
    {
      id: '__background',
      type: 'background',
      paint: { 'background-color': localContextMap ? '#dce9e8' : '#e9e6df' },
    },
  ];
  if (localContextMap) {
    baseLayers.push(
      {
        id: '__mb_context_land',
        type: 'fill',
        source: '__mb_context_land',
        paint: { 'fill-color': '#f1eee6', 'fill-antialias': false },
      },
      {
        id: '__mb_context_local_streets',
        type: 'line',
        source: '__mb_context_streets',
        minzoom: 14,
        filter: [
          'any',
          ['==', ['get', 'classcode'], '0'],
          ['==', ['get', 'classcode'], '5'],
          ['==', ['get', 'classcode'], '6'],
        ],
        paint: { 'line-color': '#c9d0c9', 'line-width': 1 },
      },
      {
        id: '__mb_context_major_streets',
        type: 'line',
        source: '__mb_context_streets',
        filter: [
          'all',
          ['>=', ['to-number', ['get', 'classcode']], 1],
          ['<=', ['to-number', ['get', 'classcode']], 4],
        ],
        paint: { 'line-color': '#aebdb5', 'line-width': 1.5 },
      },
    );
  }

  var style = {
    version: 8,
    sources: sources,
    layers: baseLayers,
  };

  var first = scenes[0] || { camera: { center: [0, 0], zoom: 1 } };
  var map = new maplibregl.Map({
    container: 'map',
    style: style,
    center: first.camera.center,
    zoom: first.camera.zoom,
    bearing: first.camera.bearing || 0,
    pitch: first.camera.pitch || 0,
    attributionControl: false,
  });
  // The page's wheel gesture advances the story. Map zoom remains available
  // through the navigation control without trapping scroll over the canvas.
  map.scrollZoom.disable();
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

  if (localContextMap) {
    var credit = document.getElementById('map-credit');
    if (credit) {
      credit.textContent = localContextMap.attribution;
      credit.hidden = false;
    }
  }

  var allLayerIds = [];
  var markers = [];

  function clearMarkers() {
    markers.forEach(function (m) {
      m.remove();
    });
    markers = [];
  }

  // ------------------------------------------------------------- controls
  function applyControl(c, value) {
    var layerId = c.bindsTo.layerId;
    var prop = c.bindsTo.property;
    if (!map.getLayer(layerId)) return;
    try {
      if (c.kind === 'toggle') {
        map.setLayoutProperty(layerId, 'visibility', value ? 'visible' : 'none');
      } else if (c.kind === 'slider') {
        map.setPaintProperty(layerId, prop, Number(value));
      } else {
        map.setPaintProperty(layerId, prop, value);
      }
    } catch (e) {
      console.warn('[mapbard] control failed', c.id, e);
    }
  }

  function renderControls(scene) {
    var host = document.getElementById('controls');
    host.innerHTML = '';
    var controls = scene.controls || [];
    if (!controls.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    var title = document.createElement('div');
    title.className = 'mb-controls-title';
    title.textContent = 'Explore';
    host.appendChild(title);

    controls.forEach(function (c) {
      var wrap = document.createElement('label');
      wrap.className = 'mb-control';
      var lab = document.createElement('span');
      lab.className = 'mb-control-label';
      lab.textContent = c.label;
      wrap.appendChild(lab);

      var input;
      if (c.kind === 'slider') {
        input = document.createElement('input');
        input.type = 'range';
        var r = c.range || [0, 100];
        input.min = r[0];
        input.max = r[1];
        input.step = r[1] - r[0] > 20 ? 1 : 0.1;
        input.value = c.default != null ? c.default : (r[0] + r[1]) / 2;
        input.addEventListener('input', function () {
          applyControl(c, input.value);
        });
      } else if (c.kind === 'toggle') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = c.default !== false;
        input.addEventListener('change', function () {
          applyControl(c, input.checked);
        });
      } else if (c.kind === 'colorpicker') {
        input = document.createElement('input');
        input.type = 'color';
        input.value = c.default || accent;
        input.addEventListener('input', function () {
          applyControl(c, input.value);
        });
      } else if (c.kind === 'select') {
        input = document.createElement('select');
        (c.options || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          if (o === c.default) opt.selected = true;
          input.appendChild(opt);
        });
        input.addEventListener('change', function () {
          applyControl(c, input.value);
        });
      }
      if (input) {
        input.className = 'mb-control-input';
        wrap.appendChild(input);
        host.appendChild(wrap);
      }
    });
  }

  // ---------------------------------------------------------------- scenes
  var currentIndex = -1;

  function goToScene(i, immediate) {
    var scene = scenes[i];
    if (!scene) return;
    currentIndex = i;

    var cam = scene.camera || {};
    var opts = {
      center: cam.center,
      zoom: cam.zoom,
      bearing: cam.bearing || 0,
      pitch: cam.pitch || 0,
    };
    var t = scene.transitionIn || 'ease';
    if (immediate || t === 'cut') map.jumpTo(opts);
    else if (t === 'fly') map.flyTo(opts);
    else map.easeTo(opts);

    var visible = {};
    (scene.layers || []).forEach(function (l) {
      visible[l.id] = true;
    });
    allLayerIds.forEach(function (id) {
      if (map.getLayer(id))
        map.setLayoutProperty(id, 'visibility', visible[id] ? 'visible' : 'none');
    });

    var sections = document.querySelectorAll('.scene');
    for (var s = 0; s < sections.length; s++) {
      sections[s].classList.toggle('is-active', s === i);
    }

    clearMarkers();
    (scene.mediaAnchors || []).forEach(function (an) {
      var asset = assetById(an.assetId);
      if (!asset) return;
      var at = an.at || asset.location;
      if (!at) return;
      var el = document.createElement('div');
      el.className = 'mb-marker' + (asset.kind === 'video' ? ' is-video' : '');
      el.setAttribute('title', an.label || asset.name || '');
      var popup = new maplibregl.Popup({
        offset: 16,
        maxWidth: '320px',
        className: 'mb-popup',
      }).setHTML(
        (an.label ? '<strong class="mb-popup-title">' + esc(an.label) + '</strong>' : '') +
          mediaTag(asset, asset.caption),
      );
      var marker = new maplibregl.Marker({ element: el }).setLngLat(at).setPopup(popup).addTo(map);
      if ((an.trigger || 'marker') === 'auto') marker.togglePopup();
      markers.push(marker);
    });

    renderControls(scene);
  }

  map.on('load', function () {
    var seen = {};
    scenes.forEach(function (sc) {
      (sc.layers || []).forEach(function (b) {
        if (seen[b.id]) return;
        seen[b.id] = true;
        try {
          map.addLayer(buildLayer(b));
          allLayerIds.push(b.id);
          var f = parseFilter(b.filter);
          if (f) map.setFilter(b.id, f);
        } catch (e) {
          console.warn('[mapbard] layer failed', b.id, e);
        }
      });
    });

    var scroller = scrollama();
    scroller.setup({ step: '.scene', offset: 0.55 }).onStepEnter(function (resp) {
      if (resp.index !== currentIndex) goToScene(resp.index, false);
    });
    window.addEventListener('resize', scroller.resize);

    goToScene(0, true);
  });

  // expose for debugging / future controls
  window.MapBard = { map: map, goToScene: goToScene };
})();
