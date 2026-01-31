<script setup lang="ts">
import type { PageSeoConfig } from '@gravito/luminosity'
import { Head } from '@inertiajs/vue3'

defineProps<{
  seo?: PageSeoConfig
}>()
</script>

<template>
  <Head v-if="seo">
    <!-- Basic Meta -->
    <title v-if="seo.meta.title">{{ seo.meta.title }}</title>
    <meta v-if="seo.meta.description" name="description" :content="seo.meta.description">
    <meta v-if="seo.meta.keywords?.length" name="keywords" :content="seo.meta.keywords.join(', ')">
    <link v-if="seo.meta.canonical" rel="canonical" :href="seo.meta.canonical">
    <meta v-if="seo.meta.robots" name="robots" :content="seo.meta.robots">

    <!-- OpenGraph -->
    <meta v-if="seo.og?.type" property="og:type" :content="seo.og.type">
    <meta v-if="seo.og?.title || seo.meta.title" property="og:title" :content="seo.og?.title || seo.meta.title">
    <meta v-if="seo.og?.description || seo.meta.description" property="og:description" :content="seo.og?.description || seo.meta.description">
    <meta v-if="seo.og?.image" property="og:image" :content="typeof seo.og.image === 'string' ? seo.og.image : seo.og.image.url">
    <meta v-if="seo.og?.url" property="og:url" :content="seo.og.url">
    <meta v-if="seo.og?.siteName" property="og:site_name" :content="seo.og.siteName">

    <!-- Twitter -->
    <meta v-if="seo.twitter?.card" name="twitter:card" :content="seo.twitter.card">
    <meta v-if="seo.twitter?.site" name="twitter:site" :content="seo.twitter.site">
    <meta v-if="seo.twitter?.creator" name="twitter:creator" :content="seo.twitter.creator">
    <meta v-if="seo.twitter?.title || seo.meta.title" name="twitter:title" :content="seo.twitter?.title || seo.meta.title">
    <meta v-if="seo.twitter?.description || seo.meta.description" name="twitter:description" :content="seo.twitter?.description || seo.meta.description">
    <meta v-if="seo.twitter?.image || seo.og?.image" name="twitter:image" :content="seo.twitter?.image || (typeof seo.og?.image === 'string' ? seo.og.image : seo.og?.image?.url)">

    <!-- JSON-LD (Multiple support) -->
    <component v-if="seo.jsonLd" :is="'script'" type="application/ld+json">
      {{ JSON.stringify(seo.jsonLd) }}
    </component>
  </Head>
</template>
