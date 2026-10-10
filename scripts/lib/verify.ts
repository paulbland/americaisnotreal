/**
 * Deterministic checks, no model involved. The daily scan can only publish a
 * pair that passes these, and CI runs the same rules over every day file.
 */

/**
 * Publishers whose reporting we accept. Registrable domains; subdomains match.
 * US wire services, national papers and broadcasters, major regional papers of
 * record, network-owned local stations, public radio, and the science press.
 * Deliberately excludes tabloids, satire, aggregators, content farms, social
 * media, press-release wires and Wikipedia.
 */
export const ACCEPTED_PUBLISHERS = [
  // Wire services
  "apnews.com",
  "reuters.com",
  // National papers and magazines
  "nytimes.com",
  "washingtonpost.com",
  "wsj.com",
  "usatoday.com",
  "bloomberg.com",
  "latimes.com",
  "theatlantic.com",
  "newyorker.com",
  "time.com",
  "fortune.com",
  "politico.com",
  "axios.com",
  "propublica.org",
  "themarkup.org",
  "thehill.com",
  "rollcall.com",
  "csmonitor.com",
  "smithsonianmag.com",
  "nationalgeographic.com",
  // Broadcast and cable networks
  "npr.org",
  "pbs.org",
  "cbsnews.com",
  "nbcnews.com",
  "abcnews.go.com",
  "cnn.com",
  "cnbc.com",
  "foxnews.com",
  "foxbusiness.com",
  "scrippsnews.com",
  // Science, health and tech press
  "science.org",
  "nature.com",
  "scientificamerican.com",
  "quantamagazine.org",
  "statnews.com",
  "kffhealthnews.org",
  "nejm.org",
  "jamanetwork.com",
  "thelancet.com",
  "cell.com",
  "pnas.org",
  "spectrum.ieee.org",
  "technologyreview.com",
  "arstechnica.com",
  "theverge.com",
  "wired.com",
  "techcrunch.com",
  "404media.co",
  "space.com",
  "spacenews.com",
  "eos.org",
  "phys.org",
  "sciencenews.org",
  "sciencedaily.com",
  "newscientist.com",
  "chronicle.com",
  "insidehighered.com",
  "edweek.org",
  "courthousenews.com",
  "law360.com",
  "abajournal.com",
  "reason.com",
  "themarshallproject.org",
  // International outlets with US bureaus
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "ft.com",
  "economist.com",
  "afp.com",
  // Regional papers of record (Northeast)
  "bostonglobe.com",
  "boston.com",
  "nydailynews.com",
  "newsday.com",
  "inquirer.com",
  "post-gazette.com",
  "baltimoresun.com",
  "courant.com",
  "ctinsider.com",
  "providencejournal.com",
  "pressherald.com",
  "bangordailynews.com",
  "burlingtonfreepress.com",
  "unionleader.com",
  "nj.com",
  "northjersey.com",
  "app.com",
  "buffalonews.com",
  "syracuse.com",
  "timesunion.com",
  "lohud.com",
  "thecity.nyc",
  "gothamist.com",
  // Regional papers of record (South)
  "miamiherald.com",
  "tampabay.com",
  "orlandosentinel.com",
  "sun-sentinel.com",
  "palmbeachpost.com",
  "jacksonville.com",
  "floridatoday.com",
  "tcpalm.com",
  "news-press.com",
  "naplesnews.com",
  "heraldtribune.com",
  "gainesville.com",
  "tallahassee.com",
  "pnj.com",
  "ocala.com",
  "ajc.com",
  "savannahnow.com",
  "charlotteobserver.com",
  "newsobserver.com",
  "wral.com",
  "postandcourier.com",
  "thestate.com",
  "greenvilleonline.com",
  "richmond.com",
  "pilotonline.com",
  "roanoke.com",
  "tennessean.com",
  "knoxnews.com",
  "commercialappeal.com",
  "courier-journal.com",
  "kentucky.com",
  "al.com",
  "nola.com",
  "theadvocate.com",
  "clarionledger.com",
  "arkansasonline.com",
  "oklahoman.com",
  "tulsaworld.com",
  "dallasnews.com",
  "houstonchronicle.com",
  "chron.com",
  "expressnews.com",
  "statesman.com",
  "texastribune.org",
  "star-telegram.com",
  "elpasotimes.com",
  "wvgazettemail.com",
  // Regional papers of record (Midwest)
  "chicagotribune.com",
  "suntimes.com",
  "startribune.com",
  "jsonline.com",
  "freep.com",
  "detroitnews.com",
  "mlive.com",
  "cleveland.com",
  "dispatch.com",
  "cincinnati.com",
  "toledoblade.com",
  "indystar.com",
  "stltoday.com",
  "kansascity.com",
  "kansas.com",
  "desmoinesregister.com",
  "omaha.com",
  "journalstar.com",
  "argusleader.com",
  "inforum.com",
  "twincities.com",
  "sj-r.com",
  // Regional papers of record (West)
  "sfchronicle.com",
  "sfstandard.com",
  "mercurynews.com",
  "sacbee.com",
  "fresnobee.com",
  "sandiegouniontribune.com",
  "ocregister.com",
  "laist.com",
  "calmatters.org",
  "seattletimes.com",
  "spokesman.com",
  "heraldnet.com",
  "oregonlive.com",
  "opb.org",
  "idahostatesman.com",
  "missoulian.com",
  "billingsgazette.com",
  "trib.com",
  "denverpost.com",
  "coloradosun.com",
  "gazette.com",
  "sltrib.com",
  "deseret.com",
  "ksl.com",
  "reviewjournal.com",
  "nevadaindependent.com",
  "azcentral.com",
  "tucson.com",
  "abqjournal.com",
  "santafenewmexican.com",
  "adn.com",
  "staradvertiser.com",
  "civilbeat.org",
  // Network-owned and affiliated local stations
  "nbcwashington.com",
  "nbcnewyork.com",
  "nbcchicago.com",
  "nbclosangeles.com",
  "nbcbayarea.com",
  "nbcmiami.com",
  "nbcphiladelphia.com",
  "nbcboston.com",
  "nbcdfw.com",
  "nbcsandiego.com",
  "abc7.com",
  "abc7ny.com",
  "abc7chicago.com",
  "abc7news.com",
  "abc13.com",
  "abc11.com",
  "6abc.com",
  "wfaa.com",
  "khou.com",
  "kare11.com",
  "king5.com",
  "9news.com",
  "wusa9.com",
  "wcnc.com",
  "11alive.com",
  "wkyc.com",
  "wthr.com",
  "wtsp.com",
  "wfla.com",
  "wesh.com",
  "wftv.com",
  "clickorlando.com",
  "local10.com",
  "wsvn.com",
  "wpbf.com",
  "wptv.com",
  "fox13news.com",
  "fox35orlando.com",
  "fox4news.com",
  "fox5atlanta.com",
  "fox5dc.com",
  "fox5ny.com",
  "fox2detroit.com",
  "fox32chicago.com",
  "foxla.com",
  "kxan.com",
  "ksat.com",
  "kens5.com",
  "click2houston.com",
  "ktla.com",
  "kcra.com",
  "kiro7.com",
  "komonews.com",
  "kgw.com",
  "wsbtv.com",
  "wxyz.com",
  "wcvb.com",
  "wbaltv.com",
  "wtae.com",
  "wmur.com",
  "wgal.com",
  "wisn.com",
  "kcci.com",
  "ketv.com",
  "koco.com",
  "kmbc.com",
  "wlwt.com",
  "wlky.com",
  "whas11.com",
  "wbir.com",
  "wtvf.com",
  "wsmv.com",
  "wmcactionnews5.com",
  "wdsu.com",
  "wafb.com",
  "wbrz.com",
  "wsfa.com",
  "wbrc.com",
  "abc3340.com",
  "wjxt.com",
  "news4jax.com",
  "actionnewsjax.com",
  "wtxl.com",
  "wjhg.com",
  "wear.com",
  "weartv.com",
  "wtvy.com",
  "wcjb.com",
  "cbs12.com",
  "wgrz.com",
  "wivb.com",
  "fox13seattle.com",
  "kxtv.com",
  "abc10.com",
  "kvue.com",
  "ktvb.com",
  "kpho.com",
  "azfamily.com",
  "12news.com",
  "8newsnow.com",
  "fox5vegas.com",
  "ksltv.com",
  "fox13now.com",
  "kdvr.com",
  "thedenverchannel.com",
  "koaa.com",
  "krqe.com",
  "koat.com",
  "wgntv.com",
  "fox8.com",
  "wews.com",
  "news5cleveland.com",
  "nbc4i.com",
  "10tv.com",
  "wcpo.com",
  "wkbw.com",
  "wtol.com",
  "13abc.com",
  "wsaz.com",
  "wchstv.com",
  "wdtv.com",
  "wmtw.com",
  "wgme.com",
  "wcsh6.com",
  "newscentermaine.com",
  "wpri.com",
  "turnto10.com",
  "fox61.com",
  "wfsb.com",
  "wtnh.com",
  "whec.com",
  "13wham.com",
  "wkbn.com",
  "wtov9.com",
  "wpxi.com",
  "kdka.com",
  "wjactv.com",
  "pahomepage.com",
  "wnep.com",
  "abc27.com",
  "fox43.com",
  "wjz.com",
  "wmar2news.com",
  "foxbaltimore.com",
  "wavy.com",
  "13newsnow.com",
  "wtkr.com",
  "wric.com",
  "nbc12.com",
  "wtvr.com",
  "wdbj7.com",
  "wsls.com",
  "whsv.com",
  "wset.com",
  "wtvd.com",
  "wncn.com",
  "cbs17.com",
  "wfmynews2.com",
  "wxii12.com",
  "wbtv.com",
  "wsoctv.com",
  "qcnews.com",
  "wyff4.com",
  "foxcarolina.com",
  "wspa.com",
  "wis10.com",
  "wistv.com",
  "live5news.com",
  "counton2.com",
  "wmbfnews.com",
  "wtoc.com",
  "wsav.com",
  "wjcl.com",
  "wrdw.com",
  "wmaz.com",
  "13wmaz.com",
  "wgxa.tv",
  "walb.com",
  "wtvm.com",
  "wrbl.com",
  "wsb.com",
  "cbs46.com",
  "atlantanewsfirst.com",
  "wgcl.com",
  // Stations and newsrooms the scan kept finding good stories on
  "clickondetroit.com",
  "koin.com",
  "ktar.com",
  "shawlocal.com",
  "votebeat.org",
  "wdiv.com",
  // Public radio
  "wnyc.org",
  "wbur.org",
  "wbez.org",
  "kqed.org",
  "wamu.org",
  "wfsu.org",
  "wuwf.org",
  "wusf.org",
  "wlrn.org",
  "wmfe.org",
  "cpr.org",
  "kuow.org",
  "mprnews.org",
  "wpr.org",
  "michiganradio.org",
  "michiganpublic.org",
  "ideastream.org",
  "wvxu.org",
  "wfyi.org",
  "wshu.org",
  "wgbh.org",
  "nhpr.org",
  "vpr.org",
  "vermontpublic.org",
  "mainepublic.org",
  "wvpublic.org",
  "wunc.org",
  "wfae.org",
  "wabe.org",
  "gpb.org",
  "wmnf.org",
  "texasstandard.org",
  "kut.org",
  "houstonpublicmedia.org",
  "keranews.org",
  "tpr.org",
  "kjzz.org",
  "knpr.org",
  "kunc.org",
  "kpbs.org",
  "kcrw.com",
  "lpm.org",
  "wkms.org",
  "wknofm.org",
  "wpln.org",
  "wvtf.org",
  "wypr.org",
  "whyy.org",
  "witf.org",
  "wesa.fm",
  "ncpr.org",
  "wxxinews.org",
  "wskg.org",
  "nebraskapublicmedia.org",
  "sdpb.org",
  "prairiepublic.org",
  "kbia.org",
  "stlpr.org",
  "kcur.org",
  "iowapublicradio.org",
  "boisestatepublicradio.org",
  "mtpr.org",
  "wyomingpublicmedia.org",
  "kunm.org",
  "alaskapublic.org",
  "hawaiipublicradio.org",
] as const;

/**
 * Hosts whose own announcements count as a source: government, courts, the
 * Nobel Foundation, major prize bodies, NASA and friends, and universities.
 * At least one accepted news publisher is still required alongside any of these.
 */
const PRIMARY_PATTERNS: RegExp[] = [
  /(^|\.)gov$/,
  /(^|\.)mil$/,
  /(^|\.)edu$/,
  /(^|\.)nobelprize\.org$/,
  /(^|\.)macfound\.org$/,
  /(^|\.)pulitzer\.org$/,
  /(^|\.)breakthroughprize\.org$/,
  /(^|\.)laskerfoundation\.org$/,
  /(^|\.)nasa\.gov$/,
  /(^|\.)nationalacademies\.org$/,
  /(^|\.)courtlistener\.com$/,
  /(^|\.)justia\.com$/,
  /(^|\.)documentcloud\.org$/,
];

/** Never acceptable, even if a publisher above syndicates it. Kept for the prompt and tests. */
export const BANNED_HOSTS = [
  "theonion.com",
  "babylonbee.com",
  "reductress.com",
  "clickhole.com",
  "thehardtimes.net",
  "nypost.com",
  "dailymail.co.uk",
  "the-sun.com",
  "thesun.co.uk",
  "mirror.co.uk",
  "tmz.com",
  "pagesix.com",
  "buzzfeed.com",
  "huffpost.com",
  "unilad.com",
  "ladbible.com",
  "boredpanda.com",
  "upworthy.com",
  "distractify.com",
  "newsweek.com",
  "dailywire.com",
  "breitbart.com",
  "rawstory.com",
  "yahoo.com",
  "msn.com",
  "aol.com",
  "x.com",
  "twitter.com",
  "facebook.com",
  "reddit.com",
  "tiktok.com",
  "instagram.com",
  "youtube.com",
  "wikipedia.org",
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "eurekalert.org",
];

const ARCHIVE_HOSTS = ["web.archive.org", "archive.org", "archive.ph", "archive.today"];

export function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

export function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isPrimaryHost(host: string): boolean {
  return PRIMARY_PATTERNS.some((p) => p.test(host));
}

export function isAcceptedPublisher(host: string): boolean {
  return ACCEPTED_PUBLISHERS.some((d) => matchesDomain(host, d));
}

export function isBannedHost(host: string): boolean {
  return BANNED_HOSTS.some((d) => matchesDomain(host, d));
}

export function isArchiveHost(host: string): boolean {
  return ARCHIVE_HOSTS.some((d) => matchesDomain(host, d));
}

/** Whether a story may cite this URL at all. */
export function sourceAllowed(url: string): boolean {
  const host = hostOf(url);
  if (isBannedHost(host)) return false;
  return isAcceptedPublisher(host) || isPrimaryHost(host);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
  hellip: "...",
};

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/** Folds the differences that don't change meaning: case, quotes, dashes, whitespace. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/­/g, "")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export const MIN_QUOTE_CHARS = 25;

/**
 * True if `quote` appears verbatim (after normalisation) in `text`. Short
 * quotes are rejected: "the mayor said" proves nothing.
 */
export function containsQuote(text: string, quote: string): boolean {
  const q = normalizeText(quote).replace(/^["']|["']$/g, "");
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normalizeText(text).includes(q);
}

/**
 * Words that mark a story we never run on the facepalm side: anyone hurt,
 * anyone under 18, anyone in crisis. Deliberately broad; a false positive only
 * defers a candidate so the next one is tried.
 */
const FACEPALM_BLOCK_TERMS =
  /\b(died|death|dead|killed|fatal(ly)?|injur(ed|y|ies)|hospitali[sz]ed|critical condition|suicide|overdose|minor|teen(ager)?s?|child(ren)?|toddler|infant|baby|\d{1,2}-year-old|year-old (boy|girl)|student|homeless|disabilit(y|ies)|disabled|mental(ly)? (ill|health)|dementia|undocumented|immigrant|rape|sexual|assault(ed)?|abuse|victim)\b/i;

export function facepalmBlockedTerms(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(FACEPALM_BLOCK_TERMS.source, "gi");
  for (const m of text.matchAll(re)) found.add(m[0].toLowerCase());
  return [...found];
}

/** Loaded language we don't use in our own copy. The content speaks for itself. */
const EDITORIALISING =
  /\b(idiot(ic)?|moron(ic)?|stupid(ity)?|dumb(est)?|genius(es)?|brilliant(ly)?|hilarious(ly)?|insane|crazy|bizarre|absurd|ridiculous|unbelievabl[ey]|shocking(ly)?|amazing(ly)?|incredibl[ey]|facepalm|lol|wtf)\b/i;

export function editorialisingTerms(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(EDITORIALISING.source, "gi");
  for (const m of text.matchAll(re)) found.add(m[0].toLowerCase());
  return [...found];
}
