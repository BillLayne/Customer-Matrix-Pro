import type { Portal, SearchMode } from './types';

export const DEFAULT_INSURANCE_PORTALS: Portal[] = [
  { id:"agency-matrix", name:"Agency Matrix", url:"https://agents.agencymatrix.com/#/", icon:"fa-solid fa-building", description:"Primary agent portal" },
  { id:"nationwide", name:"Nationwide", url:"https://agentcenter.nationwide.com/home", icon:"fa-solid fa-flag-usa", description:"Agent center portal" },
  { id:"national-general", name:"National General", url:"https://natgenagency.com/MainMenu.aspx", icon:"fa-solid fa-globe", description:"Agency portal" },
  { id:"progressive", name:"Progressive", url:"https://www.foragentsonly.com/home/?Welcome=400", icon:"fa-solid fa-chart-line", description:"For agents only portal" },
  { id:"foremost", name:"Foremost", url:"https://www.foremostagent.com/ia/portal/login", icon:"fa-solid fa-house-user", description:"Agent portal login" },
  { id:"alamance", name:"Alamance", url:"https://alamance.britecore.com/agent/misc/ko_dashboard", icon:"fa-solid fa-shield-halved", description:"BriteCore dashboard" },
  { id:"nc-grange", name:"NC Grange", url:"https://ncgm.com/", icon:"fa-solid fa-tractor", description:"NC Grange portal" }
];

export const MODE_META: Record<SearchMode, { placeholder: string; showTax: boolean }> = {
  agency: { placeholder:"Search Agency Matrix by name or address…", showTax:false },
  web: { placeholder:"Search the web…", showTax:false },
  realestate: { placeholder:"Enter full address (City, NC, County)…", showTax:true },
  people: { placeholder:"Enter name, phone, or address…", showTax:false },
  onedrive: { placeholder:"Search OneDrive files…", showTax:false }
};

export const NC_COUNTY_GIS_DATA: Record<string, { name: string; url: string; note?: string }> = {
    'surry': { name: 'Surry County', url: 'https://gis.surryinfo.com/?addr={query}' },
    'yadkin': { name: 'Yadkin County', url: 'http://gis.yadkinshunt.com/yadkingis/?find={query}' },
    'wilkes': { name: 'Wilkes County', url: 'https://gis.wilkescounty.net/wilkesjs/', note: 'Manual search required on site.' },
    'forsyth': { name: 'Forsyth County', url: 'http://www.cityofws.org/maps?find={query}'},
    'mecklenburg': { name: 'Mecklenburg County', url: 'https://polaris3g.mecklenburgcountync.gov/search?str={query}'},
    'wake': { name: 'Wake County', url: 'https://maps.raleighnc.gov/iMAPS/?search={query}'},
};


export const PROMPT_TEMPLATES: Record<string, { title: string; prompt: string }> = {
  quote: {
    title: "Generate Quote Comparison",
    prompt: "I need to create a comprehensive insurance quote comparison for a customer. Please help me analyze and present the following options:\n\nCustomer Details:\n[Enter customer name, age, location]\n\nCoverage Needed:\n[Auto/Home/Life/etc.]\n\nCarriers to Compare:\n- Nationwide\n- Progressive\n- [Other carriers]\n\nPlease provide a clear comparison table with coverage limits, deductibles, and annual premiums. Include pros/cons for each option and a recommendation based on the customer's needs."
  },
  coverage: {
    title: "Explain Coverage",
    prompt: "Please explain the following insurance coverage in simple, customer-friendly terms:\n\nCoverage Type: [Enter coverage type - e.g., Comprehensive, Collision, Liability, Umbrella]\n\nCustomer Situation: [Brief description of customer's needs/concerns]\n\nInclude:\n1. What this coverage protects\n2. Common scenarios when it's used\n3. What's NOT covered\n4. Typical cost factors\n5. NC-specific requirements or considerations\n\nKeep the explanation clear for someone without insurance knowledge."
  },
  claim: {
    title: "Draft Claim Letter",
    prompt: "Help me draft a professional claim letter/email:\n\nClaim Type: [Auto accident/Property damage/etc.]\n\nCarrier: [Insurance company name]\n\nSituation:\n[Describe the incident, date, parties involved]\n\nDesired Outcome:\n[What resolution we're seeking]\n\nTone: Professional but firm, advocating for our client.\n\nInclude all necessary claim information and documentation references."
  },
  email: {
    title: "Customer Email",
    prompt: "Draft a professional email to a customer:\n\nPurpose: [Renewal reminder/Policy change/Follow-up/etc.]\n\nCustomer: [Name and brief context]\n\nKey Points to Cover:\n[List main points]\n\nDesired Action:\n[What we want the customer to do]\n\nTone: Friendly, professional, and helpful. Sign off as our agency."
  },
  "nc-law": {
    title: "NC Insurance Law Research",
    prompt: "Research North Carolina insurance law/regulation regarding:\n\nTopic: [Specific law, requirement, or regulation question]\n\nContext: [Why this information is needed]\n\nPlease provide:\n1. Current NC law/regulation\n2. Key requirements for insurance agents\n3. How this compares to neighboring states\n4. Recent changes or pending legislation\n5. Practical implications for our customers.\n\nCite sources when possible."
  },
  renewal: {
    title: "Renewal Notice",
    prompt: "Create a renewal notice/reminder for:\n\nCustomer: [Name]\nPolicy Type: [Auto/Home/etc.]\nCurrent Carrier: [Carrier name]\nRenewal Date: [Date]\n\nInclude:\n1. Friendly renewal reminder\n2. Current coverage summary\n3. Any rate changes and explanation\n4. Opportunity to review/update coverage\n5. Call to action to contact office."
  },
  receipt: {
    title: "Create Payment Receipt",
    prompt: "I need to create a professional payment receipt for a client.\n\nCustomer Name: [Enter customer name]\nPayment Amount: [Enter amount]\nPayment Date: [Enter date]\nPolicy Number(s): [Enter policy number(s)]\nPayment Method: [e.g., Check, Credit Card, EFT]\n\nPlease generate a clean, professional receipt acknowledging this payment. Include our agency branding and contact information. Thank the customer for their payment."
  },
  "late-notice": {
    title: "Draft Late Payment Notice",
    prompt: "I need to draft a professional but friendly late payment notice.\n\nCustomer Name: [Enter customer name]\nPolicy Number(s): [Enter policy number(s)]\nAmount Due: [Enter amount]\nOriginal Due Date: [Enter date]\n\nPlease create a reminder email. The tone should be helpful, not threatening. Remind them of the importance of keeping their coverage active and provide clear instructions on how to make a payment (e.g., call our office, pay online). Include a grace period if applicable."
  },
  "proof-of-insurance": {
    title: "Generate Proof of Insurance",
    prompt: "I need to generate a proof of insurance document for a client. The AI should determine if it's for home, auto, or another policy based on the details provided.\n\nCustomer Name: [Enter customer name]\nPolicy Number: [Enter policy number]\nPolicy Type & Details: [e.g., '2023 Honda CRV, VIN...', or 'Homeowners policy for 123 Main St', or 'General Liability for ABC Company']\nPolicy Period: [e.g., 01/01/2024 to 01/01/2025]\nInterested Party / Lienholder (if any): [Enter name and address]\n\nPlease create a standard proof of insurance document. Include all necessary details: our agency information, the carrier, the insured's information, the policy details, and effective dates."
  }
};

export const CARRIER_CONTEXTS: Record<string, string> = {
  nationwide: "\n\nCarrier Context: Nationwide Insurance\n- On Your Side® commitment\n- Vanishing deductible options\n- Brand New Belongings®\n- Accident forgiveness\n- SmartRide® discount program",
  progressive: "\n\nCarrier Context: Progressive Insurance\n- Name Your Price® tool\n- Snapshot® program\n- Bundle discounts\n- 24/7 claims service\n- Gap coverage available",
  alamance: "\n\nCarrier Context: Alamance Insurance\n- North Carolina mutual company\n- Focus on homeowners and farm insurance\n- Local claims handling\n- Competitive rates for rural properties",
  foremost: "\n\nCarrier Context: Foremost Insurance\n- Specializes in manufactured/mobile homes\n- Vacant property coverage\n- Seasonal homes\n- Landlord/rental property options"
};