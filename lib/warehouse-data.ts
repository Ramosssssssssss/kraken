export type DrawerSize = "pequeña" | "mediana" | "grande" | "xg"

export const DRAWER_CAPACITIES: Record<DrawerSize, number> = {
  pequeña: 22,
  mediana: 15,
  grande: 11,
  xg: 6,
}

export interface Drawer {
  size: DrawerSize
  rows: number
  capacity: number
}

export interface RackLevel {
  levelNumber: number
  drawers: Drawer[]
}

export interface InventoryItem {
  code: string
  name: string
  category: string
  quantity: number
  minStock: number
  maxStock: number
  warehouse: string
  rack: string
  shelf: number
  zone: string
}

export interface Rack {
  id: string
  label: string
  zone: string
  occupancy: number
  inventory: Array<{ code: string; shelf: number }>
  levels?: RackLevel[]
}

export interface Zone {
  name: string
  color: string
}

export interface Warehouse {
  id: string
  name: string
  layout: {
    rows: number
    cols: number
  }
  zones: Zone[]
  racks: Rack[]
  totalCapacity: number
  currentOccupancy: number
}

// Mock data
export const WAREHOUSES: Warehouse[] = [
  {
    id: "b1",
    name: "Bodega 1",
    layout: { rows: 8, cols: 16 },
    zones: [
      { name: "General", color: "blue" },
      { name: "Zona A", color: "green" },
      { name: "Zona B", color: "yellow" },
    ],
    racks: Array.from({ length: 128 }, (_, i) => ({
      id: `b1-r${i + 1}`,
      label: `A${i + 1}`,
      zone: i < 40 ? "Zona A" : i < 80 ? "Zona B" : "General",
      occupancy: Math.random() > 0.3 ? Math.random() * 100 : 0,
      inventory: Math.random() > 0.3 ? [{ code: `ITEM-${i + 1}`, shelf: 1 }] : [],
    })),
    totalCapacity: 10000,
    currentOccupancy: 6500,
  },
  {
    id: "b2",
    name: "Bodega 2",
    layout: { rows: 6, cols: 12 },
    zones: [
      { name: "General", color: "blue" },
      { name: "Zona C", color: "purple" },
    ],
    racks: Array.from({ length: 72 }, (_, i) => ({
      id: `b2-r${i + 1}`,
      label: i < 36 ? "B" + (i + 1) : "C" + (i - 35),
      zone: i < 36 ? "Zona C" : "General",
      occupancy: Math.random() > 0.5 ? Math.random() * 100 : 0,
      inventory: Math.random() > 0.5 ? [{ code: `ITEM-B${i + 1}`, shelf: 1 }] : [],
    })),
    totalCapacity: 7200,
    currentOccupancy: 3600,
  },
]

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    code: "ITEM-1",
    name: "Tornillo M8",
    category: "Ferretería",
    quantity: 150,
    minStock: 50,
    maxStock: 200,
    warehouse: "b1",
    rack: "A1",
    shelf: 1,
    zone: "Zona A",
  },
  {
    code: "ITEM-5",
    name: "Tuerca M8",
    category: "Ferretería",
    quantity: 30,
    minStock: 50,
    maxStock: 200,
    warehouse: "b1",
    rack: "A5",
    shelf: 2,
    zone: "Zona A",
  },
]

export function addWarehouse(config: {
  name: string
  rows: number
  cols: number
  firstRackLocation: string
  useConsecutive: boolean
}) {
  const newWarehouse: Warehouse = {
    id: `w${WAREHOUSES.length + 1}`,
    name: config.name,
    layout: { rows: config.rows, cols: config.cols },
    zones: [{ name: "General", color: "blue" }],
    racks: Array.from({ length: config.rows * config.cols }, (_, i) => ({
      id: `w${WAREHOUSES.length + 1}-r${i + 1}`,
      label: config.useConsecutive
        ? `${config.firstRackLocation.replace(/\d+$/, "")}${Number.parseInt(config.firstRackLocation.match(/\d+$/)?.[0] || "1") + i}`
        : `R${i + 1}`,
      zone: "General",
      occupancy: 0,
      inventory: [],
    })),
    totalCapacity: config.rows * config.cols * 100,
    currentOccupancy: 0,
  }

  WAREHOUSES.push(newWarehouse)
  return newWarehouse
}

export function configureRackStructure(warehouseId: string, rackId: string, levels: RackLevel[]): boolean {
  const warehouse = WAREHOUSES.find((w) => w.id === warehouseId)
  if (!warehouse) return false

  const rack = warehouse.racks.find((r) => r.id === rackId)
  if (!rack) return false

  rack.levels = levels
  return true
}

export function addRowToWarehouse(warehouseId: string): boolean {
  const warehouse = WAREHOUSES.find((w) => w.id === warehouseId)
  if (!warehouse) return false

  const currentRows = warehouse.layout.rows
  const cols = warehouse.layout.cols
  const newRowNumber = currentRows + 1

  // Create new racks for the new row
  const newRacks: Rack[] = Array.from({ length: cols }, (_, i) => {
    const rackNumber = warehouse.racks.length + i + 1
    return {
      id: `${warehouseId}-r${rackNumber}`,
      label: `A${rackNumber}`,
      zone: "General",
      occupancy: 0,
      inventory: [],
    }
  })

  warehouse.racks.push(...newRacks)
  warehouse.layout.rows = newRowNumber
  warehouse.totalCapacity += cols * 100

  return true
}

export function addColumnToWarehouse(warehouseId: string): boolean {
  const warehouse = WAREHOUSES.find((w) => w.id === warehouseId)
  if (!warehouse) return false

  const rows = warehouse.layout.rows
  const currentCols = warehouse.layout.cols
  const newColNumber = currentCols + 1

  // Reorganize racks to insert new column at the end
  const newRacks: Rack[] = []

  for (let row = 0; row < rows; row++) {
    // Add existing racks from this row
    for (let col = 0; col < currentCols; col++) {
      const existingRack = warehouse.racks[row * currentCols + col]
      newRacks.push(existingRack)
    }

    // Add new rack at the end of this row
    const rackNumber = warehouse.racks.length + row + 1
    newRacks.push({
      id: `${warehouseId}-r${rackNumber}`,
      label: `A${rackNumber}`,
      zone: "General",
      occupancy: 0,
      inventory: [],
    })
  }

  warehouse.racks = newRacks
  warehouse.layout.cols = newColNumber
  warehouse.totalCapacity += rows * 100

  return true
}
