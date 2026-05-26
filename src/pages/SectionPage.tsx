import { Link, Navigate, useParams } from 'react-router-dom'
import { useCatalog } from '../components/CatalogProvider'
import { stations } from '../lib/stations'

export function SectionPage() {
  const { stationId = '', sectionId = '' } = useParams()
  const { sections } = useCatalog()
  const station = stations.find((candidate) => candidate.id === stationId)
  const section = sections.find((candidate) => candidate.id === sectionId)

  if (!section || !station || station.status !== 'ready') {
    return <Navigate to="/catalog" replace />
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Раздел станции {station.name}</span>
          <h1>{section.name}</h1>
          <p className="page-copy">1 строка соответствует одной модели. Нажмите на нужную позицию для открытия карточки и 3D-просмотра.</p>
        </div>
        <div className="info-chip">
          <span>Моделей</span>
          <strong>{section.models.length}</strong>
        </div>
      </div>

      <div className="items-list">
        {section.models.map((model) => (
          <Link
            key={model.id}
            to={`/catalog/stations/${station.id}/models/${model.id}`}
            className="item-row"
          >
            <div>
              <h2>{model.name}</h2>
              <p>{model.description || 'Описание не указано.'}</p>
            </div>
            <div className="item-row__meta">
              <span>Открыть модель</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
