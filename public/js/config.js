'use strict'

const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || ''
const SUPABASE_KEY = window.__ENV__?.SUPABASE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[config] Supabase credentials missing — check Vercel environment variables')
}

const SUFFERING = [
  {v:'tooth_decay',      ar:'تسوس الأسنان',         en:'Tooth Decay'},
  {v:'toothache',        ar:'ألم الأسنان',           en:'Toothache'},
  {v:'gum_disease',      ar:'أمراض اللثة',           en:'Gum Disease'},
  {v:'gum_inflammation', ar:'التهاب اللثة',          en:'Gum Inflammation'},
  {v:'orthodontics',     ar:'تقويم الأسنان',         en:'Orthodontics'},
  {v:'whitening',        ar:'تبييض الأسنان',         en:'Whitening'},
  {v:'extraction',       ar:'خلع الأسنان',           en:'Extraction'},
  {v:'implant',          ar:'زراعة الأسنان',         en:'Implants'},
  {v:'sensitivity',      ar:'حساسية الأسنان',        en:'Sensitivity'},
  {v:'broken_tooth',     ar:'كسر في السنة',          en:'Broken Tooth'},
  {v:'root_canal',       ar:'علاج العصب',            en:'Root Canal'},
  {v:'jaw_pain',         ar:'ألم الفك',              en:'Jaw Pain'},
  {v:'wisdom_tooth',     ar:'ضرس العقل',             en:'Wisdom Tooth'},
  {v:'mouth_sores',      ar:'قروح الفم',             en:'Mouth Sores'},
  {v:'bad_breath',       ar:'رائحة الفم',            en:'Bad Breath'},
  {v:'other',            ar:'حاجة تانية',            en:'Other'},
]

const CHRONIC_CATEGORIES = [
  { category:{ar:'القلب والأوعية الدموية',en:'Cardiovascular'}, items:[
    {v:'cad',ar:'مرض الشريان التاجي',en:'Coronary Artery Disease'},{v:'heart_failure',ar:'فشل القلب',en:'Heart Failure'},
    {v:'hypertension',ar:'ضغط الدم العالي',en:'Hypertension'},{v:'atherosclerosis',ar:'تصلب الشرايين',en:'Atherosclerosis'},{v:'stroke',ar:'جلطة دماغية',en:'Stroke'},
  ]},
  { category:{ar:'السكري والغدد',en:'Diabetes & Endocrine'}, items:[
    {v:'diabetes_t1',ar:'سكري النوع الأول',en:'Type 1 Diabetes'},{v:'diabetes_t2',ar:'سكري النوع التاني',en:'Type 2 Diabetes'},
    {v:'hypothyroid',ar:'قصور الغدة الدرقية',en:'Hypothyroidism'},{v:'hyperthyroid',ar:'نشاط زيادة في الغدة الدرقية',en:'Hyperthyroidism'},
  ]},
  { category:{ar:'الجهاز التنفسي',en:'Respiratory'}, items:[
    {v:'asthma',ar:'الربو',en:'Asthma'},{v:'copd',ar:'انسداد رئوي مزمن (COPD)',en:'COPD'},
    {v:'bronchitis',ar:'التهاب شعب هوائية مزمن',en:'Chronic Bronchitis'},{v:'emphysema',ar:'انتفاخ الرئة',en:'Emphysema'},
  ]},
  { category:{ar:'الجهاز العصبي',en:'Neurological'}, items:[
    {v:'alzheimer',ar:'ألزهايمر',en:"Alzheimer's Disease"},{v:'parkinson',ar:'شلل رعاش',en:"Parkinson's Disease"},
    {v:'ms',ar:'التصلب المتعدد',en:'Multiple Sclerosis'},{v:'epilepsy',ar:'صرع',en:'Epilepsy'},
  ]},
  { category:{ar:'العظام والمفاصل',en:'Musculoskeletal'}, items:[
    {v:'osteoporosis',ar:'هشاشة العظام',en:'Osteoporosis'},{v:'rheumatoid',ar:'روماتويد',en:'Rheumatoid Arthritis'},
    {v:'osteoarthritis',ar:'خشونة المفاصل',en:'Osteoarthritis'},
  ]},
  { category:{ar:'أمراض الدم',en:'Blood Disorders'}, items:[
    {v:'anemia',ar:'أنيميا مزمنة',en:'Chronic Anemia'},{v:'thalassemia',ar:'ثلاسيميا',en:'Thalassemia'},
    {v:'hemophilia',ar:'هيموفيليا',en:'Hemophilia'},
  ]},
  { category:{ar:'المناعة الذاتية والجهاز الهضمي',en:'Autoimmune & GI'}, items:[
    {v:'lupus',ar:'ذئبة حمراء',en:'Lupus'},{v:'ibd',ar:'التهاب الأمعاء المزمن',en:'IBD'},
    {v:'crohn',ar:'مرض كرون',en:"Crohn's Disease"},{v:'uc',ar:'التهاب القولون',en:'Ulcerative Colitis'},
  ]},
  { category:{ar:'الكلى والكبد',en:'Kidney & Liver'}, items:[
    {v:'ckd',ar:'فشل كلوي مزمن',en:'Chronic Kidney Disease'},{v:'cirrhosis',ar:'تليف الكبد',en:'Liver Cirrhosis'},
    {v:'hepatitis',ar:'التهاب كبد مزمن',en:'Chronic Hepatitis'},
  ]},
]

const CHRONIC_ALL = CHRONIC_CATEGORIES.flatMap(c => c.items)

function sufLabel(v) {
  const x = SUFFERING.find(s => s.v === v)
  if (x) return getLang() === 'ar' ? x.ar : x.en
  const y = CHRONIC_ALL.find(s => s.v === v)
  if (y) return getLang() === 'ar' ? y.ar : y.en
  return v
}

const AppState = {
  session:      null,
  doctor:       null,
  isAdmin:      false,
  isSuperAdmin: false,
  adminRole:    null,
  adminPerms:   null,
  sessionId:    null,
}

function canDo(perm) {
  if (!AppState.isAdmin)      return false
  if (AppState.isSuperAdmin)  return true
  if (!AppState.adminPerms)   return false
  return !!AppState.adminPerms[perm]
}
