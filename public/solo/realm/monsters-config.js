// ===== MONSTER KONFIGURATION =====
// Diese Datei definiert alle Monster mit ihren Eigenschaften, Levelbereichen und Special-Fähigkeiten

const MONSTERS_CONFIG = {
  // ===== STANDARD MONSTER (mit Levelbereichen) =====
  frog: {
    name: '🐸 FROG',
    image: 'bild/frog.webp',
    minLevel: 1,
    maxLevel: 10,
    baseHP: 8,
    baseAtk: 2,
    baseGold: 5,
    abilities: []
  },
  gobold: {
    name: '🧌 GOBOLD',
    image: 'bild/gobold.webp',
    minLevel: 5,
    maxLevel: 15,
    baseHP: 12,
    baseAtk: 3,
    baseGold: 8,
    abilities: []
  },
  wolf: {
    name: '🐺 WOLF',
    image: 'bild/wolf.webp',
    minLevel: 11,
    maxLevel: 20,
    baseHP: 15,
    baseAtk: 4,
    baseGold: 12,
    abilities: []
  },
  bear: {
    name: '🐻 BEAR',
    image: 'bild/bear.webp',
    minLevel: 21,
    maxLevel: 30,
    baseHP: 25,
    baseAtk: 6,
    baseGold: 20,
    abilities: []
  },
  golem: {
    name: '🗿 GOLEM',
    image: 'bild/golem.webp',
    minLevel: 25,
    maxLevel: 35,
    baseHP: 30,
    baseAtk: 5,
    baseGold: 25,
    abilities: []
  },
  snake: {
    name: '🐍 SNAKE',
    image: 'bild/snake.webp',
    minLevel: 31,
    maxLevel: 40,
    baseHP: 18,
    baseAtk: 5,
    baseGold: 18,
    abilities: []
  },
  spider: {
    name: '🕷️ SPIDER',
    image: 'bild/spider.webp',
    minLevel: 41,
    maxLevel: 50,
    baseHP: 20,
    baseAtk: 6,
    baseGold: 22,
    abilities: ['poison_attack']  // +2 Feld Schaden
  },
  freggz: {
    name: '🐸 FREGGZ',
    image: 'bild/freggz.webp',
    minLevel: 51,
    maxLevel: 60,
    baseHP: 28,
    baseAtk: 7,
    baseGold: 30,
    abilities: []
  },
  hexe: {
    name: '🧙‍♀️ HEXE',
    image: 'bild/hexe.webp',
    minLevel: 61,
    maxLevel: 70,
    baseHP: 24,
    baseAtk: 8,
    baseGold: 35,
    abilities: ['confusion']  // Du greifst dich selbst an
  },
  snowman: {
    name: '⛄ SNOWMAN',
    image: 'bild/snowman.webp',
    minLevel: 71,
    maxLevel: 80,
    baseHP: 32,
    baseAtk: 9,
    baseGold: 40,
    abilities: ['slow', 'double_attack']  // Verlangsamt + 2x Angriff
  },
  inferno: {
    name: '🔥 INFERNO',
    image: 'bild/inferno.webp',
    minLevel: 81,
    maxLevel: 100,
    baseHP: 40,
    baseAtk: 12,
    baseGold: 50,
    abilities: ['fire_damage']  // Extra Feuerschaden
  },
  
  // ===== BOSS MONSTER =====
  dragon: {
    name: '🐉 DRAGON',
    image: 'bild/frog.webp', // Boss bleibt frog
    minLevel: 1,
    maxLevel: 999,
    baseHP: 100,
    baseAtk: 20,
    baseGold: 200,
    isBoss: true,
    abilities: ['fire_damage']
  }
};

// ===== MONSTER-AUSWAHL nach Level =====
function getMonsterForLevel(heroLevel) {
  const currentHeroLevel = heroLevel || 1;
  
  // Ab Level 90: Alle Monster kombinieren
  if (currentHeroLevel >= 90) {
    return getAllMonstersForLevel(currentHeroLevel);
  }
  
  // Normale Level-Range Logik
  const availableMonsters = Object.entries(MONSTERS_CONFIG)
    .filter(([key, data]) => {
      if (data.isBoss) return false; // Boss separat
      return currentHeroLevel >= data.minLevel && currentHeroLevel <= data.maxLevel;
    })
    .map(([key, data]) => ({ key, ...data }));
  
  if (availableMonsters.length === 0) {
    return [{ key: 'frog', ...MONSTERS_CONFIG.frog }];
  }
  
  // Zufälliges Monster auswählen
  return [availableMonsters[Math.floor(Math.random() * availableMonsters.length)]];
}

// ===== ALLE MONSTER für Level 90+ =====
function getAllMonstersForLevel(heroLevel) {
  const availableMonsters = Object.entries(MONSTERS_CONFIG)
    .filter(([key, data]) => {
      if (data.isBoss) return false;
      return heroLevel >= data.minLevel && heroLevel <= data.maxLevel;
    })
    .map(([key, data]) => ({ key, ...data }));
  
  if (availableMonsters.length === 0) {
    return [{ key: 'frog', ...MONSTERS_CONFIG.frog }];
  }
  
  // Ab Level 90: Höhere Wahrscheinlichkeit für mehrere Monster
  const monsterCount = Math.random() < 0.6 ? 2 : Math.random() < 0.8 ? 3 : 1;
  const selected = [];
  
  for (let i = 0; i < monsterCount && i < availableMonsters.length; i++) {
    const randomIdx = Math.floor(Math.random() * availableMonsters.length);
    selected.push(availableMonsters[randomIdx]);
  }
  
  return selected;
}

// ===== SPECIAL-FÄHIGKEITEN ANWENDEN =====
function applyMonsterAbilities(monster, isPlayerAttack) {
  const results = {
    damageBonus: 0,
    effect: '',
    damageFields: 0
  };
  
  if (!monster.abilities) return results;
  
  monster.abilities.forEach(ability => {
    switch(ability) {
      case 'poison_attack':
        // Spider: +2 Feldschaden
        results.damageBonus += 2;
        results.damageFields += 2;
        results.effect = '🕷️ GIFT-ANGRIFF! +2 Feldschaden!';
        break;
        
      case 'confusion':
        // Hexe: Du greifst dich selbst an (Wahrscheinlichkeit)
        if (Math.random() < 0.4) {
          results.effect = '🧙‍♀️ VERWIRRUNG! Du greifst dich SELBST an!';
          results.selfDamage = true;
        }
        break;
        
      case 'slow':
        // Snowman: Verlangsamt
        results.effect = '⛄ VERLANGSAMT! Deine Angriffe sind langsamer!';
        results.slowTime = 1000; // ms extra Verzögerung
        break;
        
      case 'double_attack':
        // Snowman: 2x Angriffe
        if (Math.random() < 0.5) {
          results.doubleAttack = true;
          results.effect = '⛄ DOPPEL-ANGRIFF!';
        }
        break;
        
      case 'fire_damage':
        // Inferno: Extra Feuerschaden
        results.damageBonus += 3;
        results.effect = '🔥 FEUERSCHADEN! +3 Schaden!';
        break;
    }
  });
  
  return results;
}

// ===== MONSTER-SKALIERUNG nach Hero-Level =====
function getScaledMonster(monsterData, heroLevel) {
  heroLevel = heroLevel || 1;
  
  // Berechne Skalierung basierend auf Hero-Level
  const scaleFactor = 1 + (heroLevel * 0.05);
  
  return {
    ...monsterData,
    hp: Math.floor(monsterData.baseHP * scaleFactor),
    atk: Math.floor(monsterData.baseAtk * scaleFactor),
    gold: Math.floor(monsterData.baseGold * scaleFactor)
  };
}

// ===== BOSS-MONSTER als Zufälligkeit =====
function selectBossMonster() {
  // Boss ist immer Dragon mit frog-Bild
  return {
    key: 'dragon',
    name: '🐉 DRAGON',
    image: 'bild/frog.webp',
    isBoss: true,
    baseHP: 100,
    baseAtk: 20,
    baseGold: 200,
    abilities: ['fire_damage']
  };
}

// ===== HERO-LEVEL BERECHNUNG =====
function calculateHeroLevel(totalKills) {
  // Linear: 150 Kills pro Level
  // Level 1 = 150 Kills
  // Level 2 = 300 Kills
  // Level 3 = 450 Kills
  // etc.
  
  if (totalKills < 150) return 0;
  return Math.floor(totalKills / 150);
}

function getKillsNeededForLevel(level) {
  // Kills benötigt um Level zu erreichen
  return level * 150;
}

function getKillsForCurrentLevel(totalKills) {
  // Kills im aktuellen Level (0-150)
  return totalKills % 150;
}

// ===== EXPORT für Verwendung in game.js =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MONSTERS_CONFIG,
    getMonsterForLevel,
    getAllMonstersForLevel,
    applyMonsterAbilities,
    getScaledMonster,
    selectBossMonster,
    calculateHeroLevel,
    getKillsNeededForLevel,
    getKillsForCurrentLevel
  };
}
