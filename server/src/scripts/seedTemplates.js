import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Running seed script with NEW schema fields...");
console.log("Mongo URI exists:", !!process.env.MONGODB_URI);

const templates = [
  {
    "name": "GST Return – GSTR-1",
    "compliance_category": "gst",
    "compliance_subtype": "gstr1",
    "compliance_description": "Outward supply details",
    "recurrence_type": "monthly",
    "recurrence_config": {
      "due_day": 11,
      "offset_months": 1
    },
    "is_active": true
  },
  {
    "name": "GST Return – GSTR-3B",
    "compliance_category": "gst",
    "compliance_subtype": "gstr3b",
    "compliance_description": "Summary of sales, ITC and tax payable",
    "recurrence_type": "monthly",
    "recurrence_config": {
      "due_day": 20,
      "offset_months": 1
    },
    "is_active": true
  },
  {
    "name": "TDS Payment",
    "compliance_category": "tds",
    "compliance_subtype": "tds_payment",
    "compliance_description": "Monthly TDS deposit",
    "recurrence_type": "monthly",
    "recurrence_config": {
      "due_day": 7,
      "offset_months": 1
    },
    "is_active": true
  },
  {
    "name": "TDS Return – Form 24Q / 26Q",
    "compliance_category": "tds",
    "compliance_subtype": "tds_return",
    "compliance_description": "Quarterly TDS return filing",
    "recurrence_type": "quarterly",
    "recurrence_config": {
      "due_dates": ["31-07", "31-10", "31-01", "31-05"]
    },
    "is_active": true
  },
  {
    "name": "PF Contribution",
    "compliance_category": "payroll",
    "compliance_subtype": "pf",
    "compliance_description": "Monthly Provident Fund contribution",
    "recurrence_type": "monthly",
    "recurrence_config": {
      "due_day": 15,
      "offset_months": 1
    },
    "is_active": true
  },
  {
    "name": "ESIC Contribution",
    "compliance_category": "payroll",
    "compliance_subtype": "esic",
    "compliance_description": "Monthly ESIC contribution",
    "recurrence_type": "monthly",
    "recurrence_config": {
      "due_day": 15,
      "offset_months": 1
    },
    "is_active": true
  },
  {
    "name": "Income Tax Return (ITR)",
    "compliance_category": "income_tax",
    "compliance_subtype": "itr6",
    "compliance_description": "Annual income tax filing for company",
    "recurrence_type": "annual",
    "recurrence_config": {
      "due_day": 30,
      "due_month": 9
    },
    "is_active": true
  },
  {
    "name": "Tax Audit Report",
    "compliance_category": "income_tax",
    "compliance_subtype": "tax_audit",
    "compliance_description": "Tax audit report filing (if applicable)",
    "recurrence_type": "annual",
    "recurrence_config": {
      "due_day": 30,
      "due_month": 9
    },
    "is_active": true
  },
  {
    "name": "Transfer Pricing Report",
    "compliance_category": "income_tax",
    "compliance_subtype": "transfer_pricing",
    "compliance_description": "Transfer pricing report for international/specified domestic transactions",
    "recurrence_type": "annual",
    "recurrence_config": {
      "due_day": 30,
      "due_month": 11
    },
    "is_active": true
  },
  {
    "name": "Form 16 & 16A Issuance",
    "compliance_category": "mca",
    "compliance_subtype": "form16",
    "compliance_description": "Issuance of TDS certificates to employees and vendors",
    "recurrence_type": "annual",
    "recurrence_config": {
      "due_day": 15,
      "due_month": 6
    },
    "is_active": true
  },
  {
    "name": "Advance Tax - Q1",
    "compliance_category": "income_tax",
    "compliance_subtype": "advance_tax_q1",
    "compliance_description": "15% of estimated tax - 15th June",
    "recurrence_type": "quarterly",
    "recurrence_config": {
      "due_day": 15,
      "due_month": 6
    },
    "is_active": true
  },
  {
    "name": "Advance Tax - Q2",
    "compliance_category": "income_tax",
    "compliance_subtype": "advance_tax_q2",
    "compliance_description": "45% cumulative - 15th September",
    "recurrence_type": "quarterly",
    "recurrence_config": {
      "due_day": 15,
      "due_month": 9
    },
    "is_active": true
  },
  {
    "name": "Advance Tax - Q3",
    "compliance_category": "income_tax",
    "compliance_subtype": "advance_tax_q3",
    "compliance_description": "75% cumulative - 15th December",
    "recurrence_type": "quarterly",
    "recurrence_config": {
      "due_day": 15,
      "due_month": 12
    },
    "is_active": true
  },
  {
    "name": "Advance Tax - Q4",
    "compliance_category": "income_tax",
    "compliance_subtype": "advance_tax_q4",
    "compliance_description": "100% cumulative - 15th March",
    "recurrence_type": "quarterly",
    "recurrence_config": {
      "due_day": 15,
      "due_month": 3
    },
    "is_active": true
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Mongo Connected");

    await ComplianceTemplate.deleteMany();
    console.log("🗑️ Old templates cleared");

    console.log("📦 Inserting templates with NEW schema fields...");
    console.log(`Total templates to insert: ${templates.length}`);

    const result = await ComplianceTemplate.insertMany(templates);
    console.log(`✅ Successfully seeded ${result.length} templates`);

    // Group by category for verification
    const grouped = {};
    result.forEach(t => {
      if (!grouped[t.compliance_category]) grouped[t.compliance_category] = [];
      grouped[t.compliance_category].push(t.name);
    });

    console.log("\n📋 Templates by category:");
    Object.keys(grouped).forEach(category => {
      console.log(`\n${category.toUpperCase()}: ${grouped[category].length} templates`);
      grouped[category].forEach(name => console.log(`   - ${name}`));
    });

    // Verify the inserted templates
    const inserted = await ComplianceTemplate.find({});
    console.log("\n📋 Verification - Sample templates in database:");
    inserted.slice(0, 5).forEach(t => {
      console.log(`- ${t.name}:`, {
        category: t.compliance_category,
        subtype: t.compliance_subtype,
        recurrence: t.recurrence_type,
        config: JSON.stringify(t.recurrence_config)
      });
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
};

seed();