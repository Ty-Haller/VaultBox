export type InventoryColumnKey =
  | 'name'
  | 'subName'
  | 'class'
  | 'category'
  | 'detail'
  | 'weight'
  | 'form'
  | 'storage'
  | 'vault'
  | 'purchase'
  | 'cost'
  | 'spot'
  | 'dealer'

export interface InventoryColumnDef {
  key: InventoryColumnKey
  label: string
  defaultVisible: boolean
  locked?: boolean
}

export const INVENTORY_COLUMN_DEFS: InventoryColumnDef[] = [
  { key: 'name', label: 'Item', defaultVisible: true, locked: true },
  { key: 'subName', label: 'Sub-name', defaultVisible: true },
  { key: 'class', label: 'Type', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'detail', label: 'Product / Token', defaultVisible: true },
  { key: 'weight', label: 'Qty / Oz', defaultVisible: true },
  { key: 'form', label: 'Form', defaultVisible: true },
  { key: 'storage', label: 'Storage', defaultVisible: false },
  { key: 'vault', label: 'Vault', defaultVisible: true },
  { key: 'purchase', label: 'Acquired', defaultVisible: true },
  { key: 'cost', label: 'Cost', defaultVisible: true },
  { key: 'spot', label: 'Value', defaultVisible: true },
  { key: 'dealer', label: 'Dealer', defaultVisible: true },
]

const STORAGE_KEY = 'vaultbox.inventory.visibleColumns'

export function defaultVisibleColumns(): InventoryColumnKey[] {
  return INVENTORY_COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.key)
}

export function loadVisibleColumns(): InventoryColumnKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultVisibleColumns()
    const parsed = JSON.parse(raw) as InventoryColumnKey[]
    const valid = new Set(INVENTORY_COLUMN_DEFS.map((c) => c.key))
    const cols = parsed.filter((k) => valid.has(k))
    if (!cols.includes('name')) cols.unshift('name')
    return cols.length > 0 ? cols : defaultVisibleColumns()
  } catch {
    return defaultVisibleColumns()
  }
}

export function saveVisibleColumns(columns: InventoryColumnKey[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
}