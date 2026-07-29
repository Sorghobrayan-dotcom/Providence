import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/GameEvents';
import type { ResolvedVerseText } from '../api/YouVersionClient';

export interface ArsenalCandidate {
  readonly verseId: string;
  readonly resolved: ResolvedVerseText;
}

interface ArsenalPickerParams {
  readonly lie: string;
  readonly candidates: readonly ArsenalCandidate[];
  readonly windowMs: number;
  readonly onSelect: (verseId: string) => void;
  readonly onTimeout: () => void;
}

interface FreeformPromptParams {
  readonly onSubmit: (text: string) => void;
}

const HIT_FLASH_DURATION_MS = 220;

/**
 * Pure presentation layer: builds its own DOM once, updates gauges by
 * listening to the shared bus, and exposes two blocking-style prompts
 * (arsenal picker, free-form answer) that the Scene calls directly because
 * it needs exactly one answer back, not a broadcast.
 */
export class Hud {
  private readonly root: HTMLElement;
  private readonly eclatFill: HTMLElement;
  private readonly bossFill: HTMLElement;
  private readonly bossLabel: HTMLElement;
  private readonly hitFlash: HTMLElement;
  private readonly lieBanner: HTMLElement;
  private readonly lieBannerText: HTMLElement;
  private readonly arsenalPanel: HTMLElement;
  private readonly arsenalCards: HTMLElement;
  private readonly arsenalTimerFill: HTMLElement;
  private readonly freeformPanel: HTMLElement;
  private readonly freeformTextarea: HTMLTextAreaElement;
  private readonly freeformSubmit: HTMLButtonElement;
  private readonly endScreen: HTMLElement;
  private readonly endTitle: HTMLElement;
  private readonly endMessage: HTMLElement;

  private arsenalTimeoutHandle: number | null = null;

  constructor(root: HTMLElement, bus: EventBus<GameEvents>) {
    this.root = root;
    this.root.innerHTML = HUD_MARKUP;

    this.eclatFill = this.query('.gauge__fill--eclat');
    this.bossFill = this.query('.gauge__fill--boss');
    this.bossLabel = this.query('#boss-phase-name');
    this.hitFlash = this.query('.hit-flash');
    this.lieBanner = this.query('.lie-banner');
    this.lieBannerText = this.query('.lie-banner__text');
    this.arsenalPanel = this.query('.arsenal-picker');
    this.arsenalCards = this.query('.arsenal-picker__cards');
    this.arsenalTimerFill = this.query('.lie-banner__timer-fill');
    this.freeformPanel = this.query('.freeform-prompt');
    this.freeformTextarea = this.query('.freeform-prompt__input');
    this.freeformSubmit = this.query('.freeform-prompt__submit');
    this.endScreen = this.query('.end-screen');
    this.endTitle = this.query('.end-screen__title');
    this.endMessage = this.query('.end-screen__message');

    bus.on('player:eclat-changed', ({ eclat, maxEclat }) => {
      this.eclatFill.style.width = `${(eclat / maxEclat) * 100}%`;
    });
    bus.on('player:hit', () => this.flash('hit-flash--active'));
    bus.on('player:parry-success', () => this.flash('hit-flash--parry'));
    bus.on('boss:hit', ({ hpRemaining, maxHp }) => {
      this.bossFill.style.width = `${(hpRemaining / maxHp) * 100}%`;
    });
    bus.on('boss:phase-advanced', ({ phaseName }) => this.setBossPhase(phaseName));
    bus.on('boss:rose', ({ phaseName }) => {
      this.bossLabel.textContent = `${phaseName} — se relève`;
    });
  }

  private query<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Hud markup is missing required element "${selector}".`);
    return el;
  }

  setBossPhase(phaseName: string): void {
    this.bossLabel.textContent = phaseName;
    this.bossFill.style.width = '100%';
  }

  private flash(variantClass: string): void {
    this.hitFlash.classList.add(variantClass);
    window.setTimeout(() => this.hitFlash.classList.remove(variantClass), HIT_FLASH_DURATION_MS);
  }

  openArsenalPicker(params: ArsenalPickerParams): void {
    this.lieBannerText.textContent = params.lie;
    this.lieBanner.classList.remove('hidden');
    this.arsenalPanel.classList.remove('hidden');
    this.arsenalCards.innerHTML = '';

    for (const candidate of params.candidates) {
      const card = document.createElement('button');
      card.className = 'verse-card';
      card.innerHTML = `<span class="verse-card__ref">${candidate.resolved.reference}</span><span class="verse-card__text">${candidate.resolved.text}</span>`;
      card.addEventListener('click', () => {
        this.closeArsenalPicker();
        params.onSelect(candidate.verseId);
      });
      this.arsenalCards.appendChild(card);
    }

    this.arsenalTimerFill.style.transition = 'none';
    this.arsenalTimerFill.style.width = '100%';
    // Force layout so the next width change actually transitions instead of
    // collapsing into the reset above.
    void this.arsenalTimerFill.offsetWidth;
    this.arsenalTimerFill.style.transition = `width ${params.windowMs}ms linear`;
    this.arsenalTimerFill.style.width = '0%';

    this.arsenalTimeoutHandle = window.setTimeout(() => {
      this.closeArsenalPicker();
      params.onTimeout();
    }, params.windowMs);
  }

  closeArsenalPicker(): void {
    if (this.arsenalTimeoutHandle !== null) {
      window.clearTimeout(this.arsenalTimeoutHandle);
      this.arsenalTimeoutHandle = null;
    }
    this.arsenalPanel.classList.add('hidden');
    this.lieBanner.classList.add('hidden');
  }

  openFreeformPrompt(lie: string, params: FreeformPromptParams): void {
    this.lieBannerText.textContent = lie;
    this.lieBanner.classList.remove('hidden');
    this.freeformPanel.classList.remove('hidden');
    this.freeformTextarea.value = '';
    this.freeformTextarea.focus();

    const submit = () => {
      this.freeformSubmit.removeEventListener('click', submit);
      this.closeFreeformPrompt();
      params.onSubmit(this.freeformTextarea.value);
    };
    this.freeformSubmit.addEventListener('click', submit);
  }

  closeFreeformPrompt(): void {
    this.freeformPanel.classList.add('hidden');
    this.lieBanner.classList.add('hidden');
  }

  showEnd(kind: 'victory' | 'defeat', title: string, message: string): void {
    this.endScreen.classList.remove('hidden');
    this.endScreen.classList.toggle('end-screen--victory', kind === 'victory');
    this.endScreen.classList.toggle('end-screen--defeat', kind === 'defeat');
    this.endTitle.textContent = title;
    this.endMessage.textContent = message;
  }
}

const HUD_MARKUP = `
  <div class="hit-flash"></div>
  <div class="hud__top">
    <div class="gauge gauge--eclat">
      <div class="gauge__label">Éclat</div>
      <div class="gauge__track"><div class="gauge__fill gauge__fill--eclat"></div></div>
    </div>
    <div class="gauge gauge--boss">
      <div class="gauge__label" id="boss-phase-name">—</div>
      <div class="gauge__track"><div class="gauge__fill gauge__fill--boss"></div></div>
    </div>
  </div>
  <div class="hint-bar">J frappe · Maj/K esquive (i-frames) · L pare (fenêtre courte)</div>
  <div class="lie-banner hidden">
    <p class="lie-banner__text"></p>
    <div class="lie-banner__timer"><div class="lie-banner__timer-fill"></div></div>
  </div>
  <div class="arsenal-picker hidden">
    <h2>Choisis la Parole qui contre ce mensonge</h2>
    <div class="arsenal-picker__cards"></div>
  </div>
  <div class="freeform-prompt hidden">
    <h2>Réponds au Prince avec tes propres mots</h2>
    <textarea class="freeform-prompt__input" rows="3" placeholder="Il est écrit..."></textarea>
    <button class="freeform-prompt__submit">IL EST ÉCRIT</button>
  </div>
  <div class="end-screen hidden">
    <h1 class="end-screen__title"></h1>
    <p class="end-screen__message"></p>
  </div>
`;
