"use strict";

let scale = {
  x: 1.5,
  y: 1.5
};

let width = window.innerWidth / scale.x;
let height = window.innerHeight / scale.y;
let depth = 1000;

let bounds = {
  x: [0, width],
  y: [0, height],
  z: [1, depth]
}

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.autoClear = false;
let container = document.getElementById('render_target');
container.appendChild(renderer.domElement);

window.onresize = onResize;
window.onkeydown = onKeyDown;
container.onmousedown = onMouseDown;
container.onmouseup = onMouseUp;
container.onmousemove = onMouseMove;
container.oncontextmenu = onRightClick;

d3.selectAll('.button')
  .on('click', onButtonClick);

function onButtonClick(evt) {
  console.log('click:', d3.event);
}

let fullscreen_mode = false;
function set_fullscreen() {
  if (fullscreen_mode && !document.fullscreen)
    container.webkitRequestFullscreen();
}

const buttons = {
  'LEFT': 0,
  'MIDDLE': 1,
  'RIGHT': 2
};

const objects = {
  'PARTICLE': 0,
  'SINK': 1,
  'WORMHOLE': 2
}

let start_position = null;
let mouse_position = null;
let placing = null;
let wormhole_start = null;

function onResize(evt) {
  console.log(evt);
}

function onKeyDown(evt) {
  console.log(evt);
}

function onMouseDown(evt) {
  let x = evt.x / window.innerWidth * width;
  let y = height - evt.y / window.innerHeight * height;

  switch (evt.button) {
    case buttons.LEFT:
      onLeftDown(x, y);
      break;
    case buttons.MIDDLE:
      break;
    case buttons.RIGHT:
      onRightDown(x, y);
      break;
    default: {

    }
  }
}

function onMouseUp(evt) {
  let x = evt.x / window.innerWidth * width;
  let y = height - evt.y / window.innerHeight * height;

  switch (evt.button) {
    case buttons.LEFT:
      onLeftUp(x, y);
      break;
    case buttons.MIDDLE:
      break;
    case buttons.RIGHT:
      onRightUp(x, y);
      break;
    default: {

    }
  }
}

function onLeftDown(x, y) {
  start_position = {x: x, y: y};
  let sink = checkCollision(x, y);
  if (sink) {
    placing = objects.WORMHOLE;
    wormhole_start = sink;
  }
  else {
    placing = objects.PARTICLE;
  }
}

function onLeftUp(x, y) {
  let sx = start_position.x;
  let sy = start_position.y;

  if (placing === objects.PARTICLE) {
    let vx = (x - sx);
    let vy = (y - sy);

    setInterval(function() {
      particle(sx, sy, vx, vy)
    }, 1000);
  }
  else if (placing === objects.WORMHOLE) {
    let sink = checkCollision(x, y);
    if (sink) {
      console.log('new wormhole:', wormhole_start, sink);
      wormhole(wormhole_start, sink);
    }
  }

  start_position = null;
  wormhole_start = null;
  placing = null;
}

function onRightDown(x, y) {
  start_position = {x: x, y: y};
  placing = objects.SINK;
}

function onRightUp(x, y) {
  let dx = Math.abs(mouse_position.x - start_position.x);
  let dy = Math.abs(mouse_position.y - start_position.y);
  let dist = Math.sqrt(dx * dx + dy * dy);

  sink(start_position.x, start_position.y, dist);
  start_position = null;
}

function onMouseMove(evt) {
  let x = (evt.x / window.innerWidth) * width;
  let y = height - (evt.y / window.innerHeight) * height;
  mouse_position = {x: x, y: y};
}

function onRightClick(evt) {
  evt.preventDefault();
}

let scene = new THREE.Scene();
let stage = new THREE.Scene();
let overlay = new THREE.Scene();

let particle_texture = THREE.ImageUtils.loadTexture('textures/particle.png');

let particles = [];
let wormholes = [];
let sinks = [];

function checkCollision(x, y) {
  let match = null;
  let matched = sinks.some(function(sink, idx) {
    match = idx;

    let dx = sink.position.x - x;
    let dy = sink.position.y - y;
    let d2 = Math.pow(dx, 2) + Math.pow(dy, 2);
    let d = Math.sqrt(d2);

    return (d < sink.radius);
  });

  return matched ? sinks[match] : null;
}

let palette = [
  0x0000ff, 0x00ff00, 0x00ffff, 0xff0000, 0xff00ff, 0xffff00
];

palette = [0xffffff, 0x00aadd];

let materials = palette.map(function(color) {
  return new THREE.MeshBasicMaterial({color: color, map: particle_texture, transparent: true});
});

let particle_radius = 5;
let sink_radius = 10;
let min_sink_radius = 10;
let max_sink_radius = 30;

let particle_geometry = new THREE.CircleGeometry(particle_radius, 30);
let sink_geometry = new THREE.CircleGeometry(sink_radius, 30);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function int(val) {
  return Math.floor(val);
}

function randMat() {
  return materials[int(rand(0, materials.length))];
}

function bound(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

let id = 0;
function particle(x, y, vx, vy) {
  let mat = randMat();
  let mesh = new THREE.Mesh(particle_geometry, mat);
  particles.push({
    id: ++id,
    position: {
      x: x,
      y: y
    },
    velocity: {
      x: vx,
      y: vy
    },
    mat: mat,
    getMesh: function() {
      let m = mesh.clone();
      m.position.x = this.position.x;
      m.position.y = this.position.y;
      return m;
    }
  });
}

function wormhole(sink1, sink2) {
  sink1.wormholes = (sink1.wormholes || []).concat(sink2);
}

function sink(x, y, r) {
  r = bound(r, min_sink_radius, max_sink_radius);
  let mat = randMat();

  let mesh = new THREE.Mesh(sink_geometry, mat);
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.position.z = 1;
  mesh.mat = mat;
  mesh.idx = 0;

  mesh.radius = r;
  mesh.max_radius = r;
  mesh.min_radius = 0;

  //let scale = octave_range(pentatonic_minor(440), 2, 1);
  let scale = arpeggio(octave_range(minor(440), 2, 1));
  let num_notes = Math.floor(scale.length * (1.0 - (r / max_sink_radius)));
  scale = scale.slice(num_notes);

  mesh.mass = 10 * mesh.radius * mesh.radius;
  mesh.scale.x = mesh.radius / sink_radius;
  mesh.scale.y = mesh.radius / sink_radius;

  mesh.shrink = function() {
    if (mesh.idx === scale.length) return;

    let amount = mesh.radius / (scale.length - mesh.idx);
    mesh.radius -= amount;
    mesh.mass = 10 * mesh.radius * mesh.radius;
    mesh.scale.x = mesh.radius / sink_radius;
    mesh.scale.y = mesh.radius / sink_radius;
    ++mesh.idx;
  }

  mesh.grow = function() {
    if (mesh.idx === 0) return;

    --mesh.idx;
    mesh.radius = mesh.radius * (scale.length - mesh.idx) / (scale.length - mesh.idx - 1);
    mesh.mass = 10 * mesh.radius * mesh.radius;
    mesh.scale.x = mesh.radius / sink_radius;
    mesh.scale.y = mesh.radius / sink_radius;
  }

  mesh.play = function() {
    perform([play(scale[mesh.idx])]);
  }

  scene.add(mesh);
  sinks.push(mesh);
}

function init() {

let camera = new THREE.OrthographicCamera(0, width, height, 0, 0, 1000);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z =  1000;

let parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false, depthBuffer: true };
let framebuffer = new THREE.WebGLRenderTarget(width, height, parameters);
let framebuffer2 = new THREE.WebGLRenderTarget(width, height, parameters);

let uniforms = {
  tDiffuse: {
    type: 't',
    value: framebuffer
  },
  width: {
    type: 'f',
    value: 1.0 / width
  },
  height: {
    type: 'f',
    value: 1.0 / height
  }
};

let materialScreen = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: document.getElementById('vertexShader').textContent,
  fragmentShader: document.getElementById('fragment_shader_screen').textContent,
  depthWrite: true
});

let lineMaterial = new THREE.LineDashedMaterial({
  color: 0x33aaaa,
  linewidth: 3,
  gapSize: 10,
  dashSize: 10
});

let zoneMaterial = new THREE.LineDashedMaterial({
  color: 0xaa33aa,
  linewidth: 5,
  gapSize: 5,
  dashSize: 5
});

let lineGeometry = new THREE.Geometry();
lineGeometry.vertices.push(new THREE.Vector3(0, 0, 1));
lineGeometry.vertices.push(new THREE.Vector3(0, 0, 1));
lineGeometry.computeLineDistances();

function drawZone(x, y, r) {
  let zone_geometry = new THREE.Geometry();
  let zone_radius = r;
  let segment_count = 32;

  for (let i = 0; i <= segment_count; i++) {
    let theta = (i / segment_count) * Math.PI * 2;
    zone_geometry.vertices.push(new THREE.Vector3(
      Math.cos(theta) * zone_radius,
      Math.sin(theta) * zone_radius,
      1)
    );
  }
  zone_geometry.computeLineDistances();

  let mesh = new THREE.Line(zone_geometry, zoneMaterial);
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.radius = r;
  return mesh;
}

let line = new THREE.Line(lineGeometry, lineMaterial);
line.visible = false;
overlay.add(line);

let placer = drawZone(0, 0, 100);
placer.visible = false;
overlay.add(placer);

let zone = drawZone(width / 2, height / 2, 100);
zone.visible = false;
overlay.add(zone);

let plane = new THREE.PlaneGeometry(width, height);
let quad = new THREE.Mesh(plane, materialScreen);
quad.position.x += width / 2;
quad.position.y += height / 2;
stage.add(quad);

let loop_count = 0;
let last_time = 0;
let cumulative_time = 0;
let steps = 10;

let friction = 0.9975;
let gravitation = 4000;
let speed = 1;

function render(time) {
  requestAnimationFrame(render);
  cumulative_time += time - last_time;
  last_time = time;

  if (cumulative_time < 16)
    return;
  cumulative_time -= 16;
  ++loop_count;

  let meshes = [];
  let step = speed * 16 / 1000 * (1.0 / steps);
  let removed = [];

  particles = particles.filter(function(particle) {
    let last = null;
    for (let i = 0; i < steps; ++i) {
      let d_ax = 0;
      let d_ay = 0;

      sinks.forEach(function(sink) {
        let dx = sink.position.x - particle.position.x;
        let dy = sink.position.y - particle.position.y;
        let d2 = Math.pow(dx, 2) + Math.pow(dy, 2);
        let d = Math.sqrt(d2);

        let a = gravitation * sink.mass / d2;
        d_ax += a * dx / d;
        d_ay += a * dy / d;
      });

      let d_vx = step * d_ax;
      let d_vy = step * d_ay;

      particle.velocity.x = (1.0 - (1.0 - friction) / steps) * (particle.velocity.x + d_vx);
      particle.velocity.y = (1.0 - (1.0 - friction) / steps) * (particle.velocity.y + d_vy);

      particle.position.x = particle.position.x + step * particle.velocity.x;
      particle.position.y = particle.position.y + step * particle.velocity.y;

      if (particle.position.x < bounds.x[0] || particle.position.x > bounds.x[1]) {
        particle.velocity.x = -particle.velocity.x;
      }
      if (particle.position.y < bounds.y[0] || particle.position.y > bounds.y[1]) {
        particle.velocity.y = -particle.velocity.y;
      }

      let collided = checkCollision(particle.position.x, particle.position.y);
      if (collided) {
        if (collided.wormholes) {
          let output = collided.wormholes[0];
          let vx = particle.velocity.x;
          let vy = particle.velocity.y;
          let v = Math.sqrt(vx * vx + vy * vy);
          particle.position.x = output.position.x + output.radius * vx / v;
          particle.position.y = output.position.y + output.radius * vy / v;
        }
        else {
          collided.play();
          if (collided.mat === particle.mat)
            collided.shrink();
          else
            collided.grow();

          if (collided.radius < 1)
            removed.push(collided);

          return false;
        }
      }

      if (!last || Math.abs(particle.position.x - last.position.x) > particle_radius / 2 || Math.abs(particle.position.y - last.position.y) > particle_radius / 2) {
        let mesh = particle.getMesh();
        meshes.push(mesh);
        last = mesh;
      }
    }
    return true;
  });

  meshes.forEach(function(mesh) {
    scene.add(mesh);
  });

  let ids = {};
  removed.forEach(function(mesh) {
    ids[mesh.id] = true;
    scene.remove(mesh);
  });
  sinks = sinks.filter(function(sink) {
    return !ids[sink.id];
  });

  // render new content into accumulator buffer
  renderer.render(scene, camera, framebuffer, false);

  // render accumulator to screen with blurring
  renderer.render(stage, camera);

  // render screen to new back-buffer
  renderer.render(stage, camera, framebuffer2, true);

  if (start_position) {
    switch (placing) {
      case objects.PARTICLE:
      case objects.WORMHOLE:
        line.visible = true;
        lineGeometry.vertices[0].x = start_position.x;
        lineGeometry.vertices[0].y = start_position.y;
        lineGeometry.vertices[1].x = mouse_position.x;
        lineGeometry.vertices[1].y = mouse_position.y;

        lineGeometry.computeLineDistances();
        lineGeometry.lineDistancesNeedUpdate = true;

        lineGeometry.verticesNeedUpdate = true;
        break;
      case objects.SINK:
        placer.position.x = start_position.x;
        placer.position.y = start_position.y;
        let dx = Math.abs(mouse_position.x - start_position.x);
        let dy = Math.abs(mouse_position.y - start_position.y);
        let dist = bound(Math.sqrt(dx * dx + dy * dy), min_sink_radius, max_sink_radius);

        if (Math.abs(dist - placer.radius) > 5) {
          overlay.remove(placer);
          placer = drawZone(start_position.x, start_position.y, dist);
          overlay.add(placer);
        }
        else {
          placer.visible = true;
          placer.scale.x = dist / placer.radius;
          placer.scale.y = dist / placer.radius;
        }
        break;
    }
  }
  else {
    line.visible = false;
    placer.visible = false;
  }

  // render overlay to screen
  renderer.render(overlay, camera);

  // swap buffers
  let a = framebuffer2;
  framebuffer2 = framebuffer;
  framebuffer = a;

  uniforms.tDiffuse.value = framebuffer;

  meshes.forEach(function(mesh) {
    scene.remove(mesh);
  });
}
render();

}

init();

let context = new AudioContext();

function pitch(key, interval) {
  return key * Math.pow(2, interval / 12);
}

function octave(key, val) {
  if (Array.isArray(key)) {
    return key.map(function(k) { return octave(k, val); })
              .reduce(function(accum, next) { accum.push(next); return accum; }, []);
  }
  return key * Math.pow(2, val);
}

function source(freq, type) {
  let oscillator = context.createOscillator();
  oscillator.frequency.value = freq;
  oscillator.type = type;
  return oscillator;
}

function gen_adsr(a, d, s, r, sustained_at) {
  let bufferSize = 1024;
  let total = a + d + s + r;
  let attack = a / total * bufferSize;
  let decay = d / total * bufferSize;
  let sustain = s / total * bufferSize;
  let release = r / total * bufferSize;

  sustained_at = sustained_at || 0.8;

  let waveArray = new Float32Array(bufferSize);
  let count = 0;

  for (let i = 0; i < attack; ++i) {
    waveArray[++count] = i / attack;
  }

  for (let i = 0; i < decay; ++i) {
    waveArray[++count] = 1.0 - (1.0 - sustained_at) * (i / decay);
  }

  for (let i = 0; i < sustain; ++i) {
    waveArray[++count] = sustained_at;
  }

  for (let i = 0; i < release; ++i) {
    waveArray[++count] = sustained_at - sustained_at * (i / release);
  }

  return waveArray;
}

function create_envelope(adsr, sustained_at) {
  return gen_adsr.apply(this, adsr.concat(sustained_at));
}

function envelope(adsr, duration) {
  let buf = create_envelope(adsr);

  let env = context.createGain();
  let start = 0;
  let stop = 0;

  return {
    start: function(time) {
      start = time;
      env.gain.value = 0.0;
      let dur = duration || Math.abs(stop - start) || 0.1;
      env.gain.setValueCurveAtTime(buf, start, dur);
    },
    stop: function(time) {
      stop = time;
      env.gain.value = 0.0;
      let dur = duration || Math.abs(stop - start);
      //env.gain.setValueCurveAtTime(buf, start, dur);
    },
    connect: function(node) {
      env.connect(node);
    },
    node: env
  };
}

function gain(val) {
  let g = context.createGain();
  g.gain.value = val;
  return g;
}

function filter(freq, value, type) {
  value = value || 1;
  type = type || 'bandpass';
  let f = context.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = value;
  return f;
}

function create_lfo(freq, amp) {
  let lfo = source(freq, 'sine');
  let lfoGain = gain(amp);
  lfo.connect(lfoGain);
  lfo.start(0);
  return lfoGain;
}

function pluck(note) {
  let s1 = source(note, 'sawtooth');
  let s2 = source(note, 'square');
  let s3 = source(octave(note, -1), 'sawtooth');
  let s4 = source(octave(note, -1), 'square');
  let s5 = source(note, 'triangle');
  let s6 = source(note, 'square');

  s1.detune.value = -5;
  s2.detune.value = -4;
  s3.detune.value = 1;
  s4.detune.value = 5;
  s5.detune.value = 3;
  s6.detune.value = 2;

  let g1 = gain(1.0);
  let g2 = gain(0.6);
  let g3 = gain(0.3);

  s1.connect(g1);
  s2.connect(g1);
  s3.connect(g2);
  s4.connect(g2);
  s5.connect(g3);
  s6.connect(g3);

  let filter_envelope = create_envelope([0.1,2,0,4], 1);
  for (let idx = 0; idx < filter_envelope.length; ++idx) {
    filter_envelope[idx] *= note;
    filter_envelope[idx] += 30;
  }

  let filter_envelope2 = create_envelope([0,1,2,0,4], 2);
  for (let idx = 0; idx < filter_envelope2.length; ++idx) {
    filter_envelope2[idx] *= octave(note, -1) * 0.5;
    filter_envelope2[idx] += 30;
  }

  let filter_envelope3 = create_envelope([0.1,3,6,4], 1);
  for (let idx = 0; idx < filter_envelope3.length; ++idx)
    filter_envelope3[idx] *= note;

  let f1 = filter(note, 3, 'lowpass');
  let f2 = filter(note, 10, 'lowpass');
  let f3 = filter(note, 0.1, 'highpass');

  let env1 = envelope([1,2,0,4], 0.3);
  let env2 = envelope([1,2,2,5], 0.1);

  g1.connect(f1);
  g2.connect(f2);
  g3.connect(f3);

  f1.connect(env1.node);
  f2.connect(env1.node);
  f3.connect(env2.node);

  let mg = gain(0.1);
  env1.node.connect(mg);
  env2.node.connect(mg);

  let sources = [s1, s2, s3, s4, s5, s6, env1, env2];

  let start = 0;
  let stop = 0;

  return {
    start: function(time) {
      start = time;
      sources.forEach(function(s) {
        s.start(time);
      });
      let delta = Math.abs(stop - start);
      f1.frequency.setValueCurveAtTime(filter_envelope, start, delta);
      f2.frequency.setValueCurveAtTime(filter_envelope2, start, delta);
      f3.frequency.setValueCurveAtTime(filter_envelope3, start, delta);
    },
    stop: function(time) {
      stop = time;
      sources.forEach(function(s) {
        s.stop(time);
      });
      let delta = Math.abs(stop - start);
      /*
      f1.frequency.setValueCurveAtTime(filter_envelope, start, delta);
      f2.frequency.setValueCurveAtTime(filter_envelope2, start, delta);
      f3.frequency.setValueCurveAtTime(filter_envelope3, start, delta);
      */
    },
    connect: function(node) {
      mg.connect(node);
    }
  };
}

function marimba(note) {
  let lfo1 = create_lfo(0.5, 4);
  let lfo2 = create_lfo(0.4, 3);
  let lfo3 = create_lfo(0.3, 2);
  let lfo4 = create_lfo(0.2, 1);

  /*
  let lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.001;
  lowpass.frequency = note;
  */

  let highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.Q.value = 0.01;
  highpass.frequency.value = note;

  let bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.Q.value = 1;
  bandpass.frequency.value = note;

  //lowpass.connect(bandpass);
  //bandpass.connect(highpass);
  //lowpass.connect(highpass);

  let filter_in = bandpass;
  let filter_out = bandpass;

  let s1 = source(note, 'triangle');
  let s2 = source(note, 'square');
  let s3 = source(octave(note, 2), 'triangle');
  let s4 = source(pitch(octave(note, 3), 4), 'triangle');

  let f1 = filter(note, 0.1, 'lowpass');
  let f2 = filter(octave(note, 2), 10, 'lowpass');
  let f3 = filter(pitch(octave(note, 3), 4), 20, 'lowpass');

  let g1 = gain(1.0);
  let g2 = gain(0.3);
  let g3 = gain(0.50);
  let g4 = gain(0.25);

  s1.detune.value = 0;
  s2.detune.value = 0;
  s3.detune.value = 0;
  s4.detune.value = 0;

  lfo1.connect(s1.frequency);
  lfo2.connect(s2.frequency);
  lfo3.connect(s3.frequency);
  lfo4.connect(s4.frequency);

  s1.connect(g1);
  s2.connect(g2);
  s3.connect(g3);
  s4.connect(g4);

  g1.connect(f1);
  g2.connect(f1);
  g3.connect(f2);
  g4.connect(f3);

  let env = envelope([0,1,1,20]);
  f1.connect(env.node);
  f2.connect(env.node);
  f3.connect(env.node);

  let sources = [s1, s2, s3, s4, env];

  return {
    start: function(time) {
      sources.forEach(function(s) {
        s.start(time);
      });
    },
    stop: function(time) {
      sources.forEach(function(s) {
        s.stop(time);
      });
    },
    connect: function(node) {
      env.connect(node);
    }
  };
}

let create_sound = pluck;

function play(note) {
  if (Array.isArray(note)) {
    return note.map(play).reduce(function(accum, next) { accum.push(next); return accum; }, []);
  }
  else {
    return create_sound(note);
  }
}

let bpm = 120 * 2;
let spb = 60 / bpm;

let A = 110;

let notes = {
  Ab: pitch(A, -1),
  A: A,
  As: pitch(A, 1),
  Bb: pitch(A, 1),
  B: pitch(A, 2),
  C: pitch(A, 3),
  Cs: pitch(A, 4),
  Db: pitch(A, 4),
  D: pitch(A, 5),
  Ds: pitch(A, 6),
  Eb: pitch(A, 6),
  E: pitch(A, 7),
  F: pitch(A, 8),
  Fs: pitch(A, 9),
  Gb: pitch(A, 9),
  G: pitch(A, 10),
  Gs: pitch(A, 11)
};

function duration(note, beats) {
  note.beats = beats || 1;
  return note;
}

function minor(key) {
  return [0, 2, 3, 5, 7, 9, 11]
    .map(function(step) { return pitch(key, step); });
}

function major(key) {
  return [0, 2, 4, 5, 7, 9, 11]
    .map(function(step) { return pitch(key, step); });
}

function dim(key) {
  return [0, 3, 6, 9, 12]
    .map(function(step) { return pitch(key, step); });
}

function aug(key) {
  return [0, 4, 8, 12]
    .map(function(step) { return pitch(key, step); });
}

function heptatonic_blues(key) {
  return [0, 2, 3, 5, 6, 9, 10]
    .map(function(step) { return pitch(key, step); });
}

function melodic_minor_asc(key) {
  return [0, 2, 3, 5, 7, 9, 11]
    .map(function(step) { return pitch(key, step); });
}

function melodic_minor_desc(key) {
  return [0, -2, -4, -5, -7, -9, -10]
    .map(function(step) { return pitch(key, step); });
}

function pentatonic_major(key) {
  return [0, 2, 4, 7, 9]
    .map(function(step) { return pitch(key, step); });
}

function pentatonic_minor(key) {
  return [0, 3, 5, 7, 11]
    .map(function(step) { return pitch(key, step) });
}

function randomNote() {
  for (let key in notes) {
    window[key] = notes[key];
  }

  let scale = octave_range(pentatonic_minor(C));
  return [scale[int(rand(0, scale.length))]];
}

function octave_range(scale, below, above) {
  below = below || 0;
  above = above || 0;

  let notes = [];
  for (let i = -below; i <= above; ++i) {
    notes = notes.concat(octave(scale, i));
  }
  return notes;
}

function arpeggio(scale) {
  return scale.filter(function(note, idx) {
    let offset = idx % 7;
    return [1, 3, 5].indexOf(offset + 1) !== -1;
  });
}

function createScore() {
  for (let key in notes) {
    window[key] = notes[key];
  }

  let scale = octave_range(aug(C));

  let score = [];
  for (let i = 0; i < 100; ++i) {
    let beat = [];
    let n1 = Math.floor(Math.random() * 5);
    let n2 = Math.floor(Math.random() * 5);
    if (Math.random() > 0.1) {
      beat.push(scale[n1]);
    }
    if (Math.random() > 0.7) {
      beat.push(octave(scale, 1)[n2]);
    }
    score.push(beat);
  }
  return score;
}

// http://stackoverflow.com/questions/22525934/connecting-convolvernode-to-an-oscillatornode-with-the-web-audio-the-simple-way
function impulseResponse( duration, decay, reverse ) {
  let sampleRate = context.sampleRate;
  let length = sampleRate * duration;
  let impulse = context.createBuffer(2, length, sampleRate);
  let impulseL = impulse.getChannelData(0);
  let impulseR = impulse.getChannelData(1);

  if (!decay)
    decay = 2.0;

  for (let i = 0; i < length; i++){
    let n = reverse ? length - i : i;
    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
  }
  return impulse;
}

let bufferSize = 1024;

// http://noisehack.com/generate-noise-web-audio-api/
function createWhiteNoise() {
  let noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
  let output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  let whiteNoise = context.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;
  whiteNoise.start();
  return whiteNoise;
}

function createPinkNoise() {
  let b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
  let node = context.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = function(e) {
    let output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // (roughly) compensate for gain
      b6 = white * 0.115926;
    }
  }
  return node;
}

function createBrownNoise() {
  let lastOut = 0.0;
  let node = context.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = function(e) {
    let output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly) compensate for gain
    }
  };
  return node;
};


function loadSound(url, cb) {
  let request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      cb(null, buffer);
    }, cb);
  }
  request.send();
}

function playSound2(err, buffer) {
  let source = context.createBufferSource();
  source.buffer = buffer;
  //source.loop = true;
  source.playbackRate.value = 1;
  source.start(0);

  let filter = context.createBiquadFilter();
  filter.type = 'allpass';

  let gain = context.createGain();
  gain.gain.value = 5.0;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
}

function playSound(buffer) {
  let source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function get_resources(prefix) {
  let names = ['a', 'as', 'h', 'c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs'];
  let results = [];
  for (let i = 1; i <= 5; ++i) {
    results = results.concat(names.map(function(note) { return {note: note + i, uri: prefix + note + i + '.wav'}; } ));
  }
  return results;
}

function initAudioGraph() {
  let convolve = context.createConvolver();
  convolve.buffer = impulseResponse(0.5, 20, false);

  let delay = context.createDelay();
  delay.delayTime.value = spb / 2;

  let feedback = context.createGain();
  feedback.gain.value = 0.5;

  let wetlevel = context.createGain();
  wetlevel.gain.value = 0.25;

  delay.connect(feedback);
  feedback.connect(delay);

  delay.connect(wetlevel);

  let masterGain = gain(1);

  let compressor = context.createDynamicsCompressor();

  convolve.connect(masterGain);
  masterGain.connect(delay);

  masterGain.connect(compressor);
  wetlevel.connect(compressor);

  compressor.connect(context.destination);

  return convolve;
}

let graph = initAudioGraph();

function perform(score, repeat) {
  score.forEach(function(chord, idx) {
    if (!Array.isArray(chord))
      chord = [chord];

    chord.map(function(c) {
      let start = context.currentTime + idx * spb;
      let stop = context.currentTime + spb * idx + spb;

      c.connect(graph);
      c.start(start);
      c.stop(stop);
    });
  });

  if (repeat) {
    setTimeout(function() {
      score = play(createScore());
      perform(score);
    }, score.length / bpm * 60 * 1000);
  }
};

for (let idx = 0; idx < 10; ++idx) {
  sink(Math.random() * width, Math.random() * height, Math.random() * 50);
}

for (let idx = 0; idx < 3; ++idx) {
  let sx = Math.random() * width;
  let sy = Math.random() * height;
  let vx = Math.random() * 10;
  let vy = Math.random() * 10;

  setInterval(function() {
    particle(sx, sy, vx, vy)
  }, 1000);
}
