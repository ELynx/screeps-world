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
];

// When there are more creeps, just spam
// Each creep gets a line
const potdGroup = [
//  |----------| limit
    'E2-E4'
   ,'pew pew 💥'
   ,'im hit 💀'
   ,'4 da swarm'
   ,'heal me 🛠️'
   ,'il be back'
   ,'fus-ro-DAH'
   ,'HeresJohny'
   ,'KPODETC9i'
   ,'HDC 20%'
   ,'AD ASPERA'
   ,'PER RECTUM'
   ,'dakka'
   ,'dakka'
   ,'dakka'
   ,'Meme 🚔'
   ,'42 ➗ 0'
   ,'SEND CODES'
];

var psychoWarfareActor =
{
    index: 0,

    /**
    @param {Room} room
    **/
    act: function(room)
    {
        const creeps = room.find(FIND_MY_CREEPS);

        if (creeps.length == 0)
            return;

        const speek = creeps.length == 1 ? potdSingle : potdGroup;

        for (var i = 0; i < creeps.length; ++i)
        {
            if (this.index >= speek.length)
                this.index = 0;

            creeps[i].say(speek[this.index++]);
        }
    }
};

module.exports = psychoWarfareActor;
