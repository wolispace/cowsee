# How a player logs in and we keep track of them

## Front-end
store a player = {id: 'w', loc: '2'}

Logging in needs to find the player id, and from that its current loc

First message recieved when establishing the connection is unique and maybe its how we set the player

Every user command we send includes this player object 

Every message we recieve holds an objs list of objects being shown and the player is always one of these.

Compare the player.loc with the objs[player.id].loc to know if we have moved locations

If we have, update the player object and re-display the users loc panel.

## fetch method of logging in

Since we will have forms for editing textareas and other content, we might as well build one form processor that sends a form via fetch(), and returns json, which we process and use local storage if logged in.

cowsee.js needs to notice there is no playerInfo set 
(as on first lod or after logout) 
- render a dialog with the form.
- on submit, do an ajax fetch() and handle the json result
- if logged in, set the playerInfo close the dialog and UI is accessible,
- if not, keep dialog open and update with fail message.




## Initial form and cookie method - too complicated

/login.html → shows form, displays {{error}} message if ?error= is in URL

POST /login → valid: sets cookie, redirects to /?user=username → index.html saves to localStorage, cleans URL → invalid: redirects to /login.html?error=Invalid+username+or+password

index.html on load → if ?user= param, save to localStorage and continue → else if localStorage has user, POST /autologin to get a fresh cookie → else redirect to /login.html

/logout → clears cookie, redirects to /login.html
