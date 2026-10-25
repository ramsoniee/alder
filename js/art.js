// Иллюстрации растений: линейная «гравюра» в едином стиле (первый проход, схематично).
// Каждое растение рисуется в рамке 100x130, низ стебля около y=128.
// Обводка — currentColor, заливки — CSS-переменные --fa, --fb, --fl... (см. style.css).
// Заменить на настоящие рисунки можно по одному: достаточно вернуть SVG-строку для id.

const P = (d, fill = 'none', x = '') => `<path d="${d}" fill="${fill}" ${x}/>`;
const C = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const E = (x, y, rx, ry, a, fill) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${a} ${x} ${y})"/>`;
const G = (x, y, a, s, inner) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${inner}</g>`;
const T = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none"/>`;

const FA = 'var(--fa)', FB = 'var(--fb)', FL = 'var(--fl)', FY = 'var(--fy)', FR = 'var(--fr)',
  FP = 'var(--fp)', FU = 'var(--fu)', FU2 = 'var(--fu2)', FK = 'var(--fk)', FPK = 'var(--fpk)';
const THIN = 'stroke-width=".7"';

// лист: основание в (0,0), поворот a градусов по часовой от «вверх»
const leaf = (x, y, a, len, w, fill = FA) =>
  G(x, y, a, 1,
    P(`M0 0C${w} ${-len * 0.3} ${w * 0.8} ${-len * 0.8} 0 ${-len}C${-w * 0.8} ${-len * 0.8} ${-w} ${-len * 0.3} 0 0Z`, fill) +
    P(`M0 0V${-len * 0.82}`, 'none', THIN));

const petals = (x, y, r, n, w, fill, off = 0) =>
  Array.from({ length: n }, (_, i) =>
    `<ellipse cx="${x}" cy="${y - r * 0.55}" rx="${w}" ry="${r * 0.5}" fill="${fill}" transform="rotate(${off + (i * 360) / n} ${x} ${y})"/>`
  ).join('');

const rays = (x, y, r0, r1, n) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return `M${(x + Math.cos(a) * r0).toFixed(1)} ${(y + Math.sin(a) * r0).toFixed(1)}L${(x + Math.cos(a) * r1).toFixed(1)} ${(y + Math.sin(a) * r1).toFixed(1)}`;
  }).join('');

const flower5 = (x, y, r, fill = FL, c = FY) => petals(x, y, r, 5, r * 0.36, fill) + C(x, y, r * 0.22, c);

const pinnate = (x, y, a, len, pairs, ll, lw) =>
  G(x, y, a, 1,
    P(`M0 0V${-len}`) +
    Array.from({ length: pairs }, (_, k) => {
      const yy = (-len * (k + 1)) / (pairs + 1);
      return leaf(0, yy, -65, ll, lw) + leaf(0, yy, 65, ll, lw);
    }).join('') +
    leaf(0, -len, 0, ll, lw));

const blob = (x, y, r, fill = FL) =>
  [[0, 0], [1, 0], [-1, 0], [0.5, 0.9], [-0.5, 0.9], [0.5, -0.9], [-0.5, -0.9]]
    .map(([dx, dy]) => C(x + dx * r * 1.7, y + dy * r * 1.7, r, fill)).join('');

const oakLeaf = (x, y, a, s) =>
  G(x, y, a, s,
    P('M0 0C-6 -3 -10 -2 -8 -8C-13 -9 -11 -16 -6 -16C-9 -21 -4 -27 0 -24C4 -27 9 -21 6 -16C11 -16 13 -9 8 -8C10 -2 6 -3 0 0Z', FA) +
    P('M0 0V-22', 'none', THIN));

const maple = (x, y, a, s) =>
  G(x, y, a, s,
    P('M0 0L-12 -8L-10 -14L-4 -12L-6 -22L0 -18L6 -22L4 -12L10 -14L12 -8Z', FA, 'stroke-linejoin="round"') +
    P('M0 0V-16', 'none', THIN));

const nettleLeaf = (x, y, a, s) =>
  G(x, y, a, s,
    P('M0 0L-5 -3L-9 -2L-8 -7L-13 -10L-9 -13L-11 -18L-6 -18L-5 -23L-1 -21L0 -28L1 -21L5 -23L6 -18L11 -18L9 -13L13 -10L8 -7L9 -2L5 -3Z', FA) +
    P('M0 0V-22', 'none', THIN));

const cordate = (x, y, a, s, fill = FA) =>
  G(x, y, a, s, P('M0 0C-12 -4 -16 -16 -8 -20C-4 -22 0 -18 0 -14C0 -18 4 -22 8 -20C16 -16 12 -4 0 0Z', fill) + P('M0 0V-14', 'none', THIN));

const bell = (x, y, s, a, fill = FU) =>
  G(x, y, a, s, P('M-3 0C-3 -3 3 -3 3 0C5 4 8 10 9 14C4 17 -4 17 -9 14C-8 10 -5 4 -3 0Z', fill));

const ART = {
  'betula-pendula': () =>
    P('M8 30C36 22 64 34 86 80') +
    [[24, 27, 150], [34, 27, 205], [44, 29, 155], [54, 35, 205], [63, 43, 160], [72, 56, 210], [80, 70, 165]]
      .map(([x, y, a]) => leaf(x, y, a, 17, 8)).join('') +
    E(40, 40, 2, 7, 8, FK) + E(58, 52, 2, 7, 15, FK),

  'sorbus-aucuparia': () =>
    pinnate(34, 126, -6, 74, 4, 20, 7) +
    P('M44 74C56 60 62 46 66 34') +
    [[62, 26], [70, 28], [66, 36], [74, 36], [58, 34], [67, 20], [76, 24]].map(([x, y]) => C(x, y, 4.4, FR)).join(''),

  'quercus-robur': () =>
    P('M20 122C30 92 50 66 78 34') +
    oakLeaf(40, 98, -50, 1.3) + oakLeaf(54, 78, 40, 1.3) + oakLeaf(66, 56, -45, 1.2) + oakLeaf(78, 34, 10, 1.2) +
    T(34, 90, 28, 96) + E(27, 104, 5, 6.5, 0, FK) + P('M21 99C22 91 33 91 34 99Z', FB),

  'salix-caprea': () =>
    P('M14 124C28 96 52 62 82 26') +
    leaf(18, 118, -20, 28, 5) + leaf(22, 110, 50, 24, 5) +
    [[30, 100, 1], [44, 82, -1], [56, 66, 1], [69, 48, -1], [79, 32, 1]]
      .map(([x, y, s]) => E(x + s * 6, y, 4.2, 8, 35, FL) + T(x + s * 6 - 1, y - 4, x + s * 6 + 1, y - 2)).join(''),

  crataegus: () =>
    P('M16 124C34 96 56 70 84 40') + T(46, 86, 40, 80) + T(62, 66, 66, 60) +
    G(34, 100, -60, 1.3, P('M0 0L-9 -6L-8 -11L-3 -10L-5 -18L0 -15L5 -18L3 -10L8 -11L9 -6Z', FA, 'stroke-linejoin="round"')) +
    G(52, 78, 55, 1.3, P('M0 0L-9 -6L-8 -11L-3 -10L-5 -18L0 -15L5 -18L3 -10L8 -11L9 -6Z', FA, 'stroke-linejoin="round"')) +
    flower5(64, 56, 10) + flower5(76, 44, 9) + flower5(84, 58, 8),

  'sambucus-nigra': () => {
    let dots = '';
    for (let i = 0; i < 34; i++) {
      const a = i * 2.4, r = Math.sqrt(i / 34);
      dots += C((50 + Math.cos(a) * r * 32).toFixed(1), (36 + Math.sin(a) * r * 14).toFixed(1), 2.7, FL);
    }
    return P('M50 126V50') +
      P('M50 50C40 46 30 42 22 40M50 50C60 46 70 42 78 40M50 50V32M50 50C44 42 40 36 34 32M50 50C56 42 60 36 66 32') +
      dots + pinnate(50, 112, -62, 30, 2, 15, 6) + pinnate(50, 100, 62, 30, 2, 15, 6);
  },

  'viburnum-opulus': () =>
    P('M50 126C48 96 50 70 56 44') +
    maple(50, 104, -55, 1.3) + maple(51, 86, 50, 1.2) +
    [[56, 28], [64, 32], [48, 32], [58, 38], [67, 40], [51, 40], [60, 22], [70, 28]].map(([x, y]) => C(x, y, 4.6, FR)).join('') +
    T(56, 44, 58, 38),

  'rosa-canina': () =>
    P('M14 120C30 90 56 70 84 40') + T(30, 100, 26, 106) + T(50, 80, 46, 86) + T(68, 58, 72, 64) +
    pinnate(36, 98, -72, 28, 2, 12, 5) + pinnate(58, 74, 62, 28, 2, 12, 5) +
    E(30, 96, 5, 7.5, 20, FR) + T(28, 89, 27, 86) +
    flower5(78, 34, 13, FPK, FY),

  'syringa-vulgaris': () => {
    let fl = '';
    for (let r = 0; r < 7; r++) {
      const n = 1 + r * 1.3;
      for (let k = 0; k < n; k++) {
        fl += C((50 + (k - (n - 1) / 2) * 6.4).toFixed(1), 14 + r * 7.2, 3.3, FP);
      }
    }
    return P('M50 126C50 100 50 74 50 60') + fl + cordate(50, 108, -62, 1.5) + cordate(50, 94, 62, 1.5);
  },

  'prunus-padus': () => {
    const pts = [[22, 26], [32, 25], [42, 26], [52, 31], [60, 39], [66, 49], [70, 59], [72, 69], [73, 79]];
    return P('M10 34C34 18 60 28 72 56C76 66 74 76 73 84') +
      leaf(16, 38, -105, 26, 8) + leaf(30, 28, -75, 22, 7) + leaf(46, 30, 120, 22, 7) +
      pts.map(([x, y]) => T(x, y, x, y + 3) + flower5(x, y + 6, 4.4)).join('');
  },

  'taraxacum-officinale': () =>
    leaf(50, 128, -32, 36, 7) + leaf(50, 128, 32, 36, 7) + leaf(50, 128, -66, 30, 6) + leaf(50, 128, 66, 30, 6) +
    P('M50 126C50 100 49 74 50 50') +
    P(rays(50, 38, 8, 17, 26)) + C(50, 38, 10, FY) +
    P('M72 128C74 108 78 90 82 70') +
    P(rays(82, 58, 3, 14, 16), 'none', THIN) + C(82, 58, 2.2, FK),

  'matricaria-chamomilla': () =>
    P('M48 126C47 100 48 70 50 48') +
    pinnate(48, 122, -34, 40, 5, 11, 1.8) + pinnate(48, 108, 38, 34, 5, 10, 1.8) +
    petals(50, 34, 20, 14, 3.4, FL) + C(50, 34, 6.5, FY),

  'convallaria-majalis': () =>
    P('M42 128C20 108 16 74 34 48 46 70 50 100 42 128Z', FA) +
    P('M46 128C74 112 86 84 74 58 58 76 48 100 46 128Z', FB) +
    P('M45 126C44 96 44 62 50 38 54 20 68 12 80 16') +
    P('M51 38L55 34M56 27L61 26M65 20L70 22M74 16L78 20') +
    C(56, 35, 4, FL) + C(62, 28, 4, FL) + C(71, 24, 4, FL) + C(79, 23, 4, FL),

  'centaurea-cyanus': () =>
    P('M50 126C50 100 50 70 52 50') +
    leaf(50, 122, -12, 40, 3.5) + leaf(51, 102, 24, 34, 3) + leaf(50, 88, -32, 26, 3) +
    petals(52, 36, 22, 9, 2.8, FU) + petals(52, 36, 13, 8, 2.2, FU2) + C(52, 36, 4, FU2),

  'chamaenerion-angustifolium': () => {
    let fl = '';
    for (let k = 0; k < 6; k++) {
      const y = 62 - k * 8.5, side = k % 2 ? -1 : 1, r = 7 - k * 0.7;
      fl += T(50, y + 2, 50 + side * 5, y) + (r > 2.4 ? petals(50 + side * 6, y, r * 1.5, 4, r * 0.55, FPK) : C(50 + side * 5, y, 2, FPK));
    }
    return P('M50 126V12') +
      [0, 1, 2, 3, 4].map((k) => leaf(50, 118 - k * 12, k % 2 ? -62 : 62, 26 - k * 2, 3.6)).join('') +
      fl + C(50, 10, 2.4, FPK);
  },

  'achillea-millefolium': () =>
    P('M50 126C50 96 50 70 50 54') +
    P('M50 56C38 52 28 46 24 40M50 56C62 52 72 46 76 40M50 56V38') +
    pinnate(50, 124, -50, 36, 5, 9, 2.4) + pinnate(50, 110, 50, 32, 5, 9, 2.4) +
    blob(24, 36, 2.6) + blob(37, 32, 2.6) + blob(50, 30, 2.6) + blob(63, 32, 2.6) + blob(76, 36, 2.6),

  'hypericum-perforatum': () =>
    P('M50 126C50 96 48 70 50 46') + P('M50 92C62 82 70 72 76 58') + P('M50 78C38 68 30 58 28 46') +
    [[50, 112, -60], [50, 112, 60], [49, 98, -55], [52, 98, 58], [50, 84, -50], [50, 70, 55]]
      .map(([x, y, a]) => leaf(x, y, a, 11, 4)).join('') +
    flower5(50, 40, 9, FY, FK) + flower5(77, 52, 8, FY, FK) + flower5(28, 40, 8, FY, FK),

  'plantago-major': () =>
    leaf(50, 126, -48, 42, 17) + leaf(50, 126, 48, 42, 17) + leaf(50, 126, -6, 34, 12) +
    P('M44 124C34 108 28 96 26 86M56 124C66 108 72 96 74 86', 'none', THIN) +
    P('M52 124C52 90 52 60 52 40') +
    `<rect x="48.6" y="10" width="6.8" height="40" rx="3.4" fill="${FK}"/>` +
    P('M49 18H55M49 25H55M49 32H55M49 39H55', 'none', THIN),

  'urtica-dioica': () =>
    P('M50 126V26') +
    nettleLeaf(50, 104, -72, 1.1) + nettleLeaf(50, 104, 72, 1.1) +
    nettleLeaf(50, 76, -72, 1) + nettleLeaf(50, 76, 72, 1) +
    nettleLeaf(50, 50, -70, 0.85) + nettleLeaf(50, 50, 70, 0.85) +
    nettleLeaf(50, 26, 0, 0.7) +
    P('M50 58C56 60 60 66 60 74', 'none') + [[58, 62], [60, 68], [60, 74]].map(([x, y]) => C(x, y, 1.6, FK)).join(''),

  'tussilago-farfara': () =>
    P('M30 126V62') + T(30, 108, 24, 104) + T(30, 94, 36, 90) + T(30, 80, 24, 76) +
    P(rays(30, 50, 6, 15, 28)) + C(30, 50, 8, FY) +
    P('M50 126V84') + T(50, 100, 55, 96) + E(50, 80, 4.2, 6, 0, FY) +
    P('M76 128C76 120 74 114 72 110', 'none') + E(70, 94, 22, 17, -8, FA) +
    P('M72 110C60 104 54 98 50 92M72 110C68 98 66 92 66 82M72 110C78 100 84 94 88 90M72 110C84 108 88 104 91 100', 'none', THIN),

  'trifolium-pratense': () =>
    P('M50 126C50 100 50 76 50 52') +
    E(32, 108, 10, 6.4, -22, FA) + E(44, 100, 10, 6.4, 18, FA) + E(36, 96, 6.4, 10, -8, FA) +
    P('M26 108Q32 104 38 106M38 98Q44 98 50 102', 'none', THIN) +
    E(50, 38, 13, 15, 0, FPK) +
    P(rays(50, 38, 6, 12, 10), 'none', THIN) + leaf(50, 56, -50, 12, 4) + leaf(50, 56, 50, 12, 4),

  'campanula-rotundifolia': () =>
    leaf(44, 126, -16, 28, 3) + leaf(48, 126, 14, 24, 3) +
    P('M44 126C44 96 40 66 28 42') + P('M46 90C54 76 64 64 72 56') + P('M40 70C46 58 54 48 56 38') +
    T(28, 42, 28, 46) + bell(28, 46, 1.1, 8) +
    T(72, 56, 72, 60) + bell(72, 60, 1, -10) +
    T(56, 38, 57, 42) + bell(57, 42, 0.9, 5),

  'viola-tricolor': () =>
    P('M50 128C50 112 52 98 54 84') +
    cordate(50, 120, -70, 1.1) + cordate(50, 124, 72, 1.1) +
    E(40, 44, 11, 14, -18, FP) + E(60, 44, 11, 14, 18, FP) +
    E(31, 62, 11, 9, -25, FU) + E(69, 62, 11, 9, 25, FU) +
    E(50, 74, 12, 11, 0, FY) + C(50, 60, 3.2, FY) +
    P('M50 66V80M44 68L42 78M56 68L58 78', 'none', THIN),
  /* ===== Россия: северо-запад, юг, Сибирь, Дальний Восток ===== */
  'rubus-chamaemorus': () =>
    P('M50 128V60') + cordate(50, 100, -62, 1.5) + cordate(50, 82, 62, 1.4) +
    P('M50 100L40 94M50 82L60 76', 'none', THIN) +
    leaf(50, 58, -68, 9, 2.6) + leaf(50, 58, 68, 9, 2.6) + blob(50, 44, 4.2, FY),

  'vaccinium-myrtillus': () => {
    const berry = (x, y) => C(x, y, 4.2, FU2) + P(`M${x - 1.4} ${y - 0.6}h2.8`, 'none', THIN);
    return P('M50 128C50 104 48 84 44 62') + P('M49 102C58 92 66 82 72 66') + P('M47 86C38 76 30 68 26 52') +
      [[46, 74, -48], [44, 62, 42], [52, 96, 52], [60, 86, -40], [68, 74, 50], [38, 76, -52], [30, 62, 46], [48, 112, -56], [49, 112, 56]]
        .map(([x, y, a]) => leaf(x, y, a, 12, 5)).join('') +
      berry(55, 98) + berry(63, 84) + berry(36, 84) + berry(29, 68);
  },

  'vaccinium-vitis-idaea': () =>
    P('M50 128C50 108 50 90 50 70') +
    [[50, 116, -58], [50, 108, 58], [50, 98, -54], [50, 90, 56], [50, 80, -50], [50, 72, 52]]
      .map(([x, y, a]) => E(x + (a < 0 ? -9 : 9), y - 5, 5.4, 9, a * 0.9, FA)).join('') +
    P('M50 70C46 64 44 62 44 58M50 70C54 62 54 58 54 56M50 70C50 66 49 64 49 62M50 70C56 68 58 66 58 66M50 70C44 70 41 69 40 68', 'none', THIN) +
    C(44, 56, 4.8, FR) + C(54, 54, 4.8, FR) + C(49, 60, 4.8, FR) + C(59, 64, 4.8, FR) + C(39, 66, 4.8, FR),

  'vaccinium-oxycoccos': () =>
    P('M6 114C26 104 44 114 62 108C76 103 86 106 94 100') +
    [14, 24, 36, 46, 58, 68, 80, 88].map((x, i) => leaf(x, 110 - (i % 3) * 2, i % 2 ? 62 : -62, 8, 2.6)).join('') +
    P('M30 108C30 98 29 90 28 86M62 108C62 100 63 94 64 90M82 104C82 98 84 94 86 92', 'none', THIN) +
    C(28, 80, 6.4, FR) + C(64, 84, 6, FR) + C(87, 87, 5, FR),

  'calluna-vulgaris': () => {
    const sprig = (d, pts) => P(d) + pts.map(([x, y], i) => C(x, y, 2.3, FPK) + T(x, y, x + (i % 2 ? 3 : -3), y + 3)).join('');
    const col = (x0, y0, x1, y1, n) => Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * i) / (n - 1)]);
    return sprig('M50 128C50 100 50 70 50 24', col(50, 30, 50, 90, 12).map(([x, y], i) => [x + (i % 2 ? 3 : -3), y])) +
      sprig('M46 122C38 100 32 74 28 44', col(29, 48, 40, 100, 9).map(([x, y], i) => [x + (i % 2 ? 3 : -3), y])) +
      sprig('M54 120C62 98 68 74 72 48', col(71, 52, 60, 100, 9).map(([x, y], i) => [x + (i % 2 ? 3 : -3), y]));
  },

  'rhododendron-tomentosum': () =>
    P('M50 128V50') +
    [0, 1, 2, 3, 4].map((k) => leaf(50, 118 - k * 13, k % 2 ? -72 : 72, 20 - k, 2.8)).join('') +
    P('M50 52L30 36M50 52L40 28M50 52V22M50 52L60 28M50 52L70 36', 'none', THIN) +
    flower5(30, 34, 7, FL, FY) + flower5(40, 26, 7, FL, FY) + flower5(50, 20, 7, FL, FY) + flower5(60, 26, 7, FL, FY) + flower5(70, 34, 7, FL, FY),

  'oxalis-acetosella': () => {
    const tri = (x, y, s) => cordate(x, y, -50, s) + cordate(x, y, 0, s) + cordate(x, y, 50, s);
    return P('M30 128C30 112 28 100 26 90') + P('M72 128C72 114 72 104 74 96') + P('M52 128V52') +
      tri(26, 90, 0.85) + tri(74, 96, 0.85) +
      petals(52, 40, 22, 5, 6, FL) + C(52, 40, 3.4, FY) +
      P('M52 40L52 22M52 40L40 28M52 40L64 28', 'none', THIN);
  },

  'heracleum-sosnowskyi': () => {
    let u = '';
    for (let i = 0; i < 9; i++) {
      const a = (-80 + i * 20) * Math.PI / 180, x = 50 + Math.sin(a) * 26, y = 44 - Math.cos(a) * 22;
      u += P(`M50 46L${x.toFixed(1)} ${y.toFixed(1)}`, 'none', THIN) + [[0, 0], [3, 2], [-3, 2], [0, 3.6]].map(([dx, dy]) => C(x + dx, y + dy, 2.2, FL)).join('');
    }
    return P('M47 128V46M53 128V46') + P('M47 100L53 106M47 80L53 86M47 64L53 70', 'none', THIN) + maple(26, 126, -40, 1.5) + maple(74, 124, 40, 1.4) + u;
  },

  'pinus-sylvestris': () => {
    const fan = (x, y, a, len) => Array.from({ length: 7 }, (_, i) => T(x, y, x + Math.sin(((a + (i - 3) * 6) * Math.PI) / 180) * len, y - Math.cos(((a + (i - 3) * 6) * Math.PI) / 180) * len)).join('');
    return P('M10 108C34 96 62 78 92 50') +
      [[22, 103, -20], [38, 94, 10], [54, 83, -16], [70, 69, 12], [84, 56, -10], [30, 99, 160], [58, 81, 160]]
        .map(([x, y, a]) => fan(x, y, a, 18)).join('') +
      P('M48 90C50 100 50 108 50 112') + E(50, 119, 6.4, 10, 0, FK) +
      P('M46 114L54 114M45 119L55 119M46 124L54 124M50 109V129', 'none', THIN);
  },

  'trollius-europaeus': () =>
    P('M50 128V62') + maple(50, 112, -62, 1.6) + maple(50, 98, 62, 1.5) +
    C(50, 44, 19, FY) +
    P('M50 25C38 34 36 54 50 63M50 25C62 34 64 54 50 63M50 25C31 30 30 58 50 63M50 25C69 30 70 58 50 63', 'none') +
    P('M44 42C46 38 54 38 56 42', 'none', THIN),

  'filipendula-ulmaria': () =>
    P('M50 128V38') + P('M50 62C40 54 32 48 28 40M50 62C60 54 68 48 72 40M50 52V30', 'none') +
    pinnate(50, 124, -42, 40, 4, 10, 3) + pinnate(50, 112, 44, 34, 4, 9, 3) +
    blob(28, 34, 2.6) + blob(50, 24, 2.8) + blob(72, 34, 2.6) + blob(40, 44, 2.2) + blob(60, 44, 2.2),

  'cornus-mas': () => {
    const um = (x, y) => C(x, y, 2.4, FY) + P(rays(x, y, 2.4, 8, 9), 'none', THIN);
    return P('M10 112C34 98 60 84 88 52') + P('M40 98C42 86 46 80 50 74M62 80C66 70 72 66 76 62') +
      um(32, 96) + um(46, 82) + um(58, 72) + um(72, 62) + um(82, 50) + um(24, 104) +
      T(52, 90, 52, 100) + E(52, 106, 3.6, 5.6, 0, FR) + T(66, 79, 66, 89) + E(66, 95, 3.6, 5.6, 0, FR) +
      E(36, 104, 5, 9, -60, FA) + E(70, 74, 5, 9, 60, FA);
  },

  'buxus-colchica': () =>
    P('M50 128V20') +
    [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const y = 118 - k * 14;
      return E(40, y, 4.4, 8.4, -58, FA) + E(60, y, 4.4, 8.4, 58, FA) + C(50, y - 3, 1.8, FY);
    }).join('') + E(50, 16, 4, 8, 0, FA),

  'pulsatilla-patens': () =>
    P('M50 128V58') + P('M44 100l3 -3M56 90l3 -3M44 80l3 -3M56 70l3 -3', 'none', THIN) +
    [-36, -18, 0, 18, 36].map((a) => leaf(50, 128, a, 36 - Math.abs(a) * 0.3, 2.2)).join('') +
    petals(50, 44, 22, 6, 5.6, FP) + C(50, 44, 6, FY) + P(rays(50, 44, 2, 6, 12), 'none', THIN),

  'pinus-sibirica': () => {
    const fan = (x, y, a, len) => Array.from({ length: 8 }, (_, i) => T(x, y, x + Math.sin(((a + (i - 3.5) * 6) * Math.PI) / 180) * len, y - Math.cos(((a + (i - 3.5) * 6) * Math.PI) / 180) * len)).join('');
    return P('M8 96C32 86 60 70 92 40') +
      [[20, 92, -24], [40, 82, 8], [60, 68, -18], [78, 54, 10]].map(([x, y, a]) => fan(x, y, a, 28)).join('') +
      E(62, 100, 11, 17, -8, FK) +
      P('M52 90Q62 96 72 90M50 98Q62 106 74 98M51 106Q62 114 73 106M54 113Q63 119 71 113', 'none', THIN) +
      T(56, 82, 58, 86);
  },

  'schisandra-chinensis': () => {
    const berries = [[52, 58], [60, 60], [56, 66], [49, 70], [63, 69], [55, 76], [48, 82], [62, 79], [56, 86], [51, 92], [60, 92], [56, 99], [55, 106]];
    return P('M6 36C26 26 46 34 66 24C78 18 88 18 94 24') + P('M56 31C56 44 55 54 55 58', 'none', THIN) +
      leaf(24, 32, -40, 22, 10) + leaf(48, 32, 150, 22, 10) + leaf(72, 22, 30, 20, 9) + leaf(84, 20, 140, 18, 8) +
      berries.map(([x, y]) => C(x, y, 4.2, FR)).join('');
  },

  /* ===== ОАЭ ===== */
  'prosopis-cineraria': () =>
    P('M50 128C50 108 48 92 44 76M50 112C54 98 60 86 68 76M47 98C41 90 34 86 26 82') +
    E(28, 66, 19, 10, -8, FA) + E(52, 54, 25, 12, 0, FA) + E(76, 66, 19, 10, 8, FA) +
    P('M14 66l4 -3M22 60l4 -3M34 52l4 -3M46 46l4 -3M58 46l4 -3M70 52l4 -3M82 60l4 -3M64 70l4 -3M30 72l4 -3', 'none', THIN) +
    T(40, 76, 40, 100) + T(46, 70, 46, 92) + T(66, 76, 66, 98) +
    E(40, 106, 1.8, 7, 0, FK) + E(46, 98, 1.8, 7, 0, FK) + E(66, 104, 1.8, 7, 0, FK),

  'phoenix-dactylifera': () => {
    // листья-дуги от макушки: вверх-наружу, затем вниз; по бокам перистые «зубцы»
    const frond = (side, len, rise, drop) => {
      let d = 'M50 64', ticks = '';
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, x = 50 + side * len * t, y = 64 - rise * Math.sin(Math.PI * t * 0.85) + drop * t * t;
        d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
        if (i >= 3 && i % 1 === 0) ticks += T(x, y, x + side * 2, y + 8) + T(x, y, x - side * 3, y + 6);
      }
      return P(d) + ticks;
    };
    return P('M46 128C47 104 47 84 48 66M54 128C53 104 53 84 52 66') +
      [74, 84, 94, 104, 114, 124].map((y) => P(`M47 ${y}l6 -2`, 'none', THIN)).join('') +
      frond(-1, 44, 30, 22) + frond(1, 44, 30, 22) + frond(-1, 30, 44, 12) + frond(1, 30, 44, 12) +
      P('M50 64C49 50 49 38 50 26') + [34, 42, 50, 58].map((y) => T(50, y, 44, y + 6) + T(50, y, 56, y + 6)).join('') +
      P('M52 68C58 74 60 80 58 86') + E(56, 88, 2.4, 4, 10, FK) + E(60, 90, 2.4, 4, 10, FR) + E(57, 94, 2.4, 4, 10, FK) + E(61, 96, 2.4, 4, 10, FR);
  },

  'ziziphus-spina-christi': () => {
    const lf = (x, y, a) => G(x, y, a, 1, P('M0 0C7 -4 7 -14 0 -20C-7 -14 -7 -4 0 0Z', FA) + P('M0 0V-17M0 -2C-3 -6 -3 -10 -2 -13M0 -2C3 -6 3 -10 2 -13', 'none', THIN));
    return P('M8 98L30 82L50 94L72 72L92 80') +
      T(30, 82, 26, 76) + T(30, 82, 35, 77) + T(50, 94, 46, 99) + T(50, 94, 55, 98) + T(72, 72, 68, 66) + T(72, 72, 78, 67) +
      lf(30, 82, -45) + lf(50, 94, 40) + lf(72, 72, -40) + lf(60, 84, 60) + lf(22, 90, -70) + lf(84, 78, 50) +
      C(40, 100, 4.4, FY) + C(46, 106, 4.4, FY) + C(76, 82, 4.4, FY) + T(38, 88, 40, 96) + T(44, 94, 46, 102);
  },

  'vachellia-tortilis': () =>
    P('M46 128C46 108 48 92 50 80M54 128C55 108 54 94 52 80') +
    P('M50 82C40 78 28 76 18 72M50 82C60 78 72 76 82 72M50 84V70', 'none') +
    E(50, 62, 44, 10, 0, FA) + E(24, 70, 18, 6, -8, FA) + E(76, 70, 18, 6, 8, FA) +
    P('M12 66l4 -3M24 60l4 -3M38 55l4 -3M52 54l4 -3M66 56l4 -3M80 60l4 -3M90 66l4 -2M20 74l4 -3M70 76l4 -3', 'none', THIN) +
    T(14, 108, 22, 98) + T(18, 112, 26, 104) +
    P('M78 108C84 100 92 106 86 112C80 118 72 110 78 104', 'none'),

  'avicennia-marina': () =>
    P('M2 98C12 94 22 102 32 98C42 94 52 102 62 98C72 94 82 102 98 98') +
    P('M48 98C40 108 36 118 34 126M50 98C52 110 54 118 56 126M52 98C60 106 66 114 70 124', 'none', THIN) +
    [12, 20, 28, 40, 60, 72, 82, 90].map((x) => T(x, 98, x, 88)).join('') +
    P('M48 98C47 82 49 66 50 48') + P('M49 70C58 62 64 56 70 50') +
    leaf(50, 52, -52, 24, 7) + leaf(50, 52, 52, 24, 7) + leaf(50, 52, 0, 22, 6) + leaf(49, 70, -50, 20, 6) + leaf(70, 50, 40, 18, 6) +
    T(60, 60, 60, 66) + E(60, 74, 3.8, 8, 0, FA) + P('M60 82V86', 'none'),

  'calotropis-procera': () =>
    P('M50 128V34') +
    E(33, 104, 17, 10, -22, FA) + E(67, 104, 17, 10, 22, FA) + E(35, 80, 15, 9, -18, FA) + E(65, 80, 15, 9, 18, FA) +
    P('M50 104L22 96M50 104L78 96M50 80L24 74M50 80L76 74', 'none', THIN) +
    [[38, 40], [50, 32], [62, 40], [44, 50], [56, 50]].map(([x, y]) => petals(x, y, 8, 5, 2.8, FL) + C(x, y, 1.9, FP)).join('') +
    P('M62 58C70 56 78 56 82 62') + E(82, 76, 9, 13, 8, FA) + P('M82 64C84 72 84 80 82 88', 'none', THIN),

  'tamarix-aphylla': () => {
    const sp = (d, tip) => P(d, 'none', 'stroke-dasharray="1 2.6" stroke-width="2.6"') + (tip ? E(tip[0], tip[1], 2, 5, 0, FPK) : '');
    return P('M50 128C50 102 48 80 50 58') + P('M50 90C42 82 36 72 34 62M50 82C58 74 64 66 66 58') +
      sp('M50 58C34 52 20 60 16 92') + sp('M50 58C36 50 26 64 28 96') + sp('M50 58C44 52 40 70 42 100') +
      sp('M50 58C66 52 80 60 84 92') + sp('M50 58C64 50 74 64 72 96') + sp('M50 58C56 52 60 70 58 100') +
      sp('M34 62C26 62 22 66 20 76') + sp('M66 58C74 58 78 62 80 72') +
      E(50, 50, 2.4, 6, 0, FPK) + E(44, 54, 2.2, 5, -30, FPK) + E(56, 54, 2.2, 5, 30, FPK);
  },

  'salvadora-persica': () =>
    P('M10 112C30 100 50 90 70 70C80 60 86 52 90 44') + P('M50 90C56 84 62 82 66 80', 'none', THIN) +
    [[28, 104, -62], [28, 104, 62], [46, 92, -62], [46, 92, 62], [62, 78, -62], [62, 78, 62], [76, 62, -60], [76, 62, 60]]
      .map(([x, y, a]) => leaf(x, y, a, 15, 5.4)).join('') +
    [[84, 48], [89, 52], [86, 56], [91, 46], [82, 54]].map(([x, y]) => C(x, y, 3, FR)).join('') +
    `<rect x="52" y="116" width="40" height="5" rx="2.5" fill="${FK}" transform="rotate(-18 72 118)"/>`,

  'citrullus-colocynthis': () =>
    P('M4 114C24 106 40 116 58 110C74 105 86 110 96 102') +
    maple(22, 110, -20, 1.1) + maple(46, 112, 28, 1.0) + maple(84, 106, 24, 0.9) +
    P('M30 114C30 104 36 102 36 106C36 110 30 110 32 104', 'none', THIN) +
    C(66, 86, 17, FY) + P('M66 69C58 78 58 94 66 103M66 69C74 78 74 94 66 103M66 69C52 76 52 96 66 103M66 69C80 76 80 96 66 103', 'none', THIN) +
    P('M64 108C66 106 66 104 66 103', 'none'),

  'nerium-oleander': () =>
    P('M50 128V56') + P('M50 56L38 44M50 56L52 38M50 56L64 46', 'none') +
    [-38, -16, 16, 38].map((a) => leaf(50, 124, a, 40, 4.4)).join('') +
    [-54, -22, 22, 54].map((a) => leaf(50, 98, a, 34, 4)).join('') +
    flower5(38, 40, 9, FPK, FY) + flower5(53, 33, 10, FPK, FY) + flower5(66, 44, 8.5, FPK, FY) + flower5(50, 50, 7, FPK, FY),

  'bougainvillea': () => {
    const cl = (x, y) => E(x - 5, y + 1, 5.6, 9, -22, FPK) + E(x + 5, y + 1, 5.6, 9, 22, FPK) + E(x, y + 3, 5.6, 9, 0, FPK) + C(x, y + 2, 1.7, FL);
    return P('M6 120C24 72 56 40 94 36') + T(30, 88, 24, 84) + T(52, 62, 48, 56) + T(74, 46, 72, 40) +
      cordate(26, 94, -60, 0.8) + cordate(46, 70, 80, 0.8) + cordate(70, 50, -50, 0.8) + cordate(20, 108, 70, 0.7) +
      cl(40, 82) + cl(58, 56) + cl(80, 44) + cl(24, 102) + cl(70, 66);
  },

  'cistanche-tubulosa': () => {
    let sc = '';
    for (let y = 48; y <= 114; y += 8) sc += P(`M40 ${y}Q50 ${y + 7} 60 ${y}`, 'none', THIN);
    return `<rect x="40" y="26" width="20" height="92" rx="9" fill="${FY}"/>` + sc +
      [[46, 34], [54, 32], [50, 40], [43, 42], [57, 42]].map(([x, y]) => C(x, y, 2.4, FP)).join('') +
      P('M0 118C20 110 32 122 50 117C70 112 84 122 100 114', 'none') + P('M6 126C26 120 40 128 60 124', 'none', THIN);
  },

};

const generic = () =>
  P('M50 126C49 96 50 66 54 40') + leaf(50, 104, -62, 30, 9) + leaf(51, 80, 58, 28, 8) + leaf(53, 56, -48, 22, 7);

export const hasArt = (id) => id in ART;

export function artSvg(id) {
  const body = (ART[id] || generic)();
  return `<svg viewBox="0 0 100 130" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

// DOM-элемент с иллюстрацией (SVG собирается только из кода выше, без пользовательских данных)
export function art(id, cls = '') {
  const s = document.createElement('span');
  s.className = ('art ' + cls).trim();
  s.innerHTML = artSvg(id);
  return s;
}

export const artIds = () => Object.keys(ART);
