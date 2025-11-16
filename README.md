# Integration Feasibility Study System

外部システムまたはサービスとの連携機能の技術的実現可能性を体系的に調査・検証するシステムです。

## 概要

このシステムは、API連携の技術評価、性能検証、セキュリティリスク評価、コスト見積もりを自動化し、実装判断に必要な包括的な情報を収集します。

### 主な機能

- **連携方式の技術調査**: REST API、GraphQL、Webhook、SDK等の複数連携方式を統一的に評価
- **パフォーマンステスト**: レスポンスタイム、スループット、同時接続数を実測しボトルネックを特定
- **セキュリティ評価**: OWASP ZAPを使用した脆弱性スキャンとリスク明確化
- **コスト試算**: ライセンス費用、運用コスト、開発工数の見積もりとROI計算
- **リスク分析**: 技術的制約、互換性、ベンダーロックインリスクを評価
- **自動レポート生成**: OpenAPI 3.1.x仕様とMarkdownレポートを自動生成

## 特徴

✅ **型安全**: TypeScript 5.xによる完全な型安全性
✅ **モジュラーアーキテクチャ**: ドメイン駆動設計に基づく保守性の高い構造
✅ **並列実行**: 独立した分析を並列実行し、調査時間を短縮
✅ **エラーリカバリ**: チェックポイント機能により中断から再開可能
✅ **包括的なテスト**: ユニット、統合、E2Eテストによる品質保証

## インストール

### 前提条件

- Node.js 20.x 以上
- npm または yarn

### セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd freetier-mapping

# 依存関係のインストール
npm install

# ビルド
npm run build
```

## 使い方

### 基本的な使い方

```bash
# CLIコマンドでシステムを実行
study run --target <url> --config <config-file>
```

### 設定ファイル例

```yaml
target:
  url: https://api.example.com
  auth:
    type: api-key
    key: YOUR_API_KEY

analyzers:
  - performance
  - security
  - cost
  - risk

reportFormats:
  - openapi
  - markdown

parallelExecution: true
```

### コマンド例

```bash
# 調査の実行
study run --target https://api.example.com --config study.yaml

# チェックポイントから再開
study resume --checkpoint <checkpoint-id>
```

## アーキテクチャ

### ドメイン構成

```
┌─────────────────────────────────────────────────────────┐
│                   CLI Interface                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Orchestration Domain                         │
│  • Pipeline Orchestrator                                │
│  • Config Loader                                        │
│  • Checkpoint Manager                                   │
└────────────┬────────────────────────┬───────────────────┘
             │                        │
   ┌─────────▼──────────┐   ┌────────▼───────────────────┐
   │ Connectivity Domain│   │    Analysis Domain         │
   │ • Connector        │   │ • Performance Analyzer     │
   │ • Auth Manager     │   │ • Security Analyzer        │
   │ • Rate Limiter     │   │ • Cost Analyzer            │
   └─────────┬──────────┘   │ • Risk Analyzer            │
             │              └────────┬───────────────────┘
             │                       │
        ┌────▼───────────────────────▼────┐
        │      Reporting Domain           │
        │ • Data Aggregator               │
        │ • OpenAPI Generator             │
        │ • Markdown Generator            │
        └─────────────────────────────────┘
```

### 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| CLI | Commander.js v12.x | コマンドライン引数解析 |
| Backend | TypeScript 5.x + Node.js 20.x | 型安全なモジュール実装 |
| HTTP Client | Axios v1.x | 外部API呼び出し |
| Testing | Vitest v1.x | ユニット・統合テスト |
| Documentation | openapi-typescript v6.x | OpenAPI仕様生成 |

## 開発

### ディレクトリ構造

```
src/
├── analysis/          # 分析モジュール
│   ├── cost/         # コスト試算
│   ├── performance/  # パフォーマンステスト
│   ├── risk/         # リスク分析
│   └── security/     # セキュリティ評価
├── cli/              # CLIインターフェース
├── connectivity/     # 外部API接続
├── domain/           # ドメインモデル
├── orchestration/    # パイプライン制御
├── reporting/        # レポート生成
├── types/            # 型定義
└── utils/            # ユーティリティ
```

### スクリプト

```bash
# ビルド
npm run build

# ウォッチモード
npm run watch

# クリーン
npm run clean

# テスト実行
npm test

# テストカバレッジ
npm run test:coverage

# テストUI
npm run test:ui
```

### 開発ワークフロー

1. **仕様策定**: `.kiro/specs/` でSpec-Driven Developmentに従った開発
2. **設計**: `design.md` に基づいたアーキテクチャ実装
3. **TDD**: テストファースト開発でモジュールを実装
4. **統合**: Pipeline Orchestratorで各モジュールを統合

## テスト

### テスト戦略

- **ユニットテスト**: 各モジュールの個別機能テスト
- **統合テスト**: モジュール間の連携テスト
- **E2Eテスト**: CLIコマンド経由の全体フローテスト

### テスト実行

```bash
# 全テスト実行
npm test

# 特定のテストファイルを実行
npm test -- tests/unit/analysis/risk/compatibility-checker.test.ts

# カバレッジレポート生成
npm run test:coverage
```

## エラーハンドリング

全てのエラーは型安全なResult型で表現され、適切なエラーメッセージと回復戦略を提供します。

- **リトライ機構**: レート制限、一時的なネットワークエラー
- **サーキットブレーカー**: 連続失敗時の一時停止
- **チェックポイント**: 長時間実行の中断から再開

## セキュリティ

- **認証情報の保護**: メモリ内管理、ログへの露出防止
- **コマンドインジェクション対策**: 外部プロセス実行時の引数検証
- **パストラバーサル対策**: ファイルパス検証
- **個人情報保護**: レポート生成時の自動マスキング

## パフォーマンス目標

| メトリック | 目標値 |
|-----------|--------|
| 調査実行時間 | < 5分（4アナライザー並列） |
| パフォーマンステスト | < 2分（100同時ユーザー） |
| セキュリティスキャン | < 3分（パッシブスキャン） |
| レポート生成 | < 10秒（1000エンドポイント） |
| メモリ使用量 | < 500MB（ピーク時） |

## ライセンス

ISC

## 貢献

本プロジェクトはKiro-style Spec-Driven Developmentに基づいて開発されています。

詳細は `.kiro/specs/` および `CLAUDE.md` を参照してください。

---

**開発状況**: 実装フェーズ進行中
**仕様書**: [Integration Feasibility Study](/.kiro/specs/integration-feasibility-study/)
