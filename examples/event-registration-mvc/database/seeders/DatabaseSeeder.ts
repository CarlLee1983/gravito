import { DB, Schema } from '@gravito/atlas'
import { HashManager } from '@gravito/sentinel'
import databaseConfig from '../../config/database'
import { type Event, EventStatus } from '../../src/Models/Event'
import { FieldType, type RegistrationField } from '../../src/Models/RegistrationField'
import type { Session } from '../../src/Models/Session'
import { type User, UserRole } from '../../src/Models/User'

async function seed() {
  console.log('🌱 Seeding database...')

  // Configure Database
  DB.configure(databaseConfig as any)

  // Create Tables
  await Schema.create('users', (table) => {
    table.id()
    table.string('name')
    table.string('email').unique()
    table.string('password')
    table.string('role')
    table.timestamps()
  })

  await Schema.create('events', (table) => {
    table.id()
    table.string('title')
    table.text('description')
    table.string('location')
    table.string('image_url').nullable()
    table.string('status')
    table.dateTime('registration_start')
    table.dateTime('registration_end')
    table.timestamps()
  })

  await Schema.create('sessions', (table) => {
    table.id()
    table.integer('event_id')
    table.string('title')
    table.dateTime('start_time')
    table.dateTime('end_time')
    table.integer('capacity')
    table.integer('registered_count').default(0)
    table.boolean('is_active').default(true)
    table.timestamps()
  })

  await Schema.create('registration_fields', (table) => {
    table.id()
    table.integer('event_id')
    table.string('name')
    table.string('label')
    table.string('type')
    table.text('options').nullable()
    table.boolean('required').default(false)
    table.integer('sort_order').default(0)
    table.timestamps()
  })

  await Schema.create('registrations', (table) => {
    table.id()
    table.integer('user_id')
    table.integer('session_id')
    table.string('status')
    table.string('qr_code').unique()
    table.text('notes').nullable()
    table.dateTime('registered_at')
    table.dateTime('confirmed_at').nullable()
    table.dateTime('checked_in_at').nullable()
    table.timestamps()
  })

  await Schema.create('registration_values', (table) => {
    table.id()
    table.integer('registration_id')
    table.integer('field_id')
    table.text('value')
    table.timestamps()
  })

  console.log('✅ Created tables')

  const hashManager = new HashManager()

  // Create users
  await DB.table<User>('users').insert({
    name: 'Admin User',
    email: 'admin@example.com',
    password: await hashManager.make('password'),
    role: UserRole.ADMIN,
  })

  await DB.table<User>('users').insert({
    name: 'John Doe',
    email: 'john@example.com',
    password: await hashManager.make('password'),
    role: UserRole.USER,
  })

  console.log('✅ Created users')

  // Create events
  const [event1] = await DB.table<Event>('events').insert({
    title: 'Tech Conference 2026',
    description:
      'Annual technology conference featuring the latest innovations in software development.',
    location: 'Taipei International Convention Center',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    status: EventStatus.PUBLISHED,
    registration_start: new Date('2026-01-01'),
    registration_end: new Date('2026-03-01'),
  })

  const [event2] = await DB.table<Event>('events').insert({
    title: 'Web Development Workshop',
    description: 'Hands-on workshop covering modern web development with Vue.js and TypeScript.',
    location: 'Taipei Tech Hub',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998',
    status: EventStatus.PUBLISHED,
    registration_start: new Date('2026-01-15'),
    registration_end: new Date('2026-02-15'),
  })

  console.log('✅ Created events')

  // Create sessions for event 1
  const _session1 = await DB.table<Session>('sessions').insert({
    event_id: event1.id,
    title: 'Morning Session',
    start_time: new Date('2026-03-15 09:00:00'),
    end_time: new Date('2026-03-15 12:00:00'),
    capacity: 100,
    is_active: true,
  })

  const _session2 = await DB.table<Session>('sessions').insert({
    event_id: event1.id,
    title: 'Afternoon Session',
    start_time: new Date('2026-03-15 14:00:00'),
    end_time: new Date('2026-03-15 17:00:00'),
    capacity: 100,
    is_active: true,
  })

  // Create sessions for event 2
  const _session3 = await DB.table<Session>('sessions').insert({
    event_id: event2.id,
    title: 'Day 1 - Fundamentals',
    start_time: new Date('2026-02-20 09:00:00'),
    end_time: new Date('2026-02-20 17:00:00'),
    capacity: 30,
    is_active: true,
  })

  const _session4 = await DB.table<Session>('sessions').insert({
    event_id: event2.id,
    title: 'Day 2 - Advanced Topics',
    start_time: new Date('2026-02-21 09:00:00'),
    end_time: new Date('2026-02-21 17:00:00'),
    capacity: 30,
    is_active: true,
  })

  console.log('✅ Created sessions')

  // Create custom fields for event 1
  await DB.table<RegistrationField>('registration_fields').insert({
    event_id: event1.id,
    name: 'dietary_requirements',
    label: 'Dietary Requirements',
    type: FieldType.SELECT,
    options: JSON.stringify(['None', 'Vegetarian', 'Vegan', 'Halal', 'Other']),
    required: false,
    sort_order: 1,
  })

  await DB.table<RegistrationField>('registration_fields').insert({
    event_id: event1.id,
    name: 'tshirt_size',
    label: 'T-Shirt Size',
    type: FieldType.SELECT,
    options: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
    required: true,
    sort_order: 2,
  })

  // Create custom fields for event 2
  await DB.table<RegistrationField>('registration_fields').insert({
    event_id: event2.id,
    name: 'experience_level',
    label: 'Experience Level',
    type: FieldType.RADIO,
    options: JSON.stringify(['Beginner', 'Intermediate', 'Advanced']),
    required: true,
    sort_order: 1,
  })

  await DB.table<RegistrationField>('registration_fields').insert({
    event_id: event2.id,
    name: 'laptop',
    label: 'Will you bring your own laptop?',
    type: FieldType.CHECKBOX,
    options: JSON.stringify(['Yes']),
    required: false,
    sort_order: 2,
  })

  console.log('✅ Created custom fields')
  console.log('🎉 Database seeding completed!')
}

// Run seeder
seed().catch(console.error)
