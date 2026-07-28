import { useState } from 'react'
import { useStore } from '../store'
import { brl, Modal, telefoneValido } from '../ui'
import type { Insumo, Motoboy, PontoVenda, Produto } from '../types'
import { custoUnitario } from '../pricing'

/* ---------------- Pontos de Venda (PDV) ---------------- */
export function PdvScreen() {
  const { dados, salvarPdv, excluirPdv } = useStore()
  const [edit, setEdit] = useState<PontoVenda | null>(null)

  const novo = (): PontoVenda => ({
    id: '', razaoSocial: '', cnpj: '', nomeContato: '', telefoneWhatsapp: '+55',
    email: '', endereco: '', tabelaPrecoId: dados.tabelasPreco[0]?.id ?? '', criadoEm: new Date().toISOString(),
  })

  return (
    <div>
      <div className="section-title">
        <h1>Pontos de Venda (PDV)</h1>
        <button className="btn" onClick={() => setEdit(novo())}>+ Novo PDV</button>
      </div>
      <div className="card">
        <table className="erp">
          <thead>
            <tr><th>Razão social</th><th>CNPJ</th><th>Contato</th><th>WhatsApp</th><th>Tabela</th><th></th></tr>
          </thead>
          <tbody>
            {dados.pontosVenda.map((p) => (
              <tr key={p.id}>
                <td>{p.razaoSocial}</td>
                <td>{p.cnpj}</td>
                <td>{p.nomeContato}</td>
                <td>{p.telefoneWhatsapp}</td>
                <td>{dados.tabelasPreco.find((t) => t.id === p.tabelaPrecoId)?.nome ?? '—'}</td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => setEdit(p)}>Editar</button>
                  <button className="btn danger sm" onClick={() => confirm('Excluir PDV?') && excluirPdv(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal titulo={edit.id ? 'Editar PDV' : 'Novo PDV'} onFechar={() => setEdit(null)}>
          <PdvForm inicial={edit} onSalvar={(p) => { salvarPdv(p); setEdit(null) }} />
        </Modal>
      )}
    </div>
  )
}

function PdvForm({ inicial, onSalvar }: { inicial: PontoVenda; onSalvar: (p: PontoVenda) => void }) {
  const { dados } = useStore()
  const [f, setF] = useState(inicial)
  const telOk = telefoneValido(f.telefoneWhatsapp)
  const podeSalvar = f.razaoSocial.trim() && f.endereco.trim() && telOk
  return (
    <div>
      <label className="field">Razão social
        <input value={f.razaoSocial} onChange={(e) => setF({ ...f, razaoSocial: e.target.value })} />
      </label>
      <label className="field">CNPJ
        <input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} />
      </label>
      <label className="field">Contato responsável
        <input value={f.nomeContato} onChange={(e) => setF({ ...f, nomeContato: e.target.value })} />
      </label>
      <label className="field">WhatsApp (E.164, ex.: +5511988887777)
        <input value={f.telefoneWhatsapp} onChange={(e) => setF({ ...f, telefoneWhatsapp: e.target.value })} />
        {!telOk && <span style={{ color: 'var(--bordo)' }}>Formato inválido</span>}
      </label>
      <label className="field">E-mail
        <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </label>
      <label className="field">Endereço de entrega
        <input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} />
      </label>
      <label className="field">Tabela de preço
        <select value={f.tabelaPrecoId} onChange={(e) => setF({ ...f, tabelaPrecoId: e.target.value })}>
          {dados.tabelasPreco.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </label>
      <button className="btn" disabled={!podeSalvar} onClick={() => onSalvar(f)}>Salvar</button>
    </div>
  )
}

/* ---------------- Produtos + Ficha Técnica ---------------- */
export function ProdutosScreen() {
  const { dados, salvarProduto, excluirProduto } = useStore()
  const [edit, setEdit] = useState<Produto | null>(null)
  return (
    <div>
      <div className="section-title">
        <h1>Produtos / Sabores</h1>
        <button className="btn" onClick={() => setEdit({ id: '', nome: '', descricao: '', unidadeVenda: 'caixa c/12', ativo: true })}>+ Novo produto</button>
      </div>
      <div className="card">
        <table className="erp">
          <thead>
            <tr><th>Produto</th><th>Descrição</th><th>Unidade</th><th>Custo/un</th><th>Ativo</th><th></th></tr>
          </thead>
          <tbody>
            {dados.produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td className="muted">{p.descricao}</td>
                <td>{p.unidadeVenda}</td>
                <td>{brl(custoUnitario(p.id, dados.fichasTecnicas, dados.insumos))}</td>
                <td>{p.ativo ? 'Sim' : 'Não'}</td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => setEdit(p)}>Editar</button>
                  <button className="btn danger sm" onClick={() => confirm('Excluir produto?') && excluirProduto(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal titulo={edit.id ? 'Editar produto' : 'Novo produto'} onFechar={() => setEdit(null)}>
          <ProdutoForm inicial={edit} onSalvar={(p) => { salvarProduto(p); setEdit(null) }} />
        </Modal>
      )}
    </div>
  )
}

function ProdutoForm({ inicial, onSalvar }: { inicial: Produto; onSalvar: (p: Produto) => void }) {
  const { dados } = useStore()
  const [f, setF] = useState(inicial)
  const ficha = dados.fichasTecnicas.filter((x) => x.produtoId === f.id)
  return (
    <div>
      <label className="field">Nome
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      </label>
      <label className="field">Descrição
        <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      </label>
      <label className="field">Unidade de venda
        <input value={f.unidadeVenda} onChange={(e) => setF({ ...f, unidadeVenda: e.target.value })} />
      </label>
      <label className="field row" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo
      </label>
      {f.id && (
        <div className="dica">Ficha técnica: {ficha.length} insumo(s) cadastrado(s).
          {ficha.map((x) => {
            const i = dados.insumos.find((i) => i.id === x.insumoId)
            return <div key={x.insumoId} className="muted">• {i?.nome}: {x.quantidadeUsada} {i?.unidade}/un</div>
          })}
        </div>
      )}
      <button className="btn mt" disabled={!f.nome.trim()} onClick={() => onSalvar(f)}>Salvar</button>
    </div>
  )
}

/* ---------------- Insumos ---------------- */
export function InsumosScreen() {
  const { dados, salvarInsumo, excluirInsumo } = useStore()
  const [edit, setEdit] = useState<Insumo | null>(null)
  return (
    <div>
      <div className="section-title">
        <h1>Insumos</h1>
        <button className="btn" onClick={() => setEdit({ id: '', nome: '', unidade: 'kg', precoUnitario: 0, estoqueAtual: 0 })}>+ Novo insumo</button>
      </div>
      <div className="card">
        <table className="erp">
          <thead><tr><th>Insumo</th><th>Unidade</th><th>Preço compra</th><th>Estoque</th><th></th></tr></thead>
          <tbody>
            {dados.insumos.map((i) => (
              <tr key={i.id}>
                <td>{i.nome}</td>
                <td>{i.unidade}</td>
                <td>{brl(i.precoUnitario)}</td>
                <td style={{ color: i.estoqueAtual < 3 ? 'var(--bordo)' : undefined }}>{i.estoqueAtual}</td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => setEdit(i)}>Editar</button>
                  <button className="btn danger sm" onClick={() => confirm('Excluir insumo?') && excluirInsumo(i.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal titulo={edit.id ? 'Editar insumo' : 'Novo insumo'} onFechar={() => setEdit(null)}>
          <InsumoForm inicial={edit} onSalvar={(i) => { salvarInsumo(i); setEdit(null) }} />
        </Modal>
      )}
    </div>
  )
}

function InsumoForm({ inicial, onSalvar }: { inicial: Insumo; onSalvar: (i: Insumo) => void }) {
  const [f, setF] = useState(inicial)
  return (
    <div>
      <label className="field">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
      <label className="field">Unidade<input value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })} /></label>
      <label className="field">Preço de compra (por unidade)
        <input type="number" step="0.01" value={f.precoUnitario} onChange={(e) => setF({ ...f, precoUnitario: Number(e.target.value) })} />
      </label>
      <label className="field">Estoque atual
        <input type="number" step="0.01" value={f.estoqueAtual} onChange={(e) => setF({ ...f, estoqueAtual: Number(e.target.value) })} />
      </label>
      <button className="btn" disabled={!f.nome.trim()} onClick={() => onSalvar(f)}>Salvar</button>
    </div>
  )
}

/* ---------------- Motoboys ---------------- */
export function MotoboysScreen() {
  const { dados, salvarMotoboy, excluirMotoboy } = useStore()
  const [edit, setEdit] = useState<Motoboy | null>(null)
  return (
    <div>
      <div className="section-title">
        <h1>Motoboys</h1>
        <button className="btn" onClick={() => setEdit({ id: '', nome: '', telefone: '+55', ativo: true })}>+ Novo motoboy</button>
      </div>
      <div className="card">
        <table className="erp">
          <thead><tr><th>Nome</th><th>Telefone</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {dados.motoboys.map((m) => (
              <tr key={m.id}>
                <td>{m.nome}</td><td>{m.telefone}</td><td>{m.ativo ? 'Sim' : 'Não'}</td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => setEdit(m)}>Editar</button>
                  <button className="btn danger sm" onClick={() => confirm('Excluir motoboy?') && excluirMotoboy(m.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal titulo={edit.id ? 'Editar motoboy' : 'Novo motoboy'} onFechar={() => setEdit(null)}>
          <MotoboyForm inicial={edit} onSalvar={(m) => { salvarMotoboy(m); setEdit(null) }} />
        </Modal>
      )}
    </div>
  )
}

function MotoboyForm({ inicial, onSalvar }: { inicial: Motoboy; onSalvar: (m: Motoboy) => void }) {
  const [f, setF] = useState(inicial)
  return (
    <div>
      <label className="field">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
      <label className="field">Telefone<input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></label>
      <label className="field row" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Ativo
      </label>
      <button className="btn" disabled={!f.nome.trim()} onClick={() => onSalvar(f)}>Salvar</button>
    </div>
  )
}

/* ---------------- Tabelas de Preço ---------------- */
export function TabelasPrecoScreen() {
  const { dados } = useStore()
  return (
    <div>
      <div className="section-title"><h1>Tabelas de Preço</h1></div>
      {dados.tabelasPreco.map((t) => (
        <div className="card mt" key={t.id}>
          <h3 className="section-title">{t.nome}</h3>
          <table className="erp">
            <thead><tr><th>Produto</th><th>Preço unitário base</th><th>Bonificação</th></tr></thead>
            <tbody>
              {dados.produtos.map((p) => {
                const preco = dados.precosPorPdv.find((x) => x.tabelaPrecoId === t.id && x.produtoId === p.id)
                const faixa = dados.faixasBonificacao.find((f) => f.produtoId === p.id)
                return (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{preco ? brl(preco.precoUnitarioBase) : '—'}</td>
                    <td className="muted">{faixa ? `${faixa.quantidadeMin}+ un → +${faixa.unidadesBonus} bônus` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
