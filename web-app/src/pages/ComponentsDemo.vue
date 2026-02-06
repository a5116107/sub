<script setup lang="ts">
import { ref } from 'vue'
import {
  Button,
  Input,
  Card,
  Dialog,
  Badge,
  Progress,
  Skeleton,
  Tooltip,
  useToast
} from '~/shared/ui'

const toast = useToast()
const showDialog = ref(false)
const inputValue = ref('')
const inputWithError = ref('')

function showSuccessToast() {
  toast.success('Operation completed successfully!')
}

function showErrorToast() {
  toast.error('Something went wrong. Please try again.')
}

function showWarningToast() {
  toast.warning('Please check your input before proceeding.')
}

function showInfoToast() {
  toast.info('New updates are available.')
}

function handleCardClick() {
  toast.info('Card clicked!')
}
</script>

<template>
  <div class="min-h-screen bg-bg-secondary p-8">
    <div class="max-w-6xl mx-auto space-y-12">
      <!-- Header -->
      <div class="text-center">
        <h1 class="text-4xl font-bold text-text-primary mb-4">
          UI Components Demo
        </h1>
        <p class="text-text-secondary">
          Showcase of enhanced UI components for Sub2API
        </p>
      </div>

      <!-- Buttons Section -->
      <Card title="Buttons" variant="elevated">
        <div class="space-y-6">
          <!-- Variants -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Variants</h4>
            <div class="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="info">Info</Button>
            </div>
          </div>

          <!-- Sizes -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Sizes</h4>
            <div class="flex flex-wrap items-center gap-3">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          <!-- States -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">States</h4>
            <div class="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button variant="primary" shadow>With Shadow</Button>
              <Button icon rounded="full">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <!-- Inputs Section -->
      <Card title="Inputs" variant="elevated">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            v-model="inputValue"
            label="Basic Input"
            placeholder="Enter text..."
            hint="This is a hint message"
          />

          <Input
            v-model="inputWithError"
            label="Input with Error"
            placeholder="Enter text..."
            error="This field is required"
          />

          <Input
            label="Clearable Input"
            placeholder="Type something..."
            clearable
            hint="Click the X to clear"
          />

          <Input
            label="With Prefix"
            placeholder="Enter amount"
            prefix="$"
          />

          <Input
            label="With Suffix"
            placeholder="Enter weight"
            suffix="kg"
          />

          <Input
            label="Loading State"
            placeholder="Loading..."
            loading
            disabled
          />

          <Input
            label="Required Field"
            placeholder="Required"
            required
          />

          <Input
            label="Different Sizes"
            size="lg"
            placeholder="Large input"
          />
        </div>
      </Card>

      <!-- Toast Section -->
      <Card title="Toast Notifications" variant="elevated">
        <div class="flex flex-wrap gap-3">
          <Button variant="success" @click="showSuccessToast">
            Show Success
          </Button>
          <Button variant="danger" @click="showErrorToast">
            Show Error
          </Button>
          <Button variant="warning" @click="showWarningToast">
            Show Warning
          </Button>
          <Button variant="info" @click="showInfoToast">
            Show Info
          </Button>
        </div>
      </Card>

      <!-- Cards Section -->
      <Card title="Cards" variant="elevated">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            header="Default Card"
            footer="Footer content"
            hoverable
          >
            <p class="text-text-secondary">
              This is a default card with hover effect.
            </p>
          </Card>

          <Card
            variant="outlined"
            header="Outlined Card"
            hoverable
            clickable
            @click="handleCardClick"
          >
            <p class="text-text-secondary">
              Clickable outlined card variant.
            </p>
          </Card>

          <Card
            variant="ghost"
            header="Ghost Card"
            :padding="'sm'"
          >
            <p class="text-text-secondary">
              Ghost card with small padding.
            </p>
          </Card>
        </div>
      </Card>

      <!-- Badges Section -->
      <Card title="Badges" variant="elevated">
        <div class="flex flex-wrap items-center gap-8">
          <Badge count="5">
            <Button variant="ghost" icon>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Button>
          </Badge>

          <Badge count="100" variant="danger" :max="99">
            <Button variant="ghost" icon>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Button>
          </Badge>

          <Badge dot variant="success">
            <span class="text-text-primary">Online Status</span>
          </Badge>

          <Badge count="New" variant="primary" size="lg">
            <Button variant="secondary">Updates</Button>
          </Badge>
        </div>
      </Card>

      <!-- Progress Section -->
      <Card title="Progress Bars" variant="elevated">
        <div class="space-y-6">
          <Progress :value="75" show-value />
          <Progress :value="45" variant="success" striped animated show-value />
          <Progress :value="60" variant="warning" size="lg" show-value />
          <Progress :value="30" variant="danger" size="sm" />
          <Progress :value="0" indeterminate />
        </div>
      </Card>

      <!-- Skeleton Section -->
      <Card title="Skeleton Loading" variant="elevated">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-3">
            <Skeleton variant="circular" width="64" height="64" />
            <Skeleton width="80%" height="20" />
            <Skeleton width="60%" height="16" />
          </div>

          <div class="space-y-3">
            <Skeleton variant="rounded" width="100%" height="120" />
            <Skeleton width="70%" height="16" />
            <Skeleton width="90%" height="16" />
          </div>

          <div class="space-y-2">
            <Skeleton :lines="5" line-height="16" last-line-width="60%" />
          </div>
        </div>
      </Card>

      <!-- Dialog Section -->
      <Card title="Dialog" variant="elevated">
        <div class="flex flex-wrap gap-3">
          <Button @click="showDialog = true">Open Dialog</Button>
        </div>
      </Card>

      <!-- Tooltip Section -->
      <Card title="Tooltips" variant="elevated">
        <div class="space-y-6">
          <!-- Placements -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Placements</h4>
            <div class="flex flex-wrap items-center gap-4">
              <Tooltip content="Tooltip on top" placement="top">
                <Button size="sm">Top</Button>
              </Tooltip>
              <Tooltip content="Tooltip on bottom" placement="bottom">
                <Button size="sm">Bottom</Button>
              </Tooltip>
              <Tooltip content="Tooltip on left" placement="left">
                <Button size="sm">Left</Button>
              </Tooltip>
              <Tooltip content="Tooltip on right" placement="right">
                <Button size="sm">Right</Button>
              </Tooltip>
            </div>
          </div>

          <!-- Triggers -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Triggers</h4>
            <div class="flex flex-wrap items-center gap-4">
              <Tooltip content="Hover to show" trigger="hover">
                <Button variant="secondary" size="sm">Hover</Button>
              </Tooltip>
              <Tooltip content="Focus to show" trigger="focus">
                <Button variant="secondary" size="sm">Focus</Button>
              </Tooltip>
              <Tooltip content="Click to toggle" trigger="click">
                <Button variant="secondary" size="sm">Click</Button>
              </Tooltip>
            </div>
          </div>

          <!-- Rich Content -->
          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Rich Content</h4>
            <Tooltip placement="top">
              <Button variant="outline" size="sm">Custom Content</Button>
              <template #content>
                <div class="text-left">
                  <p class="font-semibold mb-1">Custom Tooltip</p>
                  <p class="text-xs text-gray-300">This tooltip has rich HTML content.</p>
                </div>
              </template>
            </Tooltip>
          </div>
        </div>
      </Card>
    </div>

    <!-- Dialog -->
    <Dialog
      v-model="showDialog"
      title="Example Dialog"
      size="md"
    >
      <p class="text-text-secondary">
        This is an example dialog with a custom footer. You can customize the size,
        add forms, or any other content here.
      </p>

      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="primary" @click="close">Confirm</Button>
      </template>
    </Dialog>
  </div>
</template>
