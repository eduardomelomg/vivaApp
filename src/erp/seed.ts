import type { DadosERP } from './types'

// Dados iniciais de demonstração para o ERP Brownie do Dudu.
export function seedData(): DadosERP {
  const agora = new Date().toISOString()
  return {
    usuarios: [
      { id: 'u-admin', nome: 'Dudu (Dono)', email: 'dudu@browniedodudu.com', papel: 'admin' },
      { id: 'u-moto', nome: 'Carlos Motoboy', email: 'carlos@browniedodudu.com', papel: 'motoboy', vinculoId: 'm1' },
      { id: 'u-pdv', nome: 'Padaria Central', email: 'contato@padariacentral.com', papel: 'pdv', vinculoId: 'pdv1' },
    ],
    tabelasPreco: [
      { id: 't-padrao', nome: 'Padrão' },
      { id: 't-grande', nome: 'Grande Conta' },
    ],
    produtos: [
      { id: 'p1', nome: 'Brownie Tradicional', descricao: 'Chocolate meio amargo', unidadeVenda: 'caixa c/12', ativo: true },
      { id: 'p2', nome: 'Brownie Nutella', descricao: 'Recheio de avelã', unidadeVenda: 'caixa c/12', ativo: true },
      { id: 'p3', nome: 'Brownie Doce de Leite', descricao: 'Doce de leite artesanal', unidadeVenda: 'caixa c/12', ativo: true },
    ],
    insumos: [
      { id: 'i-choc', nome: 'Chocolate meio amargo', unidade: 'kg', precoUnitario: 42, estoqueAtual: 8 },
      { id: 'i-farinha', nome: 'Farinha de trigo', unidade: 'kg', precoUnitario: 6, estoqueAtual: 25 },
      { id: 'i-manteiga', nome: 'Manteiga', unidade: 'kg', precoUnitario: 38, estoqueAtual: 5 },
      { id: 'i-nutella', nome: 'Nutella', unidade: 'kg', precoUnitario: 55, estoqueAtual: 3 },
      { id: 'i-emb', nome: 'Embalagem/caixa', unidade: 'un', precoUnitario: 1.2, estoqueAtual: 400 },
    ],
    fichasTecnicas: [
      { produtoId: 'p1', insumoId: 'i-choc', quantidadeUsada: 0.06 },
      { produtoId: 'p1', insumoId: 'i-farinha', quantidadeUsada: 0.04 },
      { produtoId: 'p1', insumoId: 'i-manteiga', quantidadeUsada: 0.03 },
      { produtoId: 'p1', insumoId: 'i-emb', quantidadeUsada: 1 },
      { produtoId: 'p2', insumoId: 'i-choc', quantidadeUsada: 0.05 },
      { produtoId: 'p2', insumoId: 'i-nutella', quantidadeUsada: 0.03 },
      { produtoId: 'p2', insumoId: 'i-emb', quantidadeUsada: 1 },
      { produtoId: 'p3', insumoId: 'i-choc', quantidadeUsada: 0.04 },
      { produtoId: 'p3', insumoId: 'i-farinha', quantidadeUsada: 0.04 },
      { produtoId: 'p3', insumoId: 'i-emb', quantidadeUsada: 1 },
    ],
    precosPorPdv: [
      { tabelaPrecoId: 't-padrao', produtoId: 'p1', precoUnitarioBase: 6.5 },
      { tabelaPrecoId: 't-padrao', produtoId: 'p2', precoUnitarioBase: 7.5 },
      { tabelaPrecoId: 't-padrao', produtoId: 'p3', precoUnitarioBase: 7.0 },
      { tabelaPrecoId: 't-grande', produtoId: 'p1', precoUnitarioBase: 5.8 },
      { tabelaPrecoId: 't-grande', produtoId: 'p2', precoUnitarioBase: 6.8 },
      { tabelaPrecoId: 't-grande', produtoId: 'p3', precoUnitarioBase: 6.3 },
    ],
    faixasBonificacao: [
      { produtoId: 'p1', quantidadeMin: 40, unidadesBonus: 2 },
      { produtoId: 'p2', quantidadeMin: 40, unidadesBonus: 2 },
      { produtoId: 'p3', quantidadeMin: 40, unidadesBonus: 2 },
    ],
    pontosVenda: [
      {
        id: 'pdv1', razaoSocial: 'Padaria Central LTDA', cnpj: '12.345.678/0001-90',
        nomeContato: 'Ana', telefoneWhatsapp: '+5511988887777', email: 'contato@padariacentral.com',
        endereco: 'Av. Paulista, 1000 - São Paulo/SP', tabelaPrecoId: 't-padrao', criadoEm: agora,
      },
      {
        id: 'pdv2', razaoSocial: 'Cafeteria Bela Vista ME', cnpj: '98.765.432/0001-10',
        nomeContato: 'Bruno', telefoneWhatsapp: '+5511977776666', email: 'bruno@belavista.com',
        endereco: 'Rua Augusta, 500 - São Paulo/SP', tabelaPrecoId: 't-grande', criadoEm: agora,
      },
    ],
    motoboys: [
      { id: 'm1', nome: 'Carlos', telefone: '+5511966665555', ativo: true },
      { id: 'm2', nome: 'Diego', telefone: '+5511955554444', ativo: true },
    ],
    pedidos: [
      {
        id: 'ped-1', pdvId: 'pdv1', status: 'em_rota', enderecoEntrega: 'Av. Paulista, 1000 - São Paulo/SP',
        observacoes: 'Entregar antes das 10h', criadoEm: agora, valorTotal: 260,
        itens: [{ produtoId: 'p1', quantidade: 40, precoUnitario: 6.5, bonus: 2 }],
      },
      {
        id: 'ped-2', pdvId: 'pdv2', status: 'recebido', enderecoEntrega: 'Rua Augusta, 500 - São Paulo/SP',
        observacoes: '', criadoEm: agora, valorTotal: 116,
        itens: [{ produtoId: 'p2', quantidade: 20, precoUnitario: 6.8, bonus: 0 }],
      },
    ],
    entregas: [
      { id: 'e-1', pedidoId: 'ped-1', motoboyId: 'm1', status: 'em_rota', ordemRota: 1, horaSaida: agora },
    ],
    cobrancas: [
      {
        id: 'cob-1', pedidoId: 'ped-1', tipo: 'boleto', valor: 260, status: 'pendente',
        urlDocumento: 'https://sandbox.exemplo/boleto/cob-1.pdf',
        linhaDigitavel: '34191.79001 01043.510047 91020.150008 1 99990000026000',
        vencimento: new Date(Date.now() + 3 * 864e5).toISOString(), criadoEm: agora,
      },
    ],
    notificacoes: [
      {
        id: 'n-1', pedidoId: 'ped-1', canal: 'evolution_whatsapp', tipo: 'resumo',
        destinatario: '+5511988887777', statusEnvio: 'enviado', enviadoEm: agora,
        mensagem: 'Pedido ped-1 recebido: 40x Brownie Tradicional (+2 bônus). Total R$ 260,00.',
      },
    ],
  }
}
