# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# TODO
"Hot" areas to avoid for worker creeps.
Creep keeps room ID for spawn calculations.
Build and repair through "airgap" - requires pathfinding with range.
Use getActiveBodyparts and btyps to limit control.
Common Controller method "observeCreep" that memorises it if necessary. Replace rememberRestockable, set... etc.
Controller upgarde counter, repair HP target.
Repair controller less targets.
Base class for spawn controller.
Move creeps from construction sites.

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
