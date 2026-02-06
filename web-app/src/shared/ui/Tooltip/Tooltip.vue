<script setup lang="ts">
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
type TooltipTrigger = 'hover' | 'focus' | 'click'

interface Props {
  content?: string
  placement?: TooltipPlacement
  trigger?: TooltipTrigger
  delay?: number
  hideDelay?: number
  disabled?: boolean
  offset?: number
  maxWidth?: string
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  trigger: 'hover',
  delay: 200,
  hideDelay: 100,
  disabled: false,
  offset: 8,
  maxWidth: '250px'
})

const visible = ref(false)
const tooltipRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const position = ref({ x: 0, y: 0 })
const placementClass = ref(props.placement)

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const tooltipClasses = computed(() => [
  'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg',
  'pointer-events-none transition-opacity duration-200',
  visible.value ? 'opacity-100' : 'opacity-0'
])

const arrowClasses = computed(() => {
  const base = 'absolute w-2 h-2 bg-gray-900 rotate-45'
  const positions: Record<TooltipPlacement, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
    left: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
    right: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
  }
  return `${base} ${positions[placementClass.value]}`
})

function calculatePosition() {
  if (!triggerRef.value || !tooltipRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const offset = props.offset

  // Calculate initial position based on placement
  let x = 0
  let y = 0

  switch (props.placement) {
    case 'top':
      x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      y = triggerRect.top - tooltipRect.height - offset
      break
    case 'bottom':
      x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      y = triggerRect.bottom + offset
      break
    case 'left':
      x = triggerRect.left - tooltipRect.width - offset
      y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
      break
    case 'right':
      x = triggerRect.right + offset
      y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
      break
  }

  // Boundary detection - flip placement if needed
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  placementClass.value = props.placement

  // Check boundaries and flip if needed
  if (x < 0 && props.placement === 'left') {
    placementClass.value = 'right'
    x = triggerRect.right + offset
  } else if (x + tooltipRect.width > viewport.width && props.placement === 'right') {
    placementClass.value = 'left'
    x = triggerRect.left - tooltipRect.width - offset
  }

  if (y < 0 && props.placement === 'top') {
    placementClass.value = 'bottom'
    y = triggerRect.bottom + offset
  } else if (y + tooltipRect.height > viewport.height && props.placement === 'bottom') {
    placementClass.value = 'top'
    y = triggerRect.top - tooltipRect.height - offset
  }

  // Ensure tooltip stays within viewport
  x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8))
  y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8))

  position.value = { x, y }
}

function show() {
  if (props.disabled) return

  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  showTimer = setTimeout(() => {
    visible.value = true
    nextTick(() => {
      calculatePosition()
    })
  }, props.delay)
}

function hide() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }

  hideTimer = setTimeout(() => {
    visible.value = false
  }, props.hideDelay)
}

function toggle() {
  if (visible.value) {
    hide()
  } else {
    show()
  }
}

// Handle scroll/resize
function updatePosition() {
  if (visible.value) {
    calculatePosition()
  }
}

watch(visible, (isVisible) => {
  if (isVisible) {
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  } else {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  if (showTimer) clearTimeout(showTimer)
  if (hideTimer) clearTimeout(hideTimer)
})

// Trigger event handlers
const triggerEvents = computed(() => {
  if (props.disabled) return {}

  switch (props.trigger) {
    case 'hover':
      return {
        onMouseenter: show,
        onMouseleave: hide,
        onFocus: show,
        onBlur: hide
      }
    case 'focus':
      return {
        onFocus: show,
        onBlur: hide
      }
    case 'click':
      return {
        onClick: toggle
      }
    default:
      return {}
  }
})
</script>

<template>
  <div class="inline-flex">
    <!-- Trigger element wrapper -->
    <div
      ref="triggerRef"
      class="inline-flex"
      v-bind="triggerEvents"
    >
      <slot />
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="visible || $slots.content"
        ref="tooltipRef"
        :class="tooltipClasses"
        :style="{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxWidth: props.maxWidth
        }"
        role="tooltip"
      >
        <slot name="content">
          {{ content }}
        </slot>
        <div :class="arrowClasses" />
      </div>
    </Teleport>
  </div>
</template>
