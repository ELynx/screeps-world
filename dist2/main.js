getPixel = function () {
    if (Game.cpu.bucket >= PIXEL_CPU_COST) {
        Game.cpu.generatePixel()
    }
}

getCreep = function (creepName, spawnName, body, spawnDirection) {
    const creep = Game.creeps[creepName]

    if (creep === undefined) {
        const spawn = Game.spawns[spawnName]

        if (spawn === undefined) {
            console.log('No spawn [' + spawnName + '] found')
            return undefined
        }

        if (spawn.spawning) {
            return undefined
        }

        if (spawn.__spawned_this_tick__) {
            return undefined
        }

        spawn.spawnCreep(body, creepName, { directions : [spawnDirection] })
        spawn.__spawned_this_tick__ = true

        return undefined
    }

    return creep
}

creepDowngradeController = function (creep) {
    if (_.random(1, 6) === 6) {
        return creepUpgradeController(creep)
    }

    return ERR_BUSY
}

creepRestock = function (creep) {
    // in case containers ever appear, do not restock them
    const structures = creep.room.find(FIND_MY_STRUCTURES)

    const withEnergyDemand = _.filter(structures, structure => (structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))
    const near = _.filter(withEnergyDemand, structure => structure.pos.isNearTo(creep))

    return creep.transfer(_.sample(near), RESOURCE_ENERGY)
}

creepBuild = function (creep) {
    const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES)

    const inRange = _.filter(constructionSites, cs => cs.pos.inRangeTo(creep, 3))
    if (inRange.length === 0) {
        return ERR_NOT_FOUND
    }

    return creep.build(_.sample(inRange))
}

creepUpgradeController = function (creep) {
    return creep.upgradeController(creep.room.controller)
}

creepHarvest = function (creep) {
    const sources = creep.room.find(FIND_SOURCES)

    const near = _.filter(sources, source => source.pos.isNearTo(creep))
    if (near.length === 0) {
        console.log('No near source found for creep [' + creep.name + ']')
        return ERR_NOT_FOUND
    }

    return creep.harvest(_.sample(near))
}

creepWork = function (creep) {
    // just don't bother with external, check here
    if (creep === undefined) return ERR_INVALID_TARGET

    const energySize      = creep.store.getUsedCapacity(RESOURCE_ENERGY)
    const energyCapacity  = creep.store.getCapacity(RESOURCE_ENERGY)

    if (creep.memory.role !== undefined && energySize === 0) {
        creep.memory.role = undefined
    }

    if (energySize >= energyCapacity) {
        creep.memory.role = 'work'
    }

    if (creep.memory.role === 'work') {
        const rc0 = creepDowngradeController(creep)
        if (rc0 === OK) return OK
        const rc1 = creepRestock(creep)
        if (rc1 === OK) return OK
        const rc2 = creepBuild(creep)
        if (rc2 === OK) return OK
        const rc3 = creepUpgradeController(creep)
    } else {
        return creepHarvest(creep)
    }

    return ERR_NO_PATH
}

module.exports.loop = function () {
    getPixel()

    const body = [WORK, WORK, CARRY, CARRY]

    const hamster = getCreep('hamster', 'HamsterHole', body, LEFT)
    creepWork(hamster)

    const mousy = getCreep('mousy', 'HamsterHole', body, BOTTOM)
    creepWork(mousy)
}
