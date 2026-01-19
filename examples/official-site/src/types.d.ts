import { ThreeElements } from '@react-three/fiber'

declare module 'react' {
  // biome-ignore lint/style/noNamespace: required for JSX augmentation
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare global {
  // biome-ignore lint/style/noNamespace: required for JSX augmentation
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
