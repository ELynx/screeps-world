'use strict';

var Process = require('process.template');

var autobuildProcess = new Process('autobuild');

autobuildProcess.bestNeighbour = function(room, posOrRoomObject, weightFunction)
{
    const center = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject;
    const [t, l, b, r] = center.squareArea(2);

    let weights = new Array(25);
    weights.fill(0);

    const inArea = room.lookAtArea(t, l, b, r);
    for (let dx = -1; dx <= 1; ++dx)
    {
        for (let dy = -1; dy <= +1; ++dy)
        {
            if (dx == 0 && dy == 0)
                continue;

            const x = center.x + dx;
            const y = center.y + dy;

            const itemsAtXY = inArea[x] ? inArea[x][y] : undefined;
            const weight = weightFunction(x, y, itemsAtXY ? itemsAtXY : []);
            const index = 7 + dx + (5 * (dy + 1));
            weights[index] = weight;
        }
    }

    const Magic =
    {
        0:  [],
        1:  [],
        2:  [],
        3:  [],
        4:  [],
        5:  [],
        9:  [],
        10: [],
        14: [],
        15: [],
        19: [],
        20: [],
        21: [],
        22: [],
        23: [],
        24: []
    };
};

autobuildProcess.logConstructionSite = function(room, posOrRoomObject, structureType, rc)
{
    const pos = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject;
    const message = 'Planned ' + structureType + ' in room ' + room.name + ' with result code ' + rc;

    console.log(message);

    if (!Game.rooms.sim)
    {
        Game.notify(message, 30);
    }
};

autobuildProcess.tryPlan = function(room, posOrRoomObject, structureType)
{
    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, posOrRoomObject);
    if (sites.length > 0)
    {
        return ERR_FULL;
    }

    const structs = room.lookForAt(LOOK_STRUCTURES, posOrRoomObject);
    for (let i = 0; i < structs.length; ++i)
    {
        const struct = structs[i];
        if (struct.structureType == structureType)
        {
            return ERR_FULL;
        }
    }

    const rc = room.createConstructionSite(posOrRoomObject, structureType);

    this.logConstructionSite(room, posOrRoomObject, structureType, rc);

    return rc;
};

autobuildProcess.extractor = function(room)
{
    if (room.controller && CONTROLLER_STRUCTURES[STRUCTURE_EXTRACTOR][room.controller.level] > 0)
    {
        const minerals = room.find(FIND_MINERALS);
        for (let i = 0; i < minerals.length; ++i)
        {
            const mineral = minerals[i];
            this.tryPlan(room, mineral, STRUCTURE_EXTRACTOR);
        }
    }
};

autobuildProcess.actualWork = function(room)
{
    this.extractor(room);
};

autobuildProcess.work = function(room)
{
    this.debugHeader(room);

    let executeAutoBuild = false;

    if (Game.flags.autobuild &&
        Game.flags.autobuild.room &&
        Game.flags.autobuild.room.name == room.name)
    {
        Game.flags.autobuild.remove();
        executeAutoBuild = true;
    }
    else
    {
        // once in 6 creep generations
        if (room.memory.abld === undefined ||
            room.memory.abld < Game.time - (6 * CREEP_LIFE_TIME))
        {
            executeAutoBuild = !(room.memory.abld === undefined);
        }
    }

    if (executeAutoBuild)
    {
        // offset regeneration time randomly so multiple rooms don't do it at same tick
        room.memory.abld = Game.time + Math.ceil(Math.random() * 6 * CREEP_LIFE_TIME);

        const t0 = Game.cpu.getUsed();
        console.log('Autobuild for room ' + room.name + ' started at ' + t0);

        if (Object.keys(Game.constructionSites).length < 100)
        {
            this.actualWork(room);
        }
        else
        {
            console.log('100 or more construction sites, cannot plan more');
        }

        const t1 = Game.cpu.getUsed();
        console.log('Autobuild for room ' + room.name + ' finished at ' + t1 + ' and took ' + (t1 - t0));
    }
};

autobuildProcess.register();

module.exports = autobuildProcess;
