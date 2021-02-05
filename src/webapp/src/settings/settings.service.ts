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

export function htmlAsset (assetsRoot: string, asset: string): string {
  return `${assetsRoot}/${asset}`
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

  async getBaseDomain (cachedSettings?): Promise<string> {
    const proto = (__IS_DEV__) ? 'http' : 'https'
    const port = (__IS_DEV__) ? ':8080' : ''
    const configuredHost = this.configService.get<string>('SAAS_HOST') ?? ''
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    if (settings.domain_app != null) {
      return `${proto}://${settings.domain_app as string}${port}`
    } else if (settings.domain_primary != null) {
      return `${proto}://${settings.domain_primary as string}${port}`
    } else if (configuredHost !== '') {
      return `${proto}://${configuredHost}${port}`
    }
    return '/'
  }

  async getRedirectAfterLogin (cachedSettings?): Promise<string> {
    const proto = (__IS_DEV__) ? 'http' : 'https'
    const port = (__IS_DEV__) ? ':8080' : ''
    const configuredHost = this.configService.get<string>('SAAS_HOST') ?? ''
    const settings = cachedSettings ?? await this.getWebsiteSettings()
    if (settings.domain_app != null) {
      return `${proto}://${settings.domain_app as string}${port}`
    } else if (settings.domain_primary != null) {
      return `${proto}://app.${settings.domain_primary as string}${port}`
    } else if (configuredHost !== '') {
      return `${proto}://app.${configuredHost}${port}`
    }
    return '/'
  }

  async getAssetsRoot (): Promise<any> {
    const themeRoot = this.req.tenantId ?? 'default'
    const assetsRoot = `/${themeRoot as string}`
    return { themeRoot, assetsRoot }
  }

  async getWebsiteRenderingVariables (): Promise<any> {
    const { themeRoot, assetsRoot } = await this.getAssetsRoot()
    const settings = await this.getWebsiteSettings()

    const name = htmlEncode(settings.name)
    const title = htmlEncode(settings.title)
    const nameAndTitle = `${name} - ${title}`
    const description = htmlEncode(settings.description)
    const prelaunchEnabled = !!settings.prelaunch_enabled
    const prelaunchHidePoweredby = !!settings.prelaunch_hide_poweredby || (this.req.headers != null && this.req.headers['x-tenant-name'] === 'saasform')
    const prelaunchCleartextPassword = htmlEncode(settings.prelaunch_cleartext_password)
    const prelaunchMessage = htmlEncode(settings.prelaunch_message)
    const prelaunchBackground = htmlEncode(settings.prelaunch_background)
    const googleAnalytics = htmlEncode(settings.google_analytics)
    const googleTagManager = htmlEncode(settings.google_tag_manager)
    const facebookPixelId = htmlEncode(settings.facebook_pixel_id)
    const legalName = htmlEncode(settings.legal_name)
    const domainPrimary = htmlEncode(settings.domain_primary)
    const email = htmlEncode(settings.email)

    const googleTagManagerHeader = googleTagManager != null
      ? `
      <!-- Google Tag Manager -->
      <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${googleTagManager}');</script>
      <!-- End Google Tag Manager -->
    `
      : null
    const googleTagManagerBody = googleTagManager != null
      ? `
      <!-- Google Tag Manager (noscript) -->
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${googleTagManager}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
      <!-- End Google Tag Manager (noscript) -->
    `
      : null
    const googleAnalyticsCode = googleAnalytics != null
      ? `
      <!-- Global site tag (gtag.js) - Google Analytics -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalytics}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${googleAnalytics}');
      </script>
    `
      : null

    const facebookPixelCode = facebookPixelId != null
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
        fbq('init', '${facebookPixelId}');
        fbq('track', 'PageView');
      </script>
      <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1"
      /></noscript>
      <!-- End Facebook Pixel Code -->
    `
      : null

    const appDomain = this.getRedirectAfterLogin(settings)

    const userEmail = this.req.user != null ? this.req.user.email : ''

    let home
    home = {
      hero_image: htmlAsset(assetsRoot, 'assets/img/illustrations/illustration-6.png'),
      hero_subtitle: 'Share your articles over and over, but keep them click-worthy with fresh images',
      hero_cta: 'Get started now',
      benefits: [
        {
          icon: htmlAsset(assetsRoot, 'assets/img/icons/duotone-icons/General/Star.svg'),
          title: 'Drive more pageviews',
          text: 'MultiPreview supports your marketing goals. Share articles continuously to amplify reach, but swap out images to appeal and entice'
        },
        {
          icon: htmlAsset(assetsRoot, 'assets/img/icons/duotone-icons/Weather/Rainbow.svg'),
          title: 'Keep your feed original',
          text: 'MultiPreview helps you plan a diversified feed. Repurpose an article by highlighting different quotes or callouts, or choose a new preview'
        },
        {
          icon: htmlAsset(assetsRoot, 'assets/img/icons/duotone-icons/General/Heart.svg'),
          title: 'Make it matter',
          text: 'MultiPreview adds a new dimension to content sharing. What would you do if you could replace images every time you share an article?'
        }
      ],
      logos: [
        {
          name: 'Twitter',
          image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/twitter.svg')
        },
        {
          name: 'Facebook',
          image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/facebook.svg')
        },
        {
          name: 'Pinterest',
          image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/pinterest.svg')
        },
        {
          name: 'LinkedIn',
          image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/linkedin.svg')
        }
      ],
      product: [
        {
          title: 'Load the article you want to share',
          text: 'Add the link of an article you want to share. MultiPreview is platform agnostic and works with any article, blog post or web page. Medium, Wordpress, Ghost, Substack... you name it. All you need to start is the link of your article',
          image: htmlAsset(assetsRoot, 'assets/img/illustrations/illustration-4.png')
        },
        {
          title: 'Add multiple images and create magic links',
          text: 'Now add a collection of images that will make your article pop. MultiPreview creates a magic link for every image you add. Drag and drop or copy and paste the link to any visuals you\'d like - quotes, photos, and more. It\'s ultra fast!',
          image: htmlAsset(assetsRoot, 'assets/img/illustrations/illustration-9.png'),
          position: 'left'
        },
        {
          title: 'Et voilà! Just share your magic links',
          text: 'Post your magic links on Twitter, Facebook, Linkedin... Magic links expand in your feed with the image you chose. Even if you share the same article over and over to get more pageviews, the image will always be different. Your feed will look original and won\'t bore your readers',
          image: htmlAsset(assetsRoot, 'assets/img/illustrations/illustration-3.png')
        }
      ],
      testimonials: {
        title: 'Our customers are our biggest fans',
        text: 'We don\'t like to brag, but we don\t mind letting our customers do it for us. Here are a few nice things people are saying',
        quotes: [
          {
            name: 'Megan Groves',
            photo: 'https://pbs.twimg.com/profile_images/1041757865617252352/dAljhozX_400x400.jpg',
            quote: 'We recommend our clients write evergreen content and then repost it multiple times to drive better traffic. Finally we have a tool that lets us do this while keeping social feeds looking FRESH and ORIGINAL!'
          },
          {
            name: 'Nicolò Ungari',
            photo: 'https://pbs.twimg.com/profile_images/506581638348697600/uroKAbOb_400x400.jpeg',
            quote: 'When I see a Twitter feed with the same image over and over again, I laugh :) Then I think back to my own feed before MultiPreview. It was pretty rough. I can\'t recommend this enough!'
          }
        ]
      },
      pricing: {
        title: 'Fair, simple pricing',
        text: null,
        plans: []
      },
      faq: [
        {
          question: 'Can I use MultiPreview for my clients?',
          answer: 'Absolutely, share as many articles across as many accounts as you\'d like.'
        },
        {
          question: 'Can I add team members?',
          answer: 'Not yet, but we\'re adding support soon.'
        },
        {
          question: 'Is there a money back guarantee?',
          answer: 'Yes, if you\'re not totally satisfied with MultiPreview, let us know and we\'ll send over a refund.'
        },
        {
          question: 'Is there a free trial?',
          answer: 'Yes, all plans include a free trial.'
        }
      ],
      cta: {
        badge: 'Get started',
        title: 'Get MultiPreview now!',
        text: 'Share your articles over and over, but keep them click-worthy with fresh images',
        button: 'Get started for free'
      }
    }

    if (this.req.headers != null && this.req.headers['x-tenant-name'] === 'vyrill') {
      home = {
        colorPrimary: 'red',
        hero_image: 'https://vyrill.com/wp-content/themes/vyrill2018/img/influence_verified.jpg',
        hero_subtitle: 'Discover and connect with real video influencers',
        hero_cta: 'Search for free',
        benefits: [
          {
            icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a1.png',
            title: 'Authentic influencers',
            text: 'Search over 500K videos from over 150K+ influencers - and growing. 100% bot free'
          },
          {
            icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a3.png',
            title: 'Keep your feed original',
            text: 'Vyrill\'s proprietary AI technology helps you assess brand safety & tone with just a few clicks'
          },
          {
            icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a4.png',
            title: 'Control costs and time',
            text: 'Gone are the hours of weeding through videos. With just a few clicks you\'re done'
          }
        ],
        logos: [],
        //   {
        //     name: 'Instagram',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/instagram.svg'),
        //   },
        //   {
        //     name: 'Facebook',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/facebook.svg'),
        //   },
        //   {
        //     name: 'Pinterest',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/pinterest.svg'),
        //   },
        //   {
        //     name: 'LinkedIn',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/linkedin.svg'),
        //   },
        // ],
        product: [
          {
            title: 'Search for influencers by topic, category, brand & competition',
            text: 'You can search by topics such as reviews, unboxing, tutorials, and more. Easy and frustration free search capabilities saves you time. Then you can download all of the data in a .cvs file with just a click. It\'s that simple',
            image: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/video_index_page.jpg'
          },
          {
            title: 'The industry\'s only solution to provide demographics of both the influencer & people in the video',
            text: 'Ensure your marketing efforts represent your entire target audience and deliver influencer selections in complete confidence that they meet your brand\'s expectations. Get easy to read summary of overall diversity, disparity, sentiment and brand safety with our unique data analysis',
            image: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/diversity.jpg',
            position: 'left'
          }
        ],
        testimonials: {},
        //   title: 'Our customers are our biggest fans',
        //   text: 'We don\'t like to brag, but we don\t mind letting our customers do it for us. Here are a few nice things people are saying',
        //   quotes: [
        //     {
        //       name: 'Megan Groves',
        //       photo: 'https://pbs.twimg.com/profile_images/1041757865617252352/dAljhozX_400x400.jpg',
        //       quote: 'We recommend our clients write evergreen content and then repost it multiple times to drive better traffic. Finally we have a tool that lets us do this while keeping social feeds looking FRESH and ORIGINAL!',
        //     },
        //     {
        //       name: 'Nicolò Ungari',
        //       photo: 'https://pbs.twimg.com/profile_images/506581638348697600/uroKAbOb_400x400.jpeg',
        //       quote: 'When I see a Twitter feed with the same image over and over again, I laugh :) Then I think back to my own feed before MultiPreview. It was pretty rough. I can\'t recommend this enough!',
        //     },
        //   ],
        // },
        pricing: {
          title: 'Simple, straight-forward pricing',
          text: '',
          plans: []
        },
        faq: [
          {
            question: 'Can I search by topic, other than keyword?',
            answer: 'Absolutely, you can search by topics such as reviews, unboxing, tutorials...'
          },
          {
            question: 'What else can I filter by?',
            answer: 'Demographics & diversity, brand safety, sentiment and much more!'
          },
          {
            question: 'Is there a money back guarantee?',
            answer: 'Yes, if you\'re not totally satisfied with Vyrill, let us know and we\'ll send over a refund'
          },
          {
            question: 'Is there a free trial?',
            answer: 'Yes, all plans include a free trial'
          }
        ],
        cta: {
          badge: 'Get started',
          title: 'Get Vyrill now!',
          text: 'Discover and connect with real video influencers',
          button: 'Search for free'
        }
      }
    };

    if (this.req.headers != null && this.req.headers['x-tenant-name'] === 'distro') {
      home = {
        hero_image: 'https://distro.to/static/images/home-hero.jpg',
        hero_subtitle: 'Create email distribution lists for your communications and keep them all organized and accessible.\n\nDon\'t replace your email, make it better',
        hero_cta: 'Get started in 30 seconds',
        benefits: [
          {
            // icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a1.png',
            title: 'Discussions, finally organized',
            text: 'Create separate groups for your teams and projects to collaborate and share updates.\n\nInvite your teammates and collaborators whether they use Distro and start enjoying neatly organized discussions'
          },
          {
            // icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a3.png',
            title: 'Organization transparency',
            text: 'Discover public groups and conversations within your organization.\n\nNo more hoping to be added to the right email thread; Distro enables to join the conversations and find the information you need'
          },
          {
            // icon: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/vip_icon_a4.png',
            title: 'Meet your teams where they are',
            text: 'Emails aren\'t evil, they are just out of control.\n\nDistro doesn\'t force you to replace emails and instead makes it better. Thanks to email, you can use Distro even with those in your organization who don\'t have a Distro account.'
          }
        ],
        logos: [],
        //   {
        //     name: 'Instagram',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/instagram.svg'),
        //   },
        //   {
        //     name: 'Facebook',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/facebook.svg'),
        //   },
        //   {
        //     name: 'Pinterest',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/pinterest.svg'),
        //   },
        //   {
        //     name: 'LinkedIn',
        //     image: htmlAsset(assetsRoot, 'assets/img/brands/logotype/linkedin.svg'),
        //   },
        // ],
        product: [
          // {
          //   title: 'Search for influencers by topic, category, brand & competition',
          //   text: 'You can search by topics such as reviews, unboxing, tutorials, and more. Easy and frustration free search capabilities saves you time. Then you can download all of the data in a .cvs file with just a click. It\'s that simple',
          //   image: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/video_index_page.jpg',
          // },
          // {
          //   title: 'The industry\'s only solution to provide demographics of both the influencer & people in the video',
          //   text: 'Ensure your marketing efforts represent your entire target audience and deliver influencer selections in complete confidence that they meet your brand\'s expectations. Get easy to read summary of overall diversity, disparity, sentiment and brand safety with our unique data analysis',
          //   image: 'https://secureservercdn.net/198.71.233.64/990.0e0.myftpupload.com/wp-content/themes/vyrill2018/img/diversity.jpg',
          //   position: 'left',
          // },
        ],
        testimonials: {},
        //   title: 'Our customers are our biggest fans',
        //   text: 'We don\'t like to brag, but we don\t mind letting our customers do it for us. Here are a few nice things people are saying',
        //   quotes: [
        //     {
        //       name: 'Megan Groves',
        //       photo: 'https://pbs.twimg.com/profile_images/1041757865617252352/dAljhozX_400x400.jpg',
        //       quote: 'We recommend our clients write evergreen content and then repost it multiple times to drive better traffic. Finally we have a tool that lets us do this while keeping social feeds looking FRESH and ORIGINAL!',
        //     },
        //     {
        //       name: 'Nicolò Ungari',
        //       photo: 'https://pbs.twimg.com/profile_images/506581638348697600/uroKAbOb_400x400.jpeg',
        //       quote: 'When I see a Twitter feed with the same image over and over again, I laugh :) Then I think back to my own feed before MultiPreview. It was pretty rough. I can\'t recommend this enough!',
        //     },
        //   ],
        // },
        pricing: {
          title: 'Simple, straight-forward pricing',
          text: '',
          plans: []
        },
        faq: [
          {
            question: 'Can I create different Distros with different teams?',
            answer: 'Yes, exactly like with emails.'
          },
          {
            question: 'Can I add new people to existing Distros?',
            answer: 'Absolutely, it\'s as easy adding new people to an email thread.'
          },
          {
            question: 'Can I reply via Gmail and on my mobile?',
            answer: 'Yes, exactly like with emails. :)'
          },
          {
            question: 'Is there a money back guarantee?',
            answer: 'Yes, if you\'re not totally satisfied, let us know and we\'ll send over a refund'
          }
        ],
        cta: {
          badge: 'Get started',
          title: 'Join Distro now!',
          text: 'Don\'t replace your email, make it better',
          button: 'Join Distro for free'
        }
      }
    }

    return {
      themeRoot,
      assetsRoot,
      name,
      title,
      nameAndTitle,
      description,
      prelaunchEnabled,
      prelaunchHidePoweredby,
      prelaunchCleartextPassword,
      prelaunchMessage,
      prelaunchBackground,
      googleAnalyticsCode,
      googleTagManagerHeader,
      googleTagManagerBody,
      facebookPixelCode,
      userEmail,
      appDomain,
      legalName,
      domainPrimary,
      email,

      home
    }
  }
}
