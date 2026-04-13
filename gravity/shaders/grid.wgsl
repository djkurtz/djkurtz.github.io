override workgroup_size: u32 = 256u;

struct ParticlePhysics {
  pos: vec4<f32>,   // xyz: position, w: mass
  vel: vec4<f32>,   // xyz: velocity, w: radius
  accel: vec4<f32>, // xyz: acceleration, w: flash_timer

  quat: vec4<f32>,   // xyzw: orientation quaternion
  ang_vel: vec4<f32>,// xyz: angular velocity, w: moment of inertia (I)

  color: u32,        // [r, g, b, a]
                     // 12-byte Implicit pad
}

struct ParticleRender {
  matrix: mat4x3f,  // 64 bytes
  color: u32,       // 4 bytes (Glow-Adjusted)
                    // 12-byte Implicit pad
}

struct Particle {
  physics: ParticlePhysics,
  render: ParticleRender,
}

struct GridEntry {
  cell_id: u32,
  particle_id: u32,
}

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

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<storage, read_write> grid_entries: array<GridEntry>;
@group(0) @binding(3) var<storage, read_write> cell_starts: array<u32>;
@group(0) @binding(4) var<storage, read_write> cell_counts: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> cell_track: array<atomic<u32>>;
//@group(0) @binding(6) var<storage, read_write> fine_data: array<CellData>;
//@group(0) @binding(7) var<storage, read_write> coarse_data: array<CellData>;
//@group(0) @binding(8) var<storage, read_write> reduction_pass1: array<ReductionResult>;
//@group(0) @binding(9) var<storage, read_write> reduction_final: ReductionResult;

fn get_cell_id(pos: vec3f) -> u32 {
  let g = (pos - params.grid_min) / params.cell_size;
  let grid_pos = vec3u(clamp(vec3i(g), vec3i(0), vec3i(i32(params.grid_res) - 1)));
  return grid_pos.x + (grid_pos.y * params.grid_res) + (grid_pos.z * params.grid_res * params.grid_res);
}

// --- STEP 1: COUNT ---
@compute @workgroup_size(256)
fn count_cells(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }
  let cell_id = get_cell_id(particles[id.x].physics.pos.xyz);
  atomicAdd(&cell_counts[cell_id], 1u);
}

// --- STEP 2: SCAN (Single-pass for 4096 cells) ---
var<workgroup> temp: array<u32, 4096>;

@compute @workgroup_size(256)
fn scan_cells(@builtin(local_invocation_id) li: vec3u) {
  let thread_id = li.x;
  let items_per_thread = 16u;

  // Each thread loads 16 elements (256 * 16 = 4096)
  for (var i = 0u; i < items_per_thread; i++) {
    let idx = thread_id * items_per_thread + i;
    temp[idx] = atomicLoad(&cell_counts[idx]);
  }
  workgroupBarrier();

  // Intra-thread Local Scan (Sequential)
  // This turns each block of 16 into a local prefix sum
  for (var i = 1u; i < items_per_thread; i++) {
    let idx = thread_id * items_per_thread + i;
    temp[idx] += temp[idx - 1u];
  }
  workgroupBarrier();

  // Parallel Scan across the 256 thread-blocks
  // Using Hillis-Steele logic on the tail-end of each block
  for (var stride = 1u; stride < 256u; stride <<= 1u) {
    // Capture the value to add from the block 'stride' steps behind
    var val_to_add = 0u;
    if (thread_id >= stride) {
      val_to_add = temp[thread_id * items_per_thread - 1u];
    }
    workgroupBarrier();

    // Apply the value to every element in the current thread's block
    if (thread_id >= stride) {
      for (var i = 0u; i < items_per_thread; i++) {
        temp[thread_id * items_per_thread + i] += val_to_add;
      }
    }
    workgroupBarrier();
  }

  // Convert Inclusive to Exclusive and Write to Global
  // Exclusive scan: element[i] = sum(0 ... i-1)
  for (var i = 0u; i < items_per_thread; i++) {
    let idx = thread_id * items_per_thread + i;
    var val = 0u;
    if (idx > 0u) {
      val = temp[idx - 1u];
    }
    cell_starts[idx] = val;
  }
}

// --- STEP 3: SCATTER ---
@compute @workgroup_size(256)
fn scatter_particles(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }
  let cell_id = get_cell_id(particles[id.x].physics.pos.xyz);
  let local_offset = atomicAdd(&cell_track[cell_id], 1u);
  let global_idx = cell_starts[cell_id] + local_offset;
  grid_entries[global_idx] = GridEntry(cell_id, id.x);
}
