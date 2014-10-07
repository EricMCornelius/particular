/**
 *
 * Additively blend two textures
 */

THREE.AdditiveShader = {

	uniforms: {

		"tDiffuse1": { type: "t", value: null },
		"tDiffuse2": { type: "t", value: null },
		"opacity":   { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse1;",
		"uniform sampler2D tDiffuse2;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel1 = texture2D(tDiffuse1, vUv);",
			"vec4 texel2 = texture2D(tDiffuse2, vUv);",
			"vec4 color = opacity * (texel1 + texel2);",
			"color.a = 1.0;",
			"gl_FragColor = color;",

		"}"

	].join("\n")

};
