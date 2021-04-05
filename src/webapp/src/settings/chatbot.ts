
/**
 * Render a chatbot js
 * @param provider The HTTP request
 * @param id The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
export const renderChatbotJs = (provider: string, id: string): string => {
  if (id.endsWith('xxx')) {
    return ''
  }
  switch (provider) {
    case 'hubspot':
      return `<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/${id}.js"></script>`
  }
  return ''
}
