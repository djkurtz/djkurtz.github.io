struct Params {
  // Physics Params
  G: f32, // Gravity constant
  dt: f32, // Delta time
  restitution: f32, // 1.0 = perfectly elastic, 0.0 = plastic

  // Global Stats
  total_mass: f32,
  wpos: vec3f,

  // Grid Params
  grid_res: u32,   // Number of cells per axis (e.g., 32)
  grid_min: vec3f,
  cell_size: f32,  // Width of one cell in world units
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<uniform> vp : mat4x4f; // View Projection Matrix
// Note: Vertex shader needs to explicitly remove the 'atomic' wrapper
@group(0) @binding(2) var<storage, read> cell_counts : array<u32>;

struct VertexOutput {
  @builtin(position) pos : vec4f,
  @location(0) is_active : f32,
}

@vertex
fn vs_main(@builtin(vertex_index) v_idx : u32) -> VertexOutput {
  let res = params.grid_res;
  let res_f = f32(res);
  let res_plus_1 = res + 1u;

  let segments_per_axis = res * res_plus_1 * res_plus_1;
  let vertices_per_axis = segments_per_axis * 2u;

  let axis = v_idx / vertices_per_axis;
  let segment_idx = (v_idx % vertices_per_axis) / 2u;
  let is_end = f32(v_idx % 2u);

  let track_idx = segment_idx / res;
  let segment_coord = f32(segment_idx % res);

  let a = f32(track_idx % res_plus_1);
  let b = f32(track_idx / res_plus_1);

  var local_pos: vec3f;
  var midpoint: vec3f;

  // We calculate the MIDPOINT of the segment to use for the 4-cell lookup.
  // This ensures both vertices of the line segment agree on which cells they bound.
  if (axis == 0u) {
    local_pos = vec3f(segment_coord + is_end, a, b);
    midpoint  = vec3f(segment_coord + 0.5, a, b);
  } else if (axis == 1u) {
    local_pos = vec3f(a, segment_coord + is_end, b);
    midpoint  = vec3f(a, segment_coord + 0.5, b);
  } else {
    local_pos = vec3f(a, b, segment_coord + is_end);
    midpoint  = vec3f(a, b, segment_coord + 0.5);
  }

  let world_pos = params.grid_min + local_pos * params.cell_size;
  let g = vec3i(floor(midpoint)); // Use midpoint for stable integer coords
  let ires = i32(res);

  var is_active = false;
  // Check the 4 cells that share this specific segment edge
  for (var da = -1; da <= 0; da++) {
    for (var db = -1; db <= 0; db++) {
      var neighbor: vec3i;
      if (axis == 0u) {      neighbor = g + vec3i(0, da, db); }
      else if (axis == 1u) { neighbor = g + vec3i(da, 0, db); }
      else {               neighbor = g + vec3i(da, db, 0); }

      if (all(neighbor >= vec3i(0)) && all(neighbor < vec3i(ires))) {
        let cell_id = u32(neighbor.x + (neighbor.y * ires) + (neighbor.z * ires * ires));
        if (cell_counts[cell_id] > 0u) {
          is_active = true;
          break; 
        }
      }
    }
  }

  var out: VertexOutput;
  out.pos = vp * vec4f(world_pos, 1.0);
  out.is_active = select(0.0, 1.0, is_active);
  return out;
}


@fragment
fn fs_main(in : VertexOutput) -> @location(0) vec4f {
  // Use lower alpha for the lattice to keep 100k particles visible
  let grey = vec4f(1.0, 1.0, 1.0, 0.1);
  let green = vec4f(0.0, 1.0, 0.4, 0.5);
  return select(grey, green, in.is_active > 0.0);
  //return mix(grey, green, in.is_active);
}
