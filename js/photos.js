const API_URLS=['/data/nh48.json','https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json','https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'];
const TAXONOMY_URLS=['/data/wmnf-ranges.json','https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/wmnf-ranges.json','https://raw.githubusercontent.com/natesobol/nh48-api/main/data/wmnf-ranges.json'];
const SITE_URL='https://nh48.info';
const PHOTO_BASE_URL='https://photos.nh48.info';
const PHOTO_LIST_PREFIX=`${PHOTO_BASE_URL}/cdn-cgi/image/format=webp,quality=84,width=960`;
const PHOTO_LIGHTBOX_PREFIX=`${PHOTO_BASE_URL}/cdn-cgi/image/format=webp,quality=90,width=1800`;
const LICENSE_URL='https://creativecommons.org/licenses/by/4.0/';
const DEFAULT_RANGE_COLOR='#4ade80';
const CASE_TABLE={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],5:[[3,2],[0,1]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[0,2]],10:[[0,1],[2,3]],11:[[1,2]],12:[[1,3]],13:[[0,1]],14:[[0,3]]};
const TOPO_LEVELS=[-1.02,-0.82,-0.62,-0.42,-0.22,-0.02,0.18,0.38,0.58,0.78,0.98];

const state={
  peaks:[],taxonomy:null,filterParentOptions:[],filterSubrangeOptions:[],activeParentFilters:new Set(),activeSubrangeFilters:new Set(),subrangeToParent:new Map(),
  search:'',sort:'range',rangeMode:'jump',renderedParentGroups:[],activeParentSlug:'',hasAppliedInitialHash:false,revealObserver:null,rangeObserver:null,
  topoPhase:0,topoTimer:null,topoResizeTimer:null,lightbox:{peakSlug:'',index:0,open:false}
};

const elements={
  container:document.getElementById('photos-container'),loading:document.getElementById('photosLoading'),empty:document.getElementById('photosEmpty'),
  search:document.getElementById('photoSearch'),sort:document.getElementById('photoSort'),rangeModeTabs:document.getElementById('rangeModeTabs'),
  tabJump:document.getElementById('rangeTabJump'),tabFilter:document.getElementById('rangeTabFilter'),jumpPanel:document.getElementById('jumpPanel'),
  filterPanel:document.getElementById('filterPanel'),parentJumpLinks:document.getElementById('parentJumpLinks'),subrangeJumpGrid:document.getElementById('subrangeJumpGrid'),
  peakJumpLinks:document.getElementById('peakJumpLinks'),parentFilterChips:document.getElementById('parentFilterChips'),subrangeFilterChips:document.getElementById('subrangeFilterChips'),
  viewStatus:document.getElementById('photosViewStatus'),statsPeaks:document.getElementById('statsPeaks'),statsPhotos:document.getElementById('statsPhotos'),
  statsRanges:document.getElementById('statsRanges'),schemaScript:document.getElementById('page-gallery-schema'),heroTopo:document.getElementById('photosHeroTopo'),
  lightbox:document.getElementById('photoLightbox'),lightboxImage:document.getElementById('photoLightboxImage'),lightboxCaption:document.getElementById('photoLightboxCaption'),
  lightboxMeta:document.getElementById('photoLightboxMeta'),lightboxCounter:document.getElementById('photoLightboxCounter'),lightboxPeakLink:document.getElementById('photoLightboxPeakLink'),
  lightboxPrev:document.getElementById('photoLightboxPrev'),lightboxNext:document.getElementById('photoLightboxNext')
};

const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const trackAnalytics=(name,params={})=>{
  if(window.NH48Analytics?.track){window.NH48Analytics.track(name,params);return;}
  const analytics=window.NH48_INFO_ANALYTICS;
  if(!analytics?.logEvent)return;
  if(analytics.analytics){analytics.logEvent(analytics.analytics,name,{page:location.pathname,...params});return;}
  analytics.logEvent(name,params);
};

const slugify=(value)=>String(value||'').toLowerCase().trim().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const normalizeRangeLabel=(value)=>String(value||'').replace(/[\u2010-\u2015]/g,'-').replace(/\s*-\s*/g,' - ').replace(/\s+/g,' ').replace(/\.+$/g,'').trim();
const canonicalizeLabel=(value)=>normalizeRangeLabel(String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')).replace(/['`]/g,'').toLowerCase();
const parseElevation=(value)=>Number(String(value||'').replace(/[^0-9.]/g,''))||0;
const tokenizeLabel=(value)=>canonicalizeLabel(value).split(/[^a-z0-9]+/).filter((t)=>t.length>2&&t!=='range'&&t!=='mountain');
const tokenOverlapScore=(tokens,set)=>{if(!tokens.length||!set?.size)return 0;let s=0;tokens.forEach((t)=>{if(set.has(t))s+=1;});return s;};
const formatNumber=(value)=>new Intl.NumberFormat('en-US').format(value||0);

const pickAlt=(photo,peakName)=>photo?.alt||photo?.altText||photo?.caption||photo?.headline||`${peakName} summit photo`;
const pickCaption=(photo,peakName)=>photo?.caption||photo?.headline||photo?.description||photo?.alt||photo?.altText||`${peakName} summit photo`;

const normalizePhotoUrl=(rawUrl)=>{
  if(!rawUrl)return '';
  const input=String(rawUrl).trim();
  if(!input)return '';
  const jsdelivrMarker='/gh/natesobol/nh48-api@main/photos/';
  if(input.includes(jsdelivrMarker)){const tail=input.split(jsdelivrMarker)[1];return tail?`${PHOTO_BASE_URL}/${tail.replace(/^\/+/,'')}`:input;}
  const rawGithubMarker='/natesobol/nh48-api/main/photos/';
  if(input.includes(rawGithubMarker)){const tail=input.split(rawGithubMarker)[1];return tail?`${PHOTO_BASE_URL}/${tail.replace(/^\/+/,'')}`:input;}
  try{
    const parsed=new URL(input,window.location.origin);
    if(parsed.hostname===new URL(PHOTO_BASE_URL).hostname)return `${PHOTO_BASE_URL}${parsed.pathname}`;
    if(parsed.pathname.includes('/photos/')){const tail=parsed.pathname.split('/photos/')[1];if(tail)return `${PHOTO_BASE_URL}/${tail.replace(/^\/+/,'')}`;}
    return parsed.href;
  }catch(error){return input;}
};

const transformPhotoUrl=(rawUrl,prefix)=>{
  const normalized=normalizePhotoUrl(rawUrl);
  if(!normalized)return '';
  try{const parsed=new URL(normalized);if(parsed.origin===PHOTO_BASE_URL)return `${prefix}${parsed.pathname}`;}catch(error){return normalized;}
  return normalized;
};

const buildPeakUrl=(slug)=>`/peak/${encodeURIComponent(slug)}/`;
const getLayoutClass=(photoCount)=>photoCount<=1?'layout-1':photoCount===2?'layout-2':photoCount<=4?'layout-3-4':photoCount<=6?'layout-5-6':'layout-7plus';
const getTileClasses=(photoCount,index)=>{const c=['photo-figure'];if(photoCount>=4&&index===0)c.push('is-feature');if(photoCount>=5&&index>0&&index%4===1)c.push('is-wide');if(photoCount>=7&&index>0&&index%6===3)c.push('is-tall');return c;};

const parseHexColor=(hex)=>{
  const raw=String(hex||'').trim().replace('#','');
  if(!/^[a-f0-9]{3}([a-f0-9]{3})?$/i.test(raw))return null;
  const full=raw.length===3?raw.split('').map((c)=>c+c).join(''):raw;
  return {r:parseInt(full.slice(0,2),16),g:parseInt(full.slice(2,4),16),b:parseInt(full.slice(4,6),16)};
};
const rgbaFromHex=(hex,alpha)=>{const rgb=parseHexColor(hex);if(!rgb)return `rgba(74, 222, 128, ${alpha})`;return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;};
const setRangeColorVars=(node,color)=>{if(!node)return;const resolved=color||DEFAULT_RANGE_COLOR;node.style.setProperty('--range-color',resolved);node.style.setProperty('--range-color-soft',rgbaFromHex(resolved,0.18));node.style.setProperty('--range-color-border',rgbaFromHex(resolved,0.62));};

const getSubrangeLabel=(subrangeName,subrangeShortLabel,parentRangeName)=>{
  if(subrangeShortLabel&&subrangeShortLabel!=='Main')return subrangeShortLabel;
  const full=normalizeRangeLabel(subrangeName);
  const parent=normalizeRangeLabel(parentRangeName);
  if(full.toLowerCase()===parent.toLowerCase())return 'Main';
  const prefix=`${parent} - `;
  if(full.toLowerCase().startsWith(prefix.toLowerCase()))return full.slice(prefix.length).trim();
  return full;
};

const fetchJsonWithFallback=async(urls,label)=>{
  for(const url of urls){
    try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`Failed fetch (${response.status}): ${url}`);return await response.json();}
    catch(error){console.warn(`[photos] ${label} fallback failed`,error);}
  }
  throw new Error(`Unable to fetch ${label}.`);
};
const fetchPeaks=()=>fetchJsonWithFallback(API_URLS,'NH48 peak data');
const fetchTaxonomy=()=>fetchJsonWithFallback(TAXONOMY_URLS,'WMNF range taxonomy');

const getAliasVariants=(value)=>{
  const base=normalizeRangeLabel(value);
  if(!base)return [];
  const variants=new Set([base,base.replace(/ - /g,'-'),base.replace(/\.+$/,''),`${base.replace(/\.+$/,'')}.`]);
  if(base.includes(' - ')){const parts=base.split(' - ');if(parts.length>=2){variants.add(`${parts[0]}-${parts.slice(1).join('-')}`);variants.add(`${parts[0]} - ${parts.slice(1).join(' / ')}`);}}
  return Array.from(variants).map((entry)=>canonicalizeLabel(entry)).filter(Boolean);
};

const buildTokenSet=(values)=>{const set=new Set();values.forEach((value)=>tokenizeLabel(value).forEach((token)=>set.add(token)));return set;};

const buildTaxonomy=(rawTaxonomy)=>{
  const parents=[];const parentBySlug=new Map();const parentAliasMap=new Map();const subrangeAliasMap=new Map();
  Object.entries(rawTaxonomy||{}).forEach(([slug,parentRaw],index)=>{
    const parentName=parentRaw?.rangeName||parentRaw?.name||slug;
    const parentSlug=parentRaw?.slug||slug;
    const aliases=new Set([parentName,parentSlug,...(Array.isArray(parentRaw?.aliases)?parentRaw.aliases:[])]);
    const subrangesRaw=Array.isArray(parentRaw?.subranges)&&parentRaw.subranges.length?parentRaw.subranges:[{name:parentName,slug:parentSlug,shortLabel:'Main',aliases:[parentName,`${parentName}.`]}];
    const subranges=subrangesRaw.map((subrangeRaw,subIndex)=>{
      const subrangeName=subrangeRaw?.name||parentName;
      const subrangeSlug=subrangeRaw?.slug||slugify(subrangeName)||`${parentSlug}-sub-${subIndex+1}`;
      const subrangeShortLabel=subrangeRaw?.shortLabel||getSubrangeLabel(subrangeName,'',parentName);
      const subAliases=new Set([subrangeName,subrangeSlug,subrangeShortLabel,...(Array.isArray(subrangeRaw?.aliases)?subrangeRaw.aliases:[])]);
      const subrange={name:subrangeName,slug:subrangeSlug,shortLabel:subrangeShortLabel,aliases:Array.from(subAliases),uiOrder:Number.isFinite(Number(subrangeRaw?.uiOrder))?Number(subrangeRaw.uiOrder):(subIndex+1)};
      const aliasStrings=new Set();subrange.aliases.forEach((alias)=>getAliasVariants(alias).forEach((entry)=>aliasStrings.add(entry)));
      subrange.aliasKeySet=aliasStrings;subrange.tokenSet=buildTokenSet([...subrange.aliases,subrange.name,subrange.shortLabel]);
      aliasStrings.forEach((aliasKey)=>{if(!subrangeAliasMap.has(aliasKey))subrangeAliasMap.set(aliasKey,{parentSlug,subrangeSlug});});
      return subrange;
    });
    const parent={...parentRaw,slug:parentSlug,rangeName:parentName,color:parentRaw?.color||DEFAULT_RANGE_COLOR,aliases:Array.from(aliases),subranges,uiOrder:Number.isFinite(Number(parentRaw?.uiOrder))?Number(parentRaw.uiOrder):(index+1)};
    const parentAliasKeys=new Set();parent.aliases.forEach((alias)=>getAliasVariants(alias).forEach((entry)=>parentAliasKeys.add(entry)));
    parent.aliasKeySet=parentAliasKeys;parent.tokenSet=buildTokenSet([...parent.aliases,parent.rangeName]);
    parentAliasKeys.forEach((aliasKey)=>{if(!parentAliasMap.has(aliasKey))parentAliasMap.set(aliasKey,parentSlug);});
    parents.push(parent);parentBySlug.set(parentSlug,parent);
  });
  if(!parentBySlug.has('other')){
    const otherParent={rangeName:'Other',slug:'other',color:'#94a3b8',aliases:['Other'],aliasKeySet:new Set(['other']),tokenSet:new Set(['other']),uiOrder:999,subranges:[{name:'Other',slug:'other',shortLabel:'Other',aliases:['Other'],aliasKeySet:new Set(['other']),tokenSet:new Set(['other']),uiOrder:1}]};
    parents.push(otherParent);parentBySlug.set('other',otherParent);parentAliasMap.set('other','other');subrangeAliasMap.set('other',{parentSlug:'other',subrangeSlug:'other'});
  }
  return {parents,parentBySlug,parentAliasMap,subrangeAliasMap};
};
const getDefaultSubrange=(parent)=>{if(!parent)return null;const exact=parent.subranges.find((subrange)=>canonicalizeLabel(subrange.name)===canonicalizeLabel(parent.rangeName));return exact||parent.subranges[0]||null;};

const resolveRangeTaxonomy=(rawRangeLabel,taxonomy,unmappedRanges)=>{
  const cleanLabel=normalizeRangeLabel(rawRangeLabel)||'Other';
  const labelKey=canonicalizeLabel(cleanLabel);
  const makeResult=(parent,subrange)=>{
    const resolvedParent=parent||taxonomy.parentBySlug.get('other');
    const resolvedSubrange=subrange||getDefaultSubrange(resolvedParent)||taxonomy.parentBySlug.get('other').subranges[0];
    return {
      parentRangeName:resolvedParent.rangeName,parentRangeSlug:resolvedParent.slug,parentColor:resolvedParent.color||DEFAULT_RANGE_COLOR,
      parentUiOrder:Number.isFinite(Number(resolvedParent.uiOrder))?Number(resolvedParent.uiOrder):999,
      subrangeName:resolvedSubrange.name,subrangeSlug:resolvedSubrange.slug,
      subrangeShortLabel:resolvedSubrange.shortLabel||getSubrangeLabel(resolvedSubrange.name,'',resolvedParent.rangeName),
      subrangeUiOrder:Number.isFinite(Number(resolvedSubrange.uiOrder))?Number(resolvedSubrange.uiOrder):999,
      sourceRangeLabel:cleanLabel
    };
  };

  const directSubrange=taxonomy.subrangeAliasMap.get(labelKey);
  if(directSubrange){const parent=taxonomy.parentBySlug.get(directSubrange.parentSlug);const subrange=parent?.subranges.find((item)=>item.slug===directSubrange.subrangeSlug);return makeResult(parent,subrange);}

  const directParentSlug=taxonomy.parentAliasMap.get(labelKey);
  if(directParentSlug){const parent=taxonomy.parentBySlug.get(directParentSlug);return makeResult(parent,getDefaultSubrange(parent));}

  const prefix=cleanLabel.includes(' - ')?cleanLabel.split(' - ')[0]:cleanLabel;
  const prefixKey=canonicalizeLabel(prefix);
  const prefixParentSlug=taxonomy.parentAliasMap.get(prefixKey);
  if(prefixParentSlug){
    const parent=taxonomy.parentBySlug.get(prefixParentSlug);
    let bestSubrange=getDefaultSubrange(parent);
    let bestSubrangeScore=0;
    const labelTokens=tokenizeLabel(cleanLabel);
    parent.subranges.forEach((candidate)=>{const score=tokenOverlapScore(labelTokens,candidate.tokenSet);if(score>bestSubrangeScore){bestSubrange=candidate;bestSubrangeScore=score;}});
    return makeResult(parent,bestSubrange);
  }

  const labelTokens=tokenizeLabel(cleanLabel);
  let bestParent=null;let bestParentScore=0;
  taxonomy.parents.forEach((parent)=>{const score=tokenOverlapScore(labelTokens,parent.tokenSet);if(score>bestParentScore){bestParent=parent;bestParentScore=score;}});

  if(bestParent&&bestParentScore>0){
    let bestSubrange=getDefaultSubrange(bestParent);
    let bestSubrangeScore=0;
    bestParent.subranges.forEach((candidate)=>{const score=tokenOverlapScore(labelTokens,candidate.tokenSet);if(score>bestSubrangeScore){bestSubrange=candidate;bestSubrangeScore=score;}});
    return makeResult(bestParent,bestSubrange);
  }

  unmappedRanges.add(cleanLabel);
  const otherParent=taxonomy.parentBySlug.get('other');
  const fallbackSubrange={name:cleanLabel,slug:slugify(cleanLabel)||'other',shortLabel:cleanLabel,uiOrder:999,tokenSet:new Set(tokenizeLabel(cleanLabel))};
  return makeResult(otherParent,fallbackSubrange);
};

const buildPeakList=(data,taxonomy)=>{
  const usedSlugs=new Set();
  const unmappedRanges=new Set();
  const peaks=[];

  Object.entries(data||{}).forEach(([entrySlug,peak],index)=>{
    const peakName=peak?.peakName||peak?.['Peak Name']||peak?.name||`Peak ${index+1}`;
    const baseSlug=slugify(peak?.slug||entrySlug||peakName)||`peak-${index+1}`;
    let slug=baseSlug;let suffix=2;
    while(usedSlugs.has(slug)){slug=`${baseSlug}-${suffix}`;suffix+=1;}
    usedSlugs.add(slug);

    const rawRange=normalizeRangeLabel(peak?.['Range / Subrange']||peak?.range||'Other');
    const rangeMeta=resolveRangeTaxonomy(rawRange,taxonomy,unmappedRanges);
    const elevation=parseElevation(peak?.['Elevation (ft)']||peak?.elevation||0);

    const photos=Array.isArray(peak?.photos)
      ? peak.photos.map((photo,photoIndex)=>{
          const sourceUrl=typeof photo==='string'?photo:photo?.url;
          const originalUrl=normalizePhotoUrl(sourceUrl);
          if(!originalUrl)return null;
          const alt=pickAlt(photo,peakName);
          const caption=pickCaption(photo,peakName);
          return {
            id:`${slug}-photo-${photoIndex+1}`,
            index:photoIndex,
            originalUrl,
            listUrl:transformPhotoUrl(originalUrl,PHOTO_LIST_PREFIX),
            lightboxUrl:transformPhotoUrl(originalUrl,PHOTO_LIGHTBOX_PREFIX),
            alt,
            caption,
            description:caption
          };
        }).filter(Boolean)
      : [];

    if(!photos.length)return;

    peaks.push({slug,name:peakName,elevation,peakUrl:buildPeakUrl(slug),photos,photoCount:photos.length,...rangeMeta});
  });

  if(unmappedRanges.size){console.warn('[photos] Unmapped range labels found:',Array.from(unmappedRanges).join(', '));}

  state.subrangeToParent=new Map();
  peaks.forEach((peak)=>state.subrangeToParent.set(peak.subrangeSlug,peak.parentRangeSlug));
  return peaks;
};

const buildFilterOptions=(peaks)=>{
  const parentMap=new Map();
  const subrangeMap=new Map();

  peaks.forEach((peak)=>{
    const parentKey=peak.parentRangeSlug;
    if(!parentMap.has(parentKey)){parentMap.set(parentKey,{slug:peak.parentRangeSlug,name:peak.parentRangeName,color:peak.parentColor,uiOrder:peak.parentUiOrder,peakCount:0,photoCount:0});}
    const parent=parentMap.get(parentKey);
    parent.peakCount+=1;
    parent.photoCount+=peak.photoCount;

    const subrangeKey=peak.subrangeSlug;
    if(!subrangeMap.has(subrangeKey)){
      subrangeMap.set(subrangeKey,{slug:peak.subrangeSlug,name:peak.subrangeName,shortLabel:peak.subrangeShortLabel,parentSlug:peak.parentRangeSlug,parentName:peak.parentRangeName,color:peak.parentColor,parentUiOrder:peak.parentUiOrder,uiOrder:peak.subrangeUiOrder,peakCount:0,photoCount:0});
    }
    const subrange=subrangeMap.get(subrangeKey);
    subrange.peakCount+=1;
    subrange.photoCount+=peak.photoCount;
  });

  const parentOptions=Array.from(parentMap.values()).sort((a,b)=>{const order=a.uiOrder-b.uiOrder;if(order!==0)return order;return a.name.localeCompare(b.name);});
  const subrangeOptions=Array.from(subrangeMap.values()).sort((a,b)=>{const parentOrder=a.parentUiOrder-b.parentUiOrder;if(parentOrder!==0)return parentOrder;const subOrder=a.uiOrder-b.uiOrder;if(subOrder!==0)return subOrder;return a.name.localeCompare(b.name);});

  return {parentOptions,subrangeOptions};
};

const hasActiveRangeFilters=()=>state.activeParentFilters.size>0||state.activeSubrangeFilters.size>0;

const filterPeaks=()=>{
  const searchLower=state.search.trim().toLowerCase();
  const hasFilters=hasActiveRangeFilters();

  return state.peaks.filter((peak)=>{
    const matchesSearch=!searchLower||peak.name.toLowerCase().includes(searchLower);
    const matchesRange=!hasFilters||state.activeParentFilters.has(peak.parentRangeSlug)||state.activeSubrangeFilters.has(peak.subrangeSlug);
    return matchesSearch&&matchesRange;
  });
};

const getPeakComparator=(sortKey)=>{
  const taxonomyTieBreaker=(a,b)=>{
    const parentOrder=a.parentUiOrder-b.parentUiOrder;if(parentOrder!==0)return parentOrder;
    const parentName=a.parentRangeName.localeCompare(b.parentRangeName);if(parentName!==0)return parentName;
    const subrangeName=a.subrangeName.localeCompare(b.subrangeName);if(subrangeName!==0)return subrangeName;
    return a.name.localeCompare(b.name);
  };

  if(sortKey==='name')return (a,b)=>a.name.localeCompare(b.name)||taxonomyTieBreaker(a,b);
  if(sortKey==='elevation-desc')return (a,b)=>(b.elevation-a.elevation)||a.name.localeCompare(b.name)||taxonomyTieBreaker(a,b);
  if(sortKey==='elevation-asc')return (a,b)=>(a.elevation-b.elevation)||a.name.localeCompare(b.name)||taxonomyTieBreaker(a,b);
  return (a,b)=>taxonomyTieBreaker(a,b);
};

const groupPeaks=(peaks,sortKey)=>{
  const parentMap=new Map();

  peaks.forEach((peak)=>{
    if(!parentMap.has(peak.parentRangeSlug)){
      parentMap.set(peak.parentRangeSlug,{parentRangeSlug:peak.parentRangeSlug,parentRangeName:peak.parentRangeName,parentColor:peak.parentColor,parentUiOrder:peak.parentUiOrder,subrangeMap:new Map(),subranges:[],peakCount:0,photoCount:0});
    }

    const parentGroup=parentMap.get(peak.parentRangeSlug);
    parentGroup.peakCount+=1;
    parentGroup.photoCount+=peak.photoCount;

    if(!parentGroup.subrangeMap.has(peak.subrangeSlug)){
      parentGroup.subrangeMap.set(peak.subrangeSlug,{subrangeSlug:peak.subrangeSlug,subrangeName:peak.subrangeName,subrangeShortLabel:peak.subrangeShortLabel,subrangeUiOrder:peak.subrangeUiOrder,parentRangeSlug:peak.parentRangeSlug,peaks:[],peakCount:0,photoCount:0});
    }

    const subrangeGroup=parentGroup.subrangeMap.get(peak.subrangeSlug);
    subrangeGroup.peaks.push(peak);
    subrangeGroup.peakCount+=1;
    subrangeGroup.photoCount+=peak.photoCount;
  });

  const comparator=getPeakComparator(sortKey);

  const parentGroups=Array.from(parentMap.values()).map((group)=>{
    group.subranges=Array.from(group.subrangeMap.values());
    group.subranges.forEach((subrange)=>subrange.peaks.sort(comparator));
    group.subranges.sort((a,b)=>{const orderDiff=a.subrangeUiOrder-b.subrangeUiOrder;if(orderDiff!==0)return orderDiff;return a.subrangeName.localeCompare(b.subrangeName);});
    delete group.subrangeMap;
    return group;
  });

  parentGroups.sort((a,b)=>{const parentOrder=a.parentUiOrder-b.parentUiOrder;if(parentOrder!==0)return parentOrder;return a.parentRangeName.localeCompare(b.parentRangeName);});
  return parentGroups;
};

const updateStats=(parentGroups)=>{
  const peakCount=parentGroups.reduce((total,parentGroup)=>total+parentGroup.peakCount,0);
  const photoCount=parentGroups.reduce((total,parentGroup)=>total+parentGroup.photoCount,0);
  const rangeCount=parentGroups.length;

  if(elements.statsPeaks)elements.statsPeaks.textContent=formatNumber(peakCount);
  if(elements.statsPhotos)elements.statsPhotos.textContent=formatNumber(photoCount);
  if(elements.statsRanges)elements.statsRanges.textContent=formatNumber(rangeCount);

  if(elements.viewStatus){
    if(!peakCount){elements.viewStatus.textContent='No photos match your current filters.';return;}
    const hasFilters=hasActiveRangeFilters()||Boolean(state.search.trim());
    elements.viewStatus.textContent=hasFilters
      ? `Showing ${formatNumber(photoCount)} photos across ${formatNumber(peakCount)} peaks in ${formatNumber(rangeCount)} ranges.`
      : `Archive includes ${formatNumber(photoCount)} photos across ${formatNumber(peakCount)} peaks in ${formatNumber(rangeCount)} ranges.`;
  }
};

const getRenderedParentGroup=(parentSlug)=>state.renderedParentGroups.find((group)=>group.parentRangeSlug===parentSlug);

const findParentSlugForSubrange=(subrangeSlug)=>{
  if(state.subrangeToParent.has(subrangeSlug))return state.subrangeToParent.get(subrangeSlug);
  const containingGroup=state.renderedParentGroups.find((group)=>group.subranges.some((subrange)=>subrange.subrangeSlug===subrangeSlug));
  return containingGroup?.parentRangeSlug||'';
};
const updateParentJumpActiveState=()=>{
  if(!elements.parentJumpLinks)return;
  elements.parentJumpLinks.querySelectorAll('.jump-link').forEach((chip)=>chip.classList.toggle('active',chip.dataset.parentSlug===state.activeParentSlug));
};

const renderPeakJumpLinks=()=>{
  if(!elements.peakJumpLinks)return;
  elements.peakJumpLinks.innerHTML='';
  const activeParent=getRenderedParentGroup(state.activeParentSlug);
  if(!activeParent)return;

  const peaks=activeParent.subranges.flatMap((subrange)=>subrange.peaks).sort((a,b)=>a.name.localeCompare(b.name));
  peaks.forEach((peak)=>{
    const link=document.createElement('a');
    link.href=`#peak-${peak.slug}`;
    link.className='jump-link jump-link--peak-item';
    link.dataset.peakSlug=peak.slug;
    link.textContent=peak.name;
    setRangeColorVars(link,activeParent.parentColor);
    elements.peakJumpLinks.appendChild(link);
  });
};

const renderSubrangeJumpGrid=()=>{
  if(!elements.subrangeJumpGrid)return;
  elements.subrangeJumpGrid.innerHTML='';
  const activeParent=getRenderedParentGroup(state.activeParentSlug);
  if(!activeParent)return;

  activeParent.subranges.forEach((subrange)=>{
    const link=document.createElement('a');
    link.href=`#subrange-${subrange.subrangeSlug}`;
    link.className='subrange-jump-card';
    link.dataset.subrangeSlug=subrange.subrangeSlug;
    link.dataset.parentSlug=activeParent.parentRangeSlug;
    link.title=subrange.subrangeName;

    const label=document.createElement('span');
    label.className='subrange-jump-card__label';
    label.textContent=getSubrangeLabel(subrange.subrangeName,subrange.subrangeShortLabel,activeParent.parentRangeName);

    const meta=document.createElement('span');
    meta.className='subrange-jump-card__meta';
    meta.textContent=`${subrange.peakCount} peaks`;

    link.appendChild(label);
    link.appendChild(meta);
    if(state.activeSubrangeFilters.has(subrange.subrangeSlug))link.classList.add('is-filter-active');
    setRangeColorVars(link,activeParent.parentColor);

    link.addEventListener('click',()=>{
      state.activeParentSlug=activeParent.parentRangeSlug;
      updateParentJumpActiveState();
      renderPeakJumpLinks();
    });

    elements.subrangeJumpGrid.appendChild(link);
  });
};

const setActiveParent=(parentSlug)=>{
  if(!parentSlug||state.activeParentSlug===parentSlug)return;
  state.activeParentSlug=parentSlug;
  updateParentJumpActiveState();
  renderSubrangeJumpGrid();
  renderPeakJumpLinks();
};

const renderParentJumpLinks=()=>{
  if(!elements.parentJumpLinks)return;
  elements.parentJumpLinks.innerHTML='';

  if(!state.renderedParentGroups.length){
    state.activeParentSlug='';
    renderSubrangeJumpGrid();
    renderPeakJumpLinks();
    return;
  }

  const hasActive=state.renderedParentGroups.some((group)=>group.parentRangeSlug===state.activeParentSlug);
  if(!hasActive)state.activeParentSlug=state.renderedParentGroups[0].parentRangeSlug;

  state.renderedParentGroups.forEach((parentGroup)=>{
    const link=document.createElement('a');
    link.href=`#range-${parentGroup.parentRangeSlug}`;
    link.className='jump-link jump-link--parent';
    link.dataset.parentSlug=parentGroup.parentRangeSlug;

    const label=document.createElement('span');
    label.className='jump-link__label';
    label.textContent=parentGroup.parentRangeName;

    const count=document.createElement('span');
    count.className='jump-link__count';
    count.textContent=`${parentGroup.peakCount} peaks`;

    link.appendChild(label);
    link.appendChild(count);
    setRangeColorVars(link,parentGroup.parentColor);

    link.addEventListener('click',()=>{
      state.activeParentSlug=parentGroup.parentRangeSlug;
      updateParentJumpActiveState();
      renderSubrangeJumpGrid();
      renderPeakJumpLinks();
    });

    elements.parentJumpLinks.appendChild(link);
  });

  updateParentJumpActiveState();
  renderSubrangeJumpGrid();
  renderPeakJumpLinks();
};

const renderFilterChips=()=>{
  if(elements.parentFilterChips){
    elements.parentFilterChips.innerHTML='';
    state.filterParentOptions.forEach((option)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='filter-chip';
      button.dataset.parentSlug=option.slug;
      button.setAttribute('aria-pressed',state.activeParentFilters.has(option.slug)?'true':'false');
      if(state.activeParentFilters.has(option.slug))button.classList.add('is-active');

      const label=document.createElement('span');
      label.className='filter-chip__label';
      label.textContent=option.name;

      const meta=document.createElement('span');
      meta.className='filter-chip__meta';
      meta.textContent=`${option.peakCount}`;

      button.appendChild(label);
      button.appendChild(meta);
      setRangeColorVars(button,option.color);

      button.addEventListener('click',()=>{
        if(state.activeParentFilters.has(option.slug))state.activeParentFilters.delete(option.slug);else state.activeParentFilters.add(option.slug);
        render();
        trackAnalytics('photos_filter_change',{mode:'parent',parent_selected_count:state.activeParentFilters.size,subrange_selected_count:state.activeSubrangeFilters.size});
      });

      elements.parentFilterChips.appendChild(button);
    });
  }

  if(elements.subrangeFilterChips){
    elements.subrangeFilterChips.innerHTML='';
    state.filterSubrangeOptions.forEach((option)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='filter-chip filter-chip--subrange';
      button.dataset.subrangeSlug=option.slug;
      button.dataset.parentSlug=option.parentSlug;
      button.title=option.name;
      button.setAttribute('aria-label',`${option.parentName}: ${option.name}`);
      button.setAttribute('aria-pressed',state.activeSubrangeFilters.has(option.slug)?'true':'false');
      if(state.activeSubrangeFilters.has(option.slug))button.classList.add('is-active');

      const label=document.createElement('span');
      label.className='filter-chip__label';
      label.textContent=getSubrangeLabel(option.name,option.shortLabel,option.parentName);

      const meta=document.createElement('span');
      meta.className='filter-chip__meta';
      meta.textContent=`${option.peakCount}`;

      button.appendChild(label);
      button.appendChild(meta);
      setRangeColorVars(button,option.color);

      button.addEventListener('click',()=>{
        if(state.activeSubrangeFilters.has(option.slug))state.activeSubrangeFilters.delete(option.slug);else state.activeSubrangeFilters.add(option.slug);
        render();
        trackAnalytics('photos_filter_change',{mode:'subrange',parent_selected_count:state.activeParentFilters.size,subrange_selected_count:state.activeSubrangeFilters.size});
      });

      elements.subrangeFilterChips.appendChild(button);
    });
  }
};

const createParentHeading=(parentGroup)=>{
  const header=document.createElement('header');
  header.className='range-heading';
  setRangeColorVars(header,parentGroup.parentColor);

  const titleWrap=document.createElement('div');
  titleWrap.className='range-heading__title-wrap';

  const kicker=document.createElement('p');
  kicker.className='kicker';
  kicker.textContent='Primary Range';

  const title=document.createElement('h2');
  title.textContent=parentGroup.parentRangeName;

  titleWrap.appendChild(kicker);
  titleWrap.appendChild(title);

  const meta=document.createElement('div');
  meta.className='range-heading__meta';

  const peaksPill=document.createElement('p');
  peaksPill.className='range-meta-pill';
  peaksPill.textContent=`${formatNumber(parentGroup.peakCount)} peaks`;

  const photosPill=document.createElement('p');
  photosPill.className='range-meta-pill';
  photosPill.textContent=`${formatNumber(parentGroup.photoCount)} photos`;

  meta.appendChild(peaksPill);
  meta.appendChild(photosPill);

  header.appendChild(titleWrap);
  header.appendChild(meta);
  return header;
};

const createSubrangeHeading=(subrangeGroup,parentGroup)=>{
  const header=document.createElement('header');
  header.className='subrange-heading';
  setRangeColorVars(header,parentGroup.parentColor);

  const textWrap=document.createElement('div');
  textWrap.className='subrange-heading__text';

  const label=document.createElement('p');
  label.className='subrange-label';
  label.title=subrangeGroup.subrangeName;
  label.textContent=getSubrangeLabel(subrangeGroup.subrangeName,subrangeGroup.subrangeShortLabel,parentGroup.parentRangeName);

  const full=document.createElement('p');
  full.className='subrange-full-name';
  full.textContent=subrangeGroup.subrangeName;

  textWrap.appendChild(label);
  textWrap.appendChild(full);

  const meta=document.createElement('p');
  meta.className='subrange-meta';
  meta.textContent=`${formatNumber(subrangeGroup.peakCount)} peaks | ${formatNumber(subrangeGroup.photoCount)} photos`;

  header.appendChild(textWrap);
  header.appendChild(meta);
  return header;
};

const createPeakSection=(peak,parentColor)=>{
  const peakSection=document.createElement('article');
  peakSection.className='peak-section reveal-target';
  peakSection.id=`peak-${peak.slug}`;
  peakSection.dataset.parentSlug=peak.parentRangeSlug;
  peakSection.dataset.subrangeSlug=peak.subrangeSlug;
  peakSection.dataset.peakSlug=peak.slug;
  setRangeColorVars(peakSection,parentColor);

  const header=document.createElement('header');
  header.className='peak-header';

  const heading=document.createElement('h4');
  heading.className='peak-heading';
  heading.textContent=peak.name;

  const meta=document.createElement('div');
  meta.className='peak-meta';

  const elevation=document.createElement('p');
  elevation.className='peak-meta__pill';
  elevation.textContent=`${formatNumber(peak.elevation)} ft`;

  const photos=document.createElement('p');
  photos.className='peak-meta__pill';
  photos.textContent=`${formatNumber(peak.photoCount)} photos`;

  const peakLink=document.createElement('a');
  peakLink.className='peak-link';
  peakLink.href=peak.peakUrl;
  peakLink.textContent='Open Peak Page';

  meta.appendChild(elevation);
  meta.appendChild(photos);
  meta.appendChild(peakLink);

  header.appendChild(heading);
  header.appendChild(meta);

  const grid=document.createElement('div');
  grid.className=`photo-grid ${getLayoutClass(peak.photoCount)}`;

  peak.photos.forEach((photo,photoIndex)=>{
    const figure=document.createElement('figure');
    figure.className=getTileClasses(peak.photoCount,photoIndex).join(' ');

    const button=document.createElement('button');
    button.type='button';
    button.className='photo-tile';
    button.dataset.peakSlug=peak.slug;
    button.dataset.photoIndex=String(photoIndex);
    button.setAttribute('aria-label',`${peak.name} photo ${photoIndex+1}`);

    const image=document.createElement('img');
    image.loading='lazy';
    image.decoding='async';
    image.src=photo.listUrl||photo.originalUrl;
    image.alt=photo.alt;

    const caption=document.createElement('figcaption');
    caption.className='photo-figure__caption';
    caption.textContent=photo.caption;

    button.appendChild(image);
    figure.appendChild(button);
    figure.appendChild(caption);
    grid.appendChild(figure);
  });

  peakSection.appendChild(header);
  peakSection.appendChild(grid);
  return peakSection;
};

const renderGallery=(parentGroups)=>{
  if(!elements.container)return;
  elements.container.innerHTML='';
  if(elements.empty)elements.empty.hidden=parentGroups.length>0;

  if(!parentGroups.length){connectRevealObserver();connectRangeObserver();return;}

  parentGroups.forEach((parentGroup)=>{
    const parentSection=document.createElement('section');
    parentSection.className='range-section reveal-target';
    parentSection.id=`range-${parentGroup.parentRangeSlug}`;
    parentSection.dataset.parentSlug=parentGroup.parentRangeSlug;
    setRangeColorVars(parentSection,parentGroup.parentColor);

    parentSection.appendChild(createParentHeading(parentGroup));

    const subrangeStack=document.createElement('div');
    subrangeStack.className='subrange-stack';

    parentGroup.subranges.forEach((subrangeGroup)=>{
      const subrangeSection=document.createElement('article');
      subrangeSection.className='subrange-section reveal-target';
      subrangeSection.id=`subrange-${subrangeGroup.subrangeSlug}`;
      subrangeSection.dataset.parentSlug=parentGroup.parentRangeSlug;
      subrangeSection.dataset.subrangeSlug=subrangeGroup.subrangeSlug;
      setRangeColorVars(subrangeSection,parentGroup.parentColor);

      subrangeSection.appendChild(createSubrangeHeading(subrangeGroup,parentGroup));
      subrangeGroup.peaks.forEach((peak)=>subrangeSection.appendChild(createPeakSection(peak,parentGroup.parentColor)));

      subrangeStack.appendChild(subrangeSection);
    });

    parentSection.appendChild(subrangeStack);
    elements.container.appendChild(parentSection);
  });

  connectRevealObserver();
  connectRangeObserver();
};

const render=()=>{
  const filteredPeaks=filterPeaks();
  const parentGroups=groupPeaks(filteredPeaks,state.sort);
  state.renderedParentGroups=parentGroups;

  updateStats(parentGroups);
  renderParentJumpLinks();
  renderFilterChips();
  renderGallery(parentGroups);

  if(!state.hasAppliedInitialHash){state.hasAppliedInitialHash=true;applyHashSelection();}
};

const setRangeMode=(mode)=>{
  const nextMode=mode==='filter'?'filter':'jump';
  state.rangeMode=nextMode;

  if(elements.tabJump){const active=nextMode==='jump';elements.tabJump.classList.toggle('is-active',active);elements.tabJump.setAttribute('aria-selected',active?'true':'false');}
  if(elements.tabFilter){const active=nextMode==='filter';elements.tabFilter.classList.toggle('is-active',active);elements.tabFilter.setAttribute('aria-selected',active?'true':'false');}
  if(elements.jumpPanel){const active=nextMode==='jump';elements.jumpPanel.hidden=!active;elements.jumpPanel.classList.toggle('is-active',active);}
  if(elements.filterPanel){const active=nextMode==='filter';elements.filterPanel.hidden=!active;elements.filterPanel.classList.toggle('is-active',active);}
};

const connectRevealObserver=()=>{
  if(state.revealObserver){state.revealObserver.disconnect();state.revealObserver=null;}

  const revealTargets=document.querySelectorAll('.reveal-target');
  if(prefersReducedMotion||!revealTargets.length){revealTargets.forEach((node)=>node.classList.add('is-visible'));return;}

  state.revealObserver=new IntersectionObserver((entries,observer)=>{
    entries.forEach((entry)=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  },{threshold:0.18});

  revealTargets.forEach((node)=>state.revealObserver.observe(node));
};

const connectRangeObserver=()=>{
  if(state.rangeObserver){state.rangeObserver.disconnect();state.rangeObserver=null;}

  const rangeSections=Array.from(document.querySelectorAll('.range-section'));
  if(!rangeSections.length)return;

  state.rangeObserver=new IntersectionObserver((entries)=>{
    const visible=entries.filter((entry)=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(!visible.length)return;
    const nextParent=visible[0].target?.dataset?.parentSlug;
    if(nextParent)setActiveParent(nextParent);
  },{threshold:[0.2,0.4,0.65],rootMargin:'-10% 0px -55% 0px'});

  rangeSections.forEach((section)=>state.rangeObserver.observe(section));
};

const getPeakBySlug=(peakSlug)=>state.peaks.find((peak)=>peak.slug===peakSlug);

const setLightboxOpen=(open)=>{
  if(!elements.lightbox)return;
  state.lightbox.open=open;
  elements.lightbox.hidden=!open;
  elements.lightbox.setAttribute('aria-hidden',open?'false':'true');
  document.body.classList.toggle('lightbox-open',open);
};

const renderLightboxFrame=()=>{
  const peak=getPeakBySlug(state.lightbox.peakSlug);
  if(!peak||!peak.photos.length)return;

  const index=Math.max(0,Math.min(state.lightbox.index,peak.photos.length-1));
  state.lightbox.index=index;
  const activePhoto=peak.photos[index];

  if(elements.lightboxImage){elements.lightboxImage.src=activePhoto.lightboxUrl||activePhoto.originalUrl;elements.lightboxImage.alt=activePhoto.alt;}
  if(elements.lightboxCaption)elements.lightboxCaption.textContent=activePhoto.caption;
  if(elements.lightboxMeta){const subrangeLabel=peak.subrangeName===peak.parentRangeName?peak.parentRangeName:`${peak.parentRangeName} | ${peak.subrangeName}`;elements.lightboxMeta.textContent=`${subrangeLabel} | ${peak.name}`;}
  if(elements.lightboxCounter)elements.lightboxCounter.textContent=`${index+1} of ${peak.photos.length}`;

  if(elements.lightboxPeakLink){elements.lightboxPeakLink.href=peak.peakUrl;elements.lightboxPeakLink.textContent=`Open ${peak.name} Page`;}
  if(elements.lightboxPrev)elements.lightboxPrev.disabled=index<=0;
  if(elements.lightboxNext)elements.lightboxNext.disabled=index>=peak.photos.length-1;
};

const openLightbox=(peakSlug,photoIndex)=>{
  const peak=getPeakBySlug(peakSlug);
  if(!peak||!peak.photos.length)return;
  state.lightbox.peakSlug=peakSlug;
  state.lightbox.index=Number(photoIndex)||0;
  renderLightboxFrame();
  setLightboxOpen(true);
  trackAnalytics('photos_lightbox_open',{peak_slug:peak.slug,index:state.lightbox.index+1,total_for_peak:peak.photos.length});
};

const closeLightbox=()=>{setLightboxOpen(false);if(elements.lightboxImage)elements.lightboxImage.src='';};

const moveLightbox=(delta)=>{
  if(!state.lightbox.open)return;
  const peak=getPeakBySlug(state.lightbox.peakSlug);
  if(!peak)return;
  const nextIndex=state.lightbox.index+delta;
  if(nextIndex<0||nextIndex>=peak.photos.length)return;
  state.lightbox.index=nextIndex;
  renderLightboxFrame();
  trackAnalytics('photos_lightbox_nav',{peak_slug:peak.slug,direction:delta<0?'prev':'next',index:state.lightbox.index+1});
};

const applyHashSelection=()=>{
  const hash=(window.location.hash||'').replace('#','');
  if(!hash)return;

  if(hash.startsWith('range-')){const parentSlug=hash.replace('range-','');if(getRenderedParentGroup(parentSlug))setActiveParent(parentSlug);}
  if(hash.startsWith('subrange-')){const subrangeSlug=hash.replace('subrange-','');const parentSlug=findParentSlugForSubrange(subrangeSlug);if(parentSlug)setActiveParent(parentSlug);}
  if(hash.startsWith('peak-')){const peakSlug=hash.replace('peak-','');const peak=getPeakBySlug(peakSlug);if(peak)setActiveParent(peak.parentRangeSlug);}

  const target=document.getElementById(hash);
  if(target){target.scrollIntoView({behavior:prefersReducedMotion?'auto':'smooth',block:'start'});}
};
const buildGallerySchema=()=>{
  if(!elements.schemaScript||!state.peaks.length)return;

  const imageObjects=[];

  state.peaks.forEach((peak)=>{
    peak.photos.forEach((photo,photoIndex)=>{
      const id=`${SITE_URL}/photos/#${photo.id}`;
      const parentPlace={'@type':'Place',name:peak.parentRangeName};
      const containedInPlace=peak.subrangeName&&peak.subrangeName!==peak.parentRangeName
        ? {'@type':'Place',name:peak.subrangeName,containedInPlace:parentPlace}
        : parentPlace;

      imageObjects.push({
        '@type':'ImageObject',
        '@id':id,
        url:photo.lightboxUrl||photo.originalUrl,
        contentUrl:photo.originalUrl,
        thumbnailUrl:photo.listUrl||photo.originalUrl,
        name:`${peak.name} photo ${photoIndex+1}`,
        caption:photo.caption,
        description:photo.description,
        inLanguage:'en',
        license:LICENSE_URL,
        acquireLicensePage:`${SITE_URL}/contact`,
        creditText:'(c) Nathan Sobol / NH48pics.com',
        creator:{'@type':'Person',name:'Nathan Sobol',url:`${SITE_URL}/about`},
        isPartOf:{'@id':`${SITE_URL}/photos/#image-gallery`},
        about:{'@type':'Place',name:peak.name,containedInPlace}
      });
    });
  });

  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'CollectionPage',
        '@id':`${SITE_URL}/photos/#collection-page`,
        url:`${SITE_URL}/photos/`,
        name:'NH48 Summit Photo Collection',
        description:'Browse all NH48 summit photos grouped by range and peak.',
        inLanguage:'en',
        primaryImageOfPage:imageObjects.length?{'@id':imageObjects[0]['@id']}:undefined,
        hasPart:[{'@id':`${SITE_URL}/photos/#image-gallery`}]
      },
      {
        '@type':'ImageGallery',
        '@id':`${SITE_URL}/photos/#image-gallery`,
        name:'NH48 Summit Photo Gallery',
        description:'Cinematic segmented gallery of all NH48 summit photography.',
        url:`${SITE_URL}/photos/`,
        numberOfItems:imageObjects.length,
        associatedMedia:imageObjects.map((imageObject)=>({'@id':imageObject['@id']}))
      },
      ...imageObjects
    ]
  };

  elements.schemaScript.textContent=JSON.stringify(schema).replace(/</g,'\\u003c');
};

const buildTopoHeightField=(x,y,cols,rows,phase)=>{
  const nx=(x/cols)*(Math.PI*2);
  const ny=(y/rows)*(Math.PI*2);
  let height=0;
  height+=0.94*Math.sin((1.18*nx)+0.42+(phase*0.24))*Math.cos((1.36*ny)+0.31-(phase*0.17));
  height+=0.58*Math.sin((2.14*nx)+1.73-(phase*0.12))*Math.cos((1.82*ny)+0.57+(phase*0.18));
  height+=0.29*Math.sin((3.37*nx)+0.86+(phase*0.09))*Math.cos((2.91*ny)+1.12-(phase*0.11));
  return height;
};

const sampleTopoField=(cols,rows,phase)=>{
  const samples=[];
  for(let y=0;y<=rows;y+=1){
    const row=[];
    for(let x=0;x<=cols;x+=1)row.push(buildTopoHeightField(x,y,cols,rows,phase));
    samples.push(row);
  }
  return samples;
};

const interpolatePoint=(edge,x,y,values,level,cellWidth,cellHeight)=>{
  const [v0,v1,v2,v3]=values;
  const corners=[{x,y,value:v0},{x:x+1,y,value:v1},{x:x+1,y:y+1,value:v2},{x,y:y+1,value:v3}];
  let first=null;let second=null;
  if(edge===0){first=corners[0];second=corners[1];}
  else if(edge===1){first=corners[1];second=corners[2];}
  else if(edge===2){first=corners[3];second=corners[2];}
  else {first=corners[0];second=corners[3];}

  const denominator=second.value-first.value;
  const t=Math.abs(denominator)<1e-6?0.5:(level-first.value)/denominator;
  const clamped=Math.max(0,Math.min(1,t));
  return {x:((first.x+((second.x-first.x)*clamped))*cellWidth),y:((first.y+((second.y-first.y)*clamped))*cellHeight)};
};

const buildContourPath=(samples,cols,rows,width,height,level)=>{
  const cellWidth=width/cols;
  const cellHeight=height/rows;
  const segments=[];

  for(let y=0;y<rows;y+=1){
    for(let x=0;x<cols;x+=1){
      const v0=samples[y][x];
      const v1=samples[y][x+1];
      const v2=samples[y+1][x+1];
      const v3=samples[y+1][x];
      let mask=0;
      if(v0>level)mask|=1;
      if(v1>level)mask|=2;
      if(v2>level)mask|=4;
      if(v3>level)mask|=8;
      const edgePairs=CASE_TABLE[mask];
      if(!edgePairs)continue;

      edgePairs.forEach(([edgeA,edgeB])=>{
        const pointA=interpolatePoint(edgeA,x,y,[v0,v1,v2,v3],level,cellWidth,cellHeight);
        const pointB=interpolatePoint(edgeB,x,y,[v0,v1,v2,v3],level,cellWidth,cellHeight);
        segments.push(`M${pointA.x.toFixed(2)} ${pointA.y.toFixed(2)}L${pointB.x.toFixed(2)} ${pointB.y.toFixed(2)}`);
      });
    }
  }

  return segments.join('');
};

const drawHeroContours=()=>{
  if(!elements.heroTopo)return;
  const bounds=elements.heroTopo.getBoundingClientRect();
  const width=Math.max(640,Math.round(bounds.width||1200));
  const height=Math.max(200,Math.round(bounds.height||300));
  const cols=Math.max(28,Math.round(width/26));
  const rows=Math.max(14,Math.round(height/24));

  elements.heroTopo.setAttribute('viewBox',`0 0 ${width} ${height}`);
  elements.heroTopo.setAttribute('preserveAspectRatio','none');

  const layers=[{phase:state.topoPhase,className:'topo-layer topo-layer--a',opacity:0.26},{phase:state.topoPhase+1.08,className:'topo-layer topo-layer--b',opacity:0.16}];
  let markup='';

  layers.forEach((layer)=>{
    const samples=sampleTopoField(cols,rows,layer.phase);
    markup+=`<g class="${layer.className}" style="opacity:${layer.opacity}">`;
    TOPO_LEVELS.forEach((level,index)=>{
      const pathData=buildContourPath(samples,cols,rows,width,height,level);
      if(!pathData)return;
      markup+=`<path class="topo-path topo-path--${(index%3)+1}" d="${pathData}" />`;
    });
    markup+='</g>';
  });

  elements.heroTopo.innerHTML=markup;
};

const initHeroContours=()=>{
  if(!elements.heroTopo)return;
  drawHeroContours();

  if(!prefersReducedMotion){
    if(state.topoTimer)clearInterval(state.topoTimer);
    state.topoTimer=window.setInterval(()=>{state.topoPhase+=0.22;drawHeroContours();},2200);
  }

  window.addEventListener('resize',()=>{
    if(state.topoResizeTimer)clearTimeout(state.topoResizeTimer);
    state.topoResizeTimer=window.setTimeout(()=>drawHeroContours(),160);
  });
};

const init=async()=>{
  if(elements.loading)elements.loading.hidden=false;

  try{
    const [peakData,taxonomyData]=await Promise.all([fetchPeaks(),fetchTaxonomy()]);
    state.taxonomy=buildTaxonomy(taxonomyData||{});
    state.peaks=buildPeakList(peakData,state.taxonomy);

    const options=buildFilterOptions(state.peaks);
    state.filterParentOptions=options.parentOptions;
    state.filterSubrangeOptions=options.subrangeOptions;

    if(!state.activeParentSlug&&state.filterParentOptions.length)state.activeParentSlug=state.filterParentOptions[0].slug;

    buildGallerySchema();
    initHeroContours();
    setRangeMode('jump');
    render();
  }catch(error){
    console.error(error);
    if(elements.empty){elements.empty.hidden=false;elements.empty.textContent='Unable to load photos right now.';}
    if(elements.viewStatus)elements.viewStatus.textContent='Unable to load the NH48 photo archive.';
  }finally{
    if(elements.loading)elements.loading.hidden=true;
  }
};

if(elements.search){
  let searchDebounce=null;
  elements.search.addEventListener('input',(event)=>{
    state.search=event.target.value||'';
    render();

    if(searchDebounce)clearTimeout(searchDebounce);
    const searchLength=state.search.trim().length;
    searchDebounce=setTimeout(()=>trackAnalytics('photos_search',{search_length:searchLength}),350);
  });
}

if(elements.sort){
  elements.sort.addEventListener('change',(event)=>{
    state.sort=event.target.value||'range';
    render();
    trackAnalytics('photos_sort_change',{sort:state.sort});
  });
}

if(elements.rangeModeTabs){
  elements.rangeModeTabs.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-range-tab]');
    if(!button)return;
    setRangeMode(button.dataset.rangeTab==='filter'?'filter':'jump');
  });
}

if(elements.container){
  elements.container.addEventListener('click',(event)=>{
    const trigger=event.target.closest('button.photo-tile');
    if(!trigger)return;
    const peakSlug=trigger.dataset.peakSlug;
    const photoIndex=Number(trigger.dataset.photoIndex||0);
    if(!peakSlug)return;
    openLightbox(peakSlug,photoIndex);
  });
}

if(elements.lightboxPrev)elements.lightboxPrev.addEventListener('click',()=>moveLightbox(-1));
if(elements.lightboxNext)elements.lightboxNext.addEventListener('click',()=>moveLightbox(1));

if(elements.lightbox){
  elements.lightbox.addEventListener('click',(event)=>{if(event.target.closest('[data-lightbox-close]'))closeLightbox();});
}

window.addEventListener('hashchange',()=>applyHashSelection());

document.addEventListener('keydown',(event)=>{
  if(!state.lightbox.open)return;
  if(event.key==='Escape'){closeLightbox();return;}
  if(event.key==='ArrowLeft'){event.preventDefault();moveLightbox(-1);return;}
  if(event.key==='ArrowRight'){event.preventDefault();moveLightbox(1);}
});

init();
