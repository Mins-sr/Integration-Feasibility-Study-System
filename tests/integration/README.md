# Integration Tests

Integration tests for interactions between multiple modules.

## Guidelines

- Test module interactions and data flow
- Use real implementations where possible
- Mock only external services (HTTP, file system, external tools)
- Medium execution time (< 1s per test)

## Structure

Organize by feature or workflow:

```
tests/integration/
  ├── orchestrator/
  │   ├── pipeline-execution.test.ts
  │   └── checkpoint-recovery.test.ts
  ├── analyzers/
  │   ├── performance-with-jmeter.test.ts
  │   └── security-with-zap.test.ts
  └── reporting/
      └── report-generation.test.ts
```

## Example

```typescript
import { describe, it, expect } from 'vitest';
import { PipelineOrchestrator } from '@/orchestration/pipeline-orchestrator';
import { PerformanceAnalyzer } from '@/analysis/performance/performance-analyzer';

describe('Pipeline Integration', () => {
  it('should execute analyzer and collect results', async () => {
    const orchestrator = new PipelineOrchestrator(/* ... */);
    const result = await orchestrator.executeStudy(config);
    expect(result.success).toBe(true);
  });
});
```
