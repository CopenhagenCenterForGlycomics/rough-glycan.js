'use strict';

import SVGCanvas from 'glycan.js/svgcanvas';
import rough from 'roughjs/bundled/rough.esm.js';
import extractShapes from './extractShapes.js';

const FILLSTYLE = 'hachure';
const STROKE_COLOR = '#111';

let nextId = 0;
const uniqueId = (prefix) => `${prefix}-${nextId++}`;

class RoughSVGCanvas extends SVGCanvas {
  constructor(container) {
    super(container);
    // Icon templates are built once per distinct symbol id and referenced
    // by every later use() of that same icon via plain <use> (same caching
    // idea as Fiziko's iconCache) - rebuilding the sketchy paths per
    // residue instance would be wasted work, and would also give every
    // instance of e.g. "gal" its own random seed, when sharing one is both
    // cheaper and more visually consistent.
    this.iconCache = new Map();
    this.iconDefs = this.createElement('defs');
    this.canvas.appendChild(this.iconDefs);
  }

  // Replaces a plain sugars.svg <symbol> reference with a hand-drawn
  // (roughjs) version, built once and cached. `rotation` (degrees, applied
  // by the caller via the eventual <use>'s own transform - see
  // SVGRenderer.renderIcon/setIconPosition) doesn't need handling here the
  // way Fiziko's hatch textures do: roughjs's sketchy fill/stroke has no
  // directional component, so the same built icon looks correct at any
  // rotation.
  use(ref, x, y, width, height, rotation = 0) {
    let templateId = this.iconCache.get(ref);
    if (templateId === undefined) {
      templateId = this.buildRoughIcon(ref);
      this.iconCache.set(ref, templateId);
    }
    if (!templateId) {
      // ref didn't resolve to a real <symbol> (bad/empty identifier) -
      // fall back to the plain, un-sketched <use> rather than throw.
      return super.use(ref, x, y, width, height, rotation);
    }
    return super.use(`#${templateId}`, x, y, width, height, rotation);
  }

  buildRoughIcon(ref) {
    const cleaned_ref = ref.replace(/\..*/, '');
    let symbol;
    try {
      symbol = this.canvas.querySelector(cleaned_ref);
    } catch (ex) {
      symbol = null;
    }
    if (!symbol) {
      return null;
    }

    const templateId = uniqueId('rough-icon');
    const template = this.createElement('symbol');
    template.setAttribute('id', templateId);
    template.setAttribute('viewBox', symbol.getAttribute('viewBox') || '0 0 100 100');
    this.iconDefs.appendChild(template);

    // roughjs's SVG generator reads ownerDocument off the <svg> it's given
    // to create its own elements - reuse this canvas's own root rather than
    // a throwaway one, so generated elements belong to the right document.
    const rc = rough.svg(this.canvas);

    for (const shape of extractShapes(symbol)) {
      if (shape.fill === 'none') {
        // Plain stroke-only decoration (e.g. Ser/Thr/Asn/Hyl's wavy
        // backbone line) - keep it a crisp line, not a sketchy fill; there's
        // nothing to hatch.
        const el = this.createElement('path');
        el.setAttribute('d', shape.d);
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', shape.stroke || STROKE_COLOR);
        template.appendChild(el);
        continue;
      }

      const options = {
        fill: shape.fill || '#000',
        stroke: shape.stroke || STROKE_COLOR,
        fillStyle: FILLSTYLE,
        fillWeight: 1.5,
        // Matches RoughCanvas.js's draw_path: an unfilled outline (e.g. the
        // d-/l- sugar letter paths) gets a lighter roughness than a filled
        // shape, which reads better sketched more heavily.
        roughness: shape.fill ? 2 : 0.5,
      };

      const g = shape.r !== undefined
        ? rc.circle(shape.cx, shape.cy, 2 * shape.r, options)
        : rc.path(shape.d, options);

      template.appendChild(g);
    }

    return templateId;
  }
}

export default RoughSVGCanvas;
