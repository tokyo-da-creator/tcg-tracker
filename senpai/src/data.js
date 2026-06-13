// Seed data + deterministic placeholder-art engine

export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export function artStyle(hue, opts = {}) {
  const h2 = (hue + (opts.spread || 38)) % 360;
  return {
    backgroundColor: `oklch(0.30 0.12 ${hue})`,
    backgroundImage:
      `radial-gradient(120% 90% at 18% 8%, oklch(0.60 0.16 ${h2} / 0.85) 0%, transparent 55%),` +
      `radial-gradient(110% 120% at 85% 95%, oklch(0.32 0.15 ${hue}) 0%, transparent 60%),` +
      `linear-gradient(155deg, oklch(${0.42 + (opts.lift ?? 0)} 0.15 ${hue}) 0%, oklch(${0.16 + (opts.lift ?? 0)} 0.08 ${(hue + 200) % 360}) 92%)`,
  };
}

export function accentFor(hue) { return `oklch(0.66 0.17 ${hue})`; }

export function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
  return '' + n;
}

export const ANIME = [
  { id: 'fmt', title: 'Frieren: Beyond Journey’s End', alt: 'Sousou no Frieren', hue: 168, studio: 'Madhouse', year: 2023, season: 'Fall', format: 'TV', episodes: 28, score: 9.31, members: 612000, rank: 1, genres: ['Adventure', 'Drama', 'Fantasy'], tags: ['Elf', 'Slow Life', 'Magic', 'Melancholy'], status: 'watching', progress: 19, fav: true, synopsis: 'After the demon king’s defeat, the elf mage Frieren outlives her companions and sets out to understand what it means to truly know another — retracing an old journey across a quiet, changed world.' },
  { id: 'csm', title: 'Chainsaw Man', alt: 'Chainsaw Man', hue: 18, studio: 'MAPPA', year: 2022, season: 'Fall', format: 'TV', episodes: 12, score: 8.52, members: 980000, rank: 14, genres: ['Action', 'Horror', 'Supernatural'], tags: ['Devils', 'Gore', 'Anti-Hero', 'Urban'], status: 'completed', progress: 12, myScore: 9, fav: true, synopsis: 'Denji, a young man drowning in debt, fuses with his chainsaw devil dog Pochita and is recruited as a Devil Hunter — chasing a normal life through extraordinary violence.' },
  { id: 'jjk', title: 'Jujutsu Kaisen', alt: 'Sorcery Fight', hue: 268, studio: 'MAPPA', year: 2020, season: 'Fall', format: 'TV', episodes: 24, score: 8.63, members: 1620000, rank: 9, genres: ['Action', 'Supernatural', 'School'], tags: ['Curses', 'Shounen', 'Dark'], status: 'watching', progress: 16, synopsis: 'To save his friends from a curse, Yuji Itadori swallows a cursed finger and becomes host to the deadly Ryomen Sukuna — entering a hidden world of jujutsu sorcerers.' },
  { id: 'aot', title: 'Attack on Titan', alt: 'Shingeki no Kyojin', hue: 32, studio: 'Wit / MAPPA', year: 2013, season: 'Spring', format: 'TV', episodes: 89, score: 9.05, members: 2510000, rank: 3, genres: ['Action', 'Drama', 'Fantasy'], tags: ['Military', 'Tragedy', 'Survival', 'Politics'], status: 'completed', progress: 89, myScore: 10, fav: true, synopsis: 'Behind enormous walls, humanity’s last cities hide from man-eating Titans. When the wall is breached, Eren Yeager vows to wipe the Titans out — and uncovers a far crueler truth.' },
  { id: 'jjs', title: 'Vinland Saga', alt: 'Vinland Saga', hue: 210, studio: 'Wit / MAPPA', year: 2019, season: 'Summer', format: 'TV', episodes: 48, score: 8.77, members: 720000, rank: 6, genres: ['Action', 'Adventure', 'Drama'], tags: ['Vikings', 'Historical', 'Revenge', 'Pacifism'], status: 'watching', progress: 31, synopsis: 'Raised among Viking warbands, young Thorfinn chases vengeance for his father’s murder — a brutal coming-of-age that slowly asks what a true warrior is for.' },
  { id: 'sxf', title: 'Spy × Family', alt: 'Spy x Family', hue: 348, studio: 'Wit / CloverWorks', year: 2022, season: 'Spring', format: 'TV', episodes: 37, score: 8.33, members: 1180000, rank: 22, genres: ['Action', 'Comedy', 'Slice of Life'], tags: ['Found Family', 'Espionage', 'Wholesome'], status: 'completed', progress: 37, myScore: 8, synopsis: 'A spy, an assassin, and a telepath form a fake family for a mission — each hiding their identity from the others while accidentally becoming the real thing.' },
  { id: 'dds', title: 'Demon Slayer', alt: 'Kimetsu no Yaiba', hue: 198, studio: 'ufotable', year: 2019, season: 'Spring', format: 'TV', episodes: 55, score: 8.46, members: 1740000, rank: 18, genres: ['Action', 'Fantasy', 'Historical'], tags: ['Demons', 'Swordplay', 'Family'], status: 'completed', progress: 55, myScore: 8, synopsis: 'After a demon slaughters his family and turns his sister, Tanjiro Kamado becomes a Demon Slayer — hunting for a cure and a reason to keep his gentleness intact.' },
  { id: 'cbe', title: 'Cyberpunk: Edgerunners', alt: 'Edgerunners', hue: 312, studio: 'Trigger', year: 2022, season: 'Fall', format: 'ONA', episodes: 10, score: 8.60, members: 640000, rank: 11, genres: ['Action', 'Sci-Fi', 'Drama'], tags: ['Cyberpunk', 'Tragedy', 'Neon'], status: 'completed', progress: 10, myScore: 9, fav: true, synopsis: 'In Night City, a street kid named David takes on illegal cyberware to survive — and burns brilliantly bright with a crew of edgerunners living on borrowed time.' },
  { id: 'tye', title: 'To Your Eternity', alt: 'Fumetsu no Anata e', hue: 138, studio: 'Brain’s Base', year: 2021, season: 'Spring', format: 'TV', episodes: 40, score: 8.10, members: 410000, rank: 40, genres: ['Adventure', 'Drama', 'Supernatural'], tags: ['Immortality', 'Loss', 'Tearjerker'], status: 'watching', progress: 7, synopsis: 'An immortal orb sent to Earth takes the shape of whatever it loses — learning to be human one fleeting, painful life at a time.' },
  { id: 'osi', title: 'Oshi no Ko', alt: 'My Star', hue: 330, studio: 'Doga Kobo', year: 2023, season: 'Spring', format: 'TV', episodes: 22, score: 8.45, members: 690000, rank: 19, genres: ['Drama', 'Mystery', 'Supernatural'], tags: ['Idols', 'Showbiz', 'Reincarnation', 'Dark'], status: 'planning', progress: 0, synopsis: 'A doctor is reborn as the child of the idol he adored — and grows up determined to expose the glittering, ruthless machinery of the entertainment industry.' },
  { id: 'mob', title: 'Mob Psycho 100', alt: 'Mob Psycho Hyaku', hue: 286, studio: 'Bones', year: 2016, season: 'Summer', format: 'TV', episodes: 37, score: 8.61, members: 580000, rank: 10, genres: ['Action', 'Comedy', 'Supernatural'], tags: ['Psychic', 'Coming of Age', 'Stylized'], status: 'completed', progress: 37, myScore: 9, synopsis: 'A painfully ordinary boy with overwhelming psychic power just wants to be liked — learning that who you are matters more than what you can do.' },
  { id: 'btr', title: 'Bocchi the Rock!', alt: 'Bocchi the Rock', hue: 350, studio: 'CloverWorks', year: 2022, season: 'Fall', format: 'TV', episodes: 12, score: 8.76, members: 470000, rank: 7, genres: ['Comedy', 'Music', 'Slice of Life'], tags: ['Band', 'Social Anxiety', 'Cute'], status: 'completed', progress: 12, myScore: 9, fav: true, synopsis: 'A cripplingly shy guitar prodigy joins a band and inches, song by song, toward the people she’s terrified to need.' },
  { id: 'ddd', title: 'Dandadan', alt: 'Dandadan', hue: 258, studio: 'Science SARU', year: 2024, season: 'Fall', format: 'TV', episodes: 12, score: 8.50, members: 520000, rank: 15, genres: ['Action', 'Comedy', 'Supernatural'], tags: ['Aliens', 'Ghosts', 'Romance', 'Kinetic'], status: 'watching', progress: 9, synopsis: 'A ghost-believer and an alien-believer each try to prove the other wrong — and get dragged into a chaotic, tender war of the occult and extraterrestrial.' },
  { id: 'sol', title: 'Solo Leveling', alt: 'Ore dake Level Up na Ken', hue: 222, studio: 'A-1 Pictures', year: 2024, season: 'Winter', format: 'TV', episodes: 25, score: 8.24, members: 880000, rank: 26, genres: ['Action', 'Adventure', 'Fantasy'], tags: ['Dungeons', 'Power Fantasy', 'Webtoon'], status: 'planning', progress: 0, synopsis: 'The world’s weakest hunter gains the power to grow without limit — climbing from prey to apex through a system only he can see.' },
  { id: 'apd', title: 'The Apothecary Diaries', alt: 'Kusuriya no Hitorigoto', hue: 88, studio: 'OLM / Toho', year: 2023, season: 'Fall', format: 'TV', episodes: 24, score: 8.66, members: 430000, rank: 8, genres: ['Drama', 'Mystery', 'Historical'], tags: ['Medicine', 'Court Intrigue', 'Clever Heroine'], status: 'watching', progress: 14, synopsis: 'A sharp-eyed apothecary sold into palace service can’t resist a mystery — quietly unraveling poisonings and politics from the shadows of the imperial court.' },
  { id: 'vio', title: 'Violet Evergarden', alt: 'Violet Evergarden', hue: 230, studio: 'Kyoto Animation', year: 2018, season: 'Winter', format: 'TV', episodes: 13, score: 8.67, members: 760000, rank: 5, genres: ['Drama', 'Fantasy', 'Slice of Life'], tags: ['War Aftermath', 'Letters', 'Tearjerker'], status: 'completed', progress: 13, myScore: 10, fav: true, synopsis: 'A former child soldier becomes a ghostwriter of letters — learning, one stranger’s feelings at a time, what her commander meant when he said he loved her.' },
];

export const byId = Object.fromEntries(ANIME.map(a => [a.id, a]));

export const CHARACTERS = [
  { id: 'c1', name: 'Frieren', anime: 'Frieren', role: 'Main', hue: 168, likes: 142000 },
  { id: 'c2', name: 'Denji', anime: 'Chainsaw Man', role: 'Main', hue: 18, likes: 98000 },
  { id: 'c3', name: 'Power', anime: 'Chainsaw Man', role: 'Main', hue: 6, likes: 121000 },
  { id: 'c4', name: 'Gojo Satoru', anime: 'Jujutsu Kaisen', role: 'Main', hue: 250, likes: 256000 },
  { id: 'c5', name: 'Levi', anime: 'Attack on Titan', role: 'Supporting', hue: 32, likes: 233000 },
  { id: 'c6', name: 'Thorfinn', anime: 'Vinland Saga', role: 'Main', hue: 210, likes: 87000 },
  { id: 'c7', name: 'Anya Forger', anime: 'Spy × Family', role: 'Main', hue: 348, likes: 188000 },
  { id: 'c8', name: 'Lucy', anime: 'Edgerunners', role: 'Main', hue: 312, likes: 94000 },
  { id: 'c9', name: 'Hitori Gotoh', anime: 'Bocchi the Rock!', role: 'Main', hue: 350, likes: 76000 },
  { id: 'c10', name: 'Maomao', anime: 'Apothecary Diaries', role: 'Main', hue: 88, likes: 68000 },
];

export const ME = { handle: '@kaito', name: 'Kaito Mori', hue: 4, bio: 'Sub over dub ✕ forever. Madhouse loyalist. Currently emotionally recovering from Frieren ep 19.', followers: 12840, following: 318, animeScore: 7.8, watched: 412, episodes: 7619, daysWatched: 64.2, joined: '2021' };

export const USERS = [
  { handle: '@renha', name: 'Ren Hayashi', hue: 268, mutual: true },
  { handle: '@miyu', name: 'Miyu Tanaka', hue: 330, mutual: true },
  { handle: '@8bitghost', name: 'Eli Vargas', hue: 210, mutual: false },
  { handle: '@sakuraburst', name: 'Sora Kim', hue: 138, mutual: true },
  { handle: '@deepcuts', name: 'Owen Reyes', hue: 32, mutual: false },
  { handle: '@nadeshiko', name: 'Aria Park', hue: 18, mutual: true },
];

export const userBy = Object.fromEntries(USERS.map(u => [u.handle, u]));

export const REVIEWS = [
  { id: 'r1', user: '@renha', anime: 'fmt', score: 10, when: '2d', likes: 1240, comments: 86, body: 'Frieren understands that grief is just love with nowhere to go. Madhouse turned a quiet manga into the most emotionally precise show of the decade. Episode 19 rearranged my brain chemistry.' },
  { id: 'r2', user: '@deepcuts', anime: 'cbe', score: 9, when: '5d', likes: 980, comments: 142, body: 'Trigger weaponizing color and motion to make you fall in love with people you know are doomed. Ten episodes, zero filler, one of the best uses of a soundtrack in any anime, period.' },
  { id: 'r3', user: '@miyu', anime: 'btr', score: 9, when: '1w', likes: 642, comments: 51, body: 'As someone who has hidden inside a literal cardboard box at a party — Bocchi is the most accurate depiction of social anxiety ever animated, and somehow it’s a joy to watch.' },
  { id: 'r4', user: '@8bitghost', anime: 'jjk', score: 8, when: '1w', likes: 410, comments: 73, body: 'MAPPA’s sakuga is unreal but the pacing in the back half asks a lot of you. Still, Gojo alone is worth the ticket. Domain expansion sequences go unbelievably hard.' },
];

export const reviewBy = Object.fromEntries(REVIEWS.map(r => [r.id, r]));

export const DISCUSSIONS = [
  { id: 'd1', title: 'Is Frieren the best-directed anime of the modern era?', user: '@renha', anime: 'fmt', when: '3h', replies: 214, likes: 612, body: 'The restraint in the direction — letting silences breathe, trusting the audience — feels almost unheard of for a modern shounen-adjacent title. What’s the closest comparison you’d make?' },
  { id: 'd2', title: 'Vinland Saga S2 with zero combat is a masterclass', user: '@8bitghost', anime: 'jjs', when: '8h', replies: 156, likes: 389, body: 'A season about a former warrior refusing to fight, set almost entirely on a farm, has no business being this gripping. The farmland arc is the bravest pivot in shounen.' },
];

export const ACTIVITY = [
  { user: '@miyu', verb: 'rated', anime: 'dds', score: 9, when: '12m' },
  { user: '@renha', verb: 'completed', anime: 'apd', when: '1h' },
  { user: '@sakuraburst', verb: 'added to Plan to Watch', anime: 'osi', when: '2h' },
  { user: '@nadeshiko', verb: 'is now watching', anime: 'jjs', when: '4h' },
];

export const NOTIFS = [
  { id: 'n1', type: 'episode', anime: 'fmt', title: 'New episode out', body: 'Episode 20 of Frieren just aired — continue your watch.', when: '14m', unread: true },
  { id: 'n2', type: 'follow', user: '@nadeshiko', title: 'New follower', body: 'started following you.', when: '1h', unread: true },
  { id: 'n3', type: 'like', user: '@renha', title: 'Liked your review', body: 'liked your review of Cyberpunk: Edgerunners.', when: '2h', unread: true },
  { id: 'n4', type: 'reply', user: '@8bitghost', title: 'Replied to you', body: 'replied in “Is Frieren the best-directed…”', when: '3h', unread: false },
  { id: 'n5', type: 'rec', anime: 'mob', title: 'Recommended for you', body: 'Because you loved Cyberpunk: Edgerunners.', when: '6h', unread: false },
  { id: 'n6', type: 'premiere', anime: 'ddd', title: 'Season premiere', body: 'Dandadan Season 2 premieres this Thursday.', when: '1d', unread: false },
  { id: 'n7', type: 'like', user: '@miyu', title: 'Liked your list', body: 'liked your list “Comfort rewatches.”', when: '2d', unread: false },
];

export const GENRES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Music'];
export const SEASONS = ['Winter 2026', 'Fall 2025', 'Summer 2025', 'Spring 2025'];
export const STUDIOS = ['MAPPA', 'ufotable', 'Madhouse', 'Wit Studio', 'Kyoto Animation', 'Bones', 'Trigger', 'CloverWorks'];
export const TRENDING_SEARCHES = ['Frieren ending explained', 'Best 2024 anime', 'Chainsaw Man movie', 'Underrated isekai', 'MAPPA vs ufotable', 'Cozy slice of life'];

export const LIST_STATUS = [
  { key: 'watching', label: 'Watching', hue: 168 },
  { key: 'completed', label: 'Completed', hue: 210 },
  { key: 'planning', label: 'Plan to Watch', hue: 268 },
  { key: 'hold', label: 'On Hold', hue: 48 },
  { key: 'dropped', label: 'Dropped', hue: 4 },
];
