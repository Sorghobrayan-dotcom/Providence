import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Boss } from '../entities/Boss';
import type { Camera } from '../core/Camera';
import { Humanoid, type HumanoidPose } from './Humanoid';

/**
 * Three.js renderer for "La Nuit du Bâton". It is a pure VIEW: it never
 * decides anything, it only reads Player/Boss state each frame and stages it.
 * It deliberately exposes the exact same surface as the Canvas 2D renderer it
 * replaces — constructor(canvas), update(dtMs, player), draw({...}) — so the
 * scene swaps one for the other by changing a single import.
 */

/** Gameplay is authored in pixels; the world is metres. One place converts. */
const PX_PER_UNIT = 60;
const px = (v: number): number => v / PX_PER_UNIT;

const PALETTE = {
  ochre: 0xb8946a,
  ivory: 0xe8ddc7,
  beige: 0xc9b896,
  rockDark: 0x5f5a50,
  paleGold: 0xe0c98f,
  skyTop: 0x2c3244,
  skyBottom: 0x8d7a5f,
  fog: 0x6d6455,
  sage: 0x8a9070,
} as const;

/** Gentle ground relief, sampled so feet sit ON the bumps instead of through them. */
function groundHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.22) * Math.cos(z * 0.19) * 0.09 +
    Math.sin(x * 0.5 + 1.3) * Math.cos(z * 0.44 + 0.7) * 0.035
  );
}

/**
 * Ridged mountain profile. `1 - |sin|` produces SHARP crests where a plain
 * sine would only give soft hills. Every term is an INTEGER multiple of the
 * angle, so the profile closes perfectly around the ring — otherwise the
 * horizon shows a seam where the two ends of the band meet.
 */
function ridgeSilhouette(angle: number, seed: number): number {
  const ridged =
    (1 - Math.abs(Math.sin(angle * 3 + seed))) * 4.6 +
    (1 - Math.abs(Math.sin(angle * 7 + seed * 2.3))) * 1.9 +
    (1 - Math.abs(Math.sin(angle * 13 + seed * 0.9))) * 0.7;
  const massifs = Math.sin(angle * 2 + seed * 1.7) * 3.4 + Math.sin(angle + seed * 3.3) * 2.1;
  return ridged + massifs;
}

function softGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

export interface DrawArgs {
  readonly player: Player;
  readonly boss: Boss;
  readonly camera: Camera;
}

export class ThreeRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cam: THREE.PerspectiveCamera;

  private readonly envoy = new Humanoid();
  private readonly shadow = new Humanoid();
  private readonly envoyPivot = new THREE.Group();
  private readonly shadowPivot = new THREE.Group();

  private readonly envoyHalo: THREE.Mesh;
  private readonly envoyLight: THREE.PointLight;
  private readonly shadowAura: THREE.PointLight;
  private readonly restoreLight: THREE.PointLight;

  private elapsed = 0;
  private flash = 0;
  private lastPlayerState = '';
  private playerStateAge = 0;
  private lastBossState = '';
  private bossStateAge = 0;
  private readonly camTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.05;

    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.028);
    this.cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 300);

    this.buildSky();
    this.buildRidges();
    this.buildLights();
    this.buildGround();
    this.buildTreeRing();
    this.buildLanterns();
    this.buildDust();

    this.envoy.setSkin('ambre');
    this.envoy.setHue(PALETTE.paleGold);
    this.envoyPivot.add(this.envoy.root);
    this.scene.add(this.envoyPivot);

    this.shadow.setSkin('profond');
    this.shadow.becomeShadow();
    this.shadow.root.scale.set(1.16, 1.1, 1.16); // the Prince towers over the Envoy
    this.shadowPivot.add(this.shadow.root);
    this.scene.add(this.shadowPivot);

    const haloMat = new THREE.MeshBasicMaterial({
      color: PALETTE.paleGold, transparent: true, opacity: 0.16,
      side: THREE.BackSide, depthWrite: false,
    });
    this.envoyHalo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), haloMat);
    this.envoyHalo.position.y = 1.05;
    this.envoyHalo.scale.setScalar(1.85);
    this.envoyPivot.add(this.envoyHalo);

    this.envoyLight = new THREE.PointLight(PALETTE.paleGold, 2.4, 10, 2);
    this.envoyLight.position.y = 1.05;
    this.envoyPivot.add(this.envoyLight);

    this.shadowAura = new THREE.PointLight(0xe8432b, 1.5, 8, 2);
    this.shadowAura.position.y = 1.0;
    this.shadowPivot.add(this.shadowAura);

    this.restoreLight = new THREE.PointLight(0xffe6b0, 0, 30, 2);
    this.restoreLight.position.set(0, 2.4, 0);
    this.scene.add(this.restoreLight);

    this.canvas = canvas;
    this.resize();
    // the stage is a letterboxed 16:9 box, not the viewport: sizing off
    // window.innerWidth would stretch and blur the picture
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  private buildSky(): void {
    const geo = new THREE.SphereGeometry(140, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(PALETTE.skyTop) },
        bottom: { value: new THREE.Color(PALETTE.skyBottom) },
      },
      vertexShader: `varying float vH;
        void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying float vH;
        void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.15, 0.55, vH)), 1.0); }`,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  /**
   * Three concentric bands of mountains. They are unlit (MeshBasic) on
   * purpose: distance should be read through fog tinting and overlap, not
   * shading — that is what separates the planes and gives real depth.
   */
  private buildRidges(): void {
    const layers = [
      { radius: 58, height: 30, seed: 0.4, color: 0x5d5a52 },
      { radius: 76, height: 34, seed: 2.1, color: 0x6d6a60 },
      { radius: 95, height: 40, seed: 3.7, color: 0x7c786c },
    ];
    for (const layer of layers) {
      const geo = new THREE.CylinderGeometry(layer.radius, layer.radius, layer.height, 150, 1, true);
      const pos = geo.attributes['position'] as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const angle = Math.atan2(pos.getZ(i), pos.getX(i));
        // top ring gets the crest profile, bottom ring drops below the horizon
        pos.setY(i, pos.getY(i) > 0 ? ridgeSilhouette(angle, layer.seed) : -layer.height);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: layer.color, side: THREE.BackSide, fog: true }),
      );
      this.scene.add(mesh);
    }
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb9c2d0, PALETTE.ochre, 0.85));
    const sun = new THREE.DirectionalLight(0xffe0b0, 1.5);
    sun.position.set(-7, 11, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const c = sun.shadow.camera;
    c.near = 1;
    c.far = 40;
    c.left = -14;
    c.right = 14;
    c.top = 14;
    c.bottom = -14;
    this.scene.add(sun);
    // cool rim from behind, so silhouettes separate from the fog
    const rim = new THREE.DirectionalLight(0x8ea3c4, 0.6);
    rim.position.set(5, 4, -9);
    this.scene.add(rim);
  }

  private buildGround(): void {
    const geo = new THREE.PlaneGeometry(90, 90, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: PALETTE.beige, roughness: 0.96, metalness: 0 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);

    // sparse dry grass, thickest away from the duelling ground
    const blade = new THREE.PlaneGeometry(0.045, 0.42);
    blade.translate(0, 0.21, 0);
    const mesh = new THREE.InstancedMesh(
      blade,
      new THREE.MeshStandardMaterial({
        color: PALETTE.ochre, roughness: 0.8, side: THREE.DoubleSide,
        emissive: new THREE.Color(PALETTE.ochre), emissiveIntensity: 0.12,
      }),
      900,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 16;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      dummy.position.set(x, groundHeight(x, z), z);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      dummy.scale.setScalar(0.7 + Math.random() * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(mesh);
  }

  private buildTreeRing(): void {
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.17, 3.2, 7);
    trunkGeo.translate(0, 1.6, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.rockDark, roughness: 0.9 });
    const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
    const cPos = canopyGeo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const z = cPos.getZ(i);
      const bump = 1 + Math.sin(x * 4 + z * 3) * 0.22;
      cPos.setXYZ(i, x * bump, y * bump * 0.72, z * bump);
    }
    canopyGeo.computeVertexNormals();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: PALETTE.sage, roughness: 0.72,
      emissive: new THREE.Color(PALETTE.sage), emissiveIntensity: 0.18,
    });

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const r = 13 + Math.random() * 7;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const tree = new THREE.Group();
      tree.position.set(x, groundHeight(x, z), z);
      tree.rotation.y = Math.random() * Math.PI;
      const scale = 0.8 + Math.random() * 0.6;
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.castShadow = true;
      trunk.rotation.z = (Math.random() - 0.5) * 0.18;
      tree.add(trunk);

      for (let c = 0; c < 3; c++) {
        const blob = new THREE.Mesh(canopyGeo, canopyMat);
        blob.position.set((Math.random() - 0.5) * 1.1, 2.9 + Math.random() * 0.7, (Math.random() - 0.5) * 1.1);
        blob.scale.setScalar(0.75 + Math.random() * 0.5);
        blob.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        tree.add(blob);
      }
      this.scene.add(tree);
    }
  }

  private buildLanterns(): void {
    const glow = softGlowTexture();
    const bodyGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.26, 8);
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 9;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 1.8 + Math.random() * 2.2;

      const body = new THREE.Mesh(
        bodyGeo,
        new THREE.MeshStandardMaterial({
          color: PALETTE.ivory, emissive: new THREE.Color(PALETTE.paleGold), emissiveIntensity: 2.6, roughness: 0.5,
        }),
      );
      body.position.set(x, y, z);
      this.scene.add(body);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glow, color: PALETTE.paleGold, transparent: true,
          opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );
      halo.position.copy(body.position);
      halo.scale.setScalar(2.1);
      this.scene.add(halo);
    }
  }

  private buildDust(): void {
    const count = 260;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          map: softGlowTexture(), color: PALETTE.paleGold, size: 0.13,
          transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      ),
    );
  }

  private resize(): void {
    const w = this.canvas.clientWidth || 960;
    const h = this.canvas.clientHeight || 540;
    this.gl.setSize(w, h, false); // false: CSS already controls the display size
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /** Ambience keeps breathing even while a modal has combat paused. */
  update(dtMs: number, _player: Player): void {
    this.elapsed += dtMs / 1000;
    this.flash = Math.max(0, this.flash - dtMs / 700);
    this.restoreLight.intensity = this.flash * 30;
  }

  /** Call when a phase is won, to flood the ground with restoring light. */
  triggerRestoration(): void {
    this.flash = 1;
  }

  draw({ player, boss, camera }: DrawArgs): void {
    const dt = 16.67;
    this.trackStates(player, boss, dt);

    // --- Envoy ---
    const ex = px(player.position.x);
    const ez = px(player.position.y);
    this.envoyPivot.position.set(ex, groundHeight(ex, ez), ez);
    if (player.facing.lengthSquared() > 0) {
      this.envoyPivot.rotation.y = Math.atan2(player.facing.x, player.facing.y);
    }
    this.envoy.applyPose(this.posePlayer(player), dt, this.elapsed);

    const eclat01 = player.eclat / player.maxEclat;
    this.envoyLight.intensity = 0.6 + eclat01 * 2.2;
    (this.envoyHalo.material as THREE.MeshBasicMaterial).opacity = 0.05 + eclat01 * 0.14;

    // --- Prince ---
    const sx = px(boss.position.x);
    const sz = px(boss.position.y);
    this.shadowPivot.position.set(sx, groundHeight(sx, sz), sz);
    this.shadowPivot.rotation.y = Math.atan2(ex - sx, ez - sz); // always turned toward the Envoy
    this.shadow.applyPose(this.poseBoss(boss), dt, this.elapsed);

    // the tell: it blazes brighter the closer its blow is
    const charge = this.bossCharge(boss);
    this.shadowAura.intensity = boss.stateName === 'Downed' ? 0.5 : 1.4 + charge * 5.5;
    this.shadow.irisMat.emissiveIntensity = 2.4 + charge * 4;

    this.frameCamera(ex, ez, sx, sz, camera);

    this.gl.toneMappingExposure = 1.05 + this.flash * 0.55;
    this.gl.render(this.scene, this.cam);
  }

  /** Both state machines only expose a name, so the renderer times the states itself. */
  private trackStates(player: Player, boss: Boss, dtMs: number): void {
    if (player.stateName !== this.lastPlayerState) {
      this.lastPlayerState = player.stateName;
      this.playerStateAge = 0;
    } else {
      this.playerStateAge += dtMs;
    }
    if (boss.stateName !== this.lastBossState) {
      this.lastBossState = boss.stateName;
      this.bossStateAge = 0;
    } else {
      this.bossStateAge += dtMs;
    }
  }

  private posePlayer(player: Player): HumanoidPose {
    switch (player.stateName) {
      case 'Dashing':
        return { kind: 'dash' };
      case 'Parrying':
        return { kind: 'parry' };
      case 'Attacking':
        return { kind: 'attack', progress01: Math.min(1, this.playerStateAge / 400) };
      case 'Staggered':
        return { kind: 'stagger' };
      case 'Dispersed':
        return { kind: 'dispersed' };
      default: {
        const speed01 = Math.min(1, player.velocity.length() / 230);
        return speed01 > 0.05 ? { kind: 'walk', speed01 } : { kind: 'idle' };
      }
    }
  }

  private poseBoss(boss: Boss): HumanoidPose {
    switch (boss.stateName) {
      case 'Telegraphing':
        return { kind: 'telegraph', charge01: this.bossCharge(boss) };
      case 'Active':
        return { kind: 'attack', progress01: 0.8 };
      case 'Downed':
        return { kind: 'downed' };
      case 'Banished':
        return { kind: 'dispersed' };
      default:
        return { kind: 'idle' };
    }
  }

  private bossCharge(boss: Boss): number {
    if (boss.stateName !== 'Telegraphing') return 0;
    const pattern = boss.currentTelegraphedPattern;
    if (!pattern) return 0;
    return Math.min(1, this.bossStateAge / pattern.telegraphMs);
  }

  /**
   * Frames both duellists: the camera sits behind the midpoint and backs off
   * as they separate, so neither ever leaves frame.
   */
  private frameCamera(ex: number, ez: number, sx: number, sz: number, camera: Camera): void {
    const midX = (ex + sx) / 2;
    const midZ = (ez + sz) / 2;
    const spread = Math.hypot(sx - ex, sz - ez);
    this.camTarget.lerp(new THREE.Vector3(midX, 1.15, midZ), 0.09);

    const back = 6.2 + spread * 0.55;
    const shake = camera.getShakeOffset();
    this.cam.position.lerp(
      new THREE.Vector3(this.camTarget.x, 3.0 + spread * 0.12, this.camTarget.z + back),
      0.09,
    );
    this.cam.position.x += px(shake.x);
    this.cam.position.y += px(shake.y);
    this.cam.lookAt(this.camTarget);
    this.cam.rotation.z += camera.getShakeRotation();
  }
}
