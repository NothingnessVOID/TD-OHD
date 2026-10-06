# Navigation UI primitives

Baseline: `fix/variable-copy-localization-v1` / `06ee7ea880e7e182a58f2e58e66f468f8ea7b399`.

- `.ui-back-button` shares existing `.gate-detail-back` appearance. Legacy selectors and Detail navigation placement remain unchanged; Reference keeps sticky desktop / static mobile positioning, history and focus restoration.
- `.ui-icon-button` shares existing `.gate-detail-close` appearance. Features own sizing and positioning. Gate / Knowledge Close, Skin Close and Sync Close are 32px. Header and Timeline mobile menu controls are 36px; Timeline uses its own surface / border tokens through primitive CSS variables.
- Sync anonymous, signed-in and local-account headings include a close button. Delegated click and capturing Escape dismiss the popover and restore focus to the existing Sync button. Opening logic is unchanged.
- No Knowledge / Reference prose, body layout, previous/next controls, primary/secondary buttons, chart or engine changes.

## Minimal manual checks

Preview port 5211: Reference 10-34 → Gate 10 → Back returns to 10-34; pill border/background visible, sticky position retained. Knowledge Type → introduction → Back returns to Generator; Close dismisses the dialog. Skin opens and closes. Mobile Header opens navigation; Timeline Exit remains a 36px circle and opens the existing mobile navigation. Gate 23 opens and Close dismisses it. No obvious position disorder observed.

An isolated temporary Vite preview on port 5212 enabled Sync against its own localhost origin only, allowing anonymous UI checks without logging in or sending data. × and Escape close, and Sync reopens. Signed-in/local headings reuse the same markup helper; live account/login flows were not exercised. Temporary preview was stopped after verification.

No complete unit / E2E / responsive suite / build executed, as requested. No merge or deployment. The named Back / Close / Exit controls all share the primitives (legacy Detail class selectors remain aliases). Unrelated Share/More/theme/action controls remain outside scope.
