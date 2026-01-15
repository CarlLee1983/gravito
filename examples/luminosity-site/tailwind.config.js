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
                void: '#000000', // OLED Black
                singularity: '#00FBFF', // More vibrant Electric Cyan
                event: '#8B5CF6',
                accent: '#F97316',
                panel: '#09090B', // Zinc 950
                surface: '#18181B', // Zinc 900
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
