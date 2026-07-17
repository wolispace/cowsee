Looking shows the contents of a location.

Each location is either a container 
- in: container eg: room, hallway, rocket etc..
- on: surface eg: bridge, field, rooftop etc..

Every object must have the location's ID in its loc

Objects can be hosted by other object in the location
- eg a bowl object hosts a key object = a bowl with a key in it.

Hosted objects will always have a hosthow showing how they are hosted
- in: a bowel with a key in it
- on: a table with a plate on it
- beside: a cupboard with a broom beside it
- above: a desk with a light above it
- under: a table with a book under it
- beneath.. others I have not thought of

All objects, hosted or not, can also be posed to show how they look in the location.
Poses are a free-text word the user types, so no limits
- flying: a bird flying here
- sleeping: a table with a cat sleeping under it
- yawning: a fence with a fisherman yawning bedside it

Objects also have a qty, which is used to make the 'is' and 'longname' attributes

example objs:
{id:"A", loc:"2", class:"table", qty: 1, longname="a table", is:"is", gender:"it"}
{id:"B", loc:"2", class:"cat", host:"A", hosthow:"under", pose:"sleeping", qty:1, longname:"a cat", is:"is", gender:"her" }
{id:"C", loc:"2" class:"mouse", plural:"mice", qty:"6", host:"B", hosthow:"around", pose:" dancing", is:"are", gender:"them" }

Existing code will construct the longname from the qty, class ant other attributes.

Objects can be posed as 'hidden' meaning they, and everything they host, are not included in the objects in the room.

The order (alpha or otherwise) of objects is not significant, but the groupings are and we always start with the un-hosted objects.

The aim is to construct a string with replacable params from the objects. The default is the longname. eg:
"There {A.is} {A} with {B} {B.pose} {B.hosthow} {A.gender}. {C.pose} {C.hosthow} {A} {C.is} {C}"


We can group things by their host:
- no host = all top-level objects just existing in the room.
- host by A = all objects hosted by A
- host by B = all objects hosted by B etc..

All hosted objects can be further grouped by their hosthow:
- all objects 'on' A
- all objects 'under' A etc..

When grouping, we should have a maximum number of items in that group. When it is reached we add a full stop and start a new sentence.

Initially it will be 3 objects per group but maybe its variable (2 - 5) ?

We include commas between all objects in a group, using 'and' as the last delimiter. eg:
- on the table is a plate, a knife and a fork 

Each time the group changes eg from 'on' to 'under' we also start a new sentence.
- on the table is a plate, a knife and a fork. Under the table is a sleeping cat. 

Each time a hosted object is also posed, we also start a new sentence.

Each sentence can be started with the host or the hosted object first
- You see a table with a cat sleeping under it.
- Sleeping under the table is a cat.
- Under the table there is a cat.
- There is a cat sleeping under the table.

If the preceeding sentence has the same combination of host and hosthow, then the word 'Also' should be included:
- You also see a table with a cat sleeping under it.
- Also sleeping under the table is a cat.
- Also under the table there is a cat.
- There is also a cat sleeping under the table.

These structural patterns should be in a format where we can easily add new variations. An array of sentence structures?

Since unhosted objects are always the first things shown, the sentence will always begin with a starting phrase like:
- You see ..
- There is ..
- Looking around you notice .. etc..

We need recursion for hosts eg: rug > table > plate > cheese> fly

The could be structured with the first hosted object, then start of a new sentence. eg:
"You see a rug with a table on it. On the table is a plate with some cheese on it. On the cheese is a fly"

But if there were several things on the table, we group by hosthow and save the new object for the next sentence referencing a previous one. eg:
"You see a rung with a table on it. On the table is a plate and some cups and a spoon. On the plate is some cheese with a fly on it.

## Plan
Do an initial pass, allocating objects into groups (use SetMap)
- all unhosted objects
- all objects hosted by obj1 hosthow 'on'
- all objects hosted by obj1 hosthow 'under'
- all objects hosted by obj2 hosthow 'on'
etc..

From that we can loop through these SetMaps

We need to keep track of
- itemsInCurrentSentence - so we can reset at 3
- lastHost - so we now know if we need 'also' in the sentence prefix
- seenObjects - so we dont repeat or loop (cat on mat & mat on cat would loop)

We need templates for the sentence structures
- host: the hosting object
- obj: the hosted object
- also: optional if lastHost matches job.host
- intro: "You {also} see", "There {obj.is} {also}", etc..
- host-first: "{intro} {host} with {obj} {obj.pose} {obj.hosthow} {host.gender}."
- obj-first: "{intro} {obj.pose} {obj.hosthow} {host} {obj.is} {obj}."
- positional1: "{obj.hosthow} {host} there {obj.is} {also} {obj}."
- positional2: "{intro} {obj} {obj.pose} {obj.hosthow} {host}."

We combine these as needed to build a full sentence incuding nexted,hosted objects and multtiple object on the same host suing the same hosthow.

