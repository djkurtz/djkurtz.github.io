struct Uniforms {
  modelViewProjectionMatrix : array<mat4x4f, 16>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragPosition: vec4f,
}

@vertex
fn main(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4f
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix[instanceIdx] * position;
  output.fragPosition = 0.5 * (position + vec4(1.0));
  return output;
}
