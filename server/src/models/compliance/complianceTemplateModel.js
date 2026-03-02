import mongoose from "mongoose";

const complianceTemplateSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
  },

  category_tag: {
    type: String,
    enum: ['gst','tds','income_tax','payroll','mca'],
    required: true,
    index: true,
  },

  subtag: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },

  description: {
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

complianceTemplateSchema.index({ category_tag: 1, subtag: 1 }, { unique: true });

export const ComplianceTemplate =
  mongoose.model("ComplianceTemplate", complianceTemplateSchema);