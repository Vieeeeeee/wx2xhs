Goal (incl. success criteria):
- Fix card preview image sizing: at 100% image equals text area width (~880px); slider/drag adjusts 20%–100%.

Constraints/Assumptions:
- Client-side Vite React + TS; Tailwind for styles.
- Network access restricted; avoid new deps.

Key decisions:
- Root cause likely global `.card-preview .card-text img { max-height: 520px; }` shrinking width for tall images (replaced element sizing), causing side whitespace even at 100%.

State:
- Done:
  - Located image rendering/resizing in `src/components/CardPreview.tsx` (`ResizableImage`).
  - Identified max-height CSS shrink issue for tall images.
  - Ran `npm run lint` and `npm run build` (both OK).
- Now:
  - Manual UI check pending (preview + export rendering).
- Next:
  - Manual UI check: insert a tall portrait image and confirm 100% fills text width (~880px) and drag handle works.

Open questions (UNCONFIRMED if needed):
- None.

Working set (files/ids/commands):
- `http://CONTINUITY.md`
 - `src/components/CardPreview.tsx`
 - `src/App.tsx`
 - `npm run lint`
 - `npm run build`
