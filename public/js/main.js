window.onresize = init;
window.onclick = onLeftClick;
window.oncontextmenu = onRightClick;

function onRightClick(evt) {
  evt.preventDefault();
  sink(evt.x, evt.y);
}

function onLeftClick(evt) {
  particle(evt.x, evt.y);
}

var width = window.innerWidth;
var height = window.innerHeight;
var depth = 1000;

var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

var particles = [];
var sinks = [];

var palette = [
  0x0000ff, 0x00ff00, 0x00ffff, 0xff0000, 0xff00ff, 0xffff00
];

var materials = palette.map(function(color) {
  return new THREE.MeshBasicMaterial({color: color});
});

var particle_geometry = new THREE.CircleGeometry(5, 30);
var sink_geometry = new THREE.CircleGeometry(10, 30);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function int(val) {
  return Math.floor(val);
}

function randMat() {
  return materials[int(rand(0, materials.length))];
}

function particle(x, y) {
  var mat = randMat();
  var mesh = new THREE.Mesh(particle_geometry, mat);
  mesh.position.x = x;
  mesh.position.y = height - y;
  mesh.position.z = 1;
  mesh.velocity = {x: rand(-3, 3), y: rand(-3, 3), z: rand(0, 5)};
  scene.add(mesh);
  particles.push(mesh);
}

function sink(x, y) {
  var mat = randMat();
  var mesh = new THREE.Mesh(sink_geometry, mat);
  mesh.position.x = x;
  mesh.position.y = height - y;
  mesh.position.z = 1;
  scene.add(mesh);
  sinks.push(mesh);
}

function init() {

width = window.innerWidth;
height = window.innerHeight;
depth = 1000;

var bounds = {
  x: [0, width],
  y: [0, height],
  z: [1, depth]
}

console.log(width, height);
var camera = new THREE.OrthographicCamera( 0, width, height, 0, 0, 1000 );
camera.position.x = 0;
camera.position.y = 0;
camera.position.z =  1000;

renderer.setSize(width, height);

var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
var accum = new THREE.WebGLRenderTarget(width, height, parameters);

var composer = new THREE.EffectComposer(renderer);

var savePass = new THREE.SavePass(accum);

var texturePass = new THREE.TexturePass(savePass.renderTarget);

var renderPass = new THREE.RenderPass(scene, camera);
//renderPass.clear = false;

var blurShader = new THREE.ShaderPass(THREE.BlurShader);
blurShader.uniforms.width.value = 1.0 / width / 2;
blurShader.uniforms.height.value = 1.0 / height / 2;

var blendShader = new THREE.ShaderPass(THREE.AdditiveShader, 'tDiffuse1');
blendShader.uniforms.tDiffuse2.value = savePass.renderTarget;

var fadeShader = new THREE.ShaderPass(THREE.FadeShader);
fadeShader.uniforms.opacity.value = 0.95;

var copyPass = new THREE.ShaderPass(THREE.CopyShader);
copyPass.renderToScreen = true;

composer.addPass(texturePass);
composer.addPass(renderPass);
composer.addPass(blendShader);
composer.addPass(blurShader);
composer.addPass(fadeShader);
composer.addPass(savePass);
composer.addPass(copyPass);

function render() {
  //renderer.clear();
  composer.render();
  requestAnimationFrame(render);

  particles.forEach(function(particle) {
    var ax = 0;
    var ay = 0;

    sinks.forEach(function(sink) {
      // magnitude of acceleration = mass of sink * constant / distance squared
      var dx = sink.position.x - particle.position.x;
      var dy = sink.position.y - particle.position.y;

      var d2 = Math.pow(dx, 2) + Math.pow(dy, 2);
      var a = 1000 / d2;
      var d = Math.sqrt(d2);

      ax += a * dx / d;
      ay += a * dy / d;
    });

    particle.velocity.x = 0.99 * (particle.velocity.x + ax);
    particle.velocity.y = 0.99 * (particle.velocity.y + ay);

    ['x', 'y'].forEach(function(dim) {
      var newPosition = particle.position[dim] + particle.velocity[dim];
      if (newPosition < bounds[dim][0] || newPosition > bounds[dim][1])
        particle.velocity[dim] = -particle.velocity[dim];
      particle.position[dim] = newPosition;
      particle.verticesNeedUpdate = true;
    });
  });

  sinks.forEach(function(sink) {
    sink.verticesNeedUpdate = true;
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

function play(note) {
  if (Array.isArray(note)) {
    return note.map(play).reduce(function(accum, next) { accum.push(next); return accum; }, []);
  }
  else {
    var lfo = source(5, 'sine');
    var lfoGain = context.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);

    var s1 = source(note, 'triangle');
    var s2 = source(note, 'sine');
    var s3 = source(note, 'triangle');
    s1.detune.value = 2;
    s2.detune.value = -2;
    s3.detune.value = 0;
    //lfoGain.connect(s1.frequency);
    lfoGain.connect(s2.frequency);
    //lfoGain.connect(s3.frequency);

    return [lfo, s1, s2, s3];
  }
}

function chord(intervals, key) {
  key = key || notes.A;
  var results = [];
  intervals.forEach(function(interval) {
    //results.push(source(pitch(key, interval), 'sawtooth'));
    var s1 = source(pitch(key, interval), 'sine');
    var s2 = source(pitch(key, interval), 'sine');
    var s3 = source(pitch(key, interval), 'sine');
    s1.detune.value = 3;
    s2.detune.value = -3;
    s3.detune.value = 0;
    results.push(s1);
    results.push(s2);
    results.push(s3);
  });
  return results;
}

function major(key) {
  return chord([0, 4, 7, 12], key);
}

function minor(key) {
  return chord([0, 3, 7, 12], key);
}

function dim(key) {
  return chord([0, 3, 6, 9, 12], key);
}

function aug(key) {
  return chord([0, 4, 8, 12], key);
}

var bpm = 120 * 2;
var spb = 60 / bpm;

var A = 220;

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

/*
var chords = [
  major(notes.C),
  major(notes.G),
  minor(notes.A),
  major(notes.F)
];

var chords = [
  notes.C,
  notes.E,
  notes.G,
  octave(notes.C, 1),
  notes.G,
  notes.E,
  notes.C
].map(function(note) { return play(note); });
*/

function duration(note, beats) {
  note.beats = beats || 1;
  return note;
}

function minor_ascending(key) {
  return [0, null, 2, 3, 5, 7, 9, 11]
    .map(function(step) { return pitch(key, step); });
}

function minor_descending(key) {
  return [0, null, -2, -4, -5, -7, -9, -10]
    .map(function(step) { return pitch(key, step); });
}

function createScore() {
  for (var key in notes) {
    window[key] = notes[key];
  }

  var rest = 0;
  var scale_up = minor_ascending(C);
  var scale_down = minor_descending(C);

  var score = [
    scale_up,
    octave(scale_up, 1),
    octave(scale_up, 2),
    octave(scale_down, 3),
    octave(scale_down, 2),
    octave(scale_down, 1),
    C
  ].reduce(function(accum, next) {
    return accum.concat(next);
  }, []);
  return score;
};
score = play(createScore());

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
  console.log(node);
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
  console.log(node);
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

function perform(score) {
  var filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1;

  /*
  var noise = createBrownNoise();
  var noiseGain = context.createGain();
  noiseGain.gain.value = 0.1;
  noise.connect(noiseGain);
  noiseGain.connect(context.destination);
  */

  //var convolve = context.createConvolver();
  //convolve.buffer = impulseResponse(0.75, 2, false);
  //filter.connect(convolve);
  var convolve = filter;

  score.forEach(function(chord, idx) {
    if (!Array.isArray(chord))
      chord = [chord];

    chord.map(function(c) {
      var start = context.currentTime + idx * spb;
      var stop = context.currentTime + spb * idx + spb;

      c.connect(filter);
      c.start(start);
      c.stop(stop);
    });
  });

  var delay = context.createDelay();
  delay.delayTime.value = spb / 2;

  var feedback = context.createGain();
  feedback.gain.value = 0.25;

  var wetlevel = context.createGain();
  wetlevel.gain.value = 0.25;

  delay.connect(feedback);
  feedback.connect(delay);

  delay.connect(wetlevel);

  var lfo = context.createOscillator();
  lfo.frequency.value = 10;

  var lfoGain = context.createGain();
  lfoGain.gain.value = 0.05;

  lfo.connect(lfoGain);

  var gain = context.createGain();
  gain.gain.value = 10;

  lfoGain.connect(gain.gain);
  lfo.start();

  var compressor = context.createDynamicsCompressor();

  convolve.connect(gain);
  gain.connect(delay);

  gain.connect(compressor);
  wetlevel.connect(compressor);

  compressor.connect(context.destination);
};

//perform(score);

function audio() {
  //var sources = aug(440);

  //var sources = play([notes.C, notes.E, notes.G, octave(notes.E, -1)]);

  /*
  var gain = context.createGain();
  gain.gain.value = 0.02;

  sources.map(function(source) {
    source.connect(gain);
    source.noteOn(0);
  });

  gain.connect(context.destination);
  */
}

audio();
