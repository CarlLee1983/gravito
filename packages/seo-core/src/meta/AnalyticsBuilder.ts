import type { AnalyticsConfig } from './interfaces'

export class AnalyticsBuilder {
  constructor(private config: AnalyticsConfig) {}

  build(): string {
    const parts: string[] = []

    if (this.config.gtag) {
      parts.push(`<!-- Google Analytics (Gravito SEO Engine) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${this.config.gtag}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${this.config.gtag}');
</script>`)
    }

    if (this.config.pixel) {
      parts.push(`<!-- Meta Pixel (Gravito SEO Engine) -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${this.config.pixel}');
  fbq('track', 'PageView');
</script>`)
    }

    if (this.config.baidu) {
      parts.push(`<!-- Baidu Tongji (Gravito SEO Engine) -->
<script>
  var _hmt = _hmt || [];
  (function() {
    var hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?${this.config.baidu}";
    var s = document.getElementsByTagName("script")[0]; 
    s.parentNode.insertBefore(hm, s);
  })();
</script>`)
    }

    return parts.join('\n')
  }
}
