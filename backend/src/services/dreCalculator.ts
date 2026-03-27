import { prisma } from '../lib/prisma';

// Standard rates used as fallback when project parameters are not yet configured
const DEFAULT_RATES = {
  pisCofins: 3.65, // combined PIS + COFINS (regime cumulativo)
  irpj:      4.80, // lucro presumido — incide sobre receita bruta
  csll:      2.88, // lucro presumido — incide sobre receita bruta
  iss:       0,    // preenchimento manual por município
};

export async function recalculateDRE(memoryId: string) {
  const memory = await prisma.calculationMemory.findUnique({
    where: { id: memoryId },
    include: {
      parameters: true,
      workOrders: { include: { lines: true } },
      supplies: true,
    },
  });

  if (!memory) return;

  const params = memory.parameters;

  let totalLaborCost  = 0;
  let totalLaborPrice = 0;
  let totalTravelCost  = 0;
  let totalTravelPrice = 0;

  for (const wo of memory.workOrders) {
    for (const line of wo.lines) {
      totalLaborCost  += line.laborCost;
      totalLaborPrice += line.laborPrice;
      totalTravelCost  += line.travelCost;
      totalTravelPrice += line.travelPrice;
    }
  }

  let totalSuppliesRevenue = 0;
  let totalSuppliesCost    = 0;
  for (const sup of memory.supplies) {
    totalSuppliesRevenue += sup.salePrice;
    totalSuppliesCost    += sup.totalCost;
  }

  // ── Receita Bruta ──────────────────────────────────────────────────────────
  const grossRevenue = totalLaborPrice + totalTravelPrice + totalSuppliesRevenue;

  // ── Deduções da Receita (ISS + PIS/COFINS sobre receita bruta) ─────────────
  // pisRate armazena a alíquota combinada PIS+COFINS; cofinsRate não usado separadamente
  const pisCofinsRate = params?.pisRate  ?? DEFAULT_RATES.pisCofins;
  const issRate_      = params?.issRate  ?? DEFAULT_RATES.iss;

  const pisDeduction    = grossRevenue * (pisCofinsRate / 100); // PIS + COFINS combinados
  const cofinsDeduction = 0;                                    // absorvido em pisDeduction
  const issDeduction    = grossRevenue * (issRate_ / 100);
  const totalDeductions = pisDeduction + issDeduction;
  const netRevenue      = grossRevenue - totalDeductions;

  // ── Custos Diretos ─────────────────────────────────────────────────────────
  const costHHDev       = totalLaborCost;
  const costTravel      = totalTravelCost;
  const costSupplies    = totalSuppliesCost;
  const totalDirectCost = costHHDev + costTravel + costSupplies;

  // ── Margem Bruta / EBITDA ──────────────────────────────────────────────────
  const grossMargin    = netRevenue - totalDirectCost;
  const grossMarginPct = grossRevenue > 0 ? (grossMargin / grossRevenue) * 100 : 0;
  const ebitda         = grossMargin;
  const ebitdaPct      = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0;
  const ebit           = ebitda;

  // ── Impostos sobre Renda (lucro presumido — incidem sobre receita bruta) ───
  const csllRate_ = params?.csllRate ?? DEFAULT_RATES.csll;
  const irpjRate_ = params?.irpjRate ?? DEFAULT_RATES.irpj;

  const csll = grossRevenue * (csllRate_ / 100);
  const irpj = grossRevenue * (irpjRate_ / 100);

  const netProfit    = ebit - csll - irpj;
  const netProfitPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  await prisma.dRE.upsert({
    where:  { memoryId },
    create: {
      memoryId, grossRevenue, issDeduction, pisDeduction, cofinsDeduction,
      totalDeductions, netRevenue,
      costHHDev, costHHField: 0, costThirdParty: 0,
      costTravel, costSupplies, totalDirectCost,
      grossMargin, grossMarginPct,
      ebitda, ebitdaPct, ebit, csll, irpj, netProfit, netProfitPct,
    },
    update: {
      grossRevenue, issDeduction, pisDeduction, cofinsDeduction,
      totalDeductions, netRevenue,
      costHHDev, costHHField: 0,
      costTravel, costSupplies, totalDirectCost,
      grossMargin, grossMarginPct,
      ebitda, ebitdaPct, ebit, csll, irpj, netProfit, netProfitPct,
    },
  });
}
