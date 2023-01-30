'use strict'

const UsernameSourceKeeper = 'Source Keeper'
const UsernamePowerBank = 'Power Bank'
const UsernameInvader = 'Invader'
const UsernamePublic = 'Public'
const UsernameScreeps = 'Screeps' // eslint-disable-line no-unused-vars

const isAlly = function (something) {
  // you are not your ally
  if (something.my) return false

  if (something.__isally) return something.__isally

  if (something.owner) {
    if (!Memory.allies) {
      Memory.allies =
            {
              __timeOfCreation__: Game.time
            }
    }

    const status = Memory.allies[something.owner.username]

    const response = status && status === true
    something.__isally = response
    return response
  }

  something.__isally = false
  return false
}

const isNeutral = function (something) {
  // you are not your neutral
  if (something.my) return false

  if (something.__isneutral) return something.__isneutral

  let response = false

  if (something.owner) {
    if (!Memory.neutrals) {
      Memory.neutrals =
            {
              __timeOfCreation__: Game.time
            }
    }

    const username = something.owner.username

    // TODO not always
    if (username === UsernameSourceKeeper) response = true
    if (username === UsernamePowerBank) response = true
    if (username === UsernamePublic) response = true

    if (!response) {
      // check the actual memory
      const status = Memory.neutrals[username]
      response = status && status === true
    }
  }

  something.__isneutral = response
  return response
}

const isHostile = function (something) {
  // this will be joy when wrapped by profiler...

  // quickest check
  if (something.my) return false

  // quick check
  if (something.owner) {
    if (something.owner.username === UsernameInvader) return true
  }

  if (something.ally) return false
  if (something.neutral) return false

  return true
}

const isUnowned = function (something) {
  return something.owner === undefined
}

const isPC = function (something) {
  // quick check
  if (something.my) return true

  if (something.owner) {
    const username = something.owner.username

    if (username === UsernameSourceKeeper) return false
    if (username === UsernamePowerBank) return false
    if (username === UsernameInvader) return false
  }

  return true
}

Object.defineProperty(
  OwnedStructure.prototype,
  'ally',
  {
    get: function () {
      return isAlly(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'neutral',
  {
    get: function () {
      return isNeutral(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'hostile',
  {
    get: function () {
      return isHostile(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'unowned',
  {
    get: function () {
      return isUnowned(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  OwnedStructure.prototype,
  'pc',
  {
    get: function () {
      return isPC(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'ally',
  {
    get: function () {
      return isAlly(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'neutral',
  {
    get: function () {
      return isNeutral(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'hostile',
  {
    get: function () {
      return isHostile(this)
    },
    configurable: true,
    enumerable: true
  }
)

Object.defineProperty(
  Creep.prototype,
  'pc',
  {
    get: function () {
      return isPC(this)
    },
    configurable: true,
    enumerable: true
  }
)
