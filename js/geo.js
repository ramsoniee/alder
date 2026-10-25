// Место пользователя и наблюдения рядом.
// Источники (открытые): GBIF (наблюдения растений, в основном iNaturalist) и Nominatim/OpenStreetMap (названия мест).
// Факты о том, где растение встречали, берутся из данных наблюдений, а не выдумываются.
// Всё кэшируется в IndexedDB, чтобы не дёргать сервисы и работать с уже виденным офлайн.
//
// Для продакшена: публичный Nominatim разрешает ~1 запрос в секунду и не рассчитан на большой трафик —
// нужен свой геокодер или платный сервис. GBIF открыт, но стоит завести кэш на своём сервере.

import * as db from './db.js';

const DAY = 86400000;
const GBIF = 'https://api.gbif.org/v1';

// [название, широта, долгота, страна, группа в списке]. Координаты округлены до сотых (~1 км).
export const CITIES = [
  ['Москва', 55.76, 37.62, 'RU', 'Центр'], ['Тула', 54.19, 37.62, 'RU', 'Центр'], ['Ярославль', 57.63, 39.87, 'RU', 'Центр'],
  ['Воронеж', 51.67, 39.18, 'RU', 'Центр'],
  ['Санкт-Петербург', 59.93, 30.34, 'RU', 'Северо-Запад'], ['Пушкин', 59.72, 30.42, 'RU', 'Северо-Запад'],
  ['Петергоф', 59.88, 29.91, 'RU', 'Северо-Запад'], ['Сестрорецк', 60.1, 29.97, 'RU', 'Северо-Запад'],
  ['Кронштадт', 60.0, 29.77, 'RU', 'Северо-Запад'], ['Гатчина', 59.57, 30.13, 'RU', 'Северо-Запад'],
  ['Всеволожск', 60.02, 30.65, 'RU', 'Северо-Запад'], ['Выборг', 60.71, 28.75, 'RU', 'Северо-Запад'],
  ['Приозерск', 61.04, 30.12, 'RU', 'Северо-Запад'], ['Сосновый Бор', 59.9, 29.09, 'RU', 'Северо-Запад'],
  ['Тихвин', 59.64, 33.52, 'RU', 'Северо-Запад'], ['Великий Новгород', 58.52, 31.27, 'RU', 'Северо-Запад'],
  ['Псков', 57.82, 28.33, 'RU', 'Северо-Запад'], ['Петрозаводск', 61.79, 34.35, 'RU', 'Северо-Запад'],
  ['Архангельск', 64.54, 40.54, 'RU', 'Северо-Запад'], ['Мурманск', 68.97, 33.07, 'RU', 'Северо-Запад'],
  ['Калининград', 54.71, 20.45, 'RU', 'Северо-Запад'],
  ['Нижний Новгород', 56.33, 44.0, 'RU', 'Поволжье и Урал'], ['Казань', 55.8, 49.11, 'RU', 'Поволжье и Урал'],
  ['Самара', 53.2, 50.1, 'RU', 'Поволжье и Урал'], ['Саратов', 51.53, 46.03, 'RU', 'Поволжье и Урал'],
  ['Волгоград', 48.71, 44.51, 'RU', 'Поволжье и Урал'], ['Уфа', 54.74, 55.97, 'RU', 'Поволжье и Урал'],
  ['Пермь', 58.01, 56.25, 'RU', 'Поволжье и Урал'], ['Екатеринбург', 56.84, 60.61, 'RU', 'Поволжье и Урал'],
  ['Челябинск', 55.16, 61.43, 'RU', 'Поволжье и Урал'],
  ['Ростов-на-Дону', 47.24, 39.7, 'RU', 'Юг'], ['Краснодар', 45.04, 38.98, 'RU', 'Юг'], ['Сочи', 43.59, 39.72, 'RU', 'Юг'],
  ['Ставрополь', 45.04, 41.97, 'RU', 'Юг'],
  ['Тюмень', 57.15, 65.53, 'RU', 'Сибирь'], ['Омск', 54.99, 73.37, 'RU', 'Сибирь'], ['Новосибирск', 55.01, 82.94, 'RU', 'Сибирь'],
  ['Томск', 56.5, 84.97, 'RU', 'Сибирь'], ['Барнаул', 53.35, 83.77, 'RU', 'Сибирь'], ['Красноярск', 56.02, 92.89, 'RU', 'Сибирь'],
  ['Иркутск', 52.29, 104.3, 'RU', 'Сибирь'],
  ['Хабаровск', 48.48, 135.07, 'RU', 'Дальний Восток'], ['Владивосток', 43.12, 131.89, 'RU', 'Дальний Восток'],
  ['Дубай', 25.2, 55.27, 'AE', 'ОАЭ'], ['Абу-Даби', 24.45, 54.38, 'AE', 'ОАЭ'], ['Шарджа', 25.35, 55.39, 'AE', 'ОАЭ'],
  ['Аджман', 25.41, 55.44, 'AE', 'ОАЭ'], ['Умм-эль-Кайвайн', 25.56, 55.55, 'AE', 'ОАЭ'],
  ['Рас-эль-Хайма', 25.79, 55.94, 'AE', 'ОАЭ'], ['Фуджейра', 25.12, 56.33, 'AE', 'ОАЭ'],
  ['Эль-Айн', 24.21, 55.76, 'AE', 'ОАЭ'], ['Хор-Факкан', 25.34, 56.35, 'AE', 'ОАЭ'],
];

// Страна каталога по ближайшему городу из списка (не дальше 400 км); иначе null — оставляем текущую.
export function countryAt(lat, lon) {
  let best = null;
  for (const [, la, lo, c] of CITIES) {
    const d = distanceKm({ lat, lon }, { lat: la, lon: lo });
    if (d < 400 && (!best || d < best.d)) best = { d, c };
  }
  return best ? best.c : null;
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function distanceKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const osmLink = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

async function cached(key, ttl, fn) {
  try {
    const hit = await db.meta.get(key);
    if (hit && Date.now() - hit.t < ttl) return hit.v;
  } catch { /* кэш необязателен */ }
  const v = await fn();
  try { await db.meta.set(key, { t: Date.now(), v }); } catch { /* ignore */ }
  return v;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

/* ---------- место ---------- */
export function locate() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Геопозиция недоступна в этом браузере'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => rej(new Error(e.code === 1 ? 'Доступ к геопозиции не разрешён' : 'Не удалось определить место')),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  });
}

// Nominatim: не чаще 1 запроса в секунду, запросы идут по очереди
let nomLast = 0, nomQ = Promise.resolve();
function nominatim(path) {
  const run = async () => {
    const wait = Math.max(0, nomLast + 1100 - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    nomLast = Date.now();
    const r = await fetch('https://nominatim.openstreetmap.org/' + path + (path.includes('?') ? '&' : '?') + 'format=jsonv2&accept-language=ru');
    if (!r.ok) throw new Error('Сервис карт ответил ошибкой ' + r.status);
    return r.json();
  };
  const p = nomQ.then(run, run);
  nomQ = p.catch(() => {});
  return p;
}

export async function placeName(lat, lon) {
  const j = await cached(`rg:${round(lat, 2)}:${round(lon, 2)}`, 90 * DAY, () => nominatim(`reverse?lat=${lat}&lon=${lon}&zoom=10`));
  const a = j.address || {};
  return a.city || a.town || a.village || a.municipality || a.county || a.state || (j.display_name || 'Моё место').split(',')[0];
}

export async function searchPlace(q) {
  const j = await nominatim('search?limit=5&featuretype=settlement&q=' + encodeURIComponent(q));
  return j.map((x) => ({ name: (x.display_name || '').split(',').slice(0, 2).join(','), lat: round(+x.lat, 2), lon: round(+x.lon, 2) }));
}

/* ---------- GBIF ---------- */
async function taxonKey(name) {
  return cached('tk:' + name, 180 * DAY, async () => {
    const r = await fetch(`${GBIF}/species/match?name=${encodeURIComponent(name)}&kingdom=Plantae`);
    if (!r.ok) throw new Error('GBIF недоступен');
    const j = await r.json();
    return j.matchType === 'NONE' ? 0 : j.usageKey || 0;
  });
}

const near = (loc, km) => `${loc.lat},${loc.lon},${km}km`;

export async function countNear(latin, loc, km) {
  const key = await taxonKey(latin);
  if (!key) return 0;
  return cached(`cn:${key}:${loc.lat}:${loc.lon}:${km}`, 7 * DAY, async () => {
    const q = new URLSearchParams({ taxonKey: key, geoDistance: near(loc, km), hasCoordinate: 'true', hasGeospatialIssue: 'false', occurrenceStatus: 'PRESENT', limit: '0' });
    const r = await fetch(`${GBIF}/occurrence/search?${q}`);
    if (!r.ok) throw new Error('GBIF недоступен');
    return (await r.json()).count;
  });
}

// счётчики по всему каталогу: Map id -> число наблюдений рядом
export async function countsNear(plants, loc) {
  const km = loc.km || 30;
  const arr = await pool(plants, 6, (p) => countNear(p.lat, loc, km).catch(() => null));
  const m = new Map();
  plants.forEach((p, i) => m.set(p.id, arr[i]));
  return m;
}

const PLACE_TYPES = new Set(['park', 'garden', 'nature_reserve', 'wood', 'forest', 'recreation_ground', 'meadow', 'grassland', 'protected_area', 'national_park', 'village_green', 'common', 'scrub', 'wetland', 'heath']);

async function clusterName(lat, lon) {
  try {
    const j = await cached(`pn:${round(lat, 3)}:${round(lon, 3)}`, 90 * DAY, () => nominatim(`reverse?lat=${lat}&lon=${lon}&zoom=17`));
    const a = j.address || {};
    if (j.name && (PLACE_TYPES.has(j.type) || ['leisure', 'natural', 'landuse', 'boundary'].includes(j.category))) return { name: j.name, kind: 'place' };
    const loose = a.park || a.nature_reserve || a.garden || a.neighbourhood || a.suburb || a.city_district || a.road || a.hamlet || a.village;
    return { name: loose || (j.display_name || '').split(',')[0] || 'без названия', kind: a.park || a.nature_reserve || a.garden ? 'place' : 'area' };
  } catch { return { name: 'без названия', kind: 'area' }; }
}

const MONTH_NAMES = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

// Места, где растение чаще всего наблюдали рядом с пользователем: кластеры точек ~2 км,
// названия кластеров берём из OSM (парк, заказник, район).
export async function hotspots(latin, loc, km = 30) {
  const key = await taxonKey(latin);
  if (!key) return { total: 0, items: [], months: [] };
  const raw = await cached(`hs:${key}:${loc.lat}:${loc.lon}:${km}`, 7 * DAY, async () => {
    const q = new URLSearchParams({ taxonKey: key, geoDistance: near(loc, km), hasCoordinate: 'true', hasGeospatialIssue: 'false', occurrenceStatus: 'PRESENT', limit: '300' });
    const r = await fetch(`${GBIF}/occurrence/search?${q}`);
    if (!r.ok) throw new Error('GBIF недоступен');
    const j = await r.json();
    return { total: j.count, pts: j.results.filter((o) => o.decimalLatitude != null).map((o) => [o.decimalLatitude, o.decimalLongitude, o.month || 0]) };
  });
  const cells = new Map();
  const months = new Array(13).fill(0);
  for (const [la, lo, mo] of raw.pts) {
    const k = `${Math.round(la / 0.018)}:${Math.round((lo * Math.cos((la * Math.PI) / 180)) / 0.018)}`;
    const c = cells.get(k) || { n: 0, la: 0, lo: 0 };
    c.n++; c.la += la; c.lo += lo;
    cells.set(k, c);
    if (mo) months[mo]++;
  }
  const top = [...cells.values()].sort((a, b) => b.n - a.n).slice(0, 8)
    .map((c) => ({ count: c.n, lat: round(c.la / c.n, 4), lon: round(c.lo / c.n, 4) }));
  // соседние ячейки с одним названием (один район или парк) объединяем в одну строку
  const byName = new Map();
  for (const t of top) {
    const nm = await clusterName(t.lat, t.lon);
    const cur = byName.get(nm.name);
    if (!cur) byName.set(nm.name, { ...t, ...nm, km: round(distanceKm(loc, t), 0) });
    else { cur.count += t.count; cur.km = Math.min(cur.km, round(distanceKm(loc, t), 0)); }
  }
  const items = [...byName.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const best = months.map((n, m) => [m, n]).filter(([m, n]) => m && n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m).sort((a, b) => a - b);
  return { total: raw.total, sampled: raw.pts.length, items, months: best, monthText: best.map((m) => MONTH_NAMES[m - 1]) };
}
