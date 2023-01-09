'use strict';

var Process = require('process.template');

var autobuildProcess = new Process('autobuild');

autobuildProcess.bestNeighbour = function(room, posOrRoomObject, weightFunction)
{
    const center = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject;
    const [t, l, b, r] = center.squareArea(2);
    const inArea = room.lookAtArea(t, l, b, r);

    // 5x5
    let weights = new Array(25);
    weights.fill(0);
    for (let dx = -1; dx <= 1; ++dx)
    {
        for (let dy = -1; dy <= +1; ++dy)
        {
            // don't check center
            if (dx == 0 && dy == 0)
                continue;

            const x = center.x + dx;
            const y = center.y + dy;

            const itemsAtXY = inArea[x] ? inArea[x][y] : undefined;
            const weight = weightFunction(x, y, dx, dy, itemsAtXY ? itemsAtXY : []);

            // 7 is the middle of 2nd row
            const index = 7 + dx + (5 * (dy + 1));
            weights[index] = weight;
        }
    }

    // for index `key` array of indexes that affect it's weight
    const Magic =
    {
        0:  [6],
        1:  [6, 7],
        2:  [6, 8, 8],
        3:  [7, 8],
        4:  [8],
        5:  [6, 11],
        9:  [8, 13],
        10: [6, 11, 16],
        14: [8, 13, 18],
        15: [11, 16],
        19: [13, 18],
        20: [16],
        21: [16, 17],
        22: [16, 17, 18],
        23: [17, 18],
        24: [18]
    };

    // output of position and weight
    let positions = [];

    for (let index in Magic)
    {
        // restore dx dy
        const dx = (index % 5) - 2;
        const dy = Math.floor(index / 5) - 2;

        // get the position
        const x = center.x + dx;
        const y = center.y + dy;

        // ignore room boundary positions completely
        if (x < 0 || x > 49 || y < 0 || y > 49)
            continue;

        // check if there is terrain wall in the way
        // handle sites, structures, etc, at the caller
        // because of build-ability depends on cross-types
        let blocked = false;
        const itemsAt1 = inArea[x] ? inArea[x][y] : undefined;
        const itemsAt2 = itemsAt1 ? itemsAt1 : [];
        for (let i = 0; i < itemsAt2.length; ++i)
        {
            const item = itemsAt2[i];

            if (item.type == LOOK_TERRAIN)
            {
                if (item.terrain == 'wall')
                {
                    blocked = true;
                }
            }

            if (blocked) break; // out of items loop
        }

        if (blocked) continue; // to next index

        const toVisits = Magic[index];
        for (let i = 0; i < toVisits.length; ++i)
        {
            const toVisit = toVisits[i];
            weights[index] += weights[toVisit];
        }

        positions.push(
            {
                pos: new RoomPosition(x, y, room.name),
                weight: weights[index]
            }
        );
    }

    positions.sort(
        function(item1, item2)
        {
            return item2.weight - item1.weight;
        }
    );

    return positions;
};

autobuildProcess.logConstructionSite = function(room, posOrRoomObject, structureType, rc)
{
    const pos = posOrRoomObject.pos ? posOrRoomObject.pos : posOrRoomObject;
    const message = 'Planned ' + structureType + ' at ' + pos + ' with result code ' + rc;

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

// STRATEGY weight of goodness of place near the source
// return best position regardless of buildings and roads
// thus always should return same distribution for source
autobuildProcess.weightAroundTheSource = function(x, y, dx, dy, itemsAtXY)
{
    // no harvester can stand on the endge, discourage
    if (x <= 0 || y <= 0 || x >= 49 || y >= 49)
        return -10;

    // check for walls, they get no bonuses
    for (let i = 0; i < itemsAtXY.length; ++i)
    {
        const item = itemsAtXY[i];

        // one of terrain should happen only
        if (item.type == LOOK_TERRAIN)
        {
            if (item.terrain == 'wall')
            {
                // can be developed later, but discourage
                return 1;
            }
        }
    }
 
    // orthogonal positions give more advantage when roads are added
    if (dx == 0 || dy == 0)
        result = result + 2;

    // going more to the center, suppose
    if (x < 25 && dx > 0)
        result = result + 1;

    if (x > 25 && dx < 0)
        result = result + 1;

    if (y < 25 && dy > 0)
        result = result + 1;

    if (y > 25 && dy < 0)
        result = result + 1;

    return result;
};

autobuildProcess.sourceLink = function(room)
{
    let canHave = room.controller ? CONTROLLER_STRUCTURES[STRUCTURE_LINK][room.controller.level] : 0;

    // need to have at least single recipient
    if (canHave > 1)
    {
        const filterForLinks = function(structure)
        {
            return structure.my && structure.structureType == STRUCTURE_LINK && structure.isActiveSimple();
        };



        const links = room.find(
            FIND_STRUCTURES,
            {
                filter: filterForLinks
            }
        );

        const linksCS = room.find(
            FIND_CONSTRUCTION_SITES,
            {
                structureType: STRUCTURE_LINK
            }
        );

        canHave = canHave - links.length - linksCS.length - 1; // one for target

        if (canHave > 0)
        {
            let sources = room.find(
                FIND_SOURCES,
                {
                    filter: function(source)
                    {
                        return !source.pos.hasInSquareArea(LOOK_STRUCTURES, 2, filterForLinks);
                    }
                }
            );

            if (sources.length > 0)
            {
                if (sources.length > 1)
                {
                    sources.sort(
                        function(s1, s2)
                        {
                            return s2.pos.walkableTiles() - s1.pos.walkableTiles();
                        }
                    );

                    for (let i = 0; i < sources.length && canHave > 0; ++i)
                    {
                        const source = sources[i];
                        const positions = this.bestNeighbour(room, source, weightForLinkPlacement);
                        if (positions.length > 0)
                        {
                            const at = positions[0];
                            if (at.weight > 0)
                            {
                                // ERR_FULL means there is site or link on place already
                                const rc = this.tryPlan(room, at.pos, STRUCTURE_LINK);
                                if (rc == OK || rc == ERR_FULL)
                                    canHave = canHave - 1;
                            }
                        }
                    }
                }
            }
        }
    }
};

autobuildProcess.actualWork = function(room)
{
    this.extractor(room);
    this.sourceLink(room);
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
