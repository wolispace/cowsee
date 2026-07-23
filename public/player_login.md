# How a player logs in and we keep track of them

## Front-end
store a player = {id: 'w', loc: '2'}

Logging in needs to find the player id, and from that its current loc

First message recieved when establishing the connection is unique and maybe its how we set the player

Every user command we send includes this player object 

Every message we recieve holds an objs list of objects being shown and the player is always one of these.

Compare the player.loc with the objs[player.id].loc to know if we have moved locations

If we have, update the player object and re-display the users loc panel.

