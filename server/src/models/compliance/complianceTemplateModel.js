import mongoose from "mongoose";

const complianceTemplateSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
  },

  compliance_category: {  // was: category_tag
    type: String,
    enum: ['gst','tds','income_tax','payroll','mca'],
    required: true,
    index: true,
  },

  compliance_subtype: {  // was: subtag
    type: String,
    required: true,
    trim: true,
    index: true,
  },

  compliance_description: {  // was: description
    type: String,
    trim: true,
  },

  recurrence_type: {
    type: String,
    enum: ['monthly','quarterly','annual','one_time'],
    required: true,
  },

  recurrence_config: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  is_active: {
    type: Boolean,
    default: true,
    index: true,
  }

},
{
  timestamps: true,
}
);

// Update the compound index with new field names
complianceTemplateSchema.index({ compliance_category: 1, compliance_subtype: 1 }, { unique: true });

export const ComplianceTemplate =
  mongoose.model("ComplianceTemplate", complianceTemplateSchema);