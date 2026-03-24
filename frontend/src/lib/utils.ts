import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export const ROLES: Record<string, string> = {
  admin: 'Administrador',
  sales_engineer: 'Sales Engineer',
  commercial: 'Comercial',
  field_team: 'Equipe de Campo',
  finance: 'Financeiro',
  viewer: 'Visualizador',
};

export const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  in_review: { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Fechado', color: 'bg-blue-100 text-blue-700' },
};

export const SCOPE_PHASES = [
  'INTERNALIZAÇÃO',
  'ANÁLISE',
  'DESENVOLVIMENTO DE PROJETO',
  'TESTES DE ACEITAÇÃO',
  'MOBILIZAÇÃO EMPRESA E EQUIPE',
  'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM',
  'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES',
  'IMPLANTAÇÃO DE CAMPO',
  'TREINAMENTOS',
  'OUTRAS ATIVIDADES',
  'FORNECIMENTOS',
  'ENCERRAMENTO DE PROJETO',
  'LISTA DE DESVIOS',
] as const;

export const TRAVEL_PHASE = 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM';
