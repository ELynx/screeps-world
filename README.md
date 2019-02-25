# LICENSE
Copyright (C) 2019 by Eduard Surovin.
All rights reserved.
Unauthorized copying via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
(Module WAR) "Hot" areas to avoid for worker creeps.
(Multiroom)  Creep keeps room ID for spawn calculations.
(Future)     Build and repair through "airgap" - requires pathfinding with range.
(Multiroom)  Use getActiveBodyparts and btyps to limit control.
(Economy)    Common Controller method "observeCreep" that memorises it if necessary. Replace rememberRestockable, set... etc.
(Economy)    Controller upgarde counter, repair HP target.
(Economy)    Repair controller less targets.
(Economy)    Base class for spawn controller.
(Economy)    Move creeps from construction sites.

# Ideas
Withdraw from enemy structures.
Dismantle enemy structures, 50 hits vs melee Attack 30 hits.
Use Room.lookAtArea.
Actor Scavenge, collect dropped resources.
structureType might be faster than instanceof.
PathFinder opt flee.
Don't use new level immediately for build and repair, let creep population grow.

Dynamic creep life
-> old creeps undergo a check
--> if not needed anymore recycle
--> if level is less than current recycle
--> otherwise renew
If spawn started to spawn creep can wait by return true

Temporary creeps, role Heal, spawned if there are broken creeps.
-> Spawn on demand;
--> recycle by "Dynamic creep life" afterwards.
