import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import { requireSpyRestore } from '../require-spy-restore/index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('require-spy-restore', requireSpyRestore, {
  valid: [
    {
      name: 'a spy satisfied by a top-level afterEach calling vi.restoreAllMocks()',
      code: `
        import { afterEach, it, vi } from 'vitest';

        vi.spyOn(console, 'error');

        afterEach(() => {
          vi.restoreAllMocks();
        });

        it('logs nothing unexpected', () => {});
      `,
    },
    {
      name: 'a spy satisfied by an afterEach in the SAME describe scope',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        describe('season client', () => {
          afterEach(() => {
            vi.restoreAllMocks();
          });

          it('loads seasons', () => {
            vi.spyOn(seasonClient, 'load');
          });
        });
      `,
    },
    {
      name: 'a spy satisfied by an afterEach in an ancestor describe scope',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        describe('season client', () => {
          afterEach(() => {
            vi.restoreAllMocks();
          });

          describe('load', () => {
            it('loads seasons', () => {
              vi.spyOn(seasonClient, 'load');
            });
          });
        });
      `,
    },
    {
      name: 'assumeGlobalRestore declares the Vitest config restoreMocks: true globally',
      options: [{ assumeGlobalRestore: true }],
      code: `
        import { it, vi } from 'vitest';

        it('logs nothing unexpected', () => {
          vi.spyOn(console, 'error');
        });
      `,
    },
    {
      name: 'a file with no spies and no afterEach is outside the contract',
      code: `
        import { it } from 'vitest';

        it('adds numbers', () => {
          expect(1 + 1).toBe(2);
        });
      `,
    },
    {
      name: 'a spy and its restoreAllMocks afterEach inside the SAME tagged-template describe.each suite',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        describe.each\`
          label
          \${'A'}
        \`('season client $label', () => {
          afterEach(() => {
            vi.restoreAllMocks();
          });

          it('loads seasons', () => {
            vi.spyOn(seasonClient, 'load');
          });
        });
      `,
    },
    {
      name: 'a top-level afterEach covering a tagged-template describe.each suite',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        afterEach(() => {
          vi.restoreAllMocks();
        });

        describe.each\`
          label
          \${'A'}
        \`('season client $label', () => {
          it('loads seasons', () => {
            vi.spyOn(seasonClient, 'load');
          });
        });
      `,
    },
  ],
  invalid: [
    {
      name: 'a spy on an ambient global with no afterEach anywhere in the file',
      code: `
        import { it, vi } from 'vitest';

        it('logs nothing unexpected', () => {
          vi.spyOn(console, 'error');
        });
      `,
      errors: [{ messageId: 'unsatisfiedSpy' }],
    },
    {
      name: 'a per-spy mockRestore() does not satisfy the blanket-restore contract',
      code: `
        import { afterEach, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        it('loads seasons', () => {
          const loadSpy = vi.spyOn(seasonClient, 'load');

          afterEach(() => {
            loadSpy.mockRestore();
          });
        });
      `,
      errors: [{ messageId: 'unsatisfiedSpy' }],
    },
    {
      name: 'a restoreAllMocks afterEach in a SIBLING describe does not satisfy a spy in another describe',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        describe('season client A', () => {
          it('loads seasons', () => {
            vi.spyOn(seasonClient, 'load');
          });
        });

        describe('season client B', () => {
          afterEach(() => {
            vi.restoreAllMocks();
          });

          it('is unrelated', () => {});
        });
      `,
      errors: [{ messageId: 'unsatisfiedSpy' }],
    },
    {
      name: 'a spy in a tagged-template describe.each suite with the restoreAllMocks afterEach in a SIBLING tagged-template describe.each suite',
      code: `
        import { afterEach, describe, it, vi } from 'vitest';
        import * as seasonClient from './season-client';

        describe.each\`
          label
          \${'A'}
        \`('season client $label', () => {
          it('loads seasons', () => {
            vi.spyOn(seasonClient, 'load');
          });
        });

        describe.each\`
          label
          \${'B'}
        \`('season client $label', () => {
          afterEach(() => {
            vi.restoreAllMocks();
          });

          it('is unrelated', () => {});
        });
      `,
      errors: [{ messageId: 'unsatisfiedSpy' }],
    },
  ],
});
