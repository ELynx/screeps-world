'use strict'

const spawn = {
  FROM_ANY_ROOM: 'ANY',
  FROM_CLOSEST_ROOM: 'CLOSEST',
  FROM_STRONGEST_ROOM: 'STRONGEST',

  bodyFunctions: { },

  registerBodyFunction: function (id, bodyFunction) {
    this.bodyFunctions[id] = bodyFunction
  },

  getBodyFunction: function (id) {
    return this.bodyFunctions[id]
  },

  makeEmptyStructure: function () {
    const result = { urgent: [], normal: [], lowkey: [] }
    return result
  },

  noMemory: function () {
    return _.isUndefined(Memory.spawn_v1) || _.isEmpty(Memory.spawn_v1)
  },

  prepareMemory: function () {
    if (this.noMemory()) {
      const emptyStructure = this.makeEmptyStructure()

      console.log('Generating empty structure for spawn_v1')

      Memory.spawn_v1 = emptyStructure
    }
  },

  _add: function (target, id, body, name, memory, from, to, n) {
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

  addUrgent: function (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.urgent, id, body, name, memory, from, to, n)
  },

  addNormal: function (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.normal, id, body, name, memory, from, to, n)
  },

  addLowkey: function (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add(Memory.spawn_v1.lowkey, id, body, name, memory, from, to, n)
  },

  _peek: function () {
    if (this.noMemory()) {
      return undefined
    }

    if (Memory.spawn_v1.urgent.length > 0) {
      return _.extend({ }, Memory.spawn_v1.urgent[0], { priority: 'urgent' })
    }

    if (Memory.spawn_v1.normal.length > 0) {
      return _.extend({ }, Memory.spawn_v1.normal[0], { priority: 'normal' })
    }

    if (Memory.spawn_v1.lowkey.length > 0) {
      return _.extend({ }, Memory.spawn_v1.lowkey[0], { priority: 'lowkey' })
    }

    return undefined
  },

  peek: function () {
    return this._peek()
  },

  _get: function () {
    if (this.noMemory()) {
      return undefined
    }

    if (Memory.spawn_v1.urgent.length > 0) {
      return _.extend(Memory.spawn_v1.urgent.shift(), { priority: 'urgent' })
    }

    if (Memory.spawn_v1.normal.length > 0) {
      return _.extend(Memory.spawn_v1.normal.shift(), { priority: 'normal' })
    }

    if (Memory.spawn_v1.lowkey.length > 0) {
      return _.extend(Memory.spawn_v1.lowkey.shift(), { priority: 'lowkey' })
    }

    return undefined
  },

  get: function () {
    return this._get()
  },

  __count: function (target, id) {
    let withId = 0
    for (const stored of target) {
      if (stored.id === id) {
        ++withId
      }
    }

    return withId
  },

  _count: function (id) {
    if (this.noMemory()) {
      return 0
    }

    let total = 0
    total += this.__count(Memory.spawn_v1.urgent, id)
    total += this.__count(Memory.spawn_v1.normal, id)
    total += this.__count(Memory.spawn_v1.lowkey, id)

    return total
  },

  count: function (id) {
    return this._count(id)
  },

  _erase: function (id) {
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

  erase: function (id) {
    this._erase(id)
  },

  // internals of this function should not be used
  __postpone: function (target) {
    if (Game.__spawnRoutine_spawnPostponeN === undefined) {
      // STRATEGY how many shuffles in queue are allowed
      Game.__spawnRoutine_spawnPostponeN = Math.floor(target.length / 2)
    }

    // denied
    if (Game.__spawnRoutine_spawnPostponeN === 0) {
      return false
    }

    Game.__spawnRoutine_spawnPostponeN = Game.__spawnRoutine_spawnPostponeN - 1

    const taken = target.shift()
    target.push(taken)

    return true
  },

  _postpone: function () {
    if (this.noMemory()) {
      return false
    }

    // logic
    // if priority list is empty, skip it
    // if has one element, sorry, no postpone
    // if more than one, postpone within single priority

    const lu = Memory.spawn_v1.urgent.length
    if (lu === 1) return false
    if (lu > 1) return this.__postpone(Memory.spawn_v1.urgent)

    const ln = Memory.spawn_v1.normal.length
    if (ln === 1) return false
    if (ln > 1) return this.__postpone(Memory.spawn_v1.normal)

    const ll = Memory.spawn_v1.lowkey.length
    if (ll > 1) return this.__postpone(Memory.spawn_v1.lowkey)

    return false
  },

  postpone: function () {
    return this._postpone()
  }
}

module.exports = spawn
