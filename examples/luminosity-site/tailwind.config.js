/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/client/**/*.{js,ts,jsx,tsx,vue}",
        "./src/views/**/*.html",
    ],
    theme: {
        extend: {
            colors: {
                void: '#030303',
                singularity: '#00F0FF',
                event: '#7000FF',
                panel: '#1A1A1A',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
