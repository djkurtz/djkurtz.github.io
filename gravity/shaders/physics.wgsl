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

struct GridEntry {
  cell_id: u32,
  particle_id: u32,
}

struct CellData {
    com: vec3f,
    mass: f32,
}

// Get the 3D integer coordinates of a world position
fn get_grid_pos(pos: vec3f) -> vec3i {
  return vec3i(floor((pos - params.grid_min) / params.cell_size));
}

// Fixed helper: Get the 1D index from integer coordinates
fn grid_to_idx_safe(g: vec3i) -> u32 {
  let res = i32(params.grid_res);
  // Boundary check: if outside, return a specific "null" value
  if (any(g < vec3i(0)) || any(g >= vec3i(res))) {
    return 0xFFFFFFFFu;
  }
  return u32(g.x + (g.y * res) + (g.z * res * res));
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<storage, read_write> grid_entries: array<GridEntry>;
@group(0) @binding(3) var<storage, read_write> cell_starts: array<u32>;
@group(0) @binding(4) var<storage, read_write> cell_counts: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read_write> cell_track: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> fine_data: array<CellData>;
@group(0) @binding(7) var<storage, read_write> coarse_data: array<CellData>;
//@group(0) @binding(8) var<storage, read_write> reduction_pass1: array<ReductionResult>;
//@group(0) @binding(9) var<storage, read_write> reduction_final: ReductionResult;


// --- PASS A: Steps 1 & 2 (Position Update & Velocity Half-Step) ---
// This pass does NOT need barriers as it doesn't use shared memory.
@compute @workgroup_size(workgroup_size)
fn step1_2(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let i = global_id.x;
  let n = arrayLength(&particles);

  if (i >= n) { return; }

  let dt = params.dt;
  var p = particles[i].physics;

  // Step 1: x(t+dt) = x(t) + v(t)dt + 0.5 * a(t)dt^2
  p.pos = vec4<f32>(p.pos.xyz + p.vel.xyz * dt + 0.5 * p.accel.xyz * dt * dt, p.pos.w);

  // Step 2: v(t+0.5dt) = v(t) + 0.5 * a(t)dt
  p.vel = vec4<f32>(p.vel.xyz + 0.5 * p.accel.xyz * dt, p.vel.w);

  // Rotation integration
  let q = p.quat;
  let w = p.ang_vel.xyz;

  // dq = 0.5 * (ang_vel) * q * dt
  let dq = 0.5 * vec4<f32>(
     w.x * q.w + w.y * q.z - w.z * q.y,
     w.y * q.w + w.z * q.x - w.x * q.z,
     w.z * q.w + w.x * q.y - w.y * q.x,
    -w.x * q.x - w.y * q.y - w.z * q.z
  ) * dt;

  p.quat = normalize(q + dq);

  particles[i].physics = p;
}

// --- PASS B: Steps 3 & 4 (New Acceleration & Velocity Final-Step) --

@compute @workgroup_size(workgroup_size)
fn step3_4(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3u,
    @builtin(subgroup_id) sg_id: u32,
    @builtin(subgroup_invocation_id) lane_id: u32,
    @builtin(subgroup_size) sg_size: u32
) {
  let i = global_id.x;
  let n = arrayLength(&particles);

  // 1. Uniform-friendly Bounds Check
  // We keep going even if i >= n, but we 'mask' the results.
  let is_in_bounds = i < n;

  // 2. REUSE SPATIAL GRID FOR SHORT-RANGE GRAVITY
  // We fetch a 'dummy' particle if out of bounds to keep flow uniform
  var p = particles[select(0u, i, is_in_bounds)].physics;

  var new_accel = vec3<f32>(0.0);

  // --- 1. Longer-Range Gravity (Global Coarse Grid) ---
  // Only calculate if in bounds
  let coarse_accel = calculate_coarse_gravity(p);
  new_accel += select(vec3f(0.0), coarse_accel, is_in_bounds);

  // --- 2. Short-Range Gravity & Collisions (GRID ONLY) ---
  let grid_coord = get_grid_pos(p.pos.xyz);
  let home_cell = grid_to_idx_safe(grid_coord);

  // UNIFORM CALL: Every thread enters this function.
  // We pass 'is_in_bounds' and 'home_cell != 0xFFFFFFFFu' as a mask.
  let is_active_sim = is_in_bounds && (home_cell != 0xFFFFFFFFu);

  new_accel += calculate_short_range_physics(&p, i, grid_coord, lane_id, is_active_sim);

  // --- 4. Update Velocity, Decay flash, Bake Matrix & Color ---
  // Only write to global memory if the thread is truly a particle
  if (is_in_bounds) {
    apply_physics_and_bake(&p, new_accel, i);
  }
}

// At 32^3, 4 tiles (128 particles) is the sweet spot for 100k.
const GRID_RES: u32 = 32u;
const MAX_CELL_TILES: u32 = 128u / GRID_RES; // 4u;

fn calculate_short_range_physics(
    p: ptr<function, ParticlePhysics>,
    i: u32, 
    grid_pos: vec3i, 
    lane_id: u32, 
    is_active_sim: bool
) -> vec3f {
  let p1_pos = (*p).pos.xyz;
  let p1_radius = (*p).vel.w;
  // Note: We moved divisions inside the narrow-phase to save registers

  var total_accel = vec3f(0.0);

  for (var z = -1; z <= 1; z++) {
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let neighbor_coord = grid_pos + vec3i(x, y, z);
        let cell_id = grid_to_idx_safe(neighbor_coord);
        let is_valid_cell = is_active_sim && (cell_id != 0xFFFFFFFFu);

        // Fetch counts for masking, but the LOOP itself must be CONSTANT
        let start = select(0u, cell_starts[select(0u, cell_id, is_valid_cell)], is_valid_cell);
        let count = select(0u, atomicLoad(&cell_counts[select(0u, cell_id, is_valid_cell)]), is_valid_cell);

        for (var tile = 0u; tile < MAX_CELL_TILES; tile++) {
          let t = tile * 32u; 

          var other_pos_rad = vec4f(0.0);
          var other_p_id = 0xFFFFFFFFu;

          // 1. Cooperative Load (Branching here is okay, it doesn't wrap a shuffle)
          if (is_valid_cell && (t + lane_id < count)) {
            let entry = grid_entries[start + t + lane_id];
            let other_p = particles[entry.particle_id].physics;
            other_pos_rad = vec4f(other_p.pos.xyz, other_p.vel.w);
            other_p_id = entry.particle_id;
          }

          // 2. The Purely Uniform Shuffle Loop
          // No 'if', no 'continue', no 'break'. Pure throughput.
          for (var j = 0u; j < 32u; j++) {
            let neighbor_id = subgroupShuffle(other_p_id, j);
            let n_pos_rad   = subgroupShuffle(other_pos_rad, j);

            // 3. Masking: Only do math if neighbor is valid and not self
            let is_valid_pair = (neighbor_id != 0xFFFFFFFFu) && (neighbor_id != i);

            let r = n_pos_rad.xyz - p1_pos;
            let distSq = dot(r, r) + 0.001;
            let radius_sum = p1_radius + n_pos_rad.w;

            // Short-range Gravity
            let invDist = inverseSqrt(distSq);
            let g_accel = r * (params.G * n_pos_rad.w * (invDist * invDist * invDist));
            total_accel += select(vec3f(0.0), g_accel, is_valid_pair);

            // Narrow-phase Collision
            if (is_valid_pair && distSq < radius_sum * radius_sum) {
                let p2 = particles[neighbor_id].physics;
                // Resolve collision now that we know we hit something
                resolve_collision(p, 1.0/max((*p).pos.w, 0.001), 1.0/max((*p).ang_vel.w, 0.001), p2, 1.0/max(p2.pos.w, 0.001), r, invDist);
            }
          }
        }
      }
    }
  }
  return total_accel;
}

fn calculate_coarse_gravity(p: ParticlePhysics) -> vec3f {
  let coarse_res = 8u;
  let total_coarse = coarse_res * coarse_res * coarse_res;

  // Calculate the skip distance based on the fine params resolution
  // If ratio is 4, then one coarse cell is 4 fine cells wide.
  let ratio = f32(params.grid_res / coarse_res);
  let skip_dist = params.cell_size * ratio;
  let skip_dist_sq = skip_dist * skip_dist;

  var new_accel = vec3f(0.0);

  // Loop through ALL 512 coarse cells
  for (var ci = 0u; ci < total_coarse; ci++) {
    let data = coarse_data[ci];
    if (data.mass <= 0.0) { continue; }

    let r_vec = data.com - p.pos.xyz;
    let d2 = dot(r_vec, r_vec);

    // Skip if the CoM is within the current particle's "Medium Range"
    // (Roughly 4-5 fine cell widths away)
    if (d2 < skip_dist_sq) { continue; }

    let invD = inverseSqrt(d2 + 1.0); // Heavy softener for global stability
    let invD3 = invD * invD * invD; // Heavy softener for global stability
    new_accel += r_vec * (params.G * data.mass * invD3);
  }

  return new_accel;
}

fn apply_physics_and_bake(p_ptr: ptr<function, ParticlePhysics>, new_accel: vec3f, i: u32) {
  // Velocity Final-Step
  let dt = params.dt;
  var p = *p_ptr;

  // Step 4: v(t+dt) = v(t+0.5dt) + 0.5 * a(t+dt)dt
  p.vel = vec4f(p.vel.xyz + 0.5 * new_accel * dt, p.vel.w);
  p.accel = vec4f(new_accel, p.accel.w);

  // Decay flash timer
  p.accel.w = max(0.0, p.accel.w - (params.dt * 5.0));

  // Bake Matrix (Scale -> Rotate -> Translate)
  let q = p.quat;
  let s = p.vel.w; // radius
  let t = p.pos.xyz; // translation

  let x2 = q.x + q.x; let y2 = q.y + q.y; let z2 = q.z + q.z;
  let xx = q.x * x2;  let xy = q.x * y2;  let xz = q.x * z2;
  let yy = q.y * y2;  let yz = q.y * z2;  let zz = q.z * z2;
  let wx = q.w * x2;  let wy = q.w * y2;  let wz = q.w * z2;

  var r_out: ParticleRender;

  r_out.matrix = mat4x3f(
      vec3f((1.0 - (yy + zz)) * s, (xy + wz) * s,         (xz - wy) * s         ), // Column 0
      vec3f((xy - wz) * s,         (1.0 - (xx + zz)) * s, (yz + wx) * s         ), // Column 1
      vec3f((xz + wy) * s,         (yz - wx) * s,         (1.0 - (xx + yy)) * s ), // Column 2
      vec3f(t.x,                   t.y,                   t.z                   )  // Column 3 (Translation)
  );

  // Bake Glow-Adjusted Color
  let base_color = unpack4x8unorm(p.color);
  let intensity = p.accel.w * p.accel.w; // Squared for more 'pop'
  let flash_color = mix(vec4f(1.0), vec4f(1.0, 0.4, 0.1, 1.0), intensity);
  let glow_color = mix(base_color, flash_color, intensity);
  r_out.color = pack4x8unorm(glow_color);

  // Final Write-backs
  particles[i].physics = p;
  particles[i].render = r_out;
}

fn resolve_collision(
  p1: ptr<function, ParticlePhysics>,
  p1_mass_inv: f32,
  p1_moi_inv: f32,
  p2: ParticlePhysics,
  p2_mass_inv: f32,
  rel_pos: vec3f,
  invDist: f32
) {
  let p1_radius = (*p1).vel.w;
  let p2_radius = p2.vel.w;
  let radius_sum = p1_radius + p2_radius;

  // 1. Early Exit (No branch divergence if most particles don't collide)
  if (invDist * radius_sum <= 1.0) { return; }

  let normal = rel_pos * invDist;

  // 3. Relative Velocity
  let v_rel = p2.vel.xyz - (*p1).vel.xyz;
  let vn = dot(v_rel, normal);

  // 2. The Boolean Mask: Only apply if they are moving TOWARDS each other (vn < 0)
  // select(false_val, true_val, condition)
  let is_colliding = f32(vn < 0.0);

  // 3. Unified Math (Always calculated, but masked by is_colliding)

  // --- Normal Impulse (The Bounce) ---
  // Effective mass for the normal impulse
  let k = 1.0 / (p1_mass_inv + p2_mass_inv);
  let j_normal = -(1.0 + params.restitution) * vn * k * is_colliding;
  let impulse = j_normal * normal;

  // --- Tangential Impulse from Friction (Simplified) ---
  let v_tangent = v_rel - (vn * normal);
  let vt_len = length(v_tangent);

  // Calculate max friction (Coulomb's Law: Friction <= Mu * NormalForce)
  // Use a select() to avoid branching for friction
  let friction_impulse = select(
      vec3f(0.0),
      (clamp(-vt_len * k, -0.3 * j_normal, 0.3 * j_normal)) * normalize(v_tangent),
      vt_len > 0.0001
  );

  let total_j = impulse + friction_impulse;

  // 4. Baumgarte Stabilization
  let dist = 1.0 / invDist;
  let penetration = radius_sum - dist;
  let percent = 0.2; // 20% to 80%
  let slop = 0.01;   // "Allow" this much penetration to prevent jitter
  let correction_mag = max(penetration - slop, 0.0) * percent * k * is_colliding;
  let pos_correction = normal * (correction_mag * p1_mass_inv);

  // 5. Final State Updates (Additive)
  // If is_colliding was 0, all these deltas are 0, making the update a no-op.
  (*p1).vel = vec4f((*p1).vel.xyz - (total_j * p1_mass_inv), (*p1).vel.w);

  // Lever arm (center to impact point)
  let r1 = normal * p1_radius; 
  let torque = cross(r1, -total_j);
  (*p1).ang_vel = vec4f((*p1).ang_vel.xyz + (torque * p1_moi_inv), (*p1).ang_vel.w);

  (*p1).pos = vec4f((*p1).pos.xyz - pos_correction, (*p1).pos.w);

  // Flash effect based on impulse
  // Map the impulse to a 0.0 -> 1.0 range.
  // Adjust 'sensitivity' (e.g., 5.0) to make flashes easier/harder to trigger.
  let sensitivity = 0.1;
  (*p1).accel.w = max((*p1).accel.w, clamp(j_normal * sensitivity, 0.0, 1.0));
}

@compute @workgroup_size(workgroup_size)
fn build_mass_map(@builtin(global_invocation_id) id: vec3u) {
  let cell_id = id.x;

  // Total fine cells = res * res * res
  let total_fine_cells = params.grid_res * params.grid_res * params.grid_res;
  if (cell_id >= total_fine_cells) { return; }

  // Use the new prefix-sum results
  let start = cell_starts[cell_id];
  let count = atomicLoad(&cell_counts[cell_id]);
  let end = start + count;

  var total_m = 0.0;
  var weighted_pos = vec3f(0.0);

  // Sum mass for all particles in this cell
  for (var k = start; k < end; k++) {
    let p = particles[grid_entries[k].particle_id].physics;
    let m = p.pos.w;
    total_m += m;
    weighted_pos += p.pos.xyz * m;
  }
  fine_data[cell_id].mass = total_m;
  fine_data[cell_id].com = select(
    vec3f(0.0),
    weighted_pos / max(total_m, 1e-6),
    total_m > 0.0);
}

@compute @workgroup_size(8, 8, 8) // One workgroup covers the whole coarse params
fn build_coarse_map(@builtin(global_invocation_id) id: vec3u) {
  // Assuming coarse resolution is 8x8x8
  let coarse_res = 8u;
  if (any(id >= vec3u(coarse_res))) { return; }

  // Calculate how many fine cells fit into one coarse cell (e.g., 32 / 8 = 4)
  let ratio = params.grid_res / coarse_res;

  var total_m = 0.0;
  var weighted_pos = vec3f(0.0);

  // Sum up a 4x4x4 block of fine cells
  for (var z = 0u; z < ratio; z++) {
    for (var y = 0u; y < ratio; y++) {
      for (var x = 0u; x < ratio; x++) {
        let fine_coords = id * ratio + vec3u(x, y, z);
        let fine_id = fine_coords.x +
            (fine_coords.y * params.grid_res) +
            (fine_coords.z * params.grid_res * params.grid_res);

        let data = fine_data[fine_id];
        total_m += data.mass;
        weighted_pos += data.com * data.mass;
      }
    }
  }

  let coarse_id = id.x + (id.y * coarse_res) + (id.z * coarse_res * coarse_res);
  coarse_data[coarse_id].mass = total_m;
  if (total_m > 0.0) {
    coarse_data[coarse_id].com = weighted_pos / total_m;
  }
}
