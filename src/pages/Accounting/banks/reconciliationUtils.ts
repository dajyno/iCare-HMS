export interface InternalTxn {
  id: string;
  date: string;
  desc: string;
  amount: number;
  type: "Credit" | "Debit";
  status: string;
}

export interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "Credit" | "Debit";
}

export interface MatchSuggestion {
  statementLineId: string;
  internalTxnId: string;
  confidence: "High" | "Medium";
  score: number;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

function keywordOverlap(desc1: string, desc2: string): number {
  const words1 = desc1.toLowerCase().split(/\s+/).filter(Boolean);
  const words2 = desc2.toLowerCase().split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0;
  const common = words1.filter((w) => words2.includes(w));
  return common.length / Math.min(words1.length, words2.length);
}

export function autoMatch(
  internalTxns: InternalTxn[],
  statementLines: StatementLine[],
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  const usedInternal = new Set<string>();
  const usedStatement = new Set<string>();

  // First pass: high-confidence matches (exact amount + close date)
  for (const stmt of statementLines) {
    if (usedStatement.has(stmt.id)) continue;

    for (const txn of internalTxns) {
      if (usedInternal.has(txn.id)) continue;
      if (txn.type !== stmt.type) continue;
      if (txn.amount !== stmt.amount) continue;

      const dateDiff = daysBetween(stmt.date, txn.date);
      const kwScore = keywordOverlap(stmt.description, txn.desc);
      let score = 50; // exact amount
      if (dateDiff <= 3) score += 30;
      else if (dateDiff <= 7) score += 10;
      score += Math.round(kwScore * 20);

      if (score >= 80) {
        suggestions.push({
          statementLineId: stmt.id,
          internalTxnId: txn.id,
          confidence: "High",
          score,
        });
        usedStatement.add(stmt.id);
        usedInternal.add(txn.id);
        break;
      }
    }
  }

  // Second pass: medium-confidence matches (amount only, less strict)
  for (const stmt of statementLines) {
    if (usedStatement.has(stmt.id)) continue;

    let best: { txnId: string; score: number } | null = null;

    for (const txn of internalTxns) {
      if (usedInternal.has(txn.id)) continue;
      if (txn.type !== stmt.type) continue;
      if (txn.amount !== stmt.amount) continue;

      const dateDiff = daysBetween(stmt.date, txn.date);
      const kwScore = keywordOverlap(stmt.description, txn.desc);
      let score = 50;
      if (dateDiff <= 3) score += 30;
      else if (dateDiff <= 7) score += 10;
      else if (dateDiff <= 14) score += 5;
      score += Math.round(kwScore * 20);

      if (score >= 50 && (!best || score > best.score)) {
        best = { txnId: txn.id, score };
      }
    }

    if (best) {
      suggestions.push({
        statementLineId: stmt.id,
        internalTxnId: best.txnId,
        confidence: "Medium",
        score: best.score,
      });
      usedStatement.add(stmt.id);
      usedInternal.add(best.txnId);
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
