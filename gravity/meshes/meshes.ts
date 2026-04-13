import { vec3 } from 'wgpu-matrix';

export interface Mesh {
  vertices: Float32Array;
  indices: Uint16Array;
}

export function createCubeMesh(): Mesh {
  // prettier-ignore
  const vertices = new Float32Array([
    // float4 position
    -1, -1, -1,  // 0
    -1, -1,  1,  // 1
    -1,  1, -1,  // 2
    -1,  1,  1,  // 3
     1, -1, -1,  // 4
     1, -1,  1,  // 5
     1,  1, -1,  // 6
     1,  1,  1,  // 7
  ]);

  const indices = new Uint16Array([
    5, 1, 0, 4, 5, 0,
    7, 5, 4, 6, 7, 4,
    3, 7, 6, 2, 3, 6,
    1, 3, 2, 0, 1, 2,
    7, 3, 1, 1, 5, 7,
    4, 0, 2, 6, 4, 2,
  ]);

  return {
    vertices,
    indices,
  };
}

// Borrowed and simplified from https://github.com/mrdoob/three.js/blob/master/src/geometries/SphereGeometry.js
export function createSphereMesh(
  radius: number,
  widthSegments = 32,
  heightSegments = 16,
  randomness = 0
): Mesh {
  const vertices = [];
  const indices = [];

  widthSegments = Math.max(3, Math.floor(widthSegments));
  heightSegments = Math.max(2, Math.floor(heightSegments));

  const firstVertex = vec3.create();
  const vertex = vec3.create();
  const normal = vec3.create();

  let index = 0;
  const grid = [];

  // generate vertices, normals and uvs
  for (let iy = 0; iy <= heightSegments; iy++) {
    const verticesRow = [];
    const v = iy / heightSegments;

    // special case for the poles
    let uOffset = 0;
    if (iy === 0) {
      uOffset = 0.5 / widthSegments;
    } else if (iy === heightSegments) {
      uOffset = -0.5 / widthSegments;
    }

    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments;

      // Poles should just use the same position all the way around.
      if (ix == widthSegments) {
        vec3.copy(firstVertex, vertex);
      } else if (ix == 0 || (iy != 0 && iy !== heightSegments)) {
        const rr = radius + (Math.random() - 0.5) * 2 * randomness * radius;

        // vertex
        vertex[0] = -rr * Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);
        vertex[1] = rr * Math.cos(v * Math.PI);
        vertex[2] = rr * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);

        if (ix == 0) {
          vec3.copy(vertex, firstVertex);
        }
      }

      vertices.push(...vertex);

      verticesRow.push(index++);
    }

    grid.push(verticesRow);
  }

  // indices
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = grid[iy][ix + 1];
      const b = grid[iy][ix];
      const c = grid[iy + 1][ix];
      const d = grid[iy + 1][ix + 1];

      if (iy !== 0) indices.push(a, b, d);
      if (iy !== heightSegments - 1) indices.push(b, c, d);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}

export function createIcosahedronMesh(radius: number): Mesh {
  const t = (1.0 + Math.sqrt(5.0)) / 2.0;

  // The 12 vertices of a regular icosahedron
  const rawVertices = [
    -1,  t,  0,    1,  t,  0,   -1, -t,  0,    1, -t,  0,
     0, -1,  t,    0,  1,  t,    0, -1, -t,    0,  1, -t,
     t,  0, -1,    t,  0,  1,   -t,  0, -1,   -t,  0,  1
  ];

  // Normalize and scale to radius
  const vertices = new Float32Array(rawVertices.length);
  for (let i = 0; i < rawVertices.length; i += 3) {
    const x = rawVertices[i];
    const y = rawVertices[i + 1];
    const z = rawVertices[i + 2];
    const mag = Math.sqrt(x * x + y * y + z * z);
    vertices[i] = (x / mag) * radius;
    vertices[i + 1] = (y / mag) * radius;
    vertices[i + 2] = (z / mag) * radius;
  }

  // The 20 triangular faces
  const indices = new Uint16Array([
    0, 11, 5,    0, 5, 1,     0, 1, 7,     0, 7, 10,    0, 10, 11,
    1, 5, 9,     5, 11, 4,    11, 10, 2,   10, 7, 6,    7, 1, 8,
    3, 9, 4,     3, 4, 2,     3, 2, 6,     3, 6, 8,     3, 8, 9,
    4, 9, 5,     2, 4, 11,    6, 2, 10,    8, 6, 7,     9, 8, 1
  ]);

  return { vertices, indices };
}

export function createIcosphereMesh(
  radius: number,
  subdivisions: number = 2,
  bumpiness: number = 0.1
): Mesh{
  const t = (1 + Math.sqrt(5)) / 2;
  let vertices: number[] = [
    -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,  0,
     0, -1,  t,  0,  1,  t,  0, -1, -t,  0,  1, -t,
     t,  0, -1,  t,  0,  1, -t,  0, -1, -t,  0,  1
  ];
  let indices: number[] = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
    1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
    4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
  ];

  const lookup = new Map<string, number>();

  // Helper to get or create middle vertex between two points
  const getMiddlePoint = (p1: number, p2: number) => {
    const key = p1 < p2 ? `${p1}_${p2}` : `${p2}_${p1}`;
    if (lookup.has(key)) return lookup.get(key)!;

    const i1 = p1 * 3, i2 = p2 * 3;
    vertices.push((vertices[i1] + vertices[i2]) / 2);
    vertices.push((vertices[i1+1] + vertices[i2+1]) / 2);
    vertices.push((vertices[i1+2] + vertices[i2+2]) / 2);

    const newIdx = (vertices.length / 3) - 1;
    lookup.set(key, newIdx);
    return newIdx;
  };

  // Subdivide
  for (let i = 0; i < subdivisions; i++) {
    const newIndices: number[] = [];
    for (let j = 0; j < indices.length; j += 3) {
      const a = indices[j], b = indices[j+1], c = indices[j+2];
      const ab = getMiddlePoint(a, b);
      const bc = getMiddlePoint(b, c);
      const ca = getMiddlePoint(c, a);
      newIndices.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    indices = newIndices;
  }

  // Normalize, scale, and add "Bumpiness"
  const finalVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 3) {
    let x = vertices[i], y = vertices[i+1], z = vertices[i+2];
    const length = Math.sqrt(x*x + y*y + z*z);

    // Create a deterministic "random" offset based on position
    const seed = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const noise = (seed - Math.floor(seed)) * bumpiness;

    const scale = (radius / length) * (1 + noise);
    finalVertices[i] = x * scale;
    finalVertices[i+1] = y * scale;
    finalVertices[i+2] = z * scale;
  }

  return { vertices: finalVertices, indices: new Uint16Array(indices) };
}
