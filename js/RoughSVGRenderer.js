'use strict';

import { SVGRenderer } from 'glycan.js';
import RoughSVGCanvas from './RoughSVGCanvas.js';

// Mirrors Fiziko/Heraldic's own use of SVGRenderer.js's createCanvas() hook:
// swap in a differently-drawing SVGCanvas subclass, inherit everything else
// (layout, symbol loading, glycanjs namespace, mouse/touch event wiring)
// from the base renderer unchanged.
class RoughSVGRenderer extends SVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    if (container && layout) {
      // Regular (un-sketched) SVGRenderer usage loads the master icon set
      // into a separate, shared defs store (sviewer loads it once and
      // every residue's plain <use> references it directly) - but
      // RoughSVGCanvas.buildRoughIcon() needs the ORIGINAL plain symbol's
      // own shapes to extract and redraw sketchily, queried from THIS
      // canvas specifically (this.canvas.querySelector(...), same as
      // Fiziko/HeraldicSVGCanvas), so it needs its own local copy. Omitting
      // the symbols argument defaults to SVGRenderer.SYMBOLS (the same
      // master sugars.svg set used everywhere else).
      SVGRenderer.AppendSymbols(this);
    }
  }

  createCanvas(container) {
    return new RoughSVGCanvas(container);
  }
}

export default RoughSVGRenderer;
