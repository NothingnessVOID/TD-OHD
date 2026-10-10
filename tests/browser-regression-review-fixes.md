# Independent review validity fixes

Only people-editor-e2e.mjs and review-round2-e2e.mjs were changed and executed. Product source remains unchanged. Chromium, E2E_URL=http://127.0.0.1:19963, 120s per-script cap. Both PASS in artifacts/browser-regression/independent-review-fixes/results.json.

People editor (4s): route matches URL pathname, including Vite ?t queries. It asserts exactly one declaration match, changed response source and at least one intercepted response. The wrapper blocks First until the real Final computation completes, recording actual starts/completions. Asserted order: ["First:start","Final:start","Final:complete","First:complete"]. After both computations and two animation frames, the original assertion verifies final chart birthTime 23:00. All remaining editor assertions are retained.

Mobile review (11s): at 471px, actual #reference-mobile-detail navigation Back/Close, detail label and title must all be visible, have positive width/height and lie within the viewport. Controls must not overlap each other, and both must precede label/title. Observed Back rectangle x350.34375 y304.484375 w68.65625 h32; Close x427 y304.484375 w32 h32; label y352.484375 h17.59375; title y377.078125 h38.390625. Hidden reference-back is no longer measured. All other review checks remain.

Logs:
- artifacts/browser-regression/independent-review-fixes/people-editor-e2e.mjs.log
- artifacts/browser-regression/independent-review-fixes/review-round2-e2e.mjs.log

SHA-256 after passing, no subsequent test edits:
- people-editor-e2e.mjs: aec5842b63fbccd0b117b46367ef295efef7508ebd0091651552cbb971ec7f42
- review-round2-e2e.mjs: dd9c2af4e9019a78a034b568d262f4dda82bd9af0f0327e6f097d5de7ed31166

Only the corresponding two hash entries and evidence rows were updated. No broad rerun, build or product changes.
