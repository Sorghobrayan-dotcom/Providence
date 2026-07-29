import { GameLoop } from '../core/GameLoop';
import { Camera } from '../core/Camera';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/GameEvents';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { PRINCES_MAGICIENS_ENCOUNTER } from '../data/bossEncounters';
import { resolvePlayerAttackVsBoss, resolveBossAttackVsPlayer } from '../combat/CombatResolver';
import { getCarriedArsenal, isCorrectVerse } from '../combat/VerseArsenal';
import { YouVersionClient, resolveVerseDisplayText } from '../api/YouVersionClient';
import { GlooClient, judgeFreeformOffline } from '../api/GlooClient';
import { Hud, type ArsenalCandidate } from '../ui/Hud';
import { ThreeRenderer } from './ThreeRenderer';

const LIE_ANSWER_WINDOW_MS = 4000;

export interface SceneConfig {
  readonly canvas: HTMLCanvasElement;
  readonly hudRoot: HTMLElement;
  readonly youVersion: YouVersionClient;
  readonly gloo: GlooClient;
}

/**
 * Owns and wires everything for "La Nuit du Bâton": the two combatants,
 * the fixed-step loop, the renderer, and the modal hand-off to the HUD
 * whenever the boss goes Downed and needs a verse before the fight can
 * continue.
 */
export class BossDuelScene {
  private readonly events = new EventBus<GameEvents>();
  private readonly input = new InputManager();
  private readonly camera = new Camera();
  private readonly player: Player;
  private readonly boss: Boss;
  private readonly hud: Hud;
  private readonly renderer: ThreeRenderer;
  private readonly loop: GameLoop;

  private readonly config: SceneConfig;
  private combatPaused = false;
  private encounterOver = false;

  constructor(config: SceneConfig) {
    this.config = config;
    this.player = new Player(this.input, this.events);
    this.boss = new Boss(PRINCES_MAGICIENS_ENCOUNTER, this.events);
    this.hud = new Hud(config.hudRoot, this.events);
    this.renderer = new ThreeRenderer(config.canvas);

    this.hud.setBossPhase(this.boss.currentPhase.name);
    this.events.emit('player:eclat-changed', { eclat: this.player.eclat, maxEclat: this.player.maxEclat });

    this.events.on('boss:downed', (payload) => {
      void this.handleBossDowned(payload);
    });
    // a phase won floods the ground with light — Kintsugi's restoration
    // register, not a damage explosion
    this.events.on('boss:phase-advanced', () => this.renderer.triggerRestoration());
    this.events.on('boss:banished', () => {
      this.renderer.triggerRestoration();
      this.handleVictory();
    });
    this.events.on('player:dispersed', () => this.handleDefeat());

    this.loop = new GameLoop({
      onFixedUpdate: (dtMs) => this.fixedUpdate(dtMs),
      onRender: () => this.render(),
    });
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.input.dispose();
  }

  private fixedUpdate(dtMs: number): void {
    this.camera.update(dtMs);
    this.renderer.update(dtMs, this.player); // ambience keeps breathing even while a modal pauses combat

    if (!this.encounterOver && !this.combatPaused) {
      this.player.update(dtMs);
      this.boss.update(dtMs);

      const deps = { camera: this.camera, gameLoop: this.loop };
      resolvePlayerAttackVsBoss(this.player, this.boss, deps);
      resolveBossAttackVsPlayer(this.boss, this.player, deps);
    }

    /* MUST be last. InputManager captures press edges in `pressedThisFrame`;
       clearing them before Player.update ran meant wasPressed() was always
       false, so attack/dodge/parry never fired while movement — which reads
       the persistent isDown() set — kept working. */
    this.input.endFrame();
  }

  private render(): void {
    this.renderer.draw({ player: this.player, boss: this.boss, camera: this.camera });
  }

  private async handleBossDowned(payload: {
    phaseIndex: number;
    phaseName: string;
    lie: string;
    requiresFreeform: boolean;
  }): Promise<void> {
    this.combatPaused = true;

    if (payload.requiresFreeform) {
      this.hud.openFreeformPrompt(payload.lie, {
        onSubmit: (text) => {
          void this.resolveFreeformAnswer(text);
        },
      });
      return;
    }

    const candidates = await this.resolveArsenalCandidates();
    this.hud.openArsenalPicker({
      lie: payload.lie,
      candidates,
      windowMs: LIE_ANSWER_WINDOW_MS,
      onSelect: (verseId) => this.resolveArsenalAnswer(verseId),
      onTimeout: () => this.resolveArsenalAnswer(null),
    });
  }

  private async resolveArsenalCandidates(): Promise<ArsenalCandidate[]> {
    const arsenal = getCarriedArsenal();
    return Promise.all(
      arsenal.map(async (verse) => ({
        verseId: verse.id,
        resolved: await resolveVerseDisplayText(this.config.youVersion, verse, 'fra'),
      })),
    );
  }

  private resolveArsenalAnswer(verseId: string | null): void {
    const correct = verseId !== null && isCorrectVerse(verseId, this.boss.currentPhase.correctVerseId);
    this.boss.resolveLieAnswer(correct);
    this.combatPaused = false;
  }

  private async resolveFreeformAnswer(text: string): Promise<void> {
    const phase = this.boss.currentPhase;
    const liveVerdict = await this.config.gloo.judgeFreeformAnswer(phase.lie, text);
    const verdict = liveVerdict ?? judgeFreeformOffline(text, phase.freeformFallbackKeywords ?? []);
    this.boss.resolveLieAnswer(verdict.correct);
    this.combatPaused = false;
  }

  private handleVictory(): void {
    this.encounterOver = true;
    this.hud.showEnd(
      'victory',
      'IL EST ÉCRIT',
      'Le bâton repose près de Moïse. À son réveil, il le prendra sans jamais savoir qui l’a ramené.',
    );
  }

  private handleDefeat(): void {
    this.encounterOver = true;
    this.hud.showEnd('defeat', 'Dispersion', 'Tu erres dans le Brouillard. L’aube approche sans toi.');
  }
}
