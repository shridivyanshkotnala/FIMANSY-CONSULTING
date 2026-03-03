import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ComplianceTemplate } from "../models/compliance/complianceTemplateModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("Running seed script...");
console.log("Mongo URI exists:", !!process.env.MONGODB_URI);

const templates = [
  {
    name: "GST Return – GSTR-3B",
    category_tag: "gst",
    subtag: "gstr3b",
    recurrence_type: "monthly",
    recurrence_config: { due_day: 20, offset_months: 1 },
    description: "Monthly GST return filing",
    is_active: true
  },
  {
  name: "TDS Return – 26Q",
  category_tag: "tds",
  subtag: "26q",
  recurrence_type: "quarterly",
  recurrence_config: {
    due_dates: ["31-07", "31-10", "31-01", "30-04"]
  },
  description: "Quarterly TDS filing",
  is_active: true
},
  {
    name: "Income Tax Return",
    category_tag: "income_tax",
    subtag: "itr",
    recurrence_type: "annual",
    recurrence_config: { due_day: 31, due_month: 7 },
    description: "Annual income tax return",
    is_active: true
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Mongo Connected");

    await ComplianceTemplate.deleteMany();
    console.log("Old templates cleared");

    console.log("Inserting:", templates);

    await ComplianceTemplate.insertMany(templates);

    console.log("Templates seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("FULL ERROR:", err);
    process.exit(1);
  }
};

seed();