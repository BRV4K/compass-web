import { Link } from 'react-router-dom'
import { stations } from '../lib/stations'

export function CatalogPage() {
  return (
    <section className="page">
      <div className="hero-card">
        <span className="eyebrow">Главная</span>
        <h1>Выбор радиолокационной станции</h1>
      </div>

      <div className="station-grid">
        {stations.map((station) => (
          <Link
            key={station.id}
            to={`/catalog/stations/${station.id}`}
            className={`station-card${station.status === 'draft' ? ' station-card--muted' : ' station-card--interactive'}`}
          >
            <span className="station-card__eyebrow">
              {station.status === 'ready' ? 'Доступна' : 'В разработке'}
            </span>
            <h2>{station.name}</h2>
            <p>{station.description}</p>
            {station.status === 'draft' ? (
              <div className="station-card__stats">
                <span>Доступно позже</span>
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
