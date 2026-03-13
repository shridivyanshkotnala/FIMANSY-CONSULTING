import mongoose from "mongoose";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";
import { Organization } from "../../models/organizationModel.js";
import { asynchandler } from "../../utils/asynchandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateObligationsForFY } from "../../Functions/complianceMainEngine.js";

// ==============================
// Constants for company types
// ==============================
const COMPANY_TYPES = {
  PRIVATE: "private_limited",
  PUBLIC: "public_limited",
  LLP: "llp",
};

// ==============================
// Helper functions
// ==============================
const fetchProfile = async (organization_id) => {
  return CompanyComplianceProfile.findOne({ organization_id });
};

const getMissingFields = (profile) => {
  const requiredFields = [];

  if (!profile.date_of_incorporation) requiredFields.push("DATE_OF_INCORPORATION");
  if (!profile.registered_office_address) requiredFields.push("REGISTERED_OFFICE_ADDRESS");

  return requiredFields;
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const isProfileComplete = (profile) => getMissingFields(profile).length === 0;

// ==============================
// Create company profile
// ==============================
export const createCompanyProfile = asynchandler(async (req, res) => {
  const { organization_id } = req.body;

  if (!organization_id) throw new ApiError(400, "organization_id is required");

  const org = await Organization.findOne({ _id: organization_id, owner: req.user._id });
  if (!org) throw new ApiError(404, "Organization not found or access denied");

  const existingProfile = await CompanyComplianceProfile.findOne({ organization_id });
  if (existingProfile) throw new ApiError(400, "Profile already exists");

  const profile = await CompanyComplianceProfile.create({
    organization_id,
    ...req.body,
    directors: [],
    director_count: 0,
    financial_year_end: req.body.financial_year_end || 3,
    authorized_capital: req.body.authorized_capital || 0,
    paid_up_capital: req.body.paid_up_capital || 0,
    mca_status: "active",
    obligations_generated: false,
  });

  // 🚀 Auto-generate obligations immediately
  try {
    console.log("🎯 New profile created! Generating obligations...");
    const currentFY = getCurrentFinancialYear();
    const count = await generateObligationsForFY(profile.organization_id, currentFY);
    profile.obligations_generated = true;
    await profile.save();
    console.log(`✅ Generated ${count} obligations for FY ${currentFY}`);
    console.log(`👥 Directors count: ${profile.director_count}`);
  } catch (genError) {
    console.error("❌ Failed to generate obligations:", genError.message);
  }

  res.status(201).json(new ApiResponse(201, profile, "Company compliance profile created successfully"));
});

// ==============================
// Update company profile
// ==============================
export const updateCompanyProfile = asynchandler(async (req, res) => {
  const profile = await CompanyComplianceProfile.findById(req.params.id);
  if (!profile) throw new ApiError(404, "Compliance profile not found");

  const updatedProfile = await CompanyComplianceProfile.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  // Generate obligations if not already done
  if (!updatedProfile.obligations_generated) {
    try {
      console.log("🎯 Generating obligations for updated profile...");
      const currentFY = getCurrentFinancialYear();
      const count = await generateObligationsForFY(updatedProfile.organization_id, currentFY);
      updatedProfile.obligations_generated = true;
      await updatedProfile.save();
      console.log(`✅ Generated ${count} obligations for FY ${currentFY}`);
    } catch (genError) {
      console.error("❌ Failed to generate obligations:", genError.message);
    }
  } else {
    console.log("⏭️ Obligations already generated for this company");
  }

  res.json(new ApiResponse(200, updatedProfile, "Profile updated successfully"));
});

// ==============================
// Get company profile
// ==============================
export const getCompanyProfile = async (req, res) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) return res.status(400).json({ success: false, message: "organization_id is required" });

    const profile = await CompanyComplianceProfile.findOne({ organization_id }).populate('directors');
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    res.json({
      success: true,
      data: {
        ...profile.toObject(),
        director_count: profile.directors.length,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// Get onboarding status
// ==============================
export const getOnboardingStatus = asynchandler(async (req, res) => {
  const profile = await fetchProfile(req.params.organization_id);

  if (!profile) {
    return res.json(new ApiResponse(200, { is_onboarded: false, has_profile: false }, "Onboarding status fetched"));
  }

  const missingFields = getMissingFields(profile);
  const isComplete = missingFields.length === 0;

  res.json(new ApiResponse(200, {
    organization_id: req.params.organization_id,
    has_profile: true,
    company_type: profile.company_type,
    profile_completed: isComplete,
    missing_required_fields: missingFields,
    is_onboarded: isComplete,
    obligations_generated: profile.obligations_generated || false,
  }, "Onboarding status fetched"));
});