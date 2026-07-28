import { useState } from 'react'
import { useStore } from '../store'
import { brl } from '../ui'
import { custoUnitario, margem, precoSugerido, precoUnitario, receita } from '../pricing'

export function PrecificacaoScreen() {
  const { dados } = useStore()
  const [margemDesejada, setMargemDesejada] = useState(0.5)
  const [tabelaId, setTabelaId] = useState(dados.tabelasPreco[0]?.id ?? '')
  const [pdvFiltro, setPdvFiltro] = useState('')

  const pedidosFiltrados = pdvFiltro
    ? dados.pedidos.filter((p) => p.pdvId === pdvFiltro)
    : dados.pedidos
  const r = receita(pedidosFiltrados, dados.fichasTecnicas, dados.insumos)

  return (
    <div>
      <div className="section-title"><h1>Custos e Precificação</h1></div>

      <div className="card">
        <div className="row">
          <label className="field" style={{ marginBottom: 0 }}>Margem desejada
            <input type="range" min={0.1} max={0.9} step={0.05} value={margemDesejada}
              onChange={(e) => setMargemDesejada(Number(e.target.value))} />
          </label>
          <strong>{Math.round(margemDesejada * 100)}%</strong>
          <label className="field right" style={{ marginBottom: 0 }}>Tabela de preço
            <select value={tabelaId} onChange={(e) => setTabelaId(e.target.value)}>
              {dados.tabelasPreco.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
        </div>
        <table className="erp mt">
          <thead><tr><th>Produto</th><th>Custo/un</th><th>Preço praticado</th><th>Margem atual</th><th>Preço sugerido</th></tr></thead>
          <tbody>
            {dados.produtos.map((p) => {
              const custo = custoUnitario(p.id, dados.fichasTecnicas, dados.insumos)
              const preco = precoUnitario(dados.precosPorPdv, tabelaId, p.id)
              const m = margem(preco, custo)
              const sugerido = precoSugerido(custo, margemDesejada)
              const abaixo = preco < custo
              return (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{brl(custo)}</td>
                  <td style={{ color: abaixo ? 'var(--bordo)' : undefined }}>
                    {brl(preco)} {abaixo && '⚠️'}
                  </td>
                  <td>{Math.round(m * 100)}%</td>
                  <td><strong>{brl(sugerido)}</strong></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="muted mt">⚠️ preço praticado abaixo do custo (ponto de equilíbrio).</p>
      </div>

      <div className="card mt">
        <div className="section-title">
          <h3>Relatório de Receita</h3>
          <label className="field" style={{ marginBottom: 0 }}>Filtrar por PDV
            <select value={pdvFiltro} onChange={(e) => setPdvFiltro(e.target.value)}>
              <option value="">Todos</option>
              {dados.pontosVenda.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cards">
          <div className="kpi"><span className="valor">{brl(r.bruta)}</span><span className="rotulo">Receita bruta</span></div>
          <div className="kpi"><span className="valor">{brl(r.custoTotal)}</span><span className="rotulo">Custo de produção</span></div>
          <div className="kpi"><span className="valor">{brl(r.liquida)}</span><span className="rotulo">Receita líquida</span></div>
          <div className="kpi"><span className="valor">{r.pedidos}</span><span className="rotulo">Pedidos válidos</span></div>
        </div>
      </div>
    </div>
  )
}
