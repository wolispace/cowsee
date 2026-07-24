The UI is mobile first.

It's divided vertically into 4 sections.

There is also a pop-open menu (hamberger) top-right fixed on top of everything.

The sections should grow and shrink, and scroll so some sections are always visible.

id=top
id=splitter
id=bottom
id=input

The top and bottom <section> should:
- be scrollable to hold alot of content
- scrolling should be done via dragging on mobile
- take up as much space as is allowed taking into account
  - the presence or not of the keyboard on mobile
  - min heights of all other sections
- new content added to the top should scroll to the top
- new content added to the bottom should scroll tot he bottom

The splitter <div> should:
- never change height 1rem
- be draggable up and down
- change the hight of both top and bottom at the same time
- not let top or bottom get smaller than their min heigh 2rem

The input <form> should:
- always be at the bottom
- never change height 2rem
- always be visible (mobile keyboard present or not)

So a user will
- always see some or all of each section
- be able to drag the splitter up/down to see more of the top/bottom sections
- be able to drag scroll the top/bottom sections up/down to see all content in each

Programatically we will 
- expand as much as possible top or bottom as new content is added, depending on what mode the user is in (editing content or just typing commands)
- scroll top or bottom as new content is added
- detect clicks in either section to handle links as we currently do 

NOTES: 
- I have yet to add logic to chose which dction new content gos into to right now it all goes into bottom.
- I have not put any effor into a menu, its visibility or its functionality, just added a div to the html for now.


