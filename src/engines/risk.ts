import type {
  ExposurePosition,
  CounterpartySummary,
  CrossSystemExposureDiff,
  ScenarioShockConfig,
  ScenarioResult,
  RiskResult,
  Finding,
  EvidenceReference,
} from '../types/index.ts';
import { roundFinancial, safePercentage, addMoney, subtractMoney } from '../utils/decimal.ts';
import { findMatchingField, parseNumberField, generateId } from '../utils/fileParser.ts';

export const STANDARD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08, // 1 EUR = 1.08 USD
  GBP: 1.28, // 1 GBP = 1.28 USD
  JPY: 0.0066, // 1 JPY = 0.0066 USD
  INR: 0.012, // 1 INR = 0.012 USD
  CAD: 0.74,
  AUD: 0.65,
  CHF: 1.12,
};

/**
 * Normalizes raw uploaded rows into ExposurePosition records
 */
export function normalizeRiskRows(
  rows: Record<string, any>[],
  fileId: string,
  fileName: string,
  sourceSystem = 'TREASURY_CORE'
): ExposurePosition[] {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});

  const idCol = findMatchingField(headers, ['position_id', 'pos_id', 'id', 'deal_id', 'ticket_id']);
  const counterpartyCol = findMatchingField(headers, ['counterparty', 'cp', 'entity', 'obligor', 'bank_name', 'client']);
  const instrumentCol = findMatchingField(headers, ['instrument', 'asset_class', 'product', 'type', 'asset_type']);
  const amountCol = findMatchingField(headers, ['exposure_amount', 'exposure', 'notional', 'amount', 'balance', 'value']);
  const currCol = findMatchingField(headers, ['currency', 'ccy', 'curr']);
  const dateCol = findMatchingField(headers, ['reporting_date', 'date', 'as_of_date', 'valuation_date']);
  const limitCol = findMatchingField(headers, ['configured_limit', 'limit', 'credit_limit', 'max_limit']);
  const collateralCol = findMatchingField(headers, ['collateral', 'collateral_amount', 'margin', 'pledged']);

  return rows.map((row, idx) => {
    const rawAmt = amountCol ? parseNumberField(row[amountCol]) : 0;
    const rawLimit = limitCol ? parseNumberField(row[limitCol]) : 0;
    const rawCollateral = collateralCol ? parseNumberField(row[collateralCol]) : 0;
    const currency = currCol && row[currCol] ? String(row[currCol]).toUpperCase().trim() : 'USD';

    return {
      id: `${fileId}_pos_${idx + 1}`,
      positionId: idCol && row[idCol] ? String(row[idCol]).trim() : `POS-${idx + 1}`,
      counterparty: counterpartyCol && row[counterpartyCol] ? String(row[counterpartyCol]).trim() : 'General Counterparty',
      instrument: instrumentCol && row[instrumentCol] ? String(row[instrumentCol]).trim() : 'Money Market / Cash',
      exposureAmount: Math.abs(rawAmt),
      currency,
      reportingDate: dateCol && row[dateCol] ? String(row[dateCol]).trim() : new Date().toISOString().split('T')[0],
      sourceSystem,
      configuredLimit: rawLimit > 0 ? rawLimit : undefined,
      collateralAmount: rawCollateral > 0 ? rawCollateral : undefined,
      netExposureAmount: Math.max(0, Math.abs(rawAmt) - rawCollateral),
      rowNumber: idx + 2,
      sourceFileId: fileId,
      raw: row,
    };
  });
}

/**
 * Converts any currency amount to USD base using validated rate table
 */
export function convertToBaseCurrency(amount: number, currency: string): number {
  const rate = STANDARD_EXCHANGE_RATES[currency.toUpperCase()] || 1.0;
  return roundFinancial(amount * rate, 2);
}

/**
 * Executes deterministic Risk & Exposure Intelligence Engine
 */
export function executeRiskEngine(
  positions: ExposurePosition[],
  secondaryPositions?: ExposurePosition[],
  scenarios?: ScenarioShockConfig[],
  runId = generateId('run_risk')
): RiskResult {
  const findings: Finding[] = [];
  const counterpartyMap = new Map<
    string,
    {
      gross: number;
      net: number;
      limit: number;
      count: number;
      currencies: Set<string>;
      firstRow: number;
      firstFile: string;
      positions: ExposurePosition[];
    }
  >();

  let totalGross = 0;
  let totalNet = 0;
  let totalConfiguredLimit = 0;

  for (const pos of positions) {
    const grossBase = convertToBaseCurrency(pos.exposureAmount, pos.currency);
    const netBase = convertToBaseCurrency(pos.netExposureAmount || pos.exposureAmount, pos.currency);
    const limitBase = pos.configuredLimit ? convertToBaseCurrency(pos.configuredLimit, pos.currency) : 0;

    totalGross = addMoney(totalGross, grossBase);
    totalNet = addMoney(totalNet, netBase);
    if (limitBase > 0) {
      totalConfiguredLimit = addMoney(totalConfiguredLimit, limitBase);
    }

    const current = counterpartyMap.get(pos.counterparty) || {
      gross: 0,
      net: 0,
      limit: 0,
      count: 0,
      currencies: new Set<string>(),
      firstRow: pos.rowNumber,
      firstFile: pos.sourceFileId,
      positions: [],
    };

    current.gross = addMoney(current.gross, grossBase);
    current.net = addMoney(current.net, netBase);
    if (limitBase > current.limit) current.limit = limitBase;
    current.count++;
    current.currencies.add(pos.currency);
    current.positions.push(pos);
    counterpartyMap.set(pos.counterparty, current);
  }

  // Calculate Counterparty Concentration and Limit Breaches
  const concentrations: CounterpartySummary[] = [];
  let activeBreachesCount = 0;

  counterpartyMap.forEach((data, cpName) => {
    const shareOfTotal = safePercentage(data.gross, totalGross, 2);
    const limitUtil = data.limit > 0 ? safePercentage(data.gross, data.limit, 1) : undefined;
    const isBreached = limitUtil !== undefined && limitUtil >= 100;

    if (isBreached) {
      activeBreachesCount++;
      const excess = subtractMoney(data.gross, data.limit);
      findings.push({
        id: `find_risk_breach_${cpName}`,
        runId,
        module: 'risk',
        title: `Exposure Limit Breach: ${cpName} (${limitUtil}% of Limit)`,
        severity: 'critical',
        category: 'limit_breach',
        description: `Total exposure of $${data.gross.toLocaleString()} exceeds approved credit limit of $${data.limit.toLocaleString()} by $${excess.toLocaleString()}.`,
        impactAmount: excess,
        currency: 'USD',
        reviewStatus: 'unreviewed',
        evidence: data.positions.map((p) => ({
          fileId: p.sourceFileId,
          fileName: 'Treasury Position Report',
          rowNumber: p.rowNumber,
          recordIdentifier: p.positionId,
          rawFieldValues: p.raw,
          normalizedValues: {
            counterparty: cpName,
            exposure: p.exposureAmount,
            limit: p.configuredLimit,
          },
          ruleOrCalculationId: 'RULE_RISK_LIMIT_UTILIZATION',
          runId,
        })),
      });
    } else if (limitUtil !== undefined && limitUtil >= 85) {
      findings.push({
        id: `find_risk_warning_${cpName}`,
        runId,
        module: 'risk',
        title: `Limit Threshold Warning: ${cpName} (${limitUtil}%)`,
        severity: 'high',
        category: 'limit_warning',
        description: `Exposure for ${cpName} is at ${limitUtil}% of limit ($${data.gross.toLocaleString()} / $${data.limit.toLocaleString()}). Near breach threshold.`,
        impactAmount: data.gross,
        currency: 'USD',
        reviewStatus: 'unreviewed',
        evidence: [
          {
            fileId: data.firstFile,
            fileName: 'Treasury Position Report',
            rowNumber: data.firstRow,
            ruleOrCalculationId: 'RULE_RISK_LIMIT_UTILIZATION',
            runId,
          },
        ],
      });
    }

    // High Concentration Warning (> 25% of entire portfolio)
    if (shareOfTotal >= 25 && counterpartyMap.size > 2) {
      findings.push({
        id: `find_risk_concentration_${cpName}`,
        runId,
        module: 'risk',
        title: `High Counterparty Concentration: ${cpName} (${shareOfTotal}%)`,
        severity: 'high',
        category: 'concentration_risk',
        description: `${cpName} accounts for ${shareOfTotal}% of total institutional gross exposure ($${data.gross.toLocaleString()} of $${totalGross.toLocaleString()}).`,
        impactAmount: data.gross,
        currency: 'USD',
        reviewStatus: 'unreviewed',
        evidence: [
          {
            fileId: data.firstFile,
            fileName: 'Treasury Position Report',
            rowNumber: data.firstRow,
            normalizedValues: { counterpartyShare: shareOfTotal, gross: data.gross },
            ruleOrCalculationId: 'RULE_RISK_CONCENTRATION_CHECK',
            runId,
          },
        ],
      });
    }

    concentrations.push({
      counterparty: cpName,
      grossExposure: data.gross,
      netExposure: data.net,
      configuredLimit: data.limit > 0 ? data.limit : undefined,
      limitUtilizationPercent: limitUtil,
      shareOfTotalPercent: shareOfTotal,
      isBreached,
      positionsCount: data.count,
    });
  });

  // Sort concentrations descending
  concentrations.sort((a, b) => b.grossExposure - a.grossExposure);

  // Cross-System Comparison if secondaryPositions provided (e.g. Treasury Core vs ERP Balances)
  const crossSystemDiscrepancies: CrossSystemExposureDiff[] = [];
  if (secondaryPositions && secondaryPositions.length > 0) {
    const secondaryMap = new Map<string, number>();
    secondaryPositions.forEach((p) => {
      const base = convertToBaseCurrency(p.exposureAmount, p.currency);
      secondaryMap.set(p.counterparty, addMoney(secondaryMap.get(p.counterparty) || 0, base));
    });

    counterpartyMap.forEach((data, cpName) => {
      const expB = secondaryMap.get(cpName);
      if (expB !== undefined) {
        const diff = subtractMoney(data.gross, expB);
        const absDiff = Math.abs(diff);
        const relDiff = safePercentage(absDiff, expB, 2);

        if (absDiff > 100) {
          crossSystemDiscrepancies.push({
            positionOrCounterparty: cpName,
            exposureSystemA: data.gross,
            exposureSystemB: expB,
            difference: diff,
            absoluteDifference: absDiff,
            relativeDifferencePercent: relDiff,
            evidence: {
              fileId: data.firstFile,
              fileName: 'Cross-System Reconciliation',
              rowNumber: data.firstRow,
              normalizedValues: { systemA: data.gross, systemB: expB, difference: diff },
              ruleOrCalculationId: 'RULE_RISK_CROSS_SYSTEM_DIFF',
              runId,
            },
          });

          findings.push({
            id: `find_risk_cross_sys_${cpName}`,
            runId,
            module: 'risk',
            title: `Cross-System Discrepancy on ${cpName}: $${absDiff.toLocaleString()} (${relDiff}%)`,
            severity: relDiff > 10 ? 'high' : 'medium',
            category: 'system_discrepancy',
            description: `Primary treasury ledger reports $${data.gross.toLocaleString()} while secondary ERP ledger reports $${expB.toLocaleString()}. Net difference is $${diff.toLocaleString()}.`,
            impactAmount: absDiff,
            currency: 'USD',
            reviewStatus: 'unreviewed',
            evidence: [
              {
                fileId: data.firstFile,
                fileName: 'Cross-System Reconciliation',
                rowNumber: data.firstRow,
                ruleOrCalculationId: 'RULE_RISK_CROSS_SYSTEM_DIFF',
                runId,
              },
            ],
          });
        }
      }
    });
  }

  // Controlled Scenario Analysis
  const scenarioResults: ScenarioResult[] = [];
  const defaultScenarios: ScenarioShockConfig[] = scenarios && scenarios.length > 0
    ? scenarios
    : [
        {
          name: 'Global Currency & FX Shock (+10% USD Strengthening)',
          description: 'Simulates a 10% adverse currency shift on non-USD denominated foreign currency positions.',
          fxShockPercent: 10,
          counterpartyCreditShockPercent: 0,
        },
        {
          name: 'Credit Stress Scenario (+25% Exposure Expansion)',
          description: 'Simulates a 25% sudden drawdown or market value spike on top 3 obligors.',
          fxShockPercent: 0,
          counterpartyCreditShockPercent: 25,
        },
      ];

  for (const sc of defaultScenarios) {
    let stressedGross = 0;
    let affectedCount = 0;
    const breachedCPs: string[] = [];

    counterpartyMap.forEach((data, cpName) => {
      let cpStressed = data.gross;
      let isTarget = false;

      if (sc.targetCounterparty && sc.targetCounterparty === cpName) {
        isTarget = true;
      } else if (!sc.targetCounterparty) {
        isTarget = true;
      }

      if (isTarget) {
        if (sc.counterpartyCreditShockPercent > 0) {
          const shock = (data.gross * sc.counterpartyCreditShockPercent) / 100;
          cpStressed = addMoney(cpStressed, shock);
          affectedCount += data.count;
        }
        if (sc.fxShockPercent > 0 && (!data.currencies.has('USD') || data.currencies.size > 1)) {
          const fxShock = (data.gross * sc.fxShockPercent) / 100;
          cpStressed = addMoney(cpStressed, fxShock);
          affectedCount += data.count;
        }
      }

      if (data.limit > 0 && cpStressed > data.limit) {
        breachedCPs.push(cpName);
      }

      stressedGross = addMoney(stressedGross, cpStressed);
    });

    const changeAmount = subtractMoney(stressedGross, totalGross);
    const changePercent = safePercentage(changeAmount, totalGross, 2);

    scenarioResults.push({
      scenarioName: sc.name,
      baselineTotalGross: totalGross,
      stressedTotalGross: stressedGross,
      changeAmount,
      changePercent,
      affectedPositionsCount: affectedCount,
      breachedCounterparties: breachedCPs,
      assumptions: [
        sc.description,
        'Deterministic linear exposure adjustment: scenario_exposure = current_exposure * (1 + shock_fraction)',
        'Scenario metrics are strictly isolated from actual recorded financial balances.',
      ],
    });
  }

  const averageLimitUtilizationPercent =
    totalConfiguredLimit > 0 ? safePercentage(totalGross, totalConfiguredLimit, 1) : 0;

  return {
    runId,
    module: 'risk',
    engineVersion: '2.0.0-deterministic',
    baseCurrency: 'USD',
    totalGrossExposure: roundFinancial(totalGross, 2),
    totalNetExposure: roundFinancial(totalNet, 2),
    totalConfiguredLimit: roundFinancial(totalConfiguredLimit, 2),
    averageLimitUtilizationPercent,
    topConcentrations: concentrations,
    crossSystemDiscrepancies,
    activeBreachesCount,
    positionsCount: positions.length,
    positions,
    scenarioResults,
    findings,
  };
}
