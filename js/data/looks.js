// Cricket Legends (M18) - how the players on the pitch look: skin tones, hair colours, which 3D head
// pieces (tools/blender/head_render.py) each look uses, the looks computer players get for each origin,
// rival heads, the umpire, and the kit colour clash rule. Used by game/kitlook.js.
//
// Tints multiply the light-grey rendered parts, so a colour here is what that part comes out as.

const LOOKS_DATA = {
  // Skin tone (the creator's ids, CAREER_DATA.skinTones) -> the colour the skin is tinted.
  skin: { porcelain: '#fbe3cf', light: '#f2cba6', tan: '#d9a173', olive: '#bf8a5c', brown: '#93603b', deep: '#5e3a22' },
  // Hair colour (CAREER_DATA.hairColours ids): laid over the hair pieces (op = how, a = how strongly).
  hairColour: {
    black:  { color: '#231c1a', op: 'multiply', a: 0.9 },
    brown:  { color: '#6e4528', op: 'multiply', a: 0.6 },
    auburn: { color: '#a8401c', op: 'color', a: 0.6 },
    blonde: { color: '#f0cf78', op: 'color', a: 0.6 },
    grey:   { color: '#cfcfcf', op: 'color', a: 0.85 },
    blue:   { color: '#2f7bff', op: 'color', a: 0.7 },
  },

  // Your own player: the creator's look (a portrait id) -> the 3D pieces.
  head: { masculine: 'base_male_head', feminine: 'base_female_head' },
  hairFromLook: {
    look_base_male: 'hair_buzz', look_base_female: 'hairstyle_09',
    look_hair_01: 'hairstyle_01', look_hair_02: 'hairstyle_02', look_hair_03: 'hairstyle_03', look_hair_04: 'hairstyle_04',
    look_hair_05: 'hairstyle_05', look_hair_06: 'hairstyle_06', look_hair_07: 'hairstyle_07', look_hair_08: 'hairstyle_08',
    look_hair_09: 'hairstyle_09', look_hair_10: 'hairstyle_10', look_hair_11: 'hairstyle_11', look_hair_12: 'hairstyle_12',
  },
  facialFromLook: { look_facial_01: 'facial_hair_01', look_facial_02: 'facial_hair_02', look_facial_03: 'facial_hair_03', look_facial_04: 'facial_hair_04' },

  // Computer players: picked from these by a hash of their name (the same player always looks the same).
  // Repeats in a list make that choice more likely.
  hair: {
    masculine: ['hairstyle_01', 'hairstyle_02', 'hairstyle_05', 'hairstyle_06', 'hairstyle_07', 'hairstyle_08', 'hairstyle_10',
      'hairstyle_11', 'hairstyle_12', 'hair_buzz', 'hair_buzz', 'hair_slicked_back', 'hair_straight_sidepart', 'hair_curls_fade'],
    feminine: ['hairstyle_04', 'hairstyle_09', 'hairstyle_03', 'hairstyle_12', 'hairstyle_01', 'hair_locs'],
  },
  facial: ['facial_hair_01', 'facial_hair_02', 'facial_hair_03', 'facial_hair_04', 'beard_boxed', 'beard_full_long', 'beard_stubble', 'beard_trimmed'],
  facialChance: 0.35,
  hairColours: ['black', 'black', 'black', 'brown', 'brown', 'auburn', 'blonde', 'grey'],
  // A covering hides the hair under it (hijab) or sits on top of it.
  coverHidesHair: ['cover_hijab'],
  origins: {
    _any:        { m: ['base_male_head', 'head_m_south_asian', 'head_m_african'], f: ['base_female_head', 'head_f_south_asian', 'head_f_african'],
                   skins: ['light', 'tan', 'olive', 'brown'] },
    australia:   { m: ['base_male_head', 'base_male_head', 'base_male_head', 'head_m_south_asian', 'head_m_east_asian'],
                   f: ['base_female_head', 'base_female_head', 'base_female_head', 'head_f_east_asian', 'head_f_south_asian'],
                   skins: ['porcelain', 'light', 'light', 'tan', 'olive'], hairColours: ['brown', 'brown', 'blonde', 'black', 'auburn'] },
    england:     { m: ['base_male_head', 'base_male_head', 'base_male_head', 'head_m_south_asian', 'head_m_caribbean'],
                   f: ['base_female_head', 'base_female_head', 'base_female_head', 'head_f_south_asian', 'head_f_caribbean'],
                   skins: ['porcelain', 'light', 'light', 'tan', 'brown'], hairColours: ['brown', 'brown', 'blonde', 'black', 'auburn'] },
    ireland:     { m: ['base_male_head'], f: ['base_female_head'], skins: ['porcelain', 'porcelain', 'light'], hairColours: ['brown', 'auburn', 'blonde', 'black'] },
    newzealand:  { m: ['base_male_head', 'base_male_head', 'head_m_east_asian'], f: ['base_female_head', 'head_f_maori', 'head_f_maori'],
                   skins: ['light', 'light', 'tan', 'olive', 'brown'], hairColours: ['brown', 'black', 'blonde'] },
    india:       { m: ['head_m_south_asian'], f: ['head_f_south_asian'], skins: ['olive', 'brown', 'brown', 'deep'], cover: { m: ['cover_patka', 0.15] } },
    pakistan:    { m: ['head_m_south_asian'], f: ['head_f_south_asian'], skins: ['tan', 'olive', 'olive', 'brown'], cover: { f: ['cover_hijab', 0.25] }, facialChance: 0.6 },
    srilanka:    { m: ['head_m_south_asian'], f: ['head_f_south_asian'], skins: ['olive', 'brown', 'brown', 'deep'] },
    bangladesh:  { m: ['head_m_south_asian'], f: ['head_f_south_asian'], skins: ['olive', 'brown', 'brown', 'deep'], cover: { f: ['cover_hijab', 0.3] }, facialChance: 0.5 },
    // (no Middle Eastern male head yet: the Afghan head stands in)
    afghanistan: { m: ['head_m_afghan'], f: ['head_f_middle_eastern'], skins: ['light', 'tan', 'olive'], cover: { f: ['cover_hijab', 0.35] }, facialChance: 0.75 },
    southafrica: { m: ['head_m_african', 'head_m_african', 'base_male_head', 'head_m_south_asian'], f: ['head_f_african', 'head_f_african', 'base_female_head'],
                   skins: ['deep', 'brown', 'light', 'tan'], hair: { m: ['hair_buzz', 'hair_curls_fade', 'hair_afro', 'hairstyle_02', 'hair_slicked_back'] } },
    zimbabwe:    { m: ['head_m_african', 'head_m_african', 'base_male_head'], f: ['head_f_african', 'head_f_african', 'base_female_head'],
                   skins: ['deep', 'deep', 'brown', 'light'], hair: { m: ['hair_buzz', 'hair_curls_fade', 'hair_afro', 'hair_locs'] } },
    westindies:  { m: ['head_m_caribbean'], f: ['head_f_caribbean'], skins: ['brown', 'deep', 'deep'],
                   hair: { m: ['hair_locs', 'hair_afro', 'hair_buzz', 'hair_curls_fade'], f: ['hair_locs', 'hairstyle_04', 'hairstyle_09'] }, hairColours: ['black'] },
  },

  // Rivals use their own 3D heads (models/rivals); one without a model borrows another's.
  rivals: { captain: 'rival_the_champion' },     // (no Captain model yet)
  rivalSkin: { cannon: 'tan', champion: 'tan', finisher: 'brown', giant: 'olive', magician: 'tan', phantom: 'light', prodigy: 'light',
    technician: 'olive', trickster: 'tan', veteran: 'light', wall: 'brown', captain: 'tan' },

  umpire: { kit: ['#f1eee4', '#22232b'], look: { head: 'base_male_head', hair: 'hair_buzz', facial: 'beard_trimmed', skin: 'light', hairColour: 'grey' } },

  // Kit colours: if the two sides' main colours are closer than this (0..441, RGB distance), the
  // away side (the computer's) wears its second colour as its main one; still too close -> 'away'.
  clash: { minDistance: 110, away: '#f2f2f2' },
  // No team colours known (practice modes): you / them.
  defaultKit: { player: ['#1d4ed8', '#e8b21c'], ai: ['#0f8a4a', '#e8b21c'] },
  crest: { sizeM: 0.085, minFacing: 0.35 },   // the crest on the chest: size in metres, hidden when turned further away
};
