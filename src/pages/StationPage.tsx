import { Link, Navigate, useParams } from 'react-router-dom'
import { useCatalog } from '../components/CatalogProvider'
import { stations } from '../lib/stations'

export function StationPage() {
  const { stationId = '' } = useParams()
  const { sections, isLoading } = useCatalog()
  const station = stations.find((candidate) => candidate.id === stationId)

  if (!station) {
    return <Navigate to="/catalog" replace />
  }

  if (station.status === 'draft') {
    return (
      <section className="page">
        <div className="hero-card hero-card--draft">
          <span className="eyebrow">Станция</span>
          <h1>{station.name}</h1>
          <p>Данная страница находится в доработке.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Станция</span>
          <h1>{station.name}</h1>
          <p className="page-copy">Выберите нужный раздел станции для перехода к списку моделей.</p>
        </div>
        <Link to="/catalog" className="ghost-button ghost-button--link">
          Назад к станциям
        </Link>
      </div>

      {isLoading ? <div className="empty-state">Загрузка разделов...</div> : null}

      {!isLoading ? (
        <div className="items-list">
          {sections.map((section) => (
            <Link
              key={section.id}
              to={`/catalog/stations/${station.id}/sections/${section.id}`}
              className="item-row"
            >
              <div>
                <h2>{section.name}</h2>
                <p>{section.models.length} моделей в разделе.</p>
              </div>
              <div className="item-row__meta">
                <span>Открыть</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}
