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
    const result = { queue: [] }
    return result
  },

  noMemory () {
    return _.isUndefined(Memory.spawn_v2) || _.isEmpty(Memory.spawn_v2)
  },

  prepareMemory () {
    if (this.noMemory()) {
      const emptyStructure = this.makeEmptyStructure()

      console.log('Generating empty structure for spawn_v2')

      Memory.spawn_v2 = emptyStructure
    }
  },

  _add (priority, id, body, name, memory, from, to, n) {
    const extra = this.__addExtra || 0

    for (let i = 0; i < n; ++i) {
      const model =
            {
              priority,
              id,
              body,
              name: name + '_' + Game.time + '_' + (i + extra),
              memory,
              from,
              to,

              _time: Game.time
            }

      switch (priority) {
        case 'urgent':
          Memory.spawn_v2.queue.unshift(model)
          break

        case 'normal':
          if (Memory.spawn_v2.queue.length < 2) {
            Memory.spawn_v2.queue.push(model)
          } else {
            Memory.spawn_v2.queue.splice(
              Math.floor(Memory.spawn_v2.queue.length / 2),
              0,
              model
            )
          }
          break

        case 'lowkey':
        default:
          Memory.spawn_v2.queue.push(model)
          break
      }
    }

    this.__addExtra = extra + n
  },

  addUrgent (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add('urgent', id, body, name, memory, from, to, n)
  },

  addNormal (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add('normal', id, body, name, memory, from, to, n)
  },

  addLowkey (id, body, name, memory, from, to, n = 1) {
    this.prepareMemory()
    this._add('lowkey', id, body, name, memory, from, to, n)
  },

  _peek () {
    if (this.noMemory()) {
      return undefined
    }

    if (Memory.spawn_v2.queue.length === 0) {
      return undefined
    }

    return _.extend({ }, Memory.spawn_v2.queue[0])
  },

  peek () {
    return this._peek()
  },

  _get () {
    if (this.noMemory()) {
      return undefined
    }

    if (Memory.spawn_v2.queue.length === 0) {
      return undefined
    }

    return Memory.spawn_v2.queue.shift()
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

    return this.__count(Memory.spawn_v2.queue, id)
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

    Memory.spawn_v2.queue = _.filter(Memory.spawn_v2.queue, filter)
  },

  erase (id) {
    this._erase(id)
  },

  __postpone () {
    const item = Memory.spawn_v2.queue.shift()
    Memory.spawn_v2.queue.push(item)
  },

  _postpone () {
    if (this.noMemory()) {
      return false
    }

    if (Memory.spawn_v2.length < 2) {
      return false
    }

    // STRATEGY how many postpones are allowed per tick
    const allowed = Math.floor(Memory.spawn_v2.length / 2)

    if (Game._routine_spawn_postpones === undefined) {
      Game._routine_spawn_postpones = 0
    }

    if (Game._routine_spawn_postpones >= allowed) {
      return false
    }

    Game._routine_spawn_postpones = Game._routine_spawn_postpones + 1

    this.__postpone()

    return true
  },

  postpone () {
    return this._postpone()
  }
}

module.exports = spawn
