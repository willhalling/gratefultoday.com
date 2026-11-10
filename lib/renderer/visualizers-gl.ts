/**
 * lib/renderer/visualizers-gl.ts — WebGL2 visualizer presets:
 *
 *   prism-bars     — mirrored log-frequency capsules, falling peak caps,
 *                    rippled reflection floor
 *   dot-halo       — LED ring of dots filling outward, beat shockwave
 *   echo-rings     — each past frame leaves a ring rippling outward
 *   aurora-ribbons — five glowing ribbons, one per band, aurora curtains
 *   silk-waveform  — whole-track capsule peaks lit as they play, beam playhead
 *
 * One fragment shader per preset on a full-screen triangle, drawn into the
 * bottom-left w×h of a private WebGL2 canvas, then blitted into the overlay
 * Canvas2D at the layout's slot (drawGlVisualizer). Every shader input is a
 * pure function of the composition frame (createGlFrameInputs): spectrum
 * history, peak-hold and the beat envelope are re-derived from the
 * pre-analysed per-frame spectrum, never accumulated from wall clock, so the
 * editor preview and the export render identical frames.
 *
 * Without WebGL2 the caller falls back to the preset's Canvas2D classicBase
 * (constants/visualizers.ts).
 */

export type GlVisualizerPreset =
  | 'prism-bars'
  | 'dot-halo'
  | 'echo-rings'
  | 'aurora-ribbons'
  | 'silk-waveform';

/**
 * How far a preset draws beyond the layout's slot, as multipliers of the
 * slot size about its centre (never shrinking the slot). Classic slots are sized for flat Canvas2D
 * art; glow and swing need room, and some presets read better larger.
 */
export const GL_SLOT_BLEED: Partial<
  Record<GlVisualizerPreset, { x: number; y: number; /** cap on bled height ÷ bled width */ maxHOverW?: number }>
> = {
  // Capped so tall (portrait) slots don't grow into the title area.
  'aurora-ribbons': { x: 1.05, y: 1.8, maxHOverW: 0.8 },
  'prism-bars': { x: 1.15, y: 1.45 },
};

export const HIST_BINS = 128;
export const HIST_ROWS = 64;
export const PEAK_BINS = 256;

export interface GlVisualizerInputs {
  /** HIST_BINS × HIST_ROWS, 0–255; row HIST_ROWS-1 is the current frame,
   *  row HIST_ROWS-1-k is k frames ago. Bins are log-frequency. */
  hist: Uint8Array;
  bass: number;
  mid: number;
  high: number;
  energy: number;
  /** Beat envelope: 1 on an onset, decaying towards 0. */
  beat: number;
  /** Seconds. */
  time: number;
  /** Playback progress 0–1. */
  progress: number;
  /** PEAK_BINS whole-track peaks, 0–255. */
  peaks: Uint8Array;
}

// ─── GLSL ────────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
in vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }`;

const COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uTime,uBass,uMid,uHigh,uEnergy,uBeat,uHead,uProgress;
uniform vec3 uAccent,uAccent2;
uniform sampler2D uHist; uniform sampler2D uPeaks;
out vec4 o;
#define PI 3.14159265
float spec(float x){ return texture(uHist, vec2(clamp(x,0.,1.),(uHead+.5)/64.)).r; }
float specAge(float x,float age){ float r=mod(uHead-floor(age),64.); return texture(uHist, vec2(clamp(x,0.,1.),(r+.5)/64.)).r; }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
vec3 tint(float t){ return mix(uAccent,uAccent2,clamp(t,0.,1.)); }
vec4 emit(vec3 c){ c=clamp(c,0.,1.); return vec4(c,max(c.r,max(c.g,c.b))); }
float sdBox(vec2 p, vec2 b, float r){ r=min(r,min(b.x,b.y)); vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
`;

const FRAG: Record<GlVisualizerPreset, string> = {
  'prism-bars': `
float baseY(){ return uRes.y*.3; }
vec3 bars(vec2 fr, out float a){
  a=0.;
  float M=28., cx=uRes.x*.5, span=uRes.x*.49;
  float bx=abs(fr.x-cx)/span;
  if(bx>=1.) return vec3(0);
  float id=floor(bx*M), f=id/M;
  float fx=.015+.62*f;
  float s=spec(fx);
  float pk=s; for(int k=1;k<12;k++){ pk=max(pk,specAge(fx,float(k)*2.)-float(k)*.022); }
  float base=baseY(), maxH=uRes.y*.6;
  float h=maxH*(.02+.98*pow(s,1.15))*(.9+.1*uBeat);
  float cw=span/M, bw=cw*.36;
  float xc=cx+sign(fr.x-cx)*(id+.5)*cw;
  float d=sdBox(fr-vec2(xc,base+h*.5), vec2(bw,h*.5), bw);
  float yt=clamp((fr.y-base)/maxH,0.,1.);
  vec3 col=mix(uAccent,uAccent2,clamp(yt*1.4,0.,1.));
  col=mix(col,vec3(1),smoothstep(.5,1.,yt)*s);
  float fill=smoothstep(1.,-1.,d);
  float glow=exp(-max(d,0.)/(cw*.6))*(.25+.5*s+.3*uBeat);
  float py=base+maxH*(.02+.98*pow(clamp(pk,0.,1.),1.15))+cw*.35;
  float ch=max(1.5,cw*.07);
  float dc=sdBox(fr-vec2(xc,py), vec2(bw,ch), ch);
  float cap=smoothstep(1.,-1.,dc);
  a=max(fill,cap);
  return col*fill+col*glow+mix(uAccent2,vec3(1),.6)*cap*.9;
}
void main(){
  vec2 fr=gl_FragCoord.xy; float base=baseY(); float a; vec3 c;
  float bx=abs(fr.x-uRes.x*.5)/(uRes.x*.49);
  if(fr.y>=base){
    c=bars(fr,a);
  } else {
    float dy=base-fr.y;
    c=bars(vec2(fr.x+sin(fr.y*.15+uTime*3.)*1.2, base+dy*1.15),a);
    float fade=exp(-dy/(uRes.y*.08));
    c*=fade*.35; a*=.3*fade;
  }
  c+=tint(.5)*exp(-abs(fr.y-base)/2.)*.3*smoothstep(1.,.5,bx);
  vec4 e=emit(c); o=vec4(e.rgb,max(e.a,a));
}`,
  'dot-halo': `
void main(){
  float m=min(uRes.x,uRes.y); vec2 p=(gl_FragCoord.xy-.5*uRes)/m;
  float r=length(p), rot=uTime*.04, a=atan(p.y,p.x)+rot;
  const float K=64., R=13.; float r0=.15, st=.021;
  float ac=(floor(a/(2.*PI)*K)+.5)/K*2.*PI;
  float ri=floor((r-r0)/st);
  vec3 col=vec3(0);
  float sw=r0+(1.-uBeat)*.34;
  col+=tint(.3)*exp(-abs(r-sw)*m/3.)*uBeat*.7;
  col+=uAccent*exp(-r*9.)*(.12+.5*uBass);
  for(float dr=-1.;dr<=1.;dr+=1.){
    float rj=ri+dr;
    if(rj<0.||rj>=R) continue;
    float wa=mod(ac+PI,2.*PI)-PI; float u=abs(wa)/PI;
    float s=spec(.02+.6*u);
    float lvl=pow(s,1.2)*R*1.05;
    float rc=r0+(rj+.5)*st;
    vec2 dc=vec2(cos(ac-rot),sin(ac-rot))*rc;
    float d=length(p-dc)*m;
    float rad=st*m*.32*(1.-rj/R*.35);
    float dt=smoothstep(rad+1.,rad-1.,d);
    float lit=clamp(lvl-rj,0.,1.);
    float top=step(0.,lvl-rj)*step(lvl-rj,1.5);
    vec3 c=mix(tint(rj/R),vec3(1),top*.6);
    col+=c*dt*(.07+.93*lit)+c*exp(-d/(rad*2.5))*.18*lit;
  }
  o=emit(col);
}`,
  'echo-rings': `
void main(){
  float m=min(uRes.x,uRes.y); vec2 p=(gl_FragCoord.xy-.5*uRes)/m;
  float r=length(p), a=atan(p.y,p.x), u=abs(a)/PI;
  vec3 col=vec3(0);
  for(int k=0;k<22;k++){
    float fk=float(k), age=fk*2.;
    float e=specAge(.04,age)*.6+specAge(.15,age)*.4;
    float sk=specAge(.05+.5*u,age);
    float rr=.1+fk*.017+.03*sk*sk+.006*sin(a*5.+fk*.7+uTime);
    float dpx=abs(r-rr)*m;
    float w=(1.+1.8*e)*m/540.;
    float l=smoothstep(w+1.,w-.5,dpx)+exp(-dpx/(7.*m/540.))*.35;
    col+=tint(fk/22.)*l*(.12+1.3*pow(e,1.2))*(1.-fk/22.);
  }
  col+=mix(uAccent,vec3(1),.5)*exp(-r*22.)*(.2+uBass);
  o=emit(col);
}`,
  'aurora-ribbons': `
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 col=vec3(0);
  float env=pow(sin(PI*clamp(uv.x,0.,1.)),.8);
  float k=uRes.y/540.;
  for(int i=0;i<5;i++){
    float fi=float(i);
    float b=spec(.03+fi*.13);
    float w=sin(uv.x*6.2831*(.8+fi*.3)+uTime*(.9+fi*.25)+fi*1.7)*.6
           +sin(uv.x*17.+uTime*2.2-fi*2.1)*.3*(.3+uHigh*1.5)
           +(noise(vec2(uv.x*4.+fi*9.,uTime*.4))-.5)*.5;
    float off=w*(.07+.5*b+.14*uBeat)*env;
    float y=.5+(fi-2.)*.05+.34*tanh(off/.34);
    float d=abs(uv.y-y)*uRes.y;
    float th=(1.2+3.5*b+1.5*uBeat)*k;
    float core=smoothstep(th+1.,th-.5,d)*env;
    float glow=exp(-d/((8.+48.*b)*k))*(.18+1.2*b+.4*uBeat)*env;
    vec3 c=tint(.5+.5*sin(fi*1.3+uv.x*3.+uTime*.2));
    col+=c*glow*.55+mix(c,vec3(1),.55)*core*.9;
  }
  float ray=pow(noise(vec2(uv.x*36.,uTime*.25)),3.);
  float cur=smoothstep(.5,.62,uv.y)*smoothstep(.95,.62,uv.y);
  col+=tint(uv.x)*ray*cur*env*(.12+.5*uEnergy);
  o=emit(col);
}`,
  'silk-waveform': `
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float NB=floor(clamp(uRes.x/7.,60.,160.));
  float cell=uv.x*NB, id=floor(cell), xc=(id+.5)/NB;
  float pk=texture(uPeaks,vec2(xc,.5)).r;
  float dx=xc-uProgress;
  float live=exp(-abs(dx)*28.)*spec(.03+abs(dx)*3.);
  float hh=.03+.28*pk+.16*live;
  vec2 pp=vec2((cell-id-.5)*uRes.x/NB,(uv.y-.5)*uRes.y);
  float bw=uRes.x/NB*.28;
  float d=sdBox(pp,vec2(bw,hh*uRes.y),bw);
  float fill=smoothstep(1.,-1.,d);
  float played=step(xc,uProgress);
  vec3 g=mix(uAccent,uAccent2,uv.x);
  vec3 col=mix(vec3(.17),g*(1.+.5*live),played)*fill;
  col+=g*exp(-max(d,0.)/(uRes.x/NB))*.28*played;
  float hx=abs(uv.x-uProgress)*uRes.x;
  float vy=1.-smoothstep(0.,.45,abs(uv.y-.5));
  col+=vec3(1)*smoothstep(1.5,0.,hx)*vy+uAccent2*exp(-hx/18.)*.35*vy*(.6+uBeat);
  vec4 e=emit(col); o=vec4(e.rgb,max(e.a,fill*mix(.25,1.,played)));
}`,
};

const UNIFORMS = [
  'uRes', 'uTime', 'uBass', 'uMid', 'uHigh', 'uEnergy', 'uBeat', 'uHead', 'uProgress',
  'uAccent', 'uAccent2', 'uHist', 'uPeaks',
] as const;

// ─── Colour ──────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

let colourCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
const colourCache = new Map<string, [RGB, RGB]>();

function parseColour(input: string): RGB {
  let hex = input.trim();
  if (!/^#[0-9a-f]{3,8}$/i.test(hex)) {
    // Normalise named / rgb() colours through Canvas2D (returns #rrggbb or rgba()).
    if (!colourCtx) {
      colourCtx =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(1, 1).getContext('2d')
          : document.createElement('canvas').getContext('2d');
    }
    if (colourCtx) {
      colourCtx.fillStyle = '#8b5cf6';
      colourCtx.fillStyle = input;
      hex = String(colourCtx.fillStyle);
    }
    const m = hex.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  }
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0.545, 0.361, 0.965];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHsl([r, g, b]: RGB): RGB {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]: RGB): RGB {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** Theme accent + a derived second hue (+40°, lifted) for gradients. */
export function accentPair(colour: string): [RGB, RGB] {
  const cached = colourCache.get(colour);
  if (cached) return cached;
  const a = parseColour(colour);
  const [h, s, l] = rgbToHsl(a);
  const b = hslToRgb([(h + 0.11) % 1, Math.min(1, s * 0.9 + 0.1), Math.min(0.82, l * 0.8 + 0.25)]);
  const pair: [RGB, RGB] = [a, b];
  colourCache.set(colour, pair);
  return pair;
}

// ─── Renderer ────────────────────────────────────────────────────────────────

interface CompiledProgram {
  program: WebGLProgram;
  uniforms: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
}

export class GlVisualizerRenderer {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  private readonly gl: WebGL2RenderingContext;
  private readonly vs: WebGLShader;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly histTex: WebGLTexture;
  private readonly peaksTex: WebGLTexture;
  private readonly programs = new Map<GlVisualizerPreset, CompiledProgram | null>();
  private lastPeaks: Uint8Array | null = null;
  private disposed = false;

  /** Null when WebGL2 is unavailable. */
  static create(): GlVisualizerRenderer | null {
    try {
      const canvas =
        typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(2, 2);
      canvas.width = 2;
      canvas.height = 2;
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
      }) as WebGL2RenderingContext | null;
      if (!gl) return null;
      return new GlVisualizerRenderer(canvas, gl);
    } catch {
      return null;
    }
  }

  private constructor(canvas: HTMLCanvasElement | OffscreenCanvas, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERT);
    if (!vs) throw new Error('visualizers-gl: vertex shader failed');
    this.vs = vs;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.histTex = this.makeTexture(HIST_BINS, HIST_ROWS);
    this.peaksTex = this.makeTexture(PEAK_BINS, 1);
  }

  private compile(type: number, src: string): WebGLShader | null {
    const gl = this.gl;
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[visualizers-gl] shader compile failed:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  private makeTexture(w: number, h: number): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    return t;
  }

  private program(preset: GlVisualizerPreset): CompiledProgram | null {
    if (this.programs.has(preset)) return this.programs.get(preset)!;
    const gl = this.gl;
    let compiled: CompiledProgram | null = null;
    const fs = this.compile(gl.FRAGMENT_SHADER, COMMON + FRAG[preset]);
    if (fs) {
      const program = gl.createProgram()!;
      gl.attachShader(program, this.vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, 'aPos');
      gl.linkProgram(program);
      gl.deleteShader(fs);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const uniforms = {} as CompiledProgram['uniforms'];
        for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name);
        compiled = { program, uniforms };
      } else {
        console.error('[visualizers-gl] program link failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
      }
    }
    this.programs.set(preset, compiled);
    return compiled;
  }

  /**
   * Render `preset` into the bottom-left width×height pixels of `canvas`
   * (growing it when needed). Returns the rendered size, or null on failure
   * (context lost / shader error) so callers can fall back.
   */
  render(
    preset: GlVisualizerPreset,
    inputs: GlVisualizerInputs,
    width: number,
    height: number,
    accentColor: string,
  ): { width: number; height: number } | null {
    if (this.disposed) return null;
    const gl = this.gl;
    if (gl.isContextLost()) return null;
    const pr = this.program(preset);
    if (!pr) return null;
    const w = Math.max(1, Math.min(4096, Math.round(width)));
    const h = Math.max(1, Math.min(4096, Math.round(height)));
    if (this.canvas.width < w || this.canvas.height < h) {
      this.canvas.width = Math.max(this.canvas.width, w);
      this.canvas.height = Math.max(this.canvas.height, h);
    }

    gl.bindTexture(gl.TEXTURE_2D, this.histTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, HIST_BINS, HIST_ROWS, gl.RED, gl.UNSIGNED_BYTE, inputs.hist);
    if (inputs.peaks !== this.lastPeaks) {
      gl.bindTexture(gl.TEXTURE_2D, this.peaksTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PEAK_BINS, 1, gl.RED, gl.UNSIGNED_BYTE, inputs.peaks);
      this.lastPeaks = inputs.peaks;
    }

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pr.program);
    gl.bindVertexArray(this.vao);
    const u = pr.uniforms;
    const [a1, a2] = accentPair(accentColor);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uTime, inputs.time);
    gl.uniform1f(u.uBass, inputs.bass);
    gl.uniform1f(u.uMid, inputs.mid);
    gl.uniform1f(u.uHigh, inputs.high);
    gl.uniform1f(u.uEnergy, inputs.energy);
    gl.uniform1f(u.uBeat, inputs.beat);
    gl.uniform1f(u.uHead, HIST_ROWS - 1);
    gl.uniform1f(u.uProgress, inputs.progress);
    gl.uniform3fv(u.uAccent, a1);
    gl.uniform3fv(u.uAccent2, a2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.histTex);
    gl.uniform1i(u.uHist, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.peaksTex);
    gl.uniform1i(u.uPeaks, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    return { width: w, height: h };
  }

  /** Copy the last render (size from render()) into a 2D context rect. */
  blit(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    rendered: { width: number; height: number },
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    ctx.drawImage(
      this.canvas,
      0,
      this.canvas.height - rendered.height,
      rendered.width,
      rendered.height,
      dx,
      dy,
      dw,
      dh,
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    for (const p of Array.from(this.programs.values())) if (p) gl.deleteProgram(p.program);
    this.programs.clear();
    gl.deleteShader(this.vs);
    gl.deleteTexture(this.histTex);
    gl.deleteTexture(this.peaksTex);
    gl.deleteBuffer(this.buffer);
    gl.deleteVertexArray(this.vao);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// ─── Frame-derived inputs (export / editor preview) ──────────────────────────

const toDb = (v: number) => 20 * Math.log10(Math.max(v, 1e-6));

/** dB window below each band's reference that maps to 0–1. */
const DB_RANGE = 34;
/** Reference floor so near-silent tracks don't amplify noise. */
const DB_FLOOR = -50;

/** Linear-bin index each log-frequency bin samples (0 → 127). */
const LOG_POS = Float32Array.from({ length: HIST_BINS }, (_, i) =>
  Math.pow(HIST_BINS, i / (HIST_BINS - 1)) - 1,
);

const ZERO_ROW = new Float32Array(HIST_BINS);

export interface GlFrameInputSource {
  /** Per-frame 128-bin spectrum (analysis.frequencyData). */
  frequencyData: ArrayLike<Float32Array | undefined>;
  totalFrames: number;
  fps: number;
  durationInFrames: number;
  /** Decoded PCM channel for whole-track peaks (optional). */
  channel: Float32Array | null;
}

/**
 * Binds a frame → GlVisualizerInputs function. Each value depends only on the
 * analysis and the frame index; the row caches are memoisation, not state.
 */
export function createGlFrameInputs(src: GlFrameInputSource): (frame: number) => GlVisualizerInputs {
  const { fps, totalFrames } = src;
  const releaseFrames = Math.max(1, Math.ceil(fps * 0.3));
  const releaseTau = fps * 0.09;
  const beatFrames = Math.max(1, Math.ceil(fps * 0.6));
  const onsetWindow = Math.max(2, Math.round(fps / 3));

  // Log-resampled linear magnitude of frame f's spectrum, bin i.
  const sample = (bins: Float32Array, i: number): number => {
    const last = bins.length - 1;
    const x = LOG_POS[i] * (last / (HIST_BINS - 1));
    const j = Math.floor(x);
    const t = x - j;
    return bins[Math.min(j, last)] * (1 - t) + bins[Math.min(j + 1, last)] * t;
  };

  // Per-band loudness reference: the track's 98th-percentile dB per log bin
  // (smoothed across neighbours), so every band swings the full 0–1 range
  // whatever the master's loudness or spectral tilt.
  const ref = new Float32Array(HIST_BINS).fill(DB_FLOOR);
  {
    const stride = Math.max(1, Math.floor(totalFrames / 600));
    const cols: number[][] = Array.from({ length: HIST_BINS }, () => []);
    for (let f = 0; f < totalFrames; f += stride) {
      const bins = src.frequencyData[f];
      if (!bins || bins.length === 0) continue;
      for (let i = 0; i < HIST_BINS; i++) cols[i].push(toDb(sample(bins, i)));
    }
    const p95 = cols.map((c) => {
      if (c.length === 0) return DB_FLOOR;
      c.sort((x, y) => x - y);
      return c[Math.min(c.length - 1, Math.floor(c.length * 0.98))];
    });
    for (let i = 0; i < HIST_BINS; i++) {
      let s = 0;
      let n = 0;
      for (let k = -2; k <= 2; k++) {
        const j = i + k;
        if (j < 0 || j >= HIST_BINS) continue;
        s += p95[j];
        n++;
      }
      ref[i] = Math.max(DB_FLOOR, s / n);
    }
  }

  const rawCache = new Map<number, Float32Array>();
  const envCache = new Map<number, Float32Array>();
  const bassCache = new Map<number, number>();

  const trim = (m: Map<number, unknown>) => {
    if (m.size > 1024) m.clear();
  };

  // Log-resampled spectrum at frame f, normalised against each band's ref.
  const raw = (f: number): Float32Array => {
    if (f < 0 || totalFrames <= 0) return ZERO_ROW;
    const ff = Math.min(f, totalFrames - 1);
    const hit = rawCache.get(ff);
    if (hit) return hit;
    const bins = src.frequencyData[ff];
    const out = new Float32Array(HIST_BINS);
    if (bins && bins.length > 0) {
      for (let i = 0; i < HIST_BINS; i++) {
        const v = (toDb(sample(bins, i)) - (ref[i] - DB_RANGE)) / DB_RANGE;
        out[i] = v <= 0 ? 0 : Math.pow(Math.min(1, v), 1.7);
      }
    }
    trim(rawCache);
    rawCache.set(ff, out);
    return out;
  };

  // Fast attack, ~0.1 s release: max over a decayed look-back window.
  const env = (f: number): Float32Array => {
    if (f < 0) return ZERO_ROW;
    const hit = envCache.get(f);
    if (hit) return hit;
    const out = new Float32Array(HIST_BINS);
    for (let k = 0; k <= releaseFrames; k++) {
      const row = raw(f - k);
      if (row === ZERO_ROW) break;
      const decay = Math.exp(-k / releaseTau);
      for (let i = 0; i < HIST_BINS; i++) {
        const v = row[i] * decay;
        if (v > out[i]) out[i] = v;
      }
    }
    trim(envCache);
    envCache.set(f, out);
    return out;
  };

  const bassAt = (f: number): number => {
    if (f < 0) return 0;
    const hit = bassCache.get(f);
    if (hit !== undefined) return hit;
    const row = raw(f);
    let s = 0;
    for (let i = 0; i < 14; i++) s += row[i];
    const v = s / 14;
    trim(bassCache);
    bassCache.set(f, v);
    return v;
  };

  const onset = (f: number): number => {
    if (f < 1) return 0;
    let mean = 0;
    for (let k = 1; k <= onsetWindow; k++) mean += bassAt(f - k);
    mean /= onsetWindow;
    return Math.max(0, Math.min(1, (bassAt(f) - mean - 0.03) / 0.1));
  };

  const peaks = buildTrackPeaks(src);
  const hist = new Uint8Array(HIST_BINS * HIST_ROWS);

  return (frame: number): GlVisualizerInputs => {
    for (let r = 0; r < HIST_ROWS; r++) {
      const row = env(frame - (HIST_ROWS - 1 - r));
      const o = r * HIST_BINS;
      for (let i = 0; i < HIST_BINS; i++) hist[o + i] = Math.round(row[i] * 255);
    }
    const cur = env(frame);
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += cur[i];
      return s / (b - a);
    };
    let beat = 0;
    for (let k = 0; k <= beatFrames; k++) {
      const v = onset(frame - k) * Math.exp((-k * 5) / fps);
      if (v > beat) beat = v;
    }
    return {
      hist,
      bass: avg(0, 14),
      mid: avg(24, 70),
      high: avg(80, 124),
      energy: Math.min(1, avg(0, HIST_BINS) * 1.4),
      beat,
      time: frame / fps,
      progress: src.durationInFrames > 0 ? Math.min(1, Math.max(0, frame / src.durationInFrames)) : 0,
      peaks,
    };
  };
}

function buildTrackPeaks(src: GlFrameInputSource): Uint8Array {
  const out = new Uint8Array(PEAK_BINS);
  const raw = new Float32Array(PEAK_BINS);
  const ch = src.channel;
  if (ch && ch.length >= PEAK_BINS) {
    const step = Math.floor(ch.length / PEAK_BINS);
    for (let i = 0; i < PEAK_BINS; i++) {
      let m = 0;
      const end = Math.min(ch.length, (i + 1) * step);
      for (let j = i * step; j < end; j += 4) {
        const a = Math.abs(ch[j]);
        if (a > m) m = a;
      }
      raw[i] = m;
    }
  } else if (src.totalFrames > 0) {
    // No PCM — use per-frame spectrum energy across the track.
    for (let i = 0; i < PEAK_BINS; i++) {
      const bins = src.frequencyData[Math.floor((i / PEAK_BINS) * src.totalFrames)];
      if (!bins) continue;
      let s = 0;
      for (let j = 0; j < bins.length; j++) s += bins[j];
      raw[i] = s / Math.max(1, bins.length);
    }
  }
  let mx = 1e-6;
  for (let i = 0; i < PEAK_BINS; i++) if (raw[i] > mx) mx = raw[i];
  for (let i = 0; i < PEAK_BINS; i++) out[i] = Math.round((raw[i] / mx) * 255);
  return out;
}

// ─── Simulated inputs (picker thumbnails, no audio) ──────────────────────────

/** A looping 118 BPM synthetic signal so thumbnails animate without audio. */
export function createSimulatedGlInputs(): (time: number) => GlVisualizerInputs {
  const hist = new Uint8Array(HIST_BINS * HIST_ROWS);
  const peaks = new Uint8Array(PEAK_BINS);
  for (let i = 0; i < PEAK_BINS; i++) {
    const bar = Math.floor(i / 4);
    let v = bar < 4 ? 0.28 + bar * 0.05 : bar % 16 >= 14 ? 0.4 : 0.78;
    v += (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.14 + (i % 4 === 0 ? 0.06 : 0);
    peaks[i] = Math.round(Math.min(1, v) * 255);
  }
  const ss = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const row = (t: number, out: Uint8Array, offset: number): number => {
    const beat = (t * 118) / 60;
    const ph = beat % 1;
    const bar = Math.floor(beat / 4);
    const kick = Math.exp(-ph * 7);
    const hat = Math.exp(-((beat + 0.5) % 1) * 10);
    for (let i = 0; i < HIST_BINS; i++) {
      const x = i / (HIST_BINS - 1);
      const v =
        kick * 0.95 * Math.exp(-x * 9) +
        0.5 * (0.55 + 0.45 * Math.sin(t * 0.9 + x * 9 + bar)) * Math.exp(-x * 2.2) * (0.6 + 0.4 * Math.sin(x * 40 + t * 2)) +
        hat * 0.45 * ss(0.55, 0.85, x) +
        0.04 * Math.sin(i * 12.9898 + t * 7.1);
      out[offset + i] = Math.round(Math.max(0, Math.min(1, v * 0.85)) * 255);
    }
    return kick;
  };
  return (time: number): GlVisualizerInputs => {
    let kick = 0;
    for (let r = 0; r < HIST_ROWS; r++) {
      const k = row(time - (HIST_ROWS - 1 - r) / 60, hist, r * HIST_BINS);
      if (r === HIST_ROWS - 1) kick = k;
    }
    const o = (HIST_ROWS - 1) * HIST_BINS;
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += hist[o + i];
      return s / (b - a) / 255;
    };
    return {
      hist,
      bass: avg(0, 14),
      mid: avg(24, 70),
      high: avg(80, 124),
      energy: Math.min(1, avg(0, HIST_BINS) * 1.4),
      beat: kick,
      time,
      progress: (time / 40) % 1,
      peaks,
    };
  };
}
