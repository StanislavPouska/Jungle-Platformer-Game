/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level, PuzzleGate } from './types';

export type Lang = 'en' | 'cs';

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
];

export const UI = {
  en: {
    brandTag1: 'SIDE-VIEW 2D',
    brandTag2: 'HTML5 ULTRA',
    brandName1: "Mowgli's",
    brandName2: 'Toad Jumper',
    toggleSound: 'Toggle all sounds',
    openMenu: 'Open menu (Esc)',
    tabGame: 'Game Center',
    tabHelp: 'Jungle Guide',
    jungleLevels: 'Jungle Levels',
    stage: 'STAGE',
    items: 'Items',
    pcs: 'Pcs',
    start: 'Start',
    scoreMultipliers: 'Jungle Score Multipliers',
    banana: 'Banana',
    mango: 'Mango',
    goldenStar: 'Golden Star',
    activeMission: 'Active Mission',
    safetyAt: 'SAFETY AT',
    bannerSuffix: "Help Mowgli jog, jump, crouch and slide over the custom bouncy Toad mushrooms safely. Reach the glowing fuchsia energy portal to progress! Press Esc anytime to open the menu.",
    guideTitle: 'Jungle Survival Hand-Book',
    guideSubtitle: 'Master physics variables, keyboard shortcuts, and toad-spring forces.',
    howToadSprings: 'How Toad Springs Work',
    toadSpringsIntro: 'Stepping directly onto colored Toads activates their elastic muscles. When a player lands on a Toad:',
    springCoefficient: 'Spring Coefficient:',
    springCoefficientBody: 'Purple and Red Toads feature higher base elasticity compared to Green ones.',
    actionMomentum: 'Action Momentum:',
    actionMomentumBody: 'Pressing the JUMP key exactly as you make contact boosts your velocity upward by an additional 25%, perfect for soaring to high canopies.',
    physicsDeck: 'Physics Modifier Deck Engine',
    physicsDeckIntro: 'Unlike stiff pre-built side-scrollers, Mowgli Jumper lets you modify gravity in real-time. Open the Menu (Esc) → Settings tab to tweak values:',
    lowerGravity: 'Lower Gravity',
    lowerGravityBody: 'for longer airy hang-times to cross vast canyons easily.',
    increaseJogSpeed: 'Increase Jog Speed',
    increaseJogSpeedBody: 'to speed-run stages with swift momentum.',
    toggleDoubleJumpBody: 'on or off to change game difficulty.',
    toggleDoubleJumpBold: 'Toggle Double Jump',
    loadGameCenter: '➔ Load Game Center',

    // MainMenu
    menuPauseTitle: 'Game Paused — Menu',
    menuMainTitle: 'Main Menu',
    resumeTooltip: 'Resume (Esc)',
    menuTabPlay: 'New Game',
    menuTabSave: 'Save',
    menuTabLoad: 'Load',
    menuTabSettings: 'Settings',
    playIntro: 'Help Mowgli leap across the canopy, bounce on bouncy Toads, and reach the safety portal. Starting a new game resets your score, deaths, and level progress.',
    startNewGame: 'Start New Game',
    restartNewGame: 'Restart New Game',
    resumeCurrentRun: 'Resume current run',
    saveIntro: 'Save your current score, level, and physics settings to this browser so you can pick up later.',
    saveGame: 'Save Game',
    lastSave: 'Last save:',
    loadIntroFound: 'A saved jungle run was found in this browser. Load it to continue where you left off.',
    loadIntroMissing: 'No saved game found yet. Save a run first from the Save tab.',
    loadGame: 'Load Game',
    saved: 'Saved:',
    physicsTuners: 'Physics Tuners',
    gravityDensity: 'Gravity Density:',
    jumpVelocity: 'Jump Velocity:',
    jogSpeed: 'Mowgli Jog Speed:',
    enableDoubleJump: 'Enable Jungle Double Jump',
    audioMixer: 'Audio Mixer',
    fxLabel: 'FX (Jump, Boing, Fruits):',
    musicLabel: 'Music (Tribal Loop):',
    controlsHint: 'A/D or ←/→ move, W/Space jump, S crouch, Esc menu',
    deathsLabel: 'Deaths:',
    bananasLabel: 'Bananas:',
    scoreLabel: 'Score:',
    resetRun: 'Reset Run',
    resetTooltip: 'Reset score and levels',
    tipText: 'Tip: Land directly on top of colored Toads to bounce high into the canopy! Hold the Jump key while bouncing for maximum spring momentum.',
    languageLabel: 'Language',

    // GameCanvas chrome
    pause: 'Pause',
    resume: 'Resume',
    pauseTooltip: 'Pause / open menu (Esc)',
    canvasTitle: 'Mowgli platformer loop screen',
    hideTips: 'Hide Tips',
    showKeys: 'Show Keys',
    tipsToggleTooltip: 'Toggle overlay controls prompt info',
    levelCompleteTitle: 'Level Complete!',
    levelCompleteBody: 'Excellent jumps! Mowgli found the Safety Gate. +150 Completion Points awarded!',
    replayStage: 'Replay Stage',
    nextStage: 'Next Stage ➔',
    timesUpTitle: "Time's Up!",
    timesUpBody: 'The jungle clock ran out. Collectibles add extra seconds on timed stages — try again fast and grab the bonuses.',
    restartStage: 'Restart Stage',
    wrongFeedback: "Not quite — the stone monkeys don't move. Try again! (-3s)",
    answerRiddle: 'Answer the Riddle',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    crouchDrop: 'Crouch / Drop',
    springJumpTooltip: 'Spring jump',
    downLabel: 'DOWN',
    springJumpLabel: 'Spring JUMP',

    // Canvas-drawn text (ctx.fillText)
    canvasGamePaused: 'GAME PAUSED',
    canvasPausedHint: 'Press Pause button or play/resume to continue',
    canvasTipMove: '◄ A / D ► : Run Left/Right',
    canvasTipJump: '▲ SPACE / W  : Jump Canopy',
    canvasTime: 'TIME:',
    canvasSafetyGate: 'SAFETY GATE',
  },
  cs: {
    brandTag1: '2D BOČNÍ POHLED',
    brandTag2: 'HTML5 ULTRA',
    brandName1: 'Mauglího',
    brandName2: 'Žabí Skoky',
    toggleSound: 'Zapnout/vypnout zvuk',
    openMenu: 'Otevřít menu (Esc)',
    tabGame: 'Herní Centrum',
    tabHelp: 'Džunglový Průvodce',
    jungleLevels: 'Úrovně Džungle',
    stage: 'ÚROVEŇ',
    items: 'Předměty',
    pcs: 'ks',
    start: 'Start',
    scoreMultipliers: 'Násobiče Skóre v Džungli',
    banana: 'Banán',
    mango: 'Mango',
    goldenStar: 'Zlatá Hvězda',
    activeMission: 'Aktivní Mise',
    safetyAt: 'BEZPEČÍ NA',
    bannerSuffix: 'Pomoz Mauglímu běhat, skákat, plazit se a klouzat přes pružné žáby v bezpečí. Dosáhni zářícího fuchsiového portálu a postup dál! Stiskni Esc kdykoliv pro otevření menu.',
    guideTitle: 'Příručka Přežití v Džungli',
    guideSubtitle: 'Zvládni proměnné fyziky, klávesové zkratky a sílu žabích pružin.',
    howToadSprings: 'Jak Funguje Žabí Pružina',
    toadSpringsIntro: 'Šlápnutím přímo na barevné žáby aktivuješ jejich pružné svaly. Když hráč dopadne na žábu:',
    springCoefficient: 'Koeficient Pružnosti:',
    springCoefficientBody: 'Fialové a červené žáby mají vyšší základní pružnost než zelené.',
    actionMomentum: 'Akční Hybnost:',
    actionMomentumBody: 'Stisknutím klávesy SKOK přesně ve chvíli dopadu zvýšíš svou rychlost vzhůru o dalších 25 %, ideální pro vznesení se do vysokých korun stromů.',
    physicsDeck: 'Panel Úpravy Fyziky',
    physicsDeckIntro: 'Na rozdíl od klasických plošinovek umožňuje tato hra upravovat gravitaci v reálném čase. Otevři Menu (Esc) → záložku Nastavení a uprav hodnoty:',
    lowerGravity: 'Nižší gravitace',
    lowerGravityBody: 'pro delší vznášení ve vzduchu a snadnější překonávání velkých kaňonů.',
    increaseJogSpeed: 'Zvýšení rychlosti běhu',
    increaseJogSpeedBody: 'pro rychlé proběhnutí úrovní se svižnou hybností.',
    toggleDoubleJumpBody: 'a změň tak obtížnost hry.',
    toggleDoubleJumpBold: 'Zapni nebo vypni Dvojitý skok',
    loadGameCenter: '➔ Zpět do Herního Centra',

    // MainMenu
    menuPauseTitle: 'Hra Pozastavena — Menu',
    menuMainTitle: 'Hlavní Menu',
    resumeTooltip: 'Pokračovat (Esc)',
    menuTabPlay: 'Nová Hra',
    menuTabSave: 'Uložit',
    menuTabLoad: 'Načíst',
    menuTabSettings: 'Nastavení',
    playIntro: 'Pomoz Mauglímu skákat přes koruny stromů, odrážet se na pružných žábách a dosáhnout bezpečného portálu. Spuštěním nové hry vynuluješ skóre, počet smrtí a postup v úrovních.',
    startNewGame: 'Spustit Novou Hru',
    restartNewGame: 'Restartovat Hru',
    resumeCurrentRun: 'Pokračovat v aktuální hře',
    saveIntro: 'Ulož si aktuální skóre, úroveň a nastavení fyziky do tohoto prohlížeče, abys mohl pokračovat později.',
    saveGame: 'Uložit Hru',
    lastSave: 'Poslední uložení:',
    loadIntroFound: 'V tomto prohlížeči byl nalezen uložený postup v džungli. Načti ho a pokračuj, kde jsi skončil.',
    loadIntroMissing: 'Zatím nebyla nalezena žádná uložená hra. Nejprve ulož postup v záložce Uložit.',
    loadGame: 'Načíst Hru',
    saved: 'Uloženo:',
    physicsTuners: 'Úprava Fyziky',
    gravityDensity: 'Hustota Gravitace:',
    jumpVelocity: 'Rychlost Skoku:',
    jogSpeed: 'Rychlost Běhu Mauglího:',
    enableDoubleJump: 'Povolit Dvojitý Skok',
    audioMixer: 'Zvukový Mixpult',
    fxLabel: 'Efekty (Skok, Odraz, Plody):',
    musicLabel: 'Hudba (Kmenová Smyčka):',
    controlsHint: 'A/D nebo ←/→ pohyb, W/Mezerník skok, S podřep, Esc menu',
    deathsLabel: 'Smrti:',
    bananasLabel: 'Banány:',
    scoreLabel: 'Skóre:',
    resetRun: 'Resetovat Hru',
    resetTooltip: 'Resetovat skóre a úrovně',
    tipText: 'Tip: Dopadni přímo na barevné žáby a vymrskni se vysoko do korun stromů! Při odrazu podrž klávesu skoku pro maximální sílu pružiny.',
    languageLabel: 'Jazyk',

    // GameCanvas chrome
    pause: 'Pauza',
    resume: 'Pokračovat',
    pauseTooltip: 'Pauza / otevřít menu (Esc)',
    canvasTitle: 'Herní plocha Mauglího plošinovky',
    hideTips: 'Skrýt Nápovědu',
    showKeys: 'Zobrazit Klávesy',
    tipsToggleTooltip: 'Přepnout zobrazení nápovědy ovládání',
    levelCompleteTitle: 'Úroveň Dokončena!',
    levelCompleteBody: 'Skvělé skákání! Mauglí našel Bezpečnou Bránu. +150 bodů za dokončení!',
    replayStage: 'Hrát Znovu',
    nextStage: 'Další Úroveň ➔',
    timesUpTitle: 'Čas Vypršel!',
    timesUpBody: 'Džunglové hodiny došly. Sbírané předměty přidávají vteřiny navíc na časovaných úrovních — zkus to znovu rychleji a sbírej bonusy.',
    restartStage: 'Restartovat Úroveň',
    wrongFeedback: 'To není správně — kamenné opice se nehnou. Zkus to znovu! (-3s)',
    answerRiddle: 'Odpovědět na Hádanku',
    moveLeft: 'Pohyb vlevo',
    moveRight: 'Pohyb vpravo',
    crouchDrop: 'Podřep / Sklonit se',
    springJumpTooltip: 'Pružinový skok',
    downLabel: 'DOLŮ',
    springJumpLabel: 'SKOK',

    // Canvas-drawn text (ctx.fillText)
    canvasGamePaused: 'HRA POZASTAVENA',
    canvasPausedHint: 'Stiskni tlačítko Pauza nebo Pokračovat pro návrat do hry',
    canvasTipMove: '◄ A / D ► : Běh Vlevo/Vpravo',
    canvasTipJump: '▲ MEZERNÍK / W : Skok do Korun',
    canvasTime: 'ČAS:',
    canvasSafetyGate: 'BEZPEČNÁ BRÁNA',
  },
};

export type UIStrings = typeof UI.en;

interface LevelText {
  name: string;
  description: string;
}

// Only Czech overrides are stored here — English text lives on the Level
// objects themselves in data.ts and is used as the default/fallback.
const LEVEL_TEXT_CS: Record<number, LevelText> = {
  1: {
    name: 'Přechod Korunami Stromů',
    description: 'Skákej přes staré mechové kmeny a odrážej se na pomocných zelených žábách, aby ses dostal přes džunglové nebe!'
  },
  2: {
    name: 'Mystické Bažiny',
    description: 'Vyhni se hlubokému blátivému dnu! Vyžadují se přesně načasované skoky na pohyblivé liánové mosty a jedovaté červené pružné žáby.'
  },
  3: {
    name: 'Starobylé Ruiny v Džungli',
    description: 'Poslední velká zkouška chrámu! Použij vodorovně se pohybující plošiny a po sobě jdoucí vysoké skoky na žábách, abys bezpečně dosáhl starobylého oltáře.'
  },
  4: {
    name: 'Hodinové Proudy',
    description: 'Sprint skrz proudící ruiny. Dosáhni Bezpečné Brány do 10 vteřin, dokud tě udrží při životě časové bonusy z banánů a hvězd.'
  },
  5: {
    name: 'Stezka Sloní Patroly',
    description: 'Pochoduj po staré sloní stezce, než dojdou hodiny! Sbírej po cestě ovoce, aby ses udržel nad vodou.'
  },
  6: {
    name: 'Kaova Hypnotická Skrýš',
    description: 'Kolébající se jeskyně z liánů a skrytých svinutí. Nezastavuj se, než tě dostihne hypnotická mlha a dojde čas!'
  },
  7: {
    name: 'Hádanka Chrámu Bandar-Logů',
    description: 'Kamenné opičí sochy hlídají zničený chrámový vchod. Jen ten, kdo skutečně zná příběh Mauglího, může vyřešit hádanku a projít.'
  },
  8: {
    name: 'Spálená Stezka Šér Chána',
    description: 'Džungle za suchého období praská pod nohama. Zůstaň rychlý a lehkonohý — zdržovat se tu není nikdy bezpečné.'
  },
  9: {
    name: 'Sprint Monsunových Vodopádů',
    description: 'Déšť bubnuje na koruny stromů a řeky rychle stoupají. Přejdi houpající se liánové mosty, než tě dostihnou vodopády!'
  },
  10: {
    name: 'Návrat do Lidské Vesnice',
    description: 'Poslední úsek! Proběhni posledními ruinami ke světlům lidské vesnice, než dojde čas. Mauglího cesta tu končí.'
  },
};

export function getLevelText(level: Level, lang: Lang): LevelText {
  if (lang === 'cs' && LEVEL_TEXT_CS[level.id]) {
    return LEVEL_TEXT_CS[level.id];
  }
  return { name: level.name, description: level.description };
}

interface PuzzleTextOverride {
  title: string;
  intro: string;
  questions: { question: string; choices: string[] }[];
}

// Czech override for the Bandar-Log riddle gate (level 7). Keyed by the
// puzzle's triggerX since it's the only stable identifier on PuzzleGate.
const PUZZLE_TEXT_CS: Record<number, PuzzleTextOverride> = {
  1010: {
    title: 'Hádanková Brána Bandar-Logů',
    intro: "Starobylé kamenné opice blokují cestu. Uhnou jen tomu, kdo skutečně zná příběh Mauglího — odpověz správně na všechny tři otázky, abys mohl projít!",
    questions: [
      {
        question: 'Kdo je mudrc, černý panter, který najde malého Mauglího a přivede ho k smečce vlků?',
        choices: ['Balú', 'Baghíra', 'Kaa', 'Akela'],
      },
      {
        question: 'Který pohodový medvěd učí Mauglího o tom, co je v životě opravdu potřeba?',
        choices: ['Balú', 'Šér Chán', 'Plukovník Hathi', 'Baghíra'],
      },
      {
        question: 'Který tygr chce Mauglího ulovit, protože se bojí a nenávidí lidi?',
        choices: ['Kaa', 'Král Louie', 'Šér Chán', 'Akela'],
      },
    ],
  },
};

export function getPuzzleText(puzzle: PuzzleGate, lang: Lang): PuzzleTextOverride {
  const override = lang === 'cs' ? PUZZLE_TEXT_CS[puzzle.triggerX] : undefined;
  if (override) return override;
  return {
    title: puzzle.title,
    intro: puzzle.intro,
    questions: puzzle.questions.map((q) => ({ question: q.question, choices: q.choices })),
  };
}
