
/**
 * Render a chatbot js
 * @param provider The HTTP request
 * @param id The HTTP response
 * @param page A string representing the name of the template to display
 * @param data An optional object containing the page-specific data to pass to the template
 */
export const renderChatbotJs = (provider: string, id: string, domain: string, req): string => {
  if (String(id).endsWith('xxx')) {
    return ''
  }
  switch (provider) {
    case 'chaskiq':
      req.customCsp.push({
        scriptSrc: [
          `https://${domain}`
        ],
        connectSrc: [
          `https://${domain}`,
          `wss://${domain}`
        ],
        imgSrc: [
          `https://${domain}`,
          'https://hermessapp.s3.amazonaws.com',
          'https://unpkg.com'
        ],
        mediaSrc: [
          `https://${domain}`
        ]
      })
      return `<script>
        (function(d,t) {
          var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
          g.src="https://${domain}/embed.js"
          s.parentNode.insertBefore(g,s);
          g.onload=function(){
            new window.ChaskiqMessengerEncrypted({
              domain: "https://${domain}",
              ws: "wss://${domain}/cable",
              app_id: "${id}",
              data: {}
            })
          }
        })(document,"script");
      </script>`
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
    case 'intercom':
      // 2021-04-05 https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy
      req.customCsp.push({
        scriptSrc: [
          // "'strict-dynamic'",
          'https://app.intercom.io',
          'https://widget.intercom.io',
          'https://js.intercomcdn.com'
        ],
        connectSrc: [
          'https://api.intercom.io',
          'https://api-iam.intercom.io',
          'https://api-ping.intercom.io',
          'https://nexus-websocket-a.intercom.io',
          'https://nexus-websocket-b.intercom.io',
          'wss://nexus-websocket-a.intercom.io',
          'wss://nexus-websocket-b.intercom.io',
          'https://uploads.intercomcdn.com',
          'https://uploads.intercomusercontent.com'
        ],
        fontSrc: [
          'https://js.intercomcdn.com'
        ],
        imgSrc: [
          'https://js.intercomcdn.com',
          'https://static.intercomassets.com',
          'https://downloads.intercomcdn.com',
          'https://uploads.intercomusercontent.com',
          'https://gifs.intercomcdn.com',
          'https://video-messages.intercomcdn.com',
          'https://messenger-apps.intercom.io',
          'https://*.intercom-attachments-5.com',
          'https://*.intercom-attachments-6.com',
          'https://*.intercom-attachments-9.com'
        ],
        mediaSrc: [
          'https://js.intercomcdn.com'
        ]
      })
      return `<script>window.intercomSettings={app_id:"${id}"};(function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${id}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();</script>`
  }
  return ''
}
