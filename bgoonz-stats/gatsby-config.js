require('dotenv').config()

module.exports = {
  siteMetadata: {
    title: 'bgoonz Statistics',
    url: 'https://bgoonz-stats.netlify.app',
    repo: 'https://github.com/bgoonz/bgoonz-stats',
    github: 'https://www.github.com/bgoonz',
    twitter: 'https://www.twitter.com/bgoonz_de',
    homepage: 'https://www.bgoonz.de',
    image: '/social.png',
    author: '@bgoonz_de',
    description: `Dashboard of bgoonz' GitHub and Twitter statistics over time, visualized with fancy graphs.`,
  },
  flags: {
    DEV_SSR: false,
    FAST_DEV: true,
  },
  plugins: ['gatsby-plugin-lodash', 'gatsby-plugin-react-helmet'],
}
