'use strict'

const Process = require('./process.template')

const autobuildProcess = new Process('autobuild')

const StructureTypeToIndex = {
  [STRUCTURE_WALL]: 0,
  [STRUCTURE_CONTAINER]: 1,
  [STRUCTURE_EXTENSION]: 2,
  [STRUCTURE_FACTORY]: 3,
  [STRUCTURE_LAB]: 4,
  [STRUCTURE_LINK]: 5,
  [STRUCTURE_NUKER]: 6,
  [STRUCTURE_OBSERVER]: 7,
  [STRUCTURE_POWER_SPAWN]: 8,
  [STRUCTURE_RAMPART]: 9,
  [STRUCTURE_ROAD]: 10,
  [STRUCTURE_SPAWN]: 11,
  [STRUCTURE_STORAGE]: 12,
  // there is nothing on index 13 aka 0b1101 because this lands into forbidden UTF-16
  [STRUCTURE_TERMINAL]: 14,
  [STRUCTURE_TOWER]: 15
}

const IndexToStructureType =
[
  STRUCTURE_WALL,
  STRUCTURE_CONTAINER,
  STRUCTURE_EXTENSION,
  STRUCTURE_FACTORY,
  STRUCTURE_LAB,
  STRUCTURE_LINK,
  STRUCTURE_NUKER,
  STRUCTURE_OBSERVER,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_RAMPART,
  STRUCTURE_ROAD,
  STRUCTURE_SPAWN,
  STRUCTURE_STORAGE,
  undefined, // there is nothing on index 13 aka 0b1101 because this lands into forbidden UTF-16
  STRUCTURE_TERMINAL,
  STRUCTURE_TOWER
]

Structure.prototype.takePhoto = function () {
  // protection from area walls
  if (this.hits === undefined || this.hitsMax === undefined) return undefined

  const index = StructureTypeToIndex[this.structureType]
  if (index === undefined) return undefined

  const x = this.pos.x
  const y = this.pos.y

  // idea taken from screeps packrat
  const code = (index << 12) | (x << 6) | y

  return String.fromCharCode(code)
}

Room.prototype.fromPhoto = function (code) {
  const index = (code & 0b1111000000000000) >> 12
  const xxxxx = (code & 0b0000111111000000) >> 6
  const yyyyyy = code & 0b0000000000111111

  const structureType = IndexToStructureType[index]

  return [{ x: xxxxx, y: yyyyyy }, structureType]
}

autobuildProcess.logConstructionSite = function (room, pos, structureType, rc) {
  const message = '[' + room.name + '] Planned [' + structureType + '] at [' + pos.x + ', ' + pos.y + '] with result code [' + rc + ']'
  console.log(message)
  Game.notify(message, 30)
}

autobuildProcess.tryPlan = function (room, pos, structureType) {
  const level = room.controller ? room.controller.level : 0
  const canHave = CONTROLLER_STRUCTURES[structureType][level] ?? 0
  if (canHave === 0) return ERR_RCL_NOT_ENOUGH

  const kx = String(pos.x)
  const ky = String(pos.y)

  const csAtY = room.__autobuild_constructionSites[ky]
  if (csAtY) {
    const csAtXY = csAtY[kx]
    if (csAtXY) {
      for (const constructionSite of csAtXY) {
        if (constructionSite.structureType === structureType) {
          return OK
        }
      }
      return ERR_BUSY
    }
  }

  const atY = room.__autobuild_structures[ky]
  if (atY) {
    const atXY = atY[kx]
    if (atXY) {
      for (const structure of atXY) {
        if (structure.structureType === structureType) {
          return OK
        }
      }
    }
  }

  const rc = room.createConstructionSite(pos.x, pos.y, structureType)
  if (rc === ERR_FULL) Game.__autobuild_cs_full = true

  this.logConstructionSite(room, pos, structureType, rc)

  return rc
}

autobuildProcess.takePhoto = function (room) {
  // determinism for photo
  const allStructures = room
    .find(FIND_STRUCTURES)
    .sort(
      function (s1, s2) {
        const index1 = (s1.pos.y + 1) * 100 + s1.pos.x
        const index2 = (s2.pos.y + 1) * 100 + s2.pos.x
        if (index1 === index2) return s1.structureType.localeCompare(s2.structureType)

        return index1 - index2
      }
    )

  let photo = ''
  for (const structure of allStructures) {
    const code = structure.takePhoto()
    if (code === undefined) continue

    photo += code
  }

  console.log(photo)

  room.memory.photo = photo
  room.memory.nodeAccessed = Game.time
}

autobuildProcess.photoBuild = function (room) {
  const photo = room.memory.photo
  if (photo === undefined) return

  room.memory.nodeAccessed = Game.time

  for (let i = 0; i < photo.length; ++i) {
    const code = photo.charCodeAt(i)
    const [position, structureType] = room.fromPhoto(code)
    if (structureType === undefined) continue

    this.tryPlan(room, position, structureType)

    if (Game.__autobuild_cs_full) return
  }
}

autobuildProcess.extractor = function (room) {
  if (Game.__autobuild_cs_full) return

  if (room.extractor) return

  const level = room.controller ? room.controller.level : 0
  if (CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][level] > 0) {
    const minerals = room.find(FIND_MINERALS)
    for (const mineral of minerals) {
      this.tryPlan(room, mineral.pos, STRUCTURE_EXTRACTOR)
    }
  }
}

autobuildProcess.actualWork = function (room) {
  room.__autobuild_structures = room.lookForAtArea(LOOK_STRUCTURES, 0, 0, 49, 49)
  room.__autobuild_constructionSites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, 0, 0, 49, 49)

  this.photoBuild(room)
  this.extractor(room)
}

autobuildProcess.work = function (room) {
  const photoFlag = Game.flags.photo
  if (photoFlag?.room &&
      photoFlag.room.name === room.name) {
    photoFlag.remove()
    this.takePhoto(room)
    return
  }

  const autobuildFlag = Game.flags.autobuild
  let executeAutoBuild = false

  if (autobuildFlag?.room &&
      autobuildFlag.room.name === room.name) {
    autobuildFlag.remove()
    executeAutoBuild = true
  } else {
    // once in 6 creep generations
    if (room.memory.abld === undefined ||
        room.memory.abld < Game.time - (6 * CREEP_LIFE_TIME)) {
      executeAutoBuild = true
    }
  }

  if (executeAutoBuild) {
    // offset regeneration time randomly so multiple rooms don't do it at same tick
    room.memory.abld = Game.time + Math.ceil(Math.random() * 6 * CREEP_LIFE_TIME)

    const t0 = Game.cpu.getUsed()
    console.log('Autobuild for room [' + room.name + '] started at [' + t0 + ']')

    if (_.keys(Game.constructionSites).length < MAX_CONSTRUCTION_SITES) {
      this.actualWork(room)
    } else {
      console.log(MAX_CONSTRUCTION_SITES + ' or more construction sites, cannot plan more')
    }

    const t1 = Game.cpu.getUsed()
    console.log('Autobuild for room [' + room.name + '] finished at [' + t1 + '] and took [' + (t1 - t0) + ']')
  }
}

autobuildProcess.register()

module.exports = autobuildProcess
