
/**
 * Render a chatbot js
 * @param provider The HTTP request
 * @param id The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
export const renderChatbotJs = (provider: string, id: string, req): string => {
  if (String(id).endsWith('xxx')) {
    return ''
  }
  switch (provider) {
    case 'hubspot':
      req.customCsp.push({
        scriptSrc: [
          'https://js.hs-scripts.com',
          'https://js.hs-analytics.net',
          'https://js.hscollectedforms.net',
          'https://js.usemessages.com',
          'https://js.hs-banner.com'
        ],
        connectSrc: [
          'https://api.hubspot.com',
          'https://forms.hubspot.com'
        ],
        frameSrc: [
          'https://app.hubspot.com'
        ],
        imgSrc: [
          'https://track.hubspot.com',
          'https://forms.hubspot.com'
        ]
      })
      return `<script type="text/javascript" id="hs-script-loader" async defer src="https://js.hs-scripts.com/${id}.js"></script>`
  }
  return ''
}
