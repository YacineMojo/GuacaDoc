# Design notes

Kept so a later pass does not undo a decision without knowing why it was made.

## The metaphor is the system

An avocado has flesh and a stone. Guacamole keeps the flesh, loses the stone,
and does not turn back into an avocado. Every visual decision below comes from
that, rather than from a mood board.

- **Green is what passes.** Shown values, allowed calls, the served portion of
  the file.
- **Brown is the stone.** Withheld values, declined calls, values never served.
- **There is no red anywhere.** A refusal is the policy working, not an error,
  and colouring it like a failure would teach people to dismiss it.

## Type carries the three worlds

| Face | Role | Why |
|---|---|---|
| Instrument Sans | the product speaking | a grotesque with enough character to avoid the default SaaS voice, still plain enough for a contract |
| Newsreader | the document you read | your file is a document, so it is set like one |
| IBM Plex Mono | what the machine sees | the agent's view, tokens, byte counts, the record |

The document pane and the agent pane use different faces on purpose. Which
world you are looking at should be legible before you read a word.

## The signature

The disclosure meter is a halved avocado seen in section. The flesh fills with
served guacamole as the file is served, so drawing and percentage read the
same direction. It measures and does not ration: nothing caps how much an agent
may read, because a document whose names are already gone is not made safer by
arriving in smaller pieces. The stone at the centre never fills and carries the count of
values withheld outright.

It is an instrument with two readings, not an illustration: the one part of the
document that is never served is drawn as the one part of the picture that
never changes.

## The mark has no face

No eyes, no smile, no limbs. The subject is unusual enough on its own; treating
it as a standards pictogram is what separates an offbeat brand from a student
project. At 22 pixels the mark is two shapes only, silhouette and stone,
because a mark that needs a third colour to read is not a mark.

## A mark means something was done

Filled marks mean the text was changed on the way out: flesh green for a token,
stone brown for a withheld value. A value the user chose to let through gets a
dotted underline and nothing else.

The first version highlighted let-through values the same way as protected
ones, and the first question anyone asked was why some highlights did not
substitute anything. A highlight that protects nothing devalues every highlight
next to it.

## The marking bar does not move

Classifying a selection used to happen in a popover next to the selection. It
failed twice over: it missed any selection that ended outside the text pane,
because the mouseup never reached the pane, and it covered the words you were
about to classify. It now lives at the left of the top bar, always present,
disabled until there is something to mark. Slower to reach, and it never
disappears when you need it.

## The two documents are never stacked

The product is a comparison, and a comparison you have to scroll between is not
one. The panes sit side by side at every width and scroll together on ratio
rather than pixel offset, since substitution changes how long the text is.

## Rejected

- **A dark control-desk theme.** It was the first direction and it worked, but
  near-black plus one bright accent is where this kind of tool always lands.
- **Guacamole vocabulary in the interface.** The brand is offbeat; the labels
  are not. Nothing in the workspace says "guac". The counter says "Of the file,
  served", the log says "truncated".
- **A perforated ticker tape.** Good object, wrong world once the palette went
  light. The strip kept the behaviour and dropped the costume.
- **Numbered markers everywhere.** Kept in exactly one place, the three steps
  on the front page, because that is a real sequence.

## A reveal is a moment, not a state

The key panel and the decoded answer are the two places where a real name is
deliberately put back on screen. Both are shown by a person, on purpose, and
both used to stay shown until that person remembered to put them away.

They now expire: a countdown, plus the window losing focus, plus the page
becoming hidden. The remaining seconds are on the button, because a secret that
vanishes without warning teaches people to reveal it again straight away and
leave it up, which is worse than never having hidden it.

What is never thrown away is what the user typed. The pasted answer is tokens,
it is not sensitive, and destroying someone's input to protect something they
restore with one click would trade a real loss for a cosmetic gain.

Then an agent pressed the button. Asked for the bank details of a contract it
had only ever seen in tokens, it took the cursor, clicked Reveal, and read the
key off the table. The withheld IBAN survived, because a blocked value is an
absence and there was nothing on the page to read, but the pseudonyms did not.

So both panels now refuse to open at all while an agent is attached. The rule
is written against attachment and not against the click, because the click is
not knowable: these agents drive a real cursor, the event is trusted, and a
page cannot tell that hand from yours. Attachment is knowable, the browser says
so. The rejected version was a warning, which is what the panel used to show,
and a warning is only ever as strong as the person who is not there to read it.
