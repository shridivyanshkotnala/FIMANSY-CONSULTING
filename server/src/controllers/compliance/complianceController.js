import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";
import { generateObligationsForFY } from "../Functions/complianceMainEngine.js";
import { ComplianceObligation } from "../models/compliance/complianceObligationModel.js";

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await ComplianceTemplate.find({ is_active: true });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const generateFY = async (req, res) => {
  try {
    const { organization_id, financial_year } = req.body;

    const count = await generateObligationsForFY(
      organization_id,
      financial_year
    );

    res.json({ message: "Obligations generated", count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const getCalendarObligations = async (req, res) => {
  try {
    const { organization_id, financial_year } = req.query;

    const obligations = await ComplianceObligation.find({
      organization_id,
      financial_year,
      is_ignored: false
    });

    res.json(obligations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};