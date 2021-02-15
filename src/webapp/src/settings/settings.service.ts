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
    if (settings.domain_app != null) {
      return `https://${settings.domain_app as string}`
    } else if (settings.domain_primary != null) {
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

    const htmlAsset: (string) => string = (asset: string) => (`${assetsRoot}/${asset}`)

    // TODO make better/with types
    const res = {
      name: '',
      title: '',
      description: '',
      prelaunchEnabled: '',
      prelaunchCleartextPassword: '',
      prelaunchMessage: '',
      prelaunchBackground: '',
      googleAnalytics: '',
      googleTagManager: '',
      facebookPixelId: '',
      legalName: '',
      domainPrimary: '',
      email: '',
      socialGithub: '',
      socialTwitter: '',
      socialLinkedin: '',

      // computed
      themeRoot: '',
      assetsRoot: '',
      appDomain: '',
      userEmail: '',
      nameAndTitle: '',

      googleAnalyticsCode: '',
      googleTagManagerHeader: '',
      googleTagManagerBody: '',
      facebookPixelCode: '',

      // home
      home: {
        heroImage: '',
        heroSubtitle: '',
        heroCta: '',
        benefits: [
          {
            icon: '',
            title: '',
            text: ''
          }
        ],
        logos: [
          {
            name: '',
            image: ''
          }
        ],
        product: [
          {
            title: '',
            text: '',
            image: ''
          }
        ],
        testimonials: {
          title: '',
          text: '',
          quotes: [
            {
              name: '',
              photo: '',
              quote: ''
            }
          ]
        },
        pricing: {
          title: '',
          text: '',
          plans: [
          ]
        },
        faq: [
          {
            question: '',
            answer: ''
          }
        ],
        cta: {
          badge: '',
          title: '',
          text: '',
          button: ''
        }
      }
    }

    const paths = [
      'name',
      'title',
      'description',
      'prelaunch_enabled',
      'prelaunch_cleartext_password',
      'prelaunch_message',
      'prelaunch_background',
      'google_analytics',
      'google_tag_manager',
      'facebook_pixel_id',
      'legal_name',
      'domain_primary',
      'email',
      'social_github',
      'social_twitter',
      'social_linkedin',
      // home
      'home.hero_image',
      'home.hero_subtitle',
      'home.hero_cta',
      'home.testimonials.title',
      'home.testimonials.text',
      'home.pricing.title',
      'home.pricing.text',
      'home.cta.badge',
      'home.cta.title',
      'home.cta.text',
      'home.cta.button'
    ]
    for (const key of paths) {
      const camelKey = key.split('.').map(_.camelCase).join('.')
      const finalFunc = (key.endsWith('icon') || key.endsWith('image') || key.endsWith('photo')) ? htmlAsset : htmlEncode

      const value = _.get(settings, key) ?? this.configService.get(key, '')

      _.set(res, camelKey, finalFunc(value))
    }

    const arrayPaths = [
      'home.benefits',
      'home.logos',
      'home.testimonials.quotes',
      'home.pricing.plans',
      'home.faq'
    ]
    for (const key of arrayPaths) {
      const camelKey = key.split('.').map(_.camelCase).join('.')
      const arrayFromSettings = _.get(settings, key) ?? []
      const arrayFromConfig = this.configService.get(key, [])
      const arrayValue = arrayFromSettings.length > 0 ? arrayFromSettings : arrayFromConfig
      _.set(res, camelKey, arrayValue)
    }

    res.themeRoot = themeRoot
    res.assetsRoot = assetsRoot
    res.appDomain = await this.getRedirectAfterLogin(settings)
    res.userEmail = this.req?.user?.email ?? ''
    res.nameAndTitle = `${res.name} - ${res.title}`

    res.googleTagManagerHeader = res.googleTagManager !== ''
      ? `
      <!-- Google Tag Manager -->
      <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${res.googleTagManager}');</script>
      <!-- End Google Tag Manager -->
    `
      : ''
    res.googleTagManagerBody = res.googleTagManager !== ''
      ? `
      <!-- Google Tag Manager (noscript) -->
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${res.googleTagManager}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
      <!-- End Google Tag Manager (noscript) -->
    `
      : ''
    res.googleAnalyticsCode = res.googleAnalytics !== ''
      ? `
      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${res.googleAnalytics}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${res.googleAnalytics}');
      </script>
    `
      : ''
    res.facebookPixelCode = res.facebookPixelId !== ''
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
        fbq('init', '${res.facebookPixelId}');
        fbq('track', 'PageView');
      </script>
      <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${res.facebookPixelId}&ev=PageView&noscript=1"
      /></noscript>
      <!-- End Facebook Pixel Code -->
    `
      : ''

    return res
  }
}
