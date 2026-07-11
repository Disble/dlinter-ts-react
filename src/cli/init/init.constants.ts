/** Default lefthook pre-commit gate scaffolded into consumer projects. */
export const lefthookTemplate = `pre-commit:
  parallel: false
  jobs:
    - name: lint
      run: npx eslint .

    - name: typecheck
      run: npx tsc --noEmit

    - name: test
      run: npm run test
`;
