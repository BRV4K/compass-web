import { Link, Navigate, useParams } from 'react-router-dom'
import { useCatalog } from '../components/CatalogProvider'
import { ModelCanvas } from '../components/ModelCanvas'
import { stations } from '../lib/stations'

export function ModelPage() {
  const { stationId = '', modelId = '' } = useParams()
  const { sections } = useCatalog()
  const station = stations.find((candidate) => candidate.id === stationId)
  const model = sections.flatMap((section) => section.models).find((candidate) => candidate.id === modelId)

  if (!model || !station || station.status !== 'ready') {
    return <Navigate to="/catalog" replace />
  }

  const section = sections.find((candidate) => candidate.id === model.sectionId)

  return (
    <section className="page page--model">
      <div className="page-header">
        <div>
          <span className="eyebrow">Карточка модели</span>
          <h1>{model.name}</h1>
          <p className="page-copy">
            {station.name} · {section?.name ?? 'Раздел каталога'}
          </p>
        </div>
        <Link
          to={section ? `/catalog/stations/${station.id}/sections/${section.id}` : `/catalog/stations/${station.id}`}
          className="ghost-button ghost-button--link"
        >
          Назад к разделу
        </Link>
      </div>

      <div className="model-layout">
        <ModelCanvas model={model} primitive={model.primitive} />

        <aside className="spec-panel">
          <div className="spec-panel__section">
            <span className="eyebrow">Характеристики</span>
            <ul className="spec-list">
              <li>
                <span>Длина</span>
                <strong>{model.lengthMm} мм</strong>
              </li>
              <li>
                <span>Ширина</span>
                <strong>{model.widthMm} мм</strong>
              </li>
              <li>
                <span>Высота</span>
                <strong>{model.heightMm} мм</strong>
              </li>
              <li>
                <span>Вес</span>
                <strong>{model.weightKg} кг</strong>
              </li>
              <li>
                <span>Рекомендуемый ящик</span>
                <strong>{model.recommendedBox}</strong>
              </li>
              <li>
                <span>Описание</span>
                <strong>{model.description || 'Не указано'}</strong>
              </li>
            </ul>
          </div>

          <a href={model.modelPath} className="primary-button" download>
            Скачать модель
          </a>
        </aside>
      </div>
    </section>
  )
}
