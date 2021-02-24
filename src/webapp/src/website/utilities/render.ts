
/**
 * Render a generic liquid page
 * @param req The HTTP request
 * @param res The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
const renderPage = (req, res, page: string, data = {}): Response => {
  const siteData = req.websiteData

  const pageData = {
    ...siteData,
    ...data,
    csrf_token: req.csrfToken()
    // error: {
    //   email: 'Invalid email address',
    //   password: 'Invalid email or password',
    //   google: 'Error signing in with Google. Try again later',
    // }
  }
  return res.render(`${siteData.root_theme as string}/${page}`, pageData)
}

export { renderPage }
