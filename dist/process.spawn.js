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

spawnProcess._eraseFromQueue = function (roomToName, type) {
  const key = this.makeKey(roomToName, type)
  queue.erase(key)
}

spawnProcess.addToQueue = function (roomToName, roomFromName, type, body, memory, n, priority) {
  if (n < 0) {
    this._eraseFromQueue(roomToName, type)
  }

  if (n <= 0) {
    return
  }

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

spawnProcess._canSpawn = function (room) {
  return room.extendedAvailableEnergyCapacity() > 0
}

spawnProcess._hasResourcesForOptional = function (room) {
  if (Game._war_) return false
  if (room._fight_) return false
  return true
}

spawnProcess.streloks = function (room, live) {
  const threat = room.memory.threat || 0
  const want = (threat <= bootstrap.ThreatLevelLow) ? 0 : threat

  const roomServiceFlag = Game.flags['strelok_' + room.name]
  const now = this._hasAndPlanned(room, live, 'strelok') + (roomServiceFlag ? roomServiceFlag.getValue() : 0)

  const selfHelp = this._canSpawn(room) && threat < bootstrap.ThreatLevelMedium

  this.addToQueue(
    room.name,
    selfHelp ? room.name : queue.FROM_CLOSEST_ROOM,
    'strelok',
    'strelok',
    {
      flag: 'strelok_x_' + room.name
    },
    want - now,
    'normal'
  )
}

spawnProcess.harvesters = function (room, live) {
  const want = room.memory.slvl || 0
  const now = this._hasAndPlanned(room, live, 'harvester')

  this.addToQueue(
    room.name,
    this._canSpawn(room) ? room.name : queue.FROM_CLOSEST_ROOM,
    'harvester',
    room._my_ ? 'harvester_my' : 'harvester_other',
    {
      hvst: true,
      blok: true
    },
    want - now,
    'normal'
  )
}

spawnProcess.miners = function (room, live) {
  const limit = room.memory.slvl || 0
  const want = this._canSpawn(room) && this._hasResourcesForOptional(room) ? (room.memory.mlvl || 0) : 0
  const now = this._hasAndPlanned(room, live, 'miner')

  this.addToQueue(
    room.name,
    room.name,
    'miner',
    'miner',
    {
      minr: true
    },
    Math.min(limit, want) - now,
    'lowkey'
  )
}

spawnProcess.upgraders = function (room, live) {
  const limit = room.memory.slvl || 0
  const want = this._canSpawn(room) && this._hasResourcesForOptional(room) ? (room.memory.ulvl || 0) : 0
  const now = this._hasAndPlanned(room, live, 'upgrader')

  this.addToQueue(
    room.name,
    room.name,
    'upgrader',
    'upgrader',
    {
      upgr: true,
      blok: true
    },
    Math.min(limit, want) - now,
    'lowkey'
  )
}

spawnProcess.workers_my = function (room, live) {
  const level = room.level()

  let limit
  if (room.memory.slvl) {
    const fromSources = room.memory.slvl || 0

    if (level < 3) {
      limit = fromSources * 3
    } else if (level < 7) {
      limit = fromSources * 2
    } else {
      limit = fromSources
    }
  } else {
    limit = 0
  }

  let want
  if (room.memory.wwww === undefined) {
    if (level < 3) {
      want = 4
    } else if (level < 7) {
      want = 2
    } else {
      want = 1
    }
  } else {
    want = room.memory.wwww || 0
  }

  const now = this._hasAndPlanned(room, live, 'worker')

  this.addToQueue(
    room.name,
    this._canSpawn(room) ? room.name : queue.FROM_CLOSEST_ROOM,
    'worker',
    'worker',
    { },
    Math.min(limit, want) - now,
    'normal'
  )
}

spawnProcess.workers_remote = function (room, live, limit) {
  const now = this._hasAndPlanned(room, live, 'worker')

  // demand until limit is reached
  const want = (now < limit) ? (now + 1) : limit

  this.addToQueue(
    room.name,
    queue.FROM_CLOSEST_ROOM,
    'worker',
    bodywork.worker(room),
    { },
    want - now,
    'normal'
  )
}

spawnProcess.plunders = function (room, live) {
  const want = this._hasAndPlanned(room, live, 'harvester')
  const now = this._hasAndPlanned(room, live, 'plunder')

  this.addToQueue(
    room.name,
    queue.FROM_CLOSEST_ROOM,
    'plunder',
    'plunder',
    {
      frum: room.name,
      flag: 'plunder_x_' + room.name
    },
    want - now,
    'lowkey'
  )
}

spawnProcess.my = function (room, live) {
  this.streloks(room, live)
  this.harvesters(room, live)
  this.miners(room, live)
  this.upgraders(room, live)
  this.workers_my(room, live)
}

spawnProcess.myReserved = function (room, live) {
  this.streloks(room, live)
  this.harvesters(room, live)
  this.plunders(room, live)
}

spawnProcess.sourceKeeper = function (_room, _live) {
  // nothing for sourceKeeper now
}

spawnProcess.unowned = function (room, live) {
  this.streloks(room, live)
  this.harvesters(room, live)
  this.plunders(room, live)
}

spawnProcess.ally = function (room, live) {
  this.workers_remote(room, live, 1)
}

spawnProcess.neutral = function (room, live) {
  this.workers_remote(room, live, 1)
}

spawnProcess.hostile = function (_room, _live) {
  // nothing for hostile now
}

spawnProcess.work = function (room) {
  const live = _.countBy(room.getViableRoomOwnedCreeps(), 'memory.btyp')

  // controller is `my`
  if (room._my_) this.my(room, live)
  // controller is own reserved
  else if (room.myReserved()) this.myReserved(room, live)
  // room is source keeper room
  else if (room.sourceKeeper()) this.sourceKeeper(room, live)
  // room has no controller / controller is not owned
  else if (room.unowned) this.unowned(room, live)
  // controller is ally or reserved by ally
  else if (room.ally) this.ally(room, live)
  // controller is neutral or reserved by neutral
  else if (room.neutral) this.neutral(room, live)
  // controller is hostile or reserved by hostile
  else if (room.hostile) this.hostile(room, live)
}

spawnProcess._registerBodyFunction = function (routineId) {
  const routine = bodywork[routineId]
  const bound = _.bind(routine, bodywork)

  queue.registerBodyFunction(routineId, bound)
}

spawnProcess.registerBodyFunctions = function () {
  this._registerBodyFunction('worker')
  this._registerBodyFunction('harvester_my')
  this._registerBodyFunction('harvester_other')
  this._registerBodyFunction('miner')
  this._registerBodyFunction('upgrader')
}

spawnProcess.register = function () {
  this._register()
  this.registerBodyFunctions()
}

spawnProcess.register()

module.exports = spawnProcess
