# Technology Stack

## Architecture

**Modular Pipeline Architecture + Plugin-based Extensibility**

複数のAnalyzerモジュール（Performance, Security, Cost, Risk）を独立したプラグインとして実装し、Pipeline Orchestratorが実行順序を制御。各モジュールは並列実行可能（依存関係なし）であり、エラー時は部分結果を保存してチェックポイントから再開可能。

**設計原則**:
- モジュール境界 = 要件領域（7つの独立した要件に対応）
- 共有リソース（Connector）はMutexで排他制御
- 将来的な拡張（新連携方式、新分析手法）を容易にするPlugin-based設計

## Core Technologies

- **Language**: TypeScript 5.x (strict mode, no `any` types)
- **Runtime**: Node.js 20.x LTS
- **CLI Framework**: Commander.js v12.x
- **HTTP Client**: Axios v1.x (interceptors for retry/auth)
- **Testing**: Vitest v1.x (unit, integration, E2E)

## Key Libraries

**Performance Testing**:
- JMeter (child process execution) - 負荷テスト、スループット計測

**Security Testing**:
- OWASP ZAP API v2.x - 脆弱性スキャン、セキュリティ評価

**Documentation Generation**:
- openapi-typescript v6.x - OpenAPI 3.1.x仕様生成
- Handlebars - Markdownテンプレートレンダリング

**Data Storage**:
- JSON Files (local filesystem) - 調査結果の永続化

## Development Standards

### Type Safety (Mandatory)
- **絶対禁止**: `any` type の使用
- **必須**: 全てのパラメータ・戻り値に明示的な型定義
- **推奨**: Discriminated Unionsでエラーハンドリング（Railway Pattern）

```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

type HttpError =
  | { type: 'RATE_LIMIT_EXCEEDED'; retryAfter: number }
  | { type: 'AUTH_FAILED'; reason: string }
  | { type: 'TIMEOUT'; duration: number };
```

### Code Quality
- **Linting**: ESLint with TypeScript strict rules
- **Formatting**: Prettier (automatic on save)
- **Imports**: Absolute paths for cross-module, relative for local

### Testing
- **Coverage Target**: 80%+ for business logic
- **Test Pyramid**: Unit (多) > Integration (中) > E2E (少)
- **External Tools**: Mock JMeter/ZAP outputs for integration tests

## Development Environment

### Required Tools
- Node.js 20.x LTS
- TypeScript 5.x
- JMeter (optional, for performance tests)
- OWASP ZAP (optional, for security scans)

### Common Commands
```bash
# Dev: npm run dev (watch mode)
# Build: npm run build (compile TypeScript)
# Test: npm test (run all tests with Vitest)
# Lint: npm run lint (ESLint + Prettier check)
```

## Key Technical Decisions

### 1. TypeScript over Python
**Rationale**:
- 型安全性が設計原則「Type Safety is Mandatory」に完全準拠
- Node.jsエコシステムが REST/GraphQL統合に最適（豊富なHTTPクライアント）
- 非同期処理（async/await）が言語レベルでサポート

**Trade-off**: Python比でデータ分析ライブラリが少ない（外部ツール統合で対応）

### 2. External Tools as Child Processes
**Rationale**:
- JMeter、OWASP ZAPは業界標準で信頼性が高い
- 子プロセス実行により本体との疎結合を維持
- 各ツールの専門性を活用（車輪の再発明を避ける）

**Trade-off**: 実行環境にツールのインストールが必要（Dockerで解決可能）

### 3. JSON File Storage (v1)
**Rationale**:
- シンプル、人間可読、バージョン管理可能
- 初期MVPには十分（PostgreSQL移行は将来検討）

**Migration Path**: Read/Write Adapterパターンで抽象化済み（将来のDB移行に備える）

### 4. OpenAPI 3.1.x for Documentation
**Rationale**:
- 業界標準で機械可読（Swagger UI/Redoc連携）
- API評価結果を標準化された形式で記録
- 将来的なAPI自動生成ツール（openapi-typescript）との統合

### 5. Modular Pipeline for Multi-Agent Rotation
**Rationale**:
- 各Analyzerを独立したモジュールとして実装 → 特定のAIエージェントに特化した実装が可能
- Pipeline Orchestratorがエージェントの切り替えロジックを集約
- 無料枠の変更（例: 新規スタートアップの追加）に柔軟に対応

**Implementation**: cc-sddフレームワークと同様の共通CLI/APIインターフェースを維持

---
_Created: 2025-11-15_
_Focus: Type Safety, Extensibility, Multi-Agent Support_
