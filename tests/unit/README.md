# Unit Tests

Unit tests for individual modules and functions in isolation.

## Guidelines

- Test single units of functionality (functions, classes, methods)
- Mock external dependencies
- Fast execution (< 100ms per test)
- High code coverage target (80%+)

## Structure

Organize tests to mirror the `src/` directory structure:

```
tests/unit/
  ├── types/
  │   └── result.test.ts
  ├── connectivity/
  │   ├── connector.test.ts
  │   └── auth-manager.test.ts
  └── analysis/
      ├── performance/
      └── security/
```

## Example

```typescript
import { describe, it, expect } from 'vitest';
import { createMockResult, expectSuccess } from '../helpers';

describe('MyModule', () => {
  it('should return successful result', () => {
    const result = myFunction();
    const value = expectSuccess(result);
    expect(value).toBe('expected');
  });
});
```
