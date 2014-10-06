window.onresize = init;
window.onclick = onLeftClick;
window.oncontextmenu = onRightClick;

function onRightClick(evt) {
  evt.preventDefault();
  console.log(evt);
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

function pitch(base, half_steps) {
  return base * Math.pow(2, half_steps / 12);
}

function source(freq, type) {
  var oscillator = context.createOscillator();
  oscillator.frequency.value = freq;
  oscillator.type = type;
  return oscillator;
}

function major(freq) {
  return [
    source(pitch(freq, 0)),
    source(pitch(freq, 4)),
    source(pitch(freq, 7)),
    source(pitch(freq, 12))
  ];
}

function audio() {
  var sources = major(440);

  var gain = context.createGain();
  gain.gain.value = 0.01;

  sources.map(function(source) {
    source.connect(gain);
    source.noteOn(0);
  });

  gain.connect(context.destination);
}

audio();
