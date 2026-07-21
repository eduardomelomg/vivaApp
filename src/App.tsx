import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { activities, foods } from './data'
import type { ActivityEntry, ActivityType, Food, MealItem, MealTemplate, PointsEvent, Profile, ReminderPreferences, WaterEntry, WeightEntry, WorkoutExerciseLog, WorkoutSession, WorkoutSetLog } from './types'
import { activityKcal, bmiLabel, claimLegacyStorage, cleanupOldDailyKeys, getMetrics, scopedStorageKey, todayKey, uid } from './utils'
import { generateWorkoutPlan } from './workout-engine'
import { evaluateHiit, PARQ_QUESTIONS, type ParqKey } from './hiit-gate'
import { achievements, awardDaily, createAchievementEvent, DAILY_POINTS_LIMIT, dailyPoints, evaluateAchievements, getLevel, totalPoints } from './rewards'
import { backendConfigured, consumeRecoverySession, createAccount, deleteAccount, disableWebPush, enableWebPush, fetchAccountSnapshot, fetchLeaderboard, fetchPrivateBackup, fetchRankingVisibility, getStoredAccount, markHydrationGoalComplete, refreshSession, removeAvatar, requestPasswordReset, savePrivateBackup, sendTestWaterReminder, setRankingVisibility, signIn, signOut, syncPointEvents, updateEmail, updatePassword, updatePublicProfile, uploadAvatar, type LeaderboardEntry, type VivaAccount } from './backend'
import { getPlantState, type PlantState } from './plant'
import { PlantCompanion } from './PlantCompanion'
import { completedSessionSets, createExerciseLog, findExerciseHistory, sessionVolume, workoutRecords } from './workout-progress'
import { collectPrivateBackup, disablePrivateSync, enablePrivateSync, localBackupUpdatedAt, markPrivateBackupSynced, notifyPrivateDataChanged, PRIVATE_DATA_CHANGED_EVENT, restorePrivateBackup } from './private-sync'
import { foodBaseGrams, macroGoals, mealNutrients, sumMeals } from './nutrition'

type Page = 'inicio' | 'agua' | 'refeicoes' | 'treino' | 'conquistas' | 'ranking' | 'objetivos' | 'relatorios' | 'privacidade' | 'perfil'
type ThemeMode = 'system' | 'light' | 'dark'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const defaultProfile: Profile = { name: '', weight: 70, height: 170, age: 30, sex: 'masculino', activity: 1.375, goal: 'manter', waterMultiplier: 35, fitnessLevel: 'iniciante', trainingDays: 3, sessionMinutes: 45, equipment: 'academia', trainingPlace: 'academia', gymType: 'rede', homeSetup: 'nenhum', hiitReady: false, parq: {}, parqWarmup: false, parqStop: false, limitations: '' }
const icons: Record<string, ReactElement> = {
  inicio: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  agua: <path d="M12 2S5.5 9 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9 12 2 12 2Z"/>,
  refeicoes: <><path d="M3 2v8a3 3 0 0 0 3 3h1V2M7 2v20M17 2v20M17 2c-3 2-4 6-4 9h4"/></>,
  treino: <><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></>,
  perfil: <><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></>,
  conquistas: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
  ranking: <><path d="M8 21V10h8v11M3 21v-6h5M16 14h5v7M9 6l3-3 3 3-3 2-3-2Z"/></>,
  objetivos: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l6-6M17 3h4v4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></>,
  relatorios: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  privacidade: <><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></>,
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

function useStoredState<T>(key: string, initial: T) {
  const initialValue = useRef(initial)
  const activeKey = useRef(key)
  const [value, setValue] = useState<T>(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : initial } catch { return initial }
  })
  useEffect(() => {
    if (activeKey.current !== key) {
      activeKey.current = key
      try {
        const saved = localStorage.getItem(key)
        setValue(saved ? JSON.parse(saved) : initialValue.current)
      } catch { setValue(initialValue.current) }
      return
    }
    const serialized = JSON.stringify(value)
    const previous = localStorage.getItem(key)
    if (previous !== serialized) {
      localStorage.setItem(key, serialized)
      if (previous !== null) notifyPrivateDataChanged(key)
    }
  }, [key, value])
  return [value, setValue] as const
}

function Ring({ value, max, color = '#4e9fd1', children, size = 142 }: { value: number; max: number; color?: string; children: React.ReactNode; size?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return <div className="ring" style={{ width: size, height: size, background: `conic-gradient(${color} ${pct}%, #e7e9e3 0)` }}>
    <span className="ring-marker" style={{ transform: `rotate(${pct * 3.6}deg)` }} aria-hidden="true"><i style={{ background: color }}/></span>
    <div className="ring-inner">{children}</div>
  </div>
}

export default function App() {
  const [activeDate, setActiveDate] = useState(todayKey)
  const [page, setPage] = useState<Page>(() => {
    const requested = new URLSearchParams(location.search).get('page') as Page | null
    return requested && ['inicio', 'agua', 'refeicoes', 'treino', 'conquistas', 'ranking', 'objetivos', 'relatorios', 'privacidade', 'perfil'].includes(requested) ? requested : 'inicio'
  })
  const [account, setAccount] = useState<VivaAccount | null>(() => getStoredAccount())
  if (account) claimLegacyStorage(account.id)
  const storageKey = (key: string) => scopedStorageKey(account?.id, key)
  const [profile, setProfile] = useStoredState<Profile>(storageKey('viva-profile'), defaultProfile)
  const [onboardingComplete, setOnboardingComplete] = useStoredState(storageKey('viva-onboarding-complete'), Boolean(localStorage.getItem(storageKey('viva-profile'))))
  const [water, setWater] = useStoredState<WaterEntry[]>(storageKey(`viva-water-${activeDate}`), [])
  const [meals, setMeals] = useStoredState<MealItem[]>(storageKey(`viva-meals-${activeDate}`), [])
  const [activityLog, setActivityLog] = useStoredState<ActivityEntry[]>(storageKey(`viva-activities-${activeDate}`), [])
  const [reminder, setReminder] = useStoredState<ReminderPreferences>(storageKey('viva-reminder'), { enabled: false, minutes: 60, startHour: '08:00', endHour: '22:00', stopAtGoal: true })
  const [points, setPoints] = useStoredState<PointsEvent[]>(storageKey('viva-points'), [])
  const [unlocked, setUnlocked] = useStoredState<string[]>(storageKey('viva-achievements'), [])
  const [sessions, setSessions] = useStoredState<WorkoutSession[]>(storageKey('viva-workout-sessions'), [])
  const [customFoods, setCustomFoods] = useStoredState<Food[]>(storageKey('viva-custom-foods'), [])
  const [favoriteFoods, setFavoriteFoods] = useStoredState<string[]>(storageKey('viva-favorite-foods'), [])
  const [mealTemplates, setMealTemplates] = useStoredState<MealTemplate[]>(storageKey('viva-meal-templates'), [])
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<'food' | 'activity' | 'profile' | 'auth' | null>(null)
  const [theme, setTheme] = useStoredState<ThemeMode>('viva-theme', 'system')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installDismissed, setInstallDismissed] = useStoredState('viva-install-dismissed', false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const privateSyncReady = useRef(false)
  const privateSyncTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const checkDate = () => setActiveDate(current => {
      const next = todayKey()
      return current === next ? current : next
    })
    const id = window.setInterval(checkDate, 30_000)
    window.addEventListener('focus', checkDate)
    document.addEventListener('visibilitychange', checkDate)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', checkDate)
      document.removeEventListener('visibilitychange', checkDate)
    }
  }, [])

  useEffect(() => {
    if (!backendConfigured) return
    const renew = () => { void refreshSession().then(setAccount).catch(() => setAccount(null)) }
    renew()
    const id = window.setInterval(renew, 5 * 60_000)
    window.addEventListener('focus', renew)
    return () => { clearInterval(id); window.removeEventListener('focus', renew) }
  }, [])

  useEffect(() => {
    if (!backendConfigured || !location.hash.includes('type=recovery')) return
    void consumeRecoverySession().then(recovered => {
      if (!recovered) return
      claimLegacyStorage(recovered.id)
      window.location.reload()
    }).catch(() => setToast('O link de recuperação é inválido ou expirou'))
  }, [])
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const metrics = useMemo(() => getMetrics(profile), [profile])
  const waterTotal = water.reduce((sum, item) => sum + item.amount, 0)
  const activityKcalTotal = activityLog.reduce((sum, item) => sum + item.kcal, 0)
  const totals = sumMeals(meals)
  const currentPoints = totalPoints(points)
  const pointsToday = dailyPoints(points)
  const plantState = useMemo(() => getPlantState(points, currentPoints), [points, currentPoints])

  useEffect(() => {
    if (isOnline && account) void syncPointEvents(points)
  }, [isOnline, account, points])

  useEffect(() => {
    if (!account || !navigator.onLine) return
    let active = true
    const hydrate = async () => {
      await syncPointEvents(points)
      const snapshot = await fetchAccountSnapshot()
      if (!active) return
      setProfile(current => ({ ...current, name: snapshot.displayName, avatar: snapshot.avatarUrl }))
      setPoints(snapshot.pointEvents)
      setUnlocked(snapshot.achievementIds)
    }
    void hydrate().catch(() => { /* dados locais continuam disponíveis offline */ })
    return () => { active = false }
  }, [account?.id])

  useEffect(() => {
    const accountId = account?.id
    privateSyncReady.current = false
    if (!accountId) return
    disablePrivateSync(accountId)
    if (!isOnline) return
    let cancelled = false
    const reconcile = async () => {
      const remote = await fetchPrivateBackup()
      if (cancelled) return
      const localUpdatedAt = localBackupUpdatedAt(accountId)
      if (remote && (!localUpdatedAt || remote.updatedAt > localUpdatedAt)) {
        restorePrivateBackup(accountId, remote.payload, remote.updatedAt)
        window.location.reload()
        return
      }
      if (!remote || localUpdatedAt > remote.updatedAt) markPrivateBackupSynced(accountId, await savePrivateBackup(collectPrivateBackup(accountId)))
      if (cancelled) return
      enablePrivateSync(accountId)
      privateSyncReady.current = true
    }
    void reconcile().catch(() => {
      if (!cancelled) {
        enablePrivateSync(accountId)
        privateSyncReady.current = true
      }
    })
    return () => {
      cancelled = true
      disablePrivateSync(accountId)
    }
  }, [account?.id, isOnline])

  useEffect(() => {
    const accountId = account?.id
    if (!accountId) return
    const queueBackup = (event: Event) => {
      if (!privateSyncReady.current || !navigator.onLine || (event as CustomEvent).detail?.accountId !== accountId) return
      if (privateSyncTimer.current) clearTimeout(privateSyncTimer.current)
      privateSyncTimer.current = window.setTimeout(() => {
        void savePrivateBackup(collectPrivateBackup(accountId)).then(updatedAt => markPrivateBackupSynced(accountId, updatedAt)).catch(() => { /* nova alteração ou reconexão tentará novamente */ })
      }, 1800)
    }
    window.addEventListener(PRIVATE_DATA_CHANGED_EVENT, queueBackup)
    return () => {
      window.removeEventListener(PRIVATE_DATA_CHANGED_EVENT, queueBackup)
      if (privateSyncTimer.current) clearTimeout(privateSyncTimer.current)
    }
  }, [account?.id])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0a1710' : '#12291f')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const capturePrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }
    const installed = () => { setIsInstalled(true); setInstallPrompt(null) }
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', installed)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', installed)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  useEffect(() => {
    cleanupOldDailyKeys()
    const missingTrainingFields = !profile.fitnessLevel || !profile.trainingPlace || !profile.trainingDays
    if (missingTrainingFields) {
      const legacyPlace = profile.equipment === 'casa' || profile.equipment === 'halteres' ? 'casa' : 'academia'
      setProfile({ ...defaultProfile, ...profile, trainingPlace: legacyPlace, homeSetup: profile.equipment === 'halteres' ? 'halteres' : 'nenhum', gymType: 'rede' })
    }
    setPoints(prev => {
      const registrations = prev.filter(event => event.type === 'cadastro')
      if (!registrations.length) return [...prev, { id: uid(), date: todayKey(), type: 'cadastro', label: 'Boas-vindas ao Viva', points: 100, bonus: true } satisfies PointsEvent]
      if (registrations.length > 1) {
        let kept = false
        return prev.filter(event => event.type !== 'cadastro' || (!kept && (kept = true)))
      }
      return prev
    })
  }, [])

  useEffect(() => {
    const weekday = new Date(`${activeDate}T12:00:00`).getDay()
    const marker = storageKey(`viva-recurring-applied-${activeDate}`)
    if (localStorage.getItem(marker)) return
    const scheduled = mealTemplates.filter(template => template.weekdays.includes(weekday)).flatMap(template => template.items.map(item => ({ ...item, entryId: uid() })))
    if (scheduled.length) setMeals(previous => [...previous, ...scheduled])
    localStorage.setItem(marker, 'true')
  }, [activeDate, mealTemplates])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (!moreOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [moreOpen])

  useEffect(() => {
    if (!reminder.enabled) return
    const id = window.setInterval(async () => {
      if (document.visibilityState !== 'visible' || Notification.permission !== 'granted') return
      const now = new Date().toTimeString().slice(0, 5)
      if (now < (reminder.startHour || '08:00') || now > (reminder.endHour || '22:00')) return
      if (reminder.stopAtGoal && waterTotal >= metrics.water) return
      const reg = await navigator.serviceWorker?.ready
      reg?.showNotification('Hora de beber água 💧', { body: 'Um pequeno gole agora mantém sua meta no caminho.', icon: '/icon.svg', tag: 'water-reminder' })
    }, reminder.minutes * 60_000)
    return () => clearInterval(id)
  }, [reminder, waterTotal, metrics.water])

  useEffect(() => {
    if (!reminder.enabled || !account || !('Notification' in window) || Notification.permission !== 'granted') return
    const id = window.setTimeout(() => {
      void enableWebPush(reminder).catch(() => { /* nova tentativa ocorre ao reabrir o app ou alterar o lembrete */ })
    }, 400)
    return () => clearTimeout(id)
  }, [reminder, account])

  const addWater = (amount: number) => {
    setWater(prev => [...prev, { id: uid(), amount, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }])
    const waterReward = awardDaily(points, 'agua', 'Registro de água')
    let nextPoints = waterReward.events
    const reachesGoal = waterTotal < metrics.water && waterTotal + amount >= metrics.water
    const goalReward = reachesGoal ? awardDaily(nextPoints, 'meta_agua', 'Meta de água concluída') : { events: nextPoints, awarded: 0 }
    nextPoints = goalReward.events
    setPoints(nextPoints)
    void syncPointEvents(nextPoints.filter(event => !points.some(existing => existing.id === event.id)))
    if (reachesGoal) void markHydrationGoalComplete(todayKey())
    const awarded = waterReward.awarded + goalReward.awarded
    setToast(`+${amount} ml registrados${awarded ? ` · +${awarded} pts` : ''}`)
  }

  const addActivity = (entry: ActivityEntry) => {
    setActivityLog(prev => [...prev, entry])
    setToast(`${entry.name} · ${entry.minutes} min · ${entry.kcal} kcal`)
  }
  const removeActivity = (id: string) => setActivityLog(prev => prev.filter(item => item.id !== id))

  const updateMealQuantity = (entryId: string, delta: number) =>
    setMeals(prev => prev.map(item => item.entryId === entryId ? item.grams ? { ...item, grams: Math.max(10, item.grams + delta * 10) } : { ...item, quantity: Math.max(1, item.quantity + delta) } : item))

  const toggleReminder = async () => {
    if (reminderBusy) return
    setReminderBusy(true)
    try {
      if (reminder.enabled) {
        const result = await disableWebPush()
        setReminder(prev => ({ ...prev, enabled: false }))
        setToast(result.online || !backendConfigured ? 'Lembretes pausados' : 'Pausado neste aparelho; sincronização online pendente')
        return
      }
      if (!('Notification' in window)) throw new Error('Este navegador não oferece suporte a notificações')
      setToast('Solicitando permissão para notificações…')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notificações estão bloqueadas nas configurações do navegador' : 'Permissão de notificação não concedida')
      setToast('Ativando lembretes…')
      const result = await enableWebPush({ ...reminder, enabled: true })
      setReminder(prev => ({ ...prev, enabled: true }))
      setToast(result.online ? 'Lembretes push ativados' : 'Lembrete local ativado · conecte o Supabase para usar com o app fechado')
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'Não foi possível ativar as notificações')
    } finally {
      setReminderBusy(false)
    }
  }

  const testPush = async () => {
    setToast('Enviando notificação de teste…')
    try {
      const devices = await sendTestWaterReminder()
      setToast(`Push enviado para ${devices} ${devices === 1 ? 'dispositivo' : 'dispositivos'}`)
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'Não foi possível testar o push')
    }
  }

  const connectAccount = (value: VivaAccount) => {
    claimLegacyStorage(value.id)
    setAccount(value)
    window.location.reload()
  }

  if (backendConfigured && !account) return <AuthGate initialName={profile.name} rememberName={name => setProfile({ ...profile, name })} connected={connectAccount}/>
  if (!onboardingComplete) return <Onboarding initial={profile} complete={value => { setProfile(value); setOnboardingComplete(true) }}/>

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setPage('inicio')} aria-label="Ir ao início"><span className="brand-mark">V</span><span>viva.</span></button>
      <nav aria-label="Navegação principal">
        {([['inicio', 'Visão geral'], ['agua', 'Água'], ['refeicoes', 'Refeições'], ['treino', 'Meu treino'], ['objetivos', 'Objetivos e plano'], ['relatorios', 'Relatórios'], ['conquistas', 'Conquistas'], ['ranking', 'Ranking'], ['privacidade', 'Privacidade'], ['perfil', 'Meu perfil']] as [Page, string][]).map(([key, label]) =>
          <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}><Icon name={key}/><span>{label}</span></button>)}
      </nav>
      <ThemeControl value={theme} onChange={setTheme}/>
      <div className="sidebar-tip"><span>✦</span><strong>Consistência vence pressa.</strong><small>Faça um pouco todos os dias.</small></div>
      <button className="avatar-row" onClick={() => setPage('perfil')}><UserAvatar profile={profile}/><span><strong>{profile.name}</strong><small>Conta e perfil</small></span><Icon name="chevron" size={16}/></button>
    </aside>

    <main>
      {page === 'inicio' && <Dashboard profile={profile} metrics={metrics} waterTotal={waterTotal} totals={totals} addWater={addWater} activityLog={activityLog} activityKcalTotal={activityKcalTotal} openActivity={() => setModal('activity')} removeActivity={removeActivity} go={setPage} openFood={() => setModal('food')} points={currentPoints} pointsToday={pointsToday} plant={plantState} canInstall={!isInstalled && !installDismissed && (Boolean(installPrompt) || /iphone|ipad|ipod/i.test(navigator.userAgent))} isIos={!installPrompt && /iphone|ipad|ipod/i.test(navigator.userAgent)} installApp={installApp} dismissInstall={() => setInstallDismissed(true)}/>}
      {page === 'agua' && <WaterPage total={waterTotal} goal={metrics.water} entries={water} add={addWater} remove={(id: string) => setWater(prev => prev.filter(x => x.id !== id))} reminder={reminder} setReminder={setReminder} toggleReminder={toggleReminder} reminderBusy={reminderBusy} testPush={testPush} canTestPush={Boolean(account)}/>} 
      {page === 'refeicoes' && <MealsPage totals={totals} goal={metrics.calories} meals={meals} templates={mealTemplates} remove={(id: string) => setMeals(prev => prev.filter(x => x.entryId !== id))} updateQuantity={updateMealQuantity} open={() => setModal('food')} saveTemplate={(name, weekdays) => { if (!meals.length) return; setMealTemplates(previous => [...previous, { id: uid(), name, weekdays, items: meals.map(item => ({ ...item, entryId: uid() })) }]); setToast('Rotina de refeição salva') }} removeTemplate={id => setMealTemplates(previous => previous.filter(template => template.id !== id))}/>}
      {page === 'treino' && <GuidedWorkoutPage profile={profile} sessions={sessions} storageOwner={account?.id} onEditProfile={() => setPage('objetivos')} onComplete={(session) => {
        setSessions(prev => [...prev, session])
        const workoutReward = awardDaily(points, 'treino', 'Treino concluído')
        let nextPoints = workoutReward.events
        const newSessions = [...sessions, session]
        const newlyUnlocked = evaluateAchievements(newSessions, unlocked)
        newlyUnlocked.forEach(id => {
          const achievement = achievements.find(item => item.id === id)!
          const event = createAchievementEvent(achievement)
          if (event) nextPoints = [...nextPoints, event]
        })
        setPoints(nextPoints)
        void syncPointEvents(nextPoints.filter(event => !points.some(existing => existing.id === event.id)))
        setUnlocked(prev => [...prev, ...newlyUnlocked])
        setToast(newlyUnlocked.length ? `Treino concluído · novo selo desbloqueado!` : `Treino concluído${workoutReward.awarded ? ` · +${workoutReward.awarded} pts` : ' · limite diário atingido'}`)
      }}/>} 
      {page === 'conquistas' && <AchievementsPage events={points} unlocked={unlocked} sessions={sessions} plant={plantState}/>} 
      {page === 'ranking' && <RankingPage profile={profile} points={currentPoints} account={account} connect={() => setModal('auth')}/>} 
      {page === 'objetivos' && <GoalsPage profile={profile} setProfile={setProfile} metrics={metrics} storageOwner={account?.id}/>} 
      {page === 'relatorios' && <ReportsPage profile={profile} sessions={sessions} storageOwner={account?.id}/>} 
      {page === 'privacidade' && <PrivacyPage account={account}/>} 
      {page === 'perfil' && <ProfilePage profile={profile} setProfile={setProfile} account={account} connect={() => setModal('auth')} goToGoals={() => setPage('objetivos')} goToPrivacy={() => setPage('privacidade')} disconnect={() => { signOut(); window.location.reload() }}/>} 
    </main>

    <button className="mobile-theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button>
    {!isOnline && <div className="offline-pill"><i/> Modo offline</div>}

    {moreOpen && <div className="more-menu-backdrop" onMouseDown={event => event.target === event.currentTarget && setMoreOpen(false)}><section className="more-menu" role="dialog" aria-modal="true" aria-label="Mais opções"><header><div><span className="eyebrow">NAVEGAÇÃO</span><h2>Mais opções</h2></div><button onClick={() => setMoreOpen(false)} aria-label="Fechar menu"><Icon name="close"/></button></header><div>{([['refeicoes', 'Refeições', 'Alimentação e macros'], ['objetivos', 'Objetivos', 'Metas e plano'], ['relatorios', 'Relatórios', 'Evolução e consistência'], ['conquistas', 'Conquistas', 'Pontos e selos'], ['ranking', 'Ranking', 'Comunidade Viva'], ['privacidade', 'Privacidade', 'Dados e transparência'], ['perfil', 'Meu perfil', 'Conta e preferências']] as [Page, string, string][]).map(([key, label, note]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => { setPage(key); setMoreOpen(false) }}><span className={`icon-box ${key === 'refeicoes' ? 'orange' : key === 'objetivos' ? 'lime' : key === 'conquistas' ? 'purple' : 'blue'}`}><Icon name={key}/></span><span><strong>{label}</strong><small>{note}</small></span><Icon name="chevron" size={16}/></button>)}</div></section></div>}
    <nav className="bottom-nav">
      {([['inicio', 'Início'], ['agua', 'Água'], ['treino', 'Treino']] as [Page, string][]).map(([key, label]) => <button key={key} className={page === key && !moreOpen ? 'active' : ''} onClick={() => { setPage(key); setMoreOpen(false) }}><Icon name={key}/><small>{label}</small></button>)}
      <button className={moreOpen || !['inicio', 'agua', 'treino'].includes(page) ? 'active' : ''} onClick={() => setMoreOpen(open => !open)} aria-expanded={moreOpen}><Icon name="more"/><small>Mais</small></button>
    </nav>
    {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" size={17}/>{toast}</div>}
    {modal === 'food' && <FoodModal customFoods={customFoods} favorites={favoriteFoods} close={() => setModal(null)} createFood={food => setCustomFoods(previous => [...previous, food])} toggleFavorite={id => setFavoriteFoods(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} add={food => { setMeals(prev => [...prev, { ...food, entryId: uid(), quantity: 1 }]); const reward = awardDaily(points, 'refeicao', 'Alimento registrado'); setPoints(reward.events); void syncPointEvents(reward.events.filter(event => !points.some(existing => existing.id === event.id))); setModal(null); setToast(`${food.name} adicionado${reward.awarded ? ` · +${reward.awarded} pts` : ''}`) }}/>} 
    {modal === 'activity' && <ActivityModal weight={profile.weight} close={() => setModal(null)} add={entry => { addActivity(entry); setModal(null) }}/>}
    {modal === 'profile' && <ProfileModal profile={profile} close={() => setModal(null)} save={p => { setProfile(p); setModal(null); setToast('Perfil atualizado') }}/>}
    {modal === 'auth' && <AuthModal name={profile.name} close={() => setModal(null)} connected={connectAccount}/>} 
  </div>
}

function AuthGate({ initialName, rememberName, connected }: { initialName: string; rememberName: (name: string) => void; connected: (account: VivaAccount) => void }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar')
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (mode === 'entrar') {
        connected(await signIn(email, password))
      } else {
        const cleanName = name.trim()
        if (cleanName.length < 2 || cleanName.length > 30) throw new Error('Informe um nome entre 2 e 30 caracteres')
        rememberName(cleanName)
        const result = await createAccount(email, password, cleanName)
        if (result.account) connected(result.account)
        else setConfirmationSent(true)
      }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível continuar') }
    finally { setBusy(false) }
  }

  const recoverPassword = async () => {
    if (!email.trim()) { setMessage('Informe seu e-mail primeiro.'); return }
    setBusy(true); setMessage('')
    try { await requestPasswordReset(email.trim()); setResetSent(true); setMessage('Enviamos o link de recuperação para seu e-mail.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível enviar o link.') }
    finally { setBusy(false) }
  }

  if (confirmationSent) return <main className="auth-gate"><section className="auth-gate-card confirmation-card"><span className="auth-gate-logo">V</span><span className="confirmation-icon">✉</span><h1>Confira seu e-mail.</h1><p>Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte aqui para entrar.</p><button className="primary" onClick={() => { setConfirmationSent(false); setMode('entrar'); setPassword('') }}>Ir para o login</button></section></main>

  return <main className="auth-gate"><section className="auth-gate-card"><header><span className="auth-gate-logo">V</span><div><span className="eyebrow">VIVA · SAÚDE E ROTINA</span><h1>{mode === 'entrar' ? 'Que bom ter você de volta.' : 'Comece sua jornada.'}</h1><p>{mode === 'entrar' ? 'Entre para acessar seu plano e continuar cuidando da sua rotina.' : 'Crie sua conta para receber um plano feito para você.'}</p></div></header><div className="auth-gate-tabs"><button className={mode === 'entrar' ? 'active' : ''} onClick={() => { setMode('entrar'); setMessage('') }}>Entrar</button><button className={mode === 'criar' ? 'active' : ''} onClick={() => { setMode('criar'); setMessage('') }}>Criar conta</button></div><form onSubmit={submit}>{mode === 'criar' && <label>Como quer ser chamado?<input value={name} onChange={event => setName(event.target.value)} maxLength={30} placeholder="Seu nome ou apelido" required/></label>}<label>E-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@email.com" required/></label><label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} placeholder="Mínimo de 8 caracteres" required/></label>{mode === 'entrar' && <button type="button" className="forgot-password" disabled={busy || resetSent} onClick={recoverPassword}>{resetSent ? 'Link enviado' : 'Esqueci minha senha'}</button>}{message && <p className="auth-gate-error">{message}</p>}<button className="primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar no Viva' : 'Criar conta e ganhar 100 pontos'}</button></form><small>Ao continuar, seus dados físicos permanecem privados e não aparecem no ranking.</small></section></main>
}

function Onboarding({ initial, complete }: { initial: Profile; complete: (profile: Profile) => void }) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(initial)
  const field = (key: keyof Profile, value: string | number | boolean) => setDraft(current => ({ ...current, [key]: value }))
  const canContinue = step === 0 ? draft.name.trim().length >= 2 && draft.age >= 14 : step === 1 ? draft.weight >= 30 && draft.height >= 100 : true
  const next = () => step < 2 ? setStep(value => value + 1) : complete({ ...draft, name: draft.name.trim() })

  return <main className="onboarding-shell"><section className="onboarding-card"><header><span className="brand-mark">V</span><div><span className="eyebrow">BEM-VINDO AO VIVA</span><h1>{step === 0 ? 'Vamos conhecer você.' : step === 1 ? 'Agora, suas metas.' : 'Como você vai treinar?'}</h1><p>{step === 0 ? 'São só algumas informações para personalizar o app.' : step === 1 ? 'Usamos esses dados para calcular água, IMC e calorias.' : 'O Viva vai montar o plano; você só precisa seguir.'}</p></div></header><div className="onboarding-progress">{[0,1,2].map(value => <i key={value} className={value <= step ? 'active' : ''}/>)}</div>
    {step === 0 && <div className="onboarding-fields"><label className="full">Como quer ser chamado?<input autoFocus value={draft.name} maxLength={30} onChange={event => field('name', event.target.value)} placeholder="Seu nome ou apelido"/></label><label>Idade<input type="number" min="14" max="100" value={draft.age} onChange={event => field('age', Number(event.target.value))}/></label><label>Sexo biológico<select value={draft.sex} onChange={event => field('sex', event.target.value)}><option value="feminino">Feminino</option><option value="masculino">Masculino</option></select></label></div>}
    {step === 1 && <div className="onboarding-fields"><label>Peso atual (kg)<input type="number" min="30" max="300" value={draft.weight} onChange={event => field('weight', Number(event.target.value))}/></label><label>Altura (cm)<input type="number" min="100" max="250" value={draft.height} onChange={event => field('height', Number(event.target.value))}/></label><label className="full">Objetivo<select value={draft.goal} onChange={event => field('goal', event.target.value)}><option value="perder">Perder peso</option><option value="manter">Manter e ganhar condicionamento</option><option value="ganhar">Ganhar massa muscular</option></select></label><label className="full">Nível de atividade<select value={draft.activity} onChange={event => field('activity', Number(event.target.value))}><option value={1.2}>Sedentário</option><option value={1.375}>Levemente ativo</option><option value={1.55}>Moderadamente ativo</option><option value={1.725}>Muito ativo</option></select></label></div>}
    {step === 2 && <div className="onboarding-fields"><label>Onde vai treinar?<select value={draft.trainingPlace} onChange={event => field('trainingPlace', event.target.value)}><option value="casa">Em casa</option><option value="academia">Na academia</option></select></label><label>Nível atual<select value={draft.fitnessLevel} onChange={event => field('fitnessLevel', event.target.value)}><option value="iniciante">{draft.trainingPlace === 'casa' ? 'Iniciante · 20 min em casa' : 'Iniciante · técnica e adaptação'}</option><option value="intermediario">{draft.trainingPlace === 'casa' ? 'Intermediário · 25 min em casa' : 'Intermediário · progressão de carga'}</option><option value="avancado">{draft.trainingPlace === 'casa' ? 'Avançado · 30 min em casa' : 'Avançado · alta performance'}</option></select></label>{draft.trainingPlace === 'academia' ? <label className="full">Tipo de academia<select value={draft.gymType} onChange={event => field('gymType', event.target.value)}><option value="rede">Academia de rede · completa</option><option value="bairro">Academia de bairro · estrutura básica</option></select></label> : <label className="full">Equipamento em casa<select value={draft.homeSetup} onChange={event => field('homeSetup', event.target.value)}><option value="nenhum">Nenhum · peso corporal</option><option value="halteres">Tenho halteres</option></select></label>}<label className="full">Dias disponíveis<select value={draft.trainingDays} onChange={event => field('trainingDays', Number(event.target.value))}>{[2,3,4,5,6,7].map(day => <option value={day} key={day}>{day} dias por semana</option>)}</select></label></div>}
    <footer>{step > 0 && <button className="secondary" onClick={() => setStep(value => value - 1)}>Voltar</button>}<button className="primary" disabled={!canContinue} onClick={next}>{step === 2 ? 'Criar meu plano' : 'Continuar'}</button></footer><small className="onboarding-note">Você poderá alterar tudo depois. Dados físicos permanecem neste dispositivo.</small></section></main>
}

function Dashboard({ profile, metrics, waterTotal, totals, addWater, activityLog, activityKcalTotal, openActivity, removeActivity, go, openFood, points, pointsToday, plant, canInstall, isIos, installApp, dismissInstall }: { profile: Profile; metrics: ReturnType<typeof getMetrics>; waterTotal: number; totals: { kcal: number; protein: number; carbs: number; fat: number }; addWater: (amount: number) => void; activityLog: ActivityEntry[]; activityKcalTotal: number; openActivity: () => void; removeActivity: (id: string) => void; go: (page: Page) => void; openFood: () => void; points: number; pointsToday: number; plant: PlantState; canInstall: boolean; isIos: boolean; installApp: () => void; dismissInstall: () => void }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const plan = generateWorkoutPlan(profile)
  const level = getLevel(points)
  return <div className="page dashboard">
    <header className="page-header"><div><span className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>{greeting}, {profile.name}. <em>Como você está?</em></h1><p>Seu progresso de hoje, num relance.</p></div><span className="today-pill"><i/> Hoje</span></header>
    <section className="hero-grid">
      <article className="card water-card"><div className="card-heading"><span className="icon-box blue"><Icon name="agua"/></span><div><small>HIDRATAÇÃO</small><h2>Água de hoje</h2></div><button className="text-button" onClick={() => go('agua')}>Ver detalhes <Icon name="chevron" size={15}/></button></div><div className="water-content"><Ring value={waterTotal} max={metrics.water}><strong>{(waterTotal / 1000).toFixed(1)}<small>L</small></strong><span>de {(metrics.water / 1000).toFixed(1)} L</span></Ring><div className="water-actions"><strong>{Math.max(0, metrics.water - waterTotal)} ml</strong><span>faltam para sua meta</span><div><button onClick={() => addWater(250)}>+ 250 ml</button><button onClick={() => addWater(500)}>+ 500 ml</button></div></div></div></article>
      <article className="card calories-card"><div className="card-heading"><span className="icon-box orange"><Icon name="refeicoes"/></span><div><small>ALIMENTAÇÃO</small><h2>Calorias</h2></div><button className="text-button" onClick={() => go('refeicoes')}>Ver detalhes <Icon name="chevron" size={15}/></button></div><div className="calorie-number"><strong>{Math.round(totals.kcal).toLocaleString('pt-BR')}</strong><span> / {metrics.calories.toLocaleString('pt-BR')} kcal</span></div><div className="progress"><i style={{ width: `${Math.min(100, totals.kcal / metrics.calories * 100)}%` }}/></div><div className="macro-row"><span><i className="protein"/>Proteínas<strong>{Math.round(totals.protein)}g</strong></span><span><i className="carbs"/>Carboidratos<strong>{Math.round(totals.carbs)}g</strong></span><span><i className="fat"/>Gorduras<strong>{Math.round(totals.fat)}g</strong></span></div><button className="primary orange-button" onClick={openFood}><Icon name="plus" size={17}/> Adicionar refeição</button></article>
    </section>
    <section className="mini-grid">
      <article className="card metric-card"><span className="icon-box lime">↗</span><div><small>SEU IMC</small><strong>{metrics.bmi.toFixed(1)}</strong><span className="status good">● {bmiLabel(metrics.bmi)}</span></div><button onClick={() => go('objetivos')}><Icon name="chevron"/></button></article>
      <article className="card metric-card"><span className="icon-box purple">⚡</span><div><small>META DIÁRIA</small><strong>{metrics.calories.toLocaleString('pt-BR')} <small>kcal</small></strong><span>Gasto estimado: {metrics.maintenance} kcal</span></div><button onClick={() => go('objetivos')}><Icon name="chevron"/></button></article>
      <article className="card metric-card"><span className="icon-box coral"><Icon name="treino"/></span><div><small>PRÓXIMO TREINO</small><strong>{plan.workouts[0].focus}</strong><span className="workout-summary">{plan.summary}</span></div><button onClick={() => go('treino')}><Icon name="chevron"/></button></article>
    </section>
    <section className="card activity-card"><div className="card-heading"><span className="icon-box lime">🏃</span><div><small>ATIVIDADES</small><h2>Fora do treino</h2></div><button className="primary activity-add" onClick={openActivity}><Icon name="plus" size={16}/> Registrar</button></div>{activityLog.length ? <><div className="activity-list">{activityLog.map(item => <div key={item.id}><span className="activity-emoji">{item.icon}</span><span><strong>{item.name}</strong><small>{item.time} · {item.minutes} min</small></span><b>{item.kcal} kcal</b><button onClick={() => removeActivity(item.id)} aria-label="Remover atividade"><Icon name="close" size={16}/></button></div>)}</div><div className="activity-total"><span>Gasto estimado de hoje</span><strong>{activityKcalTotal} kcal</strong></div></> : <p className="activity-empty">Corrida, caminhada, futebol, natação… registre atividades que você faz fora da academia ou de casa.</p>}</section>
    <section className="reward-banner" onClick={() => go('conquistas')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go('conquistas') } }} role="button" tabIndex={0} aria-label={`${level.name}, ${points.toLocaleString('pt-BR')} pontos. Ver conquistas.`}><PlantCompanion state={plant} size="small"/><div><span className="eyebrow">{level.name} · {plant.label}</span><strong>{points.toLocaleString('pt-BR')} pontos</strong><small>{plant.message}</small></div><div className="reward-progress"><i style={{ width: `${Math.min(100, ((points - level.min) / (level.next - level.min)) * 100)}%` }}/></div><Icon name="chevron"/></section>
    <section className="quote"><span>“</span><p>A saúde não é um destino. É a soma das pequenas escolhas que você faz todos os dias.</p><i>— Seu lembrete de hoje</i></section>
    {canInstall && <section className="install-card"><span className="install-icon"><Icon name="download" size={24}/></span><div><span className="eyebrow">INSTALE O VIVA</span><strong>Seu app, direto na tela inicial.</strong><p>{isIos ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : 'Funciona offline, abre em tela cheia e recebe lembretes.'}</p></div>{!isIos && <button className="primary" onClick={installApp}>Instalar aplicativo</button>}<button className="dismiss-install" onClick={dismissInstall} aria-label="Dispensar instalação"><Icon name="close" size={17}/></button></section>}
  </div>
}

function WaterPage({ total, goal, entries, add, remove, reminder, setReminder, toggleReminder, reminderBusy, testPush, canTestPush }: any) {
  return <div className="page"><PageTitle eyebrow="HIDRATAÇÃO" title="Sua água, gole a gole." subtitle="Registre o que beber e acompanhe sua meta diária."/>
    <div className="feature-grid"><article className="card focus-card water-focus"><Ring value={total} max={goal} color="#4e9fd1" size={190}><strong>{Math.round(total / goal * 100)}%</strong><span>{total} de {goal} ml</span></Ring><div><span className="eyebrow">META DE HOJE</span><h2>{(goal / 1000).toFixed(2)} litros</h2><p>{total >= goal ? 'Meta alcançada. Muito bem!' : `Faltam ${goal - total} ml para completar.`}</p><div className="quick-add">{[200, 300, 500].map(x => <button key={x} onClick={() => add(x)}>+ {x} ml</button>)}</div></div></article>
      <article className="card reminder-card"><span className="icon-box blue"><Icon name="bell"/></span><div><span className="eyebrow">LEMBRETES PUSH</span><h2>{reminder.enabled ? 'Lembretes ativos' : 'Não esqueça de beber'}</h2><p>Defina sua janela de hidratação. Com o backend conectado, o aviso chega mesmo com a PWA fechada.</p></div><div className="reminder-times"><label>Início<input type="time" value={reminder.startHour || '08:00'} onChange={e => setReminder({ ...reminder, startHour: e.target.value })}/></label><label>Fim<input type="time" value={reminder.endHour || '22:00'} onChange={e => setReminder({ ...reminder, endHour: e.target.value })}/></label></div><label>Intervalo<select value={reminder.minutes} onChange={e => setReminder({ ...reminder, minutes: Number(e.target.value) })}><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option></select></label><label className="check-row"><input type="checkbox" checked={reminder.stopAtGoal ?? true} onChange={e => setReminder({ ...reminder, stopAtGoal: e.target.checked })}/> Silenciar ao completar a meta</label><button className={`primary ${reminder.enabled ? 'secondary' : ''}`} disabled={reminderBusy} onClick={toggleReminder}>{reminderBusy ? 'Ativando…' : reminder.enabled ? 'Pausar lembretes' : 'Ativar lembretes'}</button>{reminder.enabled && canTestPush && <button className="push-test-button" onClick={testPush}><Icon name="bell" size={15}/> Enviar notificação de teste</button>}</article>
    </div>
    <article className="card list-card"><div className="section-title"><div><span className="eyebrow">HISTÓRICO</span><h2>Registros de hoje</h2></div><strong>{entries.length} registros</strong></div>{entries.length ? <div className="entries">{[...entries].reverse().map((e: WaterEntry) => <div key={e.id}><span className="drop"><Icon name="agua" size={18}/></span><strong>{e.amount} ml</strong><small>{e.time}</small><button onClick={() => remove(e.id)} aria-label="Excluir registro"><Icon name="close" size={17}/></button></div>)}</div> : <Empty text="Nenhuma água registrada ainda."/>}</article>
  </div>
}

function MealsPage({ totals, goal, meals, templates, remove, updateQuantity, open, saveTemplate, removeTemplate }: { totals: { kcal: number; protein: number; carbs: number; fat: number }; goal: number; meals: MealItem[]; templates: MealTemplate[]; remove: (id: string) => void; updateQuantity: (entryId: string, delta: number) => void; open: () => void; saveTemplate: (name: string, weekdays: number[]) => void; removeTemplate: (id: string) => void }) {
  const goals = macroGoals(goal)
  const createRoutine = () => {
    if (!meals.length) return
    const name = window.prompt('Nome desta rotina de refeições:', 'Minha rotina')?.trim()
    if (!name) return
    const days = window.prompt('Dias da semana (0 domingo a 6 sábado), separados por vírgula:', '1,2,3,4,5')
    const weekdays = [...new Set((days || '').split(',').map(Number).filter(day => day >= 0 && day <= 6))]
    if (weekdays.length) saveTemplate(name, weekdays)
  }
  return <div className="page"><PageTitle eyebrow="ALIMENTAÇÃO" title="Comer bem, sem complicação." subtitle="Acompanhe calorias e macronutrientes das suas refeições." action={<button className="primary" onClick={open}><Icon name="plus"/> Adicionar alimento</button>}/>
    <section className="stats-grid"><Stat label="Consumido" value={`${Math.round(totals.kcal)} kcal`} note={`de ${goal} kcal`} color="orange"/><Stat label="Proteínas" value={`${Math.round(totals.protein)} g`} note={`meta ${Math.round(goals.protein)} g`} color="purple"/><Stat label="Carboidratos" value={`${Math.round(totals.carbs)} g`} note={`meta ${Math.round(goals.carbs)} g`} color="blue"/><Stat label="Gorduras" value={`${Math.round(totals.fat)} g`} note={`meta ${Math.round(goals.fat)} g`} color="lime"/></section>
    <article className="card list-card"><div className="section-title"><div><span className="eyebrow">DIÁRIO</span><h2>Refeições de hoje</h2></div><span className="remaining">{Math.max(0, goal - Math.round(totals.kcal))} kcal restantes</span></div>{meals.length ? <div className="food-list">{meals.map((m: MealItem) => { const value = mealNutrients(m); return <div key={m.entryId}><span className="food-emoji">{m.id === 'banana' || m.id === 'apple' ? '🍎' : m.id === 'milk' || m.id === 'yogurt' ? '🥛' : '🍽️'}</span><span><strong>{m.name}</strong><small>{m.grams ? `${m.grams} g` : m.portion}</small><span className="qty-stepper"><button onClick={() => updateQuantity(m.entryId, -1)} disabled={!m.grams && m.quantity <= 1} aria-label="Diminuir porção"><Icon name="close" size={13}/></button><b>{m.grams ? `${m.grams}g` : `${m.quantity}×`}</b><button onClick={() => updateQuantity(m.entryId, 1)} aria-label="Aumentar porção"><Icon name="plus" size={13}/></button></span></span><span className="food-macros"><strong>{Math.round(value.kcal)} kcal</strong><small>P {Math.round(value.protein)}g · C {Math.round(value.carbs)}g · G {Math.round(value.fat)}g</small></span><button onClick={() => remove(m.entryId)} aria-label="Remover alimento"><Icon name="close"/></button></div> })}</div> : <Empty text="Seu diário está vazio. Adicione o primeiro alimento."/>}</article>
    <article className="card meal-routines"><div className="section-title"><div><span className="eyebrow">AUTOMAÇÃO</span><h2>Refeições recorrentes</h2></div><button className="secondary" disabled={!meals.length} onClick={createRoutine}>Salvar o dia como rotina</button></div>{templates.length ? <div>{templates.map(template => <span key={template.id}><span><strong>{template.name}</strong><small>{template.items.length} itens · {template.weekdays.length} dias/semana</small></span><button onClick={() => removeTemplate(template.id)}><Icon name="close" size={15}/></button></span>)}</div> : <p>Salve os alimentos de hoje para incluí-los automaticamente nos dias escolhidos.</p>}</article>
    <p className="disclaimer">Valores nutricionais são estimativas por porção e podem variar conforme marca e preparo.</p>
  </div>
}

interface WorkoutTimerState { startedAt?: number; elapsedSeconds?: number; restUntil?: number; restDuration: number }
interface SetCountdown { exerciseId: string; setNumber: number; remaining: number; running: boolean }

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function signalWorkoutEvent() {
  navigator.vibrate?.([180, 70, 180])
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(.12, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .28)
    oscillator.connect(gain); gain.connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + .28)
    oscillator.addEventListener('ended', () => void context.close())
  } catch { /* vibração continua disponível quando áudio é bloqueado */ }
}

function GuidedWorkoutPage({ profile, sessions, storageOwner, onComplete, onEditProfile }: { profile: Profile; sessions: WorkoutSession[]; storageOwner?: string; onComplete: (session: WorkoutSession) => void; onEditProfile: () => void }) {
  const [lowImpact, setLowImpact] = useState(false)
  const plan = useMemo(() => generateWorkoutPlan(profile, { lowImpact }), [profile, lowImpact])
  const [day, setDay] = useState(0)
  const workout = plan.workouts[day] || plan.workouts[0]
  const [logsByWorkout, setLogsByWorkout] = useStoredState<Record<string, WorkoutExerciseLog[]>>(scopedStorageKey(storageOwner, `viva-workout-logs-${todayKey()}`), {})
  const [timers, setTimers] = useStoredState<Record<string, WorkoutTimerState>>(scopedStorageKey(storageOwner, `viva-workout-timers-${todayKey()}`), {})
  const [substitutions, setSubstitutions] = useStoredState<Record<string, Record<string, string>>>(scopedStorageKey(storageOwner, 'viva-workout-substitutions'), {})
  const [activeExercise, setActiveExercise] = useState(0)
  const [setCountdown, setSetCountdown] = useState<SetCountdown | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const sessionExercises = useMemo(() => workout.exercises.map(exercise => ({ ...exercise, name: substitutions[workout.id]?.[exercise.id] || exercise.name })), [workout, substitutions])
  const histories = useMemo(() => Object.fromEntries(sessionExercises.map(exercise => [exercise.id, findExerciseHistory(sessions, exercise.name)])), [sessionExercises, sessions])
  const logs = logsByWorkout[workout.id] || sessionExercises.map(exercise => createExerciseLog(exercise, histories[exercise.id]))
  const timer = timers[workout.id] || { restDuration: 60 }
  const limitationWarning = profile.limitations?.trim()
  const isHomeHiit = profile.trainingPlace === 'casa'
  const readiness = evaluateHiit(profile)
  const canStart = !isHomeHiit || lowImpact || readiness.ready
  const completedToday = sessions.some(session => session.date === todayKey() && session.workoutId === workout.id)
  const completedSets = logs.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.completed).length, 0)
  const totalSets = logs.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  const allDone = totalSets > 0 && completedSets === totalSets
  const elapsed = (timer.elapsedSeconds || 0) + (timer.startedAt ? Math.max(0, Math.floor((now - timer.startedAt) / 1000)) : 0)
  const restRemaining = timer.restUntil ? Math.max(0, Math.ceil((timer.restUntil - now) / 1000)) : 0
  const sessionStarted = Boolean(timer.startedAt || timer.elapsedSeconds !== undefined)
  const currentExerciseDone = logs.find(log => log.exerciseId === sessionExercises[activeExercise]?.id)?.sets.every(set => set.completed) || false

  useEffect(() => setActiveExercise(0), [workout.id])

  useEffect(() => {
    if (!timer.startedAt && !timer.restUntil) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer.startedAt, timer.restUntil])

  useEffect(() => {
    if (!timer.restUntil || restRemaining > 0) return
    signalWorkoutEvent()
    setTimers(current => ({ ...current, [workout.id]: { ...timer, restUntil: undefined } }))
  }, [restRemaining, timer, workout.id, setTimers])

  const saveLogs = (next: WorkoutExerciseLog[]) => setLogsByWorkout(current => ({ ...current, [workout.id]: next }))
  const setTimer = (change: Partial<WorkoutTimerState>) => setTimers(current => ({ ...current, [workout.id]: { ...timer, ...change } }))
  const updateSet = (exerciseId: string, setNumber: number, change: Partial<WorkoutSetLog>) => saveLogs(logs.map(exercise => exercise.exerciseId === exerciseId ? { ...exercise, sets: exercise.sets.map(set => set.set === setNumber ? { ...set, ...change } : set) } : exercise))
  const toggleSet = (exerciseId: string, setNumber: number, completed: boolean) => {
    updateSet(exerciseId, setNumber, { completed })
    if (completed) setTimer({ restUntil: Date.now() + timer.restDuration * 1000 })
  }
  const toggleSetCountdown = (exerciseId: string, set: WorkoutSetLog) => {
    const isCurrent = setCountdown?.exerciseId === exerciseId && setCountdown.setNumber === set.set
    if (isCurrent) {
      setSetCountdown(current => current ? { ...current, running: !current.running } : null)
      return
    }
    const seconds = Math.max(1, Math.round(set.value * (set.unit === 'min' ? 60 : 1)))
    setSetCountdown({ exerciseId, setNumber: set.set, remaining: seconds, running: true })
  }

  useEffect(() => {
    if (!setCountdown?.running || setCountdown.remaining <= 0) return
    const id = window.setInterval(() => setSetCountdown(current => current ? { ...current, remaining: Math.max(0, current.remaining - 1) } : null), 1000)
    return () => clearInterval(id)
  }, [setCountdown?.running, setCountdown?.exerciseId, setCountdown?.setNumber])

  useEffect(() => {
    if (!setCountdown || setCountdown.remaining > 0) return
    signalWorkoutEvent()
    toggleSet(setCountdown.exerciseId, setCountdown.setNumber, true)
    setSetCountdown(null)
  }, [setCountdown?.remaining])
  const cycleSubstitution = (exerciseId: string) => {
    const original = workout.exercises.find(exercise => exercise.id === exerciseId)
    if (!original?.alternatives?.length) return
    const options = [original.name, ...original.alternatives]
    const currentName = substitutions[workout.id]?.[exerciseId] || original.name
    const nextName = options[(options.indexOf(currentName) + 1) % options.length]
    setSubstitutions(current => ({ ...current, [workout.id]: { ...current[workout.id], [exerciseId]: nextName } }))
    const replacement = { ...original, name: nextName }
    const replacementLog = createExerciseLog(replacement, findExerciseHistory(sessions, nextName))
    saveLogs(logs.map(log => log.exerciseId === exerciseId ? replacementLog : log))
  }
  const startWorkout = () => {
    if (allDone || completedToday) saveLogs(sessionExercises.map(exercise => createExerciseLog(exercise, histories[exercise.id])))
    setTimer({ startedAt: Date.now(), elapsedSeconds: 0, restUntil: undefined })
  }
  const finish = (effortRating: WorkoutSession['effortRating'], feedbackNote: string) => {
    onComplete({ id: uid(), date: todayKey(), workoutId: workout.id, title: `${workout.name} · ${workout.focus}`, durationSeconds: elapsed, exerciseLogs: logs, effortRating, feedbackNote: feedbackNote.trim() || undefined })
    setLogsByWorkout(current => {
      const next = { ...current }
      delete next[workout.id]
      return next
    })
    setTimer({ startedAt: undefined, elapsedSeconds: undefined, restUntil: undefined })
    setSetCountdown(null)
    setFeedbackOpen(false)
  }

  return <div className="page"><PageTitle eyebrow="TREINO GUIADO" title={plan.title} subtitle={plan.summary}/>
    <div className="intensity-strip"><span><small>NÍVEL</small><strong>{plan.levelLabel}</strong></span><span><small>INTENSIDADE-ALVO</small><strong>{plan.effort}</strong></span>{plan.sessionStructure && <span><small>SESSÃO</small><strong>{plan.sessionStructure}</strong></span>}</div>
    {!canStart && <div className="hiit-gate"><span>⚠</span><div><strong>{readiness.anyRisk ? 'HIIT não recomendado agora' : 'Faça a triagem de segurança antes do HIIT'}</strong><p>{readiness.anyRisk ? 'Pela sua triagem de saúde, o treino de alta intensidade fica em pausa por segurança. Recomendamos avaliação médica antes de retomá-lo — e preparamos uma alternativa de baixo impacto que também conta pontos.' : 'Este treino é vigoroso. Responda ao questionário rápido de prontidão (estilo PAR-Q+) nos objetivos para liberá-lo, ou comece agora pela alternativa de baixo impacto.'}</p><div className="hiit-gate-actions"><button onClick={onEditProfile}>{readiness.anyRisk ? 'Rever triagem' : 'Fazer triagem'}</button><button className="ghost" onClick={() => setLowImpact(true)}>Ver alternativa de baixo impacto</button></div></div></div>}
    {lowImpact && <div className="limitation-note"><strong>Alternativa de baixo impacto ativa.</strong> Ritmo controlado, sem HIIT. <button className="linklike" onClick={() => setLowImpact(false)}>Voltar ao treino padrão</button></div>}
    <div className="workout-layout"><aside className="day-tabs">{plan.workouts.map((item, index) => <button key={item.id} onClick={() => setDay(index)} className={day === index ? 'active' : ''}><small>{item.name}</small><strong>{item.focus}</strong><span>{item.exercises.length} exercícios · {item.duration} min</span></button>)}</aside><section className="guided-session">
      {!sessionStarted ? <article className="card workout-preview"><div className="workout-head"><div><span className="eyebrow">{workout.name}</span><h2>{workout.focus}</h2></div><span>{sessionExercises.length} exercícios</span></div><div className="workout-preview-list">{sessionExercises.map((exercise, index) => <div className="workout-preview-row" key={exercise.id}><span className="exercise-number">{String(index + 1).padStart(2, '0')}</span><div><small>{exercise.prescription} · descanso {exercise.rest}</small><strong>{exercise.name}</strong><p>{exercise.instruction}</p></div></div>)}</div>{completedToday && <div className="repeat-workout-note"><strong>Treino extra</strong><span>Você já recebeu os pontos de treino hoje. Uma nova sessão será registrada sem pontos adicionais.</span></div>}<button className="primary start-guided-workout" disabled={!canStart} onClick={startWorkout}>{completedToday ? 'Iniciar outro treino' : 'Iniciar treino guiado'}</button></article> : <>
      <article className="card session-console"><div><span className="eyebrow">{workout.name}</span><h2>{workout.focus}</h2><small>{completedSets}/{totalSets} séries registradas</small></div><div className="session-clock"><small>TEMPO DE TREINO</small><strong>{formatTimer(elapsed)}</strong></div>{!timer.startedAt ? <button className="primary" disabled={!canStart} onClick={() => setTimer({ startedAt: Date.now() })}>Continuar treino</button> : <div className="session-running"><span className="session-live"><i/> Em andamento</span><button onClick={() => setTimer({ startedAt: undefined, elapsedSeconds: elapsed, restUntil: undefined })}>Pausar</button></div>}</article>
      {timer.restUntil && <article className="rest-timer card"><div><small>DESCANSO</small><strong>{formatTimer(restRemaining)}</strong></div><div className="rest-progress"><i style={{ width: `${Math.max(0, Math.min(100, restRemaining / timer.restDuration * 100))}%` }}/></div><div><button onClick={() => setTimer({ restUntil: timer.restUntil! + 30_000 })}>+30s</button><button onClick={() => setTimer({ restUntil: undefined })}>Pular descanso</button></div></article>}
      <div className="exercise-player-nav"><button disabled={activeExercise === 0} onClick={() => setActiveExercise(index => Math.max(0, index - 1))} aria-label="Exercício anterior">←</button><div><small>EXERCÍCIO {activeExercise + 1} DE {sessionExercises.length}</small><strong>{sessionExercises[activeExercise]?.name}</strong><span><i style={{ width: `${((activeExercise + 1) / sessionExercises.length) * 100}%` }}/></span></div><button className={currentExerciseDone ? 'ready' : ''} disabled={activeExercise === sessionExercises.length - 1} onClick={() => setActiveExercise(index => Math.min(sessionExercises.length - 1, index + 1))} aria-label="Próximo exercício">→</button></div>
      <div className="exercise-log-list">{sessionExercises.map((exercise, exerciseIndex) => { if (exerciseIndex !== activeExercise) return null; const log = logs.find(item => item.exerciseId === exercise.id) || createExerciseLog(exercise, histories[exercise.id]); const history = histories[exercise.id]; const originalExercise = workout.exercises.find(item => item.id === exercise.id) || exercise; const substitutionOptions = [originalExercise.name, ...(originalExercise.alternatives || [])]; const nextExerciseName = substitutionOptions[(substitutionOptions.indexOf(exercise.name) + 1) % substitutionOptions.length]; const exerciseStarted = log.sets.some(set => set.completed); const exerciseDone = log.sets.every(set => set.completed); return <article className={`card exercise-log-card ${exerciseDone ? 'done' : ''}`} key={exercise.id}><header><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><div><small>{exercise.prescription} · descanso {exercise.rest}</small><h3>{exercise.name}</h3><p>{exercise.instruction}</p>{history && <span className="last-performance">Último treino: {new Date(`${history.date}T12:00:00`).toLocaleDateString('pt-BR')}{history.lastWeight ? ` · ${history.lastWeight} kg` : ''}{history.suggestedWeight && history.lastWeight && history.suggestedWeight > history.lastWeight ? ` · sugestão ${history.suggestedWeight} kg` : ''}</span>}</div>{exerciseDone && <span className="exercise-complete"><Icon name="check"/> Feito</span>}</header>{exercise.alternatives?.length ? <button className="substitute-exercise" disabled={exerciseStarted} onClick={() => cycleSubstitution(exercise.id)}><span>↻</span><strong>Trocar exercício</strong><small>{exerciseStarted ? 'Disponível antes de concluir uma série' : `Próxima opção: ${nextExerciseName}`}</small></button> : null}<div className={`set-table ${profile.trainingPlace === 'academia' ? '' : 'no-weight'}`}><div className="set-table-head"><span>SÉRIE</span><span>{log.sets[0]?.unit === 'reps' ? 'REPETIÇÕES' : log.sets[0]?.unit === 'seg' ? 'SEGUNDOS' : 'MINUTOS'}</span>{profile.trainingPlace === 'academia' && <span>CARGA (KG)</span>}<span>OK</span></div>{log.sets.map(set => <div className={set.completed ? 'set-row completed' : 'set-row'} key={set.set}><strong>{set.set}</strong><div className="set-value-control"><input type="number" min="0" value={set.value || ''} disabled={!timer.startedAt || set.completed} onChange={event => updateSet(exercise.id, set.set, { value: Number(event.target.value) })}/>{set.unit !== 'reps' && <button type="button" className={setCountdown?.exerciseId === exercise.id && setCountdown.setNumber === set.set && setCountdown.running ? 'running' : ''} disabled={!timer.startedAt || set.completed} onClick={() => toggleSetCountdown(exercise.id, set)}>{setCountdown?.exerciseId === exercise.id && setCountdown.setNumber === set.set ? formatTimer(setCountdown.remaining) : '▶'}</button>}</div>{profile.trainingPlace === 'academia' && <input type="number" min="0" step="0.5" value={set.weight ?? ''} placeholder="—" disabled={!timer.startedAt || set.completed} onChange={event => updateSet(exercise.id, set.set, { weight: event.target.value === '' ? undefined : Number(event.target.value) })}/>}<button disabled={!timer.startedAt} className={set.completed ? 'set-check checked' : 'set-check'} onClick={() => toggleSet(exercise.id, set.set, !set.completed)} aria-label={`${set.completed ? 'Reabrir' : 'Concluir'} série ${set.set}`}><Icon name="check" size={16}/></button></div>)}</div></article> })}</div>
      {timer.startedAt && <article className="card rest-settings"><span><small>DESCANSO PADRÃO</small><strong>{timer.restDuration}s</strong></span><div>{[30,60,90,120].map(seconds => <button className={timer.restDuration === seconds ? 'active' : ''} key={seconds} onClick={() => setTimer({ restDuration: seconds })}>{seconds}s</button>)}</div></article>}
      <button className="primary finish-workout" disabled={!canStart || !allDone || !timer.startedAt} onClick={() => setFeedbackOpen(true)}>{allDone ? `Concluir treino · ${formatTimer(elapsed)}` : `Registre as séries para concluir · ${completedSets}/${totalSets}`}</button></>}
    </section></div><WorkoutHistoryPanel sessions={sessions}/><div className="progression-note"><strong>Como progredir</strong><span>{plan.progression}</span></div><div className="safety-note"><strong>Treine com segurança.</strong><span>Pare em caso de dor, tontura ou mal-estar. Qualidade do movimento vem antes de carga ou velocidade.</span></div>{feedbackOpen && <WorkoutFeedbackModal duration={elapsed} close={() => setFeedbackOpen(false)} confirm={finish}/>}</div>
}

function WorkoutFeedbackModal({ duration, close, confirm }: { duration: number; close: () => void; confirm: (rating: WorkoutSession['effortRating'], note: string) => void }) {
  const [rating, setRating] = useState<WorkoutSession['effortRating']>()
  const [note, setNote] = useState('')
  return <div className="modal-backdrop workout-feedback-backdrop"><section className="modal workout-feedback-modal"><div className="modal-head"><div><span className="eyebrow">TREINO CONCLUÍDO</span><h2>Como foi a intensidade?</h2><p>{formatTimer(duration)} de treino · sua resposta ajustará a próxima sessão.</p></div><button onClick={close} aria-label="Fechar janela"><Icon name="close"/></button></div><div className="effort-options">{([['facil', 'Leve demais', 'Podemos aumentar um pouco mais a carga.'], ['ideal', 'Na medida', 'Manteremos uma progressão gradual.'], ['dificil', 'Muito difícil', 'A próxima carga será reduzida para preservar a técnica.']] as const).map(([value, title, description]) => <button className={rating === value ? 'active' : ''} key={value} onClick={() => setRating(value)}><span>{value === 'facil' ? '↗' : value === 'ideal' ? '✓' : '↓'}</span><strong>{title}</strong><small>{description}</small></button>)}</div><label>Observação opcional<textarea maxLength={240} value={note} onChange={event => setNote(event.target.value)} placeholder="Ex.: senti o joelho, carga confortável, pouca energia…"/></label><button className="primary feedback-confirm" disabled={!rating} onClick={() => rating && confirm(rating, note)}>Salvar e concluir treino</button></section></div>
}

function WorkoutHistoryPanel({ sessions }: { sessions: WorkoutSession[] }) {
  const recent = [...sessions].reverse().slice(0, 6)
  const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0) / 60)
  const totalVolume = sessions.reduce((sum, session) => sum + sessionVolume(session), 0)
  const totalCompletedSets = sessions.reduce((sum, session) => sum + completedSessionSets(session), 0)
  const records = workoutRecords(sessions)
  const last30Days = sessions.filter(session => Date.now() - new Date(`${session.date}T12:00:00`).getTime() <= 30 * 86_400_000).length
  return <section className="workout-history-section"><div className="section-title"><div><span className="eyebrow">SUA EVOLUÇÃO</span><h2>Histórico de treinos</h2></div><strong>{sessions.length} sessões</strong></div>
    <div className="workout-history-stats"><article className="card"><small>ÚLTIMOS 30 DIAS</small><strong>{last30Days}</strong><span>treinos concluídos</span></article><article className="card"><small>TEMPO ACUMULADO</small><strong>{totalMinutes}</strong><span>minutos treinados</span></article><article className="card"><small>{totalVolume > 0 ? 'VOLUME REGISTRADO' : 'SÉRIES REGISTRADAS'}</small><strong>{(totalVolume || totalCompletedSets).toLocaleString('pt-BR')}</strong><span>{totalVolume > 0 ? 'kg movimentados' : 'séries concluídas'}</span></article></div>{sessions.length > 0 && <div className="personal-records"><span><small>MAIOR CARGA</small><strong>{records.maxWeight ? `${records.maxWeight} kg` : '—'}</strong></span><span><small>MELHOR VOLUME</small><strong>{records.maxVolume ? `${records.maxVolume.toLocaleString('pt-BR')} kg` : '—'}</strong></span><span><small>SESSÃO MAIS LONGA</small><strong>{records.longestDuration ? `${Math.round(records.longestDuration / 60)} min` : '—'}</strong></span></div>}
    {recent.length ? <div className="workout-history-list">{recent.map(session => { const volume = sessionVolume(session); return <article className="card" key={session.id}><time>{new Date(`${session.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</time><div><strong>{session.title}</strong><span>{completedSessionSets(session)} séries{session.exerciseLogs?.length ? ` · ${session.exerciseLogs.length} exercícios` : ''}</span></div><div><strong>{session.durationSeconds ? `${Math.round(session.durationSeconds / 60)} min` : 'Concluído'}</strong>{volume > 0 && <span>{volume.toLocaleString('pt-BR')} kg de volume</span>}</div></article> })}</div> : <article className="card workout-history-empty"><span>↗</span><div><strong>Sua evolução começa no primeiro treino.</strong><p>Cargas, repetições, duração e volume aparecerão aqui automaticamente.</p></div></article>}
  </section>
}

function WorkoutPage({ profile, sessions, onComplete, onEditProfile }: { profile: Profile; sessions: WorkoutSession[]; onComplete: (session: WorkoutSession) => void; onEditProfile: () => void }) {
  const [lowImpact, setLowImpact] = useState(false)
  const plan = useMemo(() => generateWorkoutPlan(profile, { lowImpact }), [profile, lowImpact])
  const [day, setDay] = useState(0)
  const workout = plan.workouts[day] || plan.workouts[0]
  const [doneByWorkout, setDoneByWorkout] = useStoredState<Record<string, string[]>>(`viva-workout-${todayKey()}`, {})
  const done = doneByWorkout[workout.id] || []
  const setDone = (change: (current: string[]) => string[]) => setDoneByWorkout(current => ({ ...current, [workout.id]: change(current[workout.id] || []) }))
  const completedToday = sessions.some(session => session.date === todayKey() && session.workoutId === workout.id)
  const allDone = workout.exercises.every(exercise => done.includes(exercise.id))
  const limitationWarning = profile.limitations?.trim()
  const isHomeHiit = profile.trainingPlace === 'casa'
  const readiness = evaluateHiit(profile)
  const canStart = !isHomeHiit || lowImpact || readiness.ready

  return <div className="page"><PageTitle eyebrow="PLANO GERADO PARA VOCÊ" title={plan.title} subtitle={plan.summary}/>
    <div className="intensity-strip"><span><small>NÍVEL</small><strong>{plan.levelLabel}</strong></span><span><small>INTENSIDADE-ALVO</small><strong>{plan.effort}</strong></span>{plan.sessionStructure && <span><small>SESSÃO</small><strong>{plan.sessionStructure}</strong></span>}</div>
    {!canStart && <div className="hiit-gate"><span>⚠</span><div><strong>{readiness.anyRisk ? 'HIIT não recomendado agora' : 'Faça a triagem de segurança antes do HIIT'}</strong><p>{readiness.anyRisk ? 'Pela sua triagem de saúde, o treino de alta intensidade fica em pausa por segurança. Recomendamos avaliação médica antes de retomá-lo — e preparamos uma alternativa de baixo impacto.' : 'Este treino é vigoroso. Responda ao questionário rápido de prontidão (estilo PAR-Q+) no perfil para liberá-lo, ou comece pela alternativa de baixo impacto.'}</p><div className="hiit-gate-actions"><button onClick={onEditProfile}>{readiness.anyRisk ? 'Rever triagem' : 'Fazer triagem'}</button><button className="ghost" onClick={() => setLowImpact(true)}>Ver alternativa de baixo impacto</button></div></div></div>}
    {lowImpact && <div className="limitation-note"><strong>Alternativa de baixo impacto ativa.</strong> Ritmo controlado, sem HIIT. <button className="linklike" onClick={() => setLowImpact(false)}>Voltar ao treino padrão</button></div>}
    {limitationWarning && <div className="limitation-note"><strong>Restrição informada:</strong> {limitationWarning}. Interrompa qualquer movimento que cause dor e valide adaptações com um profissional.</div>}
    <div className="plan-explainer"><span>Plano automático</span><p>O Viva escolheu divisão, volume e exercícios a partir da sua meta, nível, disponibilidade e equipamento. Você só precisa seguir a ordem.</p><button onClick={onEditProfile}>Recalcular no perfil</button></div>
    <div className="workout-layout"><aside className="day-tabs">{plan.workouts.map((item, index) => <button key={item.id} onClick={() => setDay(index)} className={day === index ? 'active' : ''}><small>{item.name}</small><strong>{item.focus}</strong><span>{item.exercises.length} exercícios · {item.duration} min</span></button>)}</aside><article className="card workout-card"><div className="workout-head"><div><span className="eyebrow">{workout.name}</span><h2>{workout.focus}</h2></div><span>{done.length}/{workout.exercises.length} feitos</span></div><div className="exercise-list">{workout.exercises.map((exercise, index) => <label key={exercise.id} className={done.includes(exercise.id) ? 'done' : ''}><input type="checkbox" disabled={!canStart} checked={done.includes(exercise.id)} onChange={() => setDone(prev => prev.includes(exercise.id) ? prev.filter(id => id !== exercise.id) : [...prev, exercise.id])}/><span className="check"><Icon name="check"/></span><span><small>EXERCÍCIO {String(index + 1).padStart(2, '0')}</small><strong>{exercise.name}</strong><em>{exercise.instruction}</em></span><b>{exercise.prescription}<small>desc. {exercise.rest}</small></b></label>)}</div><button className="primary finish-workout" disabled={!canStart || !allDone || completedToday} onClick={() => onComplete({ id: uid(), date: todayKey(), workoutId: workout.id, title: `${workout.name} · ${workout.focus}` })}>{!canStart ? 'Confirme sua prontidão no perfil' : completedToday ? 'Treino já concluído hoje' : allDone ? 'Concluir treino e ganhar pontos' : 'Marque todos os exercícios para concluir'}</button></article></div><div className="progression-note"><strong>Como progredir</strong><span>{plan.progression}</span></div><div className="safety-note"><strong>Treine com segurança.</strong><span>O plano é uma recomendação geral, não diagnóstico ou prescrição clínica. Pare em caso de dor, tontura ou mal-estar.</span></div></div>
}

function GoalsPage({ profile, setProfile, metrics, storageOwner }: { profile: Profile; setProfile: (p: Profile) => void; metrics: ReturnType<typeof getMetrics>; storageOwner?: string }) {
  const [weightHistory, setWeightHistory] = useStoredState<WeightEntry[]>(scopedStorageKey(storageOwner, 'viva-weight-history'), [])
  const [newWeight, setNewWeight] = useState(profile.weight)
  const registerWeight = () => {
    if (newWeight < 30 || newWeight > 300) return
    setWeightHistory(previous => [...previous, { id: uid(), weight: newWeight, date: todayKey(), createdAt: new Date().toISOString() }])
    setProfile({ ...profile, weight: newWeight })
  }
  return <div className="page"><PageTitle eyebrow="OBJETIVOS E PLANO" title="Personalização da sua jornada." subtitle="Dados físicos, metas e preferências usados nos cálculos e no treino automático."/>
    <div className="profile-layout"><ProfileForm value={profile} onChange={setProfile} showName={false}/><aside><article className="card result-card"><span className="eyebrow">SEUS NÚMEROS</span><div><span><small>IMC</small><strong>{metrics.bmi.toFixed(1)}</strong><em>{bmiLabel(metrics.bmi)}</em></span><span><small>Água / dia</small><strong>{(metrics.water / 1000).toFixed(2)} L</strong><em>{profile.waterMultiplier} ml por kg</em></span><span><small>Meta calórica</small><strong>{metrics.calories}</strong><em>kcal por dia</em></span><span><small>Gasto estimado</small><strong>{metrics.maintenance}</strong><em>kcal por dia</em></span></div></article><article className="card weight-card"><div><span className="eyebrow">HISTÓRICO LOCAL</span><h2>Registrar peso</h2></div><div className="weight-input"><input type="number" min="30" max="300" step="0.1" value={newWeight} onChange={event => setNewWeight(Number(event.target.value))}/><span>kg</span><button className="primary" onClick={registerWeight}>Registrar</button></div>{weightHistory.length > 0 && <div className="weight-history">{[...weightHistory].reverse().slice(0, 4).map(entry => <span key={entry.id}><small>{new Date(`${entry.date}T12:00:00`).toLocaleDateString('pt-BR')}</small><strong>{entry.weight.toFixed(1)} kg</strong></span>)}</div>}</article><p className="disclaimer">IMC, água e calorias são estimativas populacionais e não substituem avaliação individual de profissionais de saúde.</p></aside></div>
  </div>
}

function ProfilePage({ profile, setProfile, account, connect, disconnect, goToGoals, goToPrivacy }: { profile: Profile; setProfile: (p: Profile) => void; account: VivaAccount | null; connect: () => void; disconnect: () => void; goToGoals: () => void; goToPrivacy: () => void }) {
  const [name, setName] = useState(profile.name)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [newEmail, setNewEmail] = useState(account?.email || '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const choosePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 1_500_000) {
      setMessage('Escolha uma imagem de até 1,5 MB.')
      return
    }
    if (account) {
      setBusy(true); setMessage('Enviando foto…')
      try {
        const avatar = await uploadAvatar(file)
        setProfile({ ...profile, avatar })
        setMessage('Foto atualizada e sincronizada.')
      } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível atualizar a foto.') }
      finally { setBusy(false); event.target.value = '' }
      return
    }
    const reader = new FileReader()
    reader.onload = () => { setProfile({ ...profile, avatar: String(reader.result) }); setMessage('Foto atualizada.') }
    reader.readAsDataURL(file)
  }

  const saveName = async () => {
    const cleanName = name.trim()
    if (cleanName.length < 2 || cleanName.length > 30) { setMessage('Informe um nome entre 2 e 30 caracteres.'); return }
    setBusy(true); setMessage('')
    try {
      if (account) await updatePublicProfile(cleanName)
      setProfile({ ...profile, name: cleanName })
      setMessage(account ? 'Nome atualizado e sincronizado.' : 'Nome atualizado.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível atualizar o nome.') }
    finally { setBusy(false) }
  }

  const deletePhoto = async () => {
    setBusy(true); setMessage('')
    try {
      if (account) await removeAvatar()
      setProfile({ ...profile, avatar: undefined })
      setMessage(account ? 'Foto removida e sincronizada.' : 'Foto removida.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível remover a foto.') }
    finally { setBusy(false) }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) { setMessage('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (password !== confirmation) { setMessage('As senhas não coincidem.'); return }
    setBusy(true); setMessage('')
    try { await updatePassword(password); setPassword(''); setConfirmation(''); setMessage('Senha atualizada com segurança.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível alterar a senha.') }
    finally { setBusy(false) }
  }

  const changeEmail = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newEmail.includes('@')) { setMessage('Informe um e-mail válido.'); return }
    setBusy(true); setMessage('')
    try { await updateEmail(newEmail.trim()); setMessage('Confira o novo e-mail para confirmar a alteração.') }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível alterar o e-mail.') }
    finally { setBusy(false) }
  }

  const exportData = () => {
    if (!account) return
    const content = JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: account.id, email: account.email }, data: collectPrivateBackup(account.id) }, null, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `viva-dados-${todayKey()}.json`; link.click()
    URL.revokeObjectURL(url)
    setMessage('Arquivo de dados exportado.')
  }

  const removeAccount = async () => {
    if (!account || !window.confirm('Excluir definitivamente sua conta e todos os dados? Esta ação não pode ser desfeita.')) return
    setBusy(true); setMessage('Excluindo conta…')
    try {
      const prefix = `viva-user-${account.id}:`
      await deleteAccount()
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => Boolean(key?.startsWith(prefix)))
      keys.forEach(key => localStorage.removeItem(key))
      window.location.reload()
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Não foi possível excluir a conta.'); setBusy(false) }
  }

  return <div className="page"><PageTitle eyebrow="MINHA CONTA" title="Seu perfil." subtitle="Altere sua foto, nome, acesso e preferências da conta."/>
    <div className="account-settings-grid">
      <article className="card identity-settings"><div className="avatar-editor"><UserAvatar profile={profile} large/><label className={`secondary ${busy ? 'disabled' : ''}`}>Alterar foto<input type="file" accept="image/*" disabled={busy} onChange={choosePhoto}/></label>{profile.avatar && <button className="remove-photo" disabled={busy} onClick={deletePhoto}>Remover foto</button>}</div><div className="identity-fields"><span className="eyebrow">IDENTIDADE</span><label>Nome exibido<input value={name} onChange={event => setName(event.target.value)} maxLength={30}/></label><button className="primary" disabled={busy} onClick={saveName}>{busy ? 'Salvando…' : 'Salvar nome'}</button><small>Este nome aparece no app e, quando conectado, no ranking.</small></div></article>
      <article className="card security-settings"><span className="eyebrow">ACESSO E SEGURANÇA</span>{account ? <><strong>{account.email}</strong><form className="email-change-form" onSubmit={changeEmail}><label>Novo e-mail<input type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} required/></label><button className="secondary" disabled={busy}>Alterar e-mail</button></form><form onSubmit={changePassword}><label>Nova senha<input type="password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres"/></label><label>Confirmar nova senha<input type="password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Digite novamente"/></label><button className="primary" disabled={busy}>{busy ? 'Alterando…' : 'Alterar senha'}</button></form><div className="account-data-actions"><button onClick={exportData}>Exportar meus dados</button><button className="signout-button" onClick={disconnect}>Sair da conta</button><button className="delete-account-button" disabled={busy} onClick={removeAccount}>Excluir minha conta</button></div></> : <><strong>{backendConfigured ? 'Conta não conectada' : 'Conta online ainda não configurada'}</strong><p>{backendConfigured ? 'Entre para sincronizar o ranking, usar push em segundo plano e alterar sua senha.' : 'Foto e nome já funcionam localmente. A alteração de senha será liberada quando o backend for conectado.'}</p>{backendConfigured && <button className="primary" onClick={connect}>Entrar ou criar conta</button>}</>}</article>
      <button className="card goals-link" onClick={goToGoals}><span className="icon-box lime"><Icon name="objetivos"/></span><span><small>PLANO PERSONALIZADO</small><strong>Objetivos, dados físicos e treino</strong><em>Altere peso, altura, meta, nível e local de treino.</em></span><Icon name="chevron"/></button>
      <button className="card goals-link" onClick={goToPrivacy}><span className="icon-box blue"><Icon name="privacidade"/></span><span><small>SEUS DADOS</small><strong>Privacidade e transparência</strong><em>Veja o que fica privado, o que é público e como seus dados são usados.</em></span><Icon name="chevron"/></button>
    </div>{message && <div className="profile-message" role="status">{message}</div>}
  </div>
}

function ProfileForm({ value, onChange, showName = true }: { value: Profile; onChange: (p: Profile) => void; showName?: boolean }) {
  const field = (key: keyof Profile, val: string | number | boolean) => onChange({ ...value, [key]: val })
  const setParq = (key: ParqKey, answer: boolean) => onChange({ ...value, parq: { ...value.parq, [key]: answer } })
  const parqReady = evaluateHiit(value)
  return <article className="card form-card"><div className="form-grid">{showName && <label className="full">Como quer ser chamado?<input value={value.name} onChange={e => field('name', e.target.value)}/></label>}<label>Peso (kg)<input type="number" min="30" max="300" value={value.weight} onChange={e => field('weight', Number(e.target.value))}/></label><label>Altura (cm)<input type="number" min="100" max="250" value={value.height} onChange={e => field('height', Number(e.target.value))}/></label><label>Idade<input type="number" min="14" max="100" value={value.age} onChange={e => field('age', Number(e.target.value))}/></label><label>Sexo biológico<select value={value.sex} onChange={e => field('sex', e.target.value)}><option value="feminino">Feminino</option><option value="masculino">Masculino</option></select></label><label className="full">Nível de atividade<select value={value.activity} onChange={e => field('activity', Number(e.target.value))}><option value={1.2}>Sedentário</option><option value={1.375}>Levemente ativo (1–3×/semana)</option><option value={1.55}>Moderadamente ativo (3–5×/semana)</option><option value={1.725}>Muito ativo (6–7×/semana)</option></select></label></div><fieldset><legend>Qual é sua meta?</legend><div className="goal-options">{([['perder','Perder peso','Déficit leve'],['manter','Manter','Equilíbrio'],['ganhar','Ganhar massa','Superávit leve']] as const).map(([id,title,note]) => <label key={id} className={value.goal === id ? 'active' : ''}><input type="radio" name="goal" checked={value.goal === id} onChange={() => field('goal', id)}/><strong>{title}</strong><span>{note}</span></label>)}</div></fieldset><fieldset className="training-profile"><legend>Para gerar seu treino</legend><div className="form-grid"><label>Nível do treino<select value={value.fitnessLevel || 'iniciante'} onChange={e => field('fitnessLevel', e.target.value)}><option value="iniciante">{value.trainingPlace === 'casa' ? 'Nível 1 — Base intensa · 20 min' : 'Nível 1 — Técnica e adaptação'}</option><option value="intermediario">{value.trainingPlace === 'casa' ? 'Nível 2 — Ritmo forte · 25 min' : 'Nível 2 — Progressão de carga'}</option><option value="avancado">{value.trainingPlace === 'casa' ? 'Nível 3 — Alta performance · 30 min' : 'Nível 3 — Alta performance'}</option></select></label><label>Onde vai treinar?<select value={value.trainingPlace || 'academia'} onChange={e => field('trainingPlace', e.target.value)}><option value="casa">Em casa</option><option value="academia">Na academia</option></select></label>{value.trainingPlace === 'casa' ? <><label className="full">Tem algum equipamento em casa?<select value={value.homeSetup || 'nenhum'} onChange={e => field('homeSetup', e.target.value)}><option value="nenhum">Não — somente peso corporal</option><option value="halteres">Sim — tenho halteres</option></select><small>O plano combinará circuito explosivo, peso corporal e isometrias.</small></label><fieldset className="full parq-gate"><legend>Triagem de segurança para HIIT</legend><p className="parq-intro">O treino em casa inclui alta intensidade. Responda com sinceridade — qualquer "sim" mantém o HIIT em pausa e libera uma alternativa de baixo impacto.</p>{PARQ_QUESTIONS.map(question => { const answer = value.parq?.[question.key]; return <div className="parq-question" key={question.key}><span>{question.label}</span><div className="parq-options" role="radiogroup" aria-label={question.label}><label className={answer === false ? 'active' : ''}><input type="radio" name={`parq-${question.key}`} checked={answer === false} onChange={() => setParq(question.key, false)}/>Não</label><label className={answer === true ? 'danger active' : ''}><input type="radio" name={`parq-${question.key}`} checked={answer === true} onChange={() => setParq(question.key, true)}/>Sim</label></div></div> })}{parqReady.answeredAll && parqReady.anyRisk && <div className="parq-result danger">Com base nas suas respostas, o HIIT não é liberado agora. Use a alternativa de baixo impacto e procure avaliação médica antes de treinos intensos.</div>}{parqReady.answeredAll && !parqReady.anyRisk && <><label className="parq-confirm"><input type="checkbox" checked={value.parqWarmup || false} onChange={e => field('parqWarmup', e.target.checked)}/><span>Vou fazer o aquecimento de 5–10 min antes do HIIT.</span></label><label className="parq-confirm"><input type="checkbox" checked={value.parqStop || false} onChange={e => field('parqStop', e.target.checked)}/><span>Vou parar imediatamente se sentir dor, tontura ou mal-estar.</span></label></>}{parqReady.ready && <div className="parq-result ok">Tudo certo — HIIT liberado. Escute seu corpo durante o treino.</div>}</fieldset></> : <label className="full">Qual tipo de academia?<select value={value.gymType || 'rede'} onChange={e => field('gymType', e.target.value)}><option value="rede">Academia de rede — estrutura completa</option><option value="bairro">Academia de bairro — estrutura básica</option></select><small>{value.gymType === 'bairro' ? 'Vamos priorizar barra, banco, halteres e substituições sem máquinas específicas.' : 'Podemos usar máquinas, cabos, pesos livres e equipamentos de cardio.'}</small></label>}<label>Dias por semana<select value={value.trainingDays || 3} onChange={e => field('trainingDays', Number(e.target.value))}>{[2,3,4,5,6,7].map(day => <option value={day} key={day}>{day} dias</option>)}</select></label>{value.trainingPlace === 'casa' ? <label>Duração automática<input value={value.fitnessLevel === 'iniciante' ? '20 minutos' : value.fitnessLevel === 'intermediario' ? '25 minutos' : '30 minutos'} disabled/><small>Definida pelo nível do treino.</small></label> : <label>Tempo por treino<select value={value.sessionMinutes || 45} onChange={e => field('sessionMinutes', Number(e.target.value))}><option value={30}>30 minutos</option><option value={45}>45 minutos</option><option value={60}>60 minutos</option></select></label>}<label className="full">Lesões, dores ou limitações<textarea value={value.limitations || ''} onChange={e => field('limitations', e.target.value)} placeholder="Ex.: dor no joelho, hérnia de disco, gestação…"/><small>O app exibirá um alerta; condições clínicas devem ser avaliadas por profissional.</small></label></div></fieldset><label className="range-label"><span>Meta de água <strong>{value.waterMultiplier} ml/kg</strong></span><input type="range" min="30" max="40" step="1" value={value.waterMultiplier} onChange={e => field('waterMultiplier', Number(e.target.value))}/><small>30 ml/kg <i/> 40 ml/kg</small></label></article>
}

function AchievementsPage({ events, unlocked, sessions, plant }: { events: PointsEvent[]; unlocked: string[]; sessions: WorkoutSession[]; plant: PlantState }) {
  const points = totalPoints(events)
  const today = dailyPoints(events)
  const level = getLevel(points)
  const progress = Math.min(100, ((points - level.min) / (level.next - level.min)) * 100)
  return <div className="page"><PageTitle eyebrow="RECOMPENSAS" title="Sua constância vale pontos." subtitle="Continue registrando hábitos e concluindo os treinos prescritos."/>
    <section className="points-hero"><PlantCompanion state={plant} size="large"/><div><span className="eyebrow">{plant.label}</span><h2>{level.name}</h2><strong>{points.toLocaleString('pt-BR')} pontos</strong><p className="plant-message">{plant.message}</p><div className="level-progress"><i style={{ width: `${progress}%` }}/></div><small>{Math.max(0, level.next - points)} pontos para o próximo nível</small></div><aside><span><strong>{today}</strong><small>de {DAILY_POINTS_LIMIT} hoje</small></span><span><strong>{sessions.length}</strong><small>treinos concluídos</small></span></aside></section>
    <div className="points-rule"><Icon name="check"/><span><strong>Limite diário de 100 pontos.</strong> Você pode continuar registrando depois disso; apenas a pontuação diária para de aumentar. Bônus de conquistas ficam fora do limite.</span></div>
    <section className="plant-cycle"><div><span className="eyebrow">SEU COMPANHEIRO</span><h2>Ela cresce com você.</h2><p>Pontos fazem a planta evoluir. A constância mantém suas folhas saudáveis.</p></div><div className="plant-timeline"><span className={plant.health === 'saudavel' || plant.health === 'recuperando' ? 'active' : ''}><b>0–2</b><small>saudável</small></span><span className={plant.health === 'murchando' ? 'active' : ''}><b>3</b><small>murcha</small></span><span className={plant.health === 'amarelada' ? 'active' : ''}><b>7</b><small>amarela</small></span><span className={plant.health === 'seca' ? 'active' : ''}><b>14</b><small>seca</small></span><span className={plant.health === 'sem_vida' ? 'active' : ''}><b>30</b><small>sem vida</small></span></div><p>Ao retornar, nasce um broto. Sete dias de cuidado recuperam o estágio conquistado.</p></section>
    <section className="achievement-section"><div className="section-title"><div><span className="eyebrow">COLEÇÃO</span><h2>Selos de conquista</h2></div><strong>{unlocked.length}/{achievements.length} desbloqueados</strong></div><div className="badge-grid">{achievements.map(item => { const isUnlocked = unlocked.includes(item.id); return <article className={`badge-card ${isUnlocked ? `unlocked ${item.rarity}` : 'locked'}`} key={item.id}><span>{isUnlocked ? item.icon : '🔒'}</span><div><small>{item.rarity}</small><strong>{item.title}</strong><p>{item.description}</p>{item.bonus > 0 && <em>+{item.bonus} pontos de bônus</em>}</div></article> })}</div></section>
    <article className="card points-history"><div className="section-title"><div><span className="eyebrow">EXTRATO</span><h2>Últimos pontos</h2></div></div>{events.length ? [...events].reverse().slice(0, 10).map(event => <div key={event.id}><span>{event.bonus ? '✦' : '+'}</span><div><strong>{event.label}</strong><small>{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR')}{event.bonus ? ' · bônus' : ''}</small></div><b>+{event.points}</b></div>) : <Empty text="Seus pontos aparecerão aqui."/>}</article>
  </div>
}

function RankingPage({ profile, points, account, connect }: { profile: Profile; points: number; account: VivaAccount | null; connect: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(backendConfigured)
  const [visible, setVisible] = useState(true)
  const [visibilityLoaded, setVisibilityLoaded] = useState(!account)
  const [savingVisibility, setSavingVisibility] = useState(false)
  useEffect(() => {
    if (!backendConfigured) return
    fetchLeaderboard().then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    if (!account) return
    let active = true
    setVisibilityLoaded(false)
    fetchRankingVisibility().then(value => { if (active) setVisible(value) }).catch(() => { if (active) setVisible(true) }).finally(() => { if (active) setVisibilityLoaded(true) })
    return () => { active = false }
  }, [account])
  const toggleVisibility = async () => {
    const next = !visible
    setVisible(next)
    setSavingVisibility(true)
    try { await setRankingVisibility(next) }
    catch { setVisible(!next) }
    finally { setSavingVisibility(false) }
  }
  const currentLevel = getLevel(points)
  return <div className="page"><PageTitle eyebrow="COMUNIDADE VIVA" title="Ranking global" subtitle="Uma disputa saudável baseada em consistência, sem expor dados de saúde."/>
    <article className="current-rank card"><UserAvatar profile={profile}/><div><small>SUA POSIÇÃO</small><strong>{profile.name}</strong><span>{currentLevel.name}</span></div><b>{points.toLocaleString('pt-BR')} pts</b></article>
    {account && <label className="ranking-visibility card"><span><strong>Aparecer no ranking</strong><small>Desligue para manter apelido e pontos fora do placar público. Seus dados de saúde nunca são publicados.</small></span><input type="checkbox" role="switch" checked={visible} disabled={savingVisibility || !visibilityLoaded} onChange={toggleVisibility}/></label>}
    {!backendConfigured ? <div className="online-empty"><span>🌎</span><h2>Ranking preparado para sincronização</h2><p>O placar global será liberado quando as credenciais do projeto Supabase forem adicionadas. Seus cálculos e dados de saúde continuam locais.</p><code>Copie .env.example para .env e informe as chaves públicas.</code></div> : !account ? <div className="online-empty"><span>🔐</span><h2>Entre para participar do ranking</h2><p>Sua conta sincroniza somente identidade pública, pontos e conquistas.</p><button className="primary" onClick={connect}>Entrar ou criar conta</button></div> : loading ? <Empty text="Carregando ranking global…"/> : <article className="card leaderboard"><div className="leaderboard-head"><span>POSIÇÃO</span><span>USUÁRIO</span><span>PONTOS</span></div>{entries.map(entry => <div key={`${entry.rank}-${entry.display_name}`}><b>#{entry.rank}</b><span className="rank-avatar">{entry.avatar_url ? <img src={entry.avatar_url} alt=""/> : entry.display_name.slice(0, 1).toUpperCase()}</span><span><strong>{entry.display_name}</strong><small>{entry.level}</small></span><em>{entry.points.toLocaleString('pt-BR')} pts</em></div>)}</article>}
    <p className="disclaimer">O ranking mostra somente apelido, avatar, nível e pontuação. Peso, altura, IMC, refeições e demais dados de saúde não são publicados.</p>
  </div>
}

function FoodModal({ close, add, customFoods, favorites, createFood, toggleFavorite }: { close: () => void; add: (f: Food & { grams?: number }) => void; customFoods: Food[]; favorites: string[]; createFood: (food: Food) => void; toggleFavorite: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', grams: 100, kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const allFoods = [...foods, ...customFoods].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)))
  const filtered = allFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
  const select = (food: Food) => { setSelected(food); setGrams(foodBaseGrams(food)) }
  const saveCustom = (event: React.FormEvent) => {
    event.preventDefault()
    const food: Food = { id: `custom-${uid()}`, name: draft.name.trim(), portion: `${draft.grams} g`, baseGrams: draft.grams, kcal: draft.kcal, protein: draft.protein, carbs: draft.carbs, fat: draft.fat }
    if (!food.name || draft.grams <= 0) return
    createFood(food); setCreating(false); select(food)
  }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal food-modal"><div className="modal-head"><div><span className="eyebrow">BASE DE ALIMENTOS</span><h2>{selected ? selected.name : creating ? 'Novo alimento' : 'Adicionar alimento'}</h2></div><button onClick={close} aria-label="Fechar janela"><Icon name="close"/></button></div>
    {selected ? <div className="food-amount"><button className="text-button" onClick={() => setSelected(null)}>← Voltar</button><label>Quantidade consumida<input autoFocus type="number" min="1" max="3000" value={grams} onChange={event => setGrams(Number(event.target.value))}/><span>gramas</span></label><div><span><small>Calorias</small><strong>{Math.round(selected.kcal * grams / foodBaseGrams(selected))} kcal</strong></span><span><small>Porção base</small><strong>{selected.portion}</strong></span></div><button className="primary" onClick={() => add({ ...selected, grams })}>Adicionar ao diário</button></div> : creating ? <form className="custom-food-form" onSubmit={saveCustom}><label className="full">Nome<input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>{([['grams', 'Porção (g)'], ['kcal', 'Calorias'], ['protein', 'Proteínas (g)'], ['carbs', 'Carboidratos (g)'], ['fat', 'Gorduras (g)']] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" step="0.1" required value={draft[key]} onChange={event => setDraft({ ...draft, [key]: Number(event.target.value) })}/></label>)}<button type="button" className="secondary" onClick={() => setCreating(false)}>Cancelar</button><button className="primary">Salvar alimento</button></form> : <><div className="food-search-row"><input className="search" autoFocus placeholder="Buscar arroz, banana, frango…" value={query} onChange={e => setQuery(e.target.value)}/><button className="secondary" onClick={() => setCreating(true)}>Criar alimento</button></div><div className="food-picker">{filtered.map(f => <div className="food-pick-row" key={f.id}><button className="favorite-food" onClick={() => toggleFavorite(f.id)} aria-label={favorites.includes(f.id) ? 'Remover dos favoritos' : 'Favoritar'}>{favorites.includes(f.id) ? '★' : '☆'}</button><button onClick={() => select(f)}><span><strong>{f.name}</strong><small>{f.portion} · P {f.protein}g · C {f.carbs}g · G {f.fat}g</small></span><b>{f.kcal} kcal</b><Icon name="plus"/></button></div>)}</div></>}
  </div></div>
}

function ActivityModal({ weight, close, add }: { weight: number; close: () => void; add: (entry: ActivityEntry) => void }) {
  const [selected, setSelected] = useState<ActivityType | null>(null)
  const [minutes, setMinutes] = useState(30)
  const kcal = selected ? activityKcal(selected.met, weight, minutes) : 0
  const intensity = selected ? (selected.met < 4 ? 'Leve' : selected.met <= 7 ? 'Moderada' : 'Intensa') : ''
  const confirm = () => {
    if (!selected || minutes <= 0) return
    add({ id: uid(), type: selected.id, name: selected.name, icon: selected.icon, minutes, kcal, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
  }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal activity-modal"><div className="modal-head"><div><span className="eyebrow">ATIVIDADE FÍSICA</span><h2>{selected ? selected.name : 'Registrar atividade'}</h2></div><button onClick={close} aria-label="Fechar janela"><Icon name="close"/></button></div>
    {!selected ? <><p className="activity-hint">Escolha uma atividade feita fora da academia ou de casa.</p><div className="activity-picker">{activities.map(item => <button key={item.id} onClick={() => setSelected(item)}><span className="activity-emoji">{item.icon}</span><strong>{item.name}</strong></button>)}</div></> : <div className="activity-detail"><div className="activity-estimate"><span className="activity-emoji big">{selected.icon}</span><small>GASTO ESTIMADO</small><strong>{kcal}<i>kcal</i></strong><em>{minutes} min · {weight} kg · intensidade {intensity.toLowerCase()}</em></div><div className="minutes-control"><span className="minutes-label">Duração</span><div className="minutes-stepper"><button onClick={() => setMinutes(m => Math.max(5, m - 5))} aria-label="Menos 5 minutos"><Icon name="close" size={15}/></button><b>{minutes}<small>min</small></b><button onClick={() => setMinutes(m => Math.min(600, m + 5))} aria-label="Mais 5 minutos"><Icon name="plus" size={15}/></button></div><div className="minutes-chips">{[15, 30, 45, 60].map(value => <button key={value} className={minutes === value ? 'active' : ''} onClick={() => setMinutes(value)}>{value} min</button>)}</div></div><div className="activity-actions"><button className="ghost-button" onClick={() => setSelected(null)}>← Trocar</button><button className="activity-confirm" onClick={confirm}>Registrar atividade</button></div></div>}
    <p className="privacy-copy">Estimativa por METs; o gasto real varia com ritmo, terreno e condicionamento.</p></div></div>
}

function AuthModal({ name, close, connected }: { name: string; close: () => void; connected: (account: VivaAccount) => void }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'entrar') connected(await signIn(email, password))
      else {
        const result = await createAccount(email, password, name)
        if (result.account) connected(result.account)
        else setError('Confira seu e-mail para confirmar a conta e depois faça login.')
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível conectar') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><div className="modal auth-modal"><div className="modal-head"><div><span className="eyebrow">CONTA VIVA</span><h2>{mode === 'entrar' ? 'Que bom ter você de volta.' : 'Crie sua conta.'}</h2></div><button onClick={close} aria-label="Fechar janela"><Icon name="close"/></button></div><div className="auth-tabs"><button className={mode === 'entrar' ? 'active' : ''} onClick={() => setMode('entrar')}>Entrar</button><button className={mode === 'criar' ? 'active' : ''} onClick={() => setMode('criar')}>Criar conta</button></div><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>{error && <p className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Conectando…' : mode === 'entrar' ? 'Entrar' : 'Criar conta e ganhar 100 pontos'}</button></form><p className="privacy-copy">Seus dados físicos e registros de saúde permanecem neste dispositivo.</p></div></div>
}

function ProfileModal({ profile, close, save }: { profile: Profile; close: () => void; save: (p: Profile) => void }) {
  const [draft, setDraft] = useState(profile)
  return <div className="modal-backdrop"><div className="modal profile-modal"><div className="modal-head"><div><span className="eyebrow">CONFIGURAÇÕES</span><h2>Editar perfil</h2></div><button onClick={close} aria-label="Fechar janela"><Icon name="close"/></button></div><ProfileForm value={draft} onChange={setDraft}/><button className="primary save" onClick={() => save(draft)}>Salvar alterações</button></div></div>
}

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function ReportsPage({ profile, sessions, storageOwner }: { profile: Profile; sessions: WorkoutSession[]; storageOwner?: string }) {
  const metrics = getMetrics(profile)
  const days = useMemo(() => Array.from({ length: 28 }, (_, offset) => {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (27 - offset))
    const key = date.toLocaleDateString('en-CA')
    const water = readStored<WaterEntry[]>(scopedStorageKey(storageOwner, `viva-water-${key}`), []).reduce((sum, item) => sum + item.amount, 0)
    const meals = readStored<MealItem[]>(scopedStorageKey(storageOwner, `viva-meals-${key}`), [])
    const activity = readStored<ActivityEntry[]>(scopedStorageKey(storageOwner, `viva-activities-${key}`), []).reduce((sum, item) => sum + item.kcal, 0)
    return { key, label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), water, calories: sumMeals(meals).kcal, activity, workouts: sessions.filter(session => session.date === key).length }
  }), [profile, sessions, storageOwner])
  const week = days.slice(-7)
  const completedDays = days.filter(day => day.water >= metrics.water || day.calories > 0 || day.workouts > 0).length
  const workouts = days.reduce((sum, day) => sum + day.workouts, 0)
  const activity = days.reduce((sum, day) => sum + day.activity, 0)
  const weights = readStored<WeightEntry[]>(scopedStorageKey(storageOwner, 'viva-weight-history'), []).slice(-12)
  const maxWeight = Math.max(...weights.map(item => item.weight), 1)
  const minWeight = Math.min(...weights.map(item => item.weight), maxWeight)
  return <div className="page"><PageTitle eyebrow="EVOLUÇÃO" title="Seu progresso em perspectiva." subtitle="Acompanhe consistência, hidratação, alimentação, treinos e peso."/>
    <section className="stats-grid"><Stat label="Dias ativos" value={`${completedDays}/28`} note="algum hábito registrado" color="lime"/><Stat label="Treinos" value={String(workouts)} note="últimos 28 dias" color="purple"/><Stat label="Atividades" value={`${activity} kcal`} note="fora do treino" color="orange"/><Stat label="Consistência" value={`${Math.round(completedDays / 28 * 100)}%`} note="últimos 28 dias" color="blue"/></section>
    <div className="report-grid"><article className="card report-chart"><div className="section-title"><div><span className="eyebrow">ÚLTIMOS 7 DIAS</span><h2>Água e alimentação</h2></div></div><div className="weekly-bars">{week.map(day => <div key={day.key}><span className="bar-pair"><i style={{ height: `${Math.min(100, day.water / metrics.water * 100)}%` }} title={`${day.water} ml`}/><b style={{ height: `${Math.min(100, day.calories / metrics.calories * 100)}%` }} title={`${Math.round(day.calories)} kcal`}/></span><small>{day.label.slice(0, 2)}</small></div>)}</div><div className="chart-legend"><span><i className="water-dot"/> Água</span><span><i className="food-dot"/> Calorias</span></div></article>
      <article className="card consistency-card"><div className="section-title"><div><span className="eyebrow">CALENDÁRIO</span><h2>28 dias de consistência</h2></div></div><div className="consistency-grid">{days.map(day => { const score = Number(day.water >= metrics.water) + Number(day.calories > 0) + Number(day.workouts > 0); return <span key={day.key} className={`score-${score}`} title={`${day.label}: ${score}/3 hábitos`}><small>{day.label.slice(0, 2)}</small></span> })}</div><p>Cada quadrado fica mais intenso ao registrar alimentação, bater a meta de água e concluir treino.</p></article>
    </div>
    <article className="card weight-report"><div className="section-title"><div><span className="eyebrow">PESO</span><h2>Evolução registrada</h2></div>{weights.length > 1 && <strong>{(weights[weights.length - 1].weight - weights[0].weight).toFixed(1)} kg</strong>}</div>{weights.length ? <div className="weight-bars">{weights.map(item => <span key={item.id}><i style={{ height: `${30 + ((item.weight - minWeight) / Math.max(1, maxWeight - minWeight)) * 70}%` }}/><b>{item.weight.toFixed(1)}</b><small>{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></span>)}</div> : <Empty text="Registre seu peso em Objetivos para visualizar a evolução."/>}</article>
  </div>
}

function PrivacyPage({ account }: { account: VivaAccount | null }) {
  return <div className="page"><PageTitle eyebrow="PRIVACIDADE" title="Seus dados, sem surpresa." subtitle="Transparência sobre armazenamento, sincronização e informações públicas."/>
    <section className="privacy-grid"><article className="card privacy-card"><span className="icon-box lime"><Icon name="privacidade"/></span><h2>Dados privados</h2><p>Peso, altura, IMC, alimentação, hidratação, treinos, limitações e histórico ficam vinculados somente à sua conta.</p><strong>{account ? 'Backup privado ativado' : 'Armazenamento somente neste dispositivo'}</strong></article><article className="card privacy-card"><span className="icon-box blue"><Icon name="ranking"/></span><h2>Dados públicos opcionais</h2><p>Se você ativar o ranking, somente nome exibido, avatar, nível e pontos aparecem para outras pessoas.</p><strong>Nenhum dado físico é publicado</strong></article><article className="card privacy-card"><span className="icon-box orange"><Icon name="download"/></span><h2>Seu controle</h2><p>Você pode exportar seus dados, desligar o ranking ou excluir definitivamente a conta na tela Meu perfil.</p><strong>Portabilidade e exclusão disponíveis</strong></article></section>
    <article className="card privacy-details"><h2>Como o Viva funciona</h2><div><span><b>1</b><p><strong>No aparelho</strong>O app mantém uma cópia para funcionar offline.</p></span><span><b>2</b><p><strong>Na nuvem</strong>Quando conectado, um backup protegido pelas regras da sua conta é sincronizado.</p></span><span><b>3</b><p><strong>Notificações</strong>A preferência de lembrete e o identificador do dispositivo são usados apenas para entregar os avisos solicitados.</p></span></div><p className="disclaimer">As estimativas do app apoiam sua rotina, mas não substituem diagnóstico, prescrição ou acompanhamento profissional.</p></article>
  </div>
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <header className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header> }
function UserAvatar({ profile, large = false }: { profile: Profile; large?: boolean }) { return <span className={`avatar ${large ? 'avatar-large' : ''}`}>{profile.avatar ? <img src={profile.avatar} alt=""/> : profile.name.slice(0, 1).toUpperCase()}</span> }
function ThemeControl({ value, onChange }: { value: ThemeMode; onChange: (theme: ThemeMode) => void }) { return <div className="theme-control" aria-label="Aparência">{([['system','monitor','Automático'],['light','sun','Claro'],['dark','moon','Escuro']] as const).map(([mode, icon, label]) => <button key={mode} className={value === mode ? 'active' : ''} onClick={() => onChange(mode)} title={label} aria-label={`Tema ${label.toLowerCase()}`} aria-pressed={value === mode}><Icon name={icon} size={15}/></button>)}</div> }
function Stat({ label, value, note, color }: any) { return <article className="card stat"><i className={color}/><span><small>{label}</small><strong>{value}</strong><em>{note}</em></span></article> }
function Empty({ text }: { text: string }) { return <div className="empty"><span>✦</span><strong>{text}</strong><small>Seus dados ficam salvos neste dispositivo.</small></div> }

