window.onresize = onResize;
window.onmousedown = onMouseDown;
window.onmouseup = onMouseUp;
window.onmousemove = onMouseMove;
window.oncontextmenu = onRightClick;
window.onkeydown = set_fullscreen;

var fullscreen_mode = false;
function set_fullscreen() {
  if (fullscreen_mode && !document.fullscreen)
    container.webkitRequestFullscreen();
}

var scale = {
  x: 1.5,
  y: 1.5
};

var buttons = {
  'LEFT': 0,
  'MIDDLE': 1,
  'RIGHT': 2
};

var objects = {
  'PARTICLE': 0,
  'SINK': 1,
  'WORMHOLE': 2
}

var start_position = null;
var mouse_position = null;
var placing = null;
var wormhole_start = null;

function onResize(evt) {
  console.log(evt);
}

function onMouseDown(evt) {
  var x = evt.x / window.innerWidth * width;
  var y = height - evt.y / window.innerHeight * height;

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
  var x = evt.x / window.innerWidth * width;
  var y = height - evt.y / window.innerHeight * height;

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
  var sink = checkCollision(x, y);
  if (sink) {
    placing = objects.WORMHOLE;
    wormhole_start = sink;
  }
  else {
    placing = objects.PARTICLE;
  }
}

function onLeftUp(x, y) {
  var sx = start_position.x;
  var sy = start_position.y;

  if (placing === objects.PARTICLE) {
    var vx = (x - sx);
    var vy = (y - sy);

    setInterval(function() {
      particle(sx, sy, vx, vy)
    }, 1000);
  }
  else if (placing === objects.WORMHOLE) {
    var sink = checkCollision(x, y);
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
  var dx = Math.abs(mouse_position.x - start_position.x);
  var dy = Math.abs(mouse_position.y - start_position.y);
  var dist = Math.sqrt(dx * dx + dy * dy);

  sink(start_position.x, start_position.y, dist);
  start_position = null;
}

function onMouseMove(evt) {
  var x = (evt.x / window.innerWidth) * width;
  var y = height - (evt.y / window.innerHeight) * height;
  mouse_position = {x: x, y: y};
}

function onRightClick(evt) {
  evt.preventDefault();
}

var width = window.innerWidth / scale.x;
var height = window.innerHeight / scale.y;
var depth = 1000;

var bounds = {
  x: [0, width],
  y: [0, height],
  z: [1, depth]
}

var scene = new THREE.Scene();
var stage = new THREE.Scene();
var overlay = new THREE.Scene();

var particle_texture = THREE.ImageUtils.loadTexture('textures/particle.png');

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.autoClear = false;
var container = document.getElementById('render_target');
container.appendChild(renderer.domElement);

var particles = [];
var wormholes = [];
var sinks = [];

function checkCollision(x, y) {
  var match = null;
  var matched = sinks.some(function(sink, idx) {
    match = idx;

    var dx = sink.position.x - x;
    var dy = sink.position.y - y;
    var d2 = Math.pow(dx, 2) + Math.pow(dy, 2);
    var d = Math.sqrt(d2);

    return (d < sink.radius);
  });

  return matched ? sinks[match] : null;
}

var palette = [
  0x0000ff, 0x00ff00, 0x00ffff, 0xff0000, 0xff00ff, 0xffff00
];

var materials = palette.map(function(color) {
  //return new THREE.MeshBasicMaterial({color: color});
  return new THREE.MeshBasicMaterial({color: color, map: particle_texture, transparent: true});
});

var particle_radius = 5;
var sink_radius = 10;
var min_sink_radius = 10;
var max_sink_radius = 30;

var particle_geometry = new THREE.CircleGeometry(particle_radius, 30);
var sink_geometry = new THREE.CircleGeometry(sink_radius, 30);

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

var id = 0;
function particle(x, y, vx, vy) {
  var mat = randMat();
  var mesh = new THREE.Mesh(particle_geometry, mat);
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
      var m = mesh.clone();
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
  var mat = randMat();

  var mesh = new THREE.Mesh(sink_geometry, mat);
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.position.z = 1;
  mesh.mat = mat;
  mesh.idx = 0;

  mesh.radius = r;
  mesh.max_radius = r;
  mesh.min_radius = 0;

  var scale = octave_range(pentatonic_minor(440), 2, 1);
  var num_notes = Math.floor(scale.length * (1.0 - (r / max_sink_radius)));
  scale = scale.slice(num_notes);

  mesh.mass = 10 * mesh.radius * mesh.radius;
  mesh.scale.x = mesh.radius / sink_radius;
  mesh.scale.y = mesh.radius / sink_radius;

  mesh.shrink = function() {
    if (mesh.idx === scale.length - 1) return;

    amount = mesh.radius / (scale.length - mesh.idx);
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

var camera = new THREE.OrthographicCamera(0, width, height, 0, 0, 1000);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z =  1000;

var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false, depthBuffer: true };
var framebuffer = new THREE.WebGLRenderTarget(width, height, parameters);
var framebuffer2 = new THREE.WebGLRenderTarget(width, height, parameters);

var uniforms = {
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

var materialScreen = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: document.getElementById('vertexShader').textContent,
  fragmentShader: document.getElementById('fragment_shader_screen').textContent,
  depthWrite: true
});

var lineMaterial = new THREE.LineDashedMaterial({
  color: 0x33aaaa,
  linewidth: 3,
  gapSize: 10,
  dashSize: 10
});

var zoneMaterial = new THREE.LineDashedMaterial({
  color: 0xaa33aa,
  linewidth: 5,
  gapSize: 5,
  dashSize: 5
});

var lineGeometry = new THREE.Geometry();
lineGeometry.vertices.push(new THREE.Vector3(0, 0, 1));
lineGeometry.vertices.push(new THREE.Vector3(0, 0, 1));
lineGeometry.computeLineDistances();

function drawZone(x, y, r) {
  var zone_geometry = new THREE.Geometry();
  var zone_radius = r;
  var segment_count = 32;

  for (var i = 0; i <= segment_count; i++) {
    var theta = (i / segment_count) * Math.PI * 2;
    zone_geometry.vertices.push(new THREE.Vector3(
      Math.cos(theta) * zone_radius,
      Math.sin(theta) * zone_radius,
      1)
    );
  }
  zone_geometry.computeLineDistances();

  var mesh = new THREE.Line(zone_geometry, zoneMaterial);
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.radius = r;
  return mesh;
}

var line = new THREE.Line(lineGeometry, lineMaterial);
line.visible = false;
overlay.add(line);

var placer = drawZone(0, 0, 100);
placer.visible = false;
overlay.add(placer);

var zone = drawZone(width / 2, height / 2, 100);
zone.visible = false;
overlay.add(zone);

var plane = new THREE.PlaneGeometry(width, height);
var quad = new THREE.Mesh(plane, materialScreen);
quad.position.x += width / 2;
quad.position.y += height / 2;
stage.add(quad);

var loop_count = 0;
var last_time = 0;
var cumulative_time = 0;
var steps = 10;

var friction = 0.9975;
var gravitation = 4000;
var speed = 1;

function render(time) {
  requestAnimationFrame(render);
  cumulative_time += time - last_time;
  last_time = time;

  if (cumulative_time < 16)
    return;
  cumulative_time -= 16;
  ++loop_count;

  var meshes = [];
  var step = speed * 16 / 1000 * (1.0 / steps);

  particles = particles.filter(function(particle) {
    var last = null;
    for (var i = 0; i < steps; ++i) {
      var d_ax = 0;
      var d_ay = 0;

      sinks.forEach(function(sink) {
        var dx = sink.position.x - particle.position.x;
        var dy = sink.position.y - particle.position.y;
        var d2 = Math.pow(dx, 2) + Math.pow(dy, 2);
        var d = Math.sqrt(d2);

        var a = gravitation * sink.mass / d2;
        d_ax += a * dx / d;
        d_ay += a * dy / d;
      });

      var d_vx = step * d_ax;
      var d_vy = step * d_ay;

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

      var collided = checkCollision(particle.position.x, particle.position.y);
      if (collided) {
        if (collided.wormholes) {
          var output = collided.wormholes[0];
          var vx = particle.velocity.x;
          var vy = particle.velocity.y;
          var v = Math.sqrt(vx * vx + vy * vy);
          particle.position.x = output.position.x + output.radius * vx / v;
          particle.position.y = output.position.y + output.radius * vy / v;
        }
        else {
          if (collided.mat === particle.mat)
            collided.shrink();
          else
            collided.grow();
          collided.play();

          return false;
        }
      }

      if (!last || Math.abs(particle.position.x - last.position.x) > particle_radius / 2 || Math.abs(particle.position.y - last.position.y) > particle_radius / 2) {
        var mesh = particle.getMesh();
        meshes.push(mesh);
        last = mesh;
      }
    }
    return true;
  });

  meshes.forEach(function(mesh) {
    scene.add(mesh);
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
        var dx = Math.abs(mouse_position.x - start_position.x);
        var dy = Math.abs(mouse_position.y - start_position.y);
        var dist = bound(Math.sqrt(dx * dx + dy * dy), min_sink_radius, max_sink_radius);

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
  var a = framebuffer2;
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

var context = new AudioContext();

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
  var oscillator = context.createOscillator();
  oscillator.frequency.value = freq;
  oscillator.type = type;
  return oscillator;
}

function gen_adsr(a, d, s, r, sustained_at) {
  var bufferSize = 1024;
  var total = a + d + s + r;
  var attack = a / total * bufferSize;
  var decay = d / total * bufferSize;
  var sustain = s / total * bufferSize;
  var release = r / total * bufferSize;

  var sustained_at = sustained_at || 0.8;

  var waveArray = new Float32Array(bufferSize);
  var count = 0;

  for (var i = 0; i < attack; ++i) {
    waveArray[++count] = i / attack;
  }

  for (var i = 0; i < decay; ++i) {
    waveArray[++count] = 1.0 - (1.0 - sustained_at) * (i / decay);
  }

  for (var i = 0; i < sustain; ++i) {
    waveArray[++count] = sustained_at;
  }

  for (var i = 0; i < release; ++i) {
    waveArray[++count] = sustained_at - sustained_at * (i / release);
  }

  return waveArray;
}

function create_envelope(adsr, sustained_at) {
  return gen_adsr.apply(this, adsr.concat(sustained_at));
}

function envelope(adsr, duration) {
  var buf = create_envelope(adsr);

  var env = context.createGain();
  var start = 0;
  var stop = 0;

  return {
    start: function(time) {
      start = time;
      env.gain.value = 0.0;
      var dur = duration || stop - start;
      env.gain.setValueCurveAtTime(buf, start, dur);
    },
    stop: function(time) {
      stop = time;
      env.gain.value = 0.0;
      var dur = duration || stop - start;
      env.gain.setValueCurveAtTime(buf, start, dur);
    },
    connect: function(node) {
      env.connect(node);
    },
    node: env
  };
}

function gain(val) {
  var g = context.createGain();
  g.gain.value = val;
  return g;
}

function filter(freq, value, type) {
  value = value || 1;
  type = type || 'bandpass';
  var f = context.createBiquadFilter();
  f.type = type;
  f.frequency = freq;
  f.Q.value = value;
  return f;
}

function create_lfo(freq, amp) {
  var lfo = source(freq, 'sine');
  var lfoGain = context.createGain();
  lfoGain.gain.value = amp;
  lfo.connect(lfoGain);
  lfo.start(0);
  lfoGain.frequency = lfo.frequency;
  return lfoGain;
}

create_sound = marimba;

function pluck(note) {
  var s1 = source(note, 'sawtooth');
  var s2 = source(note, 'square');
  var s3 = source(octave(note, -1), 'sawtooth');
  var s4 = source(octave(note, -1), 'square');
  var s5 = source(note, 'triangle');
  var s6 = source(note, 'square');

  s1.detune = -5;
  s2.detune = -4;
  s3.detune = 1;
  s4.detune = 5;
  s5.detune = 3;
  s6.detune = 2;

  var g1 = gain(1.0);
  var g2 = gain(0.6);
  var g3 = gain(0.3);

  s1.connect(g1);
  s2.connect(g1);
  s3.connect(g2);
  s4.connect(g2);
  s5.connect(g3);
  s6.connect(g3);

  var filter_envelope = create_envelope([0.1,2,0,4], 1);
  for (var idx = 0; idx < filter_envelope.length; ++idx) {
    filter_envelope[idx] *= note;
    filter_envelope[idx] += 30;
  }

  var filter_envelope2 = create_envelope([0,1,2,0,4], 2);
  for (var idx = 0; idx < filter_envelope2.length; ++idx) {
    filter_envelope2[idx] *= octave(note, -1) * 0.5;
    filter_envelope2[idx] += 30;
  }

  var filter_envelope3 = create_envelope([0.1,3,6,4], 1);
  for (var idx = 0; idx < filter_envelope3.length; ++idx)
    filter_envelope3[idx] *= note;

  var f1 = filter(note, 3, 'lowpass');
  var f2 = filter(note, 10, 'lowpass');
  var f3 = filter(note, 0.1, 'highpass');

  var env1 = envelope([1,2,0,4], 0.3);
  var env2 = envelope([1,2,2,5], 0.1);

  g1.connect(f1);
  g2.connect(f2);
  g3.connect(f3);

  f1.connect(env1.node);
  f2.connect(env1.node);
  f3.connect(env2.node);

  var mg = gain(0.1);
  env1.node.connect(mg);
  env2.node.connect(mg);

  var sources = [s1, s2, s3, s4, s5, s6, env1, env2];

  var start = 0;
  var stop = 0;

  return {
    start: function(time) {
      start = time;
      sources.forEach(function(s) {
        s.start(time);
      });
      f1.frequency.setValueCurveAtTime(filter_envelope, start, stop - start);
      f2.frequency.setValueCurveAtTime(filter_envelope2, start, stop - start);
      f3.frequency.setValueCurveAtTime(filter_envelope3, start, stop - start);
    },
    stop: function(time) {
      stop = time;
      sources.forEach(function(s) {
        s.stop(time);
      });
      f1.frequency.setValueCurveAtTime(filter_envelope, start, stop - start);
      f2.frequency.setValueCurveAtTime(filter_envelope2, start, stop - start);
      f3.frequency.setValueCurveAtTime(filter_envelope3, start, stop - start);
    },
    connect: function(node) {
      mg.connect(node);
    }
  };
}

function marimba(note) {
  var lfo1 = create_lfo(0.5, 4);
  var lfo2 = create_lfo(0.4, 3);
  var lfo3 = create_lfo(0.3, 2);
  var lfo4 = create_lfo(0.2, 1);

  /*
  var lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.001;
  lowpass.frequency = note;
  */

  var highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.Q.value = 0.01;
  highpass.frequency = note;

  var bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.Q.value = 1;
  bandpass.frequency = note;

  //lowpass.connect(bandpass);
  //bandpass.connect(highpass);
  //lowpass.connect(highpass);

  var filter_in = bandpass;
  var filter_out = bandpass;

  var s1 = source(note, 'triangle');
  var s2 = source(note, 'square');
  var s3 = source(octave(note, 2), 'triangle');
  var s4 = source(pitch(octave(note, 3), 4), 'triangle');

  var f1 = filter(note, 0.1, 'lowpass');
  var f2 = filter(octave(note, 2), 10, 'lowpass');
  var f3 = filter(pitch(octave(note, 3), 4), 20, 'lowpass');

  var g1 = gain(1.0);
  var g2 = gain(0.3);
  var g3 = gain(0.50);
  var g4 = gain(0.25);

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

  var env = envelope([0,1,1,20]);
  f1.connect(env.node);
  f2.connect(env.node);
  f3.connect(env.node);

  var sources = [s1, s2, s3, s4, env];

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

var repeat = false;
var test_sound = false;
function test() {
  var s = create_sound(440);
  s.start(0);
  s.stop(0.4);
  var c = context.createDynamicsCompressor();
  s.connect(c);
  c.connect(context.destination);
}

function play(note) {
  if (Array.isArray(note)) {
    return note.map(play).reduce(function(accum, next) { accum.push(next); return accum; }, []);
  }
  else {
    return create_sound(note);
  }
}

var bpm = 120 * 2;
var spb = 60 / bpm;

var A = 110;

var notes = {
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
  for (var key in notes) {
    window[key] = notes[key];
  }

  var scale = octave_range(pentatonic_minor(C));
  return [scale[int(rand(0, scale.length))]];
}

function octave_range(scale, below, above) {
  below = below || 0;
  above = above || 0;

  var notes = [];
  for (var i = -below; i <= above; ++i) {
    notes = notes.concat(octave(scale, i));
  }
  return notes;
}

function createScore() {
  for (var key in notes) {
    window[key] = notes[key];
  }

  var scale = octave_range(aug(C));

  var score = [];
  for (var i = 0; i < 100; ++i) {
    var beat = [];
    var n1 = Math.floor(Math.random() * 5);
    var n2 = Math.floor(Math.random() * 5);
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

/*
function createScore() {
  for (var key in notes) {
    window[key] = notes[key];
  }

  var scale_up = minor_pentatonic(C);
  var scale_down = minor_pentatonic(C).reverse();

  var score = [
    scale_up,
    octave(scale_up, 1),
    octave(scale_up, 2),
    octave(scale_up, 3),
    octave(C, 4),
    octave(scale_down, 3),
    octave(scale_down, 2),
    octave(scale_down, 1),
    C
  ].reduce(function(accum, next) {
    return accum.concat(next);
  }, []);
  return score;
};
*/

/*
function createScore() {
  for (var key in notes) {
    window[key] = notes[key];
  }

  var score = [
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [As, octave(D, -1), octave(G, -2)],
    [A, octave(D, -1), octave(F, -2)],
    [A, octave(D, -1), octave(F, -2)],
    [A, octave(D, -1), octave(F, -2)],
    [A, octave(D, -1), octave(F, -2)],
    [octave(F, -1), octave(D, -1), octave(As, -1)],
    [octave(F, -1), octave(D, -1), octave(As, -1)],
    [octave(F, -1), octave(D, -1), octave(As, -1)],
    [octave(F, -1), octave(D, -1), octave(As, -1)],
    [octave(F, -1), octave(D, -1), octave(As, -1)]
  ];
  return score.concat(score).concat(score);
}
*/

if (!test_sound) {
  //score = play(createScore());
  //perform(score);
}
else {
  test();
}

// http://stackoverflow.com/questions/22525934/connecting-convolvernode-to-an-oscillatornode-with-the-web-audio-the-simple-way
function impulseResponse( duration, decay, reverse ) {
  var sampleRate = context.sampleRate;
  var length = sampleRate * duration;
  var impulse = context.createBuffer(2, length, sampleRate);
  var impulseL = impulse.getChannelData(0);
  var impulseR = impulse.getChannelData(1);

  if (!decay)
    decay = 2.0;

  for (var i = 0; i < length; i++){
    var n = reverse ? length - i : i;
    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
  }
  return impulse;
}

var bufferSize = 1024;

// http://noisehack.com/generate-noise-web-audio-api/
function createWhiteNoise() {
  var noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
  var output = noiseBuffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  var whiteNoise = context.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;
  whiteNoise.start();
  return whiteNoise;
}

function createPinkNoise() {
  var b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
  var node = context.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = function(e) {
    var output = e.outputBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
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
  var lastOut = 0.0;
  var node = context.createScriptProcessor(bufferSize, 1, 1);
  node.onaudioprocess = function(e) {
    var output = e.outputBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly) compensate for gain
    }
  };
  return node;
};


function loadSound(url, cb) {
  var request = new XMLHttpRequest();
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
  var source = context.createBufferSource();
  source.buffer = buffer;
  //source.loop = true;
  source.playbackRate.value = 1;
  source.start(0);

  var filter = context.createBiquadFilter();
  filter.type = 'allpass';

  var gain = context.createGain();
  gain.gain.value = 5.0;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
}

function playSound(buffer) {
  var source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function get_resources(prefix) {
  var names = ['a', 'as', 'h', 'c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs'];
  var results = [];
  for (var i = 1; i <= 5; ++i) {
    results = results.concat(names.map(function(note) { return {note: note + i, uri: prefix + note + i + '.wav'}; } ));
  }
  return results;
}

function load_resources(cb) {
  var resources = get_resources('/samples/');

  var marimba = {};
  resources.map(function(resource) {
    function onLoad(err, buffer) {
      marimba[resource.note] = buffer;
      if (Object.keys(marimba).length === resources.length)
        cb(null, marimba);
    }
    loadSound(resource.uri, onLoad);
  });
};

/*
load_resources(function(err, results) {
  perform([
    [playSound(results.c3)],
    [playSound(results.d3)],
    [playSound(results.e3)],
    [playSound(results.f3)],
    [playSound(results.g3)],
    [playSound(results.a3)],
    [playSound(results.h3)],
    [playSound(results.c4)]
  ]);
});
*/

function initAudioGraph() {
  var convolve = context.createConvolver();
  convolve.buffer = impulseResponse(0.5, 20, false);

  var delay = context.createDelay();
  delay.delayTime.value = spb / 2;

  var feedback = context.createGain();
  feedback.gain.value = 0.5;

  var wetlevel = context.createGain();
  wetlevel.gain.value = 0.25;

  delay.connect(feedback);
  feedback.connect(delay);

  delay.connect(wetlevel);

  var masterGain = gain(1);

  var compressor = context.createDynamicsCompressor();

  convolve.connect(masterGain);
  masterGain.connect(delay);

  masterGain.connect(compressor);
  wetlevel.connect(compressor);

  compressor.connect(context.destination);

  return convolve;
}

var graph = initAudioGraph();

function perform(score) {
  /*
  var noise = createBrownNoise();
  var noiseGain = context.createGain();
  noiseGain.gain.value = 0.1;
  noise.connect(noiseGain);
  noiseGain.connect(context.destination);
  */

  score.forEach(function(chord, idx) {
    if (!Array.isArray(chord))
      chord = [chord];

    chord.map(function(c) {
      var start = context.currentTime + idx * spb;
      var stop = context.currentTime + spb * idx + spb;

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
