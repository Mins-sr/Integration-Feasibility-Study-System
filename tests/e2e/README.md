# End-to-End Tests

End-to-end tests for complete workflows from CLI to output.

## Guidelines

- Test entire user workflows
- Use real CLI commands and file I/O
- Mock only external APIs and services
- Slower execution (< 5s per test)
- Focus on critical user paths

## Structure

Organize by user scenario:

```
tests/e2e/
  ├── study-run/
  │   ├── full-study.test.ts
  │   └── partial-failure.test.ts
  ├── study-resume/
  │   └── checkpoint-resume.test.ts
  └── report-generation/
      └── openapi-and-markdown.test.ts
```

## Example

```typescript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Study Run E2E', () => {
  it('should execute full study and generate reports', async () => {
    const { stdout } = await execAsync(
      'node dist/cli/index.js study run --target https://api.example.com --config test-config.yaml'
    );

    expect(stdout).toContain('Study completed successfully');
    // Verify generated files exist
  });
});
```
