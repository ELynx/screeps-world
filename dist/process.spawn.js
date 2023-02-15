'use strict'

const bootstrap = require('./bootstrap')

const bodywork = require('./routine.bodywork')
const queue = require('./routine.spawn')

const Process = require('./process.template')

// STRATEGY how many room creeps
const spawnProcess = new Process('spawn')

spawnProcess.makeKey = function (room, type) {
  return type + '_' + room.name
}

spawnProcess._addToQueue = function (room, type, memoryAddon, n, adderFunction) {
  const key = this.makeKey(room, type)

  const memory =
    {
      crum: room.name,
      ctrl: bootstrap.NO_CONTROL,
      dest: bootstrap.NO_DESTINATION,
      dact: bootstrap.NO_ACT_RANGE,
      xtra: bootstrap.NO_EXTRA,
      btyp: type
    }
  _.assign(memory, memoryAddon)

  adderFunction(
    key, // id in queue
    type, // body function
    key, // name prefix
    memory, // memory
    room.name, // from
    room.name, // to
    n // how much to add
  )
}

spawnProcess.addToQueue = function (room, type, memory, n, priority) {
  if (n <= 0) return

  if (priority === 'urgent') {
    this._addToQueue(room, type, memory, n, _.bind(queue.addUrgent, queue))
  } else if (priority === 'normal') {
    this._addToQueue(room, type, memory, n, _.bind(queue.addNormal, queue))
  } else if (priority === 'lowkey') {
    this._addToQueue(room, type, memory, n, _.bind(queue.addLowkey, queue))
  }
}

spawnProcess._hasAndPlanned = function (room, live, type) {
  const has = live[type] || 0
  const planned = queue.count(this.makeKey(room, type))

  return has + planned
}

spawnProcess.restockers = function (room, live) {
  const workInRestocker = _.countBy(bodywork.restocker(room.memory.elvl))[WORK] || 0
  if (workInRestocker <= 0) {
    return
  }

  const workNeeded = room.sourceCapacityAvailable() / ENERGY_REGEN_TIME / HARVEST_POWER
  const restockersNeeded = Math.ceil(workNeeded / workInRestocker)

  const restockersSupported = room.memory.slvl

  const want = Math.min(restockersNeeded, restockersSupported)

  if (want > 0) {
    const now = this._hasAndPlanned(room, live, 'restocker')
    this.addToQueue(
      room,
      'restocker',
      {
        rstk: true
      },
      want - now,
      'lowkey'
    )
  }
}

spawnProcess.miners = function (room, live) {
  const want = room.memory.mlvl

  if (want > 0) {
    const now = this._hasAndPlanned(room, live, 'miner')
    this.addToQueue(
      room,
      'miner',
      {
        minr: true,
        rstk: true
      },
      want - now,
      'lowkey'
    )
  }
}

spawnProcess.workers = function (room, live, limit = undefined) {
  const addWorker = _.bind(
    function (n, priority) {
      this.addToQueue(
        room,
        'worker',
        { },
        n,
        priority
      )
    },
    this
  )

  const nowWorkers = this._hasAndPlanned(room, live, 'worker')

  if (nowWorkers === 0 && limit === undefined) {
    addWorker(1, 'urgent')
    addWorker(1, 'normal')

    return
  }

  let standalone = 0
  let supportedByRestockers = 0

  const restockers = this._hasAndPlanned(room, live, 'restocker')
  if (restockers === 0) {
    const workInRestocker = _.countBy(bodywork.restocker(room.memory.elvl))[WORK] || 0
    if (workInRestocker > 0) {
      const workInWorker = _.countBy(bodywork.worker(room.memory.elvl))[WORK] || 0
      if (workInWorker > 0) {
        // TODO check this assumption
        // each harvest makes 2 energy, each work consumes 1
        supportedByRestockers = Math.round(HARVEST_POWER * workInRestocker / workInWorker)
      }
    }
  }

  if (supportedByRestockers <= 0) {
    standalone = room.memory.hlvl
  }

  const wantWorkers = Math.max(standalone, supportedByRestockers)

  const wantWorkersMin = limit ? 0 : 2
  const wantWorkersMax = limit || 12
  const want = Math.max(wantWorkersMin, Math.min(wantWorkers, wantWorkersMax))

  addWorker(want - nowWorkers, 'lowkey')
}

spawnProcess.my = function (room, live) {
  this.restockers(room, live)
  this.miners(room, live)
  this.workers(room, live)
}

spawnProcess.ally = function (room, live) {
  // TODO they are crowd
  this.workers(room, live)
}

spawnProcess.neutral = function (room, live) {
  // TODO they are crowd
  this.workers(room, live)
}

spawnProcess.hostile = function (room, live) {
}

spawnProcess.unowned = function (room, live) {
  this.workers(room, live, 2)
  this.restockers(room, live)
}

spawnProcess.work = function (room) {
  this.debugHeader(room)

  const live = _.countBy(room.getRoomControlledCreeps(), 'memory.btyp')

  if (room.my) this.my(room, live)
  else if (room.ally) this.ally(room, live)
  else if (room.neutral) this.neutral(room, live)
  else if (room.hostile) this.hostile(room, live)
  else if (room.unowned) this.unowned(room, live)
}

spawnProcess._registerBodyFunction = function (routineId) {
  const routine = bodywork[routineId]
  const bound = _.bind(routine, bodywork)
  const wrapped = function (spawn) {
    return bound(spawn.room.memory.elvl)
  }

  queue.registerBodyFunction(routineId, wrapped)
}

spawnProcess.registerBodyFunctions = function () {
  this._registerBodyFunction('worker')
  this._registerBodyFunction('restocker')
  this._registerBodyFunction('miner')
}

spawnProcess.register = function () {
  this._register()
  this.registerBodyFunctions()
}

spawnProcess.register()

module.exports = spawnProcess
