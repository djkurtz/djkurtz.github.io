enable subgroups;
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

// Use vec4 for all to ensure 16-byte alignment and ease of subgroup ops
struct ReductionResult {
  wpos_mass: vec4f, // xyz: wpos, w: mass
  am_ke:     vec4f, // xyz: am,   w: ke
  min_pe:    vec4f, // xyz: min,  w: pe
  max_re:    vec4f, // xyz: max,  w: re
  vari:      vec4f  // xyz: vari
};

fn result_init() -> ReductionResult
{
  var result: ReductionResult;
  // Use a very large number for infinity as WGSL literals
  // that evaluate to true infinity can throw errors.
  let INF = 1e30;

  result.wpos_mass = vec4f(0.0);
  result.am_ke     = vec4f(0.0);
  result.min_pe    = vec4f(vec3f(INF), 0.0);
  result.max_re    = vec4f(vec3f(-INF), 0.0);
  result.vari      = vec4f(0.0);
  return result;
}

fn result_reduce(a: ReductionResult, b: ReductionResult) -> ReductionResult {
  var res: ReductionResult;

  // Summation fields (all .w components and full vari/wpos vectors)
  res.wpos_mass = a.wpos_mass + b.wpos_mass;
  res.am_ke     = a.am_ke + b.am_ke;
  res.vari      = a.vari + b.vari;

  // Potential and Rotational energy are also sums (stored in .w)
  let sum_pe = a.min_pe.w + b.min_pe.w;
  let sum_re = a.max_re.w + b.max_re.w;

  // AABB Min/Max (stored in .xyz)
  res.min_pe = vec4f(min(a.min_pe.xyz, b.min_pe.xyz), sum_pe);
  res.max_re = vec4f(max(a.max_re.xyz, b.max_re.xyz), sum_re);

  return res;
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;
//@group(0) @binding(2) var<storage, read_write> grid_entries: array<GridEntry>;
//@group(0) @binding(3) var<storage, read_write> cell_starts: array<u32>;
//@group(0) @binding(4) var<storage, read_write> cell_counts: array<atomic<u32>>;
//@group(0) @binding(5) var<storage, read_write> cell_track: array<atomic<u32>>;
//@group(0) @binding(6) var<storage, read_write> fine_data: array<CellData>;
//@group(0) @binding(7) var<storage, read_write> coarse_data: array<CellData>;
@group(0) @binding(8) var<storage, read_write> reduction_pass1: array<ReductionResult>;
@group(0) @binding(9) var<storage, read_write> reduction_final: ReductionResult;

// Use the packed ReductionResult from the previous step
var<workgroup> subgroup_results: array<ReductionResult, 32>; // Max subgroups in a 1024-thread WG

@compute @workgroup_size(workgroup_size)
fn pass1_main(
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) group_id: vec3<u32>,
  @builtin(num_workgroups) num_groups: vec3<u32>,
  @builtin(subgroup_id) sg_id: u32,
  @builtin(subgroup_invocation_id) sg_lane: u32,
  @builtin(subgroup_size) sg_size: u32 // Use the hardware-reported size
) {
  let n = arrayLength(&particles);

  // Pre-calculate cluster-wide constants
  let com = params.wpos / max(params.total_mass, 1e-6);
  let g_mass_factor = -0.5 * params.G * params.total_mass;

  // Grid-strided loop: Each thread processes several particles
  // This ensures every single particle in the array is processed
  // regardless of how many workgroups you dispatched.
  var local_sum = result_init();
  let total_threads = num_groups.x * workgroup_size;
  for (var idx = (group_id.x * workgroup_size + local_id.x); idx < n; idx += total_threads) {
    let p_res = calculate_physics(particles[idx].physics, com, g_mass_factor);
    local_sum = result_reduce(local_sum, p_res);
  }

  // 2. SUBGROUP REDUCTION (Intra-warp sum, no barriers!)
  var sg_res: ReductionResult;
  sg_res.wpos_mass = subgroupAdd(local_sum.wpos_mass);
  sg_res.am_ke     = subgroupAdd(local_sum.am_ke);
  sg_res.vari      = subgroupAdd(local_sum.vari);

  // Sum the energy scalars (the .w components)
  let sum_pe = subgroupAdd(local_sum.min_pe.w);
  let sum_re = subgroupAdd(local_sum.max_re.w);

  // AABB requires min/max intrinsics
  sg_res.min_pe = vec4f(subgroupMin(local_sum.min_pe.xyz), sum_pe);
  sg_res.max_re = vec4f(subgroupMax(local_sum.max_re.xyz), sum_re);

  // 3. BRIDGE TO WORKGROUP (One write per subgroup)
  if (sg_lane == 0u) {
    subgroup_results[sg_id] = sg_res;
  }
  workgroupBarrier(); // Only ONE barrier needed for the whole shader!

  // 4. FINAL WORKGROUP REDUCTION (Thread 0 reduces the few subgroup results)
  if (local_id.x == 0u) {
    var final_res = subgroup_results[0];
    let num_subgroups = workgroup_size / sg_size;

    for (var i = 1u; i < num_subgroups; i++) {
        final_res = result_reduce(final_res, subgroup_results[i]);
    }

    // Explicitly copy to reduction_pass1 buffer
    reduction_pass1[group_id.x] = final_res;
  }
}

// Pre-calculate constants outside the loop to save cycles
fn calculate_physics(p: ParticlePhysics, com: vec3f, g_total_mass: f32) -> ReductionResult {
  let pos = p.pos.xyz;
  let m   = p.pos.w;
  let v   = p.vel.xyz;
  let w   = p.ang_vel.xyz;
  let i   = p.ang_vel.w;

  var res: ReductionResult;

  // 1. Position & Mass: [pos.x*m, pos.y*m, pos.z*m, m]
  res.wpos_mass = vec4f(pos * m, m);

  // 2. Angular Momentum & Kinetic Energy: [am.x, am.y, am.z, ke]
  let ke = 0.5 * m * dot(v, v);
  res.am_ke = vec4f(i * w, ke);

  // 3. AABB Min & Potential Energy: [min.x, min.y, min.z, pe]
  // Softened: U = ( -0.5 * G * M_total ) * m / sqrt(r^2 + epsilon)
  let r_vec = pos - com;
  let dist_sq = dot(r_vec, r_vec);
  let softening = 0.01;
  let pe = (g_total_mass * m) / sqrt(dist_sq + softening);
  res.min_pe = vec4f(pos, pe);

  // 4. AABB Max & Rotational Energy: [max.x, max.y, max.z, re]
  let re = 0.5 * i * dot(w, w);
  res.max_re = vec4f(pos, re);

  // 5. Variance: [m*x^2, m*y^2, m*z^2, 0.0]
  res.vari = vec4f((pos * pos) * m, 0.0);

  return res;
}

@compute @workgroup_size(workgroup_size)
fn pass2_main(
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(subgroup_id) sg_id: u32,
  @builtin(subgroup_invocation_id) sg_lane: u32,
  @builtin(subgroup_size) sg_size: u32
) {
  let t_id = local_id.x;
  let num_elements = arrayLength(&reduction_pass1);

  // Cooperative Load: Every thread loads one intermediate result into shared memory.
  var local_sum = result_init();
  if (t_id < num_elements) {
    local_sum = reduction_pass1[t_id];
  }

  // Use the same subgroup reduction logic as Pass 1
  var sg_res: ReductionResult;
  sg_res.wpos_mass = subgroupAdd(local_sum.wpos_mass);
  sg_res.am_ke     = subgroupAdd(local_sum.am_ke);
  sg_res.vari      = subgroupAdd(local_sum.vari);

  let sum_pe = subgroupAdd(local_sum.min_pe.w);
  let sum_re = subgroupAdd(local_sum.max_re.w);

  sg_res.min_pe = vec4f(subgroupMin(local_sum.min_pe.xyz), sum_pe);
  sg_res.max_re = vec4f(subgroupMax(local_sum.max_re.xyz), sum_re);

  // 3. Store subgroup leader results into shared memory
  if (sg_lane == 0u) {
    subgroup_results[sg_id] = sg_res;
  }

  // Barrier is required here to ensure all subgroups have finished writing
  workgroupBarrier();

  // 4. Final aggregation by Thread 0
  if (t_id == 0u) {
    var final_res = subgroup_results[0];
    let num_subgroups = workgroup_size / sg_size;

    // Iteratively reduce the remaining handful of subgroup results
    for (var i = 1u; i < num_subgroups; i++) {
      final_res = result_reduce(final_res, subgroup_results[i]);
    }

    reduction_final = final_res;
  }
}
