import pc from 'picocolors'

export const LOGO_ASCII = `
   ____                 _ _        
  / ___|_ __ __ ___   _(_) |_ ___  
 | |  _| '__/ _\` \\ \\ / / | __/ _ \\ 
 | |_| | | | (_| |\\ V /| | || (_) |
  \\____|_|  \\__,_| \\_/ |_|\\__\\___/ 
                                   
  ${pc.cyan('SmartMap Engine™ v1.0.0')}
  ${pc.dim('Powered by Gravito Nebula Architecture')}
`

/**
 * Print the Luminosity CLI logo to the console.
 *
 * @public
 * @since 3.0.0
 */
export function showLogo() {
  console.log(LOGO_ASCII)
}
