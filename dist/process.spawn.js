'use strict'

const bootstrap = require('./bootstrap')

const bodywork = require('./routine.bodywork')
const queue = require('./routine.spawn')

const Process = require('./process.template')

// STRATEGY how many room creeps
const spawnProcess = new Process('spawn')

spawnProcess.makeKey = function (roomName, type) {
  return type + '_' + roomName
}

spawnProcess._addToQueue = function (roomToName, roomFromName, type, body, memoryAddon, n, adderFunction) {
  const key = this.makeKey(roomToName, type)

  const memory =
    {
      crum: roomToName,
      ctrl: bootstrap.NO_CONTROL,
      dest: bootstrap.NO_DESTINATION,
      dact: bootstrap.NO_ACT_RANGE,
      xtra: bootstrap.NO_EXTRA,
      btyp: type
    }
  _.assign(memory, memoryAddon)

  adderFunction(
    key, // id in queue
    body, // body function or concrete formula
    key, // name prefix
    memory, // memory
    roomFromName, // from
    roomToName, // to
    n // how much to add
  )
}

spawnProcess.addToQueue = function (roomToName, roomFromName, type, body, memory, n, priority) {
  if (n <= 0) return

  if (priority === 'urgent') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addUrgent, queue))
  } else if (priority === 'normal') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addNormal, queue))
  } else if (priority === 'lowkey') {
    this._addToQueue(roomToName, roomFromName, type, body, memory, n, _.bind(queue.addLowkey, queue))
  }
}

spawnProcess._hasAndPlanned = function (room, live, type) {
  const has = live[type] || 0
  const planned = queue.count(this.makeKey(room.name, type))

  return has + planned
}

spawnProcess.restockers = function (room, live) {
  const restockerBody = bodywork.restocker(room)

  const workInRestocker = _.countBy(restockerBody)[WORK] || 0
  if (workInRestocker <= 0) {
    return
  }

  const sources = room.find(FIND_SOURCES).length
  if (sources === 0) {
    return
  }

  let restockersNeeded

  if (room.my) {
    const workNeededPerSource = room.sourceEnergyCapacity() / ENERGY_REGEN_TIME / HARVEST_POWER
    const restockersNeededPerSource = Math.ceil(workNeededPerSource / workInRestocker)

    restockersNeeded = sources * restockersNeededPerSource
  } else {
    restockersNeeded = sources
  }

  const restockersSupported = room.memory.slvl

  const want = Math.min(restockersNeeded, restockersSupported)

  if (want > 0) {
    const now = this._hasAndPlanned(room, live, 'restocker')
    this.addToQueue(
      room.name,
      room.my ? room.name : queue.FROM_CLOSEST_ROOM,
      'restocker',
      room.my ? 'restocker' : restockerBody,
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
      room.name,
      room.my ? room.name : queue.FROM_CLOSEST_ROOM,
      'miner',
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
    function (roomFromName, body, n, priority) {
      this.addToQueue(
        room.name,
        roomFromName,
        'worker',
        body,
        { },
        n,
        priority
      )
    },
    this
  )

  const nowWorkers = this._hasAndPlanned(room, live, 'worker')

  if (room.my && nowWorkers === 0) {
    addWorker(queue.FROM_CLOSEST_ROOM, 'worker', 1, 'urgent')
    addWorker(queue.FROM_CLOSEST_ROOM, 'worker', 1, 'normal')

    return
  }

  const workerBody = bodywork.worker(room)

  let wantWorkers

  if (room.my) {
    let standalone = 0
    let supportedByRestockers = 0

    const restockers = this._hasAndPlanned(room, live, 'restocker')
    if (restockers !== 0) {
      const workInRestocker = _.countBy(bodywork.restocker(room))[WORK] || 0
      if (workInRestocker > 0) {
        const workInWorker = _.countBy(workerBody)[WORK] || 0
        if (workInWorker > 0) {
          // STRATEGY harvest to spend ratio
          supportedByRestockers = restockers * Math.round(HARVEST_POWER * workInRestocker / workInWorker)
        }
      }
    }

    if (supportedByRestockers <= 0) {
      standalone = room.memory.hlvl
    }

    wantWorkers = Math.max(standalone, supportedByRestockers)
  } else {
    // demand until limit is reached
    wantWorkers = nowWorkers + 1
  }

  const wantWorkersMin = limit ? 0 : 2
  const wantWorkersMax = limit || 12
  const want = Math.max(wantWorkersMin, Math.min(wantWorkers, wantWorkersMax))

  addWorker(
    room.my ? room.name : queue.FROM_CLOSEST_ROOM,
    room.my ? 'worker' : workerBody,
    want - nowWorkers,
    'normal'
  )
}

spawnProcess.my = function (room, live) {
  this.restockers(room, live)
  this.miners(room, live)
  this.workers(room, live)
}

spawnProcess.ally = function (room, live) {
  this.workers(room, live, 1)
}

spawnProcess.neutral = function (room, live) {
  this.workers(room, live, 1)
}

spawnProcess.hostile = function (room, live) {
}

spawnProcess.sourceKeeper = function (room, live) {
}

spawnProcess.unowned = function (room, live) {
  this.workers(room, live, 2)
  this.restockers(room, live)
}

spawnProcess.work = function (room) {
  this.debugHeader(room)

  const live = _.countBy(room.getRoomControlledCreeps(), 'memory.btyp')

  // controller is my
  if (room.my) this.my(room, live)
  // controller is ally or reserved by ally
  else if (room.ally) this.ally(room, live)
  // controller is neutral or reserved by neutral
  else if (room.neutral) this.neutral(room, live)
  // controller is hostile or reserved by hostile
  else if (room.hostile) this.hostile(room, live)
  // room is source keeper room
  else if (room.sourceKeeper()) this.sourceKeeper(room, live)
  // room has no controller / controller is not owned / controller is not reserved above EXCLUDING my
  else if (room.unowned) this.unowned(room, live)
}

spawnProcess._registerBodyFunction = function (routineId) {
  const routine = bodywork[routineId]
  const bound = _.bind(routine, bodywork)

  queue.registerBodyFunction(routineId, bound)
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
