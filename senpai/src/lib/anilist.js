const URL = 'https://graphql.anilist.co';
const SEASON_MAP = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const FORMAT_MAP = { TV: 'TV', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', TV_SHORT: 'TV Short' };

export function mapAniListAnime(m) {
  const title = m.title?.english || m.title?.romaji || 'Unknown';
  const alt = (m.title?.romaji && m.title.romaji !== title) ? m.title.romaji : '';
  return {
    id: 'al' + m.id,
    title,
    alt,
    hue: m.id % 360,
    studio: m.studios?.nodes?.[0]?.name || '',
    year: m.startDate?.year || 0,
    season: SEASON_MAP[m.season] || '',
    format: FORMAT_MAP[m.format] || m.format || 'TV',
    episodes: m.episodes || 0,
    score: m.averageScore ? m.averageScore / 10 : 0,
    members: m.popularity || 0,
    genres: m.genres || [],
    tags: [],
    synopsis: m.description ? m.description.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim() : '',
    status: null, progress: 0, fav: false, myScore: null, rank: null,
    cover: m.coverImage?.extraLarge || m.coverImage?.large || null,
    banner: m.bannerImage || null,
    _anilistId: m.id,
  };
}

const SEARCH_QUERY = `
query ($search: String, $genres: [String]) {
  Page(perPage: 24) {
    media(search: $search, genre_in: $genres, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      coverImage { extraLarge large }
      bannerImage
      format episodes
      averageScore popularity
      startDate { year }
      season
      studios(isMain: true) { nodes { name } }
      genres
      description(asHtml: false)
    }
  }
}`;

export async function searchAniList(q, genres = []) {
  try {
    const variables = {};
    if (q && q.trim()) variables.search = q.trim();
    if (genres.length) variables.genres = genres;
    if (!variables.search && !variables.genres) return [];
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: SEARCH_QUERY, variables }),
    });
    const { data } = await res.json();
    return (data?.Page?.media || []).map(mapAniListAnime);
  } catch {
    return [];
  }
}
