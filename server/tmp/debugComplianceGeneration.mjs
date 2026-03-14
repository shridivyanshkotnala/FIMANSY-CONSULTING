import '../loadEnv.js';
import connectDB from '../src/db/index.js';
import { ComplianceTemplate } from '../src/models/compliance/complianceTemplateModel.js';
import { CompanyComplianceProfile } from '../src/models/compliance/companyComplianceProfileModel.js';
import { ComplianceObligation } from '../src/models/compliance/complianceObligationModel.js';
import { generateObligationsForFY } from '../src/Functions/complianceMainEngine.js';

const org = process.argv[2] || '6996b3589aa01d0645465244';
const fy = process.argv[3] || '2025-2026';

await connectDB();

const profile = await CompanyComplianceProfile.findOne({ organization_id: org }).lean();
console.log('profile?', !!profile, profile?._id?.toString(), profile?.company_type, profile?.obligations_generated);

const templates = await ComplianceTemplate.find({ is_active: true })
  .select('name compliance_category compliance_subtype recurrence_type recurrence_config')
  .lean();

console.log('templates', templates.length);
for (const t of templates.slice(0, 20)) {
  console.log('-', t.name, t.compliance_category, t.compliance_subtype, t.recurrence_type, JSON.stringify(t.recurrence_config));
}

const before = await ComplianceObligation.countDocuments({ organization_id: org });
console.log('obligations before', before);

try {
  const generated = await generateObligationsForFY(org, fy);
  console.log('generated', generated);
} catch (e) {
  console.error('generate error:', e.message);
  console.error(e);
}

const after = await ComplianceObligation.countDocuments({ organization_id: org });
console.log('obligations after', after);
process.exit(0);
