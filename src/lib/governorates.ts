/** Stable Syrian governorate codes for Service Centers (Phase 3). */
export const GOVERNORATES = [
  { label: 'دمشق', value: 'damascus' },
  { label: 'ريف دمشق', value: 'rif_dimashq' },
  { label: 'حلب', value: 'aleppo' },
  { label: 'حمص', value: 'homs' },
  { label: 'حماة', value: 'hama' },
  { label: 'اللاذقية', value: 'latakia' },
  { label: 'طرطوس', value: 'tartus' },
  { label: 'إدلب', value: 'idlib' },
  { label: 'دير الزور', value: 'deir_ez_zor' },
  { label: 'الحسكة', value: 'al_hasakah' },
  { label: 'الرقة', value: 'al_raqqah' },
  { label: 'درعا', value: 'daraa' },
  { label: 'السويداء', value: 'as_suwayda' },
  { label: 'القنيطرة', value: 'quneitra' },
] as const

export type GovernorateValue = (typeof GOVERNORATES)[number]['value']
