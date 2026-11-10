<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0a28082c-8651-4403-a001-297fb49c3f9a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Pages and navigation

The app uses Vite + React and the browser History API. `src/main.tsx` loads
`src/app/App.tsx`, which owns the shared layout, stored data, actions and dialogs.
`src/app/AppPages.tsx` selects a page from `src/app/pages/`; reusable UI stays in
`src/components/`. URL parsing and navigation live in `src/app/router/`.

| URL | Page |
| --- | --- |
| `/private` | Ghi chú của tôi |
| `/company` | Tài liệu công ty |
| `/templates` | Mẫu ghi chú |
| `/unclassified` | Chưa phân loại (notes without a folder) |
| `/private/unclassified` | Chưa phân loại — tài liệu của tôi |
| `/company/unclassified` | Chưa phân loại — tài liệu công ty |
| `/recent` | Gần đây — documents ordered by latest update |
| `/favorites` | Yêu thích |
| `/library` | Thư viện |
| `/shared` | Được chia sẻ |
| `/meetings` | Ghi chú cuộc họp |
| `/trash` | Thùng rác |
| `/documents/:documentId` | Editor for an individual document |
| `/folders/:folderId` | Documents in an individual folder |

`/` and the old `/Notes/` address resolve to `/private`. Old `/#doc=...` shared
links resolve to the document's new URL. Unknown addresses and missing or deleted
documents/folders display a recovery page. Navigation supports direct links,
refresh, Back and Forward. Creating a note opens its own document URL.

Data remains in the existing browser local storage. A document link requires that
document to exist in the browser's data; routing does not add a remote backend.

For production hosting, serve `dist/` and configure the server's SPA fallback to
`index.html` for page URLs, while serving assets normally. Vite dev and preview
already provide this fallback.

## Checks

- `npm run lint` — TypeScript validation.
- `npm run build` — production build.
- `npm test` — route resolution, History API, page filtering, actual React DOM
  navigation in jsdom, template creation, pending-edit persistence and file import.

The jsdom tests exercise application events and DOM state; they do not replace
visual checks in a browser.

## Appearance

Open the avatar menu, choose **Giao diện**, then select **Mặc định**,
**Giao diện 1** (Blue & Yellow), or **Giao diện 2** (Graphite & Champagne).
The selection applies immediately and persists in local storage under
`misa_ui_theme`. The default retains the original palette and layout.
Theme colors live in `src/app/theme/themes.css`; shared components use its CSS
variables. Graphite uses a dark sidebar/header and a light reading surface.

## Nested folders

Folders support optional `parentId`; existing folders without it remain at the root.
Use **+** on a folder to immediately create a child in the same space, without a
dialog. The new folder is saved with a unique default name and its name can be
edited inline: Enter or blur saves, Escape keeps the saved default name. The sidebar renders the
tree recursively and expands the ancestors of newly created or selected folders.
Folder pages show child folders, and import/move menus show their full paths.

Each folder has a delete button. Deletion requires confirmation; Cancel, X and
Escape leave the data unchanged. Only the selected folder is removed: its direct
child folders and notes move to its parent, or to the space root when no parent
exists. Descendants and note contents are preserved.
