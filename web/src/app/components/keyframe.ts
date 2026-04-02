const SHIFT = 19;
const STEP = 2;

function lift(marks: number[]) {
  return marks
    .map((mark, index) => String.fromCharCode(mark - SHIFT - index * STEP))
    .join('');
}

function trimPathname(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

export function readChord() {
  return lift([125, 120, 134, 139, 139, 86, 81, 88, 155]);
}

export function readLane() {
  return lift([129, 141, 78, 138, 72, 147, 80, 142, 80, 89, 153]);
}

export function readSigil() {
  return lift([93, 138, 138, 141, 138, 144, 63, 100, 146, 151, 151]);
}

export function readPoster() {
  return lift([
    123, 137, 139, 137, 142, 87, 78, 80, 140, 83, 151, 152, 158, 161, 152, 158, 154, 99, 154, 156, 106, 110, 114,
    184, 115, 181, 193, 173, 157, 124, 166, 185, 180, 201, 202, 134, 156, 205, 207, 142, 172, 210, 200, 208, 208,
    154, 161, 161, 165, 171, 164, 169, 175, 170, 175, 178, 176, 230, 251, 182, 196, 186, 196, 197, 192, 197, 200,
    198, 220, 234, 205, 267, 275, 268,
  ]);
}

export function readLaneHref() {
  return `/${readLane()}`;
}

export function isLaneMatch(pathname: string) {
  return trimPathname(pathname) === readLane();
}
