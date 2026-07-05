# Project Agent Instructions

## shadcn/ui components

All shadcn-style components in `src/components/ui` must use Base UI primitives from `@base-ui/react`.

Do **not** use Radix primitives for shadcn components. Do **not** add new imports from `radix-ui` or `@radix-ui/*` in `src/components/ui`.

When adding or updating a shadcn component:

1. First verify the component is used in the project. If unused, ask whether to convert, remove, or defer it.
2. Obtain the official shadcn Base UI source for that component from the shadcn website/registry.
3. Use the official Base UI structure as the baseline.
4. Preserve this project’s local styling changes, variants, props, and wrapper APIs where possible.
5. Convert Radix-specific APIs to Base UI APIs, for example `asChild`/`onSelect` patterns may need Base UI `render`/`onClick` equivalents.
6. Run typecheck and lint after each component change.
