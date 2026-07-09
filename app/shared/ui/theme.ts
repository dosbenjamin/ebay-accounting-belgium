import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: 'brand',
      bg: 'gray.50',
    },
    body: {
      bg: 'gray.50',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#eef2ff' },
          100: { value: '#e0e7ff' },
          200: { value: '#c7d2fe' },
          300: { value: '#a5b4fc' },
          400: { value: '#818cf8' },
          500: { value: '#6366f1' },
          600: { value: '#4f46e5' },
          700: { value: '#4338ca' },
          800: { value: '#3730a3' },
          900: { value: '#312e81' },
          950: { value: '#1e1b4b' },
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          contrast: {
            value: { _light: 'white', _dark: 'white' },
          },
          fg: {
            value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' },
          },
          subtle: {
            value: { _light: '{colors.brand.50}', _dark: '{colors.brand.950}' },
          },
          muted: {
            value: { _light: '{colors.brand.100}', _dark: '{colors.brand.900}' },
          },
          emphasized: {
            value: { _light: '{colors.brand.200}', _dark: '{colors.brand.800}' },
          },
          solid: {
            value: { _light: '{colors.brand.600}', _dark: '{colors.brand.500}' },
          },
          focusRing: {
            value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' },
          },
          border: {
            value: { _light: '{colors.brand.300}', _dark: '{colors.brand.700}' },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
