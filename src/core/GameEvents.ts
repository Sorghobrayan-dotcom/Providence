/**
 * Single typed event contract for the vertical slice. Combat resolution,
 * the boss FSM and the HUD all talk through this instead of holding direct
 * references to each other — the HUD can render a lie banner without
 * importing the Boss class. Modal UI (the arsenal picker, the free-form
 * prompt) is deliberately NOT on this bus: the Scene calls the Hud
 * directly for those because it must await a single answer, not broadcast
 * a fire-and-forget notification.
 */
export interface GameEvents {
  'player:eclat-changed': { eclat: number; maxEclat: number };
  'player:hit': { damage: number };
  'player:parry-success': Record<string, never>;
  'player:dispersed': Record<string, never>;
  'boss:hit': { damage: number; hpRemaining: number; maxHp: number };
  'boss:downed': { phaseIndex: number; phaseName: string; lie: string; requiresFreeform: boolean };
  'boss:phase-advanced': { phaseIndex: number; phaseName: string; maxHp: number };
  'boss:rose': { phaseIndex: number; phaseName: string };
  'boss:banished': Record<string, never>;
  'encounter:victory': Record<string, never>;
  'encounter:defeat': Record<string, never>;
}
