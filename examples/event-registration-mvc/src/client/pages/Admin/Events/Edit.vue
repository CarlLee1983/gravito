<template>
  <AdminLayout>
    <div class="max-w-3xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Edit Event</h1>
      
      <div class="card">
        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input
              v-model="form.title"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Location</label>
            <input
              v-model="form.location"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input
              v-model="form.image_url"
              type="url"
              class="form-input"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select" required>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Registration Start</label>
              <input
                v-model="form.registration_start"
                type="datetime-local"
                class="form-input"
                required
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Registration End</label>
              <input
                v-model="form.registration_end"
                type="datetime-local"
                class="form-input"
                required
              />
            </div>
          </div>
          
          <div class="flex justify-between">
            <Link href="/admin/events" class="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" class="btn btn-primary">
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';

const props = defineProps<{
  event: any;
}>();

const form = reactive({
  title: props.event.title,
  description: props.event.description,
  location: props.event.location,
  image_url: props.event.image_url || '',
  status: props.event.status,
  registration_start: formatDateTimeLocal(props.event.registration_start),
  registration_end: formatDateTimeLocal(props.event.registration_end),
});

function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const submit = () => {
  router.put(`/admin/events/${props.event.id}`, form);
};
</script>
