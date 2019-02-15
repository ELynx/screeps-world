var sourceActor =
{
    /**
    @param {Object} destination
    @return True if actor can have it as 'actor' argument
    **/
    canHandle: function(destination)
    {
        return destination instanceof Source;
    },

    /**
    @param {Source} source
    @param {Creep} creep adjacent to source
    @return True if creep was acted upon
    **/
    act: function(source, creep)
    {
        var result = false;

        if (_.sum(creep.carry) < creep.carryCapacity)
        {
            result = creep.harvest(source) == OK;
        }

        return result;
    }
};

module.exports = sourceActor;
