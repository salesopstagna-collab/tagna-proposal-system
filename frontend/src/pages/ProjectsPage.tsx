import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Loader2, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, PROJECT_STATUS, cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const schema = z.object({
  hubspotDealId: z.string().min(1, 'ID da deal HubSpot obrigatório'),
  projectNumber: z.string().min(1, 'Número do projeto obrigatório'),
  clientName: z.string().min(1, 'Nome do cliente obrigatório'),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function ProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/projects', data).then(r => r.data),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Projeto criado com sucesso!' });
      reset();
      setOpen(false);
      navigate(`/projects/${project.id}`);
    },
    onError: (e: any) => toast({ title: 'Erro ao criar projeto', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const filtered = projects.filter((p: any) => {
    const q = search.toLowerCase();
    const matchSearch = p.projectNumber?.toLowerCase().includes(q) || p.clientName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie todas as propostas e projetos</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar por número ou cliente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhum projeto encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receita Bruta (versão ativa)</TableHead>
                  <TableHead>Margem</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const st = PROJECT_STATUS[p.status] ?? { label: p.status, color: 'bg-gray-100 text-gray-700' };
                  const activeMem = p.memories?.find((m: any) => m.isActive);
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                      <TableCell className="font-semibold text-blue-700">{p.projectNumber}</TableCell>
                      <TableCell>{p.clientName}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', st.color)}>{st.label}</span>
                      </TableCell>
                      <TableCell>{activeMem?.dre ? formatCurrency(activeMem.dre.grossRevenue) : <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell>{activeMem?.dre ? <span className={activeMem.dre.grossMarginPct >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{activeMem.dre.grossMarginPct.toFixed(1)}%</span> : <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
            <div>
              <Label>Nº do Projeto (HubSpot)</Label>
              <Input {...register('projectNumber')} className="mt-1" placeholder="Ex: OT-2026-001" />
              {errors.projectNumber && <p className="text-red-500 text-xs mt-1">{errors.projectNumber.message}</p>}
            </div>
            <div>
              <Label>ID da Deal no HubSpot</Label>
              <Input {...register('hubspotDealId')} className="mt-1" placeholder="Ex: 12345678" />
              {errors.hubspotDealId && <p className="text-red-500 text-xs mt-1">{errors.hubspotDealId.message}</p>}
            </div>
            <div>
              <Label>Nome do Cliente</Label>
              <Input {...register('clientName')} className="mt-1" placeholder="Razão social ou nome fantasia" />
              {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName.message}</p>}
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input {...register('description')} className="mt-1" placeholder="Breve descrição do escopo" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar Projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
