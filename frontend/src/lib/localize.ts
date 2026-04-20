const exactUrduMap: Record<string, string> = {
  Cement: 'سیمنٹ',
  'Sariya Thin': 'سریا پتلا',
  'Sariya Thick': 'سریا موٹا',
  Rings: 'رِنگ',
  'Steel Wire': 'اسٹیل وائر',
  Fauji: 'فوجی',
  Bestway: 'بیسٹ وے',
  Askari: 'عسکری',
  'White Cement': 'وائٹ سیمنٹ',
  'Fauji Cement Company': 'فوجی سیمنٹ کمپنی',
  'Bestway Cement': 'بیسٹ وے سیمنٹ',
  'Askari Cement': 'عسکری سیمنٹ',
  'White Cement Co.': 'وائٹ سیمنٹ کمپنی',
  'Local Steel Mill': 'لوکل اسٹیل مل',
  'Walk-in': 'واک اِن',
};

const wordUrduMap: Record<string, string> = {
  cement: 'سیمنٹ',
  sariya: 'سریا',
  steel: 'اسٹیل',
  wire: 'وائر',
  ring: 'رِنگ',
  rings: 'رِنگ',
  thin: 'پتلا',
  thick: 'موٹا',
  company: 'کمپنی',
  mill: 'مل',
  local: 'لوکل',
  bag: 'بیگ',
  bundle: 'بنڈل',
  piece: 'پیس',
  kg: 'کلو',
};

function replaceWordByWord(value: string) {
  return value
    .split(/(\s+|[-_/])/)
    .map((chunk) => {
      const key = chunk.toLowerCase();
      return wordUrduMap[key] ?? chunk;
    })
    .join('');
}

export function localizeApiText(value: string | undefined | null, isUrdu: boolean) {
  if (!value) return '-';
  if (!isUrdu) return value;

  const exact = exactUrduMap[value.trim()];
  if (exact) return exact;

  return replaceWordByWord(value);
}

export function localizeApiUnit(unit: string | undefined | null, isUrdu: boolean) {
  if (!unit) return '-';
  if (!isUrdu) return unit;

  const lower = unit.toLowerCase();
  if (lower === 'kg') return 'کلو';
  if (lower === 'piece') return 'پیس';
  if (lower === 'bag') return 'بیگ';
  if (lower === 'bundle') return 'بنڈل';
  return unit;
}
