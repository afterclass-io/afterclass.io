/**
 * Backwards-compat alias — `withMcpWidget` was renamed to `withMcpView` in the v2 migration
 * (`resources/*\/widget.tsx` → `views/*\/view.tsx`). Re-export so external Storybook links
 * bookmarking the old import path keep working.
 */
export { withMcpView as withMcpWidget, type McpViewParams as McpWidgetParams } from "./withMcpView";
