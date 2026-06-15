import { db } from './index'
import { worldviewAxes } from './schema'

const defaults = [
  { name: 'Agency vs. Surrender',       minLabel: 'agency',       maxLabel: 'surrender',    displayOrder: 0 },
  { name: 'Order vs. Emergence',        minLabel: 'order',        maxLabel: 'emergence',    displayOrder: 1 },
  { name: 'Precision vs. Mystery',      minLabel: 'precision',    maxLabel: 'mystery',      displayOrder: 2 },
  { name: 'Market Value vs. Moral Value', minLabel: 'market value', maxLabel: 'moral value', displayOrder: 3 },
  { name: 'Speed vs. Depth',            minLabel: 'speed',        maxLabel: 'depth',        displayOrder: 4 },
]

async function seed() {
  const existing = await db.select().from(worldviewAxes)
  if (existing.length === 0) {
    await db.insert(worldviewAxes).values(defaults)
    console.log('Seeded 5 default worldview axes')
  } else {
    console.log('Seed skipped — worldview_axes not empty')
  }
  process.exit(0)
}

seed()
