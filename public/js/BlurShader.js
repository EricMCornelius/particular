THREE.BlurShader = {
  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "width":    { type: "f", value: 1.0 / 512.0 },
    "height":   { type: "f", value: 1.0 / 512.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"


  ].join("\n"),

  fragmentShader: [

    "uniform sampler2D tDiffuse;",
    "uniform float width;",
    "uniform float height;",

    "varying vec2 vUv;",

    "void main() {",

      "vec4 sum = vec4(0.0);",

      "sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * width, vUv.y - 1.0 * height)) * 1.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x,               vUv.y - 1.0 * height)) * 2.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * width, vUv.y - 1.0 * height)) * 1.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * width, vUv.y               )) * 2.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x,               vUv.y               )) * 4.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * width, vUv.y               )) * 2.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x - 1.0 * width, vUv.y + 1.0 * height)) * 1.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x,               vUv.y + 1.0 * height)) * 2.0;",
      "sum += texture2D(tDiffuse, vec2(vUv.x + 1.0 * width, vUv.y + 1.0 * height)) * 1.0;",

      "gl_FragColor = sum / 16.0;",

    "}"

  ].join("\n")
};

THREE.FadeShader = {
  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "opacity": { type: "f", value: 1.0 }

  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",

    "}"


  ].join("\n"),

  fragmentShader: [

    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "uniform float opacity;",

    "void main() {",

      "vec4 color = opacity * texture2D(tDiffuse, vUv) - 0.01;",
      "color.a = 1.0;",
      "gl_FragColor = color;",

    "}"

  ].join("\n")
};
