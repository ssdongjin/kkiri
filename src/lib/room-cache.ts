import Dexie, { Table } from "dexie";
import { MealRoom } from "../types";

interface CachedRoom { id: string; room: MealRoom; cachedAt: string; }

class KkiriCache extends Dexie {
  rooms!: Table<CachedRoom, string>;
  constructor() { super("kkiri-offline-cache"); this.version(1).stores({ rooms: "id, cachedAt" }); }
}

const cache = new KkiriCache();

// IndexedDB is deliberately only a read-only offline snapshot, never a vote source of truth.
export async function cacheLastRoom(room: MealRoom) { await cache.rooms.put({ id: room.id, room, cachedAt: new Date().toISOString() }); }
export async function getCachedRoom(id: string) { return (await cache.rooms.get(id))?.room ?? null; }
