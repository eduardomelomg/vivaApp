import { useState } from 'react'
import './theme.css'
import { StoreProvider, useStore } from './store'
import type { Papel } from './types'
import { Dashboard } from './screens/Dashboard'
import { PdvScreen, ProdutosScreen, InsumosScreen, MotoboysScreen, TabelasPrecoScreen } from './screens/Cadastros'
import { PedidosScreen } from './screens/Pedidos'
import { PrecificacaoScreen } from './screens/Precificacao'
import { EntregasScreen } from './screens/Entregas'
import { FinanceiroScreen } from './screens/Financeiro'
import { MotoboyView } from './screens/MotoboyView'
import { NotificacoesScreen } from './screens/Notificacoes'

interface NavDef {
  chave: string
  rotulo: string
  icone: string
  papeis: Papel[]
}

const NAV: NavDef[] = [
  { chave: 'dashboard', rotulo: 'Dashboard', icone: '📊', papeis: ['admin'] },
  { chave: 'pedidos', rotulo: 'Pedidos', icone: '🧾', papeis: ['admin', 'pdv'] },
  { chave: 'pdv', rotulo: 'Pontos de Venda', icone: '🏪', papeis: ['admin'] },
  { chave: 'produtos', rotulo: 'Produtos', icone: '🍫', papeis: ['admin'] },
  { chave: 'insumos', rotulo: 'Insumos', icone: '📦', papeis: ['admin'] },
  { chave: 'tabelas', rotulo: 'Tabelas de Preço', icone: '💲', papeis: ['admin'] },
  { chave: 'motoboys', rotulo: 'Motoboys', icone: '🛵', papeis: ['admin'] },
  { chave: 'precificacao', rotulo: 'Custos & Preços', icone: '📈', papeis: ['admin'] },
  { chave: 'entregas', rotulo: 'Entregas', icone: '🗺️', papeis: ['admin'] },
  { chave: 'financeiro', rotulo: 'Financeiro', icone: '💰', papeis: ['admin'] },
  { chave: 'notificacoes', rotulo: 'Notificações', icone: '💬', papeis: ['admin'] },
  { chave: 'minhas-entregas', rotulo: 'Minhas entregas', icone: '🛵', papeis: ['motoboy'] },
]

function Login() {
  const { login } = useStore()
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Brownie <span>do Dudu</span></div>
        <p className="muted" style={{ marginBottom: 24 }}>ERP — Gestão B2B</p>
        <p className="muted" style={{ marginBottom: 12 }}>Entrar como (demonstração de RBAC):</p>
        <div className="grid" style={{ gap: 10 }}>
          <button className="btn" onClick={() => login('admin')}>👑 Admin / Dono</button>
          <button className="btn sec" onClick={() => login('motoboy')}>🛵 Motoboy</button>
          <button className="btn ghost" onClick={() => login('pdv')}>🏪 Portal do PDV</button>
        </div>
      </div>
    </div>
  )
}

function Shell() {
  const { usuario, logout, resetar } = useStore()
  const itens = NAV.filter((n) => usuario && n.papeis.includes(usuario.papel))
  const [tela, setTela] = useState(itens[0]?.chave ?? 'dashboard')

  // Garante que a tela atual é permitida ao papel logado.
  const telaAtual = itens.some((i) => i.chave === tela) ? tela : itens[0]?.chave

  function render() {
    switch (telaAtual) {
      case 'dashboard': return <Dashboard irPara={setTela} />
      case 'pedidos': return <PedidosScreen />
      case 'pdv': return <PdvScreen />
      case 'produtos': return <ProdutosScreen />
      case 'insumos': return <InsumosScreen />
      case 'tabelas': return <TabelasPrecoScreen />
      case 'motoboys': return <MotoboysScreen />
      case 'precificacao': return <PrecificacaoScreen />
      case 'entregas': return <EntregasScreen />
      case 'financeiro': return <FinanceiroScreen />
      case 'notificacoes': return <NotificacoesScreen />
      case 'minhas-entregas': return <MotoboyView />
      default: return <p className="muted">Selecione uma opção.</p>
    }
  }

  return (
    <div className="erp-shell">
      <nav className="erp-sidebar">
        <div className="erp-brand">Brownie<br /><span>do Dudu</span></div>
        {itens.map((n) => (
          <button
            key={n.chave}
            className={`erp-nav-item ${telaAtual === n.chave ? 'ativo' : ''}`}
            onClick={() => setTela(n.chave)}
          >
            <span>{n.icone}</span> {n.rotulo}
          </button>
        ))}
      </nav>
      <main className="erp-main">
        <div className="erp-topbar">
          <div />
          <div className="erp-user">
            <span>{usuario?.nome} · <strong>{usuario?.papel}</strong></span>
            <button className="btn ghost sm" onClick={resetar}>Resetar dados</button>
            <button className="btn ghost sm" onClick={logout}>Sair</button>
          </div>
        </div>
        {render()}
      </main>
    </div>
  )
}

function Root() {
  const { usuario } = useStore()
  return usuario ? <Shell /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  )
}
