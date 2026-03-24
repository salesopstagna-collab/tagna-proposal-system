import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Plus, Trash2, Loader2, Download, RefreshCw,
  Settings, List, Clock, TrendingUp, Package, Flag, FileDown, Pencil
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatPct, cn, SCOPE_PHASES, TRAVEL_PHASE } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TABS = [
  { id: 'params', label: 'Parâmetros', icon: Settings },
  { id: 'scope', label: 'Matriz de Escopo', icon: List },
  { id: 'workorder', label: 'Ordem de Trabalho', icon: Clock },
  { id: 'dre', label: 'DRE', icon: TrendingUp },
  { id: 'supplies', label: 'Fornecimentos', icon: Package },
  { id: 'milestones', label: 'Marcos', icon: Flag },
  { id: 'documents', label: 'Documentos', icon: FileDown },
];

const PROFILES = ['HH Dev', 'HH Campo', 'Estagiário', 'Analista C', 'Analista B', 'Analista A', 'Consultor C', 'Consultor B', 'Consultor A'];
const SUPPLY_CATEGORIES = ['Painéis', 'Hardware', 'Software', 'Materiais', 'Serviços Terceiros'];


export function MemoryPage() {
  const { projectId, memoryId } = useParams<{ projectId: string; memoryId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('params');
  const [addScopeOpen, setAddScopeOpen] = useState(false);
  const [editScopeOpen, setEditScopeOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<any>(null);
  const [addingLineScopeItemId, setAddingLineScopeItemId] = useState<string | null>(null);
  // fieldDays = duração da tarefa em dias; totalHours é calculado pelo backend (fieldDays × 8)
  const [newLineValues, setNewLineValues] = useState({ professionalRateId: '', quantity: 1, fieldDays: 1, travelDays: 0, travelerCount: 1, flightCount: 0 });
  const [addSupplyOpen, setAddSupplyOpen] = useState(false);
  const [addMilestoneOpen, setAddMilestoneOpen] = useState(false);

  // Data fetches
  const { data: memory } = useQuery({
    queryKey: ['memory', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}`).then(r => r.data),
  });
  const { data: params } = useQuery({
    queryKey: ['params', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/parameters`).then(r => r.data),
  });
  const { data: scope = [] } = useQuery({
    queryKey: ['scope', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/scope`).then(r => r.data),
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ['workorders', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/work-orders`).then(r => r.data),
  });
  const { data: dre } = useQuery({
    queryKey: ['dre', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/dre`).then(r => r.data),
  });
  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/supplies`).then(r => r.data),
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', memoryId],
    queryFn: () => api.get(`/projects/${projectId}/memories/${memoryId}/milestones`).then(r => r.data),
  });

  // Work order ID (first/only)
  const workOrderId = workOrders[0]?.id;
  const workOrderLines: any[] = workOrders[0]?.lines || [];

  // --- PARAMS ---
  const paramsForm = useForm({
    defaultValues: params || {},
  });
  const { reset: resetParams } = paramsForm;

  useQuery({
    queryKey: ['params-init', memoryId, params],
    queryFn: () => { resetParams(params || {}); return null; },
    enabled: !!params,
  });

  const saveParams = useMutation({
    mutationFn: (data: any) => api.put(`/projects/${projectId}/memories/${memoryId}/parameters`, {
      ...data,
      cofinsRate: 0, // PIS/COFINS unificados em pisRate; cofinsRate não usado separadamente
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['params', memoryId] });
      qc.invalidateQueries({ queryKey: ['dre', memoryId] });
      toast({ title: 'Parâmetros salvos e DRE recalculada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  // --- SCOPE ---
  const scopeForm = useForm({ defaultValues: { phase: '', activity: '', detalhamento: '', premissasExclusoes: '', notes: '' } });

  function openAddScopeForPhase(phase?: string) {
    scopeForm.reset({ phase: phase || '', activity: '', detalhamento: '', premissasExclusoes: '', notes: '' });
    setAddScopeOpen(true);
  }

  const addScope = useMutation({
    mutationFn: (data: any) => {
      const phaseItems = scope.filter((s: any) => s.phase === data.phase);
      return api.post(`/projects/${projectId}/memories/${memoryId}/scope`, {
        ...data, order: phaseItems.length + 1, included: true,
      }).then(r => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scope', memoryId] }); scopeForm.reset(); setAddScopeOpen(false); toast({ title: 'Item de escopo adicionado!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const deleteScope = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/memories/${memoryId}/scope/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scope', memoryId] }); toast({ title: 'Item removido' }); },
  });

  const toggleScope = useMutation({
    mutationFn: ({ id, included }: { id: string; included: boolean }) =>
      api.put(`/projects/${projectId}/memories/${memoryId}/scope/${id}`, { included }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scope', memoryId] }),
  });

  const editScopeForm = useForm({ defaultValues: { phase: '', activity: '', detalhamento: '', premissasExclusoes: '', notes: '' } });

  function openEditScope(item: any) {
    setEditingScope(item);
    editScopeForm.reset({
      phase: item.phase || '',
      activity: item.activity || '',
      detalhamento: item.detalhamento || '',
      premissasExclusoes: item.premissasExclusoes || '',
      notes: item.notes || '',
    });
    setEditScopeOpen(true);
  }

  const updateScope = useMutation({
    mutationFn: (data: any) => api.put(`/projects/${projectId}/memories/${memoryId}/scope/${editingScope.id}`, {
      ...data,
      order: editingScope.order,
      included: editingScope.included,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scope', memoryId] });
      setEditScopeOpen(false);
      setEditingScope(null);
      toast({ title: 'Item atualizado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  // --- WORK ORDER ---
  const { data: profRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['professional-rates'],
    queryFn: () => api.get('/rates/professional').then(r => r.data),
  });

  function startAddLine(scopeItemId: string) {
    setNewLineValues({ professionalRateId: '', quantity: 1, fieldDays: 1, travelDays: 0, travelerCount: 1, flightCount: 0 });
    setAddingLineScopeItemId(scopeItemId);
  }

  const addLine = useMutation({
    mutationFn: (payload: any) => api.post(`/projects/${projectId}/memories/${memoryId}/work-orders/${workOrderId}/lines`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workorders', memoryId] });
      qc.invalidateQueries({ queryKey: ['dre', memoryId] });
      setAddingLineScopeItemId(null);
      toast({ title: 'Linha adicionada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  function submitNewLine(scopeItemId: string, isTravelPhase: boolean) {
    const existingCount = workOrderLines.filter((l: any) => l.scopeItemId === scopeItemId).length;
    if (isTravelPhase) {
      addLine.mutate({ scopeItemId, lineType: 'travel', travelDays: newLineValues.travelDays, travelerCount: newLineValues.travelerCount, flightCount: newLineValues.flightCount, order: existingCount + 1 });
    } else {
      // fieldDays → backend calcula totalHours = fieldDays × 8
      addLine.mutate({ scopeItemId, lineType: 'work', professionalRateId: newLineValues.professionalRateId, quantity: newLineValues.quantity, fieldDays: newLineValues.fieldDays, order: existingCount + 1 });
    }
  }

  const deleteLine = useMutation({
    mutationFn: (lineId: string) => api.delete(`/projects/${projectId}/memories/${memoryId}/work-orders/${workOrderId}/lines/${lineId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workorders', memoryId] });
      qc.invalidateQueries({ queryKey: ['dre', memoryId] });
      toast({ title: 'Linha removida' });
    },
  });

  // --- SUPPLIES ---
  const supplyForm = useForm({ defaultValues: { category: 'Painéis', description: '', unit: 'un', quantity: 1, unitCost: 0, markup: 0 } });

  const addSupply = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${projectId}/memories/${memoryId}/supplies`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplies', memoryId] });
      qc.invalidateQueries({ queryKey: ['dre', memoryId] });
      supplyForm.reset({ category: 'Painéis', description: '', unit: 'un', quantity: 1, unitCost: 0, markup: 0 });
      setAddSupplyOpen(false);
      toast({ title: 'Item de fornecimento adicionado!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const deleteSupply = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/memories/${memoryId}/supplies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplies', memoryId] }); qc.invalidateQueries({ queryKey: ['dre', memoryId] }); toast({ title: 'Item removido' }); },
  });

  // --- MILESTONES ---
  const msForm = useForm({ defaultValues: { name: '', description: '', dueMonth: '', criteria: '', paymentPct: 0 } });

  const addMilestone = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${projectId}/memories/${memoryId}/milestones`, { ...data, dueDate: data.dueMonth || null, order: milestones.length + 1 }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['milestones', memoryId] }); msForm.reset(); setAddMilestoneOpen(false); toast({ title: 'Marco adicionado!' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const deleteMilestone = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${projectId}/memories/${memoryId}/milestones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['milestones', memoryId] }); toast({ title: 'Marco removido' }); },
  });

  // --- DOCUMENTS ---
  async function downloadDoc(type: 'commercial' | 'technical') {
    try {
      const res = await api.post(`/projects/${projectId}/memories/${memoryId}/documents/${type}`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_${type === 'commercial' ? 'Comercial' : 'Tecnica'}_${memory?.label || memoryId}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      let msg = 'Erro desconhecido';
      if (e.response?.data) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          msg = json.error || text;
        } catch {
          msg = e.response.statusText || msg;
        }
      } else if (e.message) {
        msg = e.message;
      }
      toast({ title: 'Erro ao gerar documento', description: msg, variant: 'destructive' });
    }
  }


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">{memory?.label || '...'}</h1>
          <p className="text-xs text-gray-400">Versão {memory?.version} · Memória de Cálculo</p>
        </div>
        {dre && (
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-400">Receita Bruta</p>
              <p className="font-semibold">{formatCurrency(dre.grossRevenue || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Margem Bruta</p>
              <p className={cn('font-semibold', (dre.grossMarginPct || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatPct(dre.grossMarginPct || 0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b bg-white px-6 overflow-x-auto">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">

        {/* PARÂMETROS */}
        {tab === 'params' && (
          <form onSubmit={paramsForm.handleSubmit(d => saveParams.mutate(d))} className="max-w-3xl space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Custo e Preço de Hora (HH)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'costHHDev', label: 'Custo HH Desenvolvimento (R$)' },
                  { name: 'priceHHDev', label: 'Preço HH Desenvolvimento (R$)' },
                  { name: 'costHHField', label: 'Custo HH Campo (R$)' },
                  { name: 'priceHHField', label: 'Preço HH Campo (R$)' },
                  { name: 'priceHHSupport', label: 'Preço HH Suporte (R$)' },
                ].map(f => (
                  <div key={f.name}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type="number" step="0.01" {...paramsForm.register(f.name as any, { valueAsNumber: true })} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Custos de Viagem (por dia)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'airfare', label: 'Passagem Aérea (R$)' },
                  { name: 'hotelPerDay', label: 'Diária Hotel (R$)' },
                  { name: 'carRentalPerDay', label: 'Locação Veículo/dia (R$)' },
                  { name: 'mealsPerDay', label: 'Alimentação/dia (R$)' },
                  { name: 'fuel', label: 'Combustível (R$)' },
                  { name: 'mobilization', label: 'Mobilização (R$)' },
                ].map(f => (
                  <div key={f.name}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type="number" step="0.01" {...paramsForm.register(f.name as any, { valueAsNumber: true })} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-gray-600 uppercase tracking-wide">Alíquotas de Impostos (%)</CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  PIS/COFINS, IRPJ e CSLL seguem as alíquotas padrão do regime de lucro presumido (ver aba <span className="font-medium">Tarifas</span>). ISS varia por município — informe manualmente.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'issRate',  label: 'ISS (%)',        hint: 'Manual por município' },
                  { name: 'pisRate',  label: 'PIS/COFINS (%)', hint: 'Padrão: 3,65%' },
                  { name: 'csllRate', label: 'CSLL (%)',       hint: 'Padrão: 2,88%' },
                  { name: 'irpjRate', label: 'IRPJ (%)',       hint: 'Padrão: 4,80%' },
                ].map(f => (
                  <div key={f.name}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type="number" step="0.01" placeholder={f.hint} {...paramsForm.register(f.name as any, { valueAsNumber: true })} className="mt-1" />
                    <p className="text-xs text-gray-400 mt-0.5">{f.hint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button type="submit" disabled={saveParams.isPending}>
              {saveParams.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Parâmetros'}
            </Button>
          </form>
        )}

        {/* ESCOPO */}
        {tab === 'scope' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{scope.length} atividade(s) · {scope.filter((s: any) => s.included).length} incluída(s)</p>
              <Button size="sm" onClick={() => openAddScopeForPhase()}><Plus className="w-4 h-4 mr-2" />Adicionar Atividade</Button>
            </div>
            {scope.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-gray-400">Nenhuma atividade de escopo cadastrada</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {SCOPE_PHASES.map((phase, phaseIdx) => {
                  const items = scope.filter((s: any) => s.phase === phase);
                  return (
                    <Card key={phase}>
                      {/* Phase header */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b rounded-t-lg">
                        <span className="text-xs font-bold text-slate-400 w-5 text-right">{phaseIdx + 1}</span>
                        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{phase}</span>
                        <span className="text-xs text-slate-400">{items.filter((i: any) => i.included).length}/{items.length} incluído(s)</span>
                        <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2" onClick={() => openAddScopeForPhase(phase)}>
                          <Plus className="w-3.5 h-3.5 mr-1" />Adicionar item
                        </Button>
                      </div>
                      {items.length === 0 ? (
                        <CardContent className="py-5 flex items-center justify-center">
                          <button
                            onClick={() => openAddScopeForPhase(phase)}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-600 transition-colors border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-lg px-6 py-3"
                          >
                            <Plus className="w-4 h-4" />
                            Clique para adicionar o primeiro item desta fase
                          </button>
                        </CardContent>
                      ) : (
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-white">
                                <TableHead className="w-8 text-xs">#</TableHead>
                                <TableHead className="text-xs">Atividade</TableHead>
                                <TableHead className="text-xs">Detalhamento</TableHead>
                                <TableHead className="text-xs">Premissas e Exclusões</TableHead>
                                <TableHead className="w-20 text-xs">Incluso</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any) => (
                                <TableRow key={item.id} className={!item.included ? 'opacity-40' : ''}>
                                  <TableCell className="text-gray-400 text-xs">{item.order}</TableCell>
                                  <TableCell className="font-medium text-sm">{item.activity}</TableCell>
                                  <TableCell className="text-sm text-gray-500 max-w-[220px]">
                                    <span className="line-clamp-2 whitespace-pre-wrap">{item.detalhamento || '—'}</span>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-500 max-w-[180px]">
                                    <span className="line-clamp-2 whitespace-pre-wrap">{item.premissasExclusoes || '—'}</span>
                                  </TableCell>
                                  <TableCell>
                                    <button
                                      onClick={() => toggleScope.mutate({ id: item.id, included: !item.included })}
                                      className={cn('w-10 h-5 rounded-full transition-colors', item.included ? 'bg-green-500' : 'bg-gray-300')}
                                    >
                                      <span className={cn('block w-4 h-4 bg-white rounded-full shadow transform transition-transform mx-0.5', item.included ? 'translate-x-5' : 'translate-x-0')} />
                                    </button>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-600 h-7 w-7" onClick={() => openEditScope(item)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => deleteScope.mutate(item.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            <Dialog open={addScopeOpen} onOpenChange={setAddScopeOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Atividade de Escopo</DialogTitle></DialogHeader>
                <form onSubmit={scopeForm.handleSubmit(d => addScope.mutate(d))} className="space-y-4">
                  <div>
                    <Label>Fase</Label>
                    <Select value={scopeForm.watch('phase')} onValueChange={v => scopeForm.setValue('phase', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                      <SelectContent>{SCOPE_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Atividade</Label>
                    <Input {...scopeForm.register('activity')} className="mt-1" placeholder="Descreva a atividade" />
                  </div>
                  <div>
                    <Label>Detalhamento <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <textarea
                      {...scopeForm.register('detalhamento')}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Descreva os detalhes desta atividade..."
                    />
                  </div>
                  <div>
                    <Label>Premissas e Exclusões <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <textarea
                      {...scopeForm.register('premissasExclusoes')}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Liste premissas e o que está excluído do escopo..."
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddScopeOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={addScope.isPending}>{addScope.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Adicionar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Scope Dialog */}
            <Dialog open={editScopeOpen} onOpenChange={setEditScopeOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Editar Atividade de Escopo</DialogTitle></DialogHeader>
                <form onSubmit={editScopeForm.handleSubmit(d => updateScope.mutate(d))} className="space-y-4">
                  <div>
                    <Label>Fase</Label>
                    <Select value={editScopeForm.watch('phase')} onValueChange={v => editScopeForm.setValue('phase', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
                      <SelectContent>{SCOPE_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Atividade</Label>
                    <Input {...editScopeForm.register('activity')} className="mt-1" />
                  </div>
                  <div>
                    <Label>Detalhamento <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <textarea
                      {...editScopeForm.register('detalhamento')}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <Label>Premissas e Exclusões <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <textarea
                      {...editScopeForm.register('premissasExclusoes')}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Liste premissas e o que está excluído do escopo..."
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditScopeOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={updateScope.isPending}>{updateScope.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ── ORDEM DE TRABALHO ── */}
        {tab === 'workorder' && (() => {
          const includedScope = (scope as any[]).filter((s: any) => s.included);
          const totalHH = workOrderLines.reduce((s: number, l: any) => s + (l.lineType === 'work' ? (l.totalHours || 0) * (l.quantity || 1) : 0), 0);
          const totalCost = workOrderLines.reduce((s: number, l: any) => s + (l.totalCost || 0), 0);
          const totalPrice = workOrderLines.reduce((s: number, l: any) => s + (l.totalPrice || 0), 0);
          return (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-6 text-sm bg-white border rounded-lg px-4 py-3">
                <span className="text-gray-500">HH Total: <strong>{totalHH.toFixed(0)}h</strong></span>
                <span className="text-gray-500">Custo: <strong>{formatCurrency(totalCost)}</strong></span>
                <span className="text-gray-500">Receita: <strong className="text-blue-700">{formatCurrency(totalPrice)}</strong></span>
              </div>

              {includedScope.length === 0 ? (
                <div className="text-center py-16 text-gray-400 border rounded-lg bg-white">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma atividade incluída no escopo</p>
                  <p className="text-sm mt-1">Vá até a aba <strong>Matriz de Escopo</strong> e marque as atividades como inclusas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {SCOPE_PHASES.map(phase => {
                    const phaseItems = includedScope.filter((s: any) => s.phase === phase);
                    if (phaseItems.length === 0) return null;
                    const isTravelPhase = phase === TRAVEL_PHASE;
                    return (
                      <Card key={phase}>
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b rounded-t-lg">
                          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{phase}</span>
                          {isTravelPhase && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Viagem</span>}
                        </div>
                        <CardContent className="p-0 divide-y">
                          {phaseItems.map((item: any) => {
                            const lines = workOrderLines.filter((l: any) => l.scopeItemId === item.id);
                            const isAdding = addingLineScopeItemId === item.id;
                            return (
                              <div key={item.id} className="p-4">
                                {/* Item header */}
                                {(() => {
                                  const workLines = lines.filter((l: any) => l.lineType !== 'travel');
                                  const taskDays = workLines[0]?.fieldDays ?? 0;
                                  const totalManHours = workLines.reduce((s: number, l: any) => s + (l.fieldDays ?? 0) * 8 * (l.quantity ?? 1), 0);
                                  const totalProfs = workLines.reduce((s: number, l: any) => s + (l.quantity ?? 1), 0);
                                  return (
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div>
                                        <p className="font-medium text-sm text-gray-800">{item.activity}</p>
                                        {item.detalhamento && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.detalhamento}</p>}
                                        {workLines.length > 0 && (
                                          <p className="text-xs text-blue-600 mt-1">
                                            {totalProfs} profissional(is) · {taskDays}d · {totalManHours}h HH
                                          </p>
                                        )}
                                      </div>
                                      {!isAdding && (
                                        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={() => startAddLine(item.id)}>
                                          <Plus className="w-3.5 h-3.5 mr-1" />
                                          {isTravelPhase ? 'Adicionar viagem' : 'Adicionar profissional'}
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Existing lines */}
                                {lines.length > 0 && (
                                  <div className="space-y-1.5 mb-3">
                                    {lines.map((line: any) => (
                                      <div key={line.id} className="flex items-center gap-3 text-sm bg-gray-50 border rounded-md px-3 py-2">
                                        {line.lineType === 'travel' ? (
                                          <>
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Viagem</span>
                                            <span className="text-gray-600">{line.travelerCount} profissional(is)</span>
                                            <span className="text-gray-600">{line.travelDays} dia(s)</span>
                                            <span className="text-gray-600">{line.flightCount} voo(s)</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{line.professionalRate?.profile || '—'}</span>
                                            <span className="text-gray-600">{line.quantity}× profissional</span>
                                            <span className="text-gray-500 text-xs">{line.fieldDays}d · {(line.fieldDays * 8 * line.quantity).toFixed(0)}h HH</span>
                                          </>
                                        )}
                                        <span className="ml-auto font-semibold text-blue-700">{formatCurrency(line.totalPrice || 0)}</span>
                                        <span className="text-gray-400 text-xs">{formatCurrency(line.totalCost || 0)} custo</span>
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-6 w-6 shrink-0" onClick={() => deleteLine.mutate(line.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Empty state prompt */}
                                {lines.length === 0 && !isAdding && (
                                  <button onClick={() => startAddLine(item.id)} className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-200 hover:border-blue-300 rounded-md py-2 transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                    {isTravelPhase ? 'Informar dados de viagem' : 'Informar profissional e horas'}
                                  </button>
                                )}

                                {/* Inline add form */}
                                {isAdding && (
                                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-end gap-3 flex-wrap">
                                      {isTravelPhase ? (
                                        <>
                                          <div>
                                            <Label className="text-xs">Profissionais</Label>
                                            <Input type="number" min="1" value={newLineValues.travelerCount} onChange={e => setNewLineValues(v => ({ ...v, travelerCount: +e.target.value }))} className="w-24 mt-1 h-8 text-sm" />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Dias em campo</Label>
                                            <Input type="number" min="0" value={newLineValues.travelDays} onChange={e => setNewLineValues(v => ({ ...v, travelDays: +e.target.value }))} className="w-24 mt-1 h-8 text-sm" />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Viagens aéreas</Label>
                                            <Input type="number" min="0" value={newLineValues.flightCount} onChange={e => setNewLineValues(v => ({ ...v, flightCount: +e.target.value }))} className="w-28 mt-1 h-8 text-sm" />
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            <Label className="text-xs">Perfil profissional</Label>
                                            <Select value={newLineValues.professionalRateId} onValueChange={v => setNewLineValues(prev => ({ ...prev, professionalRateId: v }))}>
                                              <SelectTrigger className="w-52 mt-1 h-8 text-sm">
                                                <SelectValue placeholder={ratesLoading ? 'Carregando...' : 'Selecione...'} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {(profRates as any[]).map((r: any) => (
                                                  <SelectItem key={r.id} value={r.id}>{r.profile}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Qtd</Label>
                                            <Input type="number" min="1" value={newLineValues.quantity} onChange={e => setNewLineValues(v => ({ ...v, quantity: +e.target.value }))} className="w-16 mt-1 h-8 text-sm" />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Dias</Label>
                                            <Input type="number" min="0" value={newLineValues.fieldDays} onChange={e => setNewLineValues(v => ({ ...v, fieldDays: +e.target.value }))} className="w-24 mt-1 h-8 text-sm" />
                                          </div>
                                          {newLineValues.fieldDays > 0 && (
                                            <div className="flex items-end pb-1.5">
                                              <span className="text-xs text-gray-400 whitespace-nowrap">= {newLineValues.fieldDays * 8 * newLineValues.quantity}h HH</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      <div className="flex gap-2 items-end pb-0.5">
                                        <Button size="sm" className="h-8" onClick={() => submitNewLine(item.id, isTravelPhase)} disabled={addLine.isPending || (!isTravelPhase && !newLineValues.professionalRateId)}>
                                          {addLine.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8" onClick={() => setAddingLineScopeItemId(null)}>Cancelar</Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* DRE */}
        {tab === 'dre' && (
          <div className="max-w-2xl space-y-4">
            {!dre || !dre.grossRevenue ? (
              <div className="text-center py-16 text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>A DRE é calculada automaticamente</p>
                <p className="text-sm mt-1">Preencha os parâmetros e adicione linhas na Ordem de Trabalho</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Demonstração do Resultado do Exercício
                    <span className="text-xs font-normal text-gray-400">Calculado automaticamente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {[
                      { label: 'Receita Bruta (ROB)', value: dre.grossRevenue, bold: true },
                      { label: '  (-) Deduções (ISS + PIS + COFINS)', value: -dre.totalDeductions, indent: true },
                      { label: 'Receita Líquida (ROL)', value: dre.netRevenue, bold: true, separator: true },
                      { label: '  (-) Custo HH Desenvolvimento', value: -dre.costHHDev, indent: true },
                      { label: '  (-) Custo HH Campo', value: -dre.costHHField, indent: true },
                      { label: '  (-) Custo Serviços Terceiros', value: -dre.costThirdParty, indent: true },
                      { label: '  (-) Custo Viagens', value: -dre.costTravel, indent: true },
                      { label: '  (-) Custo Fornecimentos', value: -dre.costSupplies, indent: true },
                      { label: 'Margem Bruta', value: dre.grossMargin, bold: true, pct: dre.grossMarginPct, separator: true, highlight: true },
                      { label: 'EBITDA', value: dre.ebitda, bold: true, pct: dre.ebitdaPct },
                      { label: 'EBIT', value: dre.ebit, bold: false },
                      { label: '  (-) CSLL', value: -dre.csll, indent: true },
                      { label: '  (-) IRPJ', value: -dre.irpj, indent: true },
                      { label: 'Lucro Líquido', value: dre.netProfit, bold: true, pct: dre.netProfitPct, separator: true, highlight: true },
                    ].map((row, i) => (
                      <div key={i}>
                        {row.separator && <div className="border-t my-2" />}
                        <div className={cn('flex justify-between py-1.5 px-3 rounded', row.bold ? 'font-semibold' : 'text-sm', row.highlight && row.value >= 0 ? 'bg-green-50' : row.highlight && row.value < 0 ? 'bg-red-50' : '')}>
                          <span className={cn(row.indent ? 'text-gray-500 pl-2' : 'text-gray-800')}>{row.label}</span>
                          <div className="flex items-center gap-3">
                            {row.pct !== undefined && (
                              <span className={cn('text-xs', row.value >= 0 ? 'text-green-600' : 'text-red-600')}>{formatPct(row.pct)}</span>
                            )}
                            <span className={cn(row.value < 0 ? 'text-red-600' : row.bold ? 'text-gray-900' : 'text-gray-600')}>
                              {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* FORNECIMENTOS */}
        {tab === 'supplies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Total de fornecimentos: <strong className="text-blue-700">{formatCurrency(supplies.reduce((s: number, i: any) => s + i.salePrice, 0))}</strong>
              </p>
              <Button size="sm" onClick={() => setAddSupplyOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Item</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                {supplies.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Nenhum fornecimento cadastrado</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead>Un</TableHead>
                        <TableHead className="text-right">Custo Unit.</TableHead>
                        <TableHead className="text-right">Markup</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplies.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{item.category}</span></TableCell>
                          <TableCell className="font-medium text-sm">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell className="text-right text-sm">{item.markup}%</TableCell>
                          <TableCell className="text-right font-semibold text-blue-700">{formatCurrency(item.salePrice)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => deleteSupply.mutate(item.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={addSupplyOpen} onOpenChange={setAddSupplyOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Fornecimento</DialogTitle></DialogHeader>
                <form onSubmit={supplyForm.handleSubmit(d => addSupply.mutate(d))} className="space-y-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={supplyForm.watch('category')} onValueChange={v => supplyForm.setValue('category', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SUPPLY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Descrição</Label><Input {...supplyForm.register('description')} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Quantidade</Label><Input type="number" step="0.01" {...supplyForm.register('quantity', { valueAsNumber: true })} className="mt-1" /></div>
                    <div><Label className="text-xs">Unidade</Label><Input {...supplyForm.register('unit')} className="mt-1" /></div>
                    <div><Label className="text-xs">Custo Unitário (R$)</Label><Input type="number" step="0.01" {...supplyForm.register('unitCost', { valueAsNumber: true })} className="mt-1" /></div>
                    <div><Label className="text-xs">Markup (%)</Label><Input type="number" step="0.1" {...supplyForm.register('markup', { valueAsNumber: true })} className="mt-1" /></div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddSupplyOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={addSupply.isPending}>{addSupply.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Adicionar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* MARCOS */}
        {tab === 'milestones' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {milestones.length} marco(s) · Pagamento total: <strong>{milestones.reduce((s: number, m: any) => s + (m.paymentPct || 0), 0)}%</strong>
              </p>
              <Button size="sm" onClick={() => setAddMilestoneOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Marco</Button>
            </div>
            <div className="space-y-3">
              {milestones.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border rounded-lg">Nenhum marco contratual cadastrado</div>
              ) : milestones.map((ms: any, i: number) => (
                <Card key={ms.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{ms.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{ms.paymentPct}% pagamento</span>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => deleteMilestone.mutate(ms.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {ms.criteria && <p className="text-sm text-gray-500 mt-1">{ms.criteria}</p>}
                        {ms.dueDate && <p className="text-xs text-gray-400 mt-1">Previsão: Mês {new Date(ms.dueDate).getUTCMonth() + 1}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={addMilestoneOpen} onOpenChange={setAddMilestoneOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Marco Contratual</DialogTitle></DialogHeader>
                <form onSubmit={msForm.handleSubmit(d => addMilestone.mutate(d))} className="space-y-4">
                  <div><Label>Nome do Marco</Label><Input {...msForm.register('name')} className="mt-1" placeholder="Ex: Kick-off, FAT, Comissionamento..." /></div>
                  <div><Label>Critério de Aceite</Label><Input {...msForm.register('criteria')} className="mt-1" placeholder="Como este marco é validado?" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">% Pagamento</Label><Input type="number" step="0.1" {...msForm.register('paymentPct', { valueAsNumber: true })} className="mt-1" /></div>
                    <div>
                      <Label className="text-xs">Previsão</Label>
                      <Select value={msForm.watch('dueMonth') || ''} onValueChange={v => msForm.setValue('dueMonth', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={`Mês ${i + 1}`}>Mês {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddMilestoneOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={addMilestone.isPending}>{addMilestone.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Adicionar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* DOCUMENTOS */}
        {tab === 'documents' && (
          <div className="max-w-xl space-y-4">
            <p className="text-sm text-gray-500">Gere as propostas a partir dos dados da memória de cálculo. Os templates devem estar na pasta <code className="bg-gray-100 px-1 rounded">backend/templates/</code>.</p>
            <div className="grid grid-cols-1 gap-4">
              {[
                { type: 'commercial' as const, title: 'Proposta Comercial', desc: 'Preços, pagamento, resumo financeiro e dados cadastrais', icon: '📄' },
                { type: 'technical' as const, title: 'Proposta Técnica', desc: 'Escopo detalhado, metodologia, marcos e histograma', icon: '📋' },
              ].map(doc => (
                <Card key={doc.type} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-4 flex items-center gap-4">
                    <span className="text-3xl">{doc.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-500">{doc.desc}</p>
                    </div>
                    <Button variant="outline" onClick={() => downloadDoc(doc.type)}>
                      <Download className="w-4 h-4 mr-2" /> Gerar .docx
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
