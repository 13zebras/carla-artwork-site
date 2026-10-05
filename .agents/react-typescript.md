# AGENTS.md

## Naming conventions

- **React component files MUST use PascalCase**, matching the component they export (e.g. `ExerciseWorkbench.tsx`, `LessonEditorSplit.test.tsx`).
- **TypeScript/JavaScript files use camelCase** (e.g. `blockChecks.ts`, `exerciseDrafts.ts`), unless it makes sense to use another case:
  - **Route files** must match their URL segments (e.g. `sign-in.$.tsx`, `__root.tsx`).
  - **Generated files** (e.g. Drizzle migrations, `routeTree.gen.ts`) keep whatever case their tooling produces.
  - **snake_case or kebab-case** may be appropriate for config files or scripts consumed by external tooling that expects them.
- Test files live next to the code they test, named `<FileName>.test.<ext>`.

## TypeScript/JavaScript

1. Prefer TypeScript for new code unless the user or repo clearly requires JavaScript.
2. Use `pnpm` for package management unless the repo explicitly requires another tool.
3. Use `pnpm run` for scripts.
4. Use `bun` or `deno` only when explicitly requested or when the repo is already Bun-based or deno-based.
5. NEVER use nested ternaries.
6. Early returns are the preferred pattern instead of if-then-else.

## React

- Try to keep JSX as free of logic as possible. Put logic in functions, and if they need to only render one time, place the function outside of the component body.
- useEffect is a code smell. Find an alternative to using one. If you must use one, and at times you will, you have to justify the need for one to the user. Consult React documentation via context7 mcp or react.dev.
- Ternaries can be used in the return JSX, but NEVER nested.

## PNPM install and PNPM add

- NEVER RUN PNPM INSTALL OR PNPM ADD.
- If you need to install a package, ask the user to do it. Give him the correct commands to run for you.
- You can always run scripts with `pnpm run`

## Components / Hooks

- Always use hooks from the installed `usehooks-ts` package if possible.
