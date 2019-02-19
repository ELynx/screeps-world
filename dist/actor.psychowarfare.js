/**
Psycho of the day text.
Ten characters long. Infinitely scary and/or hilarious.
**/

// When there is only one creep in a room, imitate dialog
const potdSingle = [
//  |----------| limit
    'Wait!'
   ,'Dont attac'
   ,'Exploring'
   ,'Will leave'
   ,'Sorry'
   ,'roomsimnot'
   ,'room[sim]n'
   ,'DAMN'
   ,'OK got it.'
   ,'DAMN!!!!!'
   ,'suiside'
   ,'suiside'
   ,'suicide'
];

// TODO
// When there are more creeps, just spam
// Each creep gets a line
const potdGroup = [
//  |----------| limit
    'E2-E4'
   ,'pew pew'
   ,'im hit'
   ,'4 da swarm'
   ,'heal me'
   ,'ERROR'
   ,'Spawn1'
   ,'creep.say('
   ,'all your b'
   ,'ase are be'
   ,'long to us'
   ,'il be back'
   ,'fus-ro-DAH'
];

var psychoWarfareActor =
{
    indexCache: { },

    /**
    @param {Room} room
    **/
    act: function(room)
    {
        const creeps = room.find(FIND_MY_CREEPS);

        if (creeps.length == 0)
            return;

        this.indexCache[room.id] = this.indexCache[room.id] || 0;

        for (var i = 0; i < creeps.length; ++i)
        {
            creeps[i].say(potdSingle[this.indexCache[room.id]++], true);

            if (this.indexCache[room.id] >= potdSingle.length)
            {
                this.indexCache[room.id] = 0;
            }
        }
    }
};

module.exports = psychoWarfareActor;
