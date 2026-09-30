<template>
  <Teleport to="body">
    <div v-if="paso" class="guia" :class="{ centrada: !rect && !buscando, movil, claro: theme === 'light' }">
      <!-- Bloquea la app durante la guía; el foco recorta el elemento señalado -->
      <div class="guia-bloqueo" :class="{ oscuro: !rect }"></div>
      <!-- Mientras se busca el elemento del paso no se muestra la tarjeta (evita un salto al centro) -->
      <div v-if="rect" class="guia-foco" :style="focoStyle" aria-hidden="true"></div>

      <div
        v-show="!buscando"
        ref="cardRef"
        class="guia-card"
        :class="{ bienvenida: paso.id === 'bienvenida' || paso.id === 'final' }"
        :style="cardStyle"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`guia-t-${paso.id}`"
        :aria-describedby="`guia-d-${paso.id}`"
      >
        <div class="guia-progreso" aria-hidden="true"><span :style="{ width: `${progreso}%` }"></span></div>

        <img v-if="paso.id === 'bienvenida' || paso.id === 'final'" :src="icono" alt="" class="guia-icono" />
        <span v-else class="guia-contador">Paso {{ numero }} de {{ totalPasos }}</span>

        <h3 :id="`guia-t-${paso.id}`" class="guia-titulo">{{ tituloPaso }}</h3>
        <div :id="`guia-d-${paso.id}`" class="guia-texto" v-html="paso.texto"></div>

        <div class="guia-acciones">
          <button v-if="paso.id !== 'final'" type="button" class="guia-omitir" @click="omitir">Omitir guía</button>
          <span class="guia-espacio"></span>
          <button v-if="indice > 0 && paso.id !== 'final'" type="button" class="guia-btn" @click="ir(-1)">Anterior</button>
          <button ref="principalRef" type="button" class="guia-btn primario" @click="ir(1)">{{ textoPrincipal }}</button>
        </div>
      </div>

      <p class="sr-only" aria-live="polite">{{ tituloPaso }}</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * GuiaInicio.vue — Capa visual de la guía de inicio (estado y pasos en useGuiaInicio).
 * Oscurece la pantalla, recorta el elemento del paso y ubica la tarjeta a su lado sin salirse
 * de la ventana; en celular la tarjeta va fija abajo (o arriba si el elemento está abajo).
 * Teclado: → / Enter siguiente, ← anterior, Esc omitir.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useGuiaInicio, type Lado } from '../../composables/useGuiaInicio'
import { useAuthStore } from '../../stores/auth'
import { useTheme } from '../../composables/useTheme'

const { paso, indice, numero, totalPasos, cerrar, mover, filtrar } = useGuiaInicio()
const auth = useAuthStore()
const { theme } = useTheme()

const icono = computed(() => (theme.value === 'dark' ? '/Logos/icono-g-blanco.png' : '/Logos/icono-g.png'))
const nombre = computed(() => {
  const local = auth.userEmail.split('@')[0] ?? ''
  const primero = local.split(/[._-]/)[0] ?? ''
  return primero ? primero.charAt(0).toUpperCase() + primero.slice(1) : ''
})
const tituloPaso = computed(() => {
  if (!paso.value) return ''
  if (paso.value.id === 'bienvenida' && nombre.value) return `Hola, ${nombre.value}. ${paso.value.titulo}`
  return paso.value.titulo
})
const textoPrincipal = computed(() => {
  if (!paso.value) return ''
  if (paso.value.id === 'bienvenida') return 'Empezar recorrido'
  if (paso.value.id === 'final') return 'Terminar'
  return 'Siguiente'
})
const progreso = computed(() => {
  if (!paso.value || paso.value.id === 'bienvenida') return 0
  if (paso.value.id === 'final') return 100
  return Math.round((numero.value / (totalPasos.value + 1)) * 100)
})

// ---------------------------------------------------------------- Posición
const MARGEN = 12, SEPARACION = 14, RELLENO = 6
const rect = ref<DOMRect | null>(null)
const buscando = ref(false)
const cardRef = ref<HTMLElement | null>(null)
const principalRef = ref<HTMLButtonElement | null>(null)
const cardPos = ref<{ top: number; left: number } | null>(null)
const vw = ref(window.innerWidth)
const vh = ref(window.innerHeight)
const movil = computed(() => vw.value < 640)
let objetivo: HTMLElement | null = null
let direccion: 1 | -1 = 1

const focoStyle = computed(() => {
  const r = rect.value
  if (!r) return {}
  return { top: `${r.top - RELLENO}px`, left: `${r.left - RELLENO}px`, width: `${r.width + RELLENO * 2}px`, height: `${r.height + RELLENO * 2}px` }
})
const cardStyle = computed(() => {
  if (!rect.value) return {}
  if (movil.value) {
    // Hoja fija: abajo, o arriba si el elemento está en la mitad inferior
    return rect.value.top + rect.value.height / 2 > vh.value / 2 ? { top: `${MARGEN}px` } : { bottom: `${MARGEN}px` }
  }
  return cardPos.value ? { top: `${cardPos.value.top}px`, left: `${cardPos.value.left}px` } : { visibility: 'hidden' as const }
})

function visible(el: Element): el is HTMLElement {
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0
}
function buscar(selectores: string[]): HTMLElement | null {
  for (const s of selectores) {
    const el = [...document.querySelectorAll(s)].find(visible)
    if (el) return el as HTMLElement
  }
  return null
}
/** Espera a que el elemento aparezca (la vista puede estar cargando); null si no llega */
async function esperar(selectores: string[], ms = 1200): Promise<HTMLElement | null> {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    const el = buscar(selectores)
    if (el) return el
    await new Promise(r => setTimeout(r, 100))
  }
  return null
}

function ubicarTarjeta() {
  const r = rect.value, card = cardRef.value
  if (!r || !card || movil.value) return
  const w = card.offsetWidth, h = card.offsetHeight
  const lados: Record<Lado, () => { top: number; left: number; cabe: boolean }> = {
    derecha: () => ({ left: r.right + SEPARACION, top: r.top + r.height / 2 - h / 2, cabe: r.right + SEPARACION + w <= vw.value - MARGEN }),
    izquierda: () => ({ left: r.left - SEPARACION - w, top: r.top + r.height / 2 - h / 2, cabe: r.left - SEPARACION - w >= MARGEN }),
    abajo: () => ({ left: r.left + r.width / 2 - w / 2, top: r.bottom + SEPARACION, cabe: r.bottom + SEPARACION + h <= vh.value - MARGEN }),
    arriba: () => ({ left: r.left + r.width / 2 - w / 2, top: r.top - SEPARACION - h, cabe: r.top - SEPARACION - h >= MARGEN }),
  }
  const pref = paso.value?.lado ?? 'abajo'
  const orden: Lado[] = [pref, ...(['abajo', 'derecha', 'arriba', 'izquierda'] as Lado[]).filter(l => l !== pref)]
  const elegido = orden.map(l => lados[l]()).find(p => p.cabe) ?? lados[pref]()
  cardPos.value = {
    left: Math.min(Math.max(elegido.left, MARGEN), vw.value - w - MARGEN),
    top: Math.min(Math.max(elegido.top, MARGEN), vh.value - h - MARGEN),
  }
}

function medir() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
  if (objetivo && objetivo.isConnected) rect.value = objetivo.getBoundingClientRect()
  nextTick(ubicarTarjeta)
}
let raf = 0
function medirPronto() { cancelAnimationFrame(raf); raf = requestAnimationFrame(medir) }

// Cada cambio de paso: busca el elemento (o salta el paso si no existe), lo trae a la vista y se ubica
let turno = 0
watch(paso, async p => {
  const mio = ++turno
  objetivo = null
  rect.value = null
  cardPos.value = null
  buscando.value = !!p?.objetivo
  if (!p) return
  if (p.objetivo) {
    // Si el paso vive en el menú lateral, se da tiempo a que el menú se abra en celular
    const el = await esperar(p.objetivo, p.enMenu ? 1500 : 1200)
    if (mio !== turno) return
    if (!el) { mover(direccion); return }
    objetivo = el
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      await new Promise(res => setTimeout(res, 380))
      if (mio !== turno) return
    }
    medir()
    buscando.value = false
    // Segunda medida por si el menú o la vista seguían animándose
    setTimeout(() => { if (mio === turno) medir() }, 320)
  }
  await nextTick()
  principalRef.value?.focus({ preventScroll: true })
}, { immediate: true })

watch(() => !!paso.value, activa => {
  if (activa) {
    window.addEventListener('resize', medirPronto)
    window.addEventListener('scroll', medirPronto, true)
    document.addEventListener('keydown', onTecla)
  } else quitarEscuchas()
}, { immediate: true })
function quitarEscuchas() {
  window.removeEventListener('resize', medirPronto)
  window.removeEventListener('scroll', medirPronto, true)
  document.removeEventListener('keydown', onTecla)
}
onBeforeUnmount(quitarEscuchas)

// ---------------------------------------------------------------- Acciones
function ir(d: 1 | -1) {
  direccion = d
  // Al empezar se descartan los pasos cuyo elemento no está en esta pantalla (la vista ya terminó de cargar)
  if (paso.value?.id === 'bienvenida' && d === 1) filtrar(x => !!buscar(x.objetivo!))
  mover(d)
}
function omitir() { cerrar(false) }
function onTecla(e: KeyboardEvent) {
  if (!paso.value) return
  if (e.key === 'Escape') { e.preventDefault(); omitir() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); ir(1) }
  else if (e.key === 'ArrowLeft' && indice.value > 0) { e.preventDefault(); ir(-1) }
  else if (e.key === 'Tab') {
    // El foco no sale de la tarjeta mientras la guía está abierta
    const f = cardRef.value?.querySelectorAll<HTMLElement>('button')
    if (!f?.length) return
    const primero = f[0], ultimo = f[f.length - 1]
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
  }
}
</script>

<style scoped>
.guia { position: fixed; inset: 0; z-index: 10000; }
.guia-bloqueo { position: fixed; inset: 0; background: transparent; }
.guia-bloqueo.oscuro { background: rgba(2, 6, 23, 0.62); backdrop-filter: blur(2px); }
.guia-foco {
  position: fixed; border-radius: 10px; pointer-events: none;
  box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.62), 0 0 0 2px var(--accent);
  transition: top .25s ease, left .25s ease, width .25s ease, height .25s ease;
}

.guia-card {
  position: fixed; width: 340px; max-width: calc(100vw - 24px); box-sizing: border-box;
  padding: 20px 20px 16px; border-radius: 14px; overflow: hidden;
  /* Fondo sólido: --card-bg es translúcido en tema oscuro y dejaría ver la página detrás */
  background: var(--bg-alt); border: 1px solid var(--card-border); color: var(--text-primary);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  transition: top .25s ease, left .25s ease;
  animation: guia-entrar .22s ease-out;
}
.claro .guia-card { background: var(--card-bg); }
.centrada .guia-card { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; text-align: center; transition: none; animation: guia-entrar-centro .25s ease-out; }
.movil:not(.centrada) .guia-card { left: 12px; right: 12px; width: auto; max-width: none; transition: none; }

.guia-progreso { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--card-border); }
.guia-progreso span { display: block; height: 100%; background: var(--accent); transition: width .3s ease; }

.guia-icono { width: 44px; height: 44px; display: block; margin: 4px auto 12px; }
.guia-contador { display: block; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.guia-titulo { margin: 0 0 8px; font-size: 16px; font-weight: 700; letter-spacing: -0.2px; line-height: 1.3; }
.bienvenida .guia-titulo { font-size: 19px; }
.guia-texto { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }
.guia-texto :deep(b) { color: var(--text-primary); font-weight: 600; }
.guia-texto :deep(ul) { text-align: left; margin: 10px 0 0; padding-left: 18px; }
.guia-texto :deep(li) { margin: 4px 0; }

.guia-acciones { display: flex; align-items: center; gap: 8px; margin-top: 18px; }
.guia-espacio { flex: 1; }
.guia-omitir {
  background: none; border: none; padding: 6px 2px; font: inherit; font-size: 12.5px;
  color: var(--text-tertiary); cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
}
.guia-omitir:hover { color: var(--text-primary); }
.guia-btn {
  padding: 8px 14px; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--card-border); background: transparent; color: var(--text-primary);
}
.guia-btn:hover { background: var(--bg-alt); }
.guia-btn.primario { background: var(--accent); border-color: var(--accent); color: #fff; }
.guia-btn.primario:hover { filter: brightness(1.08); background: var(--accent); }
.guia-btn:focus-visible, .guia-omitir:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@keyframes guia-entrar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes guia-entrar-centro { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
@media (prefers-reduced-motion: reduce) {
  .guia-card, .guia-foco, .guia-progreso span { transition: none; animation: none; }
}
@media (max-width: 480px) {
  .centrada .guia-card { width: calc(100vw - 24px); padding: 18px 16px 14px; }
  .guia-acciones { flex-wrap: wrap; }
}
</style>
