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

// Helper: determine missing required fields - SIMPLIFIED VERSION
const getMissingFields = (profile) => {
  const requiredFields = [];

  // Only check these 5 required fields:
  // 1. Date of Incorporation
  if (!profile.date_of_incorporation) {
    requiredFields.push("DATE_OF_INCORPORATION");
  }

  // 2-5. Address fields (now stored in registered_office_address)
  if (!profile.registered_office_address) {
    requiredFields.push("REGISTERED_OFFICE_ADDRESS");
  }

  return requiredFields;
};

// Helper to get current financial year
function getCurrentFinancialYear() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Financial year runs from April to March
  if (month >= 3) { // April to December
    return `${year}-${year + 1}`;
  } else { // January to March
    return `${year - 1}-${year}`;
  }
}

// Helper to check if profile is complete
function isProfileComplete(profile) {
  const missingFields = getMissingFields(profile);
  return missingFields.length === 0;
}

// Create company compliance profile
export const createCompanyProfile = asynchandler(async (req, res) => {
  const { organization_id } = req.body;

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

  // Create the profile
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

  // 🚀 AUTO-GENERATE OBLIGATIONS IMMEDIATELY AFTER PROFILE CREATION
  try {
    console.log("🎯 New profile created! Generating obligations...");
    const currentFY = getCurrentFinancialYear();
    const count = await generateObligationsForFY(profile.organization_id, currentFY);
    
    // Mark that obligations have been generated
    profile.obligations_generated = true;
    await profile.save();
    
    console.log(`✅ Successfully generated ${count} obligations for FY ${currentFY}`);
  } catch (genError) {
    console.error("❌ Failed to generate obligations:", genError.message);
    // Don't fail the profile creation
  }

  res.status(201).json(new ApiResponse(201, profile, "Company compliance profile created successfully"));
});

// Update company profile - SIMPLIFIED VERSION
export const updateCompanyProfile = asynchandler(async (req, res) => {
  try {
    console.log('📥 Updating profile with ID:', req.params.id);
    console.log('📦 Update data:', req.body);

    // Get the current profile before update
    const currentProfile = await CompanyComplianceProfile.findById(req.params.id);
    
    if (!currentProfile) {
      throw new ApiError(404, "Compliance profile not found");
    }

    // Update the profile
    const profile = await CompanyComplianceProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // 🚀 SIMPLE RULE: If profile exists and obligations not generated, generate them
    // No complex completion check - just generate if not already done
    if (!profile.obligations_generated) {
      console.log("🎯 Profile updated! Generating obligations (first time)...");
      
      try {
        const currentFY = getCurrentFinancialYear();
        console.log(`📅 Current FY: ${currentFY}`);
        
        const count = await generateObligationsForFY(profile.organization_id, currentFY);
        
        // Mark that obligations have been generated
        profile.obligations_generated = true;
        await profile.save();
        
        console.log(`✅ Successfully generated ${count} obligations for FY ${currentFY}`);
      } catch (genError) {
        console.error("❌ Failed to generate obligations:", genError.message);
        // Don't fail the update
      }
    } else {
      console.log('⏭️ Obligations already generated for this company');
    }

    console.log('✅ Profile updated successfully:', profile._id);
    res.json(new ApiResponse(200, profile, "Profile updated successfully"));
    
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
});

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

// Onboarding status
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