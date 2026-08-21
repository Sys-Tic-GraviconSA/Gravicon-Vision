<template>
  <canvas ref="canvasRef" class="particles-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{ dark?: boolean }>(), { dark: true })

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let particles: any[] = []

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  baseOpacity: number
  opacity: number
  pulse: number
  pulseSpeed: number
  hue: number
  color: string
  reset: (initial?: boolean) => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

function init() {
  const canvas = canvasRef.value as HTMLCanvasElement
  if (!canvas) return
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  if (!ctx) return

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const particleHueMin = props.dark ? 200 : 210
  const particleHueRange = props.dark ? 40 : 30
  const particleLightness = props.dark ? 70 : 45
  const lineColor1 = props.dark ? '120, 180, 255' : '50, 110, 200'
  const lineColor2 = props.dark ? '80, 140, 220' : '30, 80, 170'
  const lineOpacityFactor = props.dark ? 0.3 : 0.2

  class ParticleImpl implements Particle {
    x: number = 0
    y: number = 0
    size: number = 1
    speedX: number = 0
    speedY: number = 0
    baseOpacity: number = 0.3
    opacity: number = 0.3
    pulse: number = 0
    pulseSpeed: number = 0.01
    hue: number = 210
    color: string = ''

    constructor() {
      this.reset(true)
    }

    reset(initial = false) {
      this.x = Math.random() * canvas.width
      this.y = initial ? Math.random() * canvas.height : Math.random() * canvas.height
      this.size = Math.random() * 2.5 + 0.8
      this.speedX = (Math.random() - 0.5) * 0.5
      this.speedY = (Math.random() - 0.5) * 0.5
      this.baseOpacity = Math.random() * (props.dark ? 0.6 : 0.4) + (props.dark ? 0.2 : 0.15)
      this.opacity = this.baseOpacity
      this.pulse = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.02 + 0.005
      this.hue = particleHueMin + Math.random() * particleHueRange
    }

    update() {
      this.x += this.speedX
      this.y += this.speedY
      this.pulse += this.pulseSpeed
      this.opacity = this.baseOpacity * (0.6 + 0.4 * Math.sin(this.pulse))
      if (this.x < -20) this.x = canvas.width + 20
      if (this.x > canvas.width + 20) this.x = -20
      if (this.y < -20) this.y = canvas.height + 20
      if (this.y > canvas.height + 20) this.y = -20
    }

    draw(ctx: CanvasRenderingContext2D) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3)
      gradient.addColorStop(0, `hsla(${this.hue}, 80%, ${particleLightness}%, ${this.opacity})`)
      gradient.addColorStop(1, `hsla(${this.hue}, 80%, ${particleLightness}%, 0)`)
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${this.hue}, 80%, ${particleLightness}%, ${this.opacity})`
      ctx.fill()
    }
  }

  const count = Math.min(Math.floor((canvas.width * canvas.height) / 5000), 180)
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push(new ParticleImpl())
  }

  const connectDistance = 150

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < particles.length; i++) {
      particles[i].update()
      particles[i].draw(ctx)
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < connectDistance) {
          const lineOpacity = (1 - dist / connectDistance) * lineOpacityFactor
          const grad = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y)
          grad.addColorStop(0, `rgba(${lineColor1}, ${lineOpacity})`)
          grad.addColorStop(1, `rgba(${lineColor2}, ${lineOpacity})`)
          ctx.beginPath()
          ctx.strokeStyle = grad
          ctx.lineWidth = 0.8
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
    animationId = requestAnimationFrame(animate)
  }

  animate()

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId)
    window.removeEventListener('resize', resize)
  })
}

watch(() => props.dark, () => {
  if (animationId) cancelAnimationFrame(animationId)
  particles = []
  init()
})

onMounted(init)
</script>

<style scoped>
.particles-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
