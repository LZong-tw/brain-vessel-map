export interface InventoryEntry { key: string; zh: string | null; file: string; line: number }
export function inventory(directory: string): InventoryEntry[];
