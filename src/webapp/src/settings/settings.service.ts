import { _ } from 'lodash'
import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'
import * as tldExtract from 'tld-extract'

import { createECKey } from 'ec-key'
import { ConfigService } from '@nestjs/config'
import { renderChatbotJs } from './chatbot'

import { BaseService } from '../utilities/base.service'
import { ValidationService } from '../validator/validation.service'

import { SettingsEntity, SettingsWebsiteJson, SettingsAdminJson, SettingsKeysJson, SettingsUserJson, SettingsModulesJson } from './settings.entity'

const __IS_DEV__ = (process.env.NODE_ENV === 'development') // eslint-disable-line

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;'
}
const unescapeMap = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#34;': '"',
  '&#39;': "'"
}

export function escape (str: string): string {
  return str.replace(/&|<|>|"|'/g, m => escapeMap[m])
}

function unescape (str: string): string {
  return str.replace(/&(amp|lt|gt|#34|#39);/g, m => unescapeMap[m])
}

// escapeOnce from liquidjs
export function escapeOnce (str: string): string {
  return escape(unescape(str))
}

export function htmlEncode (s: string): string {
  return s != null && s !== '' ? escapeOnce(s) : ''
}

export function mergeAll (entity: SettingsEntity, update): SettingsEntity {
  for (const key in update) {
    if (update[key] != null) {
      entity[key] = update[key]
    } else {
      delete entity[key] // eslint-disable-line
    }
  }
  entity.setJsonFromValues()
  return entity
}

@QueryService(SettingsEntity)
@Injectable({ scope: Scope.REQUEST })
export class SettingsService extends BaseService<SettingsEntity> {
  data: any = null

  constructor (
    // TODO req should be "private readonly" but tests won't work
    @Inject(REQUEST) public req,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService
  ) {
    super(req, 'SettingsEntity')

    // const _merge = this.repo.merge
    this.repo.merge = mergeAll
    this.req = req?.req != null ? req.req : req
  }

  async validateSettings (data: any): Promise<any> {
    // website
    if (data.website == null) {
      const entity = new SettingsEntity()
      entity.category = 'website'
      entity.json = new SettingsWebsiteJson()
      data.website = await this.createOne(entity)
    }

    // keys
    if (data.keys == null) {
      const entity = new SettingsEntity()
      entity.category = 'keys'
      entity.json = new SettingsKeysJson()
      data.keys = await this.createOne(entity)
    }
    if (data.keys.jwt_private_key == null) {
      // openssl ecparam -genkey -name secp256k1 -noout -out private.pem
      // openssl ec -in private.pem -pubout -out public.pem
      const key = createECKey('secp256k1')

      data.keys.jwt_private_key = key.toString('pem')
      data.keys.jwt_public_key = key.asPublicECKey().toString('pem')

      const { id, ...entity } = data.keys
      data.keys = await this.updateOne(id, entity)
    }

    if (data.user == null) {
      const entity = new SettingsEntity()
      entity.category = 'user'
      entity.json = new SettingsUserJson()
      data.user = await this.createOne(entity)
    }

    if (data.admin == null) {
      const entity = new SettingsEntity()
      entity.category = 'admin'
      entity.json = new SettingsAdminJson()
      data.admin = await this.createOne(entity)
    }
  }

  async getSettings (category: string): Promise<SettingsEntity> {
    // TODO cache
    if (this.data == null) {
      let records: SettingsEntity[] = []
      try {
        records = await this.query({})
      } catch (e) {
        // pass
        if (e.code != null && e.code === 'ER_NO_SUCH_TABLE') {
          // TODO: handle missing table, i.e. message "run migrations"
        }
        // console.log(e)
      }

      this.data = {}
      for (const r of records) {
        this.data[r.category] = r
      }
      try {
        await this.validateSettings(this.data)
      } catch (e) {
        // pass
      }
    }
    return this.data[category] ?? {}
  }

  async getUserSettings (): Promise<SettingsUserJson> {
    const result = this.getSettings('user')
    return result as unknown as SettingsUserJson
  }

  async getModulesSettings (): Promise<SettingsModulesJson> {
    const result = this.getSettings('modules')
    return result as unknown as SettingsModulesJson
  }

  async getWebsiteSettings (): Promise<SettingsWebsiteJson> {
    const result = this.getSettings('website')
    return result as unknown as SettingsWebsiteJson
  }

  async getKeysSettings (): Promise<SettingsKeysJson> {
    const result = this.getSettings('keys')
    return result as unknown as SettingsKeysJson
  }

  async getAzureAdStrategyConfig (): Promise<any | null> {
    const keys = await this.getKeysSettings()

    const tenantIdOrName = keys.oauth_azure_ad_tenant_id ?? this.configService.get('OAUTH_AZURE_AD_TENANT_ID') ?? ''
    const clientID = keys.oauth_azure_ad_client_id ?? this.configService.get('OAUTH_AZURE_AD_CLIENT_ID') ?? ''
    const clientSecret = keys.oauth_azure_ad_client_secret_value ?? this.configService.get('OAUTH_AZURE_AD_CLIENT_SECRET_VALUE') ?? ''
    const scope = keys.oauth_azure_ad_scope ?? this.configService.get('OAUTH_AZURE_AD_SCOPE') ?? ''

    const baseUrl: string = await this.getBaseUrl()

    return (clientID !== '' && !clientID.endsWith('xxx')) ? {
      // configurable
      tenantIdOrName,
      clientID,
      clientSecret,
      scope,
      redirectUrl: `${baseUrl}/auth/azure/callback`,
      allowHttpForRedirectUrl: (process.env.NODE_ENV === 'development'),
      // fixed
      identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
      responseType: 'code',
      responseMode: 'form_post',
      // TODO replace cookies with sessions
      useCookieInsteadOfSession: true,
      cookieEncryptionKeys: [
        { key: '12345678901234567890123456789013', iv: '123456789013' },
        { key: 'abcdefghijklmnopqrstuvwxyzabcdeg', iv: 'abcdefghijkm' }
      ]
    } : null
  }

  async getMiraclStrategyConfig (): Promise<any | null> {
    const keys = await this.getKeysSettings()

    const clientID = keys.oidc_miracl_client_id ?? this.configService.get('OIDC_MIRACL_CLIENT_ID') ?? ''
    const clientSecret = keys.oidc_miracl_client_secret ?? this.configService.get('OIDC_MIRACL_CLIENT_SECRET') ?? ''

    const baseUrl = await this.getBaseUrl()

    return (clientID !== '' && !clientID.endsWith('xxx')) ? {
      clientID,
      clientSecret,
      callbackURL: `${baseUrl}/auth/miracl/callback`
    } : null
  }

  async getGoogleStrategyConfig (): Promise<any | null> {
    const keys = await this.getKeysSettings()

    const clientID = keys.oauth_google_signin_client_id ?? this.configService.get('OAUTH_GOOGLE_SIGNIN_CLIENT_ID') ?? ''
    const clientSecret = keys.oauth_google_signin_client_secret ?? this.configService.get('OAUTH_GOOGLE_SIGNIN_CLIENT_SECRET') ?? ''

    const baseUrl = await this.getBaseUrl()

    return (clientID !== '' && !clientID.endsWith('xxx')) ? {
      clientID,
      clientSecret,
      redirectURI: baseUrl
    } : null
  }

  async getAdminSettings (): Promise<SettingsAdminJson> {
    const result = await this.getSettings('admin') as unknown as SettingsAdminJson

    if (this.validationService.isNilOrEmpty(result.trial_expiring_cron) === true) {
      result.trial_expiring_cron = this.configService.get<string>('TRIAL_EXPIRING_CRON') ?? '0 0 2 * * *'
    }
    if (this.validationService.isNilOrEmpty(result.trial_expiring_days) === true) {
      result.trial_expiring_days = this.configService.get<number>('TRIAL_EXPIRING_DAYS') ?? 3
    }

    return result
  }

  async getJWTPublicKey (): Promise<string> {
    const keys = await this.getKeysSettings()
    return keys.jwt_public_key
  }

  async getJWTPrivateKey (): Promise<string> {
    const keys = await this.getKeysSettings()
    return keys.jwt_private_key
  }

  async getHomepageRedirectUrl (): Promise<string | null> {
    const moduleHomepageConfig = this.configService.get<string>('MODULE_HOMEPAGE') ?? 'saasform'
    const moduleHomepage = (await this.getModulesSettings())?.homepage ?? moduleHomepageConfig
    if (moduleHomepage === 'redirect') {
      return await this.getConfiguredRedirectAfterLogin()
    }
    return null
  }

  async getUserPageSections (): Promise<string[]> {
    const moduleUserConfig = this.configService.get<string[]>('MODULE_USER') ?? ['general', 'security']
    const moduleUser = (await this.getModulesSettings())?.user ?? moduleUserConfig
    return moduleUser
  }

  async getBaseUrl (cachedSettings?): Promise<string> {
    const configuredBaseUrl = this.configService.get<string>('SAASFORM_BASE_URL') ?? ''
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    if (settings.domain_primary != null) {
      return `https://${settings.domain_primary as string}`
    } else if (configuredBaseUrl !== '') {
      return `${configuredBaseUrl}`
    }
    return '/'
  }

  async getTrialLength (cachedSettings?): Promise<number> {
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    return settings.pricing_free_trial ?? 7
  }

  async getTopLevelUrl (cachedSettings?): Promise<string> {
    const baseUrl = await this.getBaseUrl(cachedSettings)
    let domain
    try {
      domain = tldExtract(baseUrl)
    } catch (err) {
      // pass
    }
    const topLevel: string = domain?.domain
    return topLevel != null ? `https://${topLevel}` : '/'
  }

  // TODO: TDD this
  /*
    The redirect after login, aka app url as it comes from config.
  */
  async getConfiguredRedirectAfterLogin (cachedSettings?): Promise<string> {
    const configuredRedirectUrl = this.configService.get<string>('SAAS_REDIRECT_URL') ?? ''
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    if (settings.domain_app != null) {
      return `https://${settings.domain_app as string}`
    } else if (settings.domain_primary != null) {
      return `https://app.${settings.domain_primary as string}`
    } else if (settings.insecure_domain_app != null) {
      console.warn('USING INSECURE REDIRECT:', settings.insecure_domain_app)
      return `${settings.insecure_domain_app as string}`
    } else if (configuredRedirectUrl !== '') {
      return `${configuredRedirectUrl}`
    }

    return '/'
  }

  async getNextUrl (queryNext): Promise<string | null> {
    const baseUrl = await this.getBaseUrl()
    const appUrl = await this.getConfiguredRedirectAfterLogin()
    const homeUrl = await this.getHomepageRedirectUrl()

    // prevent open redirects
    const next: string = queryNext
    if (next != null) {
      if (
        // relative path
        next[0] === '/' ||
        // absolute url to Saasform
        next.startsWith(baseUrl) ||
        // absolute url to SaaS
        next.startsWith(appUrl)
      ) {
        // when home is not managed by saasform, make relative url absolute
        if (homeUrl !== null && next[0] === '/') {
          return `${homeUrl}${next}`
        }
        return next
      }
    }
    return null
  }

  /*
    The actual redirect after login, combining app url, req.query.next, sign flows etc.
  */
  async getActualRedirectAfterLogin (requestUser, queryNext, jwt: string|null = null): Promise<string> {
    switch (requestUser.status) {
      case 'no_payment_method':
        return '/payment'
      case 'unpaid':
        return '/user/billing'
    }

    const next = await this.getNextUrl(queryNext)
    if (next != null) {
      return next
    }

    let append = ''
    const settings = await this.getWebsiteSettings()
    if (settings.unsafe_redirect_with_jwt === 'query' && jwt != null) {
      append = `?token=${jwt}`
    }
    if (settings.unsafe_redirect_with_jwt === 'hash' && jwt != null) {
      append = `#token=${jwt}`
    }

    const redirect = await this.getConfiguredRedirectAfterLogin()
    return `${redirect}${append}`
  }

  async getAssetsRoot (): Promise<{themeRoot: string, assetsRoot: string}> {
    const themeRoot: string = this.req.themeRoot ?? this.configService.get('SAASFORM_THEME', 'default')
    const assetsRoot: string = `/${themeRoot}`
    return { themeRoot, assetsRoot }
  }

  async getWebsiteRenderingVariables (): Promise<any> {
    const { themeRoot, assetsRoot } = await this.getAssetsRoot()
    const settings = await this.getWebsiteSettings()

    const htmlAsset: (asset: string) => string = (asset: string) => (asset === '' || asset.startsWith('https://') ? asset : `${assetsRoot}/${asset}`)

    // TODO type
    const res = {
      name: '',
      title: '',
      description: '',
      domain_primary: '',
      domain_app: '',
      domain_home: '',
      email: '',

      // integrations
      app_google_analytics: '',
      app_google_tag_manager: '',
      app_facebook_pixel_id: '',
      app_google_signin_client_id: '',
      app_google_signin_scope: '',
      app_google_signin_access_type: 'offline',
      app_chatbot_provider: '',
      app_chatbot_id: '',
      app_chatbot_domain: '',

      // footer
      legal_company_name: '',
      made_with_love: '',
      socials: [
        {
          name: '',
          url: ''
        }
      ],

      // nav
      nav_links: {
        login_text: '',
        login_link: '',
        signup_text: '',
        signup_link: ''
      },

      // home
      hero_title: '',
      hero_subtitle: '',
      hero_cta: '',
      hero_image_url: '',
      hero_video_url: '',
      benefits: [
        {
          image_url: '',
          title: '',
          text: ''
        }
      ],
      logos: [
        {
          name: '',
          image_url: ''
        }
      ],
      features: [
        {
          title: '',
          text: '',
          image_url: ''
        }
      ],
      testimonials_title: '',
      testimonials_text: '',
      testimonials: [
        {
          name: '',
          image_url: '',
          quote: ''
        }
      ],
      pricing_title: '',
      pricing_text: '',
      pricing_free_trial: '',
      pricing_credit_card_required: '',
      pricing_plans: [
        {
          name: '',
          image_url: '',
          quote: ''
        }
      ],
      faq: [
        {
          title: '',
          text: ''
        }
      ],
      cta_badge: '',
      cta_title: '',
      cta_text: '',
      cta_button: '',

      // footer
      footer: [
        {
          title: '',
          links: [
            {
              name: '',
              url: ''
            }
          ]
        }
      ],

      // prelaunch page, if enabled
      prelaunch_enabled: '',
      prelaunch_cleartext_password: '',
      prelaunch_message: '',
      prelaunch_background_url: '',

      // autogenerated, can override
      seo_fb_app_id: '',
      seo_title: '',
      seo_description: '',
      seo_og_url: '',
      seo_og_title: '',
      seo_og_description: '',
      seo_og_image_url: '',
      seo_twitter_title: '',
      seo_twitter_description: '',
      seo_twitter_image_url: '',
      legal_website_url: '',
      legal_email: '',

      // auto added, can't override
      root_assets: '',
      root_theme: '',
      saas_redirect_url: '',

      html_google_signin_header: '',
      html_google_analytics: '',
      html_google_tag_manager_header: '',
      html_google_tag_manager_body: '',
      html_facebook_pixel: '',
      html_chatbot: '',

      subscription_optional: true,

      // signup fields
      signup_show_google: false,
      signup_show_azure: false,
      signup_show_miracl: false,
      signup_show_username: false,
      signup_force_payment: false,
      security_two_factor_auth: false,

      // page /user
      user_page_sections: [''],

      // dynamic layout
      layout_nav: '',
      logo: {
        name: '',
        url: ''
      },

      // unsafe config
      unsafe_disable_csp: false,
      unsafe_redirect_with_jwt: false
    }

    const encodedPaths = [
      'name',
      'title',
      'description',
      'domain_primary',
      'domain_app',
      'email',
      'logo_url',
      'app_google_analytics',
      'app_google_tag_manager',
      'app_facebook_pixel_id',
      'app_google_signin_client_id',
      'app_google_signin_scope',
      'app_chatbot_provider',
      'app_chatbot_id',
      'app_chatbot_domain',
      'legal_company_name',
      'nav_links',
      'hero_title',
      'hero_subtitle',
      'hero_cta',
      'hero_image_url',
      'hero_video_url',
      'testimonials_title',
      'testimonials_text',
      'pricing_title',
      'pricing_text',
      'pricing_free_trial',
      'pricing_credit_card_required',
      'cta_badge',
      'cta_title',
      'cta_text',
      'cta_button',
      'prelaunch_enabled',
      'prelaunch_cleartext_password',
      'prelaunch_message',
      'prelaunch_background_url',
      'signup_show_username',
      'signup_force_payment',
      'security_two_factor_auth',
      'unsafe_disable_csp',
      'unsafe_redirect_with_jwt'
    ]
    for (const key of encodedPaths) {
      const finalFunc = key.endsWith('url') ? htmlAsset : htmlEncode
      const value = _.get(settings, key) ?? this.configService.get(key) ?? ''
      const finalValue = (typeof value === 'string') ? finalFunc(value) : value
      _.set(res, key, finalValue)
    }

    const arrayPaths = [
      'benefits',
      'logos',
      'features',
      'testimonials',
      'pricing_plans',
      'faq',
      'socials',
      'footer'
    ]
    for (const key of arrayPaths) {
      const arrayFromSettings = _.get(settings, key) ?? []
      const arrayFromConfig = this.configService.get(key) ?? []
      const arrayValue = settings[key] !== undefined ? arrayFromSettings : arrayFromConfig
      const finalArrayValue = arrayValue.map(item => {
        const ret = {}
        for (const key in item) {
          const value = item[key]
          const finalFunc = key.endsWith('url') ? htmlAsset : htmlEncode
          const finalValue = (typeof value === 'string') ? finalFunc(value) : value
          ret[key] = finalValue
        }
        return ret
      })
      // TODO encode
      _.set(res, key, finalArrayValue)
    }

    // autogenerated, can override
    const homeUrl = await this.getHomepageRedirectUrl() ?? res.domain_primary
    const homeDomain = homeUrl.replace('http://', '').replace('https://', '')
    const renderedUrl = `https://${homeDomain}`
    const redirectAfterLogin = await this.getConfiguredRedirectAfterLogin(settings)

    res.domain_home = homeDomain
    res.seo_fb_app_id = ''
    res.seo_title = `${res.name} - ${res.title}`
    res.seo_description = res.description
    res.seo_og_url = renderedUrl
    res.seo_og_title = res.seo_title
    res.seo_og_description = res.seo_description
    res.seo_og_image_url = res.hero_image_url
    res.seo_twitter_title = res.seo_title
    res.seo_twitter_description = res.seo_description
    res.seo_twitter_image_url = res.hero_image_url
    res.legal_website_url = renderedUrl
    res.legal_email = res.email

    const overridePaths = [
      'seo_fb_app_id',
      'seo_title',
      'seo_description',
      'seo_og_url',
      'seo_og_title',
      'seo_og_description',
      'seo_og_image_url',
      'seo_twitter_title',
      'seo_twitter_description',
      'seo_twitter_image_url',
      'legal_website_url',
      'legal_email',
      'made_with_love'
    ]
    for (const key of overridePaths) {
      const value = _.get(settings, key) ?? this.configService.get(key, '')
      if (value !== '') {
        _.set(res, key, value)
      }
    }

    // auto added, can't override
    res.root_theme = themeRoot
    res.root_assets = assetsRoot
    res.saas_redirect_url = redirectAfterLogin
    res.user_page_sections = await this.getUserPageSections()

    // dynamic layout
    res.layout_nav = themeRoot + '/nav'
    res.logo = {
      url: await this.getHomepageRedirectUrl() ?? '/',
      name: res.name
    }

    // unsafe config
    if (res.unsafe_disable_csp) {
      this.req.unsafeDisableCsp = res.unsafe_disable_csp
    }

    // keys
    const keys = await this.getKeysSettings()
    res.app_google_signin_client_id = keys.oauth_google_signin_client_id ?? this.configService.get('OAUTH_GOOGLE_SIGNIN_CLIENT_ID') ?? ''
    res.app_google_signin_scope = keys.oauth_google_signin_scope ?? this.configService.get('OAUTH_GOOGLE_SIGNIN_SCOPE') ?? 'email profile'
    const azureAdConfig = await this.getAzureAdStrategyConfig()
    const miraclConfig = await this.getMiraclStrategyConfig()

    // html

    // Google Sign-In
    // https://developers.google.com/identity/sign-in/web/sign-in
    res.signup_show_google = !!((res.app_google_signin_client_id !== '' && !res.app_google_signin_client_id.endsWith('xxx')))
    res.signup_show_azure = !!(azureAdConfig != null)
    res.signup_show_miracl = !!(miraclConfig != null)
    res.html_google_signin_header = res.app_google_signin_client_id !== '' && !res.app_google_signin_client_id.endsWith('xxx')
      ? `
      <meta name="google-signin-client_id" content="${res.app_google_signin_client_id}">
      <meta name="google-signin-scope" content="${res.app_google_signin_scope}">
      <script src="https://apis.google.com/js/platform.js?onload=onGoogleStart" defer></script>
    `
      : ''

    res.html_google_tag_manager_header = res.app_google_tag_manager !== '' && !res.app_google_tag_manager.endsWith('xxx')
      ? `
      <!-- Google Tag Manager -->
      <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${res.app_google_tag_manager}');</script>
      <!-- End Google Tag Manager -->
    `
      : ''
    res.html_google_tag_manager_body = res.app_google_tag_manager !== '' && !res.app_google_tag_manager.endsWith('xxx')
      ? `
      <!-- Google Tag Manager (noscript) -->
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${res.app_google_tag_manager}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
      <!-- End Google Tag Manager (noscript) -->
    `
      : ''
    res.html_google_analytics = res.app_google_analytics !== '' && !res.app_google_analytics.endsWith('xxx')
      ? `
      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${res.app_google_analytics}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${res.app_google_analytics}');
      </script>
    `
      : ''
    res.html_facebook_pixel = res.app_facebook_pixel_id !== '' && !String(res.app_facebook_pixel_id).endsWith('xxx')
      ? `
      <!-- Facebook Pixel Code -->
      <script>
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${res.app_facebook_pixel_id}');
        fbq('track', 'PageView');
      </script>
      <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${res.app_facebook_pixel_id}&ev=PageView&noscript=1"
      /></noscript>
      <!-- End Facebook Pixel Code -->
    `
      : ''

    res.html_chatbot = renderChatbotJs(res.app_chatbot_provider, res.app_chatbot_id, res.app_chatbot_domain, this.req)

    return res
  }
}
