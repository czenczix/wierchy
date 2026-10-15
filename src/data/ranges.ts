import type { Range } from '../types'

// Lista pasm. Kolejne góry dopisujemy tutaj; "group" to większa całość (Tatry, Karpaty, Sudety...).
export const ranges: Range[] = [
  { id: 'tatry-wysokie', name: 'Tatry Wysokie', group: 'Tatry' },
  { id: 'tatry-zachodnie', name: 'Tatry Zachodnie', group: 'Tatry' },
  // Karpaty poza Tatrami
  { id: 'beskid-zywiecki', name: 'Beskid Żywiecki', group: 'Karpaty' },
  { id: 'beskid-slaski', name: 'Beskid Śląski', group: 'Karpaty' },
  { id: 'beskid-maly', name: 'Beskid Mały', group: 'Karpaty' },
  { id: 'beskid-makowski', name: 'Beskid Makowski', group: 'Karpaty' },
  { id: 'beskid-wyspowy', name: 'Beskid Wyspowy', group: 'Karpaty' },
  { id: 'gorce', name: 'Gorce', group: 'Karpaty' },
  { id: 'beskid-sadecki', name: 'Beskid Sądecki', group: 'Karpaty' },
  { id: 'pieniny', name: 'Pieniny', group: 'Karpaty' },
  { id: 'beskid-niski', name: 'Beskid Niski', group: 'Karpaty' },
  { id: 'bieszczady', name: 'Bieszczady', group: 'Karpaty' },
  { id: 'gory-sanocko-turczanskie', name: 'Góry Sanocko-Turczańskie', group: 'Karpaty' },
  // Sudety
  { id: 'karkonosze', name: 'Karkonosze', group: 'Sudety' },
  { id: 'gory-izerskie', name: 'Góry Izerskie', group: 'Sudety' },
  { id: 'rudawy-janowickie', name: 'Rudawy Janowickie', group: 'Sudety' },
  { id: 'gory-kaczawskie', name: 'Góry Kaczawskie', group: 'Sudety' },
  { id: 'gory-kamienne', name: 'Góry Kamienne', group: 'Sudety' },
  { id: 'gory-walbrzyskie', name: 'Góry Wałbrzyskie', group: 'Sudety' },
  { id: 'gory-sowie', name: 'Góry Sowie', group: 'Sudety' },
  { id: 'gory-jastrzebie', name: 'Góry Jastrzębie', group: 'Sudety' },
  { id: 'gory-stolowe', name: 'Góry Stołowe', group: 'Sudety' },
  { id: 'gory-orlickie', name: 'Góry Orlickie', group: 'Sudety' },
  { id: 'gory-bystrzyckie', name: 'Góry Bystrzyckie', group: 'Sudety' },
  { id: 'gory-bardzkie', name: 'Góry Bardzkie', group: 'Sudety' },
  { id: 'masyw-snieznika', name: 'Masyw Śnieżnika', group: 'Sudety' },
  { id: 'gory-bialskie', name: 'Góry Bialskie', group: 'Sudety' },
  { id: 'gory-zlote', name: 'Góry Złote', group: 'Sudety' },
  { id: 'gory-opawskie', name: 'Góry Opawskie', group: 'Sudety' },
  { id: 'masyw-slezy', name: 'Masyw Ślęży', group: 'Sudety' }, // formalnie Przedgórze Sudeckie
  // Inne
  { id: 'gory-swietokrzyskie', name: 'Góry Świętokrzyskie', group: 'Góry Świętokrzyskie' },
]

export function getRange(id: string): Range | undefined {
  return ranges.find((r) => r.id === id)
}

/** Do której większej całości należy punkt (Tatry, Karpaty...). */
export const groupOf = (rangeId: string) => getRange(rangeId)?.group ?? ''
