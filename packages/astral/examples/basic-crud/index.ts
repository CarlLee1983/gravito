import { OrbitAstral } from '../../src/index'
import { UserContract } from './contracts'

// This is an example of how you would configure OrbitAstral in your application
// Note: This file is for demonstration and might not run directly without the full Gravito Core environment

export const astralConfig = OrbitAstral.configure({
  title: 'Basic CRUD Example API',
  version: '1.0.0',
  description: 'A simple example demonstrating CRUD operations with Astral',
  contracts: [UserContract],
  uiPath: '/docs',
})

console.log('Astral Configuration Ready:', JSON.stringify(astralConfig, null, 2))
