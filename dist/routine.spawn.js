'use strict'

const spawn = {
  FROM_ANY_ROOM: 'ANY',
  FROM_CLOSEST_ROOM: 'CLOSEST',
  FROM_STRONGEST_ROOM: 'STRONGEST',

  bodyFunctions: new Map(),

  registerBodyFunction (id, bodyFunction) {
    this.bodyFunctions.set(id, bodyFunction)
  },

  getBodyFunction (id) {
    return this.bodyFunctions.get(id)
  },

  makeEmptyStructure () {
    const result = { urgent: [], normal: [], lowkey: [] }
    return result
  },

  noMemory () {
    return _.isUndefined(Memory.spawn_v1) || _.isEmpty(Memory.spawn_v1)
  },

  prepareMemory () {
    if (this.noMemory()) {
      const emptyStructure = this.makeEmptyStructure()

      console.log('Generating empty structure for spawn_v1')

      Memory.spawn_v1 = emptyStructure
    }
  },

  _add (target, id, body, name, memory, from, to, n) {
    const extra = this.__addExtra || 0

    for (let i = 0; i < n; ++i) {
      const model =
            {
              id,
              body,
              name: name + '_' + Game.time + '_' + (i + extra),
              memory,
              from,
              to,

              _time: Game.time
            }

      target.push(model)
    }

    this.__addExtra = extra + n
  },

  addUrgent (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.urgent, id, body, name, memory, from, to, n)
  },

  addNormal (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.normal, id, body, name, memory, from, to, n)
  },

  addLowkey (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.lowkey, id, body, name, memory, from, to, n)
  },

  _peek () {
    if (this.noMemory()) {
      return undefined
    }

    let postponed = Game.__spawnRoutine_spawnPostponeN || 0

    const ul = Memory.spawn_v1.urgent.length
    if (ul > postponed) {
      return _.extend({ }, Memory.spawn_v1.urgent[postponed], { priority: 'urgent' })
    }
    postponed -= ul

    const nl = Memory.spawn_v1.normal.length
    if (nl > postponed) {
      return _.extend({ }, Memory.spawn_v1.normal[postponed], { priority: 'normal' })
    }
    postponed -= nl

    if (Memory.spawn_v1.lowkey.length > postponed) {
      return _.extend({ }, Memory.spawn_v1.lowkey[postponed], { priority: 'lowkey' })
    }

    return undefined
  },

  peek () {
    return this._peek()
  },

  __get (target, index) {
    if (index === 0) return [target.shift(), target]

    const item = target[index]
    const without = target.splice(index, 1)

    return [item, without]
  },

  _get () {
    if (this.noMemory()) {
      return undefined
    }

    let postponed = Game.__spawnRoutine_spawnPostponeN || 0

    const ul = Memory.spawn_v1.urgent.length
    if (ul > postponed) {
      const [item, without] = this.__get(Memory.spawn_v1.urgent, postponed)
      Memory.spawn_v1.urgent = without
      return _.extend(item, { priority: 'urgent' })
    }
    postponed -= ul

    const nl = Memory.spawn_v1.normal.length
    if (nl > postponed) {
      const [item, without] = this.__get(Memory.spawn_v1.normal, postponed)
      Memory.spawn_v1.normal = without
      return _.extend(item, { priority: 'normal' })
    }
    postponed -= nl

    if (Memory.spawn_v1.lowkey.length > postponed) {
      const [item, without] = this.__get(Memory.spawn_v1.lowkey, postponed)
      Memory.spawn_v1.lowkey = without
      return _.extend(item, { priority: 'lowkey' })
    }

    return undefined
  },

  get () {
    return this._get()
  },

  __count (target, id) {
    let withId = 0
    for (const stored of target) {
      if (stored.id === id) {
        ++withId
      }
    }

    return withId
  },

  _count (id) {
    if (this.noMemory()) {
      return 0
    }

    let total = 0
    total += this.__count(Memory.spawn_v1.urgent, id)
    total += this.__count(Memory.spawn_v1.normal, id)
    total += this.__count(Memory.spawn_v1.lowkey, id)

    return total
  },

  count (id) {
    return this._count(id)
  },

  _erase (id) {
    if (this.noMemory()) {
      return
    }

    const filter = function (stored) {
      return stored.id !== id
    }

    Memory.spawn_v1.urgent = _.filter(Memory.spawn_v1.urgent, filter)
    Memory.spawn_v1.normal = _.filter(Memory.spawn_v1.normal, filter)
    Memory.spawn_v1.lowkey = _.filter(Memory.spawn_v1.lowkey, filter)
  },

  erase (id) {
    this._erase(id)
  },

  _postpone () {
    if (this.noMemory()) {
      return false
    }

    if (Game.__spawnRoutine_spawnPostponeN === undefined) {
      Game.__spawnRoutine_spawnPostponeN = 0
    }

    // STRATEGY how many shuffles in queue are allowed
    const allowed = Math.ceil(
      Math.max(
        Memory.spawn_v1.urgent.length,
        Memory.spawn_v1.normal.length,
        Memory.spawn_v1.lowkey.length
      ) / 2
    )

    // check edge case
    if (allowed === 1) {
      // this means max length is 1 or 2
      // check if there is some place to shuffle
      if (Memory.spawn_v1.urgent.length + Memory.spawn_v1.normal.length + Memory.spawn_v1.lowkey.length <= allowed) {
        return false
      }
    }

    // increase counter to be reflected on getters
    Game.__spawnRoutine_spawnPostponeN = Game.__spawnRoutine_spawnPostponeN + 1

    // allow next getter to happen
    return true
  },

  postpone () {
    return this._postpone()
  }
}

module.exports = spawn
