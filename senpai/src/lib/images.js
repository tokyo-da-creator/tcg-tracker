// Maps our internal anime IDs → AniList media IDs for cover/banner fetching
const ANILIST_IDS = {
  fmt: 154587,  // Frieren
  csm: 127230,  // Chainsaw Man
  jjk: 113415,  // Jujutsu Kaisen
  aot: 16498,   // Attack on Titan
  jjs: 101348,  // Vinland Saga
  sxf: 140960,  // Spy × Family
  dds: 101922,  // Demon Slayer
  cbe: 120377,  // Cyberpunk: Edgerunners
  tye: 124080,  // To Your Eternity
  osi: 166531,  // Oshi no Ko
  mob: 97117,   // Mob Psycho 100
  btr: 130003,  // Bocchi the Rock!
  ddd: 163329,  // Dandadan
  sol: 170890,  // Solo Leveling
  apd: 161645,  // The Apothecary Diaries
  vio: 21827,   // Violet Evergarden
};

const QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      coverImage { extraLarge large }
      bannerImage
    }
  }
}`;

let cache = null;

export async function fetchAnimeImages() {
  if (cache) return cache;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { ids: Object.values(ANILIST_IDS) } }),
    });
    const { data } = await res.json();
    const anilistToLocal = Object.fromEntries(Object.entries(ANILIST_IDS).map(([k, v]) => [v, k]));
    const result = {};
    for (const m of data.Page.media) {
      const localId = anilistToLocal[m.id];
      if (localId) {
        result[localId] = {
          cover: m.coverImage?.extraLarge || m.coverImage?.large || null,
          banner: m.bannerImage || m.coverImage?.extraLarge || null,
        };
      }
    }
    cache = result;
    return result;
  } catch {
    cache = {};
    return {};
  }
}
