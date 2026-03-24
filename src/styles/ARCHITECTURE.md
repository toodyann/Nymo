# Styles Architecture

## Entry
- `main.css`  
  Single stylesheet entry with ordered `@import` for all layers.

## Base Layer
- `base/fonts.css`  
  Global font imports.
- `base/fonts-logo.css`  
  Logo font import.
- `base/variables.css`  
  CSS variables and design tokens.

## Layout Layer
- `layout/layout.css`  
  Root app layout and structural containers.
- `layout/sidebar.css`  
  Sidebar and navigation shell styles.
- `layout/responsive.css`  
  Media queries and adaptive overrides.

## Feature Layer
- `features/chat.css`  
  Chat-specific structural styles.
- `features/messages.css`  
  Message bubble/content/meta styles.

## UI Layer
- `ui/components.css`  
  Shared UI component styling.
- `ui/modal.css`  
  Dialog/menu/overlay styling.
- `ui/settings.css`  
  Settings/profile/shop/game section styles.

## Notes
- Keep import order in `main.css` stable to avoid regressions.
- Add new tokens only in `base/variables.css`.
- Place page/feature-specific rules under `features/*` or `ui/*` by ownership.
