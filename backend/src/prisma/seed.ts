import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@tagna.com.br' },
    update: {},
    create: { name: 'Administrador', email: 'admin@tagna.com.br', password: adminPassword, role: 'admin' },
  });

  // Professional Rates
  const professionalRates = [
    { profile: 'HH Dev',       order: 1, salePrice: 174.21, costPrice: 73.17 },
    { profile: 'HH Campo',     order: 2, salePrice: 225.05, costPrice: 94.52 },
    { profile: 'Estagiário',   order: 3, salePrice: 65.12,  costPrice: 27.35 },
    { profile: 'Analista C',   order: 4, salePrice: 134.19, costPrice: 56.36 },
    { profile: 'Analista B',   order: 5, salePrice: 182.38, costPrice: 76.60 },
    { profile: 'Analista A',   order: 6, salePrice: 240.50, costPrice: 101.01 },
    { profile: 'Consultor C',  order: 7, salePrice: 302.02, costPrice: 126.85 },
    { profile: 'Consultor B',  order: 8, salePrice: 370.02, costPrice: 155.41 },
    { profile: 'Consultor A',  order: 9, salePrice: 454.26, costPrice: 190.79 },
  ];

  for (const rate of professionalRates) {
    await prisma.professionalRate.upsert({
      where: { profile: rate.profile },
      update: { salePrice: rate.salePrice, costPrice: rate.costPrice },
      create: { ...rate, revenueDeductionPct: 13, contributionMarginPct: 45, travelMarginPct: 20 },
    });
  }

  // Travel Rates
  const travelRates = [
    { type: 'AEREO',     label: 'Aéreo',        costPrice: 1200.00, salePrice: 1791.04, unit: 'viagem',   notes: null },
    { type: 'HOTEL',     label: 'Hotel',         costPrice: 240.00,  salePrice: 358.21,  unit: 'diária',  notes: null },
    { type: 'CARRO_DIA', label: 'Carro (dia)',   costPrice: 130.00,  salePrice: 194.03,  unit: 'diária',  notes: 'Em atividades com mais de 20 dias, avaliar carro mensal' },
    { type: 'CARRO_MES', label: 'Carro (mês)',   costPrice: 3000.00, salePrice: 4477.61, unit: 'mês',     notes: 'Para atividades com mais de 20 dias corridos' },
    { type: 'ALMOCO',    label: 'Almoço',        costPrice: 40.00,   salePrice: 59.70,   unit: 'refeição',notes: 'Se almoço for na planta do cliente, retirar' },
    { type: 'JANTA',     label: 'Janta',         costPrice: 80.00,   salePrice: 119.40,  unit: 'refeição',notes: null },
    { type: 'TAXI',      label: 'Táxi',          costPrice: 120.00,  salePrice: 179.10,  unit: 'corrida', notes: null },
    { type: 'GASOLINA',  label: 'Gasolina',      costPrice: 7.00,    salePrice: 10.45,   unit: 'litro',   notes: 'Média de 80km/dia ou 8 litros/dia' },
  ];

  for (const rate of travelRates) {
    await prisma.travelRate.upsert({
      where: { type: rate.type },
      update: { costPrice: rate.costPrice, salePrice: rate.salePrice },
      create: rate,
    });
  }

  console.log('✅ Seed concluído.');
  console.log('   Admin: admin@tagna.com.br / admin123');
  console.log('   9 tarifas profissionais criadas');
  console.log('   8 tarifas de viagem criadas');
}

main().catch(console.error).finally(() => prisma.$disconnect());
