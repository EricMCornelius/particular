var width = window.innerWidth;
var height = window.innerHeight;
var depth = 1000;

var bounds = {
  x: [-width / 2, width / 2],
  y: [-height / 2, height / 2],
  z: [1, depth]
}

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.z = 1000;
//var camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 0, 1000 );

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

var palette = [
  0xff0000, 0x00ff00, 0x0000ff
];

var materials = palette.map(function(color) {
  return new THREE.MeshBasicMaterial({color: color});
});

var num_particles = 100;
var particles = [];
var geo = new THREE.CircleGeometry(10, 100);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function int(val) {
  return Math.floor(val);
}

function randMat() {
  return materials[int(rand(0, materials.length))];
}

for (var i = 0; i < num_particles; ++i) {
  var mat = randMat();
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.x += rand(width / -2, width / 2);
  mesh.position.y += rand(height / -2, height / 2);
  mesh.velocity = {x: rand(0, 1), y: rand(0, 1), z: rand(0, 5)};
  scene.add(mesh);
  particles.push(mesh);
}

//camera.position.z = 1;

//console.log(width, height)
var parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
var accum = new THREE.WebGLRenderTarget(width, height, parameters);
var target = new THREE.WebGLRenderTarget(width, height, parameters);
var saveShader = new THREE.SavePass(accum);

var composer = new THREE.EffectComposer(renderer, target);
var renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

var blurShader = new THREE.ShaderPass(THREE.BlurShader);
blurShader.uniforms.width.value = 1.0 / width;
blurShader.uniforms.height.value = 1.0 / height;
composer.addPass(blurShader);

var blendShader = new THREE.ShaderPass(THREE.BlendShader, 'tDiffuse1');
blendShader.uniforms.tDiffuse2.value = accum;
blendShader.uniforms.mixRatio.value = 0.5;
//blendShader.renderToScreen = true;
composer.addPass(blendShader);

composer.addPass(saveShader);

/*
var fadeShader = new THREE.ShaderPass(THREE.FadeShader);
fadeShader.uniforms.opacity.value = 0.99;
fadeShader.renderToScreen = true;
composer.addPass(fadeShader);
*/

function render() {
  requestAnimationFrame(render);
  composer.render();
  renderer.clear();
  //renderer.render(scene, camera, target);

  particles.forEach(function(particle) {
    ['x', 'y'].forEach(function(dim) {
      var newPosition = particle.position[dim] + particle.velocity[dim];
      if (newPosition < bounds[dim][0] || newPosition > bounds[dim][1])
        particle.velocity[dim] = -particle.velocity[dim];
      particle.position[dim] = newPosition;
      particle.verticesNeedUpdate = true;
    });
  })
}
render();
