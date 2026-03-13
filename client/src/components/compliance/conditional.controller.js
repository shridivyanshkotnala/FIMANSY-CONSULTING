import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";
import { ComplianceObligation } from "../../models/compliance/complianceObligationModel.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";

/**
 * Generate conditional obligations for a specific organization and FY
 * Called when user opens the conditional tab or during onboarding
 */
export const generateConditionalObligations = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.body;

    if (!organization_id || !financialYear) {
      return res.status(400).json({
        success: false,
        message: "organization_id and financialYear are required"
      });
    }

    // Get company profile to check state, turnover etc.
    const company = await CompanyComplianceProfile.findOne({ organization_id });
    
    // Get all active conditional templates
    const templates = await ComplianceTemplate.find({ 
      trigger_type: "conditional", 
      is_active: true 
    });

    // Filter templates based on company data
    const applicableTemplates = templates.filter(template => {
      // Example: Filter professional tax by state
      if (template.name === "Professional Tax") {
        const ptStates = ["Maharashtra", "Karnataka", "West Bengal", "Telangana"];
        return company && ptStates.includes(company.state);
      }
      
      // Example: Filter tax audit by turnover
      if (template.name === "Tax Audit (Section 44AB)") {
        const turnover = company?.turnover || 0;
        const digitalPct = company?.digital_transaction_percentage || 0;
        
        if (turnover > 100000000) return true; // >10 Cr
        if (turnover > 10000000 && digitalPct < 95) return true; // >1 Cr with <95% digital
        return false;
      }
      
      // Default: include all other conditional templates
      return true;
    });

    // Check for existing obligations to avoid duplicates
    const existingObligations = await ComplianceObligation.find({
      organization_id,
      financial_year: financialYear,
      compliance_subtype: { $in: applicableTemplates.map(t => t.compliance_subtype) }
    });

    const existingSubtypes = new Set(
      existingObligations.map(o => o.compliance_subtype)
    );

    // Generate obligations only for templates not already generated
    const obligationsToInsert = applicableTemplates
      .filter(t => !existingSubtypes.has(t.compliance_subtype))
      .map(template => {
        // Calculate due date if config exists
        let dueDate = new Date();
        const [startYear] = financialYear.split("-").map(Number);
        
        if (template.recurrence_config?.due_month !== undefined && 
            template.recurrence_config?.due_day) {
          const { due_month, due_day } = template.recurrence_config;
          dueDate = new Date(
            due_month >= 3 ? startYear : startYear + 1,
            due_month,
            due_day
          );
        }

        return {
          organization_id,
          form_name: template.name,
          form_description: template.compliance_description,
          compliance_type: template.compliance_category,
          compliance_category: template.compliance_category,
          compliance_subtype: template.compliance_subtype,
          compliance_description: template.compliance_description,
          financial_year: financialYear,
          due_date: dueDate,
          status: "not_started",
          is_recurring: false,
          recurrence_type: "one_time",
          recurrence_config: template.recurrence_config,
          priority: 3
        };
      });

    let inserted = [];
    if (obligationsToInsert.length > 0) {
      inserted = await ComplianceObligation.insertMany(obligationsToInsert, { 
        ordered: false 
      });
    }

    res.json({
      success: true,
      message: `Generated ${inserted.length} conditional obligations`,
      generated: inserted.length,
      total_applicable: applicableTemplates.length,
      data: inserted
    });

  } catch (error) {
    console.error("❌ Error generating conditional obligations:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

/**
 * Get conditional obligations (templates + existing obligations)
 * This is what the frontend tab will call
 */
export const getConditionalObligations = async (req, res) => {
  try {
    const { organization_id, financialYear } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required"
      });
    }

    // First, ensure obligations are generated
    const company = await CompanyComplianceProfile.findOne({ organization_id });
    
    // Get all conditional templates
    const templates = await ComplianceTemplate.find({ 
      trigger_type: "conditional", 
      is_active: true 
    }).lean();

    // Get existing obligations for this org and FY
    const obligations = await ComplianceObligation.find({
      organization_id,
      financial_year: financialYear || company?.financial_year
    }).lean();

    // Map obligations to their templates for display
    const obligationsMap = new Map(
      obligations.map(o => [o.compliance_subtype, o])
    );

    // Combine template data with obligation status
    const conditionalItems = templates.map(template => {
      const existingObligation = obligationsMap.get(template.compliance_subtype);
      
      return {
        ...template,
        obligation_id: existingObligation?._id,
        obligation_status: existingObligation?.status || 'not_generated',
        due_date: existingObligation?.due_date,
        is_generated: !!existingObligation
      };
    });

    res.json({
      success: true,
      data: conditionalItems
    });

  } catch (error) {
    console.error("❌ Error fetching conditional obligations:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};