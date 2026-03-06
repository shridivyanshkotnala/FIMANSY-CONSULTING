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
    name: "GST Return – GSTR-3B",
    compliance_category: "gst",           // ✅ NEW field name
    compliance_subtype: "gstr3b",          // ✅ NEW field name
    compliance_description: "Monthly GST return filing", // ✅ NEW field name
    recurrence_type: "monthly",
    recurrence_config: { due_day: 20, offset_months: 1 },
    is_active: true
  },
  {
    name: "TDS Return – 26Q",
    compliance_category: "tds",            // ✅ NEW field name
    compliance_subtype: "26q",              // ✅ NEW field name
    compliance_description: "Quarterly TDS filing", // ✅ NEW field name
    recurrence_type: "quarterly",
    recurrence_config: {
      due_dates: ["31-07", "31-10", "31-01", "30-04"]
    },
    is_active: true
  },
  {
    name: "Income Tax Return",
    compliance_category: "income_tax",      // ✅ NEW field name
    compliance_subtype: "itr",               // ✅ NEW field name
    compliance_description: "Annual income tax return", // ✅ NEW field name
    recurrence_type: "annual",
    recurrence_config: { due_day: 31, due_month: 7 },
    is_active: true
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Mongo Connected");

    await ComplianceTemplate.deleteMany();
    console.log("🗑️ Old templates cleared");

    console.log("📦 Inserting templates with NEW schema fields:", 
      templates.map(t => ({
        name: t.name,
        compliance_category: t.compliance_category,
        compliance_subtype: t.compliance_subtype
      }))
    );

    const result = await ComplianceTemplate.insertMany(templates);
    console.log(`✅ Successfully seeded ${result.length} templates`);

    // Verify the inserted templates
    const inserted = await ComplianceTemplate.find({});
    console.log("\n📋 Verification - Templates in database:");
    inserted.forEach(t => {
      console.log(`- ${t.name}:`, {
        compliance_category: t.compliance_category,
        compliance_subtype: t.compliance_subtype,
        compliance_description: t.compliance_description?.substring(0, 30) + '...'
      });
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
};

seed();