import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";
import mongoose from "mongoose";

/**
 * Get conditional templates with their obligation status
 * This is what the frontend tab will call
 */
export const getConditionalCompliances = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required"
      });
    }

    // Get all conditional templates
    const templates = await ComplianceTemplate.find({ 
      trigger_type: "conditional", 
      is_active: true 
    }).lean();

    // Get existing obligations for this org and FY
    const obligations = await ComplianceObligation.find({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      financial_year: financialYear
    }).lean();

    // Create a map of obligations by compliance_subtype
    const obligationsMap = new Map();
    obligations.forEach(ob => {
      obligationsMap.set(ob.compliance_subtype, ob);
    });

    // Combine template data with obligation status
    const conditionalItems = templates.map(template => {
      const existingObligation = obligationsMap.get(template.compliance_subtype);
      
      return {
        // Template fields
        _id: template._id,
        name: template.name,
        compliance_category: template.compliance_category,
        compliance_subtype: template.compliance_subtype,
        compliance_description: template.compliance_description,
        recurrence_config: template.recurrence_config,
        
        // For UI display (derived from template)
        primaryTag: template.compliance_category?.toUpperCase() || 'Other',
        secondaryTag: 'Conditional',
        applicability_info: getApplicabilityInfo(template),
        due_date_rule: getDueDateRule(template),
        
        // Obligation fields (if exists)
        obligation_id: existingObligation?._id,
        obligation_status: existingObligation?.status || 'not_started',
        due_date: existingObligation?.due_date,
        is_generated: !!existingObligation,
        
        // For filing modal
        dueMonth: template.recurrence_config?.due_month,
        dueDay: template.recurrence_config?.due_day
      };
    });

    res.json({
      success: true,
      data: conditionalItems
    });

  } catch (error) {
    console.error("❌ Error in getConditionalCompliances:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Generate a conditional obligation when user clicks "File"
 */
export const generateConditionalObligation = async (req, res) => {
  try {
    const { organization_id, template_id, financialYear, filingData } = req.body;

    if (!organization_id || !template_id || !financialYear) {
      return res.status(400).json({
        success: false,
        message: "organization_id, template_id, and financialYear are required"
      });
    }

    // Get the template
    const template = await ComplianceTemplate.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    // Check if obligation already exists
    const existingObligation = await ComplianceObligation.findOne({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      compliance_subtype: template.compliance_subtype,
      financial_year: financialYear
    });

    if (existingObligation) {
      return res.status(409).json({
        success: false,
        message: "Obligation already exists for this financial year",
        data: existingObligation
      });
    }

    // Calculate due date
    const [startYear] = financialYear.split("-").map(Number);
    let dueDate = new Date();
    
    if (template.recurrence_config?.due_month !== undefined && 
        template.recurrence_config?.due_day) {
      const { due_month, due_day } = template.recurrence_config;
      dueDate = new Date(
        due_month >= 3 ? startYear : startYear + 1,
        due_month,
        due_day
      );
    }

    // Create the obligation
    const obligation = new ComplianceObligation({
      organization_id: new mongoose.Types.ObjectId(organization_id),
      
      // Map template fields to obligation fields
      compliance_category: template.compliance_category,
      compliance_subtype: template.compliance_subtype,
      compliance_description: template.compliance_description,
      
      form_name: template.name,
      form_description: template.compliance_description,
      
      due_date: dueDate,
      status: filingData?.status || 'initiated',
      financial_year: financialYear,
      
      is_recurring: false,
      recurrence_type: 'one_time',
      recurrence_config: template.recurrence_config,
      
      notes: filingData?.comment || '',
      priority: 3
    });

    await obligation.save();

    res.status(201).json({
      success: true,
      message: "Conditional obligation generated successfully",
      data: obligation
    });

  } catch (error) {
    console.error("❌ Error in generateConditionalObligation:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Check if a conditional template is applicable based on company data
 */
export const checkApplicability = async (req, res) => {
  try {
    const { organization_id, template_id } = req.params;

    const template = await ComplianceTemplate.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const company = await CompanyComplianceProfile.findOne({ 
      organization_id: new mongoose.Types.ObjectId(organization_id) 
    });

    if (!company) {
      return res.json({
        success: true,
        data: {
          is_applicable: true, // Default to true if no company data
          reason: "Company profile not found, assuming applicable"
        }
      });
    }

    // Check applicability based on template type
    let isApplicable = true;
    let reason = "Applicable";

    // Example checks based on template name
    if (template.name.includes("Professional Tax")) {
      const ptStates = ["Maharashtra", "Karnataka", "West Bengal", "Telangana"];
      isApplicable = ptStates.includes(company.state);
      reason = isApplicable ? "State levies professional tax" : "State does not levy professional tax";
    }
    else if (template.name.includes("Tax Audit")) {
      const turnover = company.turnover || 0;
      const digitalPct = company.digital_transaction_percentage || 0;
      
      if (turnover > 100000000) { // >10 Cr
        isApplicable = true;
        reason = "Turnover exceeds ₹10 Cr";
      } else if (turnover > 10000000 && digitalPct < 95) { // >1 Cr with <95% digital
        isApplicable = true;
        reason = "Turnover exceeds ₹1 Cr with less than 95% digital transactions";
      } else {
        isApplicable = false;
        reason = "Below audit threshold";
      }
    }
    else if (template.name.includes("GSTR-9")) {
      const turnover = company.turnover || 0;
      isApplicable = turnover > 20000000; // >2 Cr
      reason = isApplicable ? "Turnover exceeds ₹2 Cr" : "Turnover below ₹2 Cr";
    }

    res.json({
      success: true,
      data: {
        is_applicable: isApplicable,
        reason: reason,
        template_id: template._id,
        template_name: template.name
      }
    });

  } catch (error) {
    console.error("❌ Error in checkApplicability:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Helper functions
function getApplicabilityInfo(template) {
  const infoMap = {
    "DIR-3 KYC": "Every individual holding a DIN as on 31st March must file KYC before 30th September.",
    "DPT-3 (Return of Deposits)": "Every company (other than Government company) that has accepted deposits or outstanding money.",
    "MSME-1": "Companies with outstanding payments to MSME vendors beyond 45 days.",
    "Professional Tax": "Applicable in states that levy professional tax. Rates and due dates vary by state.",
    "Tax Audit (Section 44AB)": `Business turnover > ₹1 Cr (₹10 Cr if 95%+ digital transactions), or profession receipts > ₹50L.`,
    "Transfer Pricing Audit (Section 92E)": "Companies with international transactions or specified domestic transactions exceeding ₹20 Cr.",
    "ITR-6 (Company)": "All companies registered under the Companies Act, except those claiming exemption under Section 11.",
    "GST Annual Return (GSTR-9)": "All regular GST-registered taxpayers with aggregate turnover exceeding ₹2 Cr."
  };
  
  return infoMap[template.name] || template.compliance_description || "Check if applicable to your business";
}

function getDueDateRule(template) {
  if (template.recurrence_config?.rule) {
    return template.recurrence_config.rule;
  }
  
  if (template.recurrence_config?.due_month !== undefined && 
      template.recurrence_config?.due_day) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${template.recurrence_config.due_day} ${months[template.recurrence_config.due_month]}`;
  }
  
  return "As applicable";
}