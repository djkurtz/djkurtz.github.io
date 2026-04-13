override MAX_P: u32;

struct VP {
  matrix: mat4x4<f32>,
}

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

struct BucketConfig {
  bucket_id: u32,
  num_particles: u32,
}

@group(0) @binding(0) var<uniform> vp: VP;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read> visible_indices: array<u32>;
@group(1) @binding(0) var<uniform> config: BucketConfig;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

// Fast PRNG
fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }

// 3D Noise for "Rockiness"
fn noise(x: vec3f) -> f32 {
    let p = floor(x);
    let f = fract(x);
    let n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
}

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
    @location(0) mesh_pos: vec3f
) -> VertexOutput {
  let offset = config.bucket_id * config.num_particles;
  let particle_idx = visible_indices[offset + instance_index];
  let r = particles[particle_idx].render;

  // --- RANDOMIZATION ---
  // Seed noise with particle index + vertex position
  // We scale mesh_pos up to get "higher frequency" bumps
  let noise_val = noise(mesh_pos * 2.5 + f32(particle_idx));

  // Displace along normal (for a sphere, normal == mesh_pos)
  let bump_amount = 0.2; // 20% variation
  let displaced_mesh_pos = mesh_pos * (1.0 + noise_val * bump_amount);

  // --- TRANSFORMATION ---
  // In WGSL, mat4x3 * vec4 results in a vec3.
  // This performs (Rotation * pos) + Translation in a single hardware instruction.
  let worldPos = r.matrix * vec4f(displaced_mesh_pos, 1.0);

  var output: VertexOutput;
  output.position = vp.matrix * vec4f(worldPos, 1.0);

  // Shading using vertex ID for a low-poly faceted look
  let shade = f32(vertex_index % 3u) * 0.1;

  // r.color already contains the "glow" mixed in from the Compute Shader
  output.color = (0.7 + shade) * unpack4x8unorm(r.color);

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  // Add a slight rim light based on screen-space derivative
  // This makes the 'bumps' pop without needing real light vectors
  let delta = fwidth(input.position.z) * 10.0;
  let bump_highlight = clamp(delta, 0.0, 0.2);

  // Return final color (Glow/Flash is already part of input.color)
  return input.color + bump_highlight;
}
