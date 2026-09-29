/**
 * VogueVault - Professional 3D Background
 * Shader-driven undulating mesh - dark silk fabric aesthetic
 * Used by Stripe, Linear, and luxury fashion brands
 */
(function () {
  'use strict';

  var THEME = {
    dark: {
      bg:        [0.043, 0.047, 0.071],
      meshColor: [0.545, 0.118, 0.247],
      lineColor: [0.651, 0.259, 0.376],
    },
    light: {
      bg:        [0.965, 0.949, 0.925],
      meshColor: [0.545, 0.118, 0.247],
      lineColor: [0.651, 0.259, 0.376],
    },
  };

  var VERT = [
    'uniform float uTime;',
    'uniform float uAmplitude;',
    'uniform float uFrequency;',
    'uniform float uSpeed;',
    'varying float vElevation;',
    'varying vec2  vUv;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i+vec2(0,0)),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v=0.0; float a=0.5;',
    '  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.1+vec2(1.7,9.2);a*=0.5;}',
    '  return v;',
    '}',
    'void main() {',
    '  vUv = uv;',
    '  vec3 pos = position;',
    '  float wave1 = sin(pos.x*uFrequency + uTime*uSpeed)*cos(pos.y*uFrequency*0.7+uTime*uSpeed*0.6);',
    '  float n = fbm(vec2(pos.x*0.18+uTime*0.06, pos.y*0.18-uTime*0.04));',
    '  float wave2 = sin((pos.x+pos.y)*uFrequency*0.5+uTime*uSpeed*0.4)*0.4;',
    '  pos.z += (wave1*0.6 + wave2*0.3 + (n-0.5)*1.0) * uAmplitude;',
    '  vElevation = pos.z;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);',
    '}',
  ].join('\n');

  var FRAG = [
    'uniform vec3  uBgColor;',
    'uniform vec3  uMeshColor;',
    'uniform float uAmplitude;',
    'varying float vElevation;',
    'varying vec2  vUv;',
    'void main() {',
    '  float t = clamp((vElevation/uAmplitude)*0.5+0.5, 0.0, 1.0);',
    '  vec3 col = mix(uBgColor*0.82, uMeshColor, t*t*0.52);',
    '  float dist = length(vUv-0.5)*2.0;',
    '  col = mix(col, uBgColor*0.55, smoothstep(0.65,1.3,dist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  var renderer, scene, camera, clock;
  var meshMaterial, wireMaterial, wireMesh, solidMesh;
  var currentTheme = 'dark';

  function init() {
    if (!window.THREE) return;
    var canvas = document.createElement('canvas');
    canvas.id = 'vv-bg-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene  = new THREE.Scene();
    clock  = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.set(0, -2, 6);
    camera.lookAt(0, 0, 0);

    currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    buildMesh();
    applyTheme(currentTheme);
    window.addEventListener('resize', onResize);
    observeTheme();
    animate();
  }

  function buildMesh() {
    var p = THEME[currentTheme];
    var geo = new THREE.PlaneGeometry(24, 16, 140, 90);

    meshMaterial = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:      { value: 0.0 },
        uAmplitude: { value: 1.05 },
        uFrequency: { value: 0.38 },
        uSpeed:     { value: 0.22 },
        uBgColor:   { value: new THREE.Vector3(p.bg[0], p.bg[1], p.bg[2]) },
        uMeshColor: { value: new THREE.Vector3(p.meshColor[0], p.meshColor[1], p.meshColor[2]) },
      },
      transparent: false,
      side: THREE.FrontSide,
    });

    solidMesh = new THREE.Mesh(geo, meshMaterial);
    solidMesh.rotation.x = -0.15;
    scene.add(solidMesh);

    var wireGeo = new THREE.PlaneGeometry(24, 16, 35, 22);
    wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.lineColor[0], p.lineColor[1], p.lineColor[2]),
      wireframe: true,
      transparent: true,
      opacity: 0.045,
    });
    wireMesh = new THREE.Mesh(wireGeo, wireMaterial);
    wireMesh.rotation.x = -0.15;
    wireMesh.position.z = 0.003;
    scene.add(wireMesh);
  }

  function applyTheme(theme) {
    var p = THEME[theme] || THEME.dark;
    renderer.setClearColor(new THREE.Color(p.bg[0], p.bg[1], p.bg[2]), 1);
    if (meshMaterial) {
      meshMaterial.uniforms.uBgColor.value.set(p.bg[0], p.bg[1], p.bg[2]);
      meshMaterial.uniforms.uMeshColor.value.set(p.meshColor[0], p.meshColor[1], p.meshColor[2]);
    }
    if (wireMaterial) {
      wireMaterial.color.setRGB(p.lineColor[0], p.lineColor[1], p.lineColor[2]);
      wireMaterial.opacity = theme === 'dark' ? 0.045 : 0.06;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    if (meshMaterial) { meshMaterial.uniforms.uTime.value = t; }
    camera.position.x = Math.sin(t * 0.04) * 0.4;
    camera.position.y = -2.0 + Math.cos(t * 0.03) * 0.15;
    camera.lookAt(0, 0.3, 0);
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function observeTheme() {
    var mo = new MutationObserver(function () {
      var t = document.documentElement.getAttribute('data-theme') || 'dark';
      if (t !== currentTheme) { currentTheme = t; applyTheme(t); }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function boot() {
    if (window.THREE) { init(); }
    else { var poll = setInterval(function(){if(window.THREE){clearInterval(poll);init();}},60); }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
}());
