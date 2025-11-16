# Project Structure

## Organization Philosophy

**Domain-Driven Modular Design**

プロジェクトは4つのドメインに分割され、各ドメイン内でモジュール単位で機能を実装。将来的な無料枠エージェントの追加や、新規連携方式の評価に柔軟に対応できる拡張性を重視。

## Directory Patterns

### Orchestration Domain
**Location**: `/src/orchestration/`
**Purpose**: 調査ワークフローの制御と実行順序管理
**Example**: `pipeline-orchestrator.ts`, `config-loader.ts`, `checkpoint-manager.ts`

### Connectivity Domain
**Location**: `/src/connectivity/`
**Purpose**: 外部API/サービスへの接続、認証、レート制限管理
**Example**: `connector.ts`, `auth-manager.ts`, `rate-limiter.ts`

### Analysis Domain
**Location**: `/src/analysis/`
**Purpose**: 各評価領域（Performance, Security, Cost, Risk）の分析ロジック
**Example**:
- `performance/performance-analyzer.ts`
- `security/security-analyzer.ts`
- `cost/cost-analyzer.ts`
- `risk/risk-analyzer.ts`

### Reporting Domain
**Location**: `/src/reporting/`
**Purpose**: 調査結果の集約、フォーマット変換、レポート生成
**Example**: `data-aggregator.ts`, `openapi-generator.ts`, `markdown-generator.ts`

### Shared Types
**Location**: `/src/types/`
**Purpose**: ドメイン横断で使用される共通型定義
**Example**: `result.ts`, `study.ts`, `config.ts`, `errors.ts`

### CLI Entry Point
**Location**: `/src/cli/`
**Purpose**: コマンドライン引数解析とサブコマンド実装
**Example**: `index.ts`, `commands/study-run.ts`, `commands/study-resume.ts`

### Configuration & Data
**Location**: `/config/`, `/data/`
**Purpose**: 設定ファイル、Pricing Database、Compatibility Database
**Example**:
- `/config/study-config.example.yaml`
- `/data/pricing/aws-lambda.json`
- `/data/compatibility/node-versions.json`

### Test Structure
**Location**: `/tests/`
**Purpose**: ユニット、統合、E2Eテスト
**Example**:
- `/tests/unit/` - ユニットテスト（各Service単位）
- `/tests/integration/` - 統合テスト（Orchestrator + Analyzers）
- `/tests/e2e/` - E2Eテスト（CLI完全実行）

## Naming Conventions

- **Files**: kebab-case for source files (`pipeline-orchestrator.ts`, `auth-manager.ts`)
- **Classes/Interfaces**: PascalCase (`PipelineOrchestratorService`, `ConnectorService`)
- **Functions/Variables**: camelCase (`executeStudy`, `sendRequest`)
- **Types**: PascalCase with descriptive suffixes (`StudyConfig`, `HttpError`, `PerformanceMetrics`)

## Import Organization

```typescript
// 1. External libraries (Node.js built-in)
import { spawn } from 'child_process';
import { readFile, writeFile } from 'fs/promises';

// 2. External libraries (npm packages)
import axios from 'axios';
import { Command } from 'commander';

// 3. Internal absolute imports (cross-domain)
import type { Result, StudyConfig } from '@/types';
import { ConnectorService } from '@/connectivity/connector';

// 4. Internal relative imports (same domain)
import { AuthManager } from './auth-manager';
import { RateLimiter } from './rate-limiter';
```

**Path Aliases**:
- `@/`: Maps to `/src/` (configured in `tsconfig.json`)

## Code Organization Principles

### 1. Single Responsibility per Module
各モジュールは1つの明確な責務を持つ。例: `auth-manager.ts`は認証のみを担当し、HTTP通信は`connector.ts`に委譲。

### 2. Dependency Injection
外部依存（JMeter、ZAP、Pricing Database）は、インターフェース経由で注入し、テスト時はモックに置き換え可能にする。

```typescript
interface JMeterBridge {
  runTest(config: PerformanceTestConfig): Promise<Result<PerformanceMetrics, TestError>>;
}

class PerformanceAnalyzer {
  constructor(private jmeterBridge: JMeterBridge) {}
}
```

### 3. Error Handling with Result Type
全ての非同期処理は`Result<T, E>`型を返し、エラーを型安全に伝播（Railway Pattern）。

```typescript
async function sendRequest<T>(request: HttpRequest): Promise<Result<HttpResponse<T>, HttpError>> {
  try {
    const response = await axios(request);
    return { success: true, value: response };
  } catch (error) {
    return { success: false, error: { type: 'NETWORK_ERROR', cause: error } };
  }
}
```

### 4. Checkpoint & Resume Pattern
長時間実行の調査は、各Analyzerの完了後にチェックポイントを保存し、中断時は再開可能にする。

**Checkpoint Location**: `.study-checkpoint/{study-id}.json`

### 5. Parallel Execution Strategy
独立したAnalyzer（Performance, Security, Cost, Risk）は`Promise.all`で並列実行。共有リソース（Connector）はMutexで排他制御。

```typescript
const results = await Promise.all([
  performanceAnalyzer.run(config),
  securityAnalyzer.run(config),
  costAnalyzer.run(config),
  riskAnalyzer.run(config),
]);
```

## Multi-Agent Rotation Support

### Agent Abstraction Pattern
各AIエージェント（Claude Code Pro、Gemini CLI、Windsurf等）は、共通のCLI/APIインターフェースを介して抽象化。

**Future Extension Point**: `/src/agents/` ディレクトリを追加し、エージェント固有のアダプターを実装予定。

```typescript
// Future: Agent abstraction interface
interface AIAgent {
  name: string;
  quotaRemaining(): Promise<number>;
  execute(task: Task): Promise<Result>;
  priority: number; // Rotation priority
}
```

### Rotation Trigger Logic
Pipeline Orchestratorが、各エージェントのクォータ残量、応答レイテンシ、エラー率を監視し、閾値超過時に次のエージェントへ自動切り替え。

**Trigger Examples**:
- Windsurf premium prompts 80% → Gemini CLI
- Gemini CLI daily limit → AWS Q Developer
- Latency > 1.5s → Next stable agent

---
_Created: 2025-11-15_
_Focus: Modular Design, Type Safety, Multi-Agent Extensibility_
