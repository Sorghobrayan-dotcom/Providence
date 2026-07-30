# The archetypes

Generated from the library by `src/__tests__/archetypeSheets.test.ts`. Do not edit by hand: a table
kept by hand drifts from the code, and a sheet that disagrees with the thing it describes is worse
than none.

24 arcs, 3 drive profiles, 7 atmospheres.

Every transition carries the passage it comes from and no text. `Scripture.ts` resolves those
references at runtime through the YouVersion Platform API.

---

## Relationship

How the character stands toward the player.

### Le Réticent  `jonah`

*Quest-givers that stand in one spot forever. This one runs from the errand you gave him.*

Drawn from JON.1. Opens in `commissioned`.

Starting disposition: trust 0.5, fear 0.3, resolve 0.25.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `commissioned` | hold · burdened | — | `fleeing` (JON.1.3)<br>`obeying` (JON.3.3)<br>`shrinking` (JON.4.2)<br>`confiding` (JON.1.12) |
| `shrinking` | away-from-player · averting · refusing | fear +0.04/s, trust -0.03/s | `fleeing` (JON.1.3)<br>`commissioned` (JON.4.5) |
| `confiding` | toward-player · confiding | trust +0.05/s, fear -0.04/s | `commissioned` (JON.4.2) |
| `fleeing` | away-from-errand · fleeing · refusing | fear +0.05/s | `caught` (JON.1.4) |
| `caught` | hold · held | resolve +0.12/s, fear -0.06/s | `returning` (JON.2.10) |
| `returning` | toward-errand · resigned | — | `obeying` (JON.3.3) |
| `obeying` | toward-errand · proclaiming | — | `sulking` (JON.4.1) |
| `sulking` | away-from-player · bitter | trust -0.03/s | *end* |

Ends in `sulking`.

### Le Serment Brise  `peter`

*Loyalty bars that only ever go up or down. This one snaps, then mends higher than before.*

Drawn from LUK.22.33. Opens in `following`.

Starting disposition: trust 0.85, fear 0.1, resolve 0.9.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `following` | toward-player · sworn · companion | — | `pressed` (LUK.22.54) |
| `pressed` | hold · wary · companion | fear +0.09/s, trust -0.02/s | `denying` (LUK.22.57)<br>`following` (LUK.22.33) |
| `denying` | away-from-player · denying · refusing | trust -0.12/s | `weeping` (LUK.22.62) |
| `weeping` | hold · withdrawn | fear -0.08/s | `restored` (JHN.21.17) |
| `restored` | toward-player · steadfast · companion | trust +0.04/s | `pressed` (LUK.22.54) |


### Celle Qui Choisit  `ruth`

*Companions you hire or unlock. This one watches you first, then binds herself, and will not be sent away.*

Drawn from RUT.1.16. Opens in `stranger`.

Starting disposition: trust 0.2, fear 0.2, resolve 0.5.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `stranger` | hold · apart | — | `watching` (RUT.2.11) |
| `watching` | hold · observing | — | `binding` (RUT.1.16) |
| `binding` | toward-player · binding · companion | trust +0.1/s | `steadfast` (RUT.1.17) |
| `steadfast` | toward-player · steadfast · companion | — | *end* |

Ends in `steadfast`.

### La Retenue  `david-cave`

*Enemies that always strike when they can. This one has you, and lowers the blade.*

Drawn from 1SA.24.6. Opens in `hunting`.

Starting disposition: trust 0.1, fear 0.2, resolve 0.8.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `hunting` | toward-player · hunting | — | `advantage` (1SA.24.4) |
| `advantage` | hold · blade-raised | resolve -0.2/s | `restraint` (1SA.24.6) |
| `restraint` | away-from-player · withdrawing | — | `proof` (1SA.24.11) |
| `proof` | hold · showing-proof | trust +0.05/s | *end* |

Ends in `proof`.

---

## Intervention

Something done to the player’s own course of action, wanted or not.

### L'Anesse Qui Refuse  `balaams-donkey`

*Mounts and followers that walk into a wall because the player told them to.*

Drawn from NUM.22.23. Opens in `carrying`.

Starting disposition: trust 0.7, fear 0.2, resolve 0.5.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `carrying` | toward-errand · carrying | — | `seeing` (NUM.22.23)<br>`seeing` (NUM.22.23) |
| `seeing` | hold · balking | fear +0.1/s | `refusing` (NUM.22.27)<br>`carrying` (NUM.22.23) |
| `refusing` | hold · lying-down · refusing, overridesInput | — | `protesting` (NUM.22.28)<br>`carrying` (NUM.22.35) |
| `protesting` | hold · speaking · refusing, overridesInput | — | `revealed` (NUM.22.31) |
| `revealed` | hold · waiting | — | `carrying` (NUM.22.35) |


### L Interposee  `abigail`

*Nobody in a game world ever tries to stop the player from doing something monstrous.*

Drawn from 1SA.25.18. Opens in `unaware`.

Starting disposition: trust 0.5, fear 0.3, resolve 0.7.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `unaware` | hold · occupied | — | `hastening` (1SA.25.18) |
| `hastening` | toward-player · hurrying | — | `interposing` (1SA.25.23) |
| `interposing` | hold · prostrate · blocking | — | `averted` (1SA.25.33) |
| `averted` | hold · rising | trust +0.06/s | *end* |

Ends in `averted`.

### Celui Qui Guette La Route  `watching-father`

*Quest-givers that nag you to come back. This one waits, and the waiting is the point.*

Drawn from LUK.15.20. Opens in `watching`.

Starting disposition: trust 0.9, fear 0.1, resolve 1.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `watching` | hold · watching-the-road | — | `sighting` (LUK.15.20) |
| `sighting` | hold · moved | — | `running` (LUK.15.20) |
| `running` | toward-player · running | — | `restoring` (LUK.15.22) |
| `restoring` | hold · restoring | — | `watching` (LUK.15.20) |


### Le Juge Lasse  `unjust-judge`

*Gates opened by reputation or gold. This one opens only to someone who keeps coming back.*

Drawn from LUK.18.2. Opens in `dismissive`.

Starting disposition: trust 0.1, fear 0, resolve 0.9.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `dismissive` | hold · dismissive · refusing | — | `wearied` (LUK.18.5) |
| `wearied` | hold · relenting | — | `granting` (LUK.18.5) |
| `granting` | hold · granting | — | *end* |

Ends in `granting`.

### Les Consolateurs  `jobs-friends`

*Allies whose help is always positive. These become harmful, and only by speaking.*

Drawn from JOB.2.11. Opens in `coming`.

Starting disposition: trust 0.6, fear 0.2, resolve 0.6.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `coming` | toward-player · approaching | — | `silent` (JOB.2.13) |
| `silent` | hold · sitting-with | — | `speaking` (JOB.4.1) |
| `speaking` | hold · explaining | trust -0.05/s | `accusing` (JOB.22.5)<br>`silent` (JOB.2.13) |
| `accusing` | hold · accusing | trust -0.08/s | *end* |

Ends in `accusing`.

---

## Adversary

Danger a health bar cannot model. Most of these never fight.

### Celui Qui Suggere  `serpent`

*Villains whose only verb is attack. This one never fights, and it is the most dangerous in the library.*

Drawn from GEN.3.1. Opens in `coiled`.

Starting disposition: trust 0.4, fear 0, resolve 0.9.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `coiled` | hold · watching | — | `questioning` (GEN.3.1) |
| `questioning` | hold · questioning · offering | — | `reframing` (GEN.3.4) |
| `reframing` | hold · offering · offering | trust +0.04/s | `withdrawn` (GEN.3.6) |
| `withdrawn` | away-from-player · gone | — | *end* |

Ends in `withdrawn`.

### La Reddition Fausse  `pharaoh`

*Bosses that surrender once and stay surrendered. This one yields, then takes it back, again and again.*

Drawn from EXO.8.15. Opens in `refusing`.

Starting disposition: trust 0.1, fear 0.1, resolve 0.95.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `refusing` | hold · enthroned · hostile, refusing | — | `relenting` (EXO.8.8) |
| `relenting` | hold · conceding | — | `hardening` (EXO.8.15) |
| `hardening` | hold · hardened · hostile, refusing | resolve +0.06/s | `relenting` (EXO.9.27)<br>`pursuing` (EXO.14.8) |
| `pursuing` | toward-player · charioteering · hostile | — | *end* |

Ends in `pursuing`.

### Le Patron Jaloux  `saul`

*Quest-givers that reward you forever. This one becomes hostile precisely because you did well.*

Drawn from 1SA.18.9. Opens in `favouring`.

Starting disposition: trust 0.8, fear 0.2, resolve 0.6.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `favouring` | toward-player · favouring | — | `eyeing` (1SA.18.7) |
| `eyeing` | hold · eyeing | trust -0.08/s | `striking` (1SA.18.11)<br>`favouring` (1SA.18.5) |
| `striking` | toward-player · hurling · hostile | — | `hunting` (1SA.19.10) |
| `hunting` | toward-player · hunting · hostile | — | *end* |

Ends in `hunting`.

### Celui Qui Petrifie  `goliath`

*Bosses that fight your party. This one suppresses it and waits, and the fight never starts.*

Drawn from 1SA.17.10. Opens in `presenting`.

Starting disposition: trust 0, fear 0, resolve 1.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `presenting` | hold · taunting · hostile, suppressesParty | resolve +0.02/s | `answered` (1SA.17.32) |
| `answered` | toward-player · advancing · hostile | — | `fallen` (1SA.17.49) |
| `fallen` | hold · fallen | — | *end* |

Ends in `fallen`.

### Celle Qui Sonde  `delilah`

*Enemies that never learn. This one asks, is lied to, tests the lie, and asks again.*

Drawn from JDG.16.6. Opens in `asking`.

Starting disposition: trust 0.6, fear 0, resolve 0.7.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `asking` | toward-player · coaxing | — | `testing` (JDG.16.9) |
| `testing` | hold · testing · subverting | — | `asking` (JDG.16.10)<br>`knowing` (JDG.16.17) |
| `knowing` | away-from-player · departing · subverting | — | *end* |

Ends in `knowing`.

### Celle Qui Use De La Loi  `jezebel`

*Villains you can fight. This one never touches you; it turns your own institutions against you.*

Drawn from 1KI.21.8. Opens in `observing`.

Starting disposition: trust 0.2, fear 0, resolve 0.9.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `observing` | hold · observing | — | `drafting` (1KI.21.7) |
| `drafting` | hold · writing · subverting | — | `accusing` (1KI.21.10) |
| `accusing` | hold · accusing · subverting | — | `confronted` (1KI.21.19) |
| `confronted` | hold · unmasked | — | *end* |

Ends in `confronted`.

### Celui Qui Derobe Les Coeurs  `absalom`

*Rivals that duel you. This one takes your allies one by one, by listening to them when you did not.*

Drawn from 2SA.15.6. Opens in `waiting-at-the-gate`.

Starting disposition: trust 0.5, fear 0, resolve 0.8.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `waiting-at-the-gate` | hold · greeting · subverting | — | `flattering` (2SA.15.3) |
| `flattering` | hold · embracing · subverting | resolve +0.05/s | `declaring` (2SA.15.10)<br>`waiting-at-the-gate` (2SA.15.6) |
| `declaring` | hold · crowned · hostile, subverting | — | *end* |

Ends in `declaring`.

### Celui Qui Cite Juste  `tempter`

*Enemies defeated by damage. This one uses your own sources accurately, and only an answer stops him.*

Drawn from MAT.4.6. Opens in `approaching`.

Starting disposition: trust 0.3, fear 0, resolve 1.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `approaching` | toward-player · approaching | — | `proposing` (MAT.4.3) |
| `proposing` | hold · proposing · offering | — | `citing` (MAT.4.6) |
| `citing` | hold · citing · offering, subverting | — | `departing` (MAT.4.11)<br>`prevailing` (MAT.4.9) |
| `departing` | away-from-player · leaving | — | *end* |
| `prevailing` | hold · enthroned · hostile, subverting | — | *end* |

Ends in `departing`, `prevailing`.

---

## Further

Ordinary problems: occlusion, remote orders, privacy, theft from the pool.

### Celui Qui Monte Pour Voir  `zacchaeus`

*NPCs that shove through a crowd or clip through it. This one climbs.*

Drawn from LUK.19.4. Opens in `blocked`.

Starting disposition: trust 0.5, fear 0.2, resolve 0.8.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `blocked` | toward-player · craning | — | `climbing` (LUK.19.4) |
| `climbing` | hold · perched | — | `called` (LUK.19.5)<br>`blocked` (LUK.19.4) |
| `called` | toward-player · hurrying · companion | — | *end* |

Ends in `called`.

### Celui Qui Comprend L Autorite  `centurion`

*Followers that must be escorted everywhere. This one executes an order you gave from far away.*

Drawn from MAT.8.8. Opens in `petitioning`.

Starting disposition: trust 0.7, fear 0.1, resolve 0.9.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `petitioning` | toward-player · petitioning | — | `trusting` (MAT.8.8) |
| `trusting` | toward-errand · executing | — | `done` (MAT.8.13) |
| `done` | hold · reporting | — | *end* |

Ends in `done`.

### Celui Qui Vient De Nuit  `nicodemus`

*NPCs with the same dialogue whoever is standing around. This one goes silent in company.*

Drawn from JHN.3.2. Opens in `distant`.

Starting disposition: trust 0.5, fear 0.5, resolve 0.5.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `distant` | hold · aloof | — | `approaching-unseen` (JHN.3.2) |
| `approaching-unseen` | toward-player · furtive | — | `speaking-freely` (JHN.3.2)<br>`distant` (JHN.3.2) |
| `speaking-freely` | hold · confiding | — | `distant` (JHN.3.2)<br>`open` (JHN.19.39) |
| `open` | toward-player · declared · companion | — | *end* |

Ends in `open`.

### Celui Qui Prend Dans Le Butin  `achan`

*Party members that never betray the group. This one steals from the shared pool and the whole party pays.*

Drawn from JOS.7.21. Opens in `marching`.

Starting disposition: trust 0.7, fear 0.2, resolve 0.4.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `marching` | toward-player · marching · companion | — | `coveting` (JOS.7.21) |
| `coveting` | hold · lingering · companion | resolve -0.1/s | `hiding` (JOS.7.21)<br>`marching` (JOS.7.21) |
| `hiding` | toward-player · concealing · companion | — | `exposed` (JOS.7.20) |
| `exposed` | hold · confessing | — | *end* |

Ends in `exposed`.

---

## Motivated

Transitions chosen by pull rather than by order. Same room, opposite behaviour.

### Marthe  `martha`

*NPCs that react to an event because the designer wired that event to that reaction.*

Drawn from LUK.10.40. Opens in `working`.

Starting disposition: trust 0.7, fear 0.15, resolve 0.8.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `working` | toward-errand · busy | — | `tidying` (LUK.10.40)<br>`listening` (LUK.10.39) |
| `tidying` | toward-errand · setting-right | fear +0.04/s | `complaining` (LUK.10.40)<br>`working` (LUK.10.40) |
| `listening` | toward-player · attending | — | `tidying` (LUK.10.40) |
| `complaining` | toward-player · protesting · refusing | — | `settled` (LUK.10.42) |
| `settled` | hold · still · companion | fear -0.06/s | `working` (LUK.10.40) |


### Marie  `mary`

*Two NPCs in one room reacting identically because reactions are wired to events.*

Drawn from LUK.10.39. Opens in `working`.

Starting disposition: trust 0.7, fear 0.15, resolve 0.8.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `working` | toward-errand · busy | — | `tidying` (LUK.10.40)<br>`listening` (LUK.10.39) |
| `tidying` | toward-errand · setting-right | — | `listening` (LUK.10.39) |
| `listening` | hold · attending · companion | — | `tidying` (LUK.10.40) |


### Elie  `elijah`

*Heroes that are fine after the boss dies. This one breaks after winning, not after losing.*

Drawn from 1KI.18.21. Opens in `watching`.

Starting disposition: trust 0.5, fear 0.1, resolve 0.95.

| state | intends | drifts | goes to |
| --- | --- | --- | --- |
| `watching` | hold · watching | — | `confronting` (1KI.18.21) |
| `confronting` | toward-player · challenging | fear +0.05/s | `spent` (1KI.19.4)<br>`watching` (1KI.18.39) |
| `spent` | away-from-player · fleeing | resolve -0.15/s | `hidden` (1KI.19.9) |
| `hidden` | hold · withdrawn | fear -0.05/s | `restored` (1KI.19.12) |
| `restored` | toward-player · steady · companion | resolve +0.08/s | `confronting` (1KI.19.15) |


---

## Drive profiles

Four layers each: what breaks the normal state, what it does first, where it goes if the strain
never lets up, and what brings it back. The last one is the layer games skip.

### Marthe  `martha`  ·  LUK.10.40

Wants: order 0.95 · service 0.9 · standing 0.55 · justice 0.4 · attention 0.2 · rest 0.15

- **Trigger** anything out of place, and anyone sitting while work is undone
- **Breaking point** she stops working to complain about who is not working
- **Resilience** being told plainly that the thing she is anxious about is not the one that matters

### Marie  `mary`  ·  LUK.10.42

Wants: attention 0.95 · rest 0.6 · justice 0.4 · service 0.3 · order 0.15 · standing 0.1

- **Trigger** something worth hearing, which outranks every task in the room
- **Breaking point** she does not have one here; the pressure lands on the person beside her
- **Resilience** not needed, and that is exactly what the other one cannot forgive

### Elie  `elijah`  ·  1KI.19.12

Wants: justice 0.98 · standing 0.6 · rest 0.5 · order 0.4 · attention 0.4 · service 0.35

- **Trigger** open injustice, or a crowd following someone it should not
- **Breaking point** total collapse straight after the victory, and flight into isolation
- **Resilience** sleep, food, silence, and a voice that is not in the wind or the fire

---

## Atmospheres

A room does two things: it puts a floor under what the scene is already doing, and it leans on
certain wants. Where it also *weighs*, it presses on the disposition itself, which is how a place
reaches every arc and not only the ones built on drives.

| place | source | floor | leans on | weighs |
| --- | --- | --- | --- | --- |
| **Nulle part** | GEN.1.2 | — | — | — |
| **L Effroi** | NUM.22.23 | clamour 0.35, strain 0.5 | rest ×1.5, standing ×0.3, attention ×0.7 | fear +0.07/s, resolve -0.03/s |
| **Le Desert** | 1KI.19.4 | disorder 0, clamour 0.05, strain 0.35 | order ×0.3, standing ×0.2, rest ×1.6, attention ×1.4, justice ×1.1 | fear -0.02/s, resolve -0.02/s |
| **Le Palais** | 1SA.18.6 | clamour 0.55, disorder 0.25, worthHearing 0.15 | standing ×1.7, order ×1.4, service ×1.2, rest ×0.4, attention ×0.6 | fear +0.02/s, resolve +0.02/s |
| **La Maison** | LUK.10.38 | unmetNeed 0.4, disorder 0.3, worthHearing 0.5 | service ×1.3, order ×1.2, attention ×1.1, standing ×0.7 | — |
| **Le Temple** | EXO.26.33 | worthHearing 0.6, clamour 0.2 | attention ×1.5, order ×1.3, justice ×1.4, standing ×0.5, rest ×0.8 | fear -0.03/s, resolve +0.03/s |
| **La Route** | LUK.10.31 | clamour 0.25, strain 0.15 | rest ×1.2, attention ×1.1, order ×0.6 | — |

- **Nulle part** a room with no character of its own
- **L Effroi** where a beast sees what its rider does not, and will not go on
- **Le Desert** where a man asks to die, and where he is answered quietly
- **Le Palais** where women sing your rival s name and a king counts the numbers
- **La Maison** a guest is here, the work is not done, and both facts are true at once
- **Le Temple** graduated ground, where what you are decides how far in you stand
- **La Route** where most pass by on the other side
