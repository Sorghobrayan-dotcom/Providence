import * as THREE from 'three';
import { Humanoid, type HumanoidPose } from '../scenes/Humanoid';
import type { Arc, Directive } from '../providence/types';
import { ADVERSARY_ARCS } from '../providence/adversaries';

/**
 * The editor viewport, which is the actual game rather than a diagram of it.
 *
 * Nothing here decides anything. It receives the Directive the library produced
 * this frame and stages it: where the body goes, and what the body does. That
 * is the whole claim of the project made visible, so it matters that the
 * movement on screen is driven by the same object the tests assert against.
 */

const PALETTE = {
  ground: 0xb3a184,
  fog: 0x6d6455,
  skyTop: 0x2c3244,
  skyBottom: 0x8d7a5f,
  bark: 0x4a453c,
  sage: 0x8a9070,
  gold: 0xe0c98f,
} as const;

const groundHeight = (x: number, z: number): number =>
  Math.sin(x * 0.22) * Math.cos(z * 0.19) * 0.1 + Math.sin(x * 0.5 + 1.3) * 0.04;

/** Where the world sits, in metres. The editor thinks in 0..1, so we scale. */
const SPAN = 9;
const toWorld = (p: { x: number; y: number }): [number, number] => [
  (p.x - 0.5) * SPAN * 2,
  (p.y - 0.5) * SPAN * 2,
];

export class Stage3D {
  private readonly gl: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;

  private readonly envoy = new Humanoid();
  private readonly other = new Humanoid();
  private readonly envoyPivot = new THREE.Group();
  private readonly otherPivot = new THREE.Group();
  private readonly errandMarker: THREE.Mesh;
  private readonly otherLight: THREE.PointLight;

  private elapsed = 0;
  private isShadow = false;
  private readonly camTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;

    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.03);
    this.camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 200);

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildTrees();

    this.envoy.setSkin('ambre');
    this.envoy.setHue(PALETTE.gold);
    this.envoyPivot.add(this.envoy.root);
    this.scene.add(this.envoyPivot);

    this.otherPivot.add(this.other.root);
    this.scene.add(this.otherPivot);

    this.otherLight = new THREE.PointLight(0xffffff, 0, 8, 2);
    this.otherLight.position.y = 1.1;
    this.otherPivot.add(this.otherLight);

    // the errand: the thing Jonah runs away from
    this.errandMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 8, 28),
      new THREE.MeshStandardMaterial({
        color: 0x9aa4b4, emissive: 0x5a6675, emissiveIntensity: 0.6, roughness: 0.6,
      }),
    );
    this.errandMarker.rotation.x = Math.PI / 2;
    this.scene.add(this.errandMarker);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  private buildSky(): void {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyTop) },
        bottom: { value: new THREE.Color(PALETTE.skyBottom) },
      },
      vertexShader: `varying float vH;
        void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying float vH;
        void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.2, 0.6, vH)), 1.0); }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 20, 14), mat));
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb9c2d0, 0xb8946a, 0.9));
    const sun = new THREE.DirectionalLight(0xffe0b0, 1.4);
    sun.position.set(-6, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const c = sun.shadow.camera;
    c.near = 1; c.far = 40; c.left = -16; c.right = 16; c.top = 16; c.bottom = -16;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x8ea3c4, 0.55);
    rim.position.set(4, 4, -8);
    this.scene.add(rim);
  }

  private buildGround(): void {
    const geo = new THREE.PlaneGeometry(70, 70, 70, 70);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.97 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);

    const blade = new THREE.PlaneGeometry(0.05, 0.4);
    blade.translate(0, 0.2, 0);
    const grass = new THREE.InstancedMesh(
      blade,
      new THREE.MeshStandardMaterial({ color: 0xb8946a, roughness: 0.85, side: THREE.DoubleSide }),
      600,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 14;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      dummy.position.set(x, groundHeight(x, z), z);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
      dummy.scale.setScalar(0.6 + Math.random() * 0.7);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(grass);
  }

  private buildTrees(): void {
    const trunk = new THREE.CylinderGeometry(0.05, 0.16, 3, 7);
    trunk.translate(0, 1.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.bark, roughness: 0.9 });
    const canopy = new THREE.IcosahedronGeometry(1, 1);
    const cp = canopy.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      const b = 1 + Math.sin(x * 4 + z * 3) * 0.22;
      cp.setXYZ(i, x * b, y * b * 0.7, z * b);
    }
    canopy.computeVertexNormals();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: PALETTE.sage, roughness: 0.75,
      emissive: new THREE.Color(PALETTE.sage), emissiveIntensity: 0.16,
    });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const r = 12 + Math.random() * 6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const tree = new THREE.Group();
      tree.position.set(x, groundHeight(x, z), z);
      tree.scale.setScalar(0.85 + Math.random() * 0.6);
      const t = new THREE.Mesh(trunk, trunkMat);
      t.castShadow = true;
      t.rotation.z = (Math.random() - 0.5) * 0.2;
      tree.add(t);
      for (let c = 0; c < 3; c++) {
        const blob = new THREE.Mesh(canopy, canopyMat);
        blob.position.set((Math.random() - 0.5) * 1, 2.7 + Math.random() * 0.7, (Math.random() - 0.5) * 1);
        blob.scale.setScalar(0.7 + Math.random() * 0.5);
        blob.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        tree.add(blob);
      }
      this.scene.add(tree);
    }
  }

  private resize(): void {
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 360;
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Dress the actor for the arc that was just selected. */
  setArc(arc: Arc): void {
    this.isShadow = ADVERSARY_ARCS.some((a) => a.id === arc.id);
    if (this.isShadow) {
      this.other.becomeShadow();
      this.other.root.scale.set(1.12, 1.08, 1.12);
      this.otherLight.color.setHex(0xe8432b);
    } else {
      this.other.setSkin('clair');
      this.other.setHue(0x8fb0c9);
      this.other.root.scale.setScalar(1);
      this.otherLight.color.setHex(0x8fb0c9);
    }
  }

  /**
   * Turn a Directive into a pose. The library says what the character intends;
   * this decides only how a body shows it.
   */
  private poseFor(directive: Directive, moving: boolean): HumanoidPose {
    const p = directive.posture;
    if (p === 'lying-down' || p === 'fallen' || p === 'prostrate') return { kind: 'downed' };
    if (p === 'withdrawn' || p === 'weeping') return { kind: 'stagger' };
    if (directive.blocking) return { kind: 'parry' };
    if (directive.hostile && (p === 'hurling' || p === 'advancing' || p === 'charioteering')) {
      return { kind: 'attack', progress01: (this.elapsed % 1.2) / 1.2 };
    }
    if (directive.suppressesParty || directive.offering || p === 'citing' || p === 'taunting') {
      return { kind: 'telegraph', charge01: 0.35 + Math.sin(this.elapsed * 2) * 0.3 };
    }
    return moving ? { kind: 'walk', speed01: 0.75 } : { kind: 'idle' };
  }

  render(
    dtSeconds: number,
    directive: Directive,
    player: { x: number; y: number },
    actorPos: { x: number; y: number },
    errand: { x: number; y: number },
  ): void {
    this.elapsed += dtSeconds;

    const [px, pz] = toWorld(player);
    const [ax, az] = toWorld(actorPos);
    const [ex, ez] = toWorld(errand);

    this.envoyPivot.position.set(px, groundHeight(px, pz), pz);
    this.otherPivot.position.set(ax, groundHeight(ax, az), az);
    this.errandMarker.position.set(ex, groundHeight(ex, ez) + 0.6, ez);
    this.errandMarker.rotation.z += dtSeconds * 0.6;

    // the Envoy always faces whoever he is watching
    this.envoyPivot.rotation.y = Math.atan2(ax - px, az - pz);
    this.envoy.applyPose({ kind: 'idle' }, dtSeconds * 1000, this.elapsed);

    // the actor faces where its directive is taking it
    const facing =
      directive.move === 'toward-player' ? Math.atan2(px - ax, pz - az) :
      directive.move === 'away-from-player' ? Math.atan2(ax - px, az - pz) :
      directive.move === 'toward-errand' ? Math.atan2(ex - ax, ez - az) :
      directive.move === 'away-from-errand' ? Math.atan2(ax - ex, az - ez) :
      this.otherPivot.rotation.y;

    let d = facing - this.otherPivot.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.otherPivot.rotation.y += d * Math.min(1, dtSeconds * 8);

    this.other.applyPose(this.poseFor(directive, directive.move !== 'hold'), dtSeconds * 1000, this.elapsed);
    this.otherLight.intensity = this.isShadow ? 1.6 : 0.9;

    // frame both, backing off as they separate
    const spread = Math.hypot(ax - px, az - pz);
    this.camTarget.lerp(new THREE.Vector3((px + ax) / 2, 1.1, (pz + az) / 2), 0.08);
    this.camera.position.lerp(
      new THREE.Vector3(this.camTarget.x, 3.4 + spread * 0.14, this.camTarget.z + 7.5 + spread * 0.5),
      0.08,
    );
    this.camera.lookAt(this.camTarget);

    this.gl.render(this.scene, this.camera);
  }
}
