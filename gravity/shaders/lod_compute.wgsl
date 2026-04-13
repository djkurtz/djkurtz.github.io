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

struct DrawIndirectArgs {
  indexCount: u32,
  instanceCount: atomic<u32>,
  firstIndex: u32,
  baseVertex: i32,
  firstInstance: u32,
}

struct LODParams {
  vp_matrix: mat4x4f,
  camera_pos: vec3f,
  lod_quality_factor: f32,  // 4 bytes - 'scale' factor = screen_height * cot(fov/2)
  num_particles: u32,
  planes: array<vec4f, 6>,  // 6 Planes (Left, Right, Bottom, Top, Near, Far)
  // Each vec4 is [normal.x, normal.y, normal.z, constant_d]
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: LODParams;
@group(0) @binding(2) var<storage, read_write> lod_args: array<DrawIndirectArgs, 3>;
@group(0) @binding(3) var<storage, read_write> visible_indices: array<u32>;

// Shared memory for local counts within the workgroup
var<workgroup> local_counts: array<atomic<u32>, 3>;
var<workgroup> local_offsets: array<u32, 3>;

@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3u
) {
  let i = global_id.x;
  let li = local_id.x;

  // Initialize shared memory
  if (li < 3u) { atomicStore(&local_counts[li], 0u); }
  workgroupBarrier();

  var bucket: i32 = -1; // -1 means culled

  if (i < params.num_particles) {
    let p = particles[i].physics;
    let pos = p.pos.xyz;
    let safe_r = p.vel.w * 1.15;

    // 1. Frustum Culling
    var visible = true;
    for (var j = 0u; j < 6u; j++) {
      if (dot(params.planes[j].xyz, pos) + params.planes[j].w < -safe_r) {
        visible = false;
        break;
      }
    }

    if (visible) {
      // 2. LOD Logic
      let world_pos = vec4f(pos, 1.0);
      let clip_pos = params.vp_matrix * world_pos;
      let dist = max(clip_pos.w, 0.001);
      let apparent_size = (safe_r / dist) * params.lod_quality_factor;

      if (apparent_size >= 0.1) {
        if (apparent_size > 20.0) { bucket = 0; }     // Near (Ultra Detail)
        else if (apparent_size > 5.0) { bucket = 1; } // Mid (High Detail)
        else { bucket = 2; }                          // Far (Low Detail)
      }
    }
  }

  // 3. Workgroup Aggregation (The Performance Booster)
  var local_slot: u32 = 0u;
  if (bucket >= 0) {
    // Increment shared memory instead of global (order of magnitude faster)
    local_slot = atomicAdd(&local_counts[u32(bucket)], 1u);
  }
  workgroupBarrier();

  // 4. Global Sync (Only 3 threads per workgroup touch global memory)
  if (li < 3u) {
    let count = atomicLoad(&local_counts[li]);
    if (count > 0u) {
      local_offsets[li] = atomicAdd(&lod_args[li].instanceCount, count);
    }
  }
  workgroupBarrier();

  // 5. Write Indices (Coalesced write)
  if (bucket >= 0) {
    let global_slot = local_offsets[u32(bucket)] + local_slot;
    let buffer_offset = u32(bucket) * params.num_particles;
    visible_indices[buffer_offset + global_slot] = i;
  }
}
