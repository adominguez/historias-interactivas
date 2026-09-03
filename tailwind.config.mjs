
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'primary': 'hsl(11.28deg 74.52% 69.22%)',
				forest: {
					950: '#0B120D',
					900: '#12231A',
					800: '#1C3524',
				},
				parchment: {
					100: '#F6EEDD',
					200: '#EAD9B4',
				},
				ink: '#2B2118',
				gold: {
					400: '#E8C468',
					500: '#C9A227',
					600: '#9C7B1C',
				},
			},
			fontFamily: {
				display: ['"Playfair Display Variable"', 'serif'],
				'serif-story': ['"EB Garamond Variable"', 'serif'],
			},
		},
	},
	plugins: [],
}
