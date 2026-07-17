# Enforce project-defined architecture boundaries

`dlinter-ts-react` supports project-specific boundaries today through standard ESLint flat-config blocks. Spread `createRecommendedConfig()` first, then append your project rules so the later entries win when rules overlap.

```js
import { createRecommendedConfig } from 'dlinter-ts-react';

export default [
  ...createRecommendedConfig(),
  // Project-defined boundary blocks go here.
];
```

There is currently no typed `createRecommendedConfig` option for general module boundaries or capability ownership. Do not configure nonexistent `capabilities` or `importRestrictions` options.

Because later matching blocks override earlier rule entries, use each block's `files` and `ignores` to choose its exact scope. That includes tests: an appended rule applies to matching test files unless your block excludes them.

## Restrict one module from another

The bundled `import-x` plugin already provides `import-x/no-restricted-paths`. In each zone:

- `target` identifies the files that are doing the importing.
- `from` identifies the dependency path those files must not import.
- `basePath` is the directory from which both paths are resolved; `.` means the ESLint working directory.

For example, prevent the `orders` module from depending on `catalog`:

```js
import { createRecommendedConfig } from 'dlinter-ts-react';

export default [
  ...createRecommendedConfig(),
  {
    name: 'project/module-boundaries',
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          basePath: '.',
          zones: [
            {
              target: './src/modules/orders',
              from: './src/modules/catalog',
              message: 'Orders must not depend on the catalog module.',
            },
          ],
        },
      ],
    },
  },
];
```

This reports imports whose resolved file is under `src/modules/catalog` when the importing file is under `src/modules/orders`. Add another zone for each forbidden direction; a zone is one-way, not reciprocal.

## Give one layer exclusive ownership of external APIs

Use a dedicated layer such as `src/infrastructure/external-api/` as the capability owner. Apply the restrictions to production source, then exclude that permitted layer with the config block's local `ignores`.

```js
import { createRecommendedConfig } from 'dlinter-ts-react';

export default [
  ...createRecommendedConfig(),
  {
    name: 'project/external-api-ownership',
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/infrastructure/external-api/**/*.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
      'test/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message: 'Import axios only from the external API layer.',
            },
            {
              name: '@stripe/stripe-js',
              message: 'Import the vendor SDK only from the external API layer.',
            },
          ],
          patterns: [
            {
              group: ['axios/*', '@stripe/stripe-js/*'],
              message: 'Import client and SDK subpaths only from the external API layer.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Call fetch only from the external API layer.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'globalThis',
          property: 'fetch',
          message: 'Call globalThis.fetch only from the external API layer.',
        },
        {
          object: 'window',
          property: 'fetch',
          message: 'Call window.fetch only from the external API layer.',
        },
        {
          object: 'self',
          property: 'fetch',
          message: 'Call self.fetch only from the external API layer.',
        },
      ],
    },
  },
];
```

This configuration is compatible with the full `eslint >=9` peer range. `no-restricted-globals` catches the unqualified global call `fetch(...)`; `no-restricted-properties` catches the named properties `globalThis.fetch`, `window.fetch`, and `self.fetch`. The import rule blocks static `axios` and `@stripe/stripe-js` imports, including subpaths.

The four test patterns mirror the preset's production-test exclusions. Remove them if capability ownership should also be enforced in tests. Replace or extend the import and property entries with every client, SDK, and global your project treats as an external-communication capability.

## Preserve Clean or Hexagonal dependency flow

The dependency direction is the important part:

```text
application ──depends on──> domain port <──implements── infrastructure adapter
       composition root imports both and wires them together
```

A minimal file layout makes those roles visible:

```text
src/
├── orders/
│   ├── domain/payment.port.ts
│   └── application/create-place-order.ts
├── infrastructure/external-api/http-payment.adapter.ts
└── app/bootstrap.ts
```

The domain owns the port:

```ts
// src/orders/domain/payment.port.ts
/** Port through which the application charges an order. */
export interface PaymentPort {
  charge(orderId: string): Promise<void>;
}
```

The application depends on the port, not on HTTP:

```ts
// src/orders/application/create-place-order.ts
import type { PaymentPort } from '../domain/payment.port';

/** Builds the place-order use case against an injected payment port. */
export function createPlaceOrder(payment: PaymentPort) {
  return (orderId: string): Promise<void> => payment.charge(orderId);
}
```

The infrastructure adapter implements the port:

```ts
// src/infrastructure/external-api/http-payment.adapter.ts
import type { PaymentPort } from '../../orders/domain/payment.port';

/** Sends payment commands through the external HTTP API. */
export class HttpPaymentAdapter implements PaymentPort {
  async charge(orderId: string): Promise<void> {
    await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }
}
```

Only the composition root knows both the use case and the concrete adapter:

```ts
// src/app/bootstrap.ts
import { createPlaceOrder } from '../orders/application/create-place-order';
import { HttpPaymentAdapter } from '../infrastructure/external-api/http-payment.adapter';

/** Application service assembled with its production payment adapter. */
export const placeOrder = createPlaceOrder(new HttpPaymentAdapter());
```

Enforce that direction with path zones:

```js
{
  name: 'project/clean-architecture-flow',
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'import-x/no-restricted-paths': [
      'error',
      {
        basePath: '.',
        zones: [
          {
            target: './src/orders/domain',
            from: [
              './src/orders/application',
              './src/infrastructure',
              './src/app',
            ],
            message: 'The domain must not depend on outer layers.',
          },
          {
            target: './src/orders/application',
            from: ['./src/infrastructure', './src/app'],
            message: 'Application code must depend on ports, not adapters.',
          },
          {
            target: './src/infrastructure',
            from: ['./src/orders/application', './src/app'],
            message: 'Adapters implement domain ports; they do not call application or composition code.',
          },
        ],
      },
    ],
  },
}
```

Append this object after `...createRecommendedConfig()` just like the complete examples above. The composition root is intentionally not a `target`, so it can import the application and infrastructure layers to assemble the runtime graph.

## Know the enforcement boundary

Linting governs the imports, globals, and resolved dependency paths that you enumerate. It does not infer that arbitrary code performs network I/O or prove architectural intent through semantic or runtime analysis.

In particular, add coverage for every capability your project permits: alternative clients, SDK packages, browser globals, local wrappers, dynamic `import()`, and CommonJS `require()` may need additional restrictions. A custom rule is justified only when the architecture contract cannot be expressed by ESLint core or an already-bundled plugin.

## Verify the boundary

Create one intentional violation outside the permitted layer and lint that file:

```ts
// src/orders/application/invalid-example.ts
import axios from 'axios';

void axios.get('/api/orders');
```

```sh
npx eslint src/orders/application/invalid-example.ts
```

The result should identify `no-restricted-imports`. Repeat with a forbidden cross-module import to see `import-x/no-restricted-paths`, and with `fetch('/api')` to see `no-restricted-globals`. Remove the temporary file after confirming the gate.
