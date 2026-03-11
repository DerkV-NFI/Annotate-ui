export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  scale: number;
  offset: Point;
}

export interface Rect {
  width: number;
  height: number;
  left?: number;
  top?: number;
}

/**
 * Converts a screen coordinate (relative to the container) to the original image coordinate.
 */
export function screenToImageCoords(
  screenPoint: Point,
  transform: Transform,
  containerRect: Rect,
  imageNaturalSize: Rect
): Point {
  const left = containerRect.left ?? 0;
  const top = containerRect.top ?? 0;
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  // Subtract the container's top-left from the screen point to get relative point
  const relX = screenPoint.x - left;
  const relY = screenPoint.y - top;
  
  const imageX = (relX - transform.offset.x - centerX) / transform.scale + imageNaturalSize.width / 2;
  const imageY = (relY - transform.offset.y - centerY) / transform.scale + imageNaturalSize.height / 2;
  
  return { x: imageX, y: imageY };
}

/**
 * Converts an original image coordinate to a screen coordinate (relative to the container).
 */
export function imageToScreenCoords(
  imagePoint: Point,
  transform: Transform,
  containerRect: Rect,
  imageNaturalSize: Rect
): Point {
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  const screenX = (imagePoint.x - imageNaturalSize.width / 2) * transform.scale + centerX + transform.offset.x;
  const screenY = (imagePoint.y - imageNaturalSize.height / 2) * transform.scale + centerY + transform.offset.y;
  
  return { x: screenX, y: screenY };
}
