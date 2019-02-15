var refillActor =
{
    /**
    @param {Object} destination
    @return True if actor can have it as 'actor' argument
    **/
    canHandle: function(destination)
    {
        return  destination instanceof StructureController ||
                destination instanceof StructureSpawn ||
                destination instanceof StructureExtension ||
                destination instanceof StructureTower;
    },

    /**
    @param {Structure} structure
    @param {Creep} creep adjacent to structure
    @return True if creep was acted upon
    **/
    act: function(structure, creep)
    {
        var result = false;

        if (structure instanceof StructureController)
        {
            result = creep.upgradeController(structure) == OK;
        }
        else
        {
            result = creep.transfer(structure, RESOURCE_ENERGY) == OK;
        }

        return result;
    }
};

module.exports = refillActor;
