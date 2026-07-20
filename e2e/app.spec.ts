import { expect, test, type Page } from '@playwright/test'

const accountId = '11111111-1111-4111-8111-111111111111'
const prefix = `viva-user-${accountId}:`
const profile = {
  name: 'Pessoa Teste', weight: 70, height: 170, age: 30, sex: 'masculino', activity: 1.375,
  goal: 'manter', waterMultiplier: 35, fitnessLevel: 'iniciante', trainingDays: 3,
  sessionMinutes: 45, equipment: 'academia', trainingPlace: 'academia', gymType: 'rede',
  homeSetup: 'nenhum', hiitReady: true, limitations: '',
}

async function prepare(page: Page, onboardingComplete = true) {
  await page.addInitScript(({ accountId, prefix, profile, onboardingComplete }) => {
    if (sessionStorage.getItem('viva-e2e-seeded') !== 'true') {
      localStorage.clear()
      localStorage.setItem('viva-auth-session', JSON.stringify({ id: accountId, email: 'teste@viva.app', accessToken: 'token-e2e', expiresAt: Date.now() + 86_400_000 }))
      if (onboardingComplete) {
        localStorage.setItem(`${prefix}viva-profile`, JSON.stringify(profile))
        localStorage.setItem(`${prefix}viva-onboarding-complete`, 'true')
      }
      localStorage.setItem(`${prefix}viva-points`, JSON.stringify([{ id: 'welcome', date: new Date().toLocaleDateString('en-CA'), type: 'cadastro', label: 'Boas-vindas', points: 100, bonus: true }]))
      sessionStorage.setItem('viva-e2e-seeded', 'true')
    }
    class FakeNotification { static permission = 'granted'; static requestPermission = async () => 'granted' }
    Object.defineProperty(window, 'Notification', { value: FakeNotification, configurable: true })
    Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true })
    Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => ({}), getRegistrations: async () => [], ready: Promise.resolve({ pushManager: { getSubscription: async () => null, subscribe: async () => ({ toJSON: () => ({ endpoint: 'https://push.test/device', keys: { p256dh: 'p', auth: 'a' } }) }) }, showNotification: async () => undefined }) }, configurable: true })
    Object.defineProperty(navigator, 'vibrate', { value: () => true, configurable: true })
  }, { accountId, prefix, profile, onboardingComplete })
  await page.route('**/*.supabase.co/**', async route => {
    const url = route.request().url()
    const method = route.request().method()
    let body: unknown = {}
    if (url.includes('/profiles?') && url.includes('select=display_name')) body = [{ display_name: 'Pessoa Teste', avatar_url: null, points: 100, level: 'Iniciante' }]
    else if (url.includes('/profiles?') && url.includes('appear_in_ranking')) body = [{ appear_in_ranking: true }]
    else if (url.includes('/leaderboard?')) body = [{ display_name: 'Pessoa Teste', points: 100, level: 'Iniciante', avatar_url: null }]
    else if (url.includes('/point_events?') || url.includes('/user_achievements?')) body = []
    else if (url.includes('/user_backups?') && method === 'GET') body = []
    else if (url.includes('/user_backups?')) body = [{ updated_at: new Date().toISOString() }]
    else if (url.includes('/send-water-reminders')) body = { sent: 1 }
    else if (url.includes('/award-points')) body = { awarded: 10 }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.goto('/')
  if (onboardingComplete) await expect(page.locator('.dashboard')).toBeVisible()
}

async function openMore(page: Page, label: string) {
  await page.getByRole('button', { name: 'Mais' }).click()
  await page.getByRole('dialog', { name: 'Mais opções' }).getByRole('button', { name: new RegExp(label) }).click()
}

test('navega por todas as áreas e exibe as novas telas', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Água' }).click()
  await expect(page.getByRole('heading', { name: 'Sua água, gole a gole.' })).toBeVisible()
  await page.getByRole('button', { name: 'Treino' }).click()
  await expect(page.getByText('TREINO GUIADO', { exact: true })).toBeVisible()
  for (const [menu, heading] of [['Refeições', 'Comer bem, sem complicação.'], ['Objetivos', 'Personalização da sua jornada.'], ['Relatórios', 'Seu progresso em perspectiva.'], ['Conquistas', 'Sua constância vale pontos.'], ['Ranking', 'Ranking global'], ['Privacidade', 'Seus dados, sem surpresa.'], ['Meu perfil', 'Seu perfil.']]) {
    await openMore(page, menu)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
})

test('registra água, controla lembretes e envia push de teste', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Água' }).click()
  await page.getByRole('button', { name: '+ 300 ml' }).click()
  await expect(page.getByText('300 ml', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ativar lembretes' }).click()
  await expect(page.getByRole('heading', { name: 'Lembretes ativos' })).toBeVisible()
  await page.getByRole('button', { name: /Enviar notificação de teste/ }).click()
  await expect(page.getByText(/Push enviado para 1 dispositivo/)).toBeVisible()
  await page.getByRole('button', { name: 'Excluir registro' }).click()
  await expect(page.getByText('Nenhuma água registrada ainda.')).toBeVisible()
})

test('registra alimento em gramas, favorito e alimento personalizado', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Refeições')
  await page.getByRole('button', { name: /Adicionar alimento/ }).click()
  await page.getByPlaceholder(/Buscar arroz/).fill('Arroz')
  await page.getByRole('button', { name: 'Favoritar' }).click()
  await page.getByRole('button', { name: /Arroz branco cozido/ }).click()
  await page.getByLabel('Quantidade consumida').fill('150')
  await page.getByRole('button', { name: 'Adicionar ao diário' }).click()
  await expect(page.getByText('150 g')).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar porção' }).click()
  await expect(page.getByText('160g')).toBeVisible()
  await page.getByRole('button', { name: /Adicionar alimento/ }).click()
  await page.getByRole('button', { name: 'Criar alimento' }).click()
  await page.getByLabel('Nome').fill('Receita teste')
  await page.getByLabel('Porção (g)').fill('80')
  await page.getByLabel('Calorias').fill('120')
  await page.getByLabel('Proteínas (g)').fill('8')
  await page.getByRole('button', { name: 'Salvar alimento' }).click()
  await expect(page.getByRole('heading', { name: 'Receita teste' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao diário' }).click()
  await expect(page.getByText('Receita teste', { exact: true })).toBeVisible()
})

test('executa treino guiado completo e salva feedback', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Treino' }).click()
  await page.getByRole('button', { name: 'Iniciar treino guiado' }).click()
  const tabsText = await page.locator('.exercise-player-nav small').textContent()
  const total = Number(tabsText?.match(/DE (\d+)/)?.[1] || 1)
  for (let exercise = 0; exercise < total; exercise++) {
    const checks = page.getByRole('button', { name: /Concluir série/ })
    while (await checks.count()) await checks.first().click()
    if (exercise < total - 1) await page.getByRole('button', { name: 'Próximo exercício' }).click()
  }
  await page.getByRole('button', { name: /Concluir treino/ }).click()
  await page.getByRole('button', { name: /Na medida/ }).click()
  await page.getByRole('button', { name: 'Salvar e concluir treino' }).click()
  await expect(page.getByText('1 sessões')).toBeVisible()
})

test('edita objetivos, registra peso e consulta relatórios', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Objetivos')
  await page.getByLabel('Peso (kg)').fill('71.5')
  await page.locator('.weight-input input').fill('71.5')
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(page.getByText('71.5 kg')).toBeVisible()
  await openMore(page, 'Relatórios')
  await expect(page.getByRole('heading', { name: '28 dias de consistência' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Evolução registrada' })).toBeVisible()
})

test('ranking, privacidade, tema e controles da conta respondem', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Ranking')
  await page.getByRole('switch', { name: /Aparecer no ranking/ }).uncheck()
  await openMore(page, 'Privacidade')
  await expect(page.getByText('Backup privado ativado')).toBeVisible()
  await openMore(page, 'Meu perfil')
  await page.getByLabel('Nome exibido').fill('Nome Atualizado')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByText('Nome atualizado e sincronizado.')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar meus dados' }).click()
  await downloadPromise
  await page.locator('.mobile-theme-toggle').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/)
})

test('atalhos da tela inicial e registro de atividade respondem', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: '+ 250 ml' }).click()
  await expect(page.getByText(/250 ml registrados/)).toBeVisible()
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await page.getByRole('button', { name: /Caminhada/ }).click()
  await page.getByRole('button', { name: '45 min' }).click()
  await page.getByRole('button', { name: 'Registrar atividade' }).click()
  await expect(page.getByText('Caminhada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remover atividade' }).click()
  await expect(page.getByText(/registre atividades que você faz/)).toBeVisible()
  await page.getByRole('button', { name: /Adicionar refeição/ }).click()
  await expect(page.getByRole('heading', { name: 'Adicionar alimento' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar janela' }).click()
})

test('salva e remove rotina recorrente de refeições', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Refeições')
  await page.getByRole('button', { name: /Adicionar alimento/ }).click()
  await page.getByRole('button', { name: /Banana prata/ }).click()
  await page.getByRole('button', { name: 'Adicionar ao diário' }).click()
  const answers = ['Rotina teste', '1,3,5']
  page.on('dialog', dialog => dialog.accept(answers.shift() || ''))
  await page.getByRole('button', { name: 'Salvar o dia como rotina' }).click()
  await expect(page.getByText('Rotina teste')).toBeVisible()
  await page.locator('.meal-routines > div:last-child > span button').click()
  await expect(page.getByText(/Salve os alimentos de hoje/)).toBeVisible()
})

test('onboarding percorre voltar, academia, casa e sete dias', async ({ page }) => {
  await prepare(page, false)
  await expect(page.getByRole('heading', { name: 'Vamos conhecer você.' })).toBeVisible()
  await page.getByLabel('Como quer ser chamado?').fill('Pessoa Teste')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Agora, suas metas.' })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await expect(page.getByRole('heading', { name: 'Vamos conhecer você.' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Onde vai treinar?').selectOption('casa')
  await page.getByLabel('Nível atual').selectOption('avancado')
  await page.getByLabel('Dias disponíveis').selectOption('7')
  await page.getByRole('button', { name: 'Criar meu plano' }).click()
  await expect(page.locator('.dashboard')).toBeVisible()
})

test('alteração de e-mail, senha, foto e links do perfil respondem', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Meu perfil')
  await page.getByLabel('Novo e-mail').fill('novo@viva.app')
  await page.getByRole('button', { name: 'Alterar e-mail' }).click()
  await expect(page.getByText(/Confira o novo e-mail/)).toBeVisible()
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-123')
  await page.getByLabel('Confirmar nova senha').fill('senha-nova-123')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha atualizada com segurança.')).toBeVisible()
  await page.locator('input[type=file]').setInputFiles('public/icon-192.png')
  await expect(page.getByText(/Foto atualizada/)).toBeVisible()
  await page.getByRole('button', { name: 'Remover foto' }).click()
  await expect(page.getByText(/Foto removida/)).toBeVisible()
  await page.getByRole('button', { name: /Objetivos, dados físicos e treino/ }).click()
  await expect(page.getByRole('heading', { name: 'Personalização da sua jornada.' })).toBeVisible()
  await openMore(page, 'Meu perfil')
  await page.getByRole('button', { name: /Privacidade e transparência/ }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados, sem surpresa.' })).toBeVisible()
})

test('recuperação de senha e criação de conta respondem', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.route('**/*.supabase.co/**', async route => {
    const signup = route.request().url().includes('/signup')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(signup ? { user: { id: accountId, email: 'nova@viva.app' } } : {}) })
  })
  await page.goto('/')
  await page.getByLabel('E-mail').fill('teste@viva.app')
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click()
  await expect(page.getByText(/Enviamos o link de recuperação/)).toBeVisible()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.getByLabel('Como quer ser chamado?').fill('Nova Pessoa')
  await page.getByLabel('E-mail').fill('nova@viva.app')
  await page.getByLabel('Senha').fill('senha-segura-123')
  await page.getByRole('button', { name: /Criar conta e ganhar/ }).click()
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail.' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para o login' }).click()
  await expect(page.getByRole('heading', { name: 'Que bom ter você de volta.' })).toBeVisible()
})

test('pausa, retomada, substituição e descanso do treino respondem', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Treino' }).click()
  await page.getByRole('button', { name: 'Iniciar treino guiado' }).click()
  const substitute = page.getByRole('button', { name: /Trocar exercício/ })
  if (await substitute.count()) await substitute.click()
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByRole('button', { name: 'Continuar treino' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar treino' }).click()
  await page.getByRole('button', { name: /Concluir série 1/ }).click()
  await expect(page.getByText('DESCANSO', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '+30s' }).click()
  await page.getByRole('button', { name: 'Pular descanso' }).click()
  await expect(page.getByText('DESCANSO', { exact: true })).toHaveCount(0)
})

test('sair da conta retorna para o login', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Meu perfil')
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page.getByRole('heading', { name: 'Que bom ter você de volta.' })).toBeVisible()
})

test('exclusão confirmada remove a conta no fluxo simulado', async ({ page }) => {
  await prepare(page)
  await openMore(page, 'Meu perfil')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Excluir minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'Que bom ter você de volta.' })).toBeVisible()
})
