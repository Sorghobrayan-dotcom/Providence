import * as THREE from 'three';

/**
 * Procedural humanoid — no imported model, no skinned skeleton. Every bone is
 * a child mesh pivoting on its own joint, so transforms compose the way a real
 * limb does. Two rules govern the geometry:
 *   1. a limb's pivot sits at its UPPER joint, so rotating it swings from the
 *      attachment rather than the middle;
 *   2. nothing stays a bare primitive — everything is swollen, tapered or
 *      profiled, otherwise the body reads as a stack of tubes.
 */

/** Cheap organic noise: sines at incommensurable frequencies, so no visible tiling. */
function organicNoise(x: number, y: number): number {
  return (
    Math.sin(x * 0.15) * Math.cos(y * 0.13) * 0.5 +
    Math.sin(x * 0.37 + 1.7) * Math.cos(y * 0.29 + 0.4) * 0.25 +
    Math.sin(x * 0.8 + 3.1) * Math.cos(y * 0.6 + 2.2) * 0.12
  );
}

function limbGeometry(rTop: number, rBot: number, len: number, bulge = 0.2, seg = 8): THREE.CylinderGeometry {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, seg, 5);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const v = (pos.getY(i) + len / 2) / len;
    const swell = 1 + Math.sin(v * Math.PI) * bulge;
    pos.setX(i, pos.getX(i) * swell);
    pos.setZ(i, pos.getZ(i) * swell);
  }
  geo.computeVertexNormals();
  geo.translate(0, -len / 2, 0);
  return geo;
}

/** Torso as a surface of revolution: pelvis, cinched waist, ribcage, sloping shoulders. */
function torsoGeometry(height: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const v = i / steps;
    let r = 0.125 + Math.sin(v * Math.PI * 0.92) * 0.062;
    r *= 1 - Math.exp(-Math.pow((v - 0.38) / 0.17, 2)) * 0.17;
    r -= Math.pow(v, 5) * 0.065;
    pts.push(new THREE.Vector2(Math.max(r, 0.05), v * height));
  }
  return new THREE.LatheGeometry(pts, 18);
}

function headGeometry(r: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(r, 16, 12);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const v = (y / r + 1) / 2;
    const taper = 1 - Math.pow(1 - v, 2) * 0.32;
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper * 0.94);
    pos.setY(i, y * 1.14);
  }
  geo.computeVertexNormals();
  return geo;
}

function footGeometry(): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(0.1, 0.055, 0.2, 2, 1, 4);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getZ(i) + 0.1) / 0.2;
    pos.setX(i, pos.getX(i) * (0.72 + t * 0.4));
    pos.setY(i, pos.getY(i) - Math.pow(t, 2) * 0.014);
  }
  geo.computeVertexNormals();
  geo.translate(0, -0.028, 0.042);
  return geo;
}

function browGeometry(): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(0.04, 0.0075, 0.012, 6, 1, 1);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.abs(pos.getX(i) / 0.02);
    pos.setY(i, pos.getY(i) - t * t * 0.009);
    pos.setZ(i, pos.getZ(i) - t * 0.007);
  }
  geo.computeVertexNormals();
  return geo;
}

function noseGeometry(): THREE.ConeGeometry {
  const geo = new THREE.ConeGeometry(0.017, 0.045, 6);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) * 1.45);
    pos.setX(i, pos.getX(i) * 0.82);
  }
  geo.computeVertexNormals();
  geo.rotateX(Math.PI * 0.5);
  return geo;
}

function mouthGeometry(): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(0.044, 0.012, 0.013, 6, 1, 1);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = Math.abs(pos.getX(i) / 0.022);
    pos.setZ(i, pos.getZ(i) - t * t * 0.009);
    pos.setY(i, pos.getY(i) + t * 0.004);
  }
  geo.computeVertexNormals();
  return geo;
}

function earGeometry(): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(0.027, 8, 8);
  geo.scale(0.34, 1.0, 0.6);
  return geo;
}

/** Hair cap whose lower edge undulates — a clean circle reads as a helmet. */
function hairCapGeometry(r: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(r, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const wave = 1 + organicNoise(x * 30, z * 30) * 0.17;
    pos.setXYZ(i, x * wave, y * 1.1, z * wave);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Mitten hand: five modelled fingers would cost a lot for nothing at this distance. */
function handGeometry(): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(0.05, 0.095, 0.03, 3, 4, 2);
  const pos = geo.attributes['position'] as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const v = (pos.getY(i) / 0.0475 + 1) / 2;
    pos.setX(i, pos.getX(i) * (0.7 + v * 0.38));
    pos.setZ(i, pos.getZ(i) * (0.78 + v * 0.3));
  }
  geo.computeVertexNormals();
  geo.translate(0, -0.0475, 0);
  return geo;
}

/**
 * Sleeveless tunic. The profile is traced point by point off the torso: it
 * hugs chest and waist and only flares BELOW the hips. Flaring from the
 * shoulders instead produced a bell silhouette.
 */
function tunicGeometry(): THREE.LatheGeometry {
  const profile: readonly [number, number][] = [
    [-0.205, 0.165],
    [-0.2, 0.205],
    [-0.08, 0.188],
    [0.06, 0.168],
    [0.2, 0.17],
    [0.34, 0.19],
    [0.48, 0.172],
    [0.54, 0.135],
  ];
  return new THREE.LatheGeometry(
    profile.map(([y, r]) => new THREE.Vector2(r, y)),
    20,
  );
}

export const HUMAN = {
  hipY: 0.84,
  thigh: 0.42,
  shin: 0.4,
  torso: 0.62,
  shoulderY: 0.56,
  headY: 0.72,
  upperArm: 0.33,
  foreArm: 0.3,
} as const;

const BODY_GEOS = {
  thigh: limbGeometry(0.085, 0.062, HUMAN.thigh, 0.22),
  shin: limbGeometry(0.058, 0.036, HUMAN.shin, 0.24),
  foot: footGeometry(),
  torso: torsoGeometry(HUMAN.torso),
  neck: limbGeometry(0.046, 0.042, 0.09, 0.06, 7),
  head: headGeometry(0.115),
  upperArm: limbGeometry(0.052, 0.042, HUMAN.upperArm, 0.2),
  foreArm: limbGeometry(0.041, 0.029, HUMAN.foreArm, 0.22),
  hand: handGeometry(),
  chestCore: new THREE.SphereGeometry(0.055, 12, 10),
} as const;

const FACE_GEOS = {
  eye: new THREE.SphereGeometry(0.019, 10, 8),
  iris: new THREE.SphereGeometry(0.0105, 8, 6),
  pupil: new THREE.SphereGeometry(0.0052, 6, 5),
  brow: browGeometry(),
  nose: noseGeometry(),
  mouth: mouthGeometry(),
  ear: earGeometry(),
  hairCap: hairCapGeometry(0.121),
  tunic: tunicGeometry(),
} as const;

export const SKIN_TONES = {
  clair: 0xd9b89a,
  dore: 0xbf9871,
  ambre: 0x96704c,
  profond: 0x5c412f,
} as const;
export type SkinTone = keyof typeof SKIN_TONES;

/** Every pose the game's state machines can ask for. */
export type HumanoidPose =
  | { kind: 'idle' }
  | { kind: 'walk'; speed01: number }
  | { kind: 'dash' }
  | { kind: 'parry' }
  | { kind: 'attack'; progress01: number }
  | { kind: 'stagger' }
  | { kind: 'telegraph'; charge01: number }
  | { kind: 'downed' }
  | { kind: 'dispersed' };

export class Humanoid {
  readonly root = new THREE.Group();

  readonly bodyMat: THREE.MeshStandardMaterial;
  readonly hairMat: THREE.MeshStandardMaterial;
  readonly mouthMat: THREE.MeshStandardMaterial;
  readonly eyeWhiteMat: THREE.MeshStandardMaterial;
  readonly irisMat: THREE.MeshStandardMaterial;
  readonly pupilMat: THREE.MeshBasicMaterial;
  readonly tunicMat: THREE.MeshStandardMaterial;
  readonly coreMat: THREE.MeshBasicMaterial;

  readonly hips = new THREE.Group();
  readonly torso: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly core: THREE.Mesh;
  readonly hairCap: THREE.Mesh;
  private readonly thighs: THREE.Mesh[] = [];
  private readonly shins: THREE.Mesh[] = [];
  private readonly upperArms: THREE.Mesh[] = [];
  private readonly foreArms: THREE.Mesh[] = [];

  readonly hipsRest = HUMAN.hipY;
  private walkPhase = 0;

  constructor() {
    this.bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.02, emissiveIntensity: 0.12, fog: true });
    this.hairMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, fog: true });
    this.mouthMat = new THREE.MeshStandardMaterial({ roughness: 0.5, fog: true });
    this.eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe6e0d2, roughness: 0.2, fog: true });
    this.irisMat = new THREE.MeshStandardMaterial({ roughness: 0.3, emissiveIntensity: 1.15, fog: true });
    this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x17120d, fog: true });
    this.tunicMat = new THREE.MeshStandardMaterial({
      roughness: 0.85, metalness: 0, side: THREE.DoubleSide, emissiveIntensity: 0.16, fog: true,
    });
    this.coreMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, fog: false });

    this.hips.position.y = this.hipsRest;
    this.root.add(this.hips);

    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(BODY_GEOS.thigh, this.bodyMat);
      thigh.position.set(side * 0.088, -0.02, 0);
      thigh.castShadow = true;
      this.hips.add(thigh);

      const shin = new THREE.Mesh(BODY_GEOS.shin, this.bodyMat);
      shin.position.y = -HUMAN.thigh;
      shin.castShadow = true;
      thigh.add(shin);

      const foot = new THREE.Mesh(BODY_GEOS.foot, this.bodyMat);
      foot.position.y = -HUMAN.shin;
      shin.add(foot);

      this.thighs.push(thigh);
      this.shins.push(shin);
    }

    this.torso = new THREE.Mesh(BODY_GEOS.torso, this.bodyMat);
    this.torso.castShadow = true;
    this.hips.add(this.torso);

    this.core = new THREE.Mesh(BODY_GEOS.chestCore, this.coreMat);
    this.core.position.set(0, 0.42, 0.052);
    this.torso.add(this.core);

    const neck = new THREE.Mesh(BODY_GEOS.neck, this.bodyMat);
    neck.position.y = HUMAN.torso + 0.09;
    this.torso.add(neck);

    this.head = new THREE.Mesh(BODY_GEOS.head, this.bodyMat);
    this.head.position.y = HUMAN.headY + 0.05;
    this.head.castShadow = true;
    this.torso.add(this.head);
    this.hairCap = this.buildFace();

    const tunic = new THREE.Mesh(FACE_GEOS.tunic, this.tunicMat);
    tunic.castShadow = true;
    this.torso.add(tunic);

    for (const side of [-1, 1]) {
      const up = new THREE.Mesh(BODY_GEOS.upperArm, this.bodyMat);
      up.position.set(side * 0.175, HUMAN.shoulderY, 0);
      up.rotation.z = side * 0.13;
      up.castShadow = true;
      this.torso.add(up);

      const fore = new THREE.Mesh(BODY_GEOS.foreArm, this.bodyMat);
      fore.position.y = -HUMAN.upperArm;
      fore.castShadow = true;
      up.add(fore);

      const hand = new THREE.Mesh(BODY_GEOS.hand, this.bodyMat);
      hand.position.y = -HUMAN.foreArm;
      fore.add(hand);

      this.upperArms.push(up);
      this.foreArms.push(fore);
    }
  }

  /**
   * Features are placed in skull-local coordinates. Depths follow the sphere's
   * real radius at each height — otherwise an eye either floats in front of the
   * face or sinks inside it.
   */
  private buildFace(): THREE.Mesh {
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(FACE_GEOS.eye, this.eyeWhiteMat);
      eye.position.set(side * 0.043, 0.018, 0.085);
      eye.scale.set(1, 0.82, 0.7);
      this.head.add(eye);

      const iris = new THREE.Mesh(FACE_GEOS.iris, this.irisMat);
      iris.position.z = 0.012;
      eye.add(iris);

      const pupil = new THREE.Mesh(FACE_GEOS.pupil, this.pupilMat);
      pupil.position.z = 0.007;
      iris.add(pupil);

      const brow = new THREE.Mesh(FACE_GEOS.brow, this.hairMat);
      brow.position.set(side * 0.05, 0.055, 0.094);
      brow.rotation.z = -side * 0.16;
      this.head.add(brow);

      const ear = new THREE.Mesh(FACE_GEOS.ear, this.bodyMat);
      ear.position.set(side * 0.101, 0.004, -0.006);
      this.head.add(ear);
    }

    const nose = new THREE.Mesh(FACE_GEOS.nose, this.bodyMat);
    nose.position.set(0, -0.004, 0.086);
    nose.rotation.x = -0.22;
    this.head.add(nose);

    const mouth = new THREE.Mesh(FACE_GEOS.mouth, this.mouthMat);
    mouth.position.set(0, -0.058, 0.083);
    this.head.add(mouth);

    const hairCap = new THREE.Mesh(FACE_GEOS.hairCap, this.hairMat);
    hairCap.position.set(0, 0.014, -0.006);
    hairCap.castShadow = true;
    this.head.add(hairCap);
    return hairCap;
  }

  setSkin(tone: SkinTone): void {
    const c = new THREE.Color(SKIN_TONES[tone]);
    this.bodyMat.color.copy(c);
    this.hairMat.color.copy(c).multiplyScalar(0.26);
    this.mouthMat.color.copy(c).multiplyScalar(0.66).lerp(new THREE.Color(0x8d4c43), 0.28);
  }

  /** The hue is the AURA, not the flesh: gaze, heart-light, cloth, a sheen on skin. */
  setHue(hex: number): void {
    const c = new THREE.Color(hex);
    this.bodyMat.emissive.copy(c);
    this.irisMat.color.copy(c);
    this.irisMat.emissive.copy(c);
    this.coreMat.color.copy(c).lerp(new THREE.Color(0xffffff), 0.45);
    this.tunicMat.color.copy(c).multiplyScalar(0.72);
    this.tunicMat.emissive.copy(c);
  }

  /** Same skeleton, other nature: the shadow has no flesh and no gaze, only embers. */
  becomeShadow(emberHex = 0xe8432b): void {
    const ember = new THREE.Color(emberHex);
    this.bodyMat.color.setHex(0x0a0a10);
    this.bodyMat.emissive.setHex(0x000000);
    this.bodyMat.roughness = 0.95;
    this.hairMat.color.setHex(0x07070c);
    this.mouthMat.color.setHex(0x08080d);
    this.eyeWhiteMat.color.copy(ember).multiplyScalar(0.35);
    this.irisMat.color.copy(ember);
    this.irisMat.emissive.copy(ember);
    this.irisMat.emissiveIntensity = 2.4;
    this.pupilMat.color.setHex(0x1a0400);
    this.tunicMat.color.setHex(0x0c0c12);
    this.tunicMat.emissive.setHex(0x000000);
    this.coreMat.color.copy(ember).multiplyScalar(0.5);
    this.core.visible = false;
  }

  /** One function produces every pose. Walk cadence follows real speed, so feet never skate. */
  applyPose(pose: HumanoidPose, dtMs: number, t: number): void {
    const dt = dtMs / 1000;
    const walking = pose.kind === 'walk' ? pose.speed01 : 0;
    this.walkPhase += dt * (1.6 + walking * 8.5);
    const p = this.walkPhase;

    this.resetLimbs();

    switch (pose.kind) {
      case 'walk':
      case 'idle': {
        const amp = 0.14 + walking * 0.72;
        for (let i = 0; i < 2; i++) {
          const ph = p + (i === 0 ? 0 : Math.PI);
          const swing = Math.sin(ph);
          this.thighs[i]!.rotation.x = swing * amp;
          // the knee only folds BACKWARD; without this max the leg snaps
          // inside out for half the cycle
          this.shins[i]!.rotation.x = Math.max(0, -Math.sin(ph + 0.7)) * amp * 1.35;
          this.upperArms[i]!.rotation.x = -swing * amp * 0.85;
          this.foreArms[i]!.rotation.x = -Math.max(0, Math.sin(ph)) * 0.4 - 0.12;
        }
        this.hips.position.y = this.hipsRest + Math.abs(Math.sin(p)) * 0.045 * walking;
        this.torso.rotation.x = walking * 0.13;
        break;
      }
      case 'dash': {
        this.torso.rotation.x = 0.42;
        this.thighs[0]!.rotation.x = 0.75;
        this.thighs[1]!.rotation.x = -0.5;
        this.shins[0]!.rotation.x = 0.5;
        this.upperArms[0]!.rotation.x = -0.9;
        this.upperArms[1]!.rotation.x = 0.7;
        break;
      }
      case 'parry': {
        // both forearms crossed high: the guard must be legible in one glance
        this.torso.rotation.x = -0.06;
        this.upperArms[0]!.rotation.x = -1.5;
        this.upperArms[1]!.rotation.x = -1.35;
        this.upperArms[0]!.rotation.z = 0.5;
        this.upperArms[1]!.rotation.z = -0.5;
        this.foreArms[0]!.rotation.x = -1.15;
        this.foreArms[1]!.rotation.x = -1.25;
        break;
      }
      case 'attack': {
        // windup pulls back, strike throws through: one continuous arc
        const a = pose.progress01;
        const swing = a < 0.35 ? -0.9 * (a / 0.35) : -0.9 + 2.5 * ((a - 0.35) / 0.65);
        this.torso.rotation.y = swing * 0.35;
        this.upperArms[1]!.rotation.x = -1.2 + swing * 0.9;
        this.foreArms[1]!.rotation.x = -0.5 - Math.max(0, swing) * 0.4;
        this.upperArms[0]!.rotation.x = 0.35 - swing * 0.3;
        this.thighs[0]!.rotation.x = 0.25;
        this.thighs[1]!.rotation.x = -0.2;
        break;
      }
      case 'stagger': {
        this.torso.rotation.x = -0.34;
        this.head.rotation.x = -0.3;
        this.upperArms[0]!.rotation.x = 0.6;
        this.upperArms[1]!.rotation.x = 0.5;
        this.hips.position.y = this.hipsRest - 0.05;
        break;
      }
      case 'telegraph': {
        // it swells before striking — the tell the whole fight reads
        const c = pose.charge01;
        this.torso.rotation.x = -0.1 - c * 0.22;
        this.upperArms[0]!.rotation.x = -0.5 - c * 1.5;
        this.upperArms[1]!.rotation.x = -0.45 - c * 1.4;
        this.upperArms[0]!.rotation.z = 0.3 + c * 0.4;
        this.upperArms[1]!.rotation.z = -0.3 - c * 0.4;
        this.hips.position.y = this.hipsRest + c * 0.05;
        break;
      }
      case 'downed': {
        this.hips.position.y = this.hipsRest - 0.34;
        this.torso.rotation.x = 0.55;
        this.head.rotation.x = 0.3;
        this.thighs[0]!.rotation.x = -0.9;
        this.shins[0]!.rotation.x = 1.6;
        this.thighs[1]!.rotation.x = 0.4;
        this.upperArms[0]!.rotation.x = 0.5;
        this.upperArms[1]!.rotation.x = 0.45;
        break;
      }
      case 'dispersed': {
        this.hips.position.y = this.hipsRest - 0.6;
        this.torso.rotation.x = 0.9;
        this.head.rotation.x = 0.5;
        break;
      }
    }

    // signs of life that never stop, even at a standstill
    const breathe = Math.sin(t * 0.9);
    this.torso.scale.set(1 + breathe * 0.025, 1 + breathe * 0.012, 1 + breathe * 0.025);
    if (pose.kind === 'idle' || pose.kind === 'walk') {
      this.head.rotation.y = Math.sin(t * 0.35) * 0.18;
    }
  }

  private resetLimbs(): void {
    this.hips.position.y = this.hipsRest;
    this.torso.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.thighs[i]!.rotation.set(0, 0, 0);
      this.shins[i]!.rotation.set(0, 0, 0);
      this.upperArms[i]!.rotation.set(0, 0, side * 0.13);
      this.foreArms[i]!.rotation.set(0, 0, 0);
    }
  }
}
