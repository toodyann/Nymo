# Styles Architecture

## Entry
- `main.css`  
  Single stylesheet entry with ordered `@import` for all layers.
- `auth-main.css`  
  Separate auth-route entry (`/auth/`) with only base + auth page styles.

## Base Layer
- `base/fonts.css`  
  Global font imports.
- `base/fonts-logo.css`  
  Logo font import.
- `base/variables.css`  
  CSS variables and design tokens.

## Layout Layer
- `layout/layout.css`  
  Root app layout and structural containers (`layout-parts/*`).
- `layout/sidebar.css`  
  Sidebar and navigation shell styles (`sidebar-parts/*`).
- `layout/responsive.css`  
  Media queries and adaptive overrides (`responsive-parts/*`).

## Feature Layer
- `features/chat.css`  
  Chat-specific structural styles.
- `features/messages.css`  
  Message bubble/content/meta styles (`messages-parts/*`).

## UI Layer
- `ui/components.css`  
  Shared UI component styling.
- `ui/modal.css`  
  Dialog/menu/overlay styling (`modal-parts/*`).
- `ui/settings.css`  
  Settings/profile/shop/game section styles (`settings-parts/*`).

## Notes
- Keep import order in `main.css` stable to avoid regressions.
- Keep part import order stable inside each entry file (for example `ui/settings.css`).
- Add new tokens only in `base/variables.css`.
- Place page/feature-specific rules under `features/*` or `ui/*` by ownership.
- Place isolated route styles under `pages/*` (e.g. auth).
