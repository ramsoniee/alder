import { COUNTRIES, DEFAULT_COUNTRY } from './data/index.js';
import * as db from './db.js';
import { identify, shrink } from './identify.js';
import { SEASONS, MONTHS, range, signOf, celticOf, PLANET_SIGNS, BIRTH_FLOWERS } from './lore.js';
import { art } from './art.js';
import { CITIES, countryAt, locate, placeName, searchPlace, countsNear, hotspots, osmLink } from './geo.js';

/* ---------- утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

// иконки — статические строки из кода, пользовательских данных в них нет
const ico = (html) => { const s = document.createElement('span'); s.style.display = 'inline-flex'; s.innerHTML = html; return s; };
const CHEV = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const WARN = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M9 2L17 16H1L9 2Z"/><path d="M9 7v4M9 13.2v.1"/></svg>';

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- состояние ---------- */
const S = {
  settings: { name: '', birth: '', country: DEFAULT_COUNTRY, plantnetKey: '', loc: null },
  entries: [],
  f: { season: 'all', group: 'all', q: '' },
};
const urls = new Map();
const photoUrl = (e) => {
  if (!e.photo) return null;
  if (!urls.has(e.id)) urls.set(e.id, URL.createObjectURL(e.photo));
  return urls.get(e.id);
};

const plants = () => COUNTRIES[S.settings.country]?.plants || [];
const allPlants = () => Object.values(COUNTRIES).flatMap((c) => c.plants);
// растение ищем сначала в каталоге текущей страны, затем во всех (записи альбома могут быть из другой страны)
const plantById = (id) => plants().find((p) => p.id === id) || allPlants().find((p) => p.id === id);
const countryOf = (p) => Object.entries(COUNTRIES).find(([, c]) => c.plants.includes(p))?.[0] || S.settings.country;
const numOf = (p) => String((COUNTRIES[countryOf(p)]?.plants.indexOf(p) ?? 0) + 1).padStart(3, '0');
const norm = (s) => (s || '').toLowerCase().replace(/ё/g, 'е');
const plantMonths = (p) => [...new Set([...(p.bloom ? range(...p.bloom) : []), ...(p.fruit ? range(...p.fruit) : [])])];
const latinMatch = (p, latin) => p.lat === latin || (!p.lat.includes(' ') && latin.startsWith(p.lat + ' '));
const nowMonth = () => new Date().getMonth() + 1;
const monthsText = (r) => (!r ? '—' : r[0] === r[1] ? MONTHS[r[0] - 1] : `${MONTHS[r[0] - 1]} – ${MONTHS[r[1] - 1]}`);
const regionText = (p) => (countryOf(p) === 'RU' && (p.regions || []).length >= 4 ? 'вся Россия' : (p.regions || []).join(', '));

function passes(months, group, text, f) {
  if (f.season === 'now' && !months.includes(nowMonth())) return false;
  if (SEASONS[f.season] && !months.some((m) => SEASONS[f.season].months.includes(m))) return false;
  if (f.group !== 'all' && group !== f.group) return false;
  if (f.q && !norm(text).includes(norm(f.q))) return false;
  return true;
}
const plantText = (p) => [p.ru, ...(p.alt || []), p.lat, p.family].join(' ');

function plural(n, a, b, c) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
}

/* ---------- общие блоки ---------- */
function filters(onChange) {
  const seasons = [['all', 'все'], ['now', 'сейчас'], ...Object.entries(SEASONS).map(([k, v]) => [k, v.label.toLowerCase()])];
  const groups = [['all', 'все'], ...[...new Set(plants().map((p) => p.group))].map((g) => [g, g]), ['другое', 'другое']];
  const mk = (label, cls, key, opts) =>
    h('label', { class: 'sel ' + cls },
      h('span', {}, label),
      h('select', { 'aria-label': label, onchange: (e) => { S.f[key] = e.target.value; onChange(); } },
        opts.map(([v, l]) => h('option', { value: v, selected: S.f[key] === v }, l))));
  return h('div', { class: 'fbar' },
    mk('Сезон', 's', 'season', seasons),
    mk('Группа', 'g', 'group', groups),
    h('input', { type: 'search', placeholder: 'Поиск по названию…', value: S.f.q, 'aria-label': 'Поиск', oninput: (e) => { S.f.q = e.target.value; onChange(); } }));
}

const plate = (id, cls = '', fig) => h('div', { class: 'plate ' + cls }, art(id), fig && h('span', { class: 'fig' }, fig));

function safetyBox(p) {
  const s = p.safety;
  if (!s) return null;
  if (s.level === 'toxic') return h('div', { class: 'warn toxic' }, ico(WARN), h('span', {}, h('b', {}, 'Ядовито. '), s.text));
  if (s.level === 'caution') return h('div', { class: 'warn' }, ico(WARN), h('span', {}, h('b', {}, 'Осторожно. '), s.text));
  return h('div', { class: 'warn info' }, h('span', {}, h('b', {}, 'Заметка. '), s.text));
}

function accordion(sections) {
  let open = sections[0]?.id;
  const root = h('div');
  const paint = () =>
    root.replaceChildren(...sections.map((s) => {
      const isOpen = open === s.id;
      return h('div', { class: 'acc' + (isOpen ? ' open' : '') },
        h('button', { 'aria-expanded': String(isOpen), onclick: () => { open = isOpen ? '' : s.id; paint(); } },
          h('span', { class: 't' }, h('b', {}, s.title), h('small', {}, s.hint)), ico(CHEV)),
        isOpen && h('div', { class: 'body' }, s.body()));
    }));
  paint();
  return root;
}

// панель преданий: фольклор подробно, дальше астроботаника, месяц, имена
function lorePanel(p) {
  const group = (title, items) => items.length > 0 && [
    h('div', { class: 'lh' }, title),
    h('div', { class: 'grp' }, items.map((l) =>
      h('div', {},
        l.where && h('div', { class: 'lab' }, l.where),
        h('div', {}, l.text),
        l.src && h('div', { class: 'src' }, 'Источник: ' + l.src)))),
  ];
  const folk = (p.lore || []).filter((l) => l.kind === 'folklore');
  const hist = (p.lore || []).filter((l) => l.kind === 'history');
  const rows = [];
  if (p.planet) rows.push(h('div', {}, h('i', { class: 'k' }, 'Астроботаника. '), `${p.planet} · ${(PLANET_SIGNS[p.planet] || []).join(', ')}.`, h('span', { class: 'src' }, 'Culpeper, 1653')));
  if (p.celtic) rows.push(h('div', {}, h('i', { class: 'k' }, 'Кельтский календарь. '), `дерево «${p.celtic}».`, h('span', { class: 'src' }, 'Р. Грейвс, 1948 — не древность')));
  if (p.birthMonth) rows.push(h('div', {}, h('i', { class: 'k' }, 'Цветок месяца. '), `${MONTHS[p.birthMonth - 1]} — ${BIRTH_FLOWERS[p.birthMonth]}.`));
  if (p.nameLinks?.length) rows.push(h('div', {}, h('i', { class: 'k' }, 'По имени. '), p.nameLinks.join(', ') + '.'));
  return h('div', { class: 'lore' },
    h('span', { class: 'badge' }, '✦ предание, не наука ✦'),
    group('Фольклор', folk), group('История', hist),
    rows.length > 0 && h('div', { class: 'rows' }, rows));
}

function hasLore(p) {
  return (p.lore || []).length > 0 || p.planet || p.celtic || p.birthMonth || (p.nameLinks || []).length > 0;
}

/* ---------- Альбом ---------- */
function albumView() {
  const root = h('div');
  const grid = h('div');
  const items = () => S.entries
    .slice()
    .sort((a, b) => b.created - a.created)
    .map((e) => ({ e, p: e.speciesId ? plantById(e.speciesId) : null }))
    .filter(({ e, p }) => {
      const months = p ? plantMonths(p) : [Number((e.date || '').slice(5, 7)) || nowMonth()];
      const text = [e.userName, e.ruName, e.latin, p ? plantText(p) : ''].join(' ');
      return passes(months, p ? p.group : 'другое', text, S.f);
    });

  const card = (e, p) => {
    const u = photoUrl(e);
    const title = e.userName || e.ruName || e.latin || 'Без имени';
    const s2 = e.userName ? (e.ruName || e.latin) : (p ? p.lat : e.latin);
    const photoOnly = !p && u;
    return h('a', { class: 'card', href: '#/entry/' + e.id },
      photoOnly
        ? h('div', { class: 'ph photo', style: `background-image:url(${u})` })
        : h('div', { class: 'ph' }, art(e.speciesId || 'generic'),
          p && h('span', { class: 'no' }, '№ ' + numOf(p)),
          u && h('span', { class: 'thumb', style: `background-image:url(${u})` })),
      h('div', { class: 'meta' },
        h('span', { class: 'nm' + (e.userName ? ' u' : '') }, title),
        s2 && h('span', { class: 's2' }, s2),
        e.date && h('span', { class: 's3' }, e.date)));
  };

  const paint = () => {
    const list = items();
    if (!S.entries.length) {
      grid.replaceChildren(h('div', { class: 'empty' },
        'Альбом пока пуст.', h('br'), 'Сфотографируйте первое растение или найдите его в каталоге — и дайте ему своё имя.', h('br'), h('br'),
        h('a', { class: 'btn', href: '#/add' }, 'Найти растение')));
      return;
    }
    grid.replaceChildren(list.length
      ? h('div', { class: 'grid' }, list.map(({ e, p }) => card(e, p)))
      : h('div', { class: 'empty' }, 'По этим фильтрам ничего нет.'));
  };

  const total = plants().length;
  const found = new Set(S.entries.map((e) => e.speciesId).filter(Boolean)).size;
  root.append(
    h('div', { class: 'head' },
      h('div', {}, h('div', { class: 'kicker' }, 'Мой гербарий'), h('h1', {}, 'Альбом')),
      h('div', { class: 'cnt' }, `${found} из ${total}`, h('br'), COUNTRIES[S.settings.country].name)),
    h('div', { class: 'seg', 'aria-hidden': 'true' }, Array.from({ length: total }, (_, i) => h('i', { class: i < found ? 'on' : '' }))),
    h('p', { class: 'sub' }, `${S.entries.length} ${plural(S.entries.length, 'запись', 'записи', 'записей')}`),
    filters(paint),
    grid,
  );
  paint();
  return root;
}

/* ---------- Каталог ---------- */
function catalogView(selectedId) {
  const root = h('div');
  const list = h('div', { class: 'list' });
  const gotIds = new Set(S.entries.map((e) => e.speciesId));
  const paint = () => {
    const rows = plants().filter((p) => passes(plantMonths(p), p.group, plantText(p), S.f));
    list.replaceChildren(...(rows.length ? rows.map((p) => {
      const got = gotIds.has(p.id);
      return h('a', { class: 'it' + (p.id === selectedId ? ' on' : ''), href: '#/plant/' + p.id },
        h('span', { class: 'mini' + (got ? ' got' : '') }, art(p.id), got && h('span', { class: 'ck' }, '✓')),
        h('span', { class: 'tx' }, h('b', {}, p.ru), h('i', {}, p.lat)));
    }) : [h('div', { class: 'empty' }, 'Ничего не найдено.')]));
  };
  const total = plants().length;
  const got = plants().filter((p) => gotIds.has(p.id)).length;
  root.append(
    h('div', { class: 'kicker' }, `${COUNTRIES[S.settings.country].name} · собрано ${got} из ${total}`),
    h('h1', {}, 'Каталог'),
    h('div', { class: 'seg', 'aria-hidden': 'true' }, Array.from({ length: total }, (_, i) => h('i', { class: i < got ? 'on' : '' }))),
    filters(paint),
    list,
  );
  paint();
  return root;
}

/* ---------- Страница растения ---------- */
function plantView(id, wide) {
  const p = plantById(id);
  if (!p) return h('div', { class: 'empty' }, 'Растение не найдено.');
  const mine = S.entries.filter((e) => e.speciesId === p.id);

  const loc = S.settings.loc;
  const whereSec = { id: 'where', title: 'Где искать рядом', hint: loc ? loc.name : 'укажите место', body: () => whereBody(p) };
  const sections = [
    { id: 'about', title: 'О растении', hint: p.bloom ? 'цветёт ' + monthsText(p.bloom) : p.family, body: () => h('div', {},
      h('p', {}, p.about),
      h('div', {}, h('span', { class: 'tag' }, p.family), h('span', { class: 'tag' }, p.group), (p.regions || []).map((r) => h('span', { class: 'tag' }, r)))) },
    { id: 'name', title: 'Название', hint: 'откуда слово', body: () => h('p', {}, p.etymology) },
    p.everyday && { id: 'use', title: 'В быту', hint: 'только проверенное', body: () => h('div', {},
      h('p', {}, p.everyday), h('p', { class: 'sub' }, 'Остальное — на вашей ответственности. Приложение не даёт лечебных рекомендаций.')) },
    hasLore(p) && { id: 'mystic', title: 'Значения', hint: 'мистифицировано', body: () => lorePanel(p) },
    { id: 'album', title: 'Мой альбом', hint: `${mine.length} ${plural(mine.length, 'снимок', 'снимка', 'снимков')}`, body: () => mine.length
      ? h('div', { class: 'grid' }, mine.map((e) => {
        const u = photoUrl(e);
        return h('a', { class: 'card', href: '#/entry/' + e.id },
          h('div', { class: u ? 'ph photo' : 'ph', style: u ? `background-image:url(${u})` : '' }, !u && art(p.id)),
          h('div', { class: 'meta' }, h('span', { class: 'nm' + (e.userName ? ' u' : '') }, e.userName || p.ru), h('span', { class: 's3' }, e.date || '')));
      }))
      : h('p', {}, `Пока ни одного снимка. Сфотографируйте это растение и дайте ему своё имя.`) },
  ].filter(Boolean);
  if (loc) sections.unshift(whereSec); else sections.splice(1, 0, whereSec);

  return h('div', {},
    h('div', { class: 'topbar' }, wide ? h('span') : h('a', { href: '#/catalog' }, '← Каталог'), h('span', { class: 'mono' }, '№ ' + numOf(p) + ' · ' + countryOf(p))),
    h('div', { class: 'hero' },
      plate(p.id, '', 'фиг. 1'),
      h('div', { class: 'tt' },
        h('span', { class: 'kicker' }, p.family + ' · ' + p.group),
        h('h1', {}, p.ru),
        h('span', { class: 'lat' }, p.lat))),
    h('div', { class: 'facts' },
      h('div', {}, h('b', {}, 'Цветёт'), h('span', {}, monthsText(p.bloom))),
      h('div', {}, h('b', {}, 'Плоды'), h('span', {}, monthsText(p.fruit))),
      h('div', {}, h('b', {}, 'Где'), h('span', {}, regionText(p)))),
    safetyBox(p),
    h('div', { style: 'margin-top:8px' }, accordion(sections)),
    p.needsReview && h('p', { class: 'sub' }, 'Текст карточки ждёт проверки по источникам.'),
    h('div', { style: 'margin-top:14px' }, h('a', { class: 'btn block', href: '#/add?plant=' + p.id }, 'Добавить в альбом')),
  );
}

/* ---------- Добавление ---------- */
function addView(params) {
  const root = h('div');
  const st = { blob: null, preview: null, chosen: null, results: null, busy: false, err: '', geo: true, userName: '', note: '', place: '', date: new Date().toISOString().slice(0, 10), q: '' };
  if (params.plant) {
    const p = plantById(params.plant);
    if (p) st.chosen = { speciesId: p.id, latin: p.lat, ruName: p.ru };
  }

  const searchBox = h('div');
  const paintSearch = () => {
    const q = norm(st.q.trim());
    const rows = q ? plants().filter((p) => norm(plantText(p)).includes(q)).slice(0, 6) : [];
    searchBox.replaceChildren(...rows.map((p) =>
      h('button', { class: 'res', onclick: () => { st.chosen = { speciesId: p.id, latin: p.lat, ruName: p.ru }; paint(); } },
        h('span', {}, p.ru, h('br'), h('small', {}, p.lat)))));
  };

  const doIdentify = async () => {
    st.busy = true; st.err = ''; paint();
    try {
      const raw = await identify(st.blob, S.settings);
      st.results = raw.map((r) => ({ ...r, plant: plants().find((p) => latinMatch(p, r.latin)) || allPlants().find((p) => latinMatch(p, r.latin)) || null }));
      if (!st.results.length) st.err = 'Ничего не нашлось. Попробуйте другое фото или найдите вручную.';
    } catch (e) { st.err = e.message; }
    st.busy = false; paint();
  };

  const paint = () => {
    root.replaceChildren(
      h('div', { class: 'kicker' }, 'Новая находка'),
      h('h1', {}, 'Найти растение'),
      h('p', { class: 'sub' }, 'Фото, определение, имя — и оно в вашем альбоме.'),
      h('label', { class: 'drop', style: st.preview ? `background-image:url(${st.preview})` : '' },
        st.preview ? '' : h('span', {}, 'Сфотографировать или выбрать фото'),
        h('input', { type: 'file', accept: 'image/*', capture: 'environment', onchange: async (e) => {
          const f = e.target.files[0]; if (!f) return;
          st.blob = await shrink(f);
          if (st.preview) URL.revokeObjectURL(st.preview);
          st.preview = URL.createObjectURL(st.blob);
          st.results = null; st.err = '';
          paint();
        } })),
      st.blob && h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'btn', disabled: st.busy, onclick: doIdentify }, st.busy ? 'Определяю…' : 'Определить по фото'),
        !S.settings.plantnetKey && h('small', { class: 'sub' }, 'Нужен ключ Pl@ntNet (раздел «Я»)')),
      st.err && h('p', { class: 'mine' }, st.err),
      st.results && st.results.map((r) =>
        h('button', { class: 'res' + (st.chosen?.latin === r.latin ? ' on' : ''), onclick: () => {
          st.chosen = { speciesId: r.plant?.id || null, latin: r.latin, ruName: r.plant?.ru || r.common[0] || '' }; paint();
        } },
          h('span', {}, r.plant ? r.plant.ru : (r.common[0] || r.latin), h('br'), h('small', {}, r.latin + (r.plant ? ' · есть в каталоге' : ''))),
          h('b', {}, Math.round(r.score * 100) + '%'))),
      h('label', { class: 'lbl' }, 'Или найдите в каталоге'),
      h('input', { type: 'search', placeholder: 'Название растения…', value: st.q, oninput: (e) => { st.q = e.target.value; paintSearch(); } }),
      searchBox,
      st.chosen && h('div', { class: 'pick' }, h('b', {}, st.chosen.ruName || st.chosen.latin), h('i', { class: 'lat' }, st.chosen.latin),
        h('button', { class: 'chip', onclick: () => { st.chosen = null; paint(); } }, 'сбросить')),
      h('label', { class: 'lbl' }, 'Ваше имя для растения'),
      h('input', { type: 'text', placeholder: 'Как вы его назовёте?', value: st.userName, oninput: (e) => (st.userName = e.target.value) }),
      h('label', { class: 'lbl' }, 'Где нашли'),
      h('input', { type: 'text', placeholder: 'Место', value: st.place, oninput: (e) => (st.place = e.target.value) }),
      h('label', { class: 'lbl' }, 'Дата'),
      h('input', { type: 'date', value: st.date, oninput: (e) => (st.date = e.target.value) }),
      h('label', { class: 'lbl' }, 'Заметка'),
      h('textarea', { placeholder: 'Запах, погода, что ещё запомнилось…', oninput: (e) => (st.note = e.target.value) }, st.note),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: st.geo, onchange: (e) => (st.geo = e.target.checked) }), ' Запомнить место находки'),
      h('div', { style: 'margin-top:16px' }, h('button', { class: 'btn block', onclick: save }, 'Сохранить в альбом')),
    );
    paintSearch();
  };

  const save = async () => {
    if (!st.blob && !st.chosen && !st.userName.trim()) { toast('Добавьте фото, растение или имя'); return; }
    let lat = null, lon = null;
    if (st.geo) {
      try { const pos = await locate(); lat = Math.round(pos.lat * 1000) / 1000; lon = Math.round(pos.lon * 1000) / 1000; }
      catch { toast('Место не определено, сохраняю без него'); }
    }
    const e = {
      id: db.uid(), created: Date.now(), photo: st.blob, date: st.date, lat, lon,
      speciesId: st.chosen?.speciesId || null, latin: st.chosen?.latin || '', ruName: st.chosen?.ruName || '',
      userName: st.userName.trim(), place: st.place.trim(), note: st.note.trim(),
    };
    await db.entries.put(e);
    S.entries.push(e);
    toast('Сохранено в альбом');
    location.hash = '#/entry/' + e.id;
  };

  paint();
  return root;
}

/* ---------- Запись альбома ---------- */
function entryView(id) {
  const e = S.entries.find((x) => x.id === id);
  if (!e) return h('div', { class: 'empty' }, 'Запись не найдена.');
  const p = e.speciesId ? plantById(e.speciesId) : null;
  const u = photoUrl(e);
  let userName = e.userName, note = e.note, place = e.place;
  return h('div', {},
    h('div', { class: 'topbar' }, h('a', { href: '#/album' }, '← Альбом'), p && h('span', { class: 'mono' }, '№ ' + numOf(p))),
    h('div', { class: 'hero' },
      plate(e.speciesId || 'generic', '', 'фиг. 1'),
      h('div', { class: 'tt' },
        p && h('span', { class: 'kicker' }, p.family + ' · ' + p.group),
        h('h1', { class: e.userName ? 'mine' : '' }, e.userName || e.ruName || e.latin || 'Без имени'),
        (e.ruName || e.latin) && h('span', { class: 'lat' }, [e.ruName, e.latin].filter(Boolean).join(' · ')),
        p && h('a', { class: 'btn ghost', style: 'align-self:flex-start;min-height:40px;padding:0 16px', href: '#/plant/' + p.id }, 'Карточка растения'))),
    u && h('img', { class: 'photo-big', src: u, alt: e.userName || e.ruName || 'растение' }),
    h('label', { class: 'lbl' }, 'Ваше имя для растения'),
    h('input', { type: 'text', value: userName, oninput: (ev) => (userName = ev.target.value) }),
    h('label', { class: 'lbl' }, 'Где нашли'),
    h('input', { type: 'text', value: place, oninput: (ev) => (place = ev.target.value) }),
    h('label', { class: 'lbl' }, 'Заметка'),
    h('textarea', { oninput: (ev) => (note = ev.target.value) }, note),
    e.lat != null && h('p', { class: 'sub' }, 'Место находки: ', h('a', { href: osmLink(e.lat, e.lon), target: '_blank', rel: 'noopener' }, `${e.lat}, ${e.lon}`)),
    h('p', { class: 'sub mono' }, e.date),
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('button', { class: 'btn', onclick: async () => {
        Object.assign(e, { userName: userName.trim(), place: place.trim(), note: note.trim() });
        await db.entries.put(e); toast('Сохранено'); render();
      } }, 'Сохранить'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm('Удалить запись из альбома?')) return;
        await db.entries.del(e.id);
        S.entries = S.entries.filter((x) => x.id !== e.id);
        location.hash = '#/album';
      } }, 'Удалить')),
  );
}

/* ---------- Я ---------- */
function parseBirth(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? { month: +m[2], day: +m[3] } : null;
}

function meView() {
  const s = S.settings;
  let name = s.name, birth = s.birth, key = s.plantnetKey;
  const b = parseBirth(birth);
  const sign = b && signOf(b.month, b.day);
  const tree = b && celticOf(b.month, b.day);

  const matches = [];
  if (b || s.name) {
    for (const p of plants()) {
      const why = [];
      if (tree && p.celtic === tree) why.push(`ваше дерево — ${tree}`);
      if (sign && p.planet && (PLANET_SIGNS[p.planet] || []).includes(sign.name)) why.push(`${p.planet} правит знаком ${sign.name}`);
      if (b && p.birthMonth === b.month) why.push('цветок вашего месяца');
      if (s.name && (p.nameLinks || []).some((n) => norm(n) === norm(s.name.trim()))) why.push('созвучно вашему имени');
      if (why.length) matches.push({ p, why });
    }
  }

  const exportAll = async () => {
    const toData = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    const out = [];
    for (const e of S.entries) out.push({ ...e, photo: e.photo ? await toData(e.photo) : null });
    const blob = new Blob([JSON.stringify({ app: 'alder', v: 1, settings: { ...S.settings, plantnetKey: '' }, entries: out })], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `alder-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
  };
  const importAll = async (file) => {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== 'alder') throw new Error();
      for (const e of j.entries) {
        const photo = e.photo ? await (await fetch(e.photo)).blob() : null;
        const rec = { ...e, photo };
        await db.entries.put(rec);
        S.entries = S.entries.filter((x) => x.id !== rec.id).concat(rec);
      }
      toast('Импортировано: ' + j.entries.length); render();
    } catch { toast('Не удалось прочитать файл'); }
  };

  return h('div', {},
    h('div', { class: 'kicker' }, 'Профиль'),
    h('h1', {}, 'Я'),
    h('p', { class: 'sub' }, 'Профиль нужен для слоя «значений» и фильтра по стране.'),
    h('label', { class: 'lbl' }, 'Имя'),
    h('input', { type: 'text', value: name, oninput: (e) => (name = e.target.value) }),
    h('label', { class: 'lbl' }, 'Дата рождения'),
    h('input', { type: 'date', value: birth, oninput: (e) => (birth = e.target.value) }),
    h('label', { class: 'lbl' }, 'Страна'),
    h('select', { onchange: async (e) => { S.settings.country = e.target.value; await db.meta.set('settings', S.settings); render(); } },
      Object.entries(COUNTRIES).map(([k, c]) => h('option', { value: k, selected: k === s.country }, c.name))),
    h('label', { class: 'lbl' }, 'Ключ Pl@ntNet (определение по фото)'),
    h('input', { type: 'password', placeholder: 'api-key с my.plantnet.org', value: key, oninput: (e) => (key = e.target.value), autocomplete: 'off' }),
    h('p', { class: 'sub' }, 'Ключ хранится только на этом устройстве.'),
    h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: async () => {
      Object.assign(S.settings, { name: name.trim(), birth, plantnetKey: key.trim() });
      await db.meta.set('settings', S.settings); toast('Сохранено'); render();
    } }, 'Сохранить')),

    (sign || tree) && h('div', { style: 'margin-top:22px' }, h('div', { class: 'lore' },
      h('span', { class: 'badge' }, '✦ предание, не наука ✦'),
      h('div', { class: 'lh' }, 'Ваши знаки'),
      h('div', { class: 'rows' },
        sign && h('div', {}, `${sign.symbol} ${sign.name} · планета ${sign.planet}`),
        tree && h('div', {}, `Кельтский календарь: дерево «${tree}»`),
        b && h('div', {}, `Цветы вашего месяца: ${BIRTH_FLOWERS[b.month]}`)))),
    matches.length > 0 && h('div', {},
      h('h2', {}, 'Растения для вас'),
      h('div', { class: 'list' }, matches.map(({ p, why }) =>
        h('a', { class: 'it', href: '#/plant/' + p.id },
          h('span', { class: 'mini' }, art(p.id)),
          h('span', { class: 'tx' }, h('b', {}, p.ru), h('i', {}, why.join(' · ')))))),
    ),

    h('h2', {}, 'Данные'),
    h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: exportAll }, 'Экспорт альбома'),
      h('label', { class: 'btn ghost' }, 'Импорт',
        h('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: (e) => e.target.files[0] && importAll(e.target.files[0]) }))),
    h('div', { class: 'warn', style: 'margin-top:22px' },
      h('span', {}, h('b', {}, 'Важно. '), 'Alder — альбом натуралиста, а не справочник по съедобным и лечебным растениям. Не употребляйте растения в пищу и не применяйте их как лекарство на основании приложения. Культурные значения — предания и игра воображения, не научные факты.')),
  );
}

/* ---------- Рядом ---------- */
const r2 = (n) => Math.round(n * 100) / 100;
async function setLoc(loc) {
  S.settings.loc = loc;
  // каталог следует за местом: Дубай открывает флору ОАЭ, Петербург — российскую
  const c = loc && countryAt(loc.lat, loc.lon);
  if (c && COUNTRIES[c]) S.settings.country = c;
  await db.meta.set('settings', S.settings);
}

function locChooser(onDone) {
  const status = h('p', { class: 'sub' });
  const results = h('div');
  let q = '';
  const done = async (loc) => { await setLoc({ ...loc, km: 30 }); onDone(); };
  const sel = h('select', { 'aria-label': 'Город', onchange: (e) => { const c = CITIES.find((x) => x[0] === e.target.value); if (c) done({ name: c[0], lat: c[1], lon: c[2] }); } },
    h('option', { value: '' }, 'Выбрать из списка…'),
    [...new Set(CITIES.map((c) => c[4]))].map((g) =>
      h('optgroup', { label: g }, CITIES.filter((c) => c[4] === g).map(([n]) => h('option', { value: n }, n)))));
  return h('div', {},
    h('p', { class: 'sub' }, 'Укажите, где вы находитесь, и Alder покажет, какие растения из каталога там замечали и где их искать.'),
    h('button', { class: 'btn block', onclick: async () => {
      status.textContent = 'Определяю место…';
      try {
        const pos = await locate();
        const name = await placeName(pos.lat, pos.lon).catch(() => 'Моё место');
        await done({ name, lat: r2(pos.lat), lon: r2(pos.lon) });
      } catch (e) { status.textContent = e.message; }
    } }, 'Определить моё место'),
    h('label', { class: 'lbl' }, 'Или выберите город'), sel,
    h('label', { class: 'lbl' }, 'Другой город или посёлок'),
    h('div', { class: 'row' },
      h('input', { type: 'search', placeholder: 'Название', style: 'flex:1', oninput: (e) => (q = e.target.value) }),
      h('button', { class: 'btn ghost', onclick: () => {
        if (!q.trim()) return;
        results.replaceChildren(h('p', { class: 'sub' }, 'Ищу…'));
        searchPlace(q.trim())
          .then((list) => results.replaceChildren(...(list.length ? list.map((x) => h('button', { class: 'res', onclick: () => done(x) }, x.name)) : [h('p', { class: 'sub' }, 'Ничего не найдено.')])))
          .catch((e) => results.replaceChildren(h('p', { class: 'mine' }, e.message + '. Нужна сеть.')));
      } }, 'Найти')),
    results, status,
    h('p', { class: 'sub' }, 'Место хранится только на вашем устройстве. В открытые базы наблюдений уходят координаты, округлённые до ~1 км.'));
}

function nearbyView() {
  const loc = S.settings.loc;
  const root = h('div', {}, h('div', { class: 'kicker' }, 'Рядом с вами'), h('h1', {}, 'Рядом'));
  if (!loc) { root.append(locChooser(render)); return root; }
  const box = h('div');
  root.append(
    h('div', { class: 'locbar' },
      h('span', { class: 'ln' }, h('b', {}, loc.name)),
      h('select', { 'aria-label': 'Радиус', onchange: async (e) => { await setLoc({ ...loc, km: +e.target.value }); render(); } },
        [10, 30, 50, 100].map((k) => h('option', { value: k, selected: (loc.km || 30) === k }, k + ' км'))),
      h('button', { class: 'chip', onclick: async () => { await setLoc(null); render(); } }, 'Изменить')),
    box);
  box.append(h('p', { class: 'sub' }, 'Смотрю, что здесь встречали…'));
  countsNear(plants(), loc).then((c) => paintNearby(box, c))
    .catch((e) => box.replaceChildren(h('p', { class: 'mine' }, 'Не удалось получить данные: ' + e.message + '. Нужна сеть.')));
  return root;
}

function paintNearby(box, counts) {
  const loc = S.settings.loc;
  const got = new Set(S.entries.map((e) => e.speciesId));
  const list = plants().map((p) => ({ p, n: counts.get(p.id) || 0, got: got.has(p.id) }));
  const seen = list.filter((x) => x.n > 0).sort((a, b) => (a.got - b.got) || b.n - a.n);
  const none = list.filter((x) => x.n === 0);
  const total = list.reduce((s, x) => s + x.n, 0);
  box.replaceChildren(...[
    h('p', { class: 'sub' }, `В радиусе ${loc.km || 30} км замечено ${seen.length} из ${list.length} растений каталога. В альбоме: ${seen.filter((x) => x.got).length}.`),
    seen.length
      ? h('div', { class: 'grid' }, seen.map(({ p, n, got: g }) =>
        h('a', { class: 'card' + (g ? '' : ' locked'), href: '#/plant/' + p.id },
          h('div', { class: 'ph' }, art(p.id), h('span', { class: 'no' }, '№ ' + numOf(p)), !g && h('span', { class: 'lockb' }, 'закрыто')),
          h('div', { class: 'meta' },
            h('span', { class: 'nm' }, p.ru),
            h('span', { class: 's2' }, g ? 'в альбоме' : 'ещё не найдено'),
            h('span', { class: 's3' }, `${n} ${plural(n, 'наблюдение', 'наблюдения', 'наблюдений')} рядом`)))))
      : h('div', { class: 'empty' }, `В этом радиусе нет наблюдений растений из каталога (${COUNTRIES[S.settings.country].name}). Увеличьте радиус или выберите другой город: каталоги есть для России и ОАЭ.`),
    total > 0 && total < 60 && h('div', { class: 'warn info' }, h('span', {}, h('b', {}, 'Мало данных. '), 'Рядом открытых наблюдений немного: это ориентир, а не гарантия. Попробуйте увеличить радиус.')),
    none.length > 0 && seen.length > 0 && h('details', { class: 'none' }, h('summary', {}, `Рядом не замечены: ${none.length}`), h('p', { class: 'sub' }, none.map((x) => x.p.ru).join(', ') + '.')),
  ].filter(Boolean));
}

function whereBody(p) {
  const loc = S.settings.loc;
  const box = h('div', {}, h('p', {}, 'Ищу места рядом…'));
  if (!loc) {
    box.replaceChildren(h('p', {}, 'Укажите, где вы находитесь, и здесь появятся места, где это растение чаще всего наблюдают рядом.'), h('a', { class: 'btn ghost', href: '#/nearby' }, 'Указать место'));
    return box;
  }
  const km = loc.km || 30;
  hotspots(p.lat, loc, km).then((r) => {
    if (!r.total) { box.replaceChildren(h('p', {}, `В радиусе ${km} км наблюдений этого растения не найдено. Попробуйте увеличить радиус или выбрать другой город.`)); return; }
    box.replaceChildren(
      h('p', {}, `Наблюдений рядом: ${r.total}.` + (r.monthText?.length ? ` Чаще всего их фиксируют в ${r.monthText.join(', ')}.` : '')),
      h('div', { class: 'spots' }, r.items.map((it) => h('div', { class: 'spot' },
        h('div', {}, h('b', {}, it.name), h('small', {}, `${it.kind === 'place' ? 'парк или природная территория' : 'район'} · ${it.km} км от вас · ${it.count} ${plural(it.count, 'наблюдение', 'наблюдения', 'наблюдений')}`)),
        h('a', { class: 'chip', href: osmLink(it.lat, it.lon), target: '_blank', rel: 'noopener' }, 'карта')))),
      h('p', { class: 'sub' }, 'Данные: GBIF и iNaturalist. Точки приблизительные, место может быть закрыто или охраняться. Наблюдайте и фотографируйте, не срывайте: многие виды под охраной.'));
  }).catch((e) => box.replaceChildren(h('p', {}, 'Не удалось получить данные: ' + e.message + '. Нужна сеть.')));
  return box;
}

/* ---------- Роутер ---------- */
const wideMq = matchMedia('(min-width: 900px)');

function splitView(id) {
  return h('div', { class: 'split' },
    h('aside', { class: 'split-list' }, catalogView(id)),
    h('div', { class: 'split-main' }, id ? plantView(id, true) : h('div', { class: 'empty' }, 'Выберите растение слева.')));
}

function render() {
  const [path, qs] = (location.hash.slice(1) || '/album').split('?');
  const [tab, arg] = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  const wide = wideMq.matches && (tab === 'catalog' || tab === 'plant');
  const keep = $('.split-list')?.scrollTop || 0;
  let node;
  switch (tab) {
    case 'catalog': node = wide ? splitView(null) : catalogView(null); break;
    case 'plant': node = wide ? splitView(arg) : plantView(arg, false); break;
    case 'nearby': node = nearbyView(); break;
    case 'add': node = addView(params); break;
    case 'entry': node = entryView(arg); break;
    case 'me': node = meView(); break;
    default: node = albumView();
  }
  view.className = wide ? 'wide' : '';
  view.replaceChildren(node);
  const active = { plant: 'catalog', entry: 'album' }[tab] || tab || 'album';
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.t === active));
  const sl = $('.split-list');
  if (sl) sl.scrollTop = keep; else window.scrollTo(0, 0);
}

async function boot() {
  const saved = await db.meta.get('settings');
  if (saved) Object.assign(S.settings, saved);
  S.entries = await db.entries.all();
  window.addEventListener('hashchange', render);
  wideMq.addEventListener('change', render);
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
