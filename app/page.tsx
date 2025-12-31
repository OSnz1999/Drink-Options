// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Category, Mixer, Drink, Config, Event, Booking } from '@/lib/types'

type Mode = 'guest' | 'admin'
type GuestView =
  | 'event'
  | 'type'
  | 'alcoholic-category'
  | 'alcoholic-drink'
  | 'alcoholic-mixer'
  | 'nonalcoholic-drink'
  | 'summary'

const ADMIN_PIN = '1234abc' // change this to your desired PIN

function slugify(base: string, existingIds: string[]): string {
  const baseSlug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let slug = baseSlug || 'item'
  let counter = 1
  while (existingIds.includes(slug)) {
    slug = `${baseSlug}-${counter++}`
  }
  return slug
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('guest')
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Admin auth
  const [isAdminAuthed, setIsAdminAuthed] = useState(false)
  const [pinInput, setPinInput] = useState('')

  // Guest wizard state
  const [guestView, setGuestView] = useState<GuestView>('event')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isAlcoholicChoice, setIsAlcoholicChoice] = useState<boolean | null>(
    null,
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)
  const [selectedMixerId, setSelectedMixerId] = useState<string | null>(null)

  // Admin UI state
  const [adminTab, setAdminTab] = useState<
    'categories' | 'mixers' | 'drinks' | 'events' | 'portal'
  >('categories')

  // Events form
  const [newEventName, setNewEventName] = useState('')
  const [portalEventId, setPortalEventId] = useState<string | null>(null)

  // Category form
  const [newCategoryName, setNewCategoryName] = useState('')

  // Mixer form
  const [newMixerName, setNewMixerName] = useState('')

  // Drink form
  const [drinkFormMode, setDrinkFormMode] = useState<'create' | 'edit'>(
    'create',
  )
  const [editingDrinkId, setEditingDrinkId] = useState<string | null>(null)
  const [drinkNameInput, setDrinkNameInput] = useState('')
  const [drinkCategoryIdInput, setDrinkCategoryIdInput] = useState('')
  const [drinkImageUrlInput, setDrinkImageUrlInput] = useState('')
  const [drinkMixerIdsInput, setDrinkMixerIdsInput] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Load config on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load config')
        const data = (await res.json()) as Config
        setConfig(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load configuration.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function saveConfigToServer(nextConfig: Config) {
    setSaving(true)
    setError(null)
    setConfig(nextConfig)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig),
      })
      if (!res.ok) throw new Error('Failed to save config')
    } catch (err) {
      console.error(err)
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  function handleClearAllData() {
    if (!config) return
    const proceed = window.confirm(
      'Clear ALL categories, mixers, drinks, events and bookings? This cannot be undone.',
    )
    if (!proceed) return
    const nextConfig: Config = {
      categories: [],
      mixers: [],
      drinks: [],
      events: [],
      bookings: [],
    }
    resetDrinkForm()
    void saveConfigToServer(nextConfig)
  }

  function resetGuestFlow() {
    setGuestView('event')
    setSelectedEventId(null)
    setIsAlcoholicChoice(null)
    setSelectedCategoryId(null)
    setSelectedDrinkId(null)
    setSelectedMixerId(null)
  }

  function gotoAdmin() {
    setMode('admin')
  }
  function gotoGuest() {
    setMode('guest')
    resetGuestFlow()
  }

  function handleAdminToggle(nextMode: Mode) {
    if (nextMode === 'admin') {
      if (isAdminAuthed) {
        gotoAdmin()
      } else {
        // prompt pin inside admin panel
        setMode('admin')
      }
    } else {
      gotoGuest()
    }
  }

  function handleAdminPinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pinInput === ADMIN_PIN) {
      setIsAdminAuthed(true)
      setPinInput('')
    } else {
      alert('Incorrect PIN')
    }
  }

  // ---------- Guest side helpers ----------

  const categories = config?.categories ?? []
  const mixers = config?.mixers ?? []
  const drinks = config?.drinks ?? []
  const events = config?.events ?? []
  const bookings = config?.bookings ?? []

  const selectedEvent: Event | undefined = events.find(
    (e) => e.id === selectedEventId,
  )

  const drinksForEvent: Drink[] = selectedEvent
    ? drinks.filter((d) => selectedEvent.drinkIds.includes(d.id))
    : []

  const selectedDrink: Drink | undefined = drinks.find(
    (d) => d.id === selectedDrinkId,
  )
  const selectedMixer: Mixer | undefined = mixers.find(
    (m) => m.id === selectedMixerId,
  )

 const alcoholicMixersForDrink: Mixer[] =
  (selectedDrink?.mixerIds
    .map((id) => mixers.find((m) => m.id === id))
    .filter((m): m is Mixer => Boolean(m)) ?? []);

  const nonAlcoholicOptions = mixers.filter((m) => m.isNonAlcoholicOption)
  const nonAlcoholicOptionsForEvent = selectedEvent
    ? nonAlcoholicOptions.filter((m) =>
        selectedEvent.nonAlcoholicMixerIds.includes(m.id),
      )
    : []

  function handleGuestBack() {
    switch (guestView) {
      case 'event':
        break
      case 'alcoholic-category':
      case 'nonalcoholic-drink':
        setGuestView('type')
        setIsAlcoholicChoice(null)
        break
      case 'alcoholic-drink':
        setGuestView('alcoholic-category')
        setSelectedDrinkId(null)
        setSelectedMixerId(null)
        break
      case 'alcoholic-mixer':
        setGuestView('alcoholic-drink')
        setSelectedMixerId(null)
        break
      case 'summary':
        if (isAlcoholicChoice) {
          if (!selectedMixerId) {
            setGuestView('alcoholic-mixer')
          } else {
            setGuestView('alcoholic-mixer')
          }
        } else {
          setGuestView('nonalcoholic-drink')
        }
        break
      default:
        break
    }
  }

  function summaryText(): string {
    if (!config) return ''
    if (isAlcoholicChoice && selectedDrink && selectedMixer) {
      return `${selectedDrink.name} with ${selectedMixer.name}`
    }
    if (!isAlcoholicChoice && selectedMixer) {
      return selectedMixer.name
    }
    return ''
  }

  async function handleConfirmBooking(guestName?: string) {
    if (!config) return
    if (!selectedEventId) {
      alert('Please select an event first.')
      return
    }
    const text = summaryText()
    if (!text) {
      alert('Please complete your selection first.')
      return
    }

    const booking: Booking = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `booking-${Date.now()}`,
      eventId: selectedEventId,
      createdAt: new Date().toISOString(),
      guestName: guestName?.trim() || undefined,
      isAlcoholicChoice: Boolean(isAlcoholicChoice),
      drinkId: isAlcoholicChoice ? selectedDrinkId ?? undefined : undefined,
      mixerId: selectedMixerId ?? undefined,
      summaryText: text,
    }

    const nextConfig: Config = {
      ...config,
      bookings: [...(config.bookings ?? []), booking],
    }

    await saveConfigToServer(nextConfig)
    resetGuestFlow()
  }

  // ---------- Admin: Categories ----------

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    const name = newCategoryName.trim()
    if (!name) return
    const id = slugify(
      name,
      config.categories.map((c) => c.id),
    )
    const nextConfig: Config = {
      ...config,
      categories: [...config.categories, { id, name }],
    }
    setNewCategoryName('')
    void saveConfigToServer(nextConfig)
  }

  function handleDeleteCategory(category: Category) {
    if (!config) return
    const usedByDrinks = config.drinks.some(
      (d) => d.categoryId === category.id,
    )
    const proceed = usedByDrinks
      ? window.confirm(
          'This category is used by some drinks. Deleting it will also delete those drinks. Continue?',
        )
      : window.confirm('Delete this category?')

    if (!proceed) return

    const nextConfig: Config = {
      ...config,
      categories: config.categories.filter((c) => c.id !== category.id),
      drinks: config.drinks.filter((d) => d.categoryId !== category.id),
    }
    void saveConfigToServer(nextConfig)
  }

  // ---------- Admin: Mixers ----------

  function handleAddMixer(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    const name = newMixerName.trim()
    if (!name) return
    const id = slugify(
      name,
      config.mixers.map((m) => m.id),
    )
    const nextConfig: Config = {
      ...config,
      mixers: [
        ...config.mixers,
        { id, name, isNonAlcoholicOption: true },
      ],
    }
    setNewMixerName('')
    void saveConfigToServer(nextConfig)
  }

  function handleDeleteMixer(mixer: Mixer) {
    if (!config) return
    const proceed = window.confirm(
      'Delete this mixer? It will also be removed from any drinks that use it.',
    )
    if (!proceed) return
    const nextConfig: Config = {
      ...config,
      mixers: config.mixers.filter((m) => m.id !== mixer.id),
      drinks: config.drinks.map((d) => ({
        ...d,
        mixerIds: d.mixerIds.filter((id) => id !== mixer.id),
      })),
    }
    void saveConfigToServer(nextConfig)
  }

  function handleToggleNonAlcoholic(mixer: Mixer) {
    if (!config) return
    const nextConfig: Config = {
      ...config,
      mixers: config.mixers.map((m) =>
        m.id === mixer.id
          ? { ...m, isNonAlcoholicOption: !m.isNonAlcoholicOption }
          : m,
      ),
    }
    void saveConfigToServer(nextConfig)
  }

  // ---------- Admin: Drinks ----------

  function resetDrinkForm() {
    setDrinkFormMode('create')
    setEditingDrinkId(null)
    setDrinkNameInput('')
    setDrinkCategoryIdInput(config?.categories[0]?.id ?? '')
    setDrinkImageUrlInput('')
    setDrinkMixerIdsInput([])
  }

  useEffect(() => {
    // Ensure drink form has a category if config loaded
    if (config && !drinkCategoryIdInput && config.categories.length > 0) {
      setDrinkCategoryIdInput(config.categories[0].id)
    }
  }, [config, drinkCategoryIdInput])

  function handleEditDrink(drink: Drink) {
    setDrinkFormMode('edit')
    setEditingDrinkId(drink.id)
    setDrinkNameInput(drink.name)
    setDrinkCategoryIdInput(drink.categoryId)
    setDrinkImageUrlInput(drink.imageUrl ?? '')
    setDrinkMixerIdsInput(drink.mixerIds)
  }

  function handleDeleteDrink(drink: Drink) {
    if (!config) return
    const proceed = window.confirm(`Delete drink "${drink.name}"?`)
    if (!proceed) return
    const nextConfig: Config = {
      ...config,
      drinks: config.drinks.filter((d) => d.id !== drink.id),
    }
    void saveConfigToServer(nextConfig)
    if (editingDrinkId === drink.id) {
      resetDrinkForm()
    }
  }

  function toggleDrinkMixerId(id: string) {
    setDrinkMixerIdsInput((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  async function handleDrinkFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return

    const name = drinkNameInput.trim()
    if (!name) return
    if (!drinkCategoryIdInput) {
      alert('Please select a category for this drink.')
      return
    }

    if (drinkFormMode === 'create') {
      const id = slugify(
        name,
        config.drinks.map((d) => d.id),
      )
      const newDrink: Drink = {
        id,
        name,
        categoryId: drinkCategoryIdInput,
        imageUrl: drinkImageUrlInput || undefined,
        mixerIds: drinkMixerIdsInput,
      }
      const nextConfig: Config = {
        ...config,
        drinks: [...config.drinks, newDrink],
      }
      resetDrinkForm()
      await saveConfigToServer(nextConfig)
    } else if (drinkFormMode === 'edit' && editingDrinkId) {
      const nextConfig: Config = {
        ...config,
        drinks: config.drinks.map((d) =>
          d.id === editingDrinkId
            ? {
                ...d,
                name,
                categoryId: drinkCategoryIdInput,
                imageUrl: drinkImageUrlInput || undefined,
                mixerIds: drinkMixerIdsInput,
              }
            : d,
        ),
      }
      await saveConfigToServer(nextConfig)
    }
  }

  async function handleImageUploadChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (!e.target.files?.length) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    setUploadingImage(true)
    setError(null)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = (await res.json()) as { url: string }
      setDrinkImageUrlInput(data.url)
    } catch (err) {
      console.error(err)
      setError('Image upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  // ---------- Render helper components ----------

  function CardButton(props: {
    selected?: boolean
    children: React.ReactNode
    onClick?: () => void
  }) {
    const { selected, children, onClick } = props
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border px-4 py-4 text-left transition
        ${
          selected
            ? 'border-emerald-400 bg-slate-800 shadow-lg'
            : 'border-slate-700 bg-slate-900 hover:border-emerald-500 hover:bg-slate-800'
        }`}
      >
        {children}
      </button>
    )
  }

  // ---------- Main render ----------

  if (loading) {
    return (
      <main className="w-full max-w-xl px-4 py-8">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-8 shadow-xl">
          <p className="text-center text-slate-200">Loading…</p>
        </div>
      </main>
    )
  }

  if (!config) {
    return (
      <main className="w-full max-w-xl px-4 py-8">
        <div className="rounded-2xl bg-slate-900/80 px-6 py-8 shadow-xl">
          <p className="text-center text-red-300">
            Could not load configuration.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full max-w-xl px-4 py-8">
      <div className="rounded-3xl bg-slate-900/80 px-4 py-5 shadow-2xl ring-1 ring-slate-800 sm:px-6">
        {/* Header with mode toggle */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">
              Event Drink Selector
            </h1>
            <p className="text-xs text-slate-400">
              For guests at a private function
            </p>
          </div>

          <div className="inline-flex items-center rounded-full bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => handleAdminToggle('guest')}
              className={`rounded-full px-3 py-1 ${
                mode === 'guest'
                  ? 'bg-slate-50 text-slate-900 shadow-sm'
                  : 'text-slate-300'
              }`}
            >
              Guest
            </button>
            <button
              type="button"
              onClick={() => handleAdminToggle('admin')}
              className={`rounded-full px-3 py-1 ${
                mode === 'admin'
                  ? 'bg-emerald-400 text-slate-900 shadow-sm'
                  : 'text-slate-300'
              }`}
            >
              Admin
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        )}
        {saving && (
          <div className="mb-3 text-xs text-emerald-300">
            Saving changes…
          </div>
        )}

        {mode === 'guest' ? (
          <GuestWizard
            guestView={guestView}
            setGuestView={setGuestView}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            events={events}
            isAlcoholicChoice={isAlcoholicChoice}
            setIsAlcoholicChoice={setIsAlcoholicChoice}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            selectedDrinkId={selectedDrinkId}
            setSelectedDrinkId={setSelectedDrinkId}
            selectedMixerId={selectedMixerId}
            setSelectedMixerId={setSelectedMixerId}
            categories={categories}
            drinks={drinksForEvent}
            mixers={mixers}
            alcoholicMixersForDrink={alcoholicMixersForDrink}
            nonAlcoholicOptions={nonAlcoholicOptionsForEvent}
            onBack={handleGuestBack}
            onStartAgain={resetGuestFlow}
            summaryText={summaryText()}
            selectedEventName={selectedEvent?.name ?? null}
            onConfirmBooking={handleConfirmBooking}
            CardButton={CardButton}
          />
        ) : (
          <AdminArea
            isAdminAuthed={isAdminAuthed}
            pinInput={pinInput}
            setPinInput={setPinInput}
            handleAdminPinSubmit={handleAdminPinSubmit}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            config={config}
            handleClearAllData={handleClearAllData}
            saveConfigToServer={saveConfigToServer}
            // events
            newEventName={newEventName}
            setNewEventName={setNewEventName}
            portalEventId={portalEventId}
            setPortalEventId={setPortalEventId}
            // categories
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            handleAddCategory={handleAddCategory}
            handleDeleteCategory={handleDeleteCategory}
            // mixers
            newMixerName={newMixerName}
            setNewMixerName={setNewMixerName}
            handleAddMixer={handleAddMixer}
            handleDeleteMixer={handleDeleteMixer}
            handleToggleNonAlcoholic={handleToggleNonAlcoholic}
            // drinks
            drinkFormMode={drinkFormMode}
            editingDrinkId={editingDrinkId}
            drinkNameInput={drinkNameInput}
            setDrinkNameInput={setDrinkNameInput}
            drinkCategoryIdInput={drinkCategoryIdInput}
            setDrinkCategoryIdInput={setDrinkCategoryIdInput}
            drinkImageUrlInput={drinkImageUrlInput}
            setDrinkImageUrlInput={setDrinkImageUrlInput}
            drinkMixerIdsInput={drinkMixerIdsInput}
            toggleDrinkMixerId={toggleDrinkMixerId}
            handleDrinkFormSubmit={handleDrinkFormSubmit}
            handleEditDrink={handleEditDrink}
            handleDeleteDrink={handleDeleteDrink}
            resetDrinkForm={resetDrinkForm}
            uploadingImage={uploadingImage}
            handleImageUploadChange={handleImageUploadChange}
            CardButton={CardButton}
          />
        )}
      </div>
    </main>
  )
}

// ---------- Guest wizard component ----------

type GuestWizardProps = {
  guestView: GuestView
  setGuestView: (v: GuestView) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  events: Event[]
  isAlcoholicChoice: boolean | null
  setIsAlcoholicChoice: (v: boolean | null) => void
  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void
  selectedDrinkId: string | null
  setSelectedDrinkId: (id: string | null) => void
  selectedMixerId: string | null
  setSelectedMixerId: (id: string | null) => void
  categories: Category[]
  drinks: Drink[]
  mixers: Mixer[]
  alcoholicMixersForDrink: Mixer[]
  nonAlcoholicOptions: Mixer[]
  onBack: () => void
  onStartAgain: () => void
  summaryText: string
  selectedEventName: string | null
  onConfirmBooking: (guestName?: string) => Promise<void> | void
  CardButton: (props: {
    selected?: boolean
    children: React.ReactNode
    onClick?: () => void
  }) => JSX.Element
}

function GuestWizard(props: GuestWizardProps) {
  const {
    guestView,
    setGuestView,
    selectedEventId,
    setSelectedEventId,
    events,
    isAlcoholicChoice,
    setIsAlcoholicChoice,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedDrinkId,
    setSelectedDrinkId,
    selectedMixerId,
    setSelectedMixerId,
    categories,
    drinks,
    alcoholicMixersForDrink,
    nonAlcoholicOptions,
    onBack,
    onStartAgain,
    summaryText,
    selectedEventName,
    onConfirmBooking,
    CardButton,
  } = props

  const [guestName, setGuestName] = React.useState('')

  const selectedCategory = categories.find(
    (c) => c.id === selectedCategoryId,
  )
  const selectedDrink = drinks.find((d) => d.id === selectedDrinkId)

  const drinksForCategory = drinks.filter(
    (d) => d.categoryId === selectedCategoryId,
  )

  return (
    <section>
      {/* Header text per step */}
      <div className="mb-5">
        {guestView === 'event' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Start
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Choose your event
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select the event you’re attending.
            </p>
          </>
        )}

        {guestView === 'type' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Step 1
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              What would you like?
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Tap one option to continue.
            </p>
          </>
        )}

        {guestView === 'alcoholic-category' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Step 2
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Choose a type of drink
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Whisky, gin, vodka, rum and more.
            </p>
          </>
        )}

        {guestView === 'alcoholic-drink' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Step 3
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Choose your drink
            </h2>
            {selectedCategory && (
              <p className="mt-1 text-sm text-slate-400">
                Showing options under{' '}
                <span className="font-medium text-slate-200">
                  {selectedCategory.name}
                </span>
                .
              </p>
            )}
          </>
        )}

        {guestView === 'alcoholic-mixer' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Step 4
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Choose a mixer
            </h2>
            {selectedDrink && (
              <p className="mt-1 text-sm text-slate-400">
                Mixers that go well with{' '}
                <span className="font-medium text-slate-200">
                  {selectedDrink.name}
                </span>
                .
              </p>
            )}
          </>
        )}

        {guestView === 'nonalcoholic-drink' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Step 2
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Choose a non-alcoholic drink
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Soft drinks, juices and other options.
            </p>
          </>
        )}

        {guestView === 'summary' && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
              Final step
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Show this at the bar
            </h2>
          </>
        )}
      </div>

      {/* Main content */}
      {guestView === 'event' && (
        <>
          <div className="mb-4 text-xs text-slate-400">
            Tap an event to continue.
          </div>
          <div className="space-y-3">
            {events.map((ev) => (
              <CardButton
                key={ev.id}
                selected={selectedEventId === ev.id}
                onClick={() => {
                  setSelectedEventId(ev.id)
                  setGuestView('type')
                }}
              >
                <p className="text-sm font-medium text-slate-50">{ev.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {ev.drinkIds.length} drink option(s)
                </p>
              </CardButton>
            ))}
            {!events.length && (
              <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200">
                No events yet. Ask the organiser to set one up in Admin.
              </div>
            )}
          </div>
        </>
      )}

      {guestView === 'type' && (
        <div className="space-y-4">
          {selectedEventName && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
              Event: <span className="font-medium">{selectedEventName}</span>
            </div>
          )}
          <CardButton
            selected={isAlcoholicChoice === true}
            onClick={() => {
              setIsAlcoholicChoice(true)
              setGuestView('alcoholic-category')
              setSelectedCategoryId(null)
              setSelectedDrinkId(null)
              setSelectedMixerId(null)
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-50">
                  Alcoholic
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Pick a drink and a mixer.
                </p>
              </div>
              <span className="text-2xl">🍹</span>
            </div>
          </CardButton>

          <CardButton
            selected={isAlcoholicChoice === false}
            onClick={() => {
              setIsAlcoholicChoice(false)
              setGuestView('nonalcoholic-drink')
              setSelectedCategoryId(null)
              setSelectedDrinkId(null)
              setSelectedMixerId(null)
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-50">
                  Non-alcoholic
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Soft drink or juice.
                </p>
              </div>
              <span className="text-2xl">🥤</span>
            </div>
          </CardButton>
        </div>
      )}

      {guestView === 'alcoholic-category' && (
        <>
          <div className="mb-4 text-xs text-slate-400">
            Tap a category to continue.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <CardButton
                key={cat.id}
                selected={selectedCategoryId === cat.id}
                onClick={() => {
                  setSelectedCategoryId(cat.id)
                  setSelectedDrinkId(null)
                  setSelectedMixerId(null)
                  setGuestView('alcoholic-drink')
                }}
              >
                <p className="text-sm font-medium text-slate-50">
                  {cat.name}
                </p>
              </CardButton>
            ))}
          </div>
        </>
      )}

      {guestView === 'alcoholic-drink' && (
        <>
          <div className="mb-4 text-xs text-slate-400">
            Tap a drink to continue.
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {drinksForCategory.map((drink) => (
              <CardButton
                key={drink.id}
                selected={selectedDrinkId === drink.id}
                onClick={() => {
                  setSelectedDrinkId(drink.id)
                  setSelectedMixerId(null)
                  setGuestView('alcoholic-mixer')
                }}
              >
                <div className="flex items-center gap-3">
                  {drink.imageUrl && (
                    <img
                      src={drink.imageUrl}
                      alt={drink.name}
                      className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <p className="text-sm font-medium text-slate-50">
                    {drink.name}
                  </p>
                </div>
              </CardButton>
            ))}
          </div>
        </>
      )}

      {guestView === 'alcoholic-mixer' && (
        <>
          <div className="mb-4 text-xs text-slate-400">
            Tap a mixer to see your final order.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {alcoholicMixersForDrink.map((mixer) => (
              <CardButton
                key={mixer.id}
                selected={selectedMixerId === mixer.id}
                onClick={() => {
                  setSelectedMixerId(mixer.id)
                  setGuestView('summary')
                }}
              >
                <p className="text-sm font-medium text-slate-50">
                  {mixer.name}
                </p>
              </CardButton>
            ))}
          </div>
        </>
      )}

      {guestView === 'nonalcoholic-drink' && (
        <>
          <div className="mb-4 text-xs text-slate-400">
            Tap one drink to see your final order.
          </div>
          <div className="grid grid-cols-2 gap-3">
            {nonAlcoholicOptions.map((mixer) => (
              <CardButton
                key={mixer.id}
                selected={selectedMixerId === mixer.id}
                onClick={() => {
                  setSelectedMixerId(mixer.id)
                  setGuestView('summary')
                }}
              >
                <p className="text-sm font-medium text-slate-50">
                  {mixer.name}
                </p>
              </CardButton>
            ))}
          </div>
        </>
      )}

      {guestView === 'summary' && (
        <div className="mt-2 space-y-6">
          <div className="rounded-2xl border border-emerald-500/60 bg-slate-950/60 px-4 py-5 text-center shadow-lg">
            <p className="text-[0.7rem] uppercase tracking-wide text-emerald-300">
              Your drink
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-50">
              {summaryText}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Please show this screen at the bar when you order.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Your name (optional)
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onConfirmBooking(guestName)}
              className="flex-1 rounded-full bg-sky-400 px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-lg hover:bg-sky-300"
            >
              Confirm booking
            </button>
            <button
              type="button"
              onClick={onStartAgain}
              className="flex-1 rounded-full bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-slate-900 shadow-lg hover:bg-emerald-300"
            >
              Start again
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons for intermediate steps */}
      {guestView !== 'type' && guestView !== 'summary' && (
        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-800"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onStartAgain}
            className="flex-1 rounded-full bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-slate-200"
          >
            Start again
          </button>
        </div>
      )}
    </section>
  )
}

// ---------- Admin area component ----------

type AdminAreaProps = {
  isAdminAuthed: boolean
  pinInput: string
  setPinInput: (v: string) => void
  handleAdminPinSubmit: (e: React.FormEvent) => void
  adminTab: 'categories' | 'mixers' | 'drinks' | 'events' | 'portal'
  setAdminTab: (t: 'categories' | 'mixers' | 'drinks' | 'events' | 'portal') => void
  config: Config
  handleClearAllData: () => void
  saveConfigToServer: (nextConfig: Config) => Promise<void> | void
  // events
  newEventName: string
  setNewEventName: (v: string) => void
  portalEventId: string | null
  setPortalEventId: (v: string | null) => void
  // categories
  newCategoryName: string
  setNewCategoryName: (v: string) => void
  handleAddCategory: (e: React.FormEvent) => void
  handleDeleteCategory: (c: Category) => void
  // mixers
  newMixerName: string
  setNewMixerName: (v: string) => void
  handleAddMixer: (e: React.FormEvent) => void
  handleDeleteMixer: (m: Mixer) => void
  handleToggleNonAlcoholic: (m: Mixer) => void
  // drinks
  drinkFormMode: 'create' | 'edit'
  editingDrinkId: string | null
  drinkNameInput: string
  setDrinkNameInput: (v: string) => void
  drinkCategoryIdInput: string
  setDrinkCategoryIdInput: (v: string) => void
  drinkImageUrlInput: string
  setDrinkImageUrlInput: (v: string) => void
  drinkMixerIdsInput: string[]
  toggleDrinkMixerId: (id: string) => void
  handleDrinkFormSubmit: (e: React.FormEvent) => Promise<void> | void
  handleEditDrink: (d: Drink) => void
  handleDeleteDrink: (d: Drink) => void
  resetDrinkForm: () => void
  uploadingImage: boolean
  handleImageUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  CardButton: (props: {
    selected?: boolean
    children: React.ReactNode
    onClick?: () => void
  }) => JSX.Element
}

function AdminArea(props: AdminAreaProps) {
  const {
    isAdminAuthed,
    pinInput,
    setPinInput,
    handleAdminPinSubmit,
    adminTab,
    setAdminTab,
    config,
    handleClearAllData,
    saveConfigToServer,
    newEventName,
    setNewEventName,
    portalEventId,
    setPortalEventId,
    newCategoryName,
    setNewCategoryName,
    handleAddCategory,
    handleDeleteCategory,
    newMixerName,
    setNewMixerName,
    handleAddMixer,
    handleDeleteMixer,
    handleToggleNonAlcoholic,
    drinkFormMode,
    editingDrinkId,
    drinkNameInput,
    setDrinkNameInput,
    drinkCategoryIdInput,
    setDrinkCategoryIdInput,
    drinkImageUrlInput,
    setDrinkImageUrlInput,
    drinkMixerIdsInput,
    toggleDrinkMixerId,
    handleDrinkFormSubmit,
    handleEditDrink,
    handleDeleteDrink,
    resetDrinkForm,
    uploadingImage,
    handleImageUploadChange,
    CardButton,
  } = props

  const categories = config.categories
  const mixers = config.mixers
  const drinks = config.drinks
  const events = config.events ?? []
  const bookings = config.bookings ?? []

  const nonAlcoholicMixers = mixers.filter((m) => m.isNonAlcoholicOption)

  function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    const name = newEventName.trim()
    if (!name) return
    const id = slugify(
      name,
      events.map((ev) => ev.id),
    )
    const nextConfig: Config = {
      ...config,
      events: [...events, { id, name, drinkIds: [], nonAlcoholicMixerIds: [] }],
    }
    setNewEventName('')
    setPortalEventId(id)
    void saveConfigToServer(nextConfig)
  }

  function handleDeleteEvent(ev: Event) {
    const proceed = window.confirm(
      `Delete event "${ev.name}"? This will also delete its bookings.`,
    )
    if (!proceed) return
    const nextConfig: Config = {
      ...config,
      events: events.filter((e) => e.id !== ev.id),
      bookings: bookings.filter((b) => b.eventId !== ev.id),
    }
    if (portalEventId === ev.id) setPortalEventId(null)
    void saveConfigToServer(nextConfig)
  }

  function handleToggleEventDrinkId(eventId: string, drinkId: string) {
    const nextConfig: Config = {
      ...config,
      events: events.map((ev) => {
        if (ev.id !== eventId) return ev
        const has = ev.drinkIds.includes(drinkId)
        return {
          ...ev,
          drinkIds: has
            ? ev.drinkIds.filter((id) => id !== drinkId)
            : [...ev.drinkIds, drinkId],
        }
      }),
    }
    void saveConfigToServer(nextConfig)
  }

  function handleToggleEventNonAlcoholicMixerId(eventId: string, mixerId: string) {
    const nextConfig: Config = {
      ...config,
      events: events.map((ev) => {
        if (ev.id !== eventId) return ev
        const list = ev.nonAlcoholicMixerIds ?? []
        const has = list.includes(mixerId)
        return {
          ...ev,
          nonAlcoholicMixerIds: has
            ? list.filter((id) => id !== mixerId)
            : [...list, mixerId],
        }
      }),
    }
    void saveConfigToServer(nextConfig)
  }

  function handleDeleteBooking(booking: Booking) {
    const nextConfig: Config = {
      ...config,
      bookings: bookings.filter((b) => b.id !== booking.id),
    }
    void saveConfigToServer(nextConfig)
  }

  if (!isAdminAuthed) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-50">
          Admin area
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Enter the admin PIN to manage categories, mixers and drinks.
        </p>
        <form onSubmit={handleAdminPinSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Admin PIN
            </label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
          >
            Unlock Admin
          </button>
        </form>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-50">
        Admin settings
      </h2>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          Manage drinks and options.
        </p>
        <button
          type="button"
          onClick={handleClearAllData}
          className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/15"
        >
          Clear all data
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-full bg-slate-800 p-1 text-xs">
        <button
          type="button"
          onClick={() => setAdminTab('categories')}
          className={`rounded-full px-3 py-1 ${
            adminTab === 'categories'
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-300'
          }`}
        >
          Categories
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('mixers')}
          className={`rounded-full px-3 py-1 ${
            adminTab === 'mixers'
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-300'
          }`}
        >
          Mixers
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('drinks')}
          className={`rounded-full px-3 py-1 ${
            adminTab === 'drinks'
              ? 'bg-emerald-400 text-slate-900 shadow-sm'
              : 'text-slate-300'
          }`}
        >
          Drinks
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('events')}
          className={`rounded-full px-3 py-1 ${
            adminTab === 'events'
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-300'
          }`}
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('portal')}
          className={`rounded-full px-3 py-1 ${
            adminTab === 'portal'
              ? 'bg-slate-50 text-slate-900 shadow-sm'
              : 'text-slate-300'
          }`}
        >
          Portal
        </button>
      </div>

      {adminTab === 'events' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Existing events
            </h3>
            <p className="mb-2 text-xs text-slate-500">
              Events control which drinks are available to guests.
            </p>

            <div className="space-y-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-50">{ev.name}</p>
                      <p className="text-[0.7rem] text-slate-400">
                        {ev.drinkIds.length} drink option(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPortalEventId(ev.id)
                          setAdminTab('portal')
                        }}
                        className="text-xs text-sky-300 hover:text-sky-200"
                      >
                        View portal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-slate-300">
                      Drinks for this event
                    </p>
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                      {categories.map((cat) => {
                        const drinksInCat = drinks.filter((d) => d.categoryId === cat.id)
                        if (!drinksInCat.length) return null
                        return (
                          <div key={cat.id} className="mb-3">
                            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                              {cat.name}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {drinksInCat.map((drink) => (
                                <label
                                  key={drink.id}
                                  className="flex items-center gap-2 text-[0.75rem] text-slate-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={ev.drinkIds.includes(drink.id)}
                                    onChange={() =>
                                      handleToggleEventDrinkId(ev.id, drink.id)
                                    }
                                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400"
                                  />
                                  <span>{drink.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {!drinks.length && (
                        <p className="text-xs text-slate-500">
                          Add drinks first, then assign them to events.
                        </p>
                      )}
                      {drinks.length > 0 && categories.length === 0 && (
                        <p className="text-xs text-slate-500">
                          Add at least one category so drinks can be grouped.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-slate-300">
                      Non-alcoholic options for this event
                    </p>
                    <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                      {nonAlcoholicMixers.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 text-[0.75rem] text-slate-200"
                        >
                          <input
                            type="checkbox"
                            checked={(ev.nonAlcoholicMixerIds ?? []).includes(m.id)}
                            onChange={() =>
                              handleToggleEventNonAlcoholicMixerId(ev.id, m.id)
                            }
                            className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400"
                          />
                          <span>{m.name}</span>
                        </label>
                      ))}
                      {!nonAlcoholicMixers.length && (
                        <p className="col-span-2 text-xs text-slate-500">
                          Add mixers and mark them as non-alcoholic options first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!events.length && (
                <p className="text-xs text-slate-500">
                  No events yet. Add one below.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleAddEvent} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">Add event</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Event name
              </label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g. NYE Party 2025"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Add event
            </button>
          </form>
        </div>
      )}

      {adminTab === 'portal' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Event portal</h3>
            <p className="mb-2 text-xs text-slate-500">
              View bookings submitted by guests.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Event
              </label>
              <select
                value={portalEventId ?? ''}
                onChange={(e) => setPortalEventId(e.target.value || null)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
              >
                <option value="">Select an event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {portalEventId && (
            <div className="space-y-2">
              {bookings
                .filter((b) => b.eventId === portalEventId)
                .slice()
                .reverse()
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-slate-50">{b.summaryText}</p>
                      <p className="text-[0.7rem] text-slate-400">
                        {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBooking(b)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                ))}

              {!bookings.filter((b) => b.eventId === portalEventId).length && (
                <p className="text-xs text-slate-500">No bookings yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {adminTab === 'categories' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Existing categories
            </h3>
            <p className="mb-2 text-xs text-slate-500">
              Used in the alcoholic guest flow.
            </p>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <span>{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-xs text-red-300 hover:text-red-200"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!categories.length && (
                <p className="text-xs text-slate-500">
                  No categories yet. Add one below.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Add category
            </h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Category name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Gin, Bourbon, Wine"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Add category
            </button>
          </form>
        </div>
      )}

      {adminTab === 'mixers' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Existing mixers
            </h3>
            <p className="mb-2 text-xs text-slate-500">
              Mixers can also be marked as non-alcoholic drink options.
            </p>
            <div className="space-y-2">
              {mixers.map((mixer) => (
                <div
                  key={mixer.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <div>
                    <p>{mixer.name}</p>
                    {mixer.isNonAlcoholicOption && (
                      <p className="text-[0.65rem] text-emerald-300">
                        Used as non-alcoholic drink
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-[0.7rem] text-slate-300">
                      <input
                        type="checkbox"
                        checked={mixer.isNonAlcoholicOption}
                        onChange={() => handleToggleNonAlcoholic(mixer)}
                        className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400"
                      />
                      <span>Non-alcoholic option</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteMixer(mixer)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!mixers.length && (
                <p className="text-xs text-slate-500">
                  No mixers yet. Add one below.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleAddMixer} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Add mixer
            </h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Mixer name
              </label>
              <input
                type="text"
                value={newMixerName}
                onChange={(e) => setNewMixerName(e.target.value)}
                placeholder="e.g. Cola, Ginger Beer, Soda"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              Add mixer
            </button>
          </form>
        </div>
      )}

      {adminTab === 'drinks' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Drinks (alcoholic)
            </h3>
            <p className="mb-2 text-xs text-slate-500">
              Drinks appear in the alcoholic guest flow.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {drinks.map((drink) => {
                const category = categories.find(
                  (c) => c.id === drink.categoryId,
                )
                const hasImage = !!drink.imageUrl
                return (
                  <div
                    key={drink.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {hasImage && (
                        <span className="inline-flex h-6 items-center rounded-full bg-emerald-500/20 px-2 text-[0.65rem] text-emerald-200">
                          img
                        </span>
                      )}
                      <div>
                        <p>{drink.name}</p>
                        <p className="text-[0.7rem] text-slate-400">
                          {category?.name ?? 'No category'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditDrink(drink)}
                        className="text-xs text-sky-300 hover:text-sky-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDrink(drink)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
              {!drinks.length && (
                <p className="text-xs text-slate-500">
                  No drinks yet. Add one below.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleDrinkFormSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                {drinkFormMode === 'create'
                  ? 'Add drink'
                  : 'Edit drink'}
              </h3>
              {drinkFormMode === 'edit' && (
                <button
                  type="button"
                  onClick={resetDrinkForm}
                  className="text-[0.7rem] text-slate-400 hover:text-slate-200"
                >
                  New drink
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Drink name
                </label>
                <input
                  type="text"
                  value={drinkNameInput}
                  onChange={(e) => setDrinkNameInput(e.target.value)}
                  placeholder="e.g. Jack Daniel's"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Category
                </label>
                <select
                  value={drinkCategoryIdInput}
                  onChange={(e) =>
                    setDrinkCategoryIdInput(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  {!categories.length && (
                    <option value="">Add categories first</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Image
                </label>
                <input
                  type="url"
                  value={drinkImageUrlInput}
                  onChange={(e) =>
                    setDrinkImageUrlInput(e.target.value)
                  }
                  placeholder="Paste an image URL or upload below"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-400"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUploadChange}
                    className="text-xs text-slate-300"
                  />
                  {uploadingImage && (
                    <span className="text-[0.7rem] text-emerald-300">
                      Uploading…
                    </span>
                  )}
                </div>
                {drinkImageUrlInput && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={drinkImageUrlInput}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <p className="text-[0.7rem] text-slate-400">
                      Live preview of the bottle image.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Allowed mixers for this drink
                </label>
                <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2">
                  {mixers.map((mixer) => (
                    <label
                      key={mixer.id}
                      className="flex items-center gap-2 text-[0.75rem] text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={drinkMixerIdsInput.includes(mixer.id)}
                        onChange={() => toggleDrinkMixerId(mixer.id)}
                        className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-400"
                      />
                      <span>{mixer.name}</span>
                    </label>
                  ))}
                  {!mixers.length && (
                    <p className="text-[0.7rem] text-slate-500">
                      Add mixers first.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
            >
              {drinkFormMode === 'create'
                ? 'Add drink'
                : 'Save changes'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
