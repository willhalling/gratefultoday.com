/**
 * lib/renderer/wavy-album.ts — port of remotion/three/scenes/WavyAlbumScene.tsx
 * (the vinyl record's float/parallax artwork). Raw WebGL like the original
 * (no Three.js): same GLSL verbatim, same glow-pass order and blend modes,
 * same per-frame animation math (two-prime sines; seamlessLoop unused by
 * VinylLayout).
 *
 * Deferred: the beat-reactive forward burst (`spring()` from remotion on
 * detected beats). Vinyl fixtures run isPodcast (audioBeats/frequencyData
 * empty → beatT = 0), matching this port exactly; the beat-spring path for
 * non-podcast vinyl is documented in scripts/parity/README.md.
 */

const VS = /* glsl */ `
  attribute vec2 a_pos;
  varying vec2 vUv;

  uniform float uRotX;   // up/down tilt (radians)
  uniform float uRotY;   // left/right orbit (radians)
  uniform float uZ;      // z offset — negative = toward viewer = bigger
  uniform float uScale;  // 1.0 = main pass, >1.0 = glow expansion

  void main() {
    vUv = a_pos * 0.5 + 0.5;

    // Fill the container edge-to-edge; scale is used for glow layers.
    vec3 p = vec3(a_pos * uScale, 0.0);

    // Rotate around Y (left/right orbit)
    float cy = cos(uRotY), sy = sin(uRotY);
    p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

    // Rotate around X (up/down tilt)
    float cx = cos(uRotX), sx = sin(uRotX);
    p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);

    // Z float — negative moves plane closer to viewer
    p.z += uZ;

    // Perspective: set w so hardware divides give correct screen position
    float focal = 2.8;
    gl_Position = vec4(p.x * focal, p.y * focal, 0.0, focal + p.z);
  }
`;

const FS = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2      uImageRes;
  uniform vec2      uCanvasRes;
  uniform float     uRotX;
  uniform float     uRotY;
  // uMode: 0 = glow pass, 1 = main image pass
  uniform int       uMode;
  uniform vec3      uGlowColor;
  uniform float     uGlowAlpha;
  varying vec2      vUv;

  void main() {
    vec2 c = vUv * 2.0 - 1.0;

    if (uMode == 0) {
      // Glow pass: soft radial halo in the album's dominant colour.
      float dist = length(c);
      float a = (1.0 - smoothstep(0.45, 1.0, dist)) * uGlowAlpha;
      gl_FragColor = vec4(uGlowColor, a);
    } else {
      // Main pass: cover-fit + directional shading + edge vignette
      float imgAR    = uImageRes.x / uImageRes.y;
      float canvasAR = uCanvasRes.x / uCanvasRes.y;
      vec2 uv = vUv;
      if (imgAR > canvasAR) {
        float ratio = canvasAR / imgAR;
        uv.x = uv.x * ratio + (1.0 - ratio) * 0.5;
      } else {
        float ratio = imgAR / canvasAR;
        uv.y = uv.y * ratio + (1.0 - ratio) * 0.5;
      }
      vec4 col = texture2D(uTexture, uv);

      // Directional shading: dim the side tilting away from the key light
      float cy = cos(uRotY), sy = sin(uRotY);
      float cx = cos(uRotX), sx = sin(uRotX);
      vec3 normal   = normalize(vec3(sy, -sx * cy, cx * cy));
      vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
      float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
      float light   = 0.88 + 0.22 * diffuse;

      // Subtle vignette — darkens corners so the centre pops forward
      float vignette = 1.0 - smoothstep(0.6, 1.4, dot(c, c)) * 0.18;

      gl_FragColor = vec4(col.rgb * light * vignette, col.a);
    }
  }
`;

type Uniforms = Record<string, WebGLUniformLocation | null>;

function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  return prog;
}

export interface WavyAlbumFrameParams {
  frame: number;
  fps: number;
  frequencyData: ArrayLike<number>;
  audioBeats?: number[];
}

/**
 * One WavyAlbumScene instance: GL context on the given canvas, texture from
 * the preloaded image (loaded by the caller/session).
 */
export class WavyAlbumRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private uniforms: Uniforms | null = null;
  private texture: WebGLTexture | null = null;
  private imageRes: [number, number] = [1, 1];
  private dominantColor: [number, number, number] = [0.5, 0.5, 0.5];
  private ready = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly width: number,
    private readonly height: number,
  ) {}

  setImage(img: HTMLImageElement): void {
    const gl = this.canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    this.gl = gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.program = buildProgram(gl);
    gl.useProgram(this.program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      uRotX: gl.getUniformLocation(this.program, 'uRotX'),
      uRotY: gl.getUniformLocation(this.program, 'uRotY'),
      uZ: gl.getUniformLocation(this.program, 'uZ'),
      uScale: gl.getUniformLocation(this.program, 'uScale'),
      uTexture: gl.getUniformLocation(this.program, 'uTexture'),
      uImageRes: gl.getUniformLocation(this.program, 'uImageRes'),
      uCanvasRes: gl.getUniformLocation(this.program, 'uCanvasRes'),
      uMode: gl.getUniformLocation(this.program, 'uMode'),
      uGlowColor: gl.getUniformLocation(this.program, 'uGlowColor'),
      uGlowAlpha: gl.getUniformLocation(this.program, 'uGlowAlpha'),
    };

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texture = tex;
    this.imageRes = [img.naturalWidth || 1, img.naturalHeight || 1];

    // Dominant colour: 1×1 average, normalised to full brightness.
    try {
      const sc = document.createElement('canvas');
      sc.width = 1;
      sc.height = 1;
      const ctx2d = sc.getContext('2d');
      if (ctx2d) {
        ctx2d.drawImage(img, 0, 0, 1, 1);
        const d = ctx2d.getImageData(0, 0, 1, 1).data;
        const mx = Math.max(d[0], d[1], d[2], 1);
        this.dominantColor = [d[0] / mx, d[1] / mx, d[2] / mx];
      }
    } catch { /* keep default grey */ }

    this.ready = true;
  }

  /** Draw one frame (WavyAlbumScene.tsx:181–213 + the useLayoutEffect draw). */
  renderFrame(p: WavyAlbumFrameParams): void {
    const gl = this.gl;
    const U = this.uniforms;
    if (!gl || !U || !this.ready) return;

    const time = p.frame / p.fps;

    const bassRange = Math.max(1, Math.floor(p.frequencyData.length * 0.12));
    let bassSum = 0;
    for (let i = 0; i < bassRange; i++) bassSum += p.frequencyData[i] ?? 0;
    const bassAmp = bassSum / bassRange;

    // Beat spring deferred (see header): with no beats in range beatT = 0.
    const beatT = 0;

    const rotY = Math.sin(time * 0.35) * 0.055 + Math.sin(time * 0.13) * 0.018;
    const rotX = Math.sin(time * 0.28) * 0.022 + Math.sin(time * 0.19) * 0.010;
    const zOffset = Math.sin(time * 0.42) * 0.04 - bassAmp * 0.06;

    gl.useProgram(this.program);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniform1f(U.uRotX, rotX);
    gl.uniform1f(U.uRotY, rotY);
    gl.uniform1f(U.uZ, zOffset);
    gl.uniform1i(U.uTexture, 0);
    gl.uniform2f(U.uImageRes, this.imageRes[0], this.imageRes[1]);
    gl.uniform2f(U.uCanvasRes, this.width, this.height);

    // Glow passes (showGlow default true — VinylLayout doesn't override).
    const [gr, gg, gb] = this.dominantColor;
    const glowBoost = Math.min(1.8, 0.55 + bassAmp * 0.7 + beatT * 0.9);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.uniform1i(U.uMode, 0);
    gl.uniform3f(U.uGlowColor, gr, gg, gb);
    for (const [scale, alpha] of [[1.50, 0.05], [1.32, 0.08], [1.18, 0.11], [1.07, 0.08]] as const) {
      gl.uniform1f(U.uScale, scale);
      gl.uniform1f(U.uGlowAlpha, alpha * glowBoost);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Main image.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(U.uMode, 1);
    gl.uniform1f(U.uScale, 1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
