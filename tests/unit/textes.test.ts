import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLASSIC } from '../../src/core/modes/classic.ts';
import { MODE_IDS } from '../../src/core/rules.ts';
import {
  TEXTS,
  abandonMessage,
  effectLabel,
  lockedModeMessage,
  modeDiscoveredMessage,
  nameHintMessage,
  nextColorLabel,
  pointsLabel,
  sequenceLabel,
  skinChosenMessage,
  skinConditionLabel,
  skinProgressLabel,
  timeLabel,
} from '../../src/ui/texts.ts';

describe('ct_106_textes_de_reference : libellés de 02 et de 05', () => {
  it('le pluriel français commence à deux points', () => {
    assert.equal(pointsLabel(0), '0 point');
    assert.equal(pointsLabel(1), '1 point');
    assert.equal(pointsLabel(2), '2 points');
  });

  it('la confirmation d’abandon reprend la phrase de RG-74', () => {
    assert.equal(abandonMessage(9), 'Votre score de 9 points sera conservé.');
    assert.equal(TEXTS.pause.confirmTitle, 'Abandonner la partie ?');
  });

  it('les raisons de fin de partie sont celles de RG-44', () => {
    assert.equal(TEXTS.end.collision, 'Collision');
    assert.equal(TEXTS.end.victory, "Victoire ! L'aire de jeu est pleine.");
    assert.equal(TEXTS.end.abandon, 'Partie abandonnée');
  });

  it('le rappel de commande et le message d’orientation sont ceux de RG-05 et RG-81', () => {
    assert.equal(TEXTS.game.countdownSwipe, 'Glissez le doigt pour diriger le serpent');
    assert.equal(TEXTS.game.countdownArrows, 'Utilisez les flèches pour diriger le serpent');
    assert.equal(TEXTS.rotate, "Tournez votre téléphone à l'horizontale");
  });

  it('la ligne d’aide du champ du nom et son rappel sont ceux de 05 § 5', () => {
    assert.equal(
      nameHintMessage('Coco'),
      'Nom enregistré : Coco. Touchez le champ pour en saisir un autre.',
    );
    assert.equal(TEXTS.end.nameReminder, 'Touchez « Valider » pour enregistrer ce nom.');
  });

  it('E-08 : message de HYP-48, avec son code', () => {
    assert.equal(
      TEXTS.notices.progressNotSaved,
      "La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08)",
    );
  });

  it('la règle du mode Classique tient en deux phrases et 200 caractères', () => {
    assert.equal(CLASSIC.id, 'classic');
    assert.ok(TEXTS.modes.rules.classic.length <= 200);
    assert.ok(TEXTS.modes.rules.classic.split(/[.!?]\s/).length <= 2);
  });

  it('EF-01 CA-2, ENF-10 : la règle de chacun des 7 modes tient en deux phrases et 200 caractères', () => {
    for (const mode of MODE_IDS) {
      const rule = TEXTS.modes.rules[mode];
      assert.ok(rule.length > 0 && rule.length <= 200, `${mode} : ${rule.length} caractères`);
      assert.ok(rule.split(/[.!?]\s/).length <= 2, `${mode} : deux phrases au plus`);
    }
  });

  it('les libellés de RG-03 sont repris à l’identique', () => {
    assert.equal(
      TEXTS.modes.rules['time-attack'],
      'Mangez un maximum de bonbons en 60 secondes. Attention aux bords et à votre queue !',
    );
    assert.equal(
      TEXTS.modes.rules.asteroids,
      'Un nouvel astéroïde apparaît tous les 5 bonbons. Évitez-les, ainsi que les bords et votre queue.',
    );
    assert.equal(
      TEXTS.modes.rules['black-hole'],
      'Entrez dans un trou noir pour ressortir par son jumeau. Ne touchez ni les bords ni votre queue.',
    );
    assert.equal(
      TEXTS.modes.rules.zen,
      'Impossible de perdre : traversez les bords et votre propre corps. Quittez quand vous voulez avec le bouton pause.',
    );
    assert.match(
      TEXTS.modes.rules['bonus-traps'],
      /^Des bonbons spéciaux ralentissent, accélèrent/,
    );
    assert.match(TEXTS.modes.rules.constellation, /gagner 5 points de bonus/);
  });

  it('les textes des modes de 05 § 5 : bandeau, mode mystère, raison « Temps écoulé », découverte', () => {
    assert.equal(TEXTS.end.time, 'Temps écoulé');
    assert.equal(timeLabel(35), 'Temps 35 s');
    assert.equal(effectLabel('invert', 5), 'Effet : Inversion 5 s');
    assert.equal(effectLabel('slow', 6), 'Effet : Ralenti 6 s');
    assert.equal(effectLabel('turbo', 1), 'Effet : Turbo 1 s');
    assert.equal(effectLabel('shrink', null), 'Rétrécissement');
    assert.equal(nextColorLabel('purple'), 'Prochain : violet');
    assert.equal(nextColorLabel('light-blue'), 'Prochain : bleu clair');
    assert.equal(
      sequenceLabel(['pink', 'purple', 'light-blue']),
      'Constellation à tracer : rose, violet, bleu clair',
    );
    assert.equal(TEXTS.modes.mystery, 'Mode mystère');
    assert.equal(lockedModeMessage(3), 'Jouez encore 3 parties pour le découvrir');
    assert.equal(lockedModeMessage(2), 'Jouez encore 2 parties pour le découvrir');
    assert.equal(lockedModeMessage(1), 'Jouez encore 1 partie pour le découvrir');
    assert.equal(modeDiscoveredMessage(), 'Nouveau mode découvert : Constellation');
  });

  it('les textes des réglages sont ceux de RG-62, RG-63 et de 05 § 4.9', () => {
    const text = TEXTS.settings;
    assert.deepEqual(
      [text.title, text.control, text.swipe, text.arrows, text.sounds, text.effects],
      ['Réglages', 'Commande', 'Glissement', 'Flèches', 'Sons', 'Bruitages'],
    );
    assert.deepEqual(
      [text.music, text.vibrations, text.effectsState.on, text.musicState.off],
      ['Musique', 'Vibrations', 'Activés', 'Coupée'],
    );
    assert.equal(text.vibrationsUnavailable, 'Non disponible sur ce téléphone');
    assert.equal(text.nextGame, "Le changement s'applique à la prochaine partie.");
    assert.match(text.arrowsHelp, /Avec les flèches, la grille est un peu plus petite\./);
  });

  it('les textes de l’écran Skins sont ceux de RG-59, RG-60 et de 05 § 4.8', () => {
    const text = TEXTS.skins;
    assert.deepEqual(
      [text.title, text.chosen, text.unlocked, text.locked, text.remove],
      ['Skins', 'Choisi', 'Débloqué', 'Verrouillé', 'Retirer'],
    );
    assert.deepEqual(Object.values(text.categories), ['Forme', 'Motif', 'Traînée', 'Décor']);
    assert.equal(
      skinChosenMessage('shape-comet'),
      'Skin choisi : Comète. Il sera utilisé à la prochaine partie.',
    );
  });

  it('chaque condition de RG-54 est écrite avec sa progression chiffrée', () => {
    const rocket = { kind: 'total-candies', count: 250 } as const;
    assert.equal(skinConditionLabel(rocket), '250 bonbons mangés au total');
    assert.equal(skinProgressLabel(rocket, 63, 250), '63 / 250 bonbons');
    const saucer = { kind: 'total-candies', count: 1000 } as const;
    assert.equal(skinConditionLabel(saucer), '1\u00a0000 bonbons mangés au total');
    assert.equal(skinProgressLabel(saucer, 63, 1000), '63 / 1\u00a0000 bonbons');
    const comet = { kind: 'score', mode: 'classic', points: 15 } as const;
    assert.equal(skinConditionLabel(comet), 'Atteindre 15 points dans une partie Classique');
    assert.equal(skinProgressLabel(comet, 9, 15), 'meilleur score : 9 / 15');
    const nebula = { kind: 'score', mode: 'asteroids', points: 15 } as const;
    assert.equal(
      skinConditionLabel(nebula),
      "Atteindre 15 points dans une partie Champ d'astéroïdes",
    );
    const milky = { kind: 'all-modes' } as const;
    assert.equal(
      skinConditionLabel(milky),
      'Avoir terminé au moins une partie dans chacun des 7 modes',
    );
    assert.equal(skinProgressLabel(milky, 3, 7), '3 / 7 modes');
  });
});
