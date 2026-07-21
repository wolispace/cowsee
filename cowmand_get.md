# Rebuilding the get cowmand

I want a javascript version of this orignal perl function (below).

I want it to follow the same sequence of sparsing the inputs.

The first itteration of it is in CommandManager.js

I have renamed the first attempt as 'get0' so we can make a new get to sit along site it for comparison. 

Don't replace any existing code.  Suggest changes to code, but build the new get using all existing functions.

Its works for a few scenarios (say, think, create as tested in test_objectManager.js), but each time I introduce another one (pose in this case) it fails to parse it as needed.

eg:
cowscript: get $target,"as",$text; 
User types: "pose the cat as sleeping"
target={idOfCat}
text="sleeping"

So later we can: set $target's pose to $text;

## Summary of how get parses the inputs:

*   **Extract and Clean Input**: Capture the text following the "get" command. Replace any backticks (`` ` ``) with single quotes (`'`) to standardise the string.
*   **Handle Target History**: 
    *   Store the current `this.context.target` and `this.context.second` into local "last" variables (e.g., `ltarget` and `lsecond`).
    *   If the current target is invalid or 0, fall back to the `last_target` from the context history.
*   **Identify Search Locations (The `in` Keyword)**:
    *   Check if the string contains the keyword **`in`** (e.g., `get $target in $loc`).
    *   **If `in` is found**:
        *   Split the string into the **"Roles"** (the variables to fill) and the **"Locations"** (where to search).
        *   Split the "Locations" part by a comma to identify a primary search location (`$get_loc`) and a secondary search location (`$get_loc_second`).
        *   If only one location was provided after `in`, assign it to both the primary and secondary search locations.
    *   **If `in` is NOT found**: 
        *   Default both search locations to the actor's current room ID (`$loc`).
*   **Parse Variable Bits**:
    *   Take the "Roles" string (everything before the `in` or the entire string if no `in` was present) and split it by commas.
    *   This creates an array of variable names (e.g., `['$target', '$rel', '$second']`) that the system needs to populate.
*   **Check for Parsing Flags**: 
    *   *Note: While not in the immediate block, the `non-greedy` keyword is handled as a parameter here to decide if the system splits the user's input at the first or last relationship word.*
*   **Resolve and Map**:
    *   Pass the variable array, the search locations, and any flags to the internal resolver.
    *   The resolver identifies the physical objects from the raw user input (the text the player actually typed) and updates `this.context` with the resulting Object IDs.

---

Original perl script for 'get' cowmand:
``` perl
#: get
    }elsif($this_cmd =~ m/^get (.+)/i){  # get $target in $loc || $target || $target,$rel,$second on $loc || $target,$last_word
      my $firstword = $1;
      $firstword =~ s/`/'/g; #'
      my $ltarget = $target; # remember these as they are the last target and second for this process run
      my $lsecond = $second;
      $ltarget = $last_target if($target < 1);
      # &udebug("GET $firstword");
      if ($firstword =~ m/(.+) in (.+)/i){
        $firstword = $1;
        ($tloc,$sloc) = split(/\,/,$2,2);
        eval("\$get_loc= $tloc"); # $loc = 22
        eval("\$get_loc_second= $sloc");
        if($get_loc_second < 1){
          $get_loc_second = $get_loc;
        }
        # &udebug("UPDATE GETLOC to [$tloc][$sloc] - [$get_loc] and [$get_loc_second]");
      }else{
        $get_loc = $loc;
        $get_loc = 0;
        $get_loc_target = 0;
      }
      my @get_bits = split(/,/,$firstword) ; # split into elements we want ot codect from $text
      # &udebug("GET bits [$firstword] ".$get_bits[0].'|'.$get_bits[1].'|'.$get_bits[2]);
      # possible options are: $target | $word,$target | $target,$lastword | $target,$rel,$second | $target,$rel,$text  | $target,$rel,$second | $text,$rel,$target

      my $g_count = scalar @get_bits;
      if($g_count eq 1){
        eval($get_bits[0]."= \$cmd_text"); # $target = 'a cat'
      }elsif($g_count eq 2){
        if($firstword =~ m/lastword/i) {
          # &udebug("get lastword");
          $cmd_text =~ m/(.+) (\w+)/i;
          eval($get_bits[0]."= \$1"); # $rel = ''               # $target  = 'the cat'  'colour the cat blue'
          eval($get_bits[1]."= \$2"); # $target = 'the cat'     # $lastword = 'blue'
        }else{
          # &udebug("get firstword");
          $cmd_text =~ m/(\w+) (.+)/i;
          eval($get_bits[0]."= \$1"); # $rel = 'towards'        # $target  = 'the cat'  'go towards the cat'
          eval($get_bits[1]."= \$2"); # $target = 'the cat'     # $rel = 'towards'
        }
      }elsif($g_count eq 3){
        $cmd_text =~ m/(.+) ($rel_words) (.+)/i;
        eval($get_bits[0]."= \$1"); # $target = 'the cat'
        eval($get_bits[1]."= \$2"); # $rel = 'on'
        eval($get_bits[2]."= \$3"); # $second = 'the chair'
        &udebug(" -->  $cmd_text =~ m/(.+) ($rel_words) (.+)/i");
      }elsif($g_count eq 4){ # any text in the 4th pos tells the get to be non-greedy when matching first rel word eg 'force the cat to do go to the door' matches onteh first 'to' not the second.. this not finding the cat
        $cmd_text =~ m/(.+?) ($rel_words) (.+)/i;
        eval($get_bits[0]."= \$1"); # $target = 'the cat'
        eval($get_bits[1]."= \$2"); # $rel = 'on'
        eval($get_bits[2]."= \$3"); # $second = 'the chair'
        &udebug(" --> ? $cmd_text =~ m/(.+) ($rel_words) (.+)/i");
      }
      &udebug(" --> 1 [$g_count] ($cmd_text?) [$1][$2][$3] get target=[$target] second=[$second] rel=[$rel] word=[$word] lastword=[$lastword] ntarget=[$ntarget] ltarget=[$ltarget]");
      my $ntarget = $target;
      my $nsecond = $second;
      $target = $ltarget;
      $second = $lsecond;
      &udebug(" --> 2 get target=[$target] second=[$second] rel=[$rel] word=[$word] lastword=[$lastword]");
      ($target,$target_loc,$target_pw)=&get_resolve($ntarget,$get_loc);
      ($second,$second_loc,$second_pw)=&get_resolve($nsecond,$get_loc_second);
      &udebug(" --> 3 get target=[$target] second=[$second] rel=[$rel] word=[$word] lastword=[$lastword]");
```

## The new get cowmand

Step	What it does
1. Clean input	Replaces backticks with single quotes
2. Target history	Saves current target/second as ltarget/lsecond for restore
3. in keyword	Splits off search locations ($loc,$loc2), resolves them via resolveValue
4. Parse variable bits	Splits the remaining string by comma into the variable slots
5. Non-greedy flag	A 4th parameter (any text) triggers non-greedy matching
6. Map cmd_text	Routes to the right parser based on variable count (see below)
7. Resolve objects	Runs findByNameInLoc on $target and $second (like perl's get_resolve)