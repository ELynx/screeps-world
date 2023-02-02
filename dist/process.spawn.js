'use strict'

const bootstrap = require('bootstrap')

const bodywork = require('routine.bodywork')
const queue = require('routine.spawn')

const Process = require('process.template')

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
  const want = room.memory.slvl
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

spawnProcess.workers = function (room, live) {
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

  if (nowWorkers === 0) {
    addWorker(1, 'urgent')
    addWorker(1, 'normal')

    return
  }

  const freeHarvestSpots = Math.max(0, room.memory.hlvl - room.memory.slvl)

  let supportedByRestockers = 0
  if (room.memory.slvl > 0) {
    const workInRestocker = _.countBy(bodywork.restocker(room.memory.elvl))[WORK] || 0
    if (workInRestocker > 0) {
      const workInWorker = _.countBy(bodywork.worker(room.memory.elvl))[WORK] || 0
      if (workInWorker > 0) {
        supportedByRestockers = Math.round(room.memory.slvl * workInRestocker / workInWorker)
      }
    }
  }

  const wantWorkers = Math.max(freeHarvestSpots, supportedByRestockers)

  const wantWorkersMin = 2 // to survive energy balance
  const wantWorkersMax = 12 // to survive CPU
  const want = Math.max(wantWorkersMin, Math.min(wantWorkers, wantWorkersMax))

  addWorker(want - nowWorkers, 'lowkey')
}

spawnProcess.my = function (room, live) {
  this.restockers(room, live)
  this.miners(room, live)
  this.workers(room, live)
}

spawnProcess.ally = function (room, live) {
  this.workers(room, live)
}

spawnProcess.work = function (room) {
  this.debugHeader(room)

  const live = _.countBy(room.getRoomControlledCreeps(), 'memory.btyp')

  if (room.my()) this.my(room, live)
  else if (room.ally()) this.ally(room, live)
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
