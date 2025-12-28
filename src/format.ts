export function formatPriceEUR(priceCents: number) {
  const euros = priceCents / 100;
  return euros.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

