// Реестр стран. Чтобы добавить страну: создай js/data/xx.js с массивом PLANTS
// той же структуры и добавь строку ниже.
import { PLANTS as RU_BASE } from './ru.js';
import { PLANTS as RU_REGIONAL } from './ru-regional.js';
import { PLANTS as AE } from './ae.js';

const RU = [...RU_BASE, ...RU_REGIONAL];

export const COUNTRIES = {
  RU: { name: 'Россия', plants: RU },
  AE: { name: 'ОАЭ', plants: AE },
};
export const DEFAULT_COUNTRY = 'RU';
