import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, Copy, Star, Loader2, RefreshCw, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, PROJECT_STATUS, ROLES, cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newMemOpen, setNewMemOpen] = useState(false);
  const [newMemLabel, setNewMemLabel] = useState('');
  const [cloneFrom, setCloneFrom] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const createMemory = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/memories`, {
      label: newMemLabel || undefined,
      cloneFrom: cloneFrom || undefined,
    }).then(r => r.data),
    onSuccess: (mem) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: `Memória ${mem.label} criada!` });
      setNewMemOpen(false);
      setNewMemLabel('');
      setCloneFrom('');
      navigate(`/projects/${projectId}/memories/${mem.id}`);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const activateMem = useMutation({
    mutationFn: (memId: string) => api.post(`/projects/${projectId}/memories/${memId}/activate`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Versão ativa atualizada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.put(`/projects/${projectId}`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const syncHubspot = useMutation({
    mutationFn: () => api.post(`/hubspot/sync/${projectId}`).then(r => r.data),
    onSuccess: () => toast({ title: 'HubSpot sincronizado com sucesso!' }),
    onError: (e: any) => toast({ title: 'Erro ao sincronizar', description: e.response?.data?.error, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center items-center h-full py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!project) return <div className="p-8 text-gray-500">Projeto não encontrado.</div>;

  const st = PROJECT_STATUS[project.status] ?? { label: project.status, color: 'bg-gray-100 text-gray-700' };
  const activeMem = project.memories?.find((m: any) => m.isActive);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.projectNumber}</h1>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', st.color)}>{st.label}</span>
          </div>
          <p className="text-gray-600 mt-1">{project.clientName}</p>
          {project.description && <p className="text-gray-400 text-sm">{project.description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Select value={project.status} onValueChange={v => updateStatus.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => syncHubspot.mutate()} disabled={syncHubspot.isPending || !activeMem}>
            {syncHubspot.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar HubSpot
          </Button>
          <Button size="sm" onClick={() => setNewMemOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Versão
          </Button>
        </div>
      </div>

      {activeMem?.dre && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Receita Bruta', value: formatCurrency(activeMem.dre.grossRevenue) },
            { label: 'Margem Bruta', value: `${activeMem.dre.grossMarginPct?.toFixed(1)}%`, highlight: activeMem.dre.grossMarginPct >= 0 },
            { label: 'EBITDA', value: `${activeMem.dre.ebitdaPct?.toFixed(1)}%` },
            { label: 'Lucro Líquido', value: formatCurrency(activeMem.dre.netProfit) },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className={cn('text-xl font-bold mt-1', item.highlight === false ? 'text-red-600' : item.highlight ? 'text-green-600' : 'text-gray-900')}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Versões da Memória de Cálculo</CardTitle>
          <span className="text-xs text-gray-400">{project.memories?.length || 0} versão(ões)</span>
        </CardHeader>
        <CardContent className="p-0">
          {(!project.memories || project.memories.length === 0) ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma memória de cálculo criada ainda</p>
              <Button size="sm" className="mt-3" onClick={() => setNewMemOpen(true)}>Criar primeira versão</Button>
            </div>
          ) : (
            <div className="divide-y">
              {project.memories.map((mem: any) => {
                const dre = mem.dre;
                return (
                  <div key={mem.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{mem.label}</span>
                        {mem.isActive && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            <Star className="w-3 h-3" /> Ativa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Versão {mem.version} · {formatDate(mem.updatedAt)}</p>
                    </div>
                    {dre && (
                      <div className="hidden md:flex gap-6 text-sm text-right">
                        <div>
                          <p className="text-xs text-gray-400">Receita Bruta</p>
                          <p className="font-semibold">{formatCurrency(dre.grossRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Margem</p>
                          <p className={cn('font-semibold', dre.grossMarginPct >= 0 ? 'text-green-600' : 'text-red-600')}>{dre.grossMarginPct?.toFixed(1)}%</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {!mem.isActive && (
                        <Button variant="outline" size="sm" onClick={() => activateMem.mutate(mem.id)}>
                          <Star className="w-3 h-3 mr-1" /> Ativar
                        </Button>
                      )}
                      <Button size="sm" onClick={() => navigate(`/projects/${projectId}/memories/${mem.id}`)}>
                        Abrir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={newMemOpen} onOpenChange={setNewMemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Versão de Memória</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rótulo (opcional)</Label>
              <Input value={newMemLabel} onChange={e => setNewMemLabel(e.target.value)} className="mt-1" placeholder="Ex: Rev A, v2, Proposta Final..." />
            </div>
            {project.memories?.length > 0 && (
              <div>
                <Label>Clonar a partir de</Label>
                <Select value={cloneFrom} onValueChange={setCloneFrom}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Nova versão em branco" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nova versão em branco</SelectItem>
                    {project.memories.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.label} (v{m.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Copiar todos os dados de uma versão anterior</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMemOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMemory.mutate()} disabled={createMemory.isPending}>
              {createMemory.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
