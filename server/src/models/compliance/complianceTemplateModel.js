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

  // Legacy fields retained for backward compatibility with existing DB indexes/data
  category_tag: {
    type: String,
    trim: true,
    index: true,
  },

  subtag: {
    type: String,
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
  trigger_type: {
  type: String,
  enum: ['scheduled', 'conditional', 'event_driven'],
  default: 'scheduled',
  index: true,
},

  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  

},
{
  timestamps: true,
}
);

// Keep legacy and new fields in sync so old and new code paths both work.
complianceTemplateSchema.pre("validate", function (next) {
  if (!this.compliance_category && this.category_tag) {
    this.compliance_category = this.category_tag;
  }
  if (!this.category_tag && this.compliance_category) {
    this.category_tag = this.compliance_category;
  }

  if (!this.compliance_subtype && this.subtag) {
    this.compliance_subtype = this.subtag;
  }
  if (!this.subtag && this.compliance_subtype) {
    this.subtag = this.compliance_subtype;
  }

  if (!this.compliance_description && this.description) {
    this.compliance_description = this.description;
  }
  if (!this.description && this.compliance_description) {
    this.description = this.compliance_description;
  }

  next();
});

// Update the compound index with new field names
complianceTemplateSchema.index({ compliance_category: 1, compliance_subtype: 1 }, { unique: true });

export const ComplianceTemplate =
  mongoose.model("ComplianceTemplate", complianceTemplateSchema);