# 11 Release Notes

What changed in each vault release, newest first. Open questions about these changes are in [[06 Addenda]].

> [!note]- 2026-11-14e · English cognates, Greekquent Cousins game (Student Layout 1.9)
> - **English cognates:** 533 word notes now show English cousins in the info line, for example χρόνος: chronic, chronology, synchronize. They are memory hooks, not translations. See the note in [[00 Greekquent Index]].
> - **Look up by cousin:** typing an English cousin in Look up a word finds the Greek word, marked "(you typed a cousin: chronic)". Real meanings still come first, so "hospital" shows νοσοκομείο before σπίτι.
> - **Greekquent Cousins:** a new two-player or solo game for spotting cognates, linked in [[09 Class Games and App Ideas]].
> - **Safer updates:** every downloaded file is checked against its fingerprint. Right after a publish, GitHub can still hand out old copies for about 5 minutes; those files are skipped and the student is told to tap Update vault again shortly. A missing file no longer stops the update with an error.

> [!note]- 2026-11-14c · Ask on video, Student questions (Student Layout 1.8)
> - **Ask on video:** camera button, **Video** in the word graph, **Ask on video instead** in Ask the group, or right-click a note. Records up to 45 seconds with the front camera (about 9 MB), shows a countdown, and stops by itself. Play it back, record again if needed.
> - **Permissions:** first name, plus two tick boxes: public question library, and promo videos. Both go in the message so the teacher knows what the student agreed to.
> - **Share to GroupMe:** the share menu opens with the video attached and the message filled in (the message is also copied, in case GroupMe drops it). On a computer the video is downloaded instead. On a phone that can't attach files, it is saved to My Work/Video questions.
> - **No in-app camera?** "Use phone camera" records with the camera app instead; clips over 45 seconds or 50 MB are refused, so they fit GroupMe.
> - **Student questions:** answered questions appear at the end of the matching word note, newest first. Question rolls straight into the answer. They stream from the online library, so they take no space on the device.
> - **12 Student Questions:** a searchable list of every question, and a link to the [online library](https://gtkd321.github.io/greekquent-questions/).

> [!note]- 2026-11-14b · Look up a word, Ask the group (Student Layout 1.7)
> - **Look up a word:** magnifying-glass button. Type English or Greek. Searches the 1,500 first, accent-free, including the verb forms in the conjugation tables (θέλαμε finds θέλω). Tap **Word graph** to open the word.
> - **Guess first:** a tick box that hides the answer until the student says a guess and taps Reveal.
> - **Bonus words:** anything outside the 1,500 opens in Google Translate (free, no account).
> - **Words I looked up:** every look-up is saved by date in My Work, linked to the word note, so it can come back as review.
> - **Ask the group:** two-people button, the **Ask** button in the word graph, or right-click a note. Writes "Question about νερό (water, first seen in Lesson 1):", the student's question, and a link to the note on GitHub that opens on any phone. On a phone it opens the share menu (pick GroupMe); on a computer it copies the message to paste in.
> - **Fix:** a new word graph tab could open centered on the current note instead of the chosen word.

> [!note]- 2026-11-14 · My Work, Send homework, Update vault (Student Layout 1.6)
> - **My Work folder:** Homework and My Notes. Students can type here; the rest of the vault stays read-only. Updates never change this folder.
> - **Send homework:** paper-plane button. Texts the newest "## " section of the homework note to the teacher. Works on iPhone and Android.
> - **Update vault:** circular-arrows button. Downloads only the files that changed from the Greekquent GitHub repository, removes files the teacher deleted, and never touches My Work or the student's window layout. At startup Obsidian checks quietly and shows a tap-to-install notice when an update is ready.

> [!note]- 2026-11-14 · Share feedback (Student Layout 1.5)
> - **Share feedback button:** the speech-bubble icon in the left toolbar, and a link at the top of the Index, open Messages addressed to the teacher with "Greekquent feedback (vault of 2026-11-14):" filled in. The student types and taps Send.

> [!note]- 2026-11-14 · Fixes (Student Layout 1.4.1)
> - **Graph no longer drifts to the upper left on phones and tablets.** The camera now uses the same pixel scale as Obsidian's graph on high-resolution screens.
> - **Touch and hold removed.** A click or tap always moves the graph to the word. Open a note with the Open note button.
> - **Bookmarks no longer pops open at startup.** When Obsidian starts from its default layout (new vault or new device), Search and Bookmarks are moved to the right sidebar quietly instead of opening it.

> [!note]- 2026-11-14 · Word graph: native motion, Word web controls (Student Layout 1.4)
> - **Full screen, no settings panel:** the Filters, Groups, Display and Forces box in the upper right is hidden, and the sidebars fold away when the graph opens.
> - **Click a word** to move the graph to it. The camera follows it to the middle while Obsidian's own motion carries the other words.
> - **Open a word's note:** use the Open note button in the toolbar.
> - **Toolbar from the Word web:** back and forward (also the arrow keys and mouse side buttons), the word with its English, pronunciation and rank, Hear it, Open note, and a trail of the last words you visited.
> - **Tab name:** "Word graph: <word>".

> [!note]- 2026-11-14 · Calm native graph is the default (Student Layout 1.3)
> - **Open word graph:** the branching button in the left toolbar now opens Obsidian's own local graph full-screen for the current word, instead of the Word web. Right-click a word note for the same option.
> - **Calmer forces:** center 0.9, repel 3, link 1, distance 120 (Obsidian's defaults: 0.52, 10, 1, 250). Less push after a touch, so it settles sooner. It still moves a little, because Obsidian has no setting to stop the drift.
> - **Same filter as before:** only a word's "Often appears with" partners, colored by frequency band. The sidebar graph uses the same calm settings.
> - **Whole-vault graph:** still off.
> - **Word web:** still available as the command "Open word web (custom view)".

> [!note]- 2026-11-14 · Word web, second version (Student Layout 1.2)
> - **Movement:** words and lines now glide together in one smooth move that stops exactly in place. Before, the words slid and the lines jumped.
> - **The word you came from** lands on the side you came from, so each step reads as one continuous move.
> - **Pan and zoom:** drag the background to pan; scroll or pinch to zoom; double-click empty space to re-center.
> - **Drag a word** to move it. It stays where you drop it.
> - **Hover** over a word to highlight its connections and dim the rest.
> - **Reduce motion:** if the device has "reduce motion" turned on, moves become quick fades.
> - **Nothing moves when you aren't touching it.**

> [!note]- 2026-11-14 · Word web, first version (Student Layout 1.1)
> - **New full-screen Word web:**
>   - Shows the current word, its eight "Often appears with" partners, and two partners of each.
>   - Clicking a word moves the web to it.
>   - Buttons: back, forward, a trail of the words you visited, Hear it and Open note.
> - **Ways to open it:** the branching icon in the left toolbar, or right-click a word and choose "Explore in word web."

> [!note]- 2026-11-14 · Student view, simplified (Student Layout 1.1)
> - **Whole-vault graph removed.** Its toolbar button is hidden, including in the phone menu.
> - **Local graph in the right sidebar:** shows only a word's partners, colored by frequency band from green (common) to dark red (rare).
> - **Hidden:**
>   - the edit switch, new-note and new-tab buttons, the status bar, and tag lists at the top of notes
>   - unused tools: canvas, daily notes, templates, bases, tag list and outgoing links
> - **Left sidebar:** shows only Files. Search, bookmarks, backlinks and the outline always open on the right.

> [!note]- 2026-11-14 · Read-only and locked plan
> - **Read-only:** notes open in Reading view through the Read Only View plugin. To edit, run "Disable read-only mode" from the command palette.
> - **Locked plan:** the business plan is locked with Meld Encrypt. Students see the ad version, [[10 Greekquent Groups-student|Greekquent Groups]].
> - **Addenda:** added A6 to A9.
