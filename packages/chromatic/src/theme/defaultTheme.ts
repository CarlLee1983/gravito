import type { ThemeDefinition } from '../core/types'

// 預設光亮主題
export const lightTheme: ThemeDefinition = {
  name: 'light',
  colors: {
    background: '#ffffff',
    foreground: '#000000',
    primary: '#0066cc',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    border: '#dee2e6',
    muted: '#6c757d',
  },
  semantics: {
    success: {
      name: 'success',
      hex: '#28a745',
      rgb: { r: 40, g: 167, b: 69 },
      aliases: ['green', 'ok'],
      contrast: { lightBg: 8.2, darkBg: 2.1 },
    },
    warning: {
      name: 'warning',
      hex: '#ffc107',
      rgb: { r: 255, g: 193, b: 7 },
      aliases: ['yellow', 'caution'],
      contrast: { lightBg: 1.4, darkBg: 10.3 },
    },
    error: {
      name: 'error',
      hex: '#dc3545',
      rgb: { r: 220, g: 53, b: 69 },
      aliases: ['red', 'danger'],
      contrast: { lightBg: 6.8, darkBg: 3.1 },
    },
    info: {
      name: 'info',
      hex: '#17a2b8',
      rgb: { r: 23, g: 162, b: 184 },
      aliases: ['cyan', 'blue'],
      contrast: { lightBg: 4.8, darkBg: 4.8 },
    },
    primary: {
      name: 'primary',
      hex: '#0066cc',
      rgb: { r: 0, g: 102, b: 204 },
      aliases: ['brand', 'accent'],
      contrast: { lightBg: 8.0, darkBg: 2.5 },
    },
  },
}

// 預設深色主題
export const darkTheme: ThemeDefinition = {
  name: 'dark',
  colors: {
    background: '#1e1e1e',
    foreground: '#e0e0e0',
    primary: '#0099ff',
    secondary: '#a0a0a0',
    success: '#4caf50',
    warning: '#ffc107',
    error: '#f44336',
    info: '#00bcd4',
    border: '#333333',
    muted: '#757575',
  },
  semantics: {
    success: {
      name: 'success',
      hex: '#4caf50',
      rgb: { r: 76, g: 175, b: 80 },
      aliases: ['green', 'ok'],
      contrast: { lightBg: 2.1, darkBg: 8.2 },
    },
    warning: {
      name: 'warning',
      hex: '#ffc107',
      rgb: { r: 255, g: 193, b: 7 },
      aliases: ['yellow', 'caution'],
      contrast: { lightBg: 10.3, darkBg: 1.4 },
    },
    error: {
      name: 'error',
      hex: '#f44336',
      rgb: { r: 244, g: 67, b: 54 },
      aliases: ['red', 'danger'],
      contrast: { lightBg: 3.1, darkBg: 6.8 },
    },
    info: {
      name: 'info',
      hex: '#00bcd4',
      rgb: { r: 0, g: 188, b: 212 },
      aliases: ['cyan', 'blue'],
      contrast: { lightBg: 4.8, darkBg: 4.8 },
    },
    primary: {
      name: 'primary',
      hex: '#0099ff',
      rgb: { r: 0, g: 153, b: 255 },
      aliases: ['brand', 'accent'],
      contrast: { lightBg: 2.5, darkBg: 8.0 },
    },
  },
}

// Solarized 淺色主題
export const solarizedLight: ThemeDefinition = {
  name: 'solarized-light',
  colors: {
    background: '#fdf6e3',
    foreground: '#657b83',
    primary: '#268bd2',
    secondary: '#2aa198',
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
    info: '#2aa198',
    border: '#eee8d5',
    muted: '#93a1a1',
  },
  semantics: {
    success: {
      name: 'success',
      hex: '#859900',
      rgb: { r: 133, g: 153, b: 0 },
      aliases: ['green', 'ok'],
      contrast: { lightBg: 3.1, darkBg: 6.5 },
    },
    warning: {
      name: 'warning',
      hex: '#b58900',
      rgb: { r: 181, g: 137, b: 0 },
      aliases: ['yellow', 'caution'],
      contrast: { lightBg: 2.2, darkBg: 8.2 },
    },
    error: {
      name: 'error',
      hex: '#dc322f',
      rgb: { r: 220, g: 50, b: 47 },
      aliases: ['red', 'danger'],
      contrast: { lightBg: 5.6, darkBg: 3.9 },
    },
    info: {
      name: 'info',
      hex: '#2aa198',
      rgb: { r: 42, g: 161, b: 152 },
      aliases: ['cyan', 'blue'],
      contrast: { lightBg: 4.9, darkBg: 4.6 },
    },
    primary: {
      name: 'primary',
      hex: '#268bd2',
      rgb: { r: 38, g: 139, b: 210 },
      aliases: ['brand', 'accent'],
      contrast: { lightBg: 7.3, darkBg: 2.9 },
    },
  },
}

// Solarized 深色主題
export const solarizedDark: ThemeDefinition = {
  name: 'solarized-dark',
  colors: {
    background: '#002b36',
    foreground: '#839496',
    primary: '#268bd2',
    secondary: '#2aa198',
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
    info: '#2aa198',
    border: '#073642',
    muted: '#586e75',
  },
  semantics: {
    success: {
      name: 'success',
      hex: '#859900',
      rgb: { r: 133, g: 153, b: 0 },
      aliases: ['green', 'ok'],
      contrast: { lightBg: 6.5, darkBg: 3.1 },
    },
    warning: {
      name: 'warning',
      hex: '#b58900',
      rgb: { r: 181, g: 137, b: 0 },
      aliases: ['yellow', 'caution'],
      contrast: { lightBg: 8.2, darkBg: 2.2 },
    },
    error: {
      name: 'error',
      hex: '#dc322f',
      rgb: { r: 220, g: 50, b: 47 },
      aliases: ['red', 'danger'],
      contrast: { lightBg: 3.9, darkBg: 5.6 },
    },
    info: {
      name: 'info',
      hex: '#2aa198',
      rgb: { r: 42, g: 161, b: 152 },
      aliases: ['cyan', 'blue'],
      contrast: { lightBg: 4.6, darkBg: 4.9 },
    },
    primary: {
      name: 'primary',
      hex: '#268bd2',
      rgb: { r: 38, g: 139, b: 210 },
      aliases: ['brand', 'accent'],
      contrast: { lightBg: 2.9, darkBg: 7.3 },
    },
  },
}

// 預設主題清單
export const DEFAULT_THEMES = {
  light: lightTheme,
  dark: darkTheme,
  solarizedLight,
  solarizedDark,
} as const
