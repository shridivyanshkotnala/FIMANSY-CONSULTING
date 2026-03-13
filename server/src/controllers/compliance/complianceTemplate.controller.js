import { ComplianceTemplate } from "../../models/compliance/complianceTemplateModel.js";

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await ComplianceTemplate.find({ is_active: true });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};