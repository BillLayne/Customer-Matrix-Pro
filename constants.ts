
import type { Portal, SearchMode } from './types';

/* ============================================================================
   AGENT PORTALS
============================================================================ */
export const DEFAULT_INSURANCE_PORTALS: Portal[] = [
  { id:'agency-matrix', name:'Agency Matrix', url:'https://agents.agencymatrix.com/#/', icon:'fa-solid fa-building', description:'Primary agent portal', color: '#1e293b' },
  { id:'nationwide', name:'Nationwide', url:'https://agentcenter.nationwide.com/home', icon:'fa-solid fa-flag-usa', description:'Agent center portal', image: 'https://img.billlayneinsurance.com/i/2026/10/im-mv5v7tv-rnmj3q.png', color: '#005596' },
  { id:'national-general', name:'National General', url:'https://natgenagency.com/MainMenu.aspx', icon:'fa-solid fa-globe', description:'Agency portal', image: 'https://img.billlayneinsurance.com/i/2026/08/im-hf8opaf-c8yp48.png', color: '#002D72' },
  { id:'progressive', name:'Progressive', url:'https://www.foragentsonly.com/home/?Welcome=400', icon:'fa-solid fa-chart-line', description:'For agents only portal', image: 'https://img.billlayneinsurance.com/i/2026/08/im-7n1vfo0-qb328g.png', color: '#00A1E0' },
  { id:'foremost', name:'Foremost', url:'https://www.foremostagent.com/ia/portal/login', icon:'fa-solid fa-house-user', description:'Agent portal login', image: 'https://img.billlayneinsurance.com/i/2026/08/im-rhio4r5-5t7drm.jpg', color: '#F58220' },
  { id:'nc-grange', name:'NC Grange', url:'https://ncgmweb.com/login', icon:'fa-solid fa-tractor', description:'NC Grange portal', image: 'https://img.billlayneinsurance.com/i/2026/08/im-fesnkng-f7nhhd.png', color: '#2E7D32' }
];

/**
 * The rest of the carriers Bill represents. These sit behind the "More Carriers"
 * menu in the portal drawer so the tile row stays down to the daily-use portals.
 * Logos are served from this repo's public/ folder.
 */
export const MORE_CARRIER_PORTALS: Portal[] = [
  { id:'alamance', name:'Alamance', url:'https://alamance.britecore.com/agent/misc/ko_dashboard', icon:'fa-solid fa-shield-halved', description:'BriteCore dashboard', image:'/alamance.png', color:'#4CAF50' },
  { id:'steadily', name:'Steadily', url:'https://agent.steadily.com/home', icon:'fa-solid fa-house-chimney-user', description:'Landlord insurance agent portal', color:'#2563eb' },
  { id:'travelers', name:'Travelers', url:'https://signin.travelers.com/apps', icon:'fa-solid fa-umbrella', description:'Agent sign-in', image:'/travelers.png', color:'#E01719' },
  { id:'dairyland', name:'Dairyland', url:'https://agent.dairylandagent.com/web/dashboard/my-dashboard?continue', icon:'fa-solid fa-motorcycle', description:'Agent dashboard', image:'/dairyland.png', color:'#0057B8' },
  { id:'allstate', name:'Allstate', url:'https://myconnection1.allstate.com/IA/?CID=OTC-DNSR-GR-120523&att=myallstateconnection', icon:'fa-solid fa-hands-holding-circle', description:'MyConnection agent portal', color:'#0033A0' },
  { id:'docusign', name:'DocuSign', url:'https://app.hellosign.com/', icon:'fa-solid fa-file-signature', description:'E-signature (HelloSign)', color:'#FFB800' },
  { id:'colonial-group', name:'Colonial Group', url:'https://tcgportal.azurewebsites.net/Portal2', icon:'fa-solid fa-building-columns', description:'TCG agent portal', color:'#1e3a8a' },
  { id:'hagerty', name:'Hagerty', url:'https://www.hagertyagent.com/Agent/Home', icon:'fa-solid fa-car-side', description:'Classic car agent portal', image:'/hagerty.png', color:'#C8102E' },
  { id:'ncjua', name:'NCJUA', url:'https://insure.ncjuanciua.org/innovation', icon:'fa-solid fa-house-tsunami', description:'Coastal / FAIR plan portal', color:'#005596' },
  { id:'ncrb', name:'NCRB', url:'https://webportal.ncrb.org/NCRBPortal/PortalHome.aspx', icon:'fa-solid fa-scale-balanced', description:'NC Rate Bureau portal', color:'#6d28d9' }
];

/* ============================================================================
   SEARCH MODES
============================================================================ */
export const MODE_META: Record<SearchMode, { placeholder: string; showTax: boolean }> = {
  agency: { placeholder:'Search Agency Matrix by name or address…', showTax:false },
  web: { placeholder:'Search the web…', showTax:false },
  realestate: { placeholder:'Enter NC property address for NC Insurance Tools…', showTax:true },
  people: { placeholder:'Enter name, phone, or address…', showTax:false },
  onedrive: { placeholder:'Search Client Folder by name…', showTax:false },
  contacts: { placeholder:'Start typing an insurance company name…', showTax:false }
};

/* ============================================================================
   NC COUNTY GIS
============================================================================ */
export const NC_COUNTY_GIS_DATA: Record<string, { name: string; url: string; note?: string }> = {
  surry: { name:'Surry County', url:'https://gis.surryinfo.com/?addr={query}' },
  yadkin: { name:'Yadkin County', url:'http://gis.yadkinshunt.com/yadkingis/?find={query}' },
  wilkes: { name:'Wilkes County', url:'https://gis.wilkescounty.net/wilkesjs/', note:'Manual search required.' },
  forsyth: { name:'Forsyth County', url:'http://www.cityofws.org/maps?find={query}' },
  mecklenburg: { name:'Mecklenburg County', url:'https://polaris3g.mecklenburgcountync.gov/search?str={query}' },
  wake: { name:'Wake County', url:'https://maps.raleighnc.gov/iMAPS/?search={query}' }
};

/* ============================================================================
   QUICK IMAGE LINKS
============================================================================ */
export const LOCAL_STORAGE_HISTORY_KEY = 'quicklink-upload-history';
