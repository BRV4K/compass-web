export const stations = [
  {
    id: '1rl131r',
    name: '1РЛ131Р',
    status: 'ready',
    description: 'Основная станция с каталогом деталей и STL-моделей для просмотра.',
  },
  {
    id: '55zh6ut',
    name: '55Ж6УТ',
    status: 'draft',
    description: 'Раздел будет заполнен после передачи моделей и документации.',
  },
  {
    id: '55zh6t',
    name: '55Ж6Т',
    status: 'draft',
    description: 'Раздел будет заполнен после передачи моделей и документации.',
  },
] as const

export type StationId = (typeof stations)[number]['id']
