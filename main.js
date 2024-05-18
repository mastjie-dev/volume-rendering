import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise'
import GUI from 'lil-gui'

import blue from './public/HDR_LA_0.png'
import shaderVolume from './shaderVolume'

main()

function main() {
  const width = window.innerWidth
  const height = window.innerHeight
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pCamera = new THREE.PerspectiveCamera(75, width / height, .1, 1000)
  pCamera.position.set(0, 0, 15)
  const oCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10)
  oCamera.position.set(0, 0, 1)
  const control = new OrbitControls(pCamera, renderer.domElement)

  const blueNoiseTex = new THREE.TextureLoader().load(blue)

  const perlin = new ImprovedNoise()
  let i = 0
  const scale = .1
  const size = 128
  const data = new Uint8Array(size*size*size)
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        let n = perlin.noise(x * scale, y * scale, z * scale) * .5 + .5
        n += perlin.noise(x * scale * 2, y * scale * 2, z * scale * 2) * .5 + .5
        n += perlin.noise(x * scale * 4, y * scale * 4, z * scale * 4) * .5 + .5
        n += perlin.noise(x * scale * 8, y * scale * 8, z * scale * 8) * .5 + .5
        n /= 3.5

        data[i] = Math.floor(n * 255)
        i++
      }
    }
  }
  
  const perlinNoiseTex = new THREE.Data3DTexture(data, size, size, size)
  perlinNoiseTex.magFilter = THREE.LinearFilter
  perlinNoiseTex.minFilter = THREE.LinearFilter
  perlinNoiseTex.wrapS = THREE.RepeatWrapping
  perlinNoiseTex.wrapT = THREE.RepeatWrapping
  perlinNoiseTex.wrapR = THREE.RepeatWrapping
  perlinNoiseTex.format = THREE.RedFormat
  perlinNoiseTex.unpackAlignment = 1
  perlinNoiseTex.needsUpdate = true

  const vCamPos = new THREE.Vector3()
  const vUniforms = {
    example: { value: 1 },
    radius: { value: 5 },
    camPos: { value: vCamPos },
    resolution: { value: new THREE.Vector2(width, height) },
    boxMin: { value: new THREE.Vector3(-10, -10, -10) },
    boxMax: { value: new THREE.Vector3(10, 10, 10) },
    blueNoise: { value: blueNoiseTex },
    perlinNoise: { value: perlinNoiseTex },
    noiseScale: { value: 2 },
    noiseStrength: { value: 2 },
    absorbCoef: { value: .5 },
    scatterCoef: { value: .5 },
    lightStrength: { value: 5. },
    time: { value: 0 },
    timeScale: { value: 2 },
    lightPosition: { value: new THREE.Vector3(0, 10, 5) },
    noiseMin: { value: .45 },
    noiseMax: { value: .9 },
    colorA: { value: new THREE.Color(0xFFEC80) },
    colorB: { value: new THREE.Color(0x7b4e24) },
  }
  const vMat = new THREE.ShaderMaterial({
    uniforms: vUniforms,
    vertexShader: shaderVolume.vertexShader,
    fragmentShader: shaderVolume.fragmentShader,
    transparent: true,
  })
  const vGeo = new THREE.PlaneGeometry(2, 2)
  const vMesh = new THREE.Mesh(vGeo, vMat)
  scene.add(vMesh)

  const rObj = {
    example: "A"
  }

  const vObj = {
    radius: 5,
    noiseScale: 2,
    noiseStrength: 2,
    absorbCoef: .5,
    scatterCoef: .5,
    lightStrength: 5,
    timeScale: 2,
    noiseMin: .45,
    noiseMax: .9,
    lightPosX: 0,
    lightPosY: 10,
    lightPosZ: 0,
    colorA: 0xFFEC80,
    colorB: 0x7b4e24,
  }

  const gui = new GUI()
  gui.add(rObj, "example", ["A", "B"]).onChange(e => {
    if (e === "A") { vUniforms.example.value = 1 }
    else { vUniforms.example.value = 2 }
  })

  const opts = gui.addFolder("Options")
  opts.add(vObj, "radius", 1, 10).onChange(e => vUniforms.radius.value = e)
  opts.add(vObj, "noiseScale", 0, 10).onChange(e => vUniforms.noiseScale.value = e)
  opts.add(vObj, "absorbCoef", 0, 2).onChange(e => vUniforms.absorbCoef.value = e)
  opts.add(vObj, "scatterCoef", 0, 2).onChange(e => vUniforms.scatterCoef.value = e)
  opts.add(vObj, "timeScale", 0, 10).onChange(e => vUniforms.timeScale.value = e)

  const aExp = gui.addFolder("Example A")
  aExp.add(vObj, "lightStrength", 0, 10).onChange(e => vUniforms.lightStrength.value = e)
  aExp.add(vObj, "noiseStrength", 0, 10).onChange(e => vUniforms.noiseStrength.value = e)
  aExp.add(vObj, "lightPosX", -10, 10).onChange(e => vUniforms.lightPosition.value.x = e)
  aExp.add(vObj, "lightPosY", -10, 10).onChange(e => vUniforms.lightPosition.value.y = e)
  aExp.add(vObj, "lightPosZ", -10, 10).onChange(e => vUniforms.lightPosition.value.z = e)

  const bExp = gui.addFolder("Example B")
  bExp.add(vObj, "noiseMin", 0, 1).onChange(e => vUniforms.noiseMin.value = e)
  bExp.add(vObj, "noiseMax", 0, 1).onChange(e => vUniforms.noiseMax.value = e)
  bExp.addColor(vObj, "colorA").onChange(e => vUniforms.colorA.value.set(e))
  bExp.addColor(vObj, "colorB").onChange(e => vUniforms.colorB.value.set(e))
  
  const renderTarget = new THREE.RenderTarget(width / 4, height / 4)
  const composer = new EffectComposer(renderer, renderTarget)
  composer.addPass(new RenderPass(scene, oCamera))
  
  VerticalBlurShader.uniforms.v.value = 1. / (width / 2)
  HorizontalBlurShader.uniforms.h.value = 1. / (height / 2)
  composer.addPass(new ShaderPass(VerticalBlurShader))
  composer.addPass(new ShaderPass(HorizontalBlurShader))

  const stats = new Stats()
  document.body.appendChild(stats.dom)
  renderer.setAnimationLoop(() => {
    vCamPos.copy(pCamera.position)
    vMesh.worldToLocal(vCamPos)
    vUniforms.camPos.value.copy(vCamPos)
    vUniforms.time.value += .016

    composer.render()
    stats.update()
  })

  window.onresize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h)
    pCamera.aspect = w / h
    pCamera.updateProjectionMatrix()

    VerticalBlurShader.uniforms.v.value = 1 / (w / 2)
    HorizontalBlurShader.uniforms.h.value = 1 / (w / 2)
    
    vUniforms.resolution.value.set(w, h)
    // pmat.uniforms.texelRes.value.set(window.innerWidth / 4, window.innerHeight / 4)
  }
}
