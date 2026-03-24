import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function RatesPage() {
  const qc = useQueryClient();
  const [profEdits, setProfEdits] = useState<Record<string, { salePrice: string; costPrice: string }>>({});
  const [travelEdits, setTravelEdits] = useState<Record<string, { costPrice: string; salePrice: string }>>({});

  const { data: profRates = [], isLoading: loadingProf } = useQuery({
    queryKey: ['professional-rates'],
    queryFn: () => api.get('/rates/professional').then(r => r.data),
  });

  const { data: travelRates = [], isLoading: loadingTravel } = useQuery({
    queryKey: ['travel-rates'],
    queryFn: () => api.get('/rates/travel').then(r => r.data),
  });

  const saveProf = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/rates/professional/${id}`, data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['professional-rates'] });
      setProfEdits(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      toast({ title: 'Tarifa atualizada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  const saveTravel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/rates/travel/${id}`, data).then(r => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['travel-rates'] });
      setTravelEdits(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      toast({ title: 'Tarifa de viagem atualizada!' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.response?.data?.error, variant: 'destructive' }),
  });

  function getProfEdit(rate: any) {
    return profEdits[rate.id] ?? { salePrice: String(rate.salePrice), costPrice: String(rate.costPrice) };
  }

  function getTravelEdit(rate: any) {
    return travelEdits[rate.id] ?? { costPrice: String(rate.costPrice), salePrice: String(rate.salePrice) };
  }

  const hasProfChanges = Object.keys(profEdits).length > 0;
  const hasTravelChanges = Object.keys(travelEdits).length > 0;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tarifas</h1>
        <p className="text-gray-500 text-sm mt-1">Valores padrão aplicados a todos os projetos. Revisados anualmente.</p>
      </div>

      {/* Professional Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Tarifas por Perfil Profissional</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Preço de venda e custo por hora trabalhada</p>
          </div>
          {hasProfChanges && (
            <Button size="sm" onClick={() => {
              Object.entries(profEdits).forEach(([id, vals]) => {
                const rate = profRates.find((r: any) => r.id === id);
                if (!rate) return;
                saveProf.mutate({
                  id,
                  data: {
                    salePrice: parseFloat(vals.salePrice),
                    costPrice: parseFloat(vals.costPrice),
                    revenueDeductionPct: rate.revenueDeductionPct,
                    contributionMarginPct: rate.contributionMarginPct,
                    travelMarginPct: rate.travelMarginPct,
                  },
                });
              });
            }} disabled={saveProf.isPending}>
              {saveProf.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingProf ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Preço de Venda (R$/h)</TableHead>
                  <TableHead className="text-right">Custo (R$/h)</TableHead>
                  <TableHead className="text-right">Ded. Receita</TableHead>
                  <TableHead className="text-right">Margem Contrib.</TableHead>
                  <TableHead className="text-right">Margem Viagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profRates.map((rate: any) => {
                  const edit = getProfEdit(rate);
                  const isEdited = !!profEdits[rate.id];
                  return (
                    <TableRow key={rate.id} className={isEdited ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-semibold text-gray-800">{rate.profile}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={edit.salePrice}
                          onChange={e => setProfEdits(prev => ({ ...prev, [rate.id]: { ...getProfEdit(rate), salePrice: e.target.value } }))}
                          className="w-28 text-right h-8 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={edit.costPrice}
                          onChange={e => setProfEdits(prev => ({ ...prev, [rate.id]: { ...getProfEdit(rate), costPrice: e.target.value } }))}
                          className="w-28 text-right h-8 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right text-gray-500">{rate.revenueDeductionPct}%</TableCell>
                      <TableCell className="text-right text-gray-500">{rate.contributionMarginPct}%</TableCell>
                      <TableCell className="text-right text-gray-500">{rate.travelMarginPct}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tax Rates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alíquotas de Impostos</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Alíquotas padrão utilizadas nas propostas. O ISS varia por município e deve ser configurado
            por projeto em <span className="font-medium">Parâmetros do Projeto</span>.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imposto</TableHead>
                <TableHead className="text-right">Alíquota</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'PIS + COFINS', rate: '3,65%', note: 'Regime cumulativo – alíquota fixa' },
                { label: 'IRPJ', rate: '4,80%', note: 'Lucro presumido – percentual aplicado sobre a receita' },
                { label: 'CSLL', rate: '2,88%', note: 'Lucro presumido – percentual aplicado sobre a receita' },
                { label: 'ISS', rate: 'Manual', note: 'Configurar por projeto – depende da legislação municipal' },
              ].map(row => (
                <TableRow key={row.label}>
                  <TableCell className="font-semibold text-gray-800">{row.label}</TableCell>
                  <TableCell className="text-right font-mono">{row.rate}</TableCell>
                  <TableCell className="text-xs text-gray-500">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Travel Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Tarifas de Viagem</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Custos utilizados no cálculo automático das atividades de campo</p>
          </div>
          {hasTravelChanges && (
            <Button size="sm" onClick={() => {
              Object.entries(travelEdits).forEach(([id, vals]) => {
                saveTravel.mutate({ id, data: { costPrice: parseFloat(vals.costPrice), salePrice: parseFloat(vals.salePrice) } });
              });
            }} disabled={saveTravel.isPending}>
              {saveTravel.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingTravel ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Custo (R$)</TableHead>
                  <TableHead className="text-right">Preço de Venda (R$)</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {travelRates.map((rate: any) => {
                  const edit = getTravelEdit(rate);
                  const isEdited = !!travelEdits[rate.id];
                  return (
                    <TableRow key={rate.id} className={isEdited ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-semibold text-gray-800">{rate.label}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{rate.unit}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={edit.costPrice}
                          onChange={e => setTravelEdits(prev => ({ ...prev, [rate.id]: { ...getTravelEdit(rate), costPrice: e.target.value } }))}
                          className="w-28 text-right h-8 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={edit.salePrice}
                          onChange={e => setTravelEdits(prev => ({ ...prev, [rate.id]: { ...getTravelEdit(rate), salePrice: e.target.value } }))}
                          className="w-28 text-right h-8 ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-gray-400 max-w-xs">{rate.notes || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
