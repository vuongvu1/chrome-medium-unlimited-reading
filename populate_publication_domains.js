const cheerio = require('cheerio');
const request = require('request-promise');
const url = require('url');
const _ = require('lodash');
const fs = require('fs');

const fetchPublicationListPage = async pageNumber => request({
  uri: `https://toppub.xyz?page=${pageNumber}`,
  headers: {
    'x-requested-with': 'XMLHttpRequest'
  },
  transform: body => JSON.parse(body)
});

const parsePublicationPageList = list => {
  const $ = cheerio.load(`<table>${list}<\/table>`);
  const publicationDomains = [];

  $('tr').each((key, listItem) => {
    const publicationDomain = url.parse($(listItem).find('td:nth-child(3) a').attr('href')).hostname;

    publicationDomains.push(publicationDomain);
  })

  return publicationDomains;
};

const fetchPublicationDomains = async () => {
  let currentPage = 0;
  let maxPages = 1;
  let publicationDomains = [];

  while (currentPage++ <= maxPages) {
    console.log(`Page ${currentPage}...`)
    const responseJson = await fetchPublicationListPage(currentPage);

    if(responseJson.list) {
      if(responseJson.next_page) maxPages++;

      publicationDomains = _.union(publicationDomains, parsePublicationPageList(responseJson.list))
    }
  }

  publicationDomains.push('medium.com');

  return _.uniq(publicationDomains);
}

const updateManifestDomainMatches = domains => {
  let manifest = JSON.parse(fs.readFileSync('src/manifest.json'));
  manifest.content_scripts[0].matches = [];

  domains.forEach(domain => {
    manifest.content_scripts[0].matches.push(`*://${domain}/*/*`);
    manifest.content_scripts[0].matches.push(`*://${domain}/*/*/*`);
  })

  fs.writeFileSync('src/manifest.json', JSON.stringify(manifest));
};

(async () => {
  const publicationDomains = await fetchPublicationDomains();
  console.log(publicationDomains.length)

  updateManifestDomainMatches(publicationDomains)
  console.log('Saved');
})()
