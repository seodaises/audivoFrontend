import { useState, useEffect } from 'react';
import { getCoverAccentColor } from '../../utils/coverColor';

// Best-effort accent color pulled from a cover image, or null while it's
// resolving / if extraction wasn't possible (see utils/coverColor.js for
// why — mainly cross-origin covers whose host blocks canvas reads). Callers
// MUST have a static fallback for the null case; this is never guaranteed
// to resolve to a color.
export function useCoverAccentColor(imageUrl) {
  const [color, setColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) { setColor(null); return undefined; }
    let cancelled = false;
    setColor(null); // a new image is loading — drop any stale color from the last one
    getCoverAccentColor(imageUrl).then((c) => {
      if (!cancelled) setColor(c);
    });
    return () => { cancelled = true; };
  }, [imageUrl]);

  return color;
}