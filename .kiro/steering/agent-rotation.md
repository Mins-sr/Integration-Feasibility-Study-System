# AI Agent Rotation Strategy

## Overview

無料枠AIエージェントの日次/月次クォータ枯渇と安定性の低さを克服するため、複数エージェントを戦略的にローテーションさせ、月額$5未満で高品質な開発フローを実現する。

## Agent Roles & Constraints

| 役割 | エージェント | 焦点能力 | コストと制約 | CEB評価 |
|------|-------------|---------|------------|---------|
| **L-Agent（頭脳）** | Claude Code Pro | 推論、設計、仕様書生成 | $20/月 | 98点（有料時の選択） |
| **L-Agent（軸）** | Gemini CLI Public | CLI実行、集計、検証 | $0、日次1,000リクエスト、1Mトークン | 98点（無料枠） |
| **Sub-Agent** | Windsurf Editor | 高品質コード生成 | $0、月100プレミアムプロンプト（GPT-4.1相当） | 95点 |
| **Sub-Agent** | AWS Q Developer | 無制限補完、AWS特化 | $0、無制限提案、月50セキュリティスキャン | 90点 |
| **Auxiliary** | Hugging Face API | バルク自動化、APIラッパー | $0、1時間あたり1,000リクエスト | 85点 |

## Rotation Principles

### 1. Forced Rotation (強制ローテーション)
単一エージェントへの過度な依存を避け、クォータを戦略的に配分。

**Implementation**:
- Claude Code Proはリーダーとして設計・仕様書生成に集中
- 実装フェーズはGemini CLI Public（日次1,000リクエスト）を軸に使用
- Windsurfのプレミアム枠（月100回）は複雑な実装タスクに限定

### 2. Stability Assurance (安定性確保)
無料枠エージェントの安定性（70点）を考慮し、エラー時の自動切り替えを最優先。

**Error Handling Flow**:
```typescript
async function executeWithRotation(task: Task): Promise<Result> {
  const agents = [windsurfAgent, geminiAgent, awsQAgent];

  for (const agent of agents) {
    const result = await agent.execute(task);

    if (result.success) return result;

    // Retry with exponential backoff
    if (isRetryable(result.error)) {
      await retryWithBackoff(agent, task);
    }

    // Circuit breaker: 5 consecutive failures → next agent
    if (consecutiveFailures(agent) >= 5) {
      logRotation(agent, agents.next());
      continue;
    }
  }

  return { success: false, error: 'ALL_AGENTS_FAILED' };
}
```

### 3. Common Interface Maintenance (共通インターフェース維持)
cc-sddフレームワークが7つのエージェントをサポートするように、全エージェントを共通CLI/APIインターフェース経由で抽象化。

**Interface Pattern**:
```typescript
interface AIAgentAdapter {
  readonly name: string;
  readonly costPerRequest: number;
  readonly quotaLimit: QuotaLimit;

  execute(task: Task): Promise<Result>;
  checkQuota(): Promise<QuotaStatus>;
  estimateCost(task: Task): number;
}
```

## Rotation Trigger Matrix

| シナリオ | 目的 | Primary Agent | Trigger Condition | Rotation Action |
|---------|------|--------------|------------------|----------------|
| 高品質タスク | 複雑な設計、アーキテクチャ | Windsurf (Premium) | Premium prompts 80%消費 | → Gemini CLI / Claude Code |
| CLI実行/集計 | 大量ファイル操作、検証 | Gemini CLI Public | 日次1,000リクエスト到達 | → AWS Q Developer / HF API |
| リアルタイム補完 | 低レイテンシコーディング | AWS Q Developer | レイテンシ > 1.5秒 | → 次の安定エージェント |
| バルク処理 | 大規模スクリプト、API検証 | Hugging Face API | Gemini CLI制限到達後 | → 高スループット要求時 |
| 深層推論 | 複雑なデバッグ、外部情報 | Perplexity Edu Pro | Gemini/Copilotの推論不足 | → L-Agentが判断時 |

## Cost Efficiency Benchmark (CEB)

**Target**: 98点 (月額$0-5で高品質維持)

**Calculation**:
```
CEB = (Quality Score × 100) / (Monthly Cost + 1)
    = (98 × 100) / (0 + 1) = 98点
```

**Monitoring**:
- 各エージェントの月次コスト追跡
- タスク完了品質スコア（人間評価）
- クォータ消費率とローテーション頻度

## Implementation Roadmap

### Phase 1: Single Agent Baseline (Current)
- Claude Code Proまたは Gemini CLI Publicで単一エージェント実装
- パフォーマンス、セキュリティ、コスト評価の基本機能を確立

### Phase 2: Rotation Logic Integration
- `AIAgentAdapter`インターフェースの実装
- Quota管理とTrigger検出ロジックの追加
- Error handling flowのサーキットブレーカー実装

### Phase 3: Multi-Agent Orchestration
- Pipeline Orchestratorへのローテーションロジック統合
- 各Analyzerモジュールでのエージェント切り替えサポート
- ローテーション履歴とコストレポートの生成

### Phase 4: Advanced Optimization
- 機械学習によるタスク難易度予測とエージェント最適割り当て
- リアルタイムクォータ監視ダッシュボード
- 自動スケーリング（新規無料枠エージェントの自動追加）

## Best Practices

### DO
- ✅ 各タスクの難易度を事前に評価し、適切なエージェントを選択
- ✅ クォータ残量を常に監視し、80%到達前にローテーション
- ✅ エラー時は即座に次のエージェントへ切り替え（指数バックオフ付き）
- ✅ コスト効率（CEB）を週次でレビューし、ローテーション戦略を調整

### DON'T
- ❌ 単一エージェントにタスクを集中させクォータ枯渇を招く
- ❌ 安定性の低いエージェントで重要タスクを実行（リトライコスト増）
- ❌ ローテーションロジックをハードコード（新エージェント追加時に脆弱）
- ❌ コスト追跡を怠り、無料枠超過による予想外の課金を発生させる

## Future Extensions

### cc-sdd Framework Integration
cc-sddが7つのエージェント（Codex、Cursor、Copilot、Gemini CLI、Windsurf等）をサポートするように、本プロジェクトも同様の共通インターフェースを採用し、将来的に統合可能にする。

### New Free-Tier Agent Onboarding
新規スタートアップのAIツールが無料枠を提供した場合、以下の手順で迅速に追加:
1. `AIAgentAdapter`インターフェースの実装
2. クォータ制限とコスト設定の追加
3. ローテーションマトリクスへの登録
4. 性能ベンチマーク（CEB評価）の実施

---
_Created: 2025-11-15_
_Focus: Multi-Agent Rotation, Cost Efficiency, Stability_
