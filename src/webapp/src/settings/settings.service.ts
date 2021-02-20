import { _ } from 'lodash'
import { REQUEST } from '@nestjs/core'
import { Injectable, Scope, Inject } from '@nestjs/common'
import { QueryService } from '@nestjs-query/core'

import { SettingsEntity, SettingsWebsiteJson, SettingsKeysJson } from './settings.entity'

import { createECKey } from 'ec-key'
import { BaseService } from '../utilities/base.service'
import { ConfigService } from '@nestjs/config'

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
// TODO req should be "private readonly" but tests won't work
export class SettingsService extends BaseService<SettingsEntity> {
  constructor (
    @Inject(REQUEST) public req: any,
    // @InjectRepository(SettingsEntity)
    public configService: ConfigService
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
  }

  async getSettings (category: string): Promise<SettingsEntity> {
    // TODO cache
    const records = await this.query({})

    const data = {}
    for (const r of records) {
      data[r.category] = r
    }
    await this.validateSettings(data)
    return data[category]
  }

  async getWebsiteSettings (): Promise<SettingsWebsiteJson> {
    const result = this.getSettings('website')
    return result as unknown as SettingsWebsiteJson
  }

  async getKeysSettings (): Promise<SettingsKeysJson> {
    const result = this.getSettings('keys')
    return result as unknown as SettingsKeysJson
  }

  async getJWTPublicKey (): Promise<string> {
    const keys = await this.getKeysSettings()
    return keys.jwt_public_key
  }

  async getJWTPrivateKey (): Promise<string> {
    const keys = await this.getKeysSettings()
    return keys.jwt_private_key
  }

  // TODO: TDD this
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

  // TODO: TDD this
  async getRedirectAfterLogin (cachedSettings?): Promise<string> {
    const configuredRedirectUrl = this.configService.get<string>('SAAS_REDIRECT_URL') ?? ''
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    if (settings.domain_app != null) {
      return `https://${settings.domain_app as string}`
    } else if (settings.domain_primary != null) {
      return `https://app.${settings.domain_primary as string}`
    } else if (configuredRedirectUrl !== '') {
      return `${configuredRedirectUrl}`
    }

    return '/'
  }

  async getAssetsRoot (): Promise<{themeRoot: string, assetsRoot: string}> {
    const themeRoot: string = this.configService.get('SAASFORM_THEME', 'default')
    const assetsRoot: string = `/${themeRoot}`
    return { themeRoot, assetsRoot }
  }

  async getWebsiteRenderingVariables (): Promise<any> {
    const { themeRoot, assetsRoot } = await this.getAssetsRoot()
    const settings = await this.getWebsiteSettings()

    const htmlAsset: (asset: string) => string = (asset: string) => (asset.startsWith('https://') ? asset : `${assetsRoot}/${asset}`)

    // TODO type
    const res = {
      name: '',
      title: '',
      description: '',
      domain_primary: '',
      email: '',
      logo_url: '',

      // integrations
      app_google_analytics: '',
      app_google_tag_manager: '',
      app_facebook_pixel_id: '',

      // footer
      legal_company_name: '',
      social_github: '',
      social_twitter: '',
      social_linkedin: '',

      // home
      hero_title: '',
      hero_subtitle: '',
      hero_cta: '',
      hero_image_url: '',
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
      user_email: '',
      user_email_verified: '',

      html_google_analytics: '',
      html_google_tag_manager_header: '',
      html_google_tag_manager_body: '',
      html_facebook_pixel: ''
    }

    const encodedPaths = [
      'name',
      'title',
      'description',
      'domain_primary',
      'email',
      'logo_url',
      'app_google_analytics',
      'app_google_tag_manager',
      'app_facebook_pixel_id',
      'legal_company_name',
      'social_github_url',
      'social_twitter_url',
      'social_linkedin_url',
      'hero_title',
      'hero_subtitle',
      'hero_cta',
      'hero_image_url',
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
      'prelaunch_background_url'
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
      'faq'
    ]
    for (const key of arrayPaths) {
      const arrayFromSettings = _.get(settings, key) ?? []
      const arrayFromConfig = this.configService.get(key, [])
      const arrayValue = arrayFromSettings.length > 0 ? arrayFromSettings : arrayFromConfig
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
      _.set(res, key, finalArrayValue)
      // TODO encode
    }

    // autogenerated, can override
    const renderedUrl = `https://${res.domain_primary}`
    const redirectAfterLogin = await this.getRedirectAfterLogin(settings)

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
      'legal_email'
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
    res.user_email = this.req?.user?.email ?? ''
    res.user_email_verified = this.req?.user?.user_email_verified ?? false

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
    res.html_facebook_pixel = res.app_facebook_pixel_id !== '' && !res.app_facebook_pixel_id.endsWith('xxx')
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

    return res
  }
}
