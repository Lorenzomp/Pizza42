import pizzasRaw from '../data/pizzas.json';
import { addToCart } from '../cart/storage';
import { formatPriceEUR } from '../format';
import type { Pizza } from '../types';

const pizzas = pizzasRaw as Pizza[];

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="hero-title">Vos pizzas préférées, en livraison</h1>
            <p className="hero-subtitle">
              Chaudes, rapides, et préparées avec des ingrédients sélectionnés.
            </p>
          </div>
          <div className="hero-banner" aria-hidden />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Nos pizzas</h2>
          <p className="section-subtitle">
            Ajoutez au panier en un clic.
          </p>
        </div>

        <div className="pizza-grid">
          {pizzas.map((pizza) => (
            <article key={pizza.id} className="pizza-card">
              <div className="pizza-media">
                <img
                  src={pizza.image}
                  alt={pizza.name}
                  className="pizza-image"
                  loading="lazy"
                />
              </div>

              <div className="pizza-body">
                <div className="pizza-top">
                  <h3 className="pizza-name">{pizza.name}</h3>
                  <div className="pizza-price">
                    {formatPriceEUR(pizza.priceCents)}
                  </div>
                </div>

                <p className="pizza-desc">{pizza.description}</p>

                <div className="pizza-tags">
                  {pizza.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pizza-actions">
                  <button
                    type="button"
                    className="button primary"
                    onClick={() =>
                      addToCart({
                        id: pizza.id,
                        name: pizza.name,
                        priceCents: pizza.priceCents,
                        image: pizza.image,
                      })
                    }
                  >
                    Ajouter au panier
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

