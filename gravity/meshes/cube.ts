export interface MeshLayout {
  vertexStride: number;    // Byte size of one vertex.
  positionsOffset: number;
  colorOffset: number;
  uvOffset: number;
}

export interface CubeMesh {
  vertices: Float32Array;
  indices: Uint16Array;
  layout: MeshLayout;
}

export function createCubeMesh(): CubeMesh {
  // prettier-ignore
  const vertices = new Float32Array([
    // float4 position, float4 color, float2 uv,
    -1, -1, -1, 1, 0, 0, 0, 1, 1, 0,  // 0
    -1, -1,  1, 1, 0, 0, 1, 1, 1, 1,  // 1
    -1,  1, -1, 1, 0, 1, 0, 1, 0, 0,  // 2
    -1,  1,  1, 1, 0, 1, 1, 1, 0, 1,  // 3
     1, -1, -1, 1, 1, 0, 0, 1, 0, 0,  // 4
     1, -1,  1, 1, 1, 0, 1, 1, 0, 1,  // 5
     1,  1, -1, 1, 1, 1, 0, 1, 0, 0,  // 6
     1,  1,  1, 1, 1, 1, 1, 1, 0, 1,  // 7
  ]);

  const indices = new Uint16Array([
    5, 1, 0, 4, 5, 0,
    7, 5, 4, 6, 7, 4,
    3, 7, 6, 2, 3, 6,
    1, 3, 2, 0, 1, 2,
    7, 3, 1, 1, 5, 7,
    4, 0, 2, 6, 4, 2,
  ]);

  const layout: MeshLayout = {
    vertexStride: 4 * 10, // Byte size of one cube vertex.
    positionsOffset: 0 * 4,
    colorOffset: 4 * 4,   // Byte offset of cube vertex color attribute.
    uvOffset: 4 * 8,
  };
  
  return {
    vertices,
    indices,
    layout
  };
}
