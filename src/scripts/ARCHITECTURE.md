# Scripts Architecture

## Entry
- `bootstrap.js`  
  Single startup point: mounts app shell and creates `window.app`.
- `auth/auth-page.js`  
  Auth route logic (`/auth/`): login/register, backend requests, session handling.

## App Layer
- `app/ChatApp.js`  
  Root application class with state and mixed-in behavior.
- `app/mixins/`  
  Domain behavior split by responsibility (`core`, `interaction`, `messaging`, `features`, `profile`, `shop`, `games`, etc.).
- `app/mixins/index.js`  
  Barrel export for all mixins.

## UI Layer
- `ui/init/mount-app-shell.js`  
  Builds and mounts static app HTML shell.
- `ui/templates/settings-templates.js`  
  Settings/profile section templates.

## Shared Layer
- `shared/helpers/ui-helpers.js`  
  Reusable UI helpers (alerts, confirm, formatting, escaping, cursor insert).
- `shared/gestures/swipe-handlers.js`  
  Reusable mobile swipe handlers.
- `shared/auth/auth-session.js`  
  Auth session storage, route redirects, API URL helper.

## Notes
- Keep business logic in `app/mixins`.
- Keep DOM shell/template generation in `ui/*`.
- Keep utility functions in `shared/*`.
- Prefer importing from `app/mixins/index.js` in root app layer.
