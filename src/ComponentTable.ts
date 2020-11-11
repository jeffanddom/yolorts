import { EntityId } from '~/entities/EntityId'
import { Immutable } from '~/util/Immutable'
import { SortedMap } from '~/util/SortedMap'

export class ComponentTable<T> {
  private contents: SortedMap<EntityId, T>
  private uncommittedAdds: Set<EntityId>
  private snapshot: SortedMap<EntityId, T>
  private clone: (component: Immutable<T>) => T

  constructor(clone: (component: Immutable<T>) => T) {
    this.contents = new SortedMap()
    this.snapshot = new SortedMap()
    this.uncommittedAdds = new Set()
    this.clone = clone
  }

  add(id: EntityId, component: T): void {
    this.contents.set(id, component)
    this.uncommittedAdds.add(id)
  }

  delete(id: EntityId): boolean {
    if (!this.contents.has(id)) {
      return false
    }

    this.takeSnapshot(id)
    return this.contents.delete(id)
  }

  has(id: EntityId): boolean {
    return this.contents.has(id)
  }

  update(id: EntityId, vals: Partial<T>): void {
    const c = this.contents.get(id)
    if (c === undefined) {
      throw new Error(`table does not contain component for ID ${id}`)
    }

    if (!this.snapshot.has(id)) {
      this.snapshot.set(id, this.clone(c))
    }

    Object.assign(c, vals)
  }

  get(id: EntityId): Immutable<T> | undefined {
    return this.contents.get(id)
  }

  *[Symbol.iterator](): Iterator<[EntityId, Immutable<T>]> {
    for (const item of this.contents) {
      yield item
    }
  }

  rollback(): void {
    for (const [id, component] of this.snapshot) {
      this.contents.set(id, component)
    }

    for (const id of this.uncommittedAdds) {
      this.contents.delete(id)
    }

    this.snapshot = new SortedMap()
    this.uncommittedAdds = new Set()
  }

  commit(): void {
    this.snapshot = new SortedMap()
    this.uncommittedAdds = new Set()
  }

  private takeSnapshot(id: EntityId): void {
    if (this.snapshot.has(id)) {
      return
    }

    // Optimization: don't bother snapshotting IDs that are uncommitted, since
    // a rollback will remove them entirely.
    if (this.uncommittedAdds.has(id)) {
      return
    }

    this.snapshot.set(id, this.clone(this.contents.get(id)!))
  }
}