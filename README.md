# TaskFlow — Task Management App

A polished, responsive task manager built with HTML, CSS and vanilla JavaScript. No build step, framework, API key, or database setup is required. Tasks are stored in the browser using `localStorage`.

## Features

- Create tasks with a title, optional description, priority, status and due date
- Edit and delete tasks
- Change status directly from the list or mark a task complete
- Filter by status (All, To do, In progress, Completed)
- Filter by priority and search titles/descriptions
- Sort by due date, recently added, priority, or title
- Summary cards for total, in-progress, completed and overdue tasks
- Overdue and due-today indicators
- Confirmation before destructive actions
- Responsive desktop and mobile layout
- Light/dark theme toggle
- Automatic browser-local persistence
- Semantic form labels, keyboard escape to close modal, and accessible status messages

## Run locally

1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Create and manage tasks. Data is saved in that browser on that device.

For a local web server, run from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a new public GitHub repository, for example `taskflow-task-manager`.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. After deployment, the site URL will be shown in the Pages settings.

## Notes / limitations

- This is a frontend-only assignment implementation; it does not include a shared backend, login, or cross-device sync.
- Tasks remain in the current browser's local storage. Clearing browser site data removes them.
- Google Fonts are loaded remotely; the app otherwise works without a build pipeline.
