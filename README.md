# LICENSE
Copyright (C) 2019 by Eduard Lynx.
All rights reserved.
Unauthorized copying of via any medium is strictly prohibited.
Proprietary and confidential.

# Folders
dist - connected to official server

# Economics
## Room level
✔️ Spawn
✔️ Harvest
✔️ Restock
✔️ Build
✖️ Repair
✖️ Controller upgrade

# Warfare
## Room level
✔️ Psychological warfare

# TODO
"Hot" areas to avoid for worker creeps.
Creep keeps room ID for spawn calculations.
Build and repair through "airgap" - requires pathfinding with range.
Use getActiveBodyparts and btyps to limit control.
structureType vs instanceof

# Ideas
Withdraw from enemy structures.
Dismantle enemy structures, 50 hits vs melee Attack 30 hits.
Use Room.lookAtArea.
Role Scavenge, collect dropped resources (any?).

Dynamic creep life
-> old creeps undergo a check
--> if not needed anymore recycle
--> if level is less than current recycle
--> otherwise renew

Temporary creeps, role Heal, spawned if there are broken creeps.
-> Spawn on demand;
--> recycle by "Dynamic creep life" afterwards.

Even distribution of restockers per restockables.

PathFinder opt flee.

Don't use new level immediately for build and repair, let creep population grow.
