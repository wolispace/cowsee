# cowdee - distributed cow

## Aim
No centralised server that processes commands and performs logic.

This simplifies the server code to just a file manager, sharing and storing files.

Each browser that connects to the server processes commands in sequence keeping theor local set of data files up-to-date.

Periodically, any browser can send its copy of files back to the sever so new players can quickly catch up to the latest version of the data.

## teminology

Players send commands, each one is assigned, by the server, a unique incremental integer id (cid)

Ids of objects are stored in base62 eg {id:"Ag2", class="cup", loc:"d8", host:"eW"}

Data is stored in json format. It is split into types (id, name, loc etc..) and ids within those in base 62 form. eg index_name_A.json holds all names starting with 'A'

A data_cid.txt is stored on the server, along with the json data, that stores the highest know cid at the time the data was written to disk.

Messages are shown to the user as the result of running cowscript.

Cowscript is a series of cowmands (as compared to commands players type)

Player commands are parsed and the coresponding object holding the cowscript of that command is executed, to modify the data and generate messages.

Browsers connect to the server in two ways:
- Server side events (SSE) for comminicating what the latest player command send to the sever was.
- fetch to post commands and transfer json data files

## How
Every player browser holds the highest cid they know about, new players cid=null.

Each interaction with the server informs the browser of the latest/highest cid.

If the difference is > 10 the browser fetches a full set of json data files and stores each in memory. the cid is updated to match the verison of the data. A loading message needs to be presented here. A simple down from the total number of data files to zero as they are fetched and loaded into the browsers memory.

The browser fetches the latest cid again, and if > 0 && < 10 it fetches all of the commands and run each in the browser, updating data files in memory and sending commands to that browser only.

Each time a local data file is modified, its name is added to a list of dirty files.

During idle time, each browser fetches the server's cid for the data on disk and if < than the browsers cid then 
- a fetch is used to lock the server
- all of dirty data files are sent back to the server
- the servers data cid is updated
- all commands with cids older than the data cid are removed from the list of commands
- the server is unlocked


All the while players are sending commands, adding to the list of commands, increasing the cid.


