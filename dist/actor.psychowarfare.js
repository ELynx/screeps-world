'use strict';

/**
Psycho of the day.
Ten characters long. Infinitely scary and/or hilarious.
**/
const PotD = [
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
    @param {array<Creep>} creeps
    **/
    act: function(creeps)
    {
        if (creeps.length == 0)
            return;

        for (var i = 0; i < creeps.length; ++i)
        {
            if (this.index >= PotD.length)
                this.index = 0;

            creeps[i].say(PotD[this.index++]);
        }
    }
};

module.exports = psychoWarfareActor;
