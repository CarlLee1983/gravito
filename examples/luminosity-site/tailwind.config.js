/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/client/**/*.{js,ts,jsx,tsx,vue}",
        "./src/services/**/*.{js,ts}",
        "./src/views/**/*.html",
        "./docs/**/*.{md,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                void: '#020617',
                singularity: '#38BDF8',
                event: '#8B5CF6',
                accent: '#F97316',
                panel: '#0F172A',
            },
            fontFamily: {
                heading: ['Poppins', 'system-ui', 'sans-serif'],
                body: ['Open Sans', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
