/**
 * Base layout for MJML emails.
 * Includes common head styles and responsive settings.
 *
 * Placeholder: {{content}}
 */
export const baseLayout = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, Helvetica, sans-serif" />
      <mj-text font-size="16px" color="#333333" line-height="1.5" />
      <mj-section padding="20px" />
    </mj-attributes>
    <mj-style>
      .link-white { color: #ffffff !important; text-decoration: none; }
      .footer-text { font-size: 12px; color: #999999; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding-bottom="0px">
      <mj-column>
        <mj-image width="150px" src="https://gravito.dev/logo.png" alt="Gravito" />
      </mj-column>
    </mj-section>
    
    {{content}}

    <mj-section>
      <mj-column>
        <mj-divider border-width="1px" border-color="#dddddd" />
        <mj-text align="center" css-class="footer-text">
          &copy; ${new Date().getFullYear()} Gravito Framework. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`

/**
 * A simple transactional component layout.
 */
export const transactionLayout = `
<mj-section background-color="#ffffff" padding-top="0px">
  <mj-column>
    {{content}}
  </mj-column>
</mj-section>
`
