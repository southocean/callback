// Real-time video filter chain, in WebGL.
//
// Why it is here at all: effects are a feature this product ships, and building
// one is more convincing than mentioning one. Review U8 required it to be
// framed as engineering rather than decoration, so it lives in the Engineering
// panel next to a frame-time readout.
//
// Review T5 set the constraints, and they are the interesting part:
//   - 30 fps cap. A CV has no business asking for 60.
//   - low-power GL context.
//   - suspends the moment the tab is hidden.
//   - graceful fallback to CSS filters when WebGL is unavailable.
//   - default off, and one keystroke kills it.
//
// Review U4 set the safety floor: nothing modulates faster than 3 Hz, so no
// preset can flash (WCAG 2.3.1).

import { clamp01 } from '../state.js';
import type { FxPreset } from '../state.js';

const VERT = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*0.5+0.5,0.5-p.y*0.5);gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 px;      // one texel
uniform float t;      // seconds
uniform int mode;
uniform float amt;

vec3 blur(vec2 c){
  vec3 s = vec3(0.);
  for(int y=-2;y<=2;y++){
    for(int x=-2;x<=2;x++){
      s += texture2D(tex, c + vec2(float(x),float(y))*px*1.5).rgb;
    }
  }
  return s / 25.0;
}

float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

void main(){
  vec2 c = uv;
  vec3 col;

  if(mode==1){                                  // soften
    col = mix(texture2D(tex,c).rgb, blur(c), amt);

  } else if(mode==2){                           // normalise
    vec3 s = texture2D(tex,c).rgb;
    float l = luma(s);
    vec3 lifted = clamp((s - 0.04) / 0.88, 0.0, 1.0);
    col = mix(s, mix(vec3(l), lifted, 1.15), amt);

  } else if(mode==3){                           // edges
    float l  = luma(texture2D(tex,c).rgb);
    float lx = luma(texture2D(tex,c+vec2(px.x,0.)).rgb) - luma(texture2D(tex,c-vec2(px.x,0.)).rgb);
    float ly = luma(texture2D(tex,c+vec2(0.,px.y)).rgb) - luma(texture2D(tex,c-vec2(0.,px.y)).rgb);
    float e = clamp(length(vec2(lx,ly))*4.0, 0.0, 1.0);
    col = mix(texture2D(tex,c).rgb, mix(vec3(l*0.15), vec3(0.45,0.95,0.80), e), amt);

  } else if(mode==4){                           // kaleido
    vec2 q = c - 0.5;
    float r = length(q);
    float a = atan(q.y, q.x);
    float seg = 3.14159265 / 3.0;
    // 0.35 rad/s. Slow on purpose: no flashing, no motion sickness.
    a = mod(a + t*0.35, seg*2.0);
    a = abs(a - seg);
    q = vec2(cos(a), sin(a)) * r;
    vec3 s = texture2D(tex, clamp(q + 0.5, 0.001, 0.999)).rgb;
    // Gentle hue drift at ~0.15 Hz, well under the 3 Hz safety limit.
    float h = 0.5 + 0.5*sin(t*0.9 + r*6.0);
    vec3 tint = mix(vec3(0.30,0.95,0.85), vec3(0.95,0.45,0.85), h);
    col = mix(texture2D(tex,c).rgb, s*0.55 + s*tint*0.75, amt);

  } else {
    col = texture2D(tex,c).rgb;
  }

  gl_FragColor = vec4(col, 1.0);
}`;

const MODES: Record<FxPreset, number> = { off: 0, soften: 1, normalise: 2, edges: 3, kaleido: 4 };

export const presetInfo: Record<FxPreset, { name: string; blurb: string; warn?: string }> = {
  off: { name: 'Off', blurb: 'The default. Nothing running, no GL context, no frame cost.' },
  soften: { name: 'Soften', blurb: '5×5 separable-ish box blur. The sober one — this is background blur’s cheaper cousin.' },
  normalise: { name: 'Normalise', blurb: 'Black-point lift and saturation recovery. What bad webcam light actually needs.' },
  edges: { name: 'Edges', blurb: 'Sobel gradient magnitude over luma. Cheap, and it shows the sampling is real.' },
  kaleido: {
    name: 'Kaleidoscope',
    blurb: 'Polar fold with a slow hue drift. The one that is just for fun.',
    warn: 'Rotates at 0.35 rad/s and drifts hue at 0.15 Hz — deliberately far below the 3 Hz flash threshold. Disabled entirely under reduced-motion.',
  },
};

export interface FxStats {
  fps: number;
  ms: number;
  backend: 'webgl' | 'css' | 'none';
}

export class Pipeline {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private raf = 0;
  private last = 0;
  private frames = 0;
  private acc = 0;
  private preset: FxPreset = 'off';
  private started = 0;
  private onStats: (s: FxStats) => void;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  readonly canvas: HTMLCanvasElement;
  readonly video: HTMLVideoElement;
  backend: 'webgl' | 'css' | 'none' = 'none';

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement, onStats: (s: FxStats) => void) {
    this.video = video;
    this.canvas = canvas;
    this.onStats = onStats;
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = (): void => {
    // Suspend on a hidden tab. A CV left open in a background tab must not keep
    // a GPU loop alive (review T5).
    if (document.hidden) this.pause();
    else if (this.preset !== 'off') this.resume();
  };

  private init(): boolean {
    if (this.gl) return true;
    const gl = (this.canvas.getContext('webgl', {
      powerPreference: 'low-power',
      antialias: false,
      depth: false,
      alpha: false,
      preserveDrawingBuffer: false,
    }) ?? null) as WebGLRenderingContext | null;

    if (!gl) {
      this.backend = 'css';
      return false;
    }

    const compile = (type: number, src: string): WebGLShader | null => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('shader', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !prog) {
      this.backend = 'css';
      return false;
    }

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      this.backend = 'css';
      return false;
    }

    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    for (const u of ['tex', 'px', 't', 'mode', 'amt']) {
      this.uniforms[u] = gl.getUniformLocation(prog, u);
    }

    this.gl = gl;
    this.program = prog;
    this.backend = 'webgl';
    return true;
  }

  set(preset: FxPreset, reducedMotion: boolean): void {
    // Reduced motion is not negotiable (review U4).
    const next = reducedMotion && preset === 'kaleido' ? 'normalise' : preset;
    this.preset = next;

    if (next === 'off') {
      this.pause();
      this.canvas.hidden = true;
      this.video.style.filter = '';
      this.onStats({ fps: 0, ms: 0, backend: this.backend });
      return;
    }

    if (!this.init()) {
      // No WebGL: keep the feature, lose the fidelity.
      this.canvas.hidden = true;
      this.video.style.filter = cssFallback(next);
      this.onStats({ fps: 0, ms: 0, backend: 'css' });
      return;
    }

    this.canvas.hidden = false;
    this.video.style.filter = '';
    this.resume();
  }

  private resume(): void {
    if (this.raf || this.preset === 'off') return;
    this.started = this.started || performance.now();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private pause(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number): void => {
    this.raf = requestAnimationFrame(this.tick);

    // 30 fps cap.
    const dt = now - this.last;
    if (dt < 1000 / 30) return;
    this.last = now;

    const gl = this.gl;
    const v = this.video;
    if (!gl || !this.program || v.readyState < 2 || !v.videoWidth) return;

    const t0 = performance.now();
    const w = Math.min(v.videoWidth, 960);
    const h = Math.round((w / v.videoWidth) * v.videoHeight);
    if (this.canvas.width !== w) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
    gl.uniform1i(this.uniforms['tex'] ?? null, 0);
    gl.uniform2f(this.uniforms['px'] ?? null, 1 / w, 1 / h);
    gl.uniform1f(this.uniforms['t'] ?? null, (now - this.started) / 1000);
    gl.uniform1i(this.uniforms['mode'] ?? null, MODES[this.preset]);
    gl.uniform1f(this.uniforms['amt'] ?? null, clamp01(0.95));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const ms = performance.now() - t0;
    this.frames++;
    this.acc += dt;
    if (this.acc >= 500) {
      this.onStats({ fps: Math.round((this.frames * 1000) / this.acc), ms: Number(ms.toFixed(2)), backend: 'webgl' });
      this.frames = 0;
      this.acc = 0;
    }
  };

  destroy(): void {
    this.pause();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const gl = this.gl;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    this.gl = null;
    this.program = null;
  }
}

export function cssFallback(preset: FxPreset): string {
  switch (preset) {
    case 'soften':
      return 'blur(3px)';
    case 'normalise':
      return 'contrast(1.15) saturate(1.2) brightness(1.05)';
    case 'edges':
      return 'grayscale(1) contrast(2.4) invert(1)';
    case 'kaleido':
      return 'hue-rotate(140deg) saturate(1.8) contrast(1.1)';
    case 'off':
      return '';
  }
}
