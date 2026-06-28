# COW SSE 2026 - cowsee

A Server Side Events version of COW

## Aim
- full implemntation of cow script as is, no new concepts so backward compatible
- start a new world
- maybe run a copy of the old world (daily reset in case people break stuff)

## Data structure
- All indexes and current object data is stored in memory with a debounce to save when idle
- Object files will get big so save in id-based chunks (objects_0_9999.json, objects_10000_19999.json)
- Index key concepts like location.json and trigger.json as simple id: [id, id2 ...]
  - location = {"45":[1,2,9..], "9":[..]}
    - find all objects in a room 
  - trigger = {"push":[1,2,3..], "get":[1,5,9..], "tick":[1,2,3..], "tickloc": [],}
    - find all obejcts that react if either actor, target or second of an action
  - search = {"player",[22,33..], "cup":[5,6..], "doorway":[9,55..], "mouse":[2,888]}
    - individual words from the objects class+name for finding objects eg: Read the book of coding. foreach player in $loc ...
  - material = {"stone":[444], "player": [445], "package":[446]}
    - objects can have multiple materials, all of the code from that material is inherited, so before building triggers, marge in all the materials the object has as well

## Server/client commuication

### Node server
- runds a simply SSE server
- handles fetch() requests as user commands
- runs all commands in sequence

### Client javaScript
- updated view of world on events from server
- sends user commands as fetch()
- handles UI, formatting of json data sent from server
- use local storage for remembering UI states and last commands etc..

### Data flow
- User enters a command: `create a small black mouse`
- fetch() sends this as a post (we may be editing the large text blocks of an object)
- commandManger takes it and adds it to a command queue
- tickManager reads next command to process
- passes it to commandManager to parse 
- and process
- most of the time a command will generate one or more messages which are added to the message queue
- tickManager sends messages to SSEManager
- SSEManager sends messages to clients

### Payload from SSE
```
{
  message: "A message with {{replaceable}} params like {{AK}} pushed {{dJ2}}",
  relook: true,
  objects: {
    "AK": {class: "buffallo", longname: "a large white buffallo", host: "Ge", hosthow: "beside" ...},
    "d32": { ...}
  }
  host: {"AK":["d32", "on"], ...}

}
```
name
longname
info
link
face
facehow
host
hosthow
colour




## Parsing
Create command splitting off the extra text on: which, who, that, covered, wearing, looking, is, for, leading, decorated, adorned
