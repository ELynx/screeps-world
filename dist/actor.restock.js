var restockActor =
{
    /**
    @param {Object} destination
    @return True if actor can have it as 'actor' argument
    **/
    canHandle: function(destination)
    {
        return destination instanceof StructureSpawn ||
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
        return creep.transfer(structure, RESOURCE_ENERGY) == OK;
    }
};

module.exports = restockActor;
