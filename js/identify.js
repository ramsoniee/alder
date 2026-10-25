// Распознавание по фото. Сейчас: Pl@ntNet (https://my.plantnet.org, нужен бесплатный API-ключ).
// Адаптер возвращает [{latin, common[], score}]. Чтобы подключить другой сервис —
// добавь функцию с тем же результатом и выбери её в identify().

export async function plantnet(blob, key, organ = 'auto') {
  const fd = new FormData();
  fd.append('images', blob, 'photo.jpg');
  fd.append('organs', organ);
  const url =
    'https://my-api.plantnet.org/v2/identify/all?api-key=' + encodeURIComponent(key) +
    '&lang=ru&nb-results=5&include-related-images=false';
  const r = await fetch(url, { method: 'POST', body: fd });
  if (r.status === 401 || r.status === 403) throw new Error('Ключ Pl@ntNet не принят');
  if (r.status === 404) throw new Error('Растение не найдено на фото');
  if (r.status === 429) throw new Error('Лимит запросов исчерпан, попробуйте позже');
  if (!r.ok) throw new Error('Ошибка распознавания: ' + r.status);
  const j = await r.json();
  return (j.results || []).map((x) => ({
    latin: x.species.scientificNameWithoutAuthor,
    common: x.species.commonNames || [],
    score: x.score,
  }));
}

export async function identify(blob, settings) {
  if (!navigator.onLine) throw new Error('Нет сети: определите вручную или сохраните как есть');
  if (!settings.plantnetKey) throw new Error('Добавьте ключ Pl@ntNet в разделе «Я»');
  return plantnet(blob, settings.plantnetKey);
}

// Привести фото к разумному размеру (экономит место, ускоряет распознавание)
export async function shrink(file, max = 1280, q = 0.85) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', q));
}
