// controllers/compliance/complianceDirectors.controller.js
import { Director } from "../../models/compliance/directorModel.js";
import { CompanyComplianceProfile } from "../../models/compliance/companyComplianceProfileModel.js";

// ==============================
// GET DIRECTORS
// ==============================
export const getDirectors = async (req, res) => {
  try {
    const { organization_id, profile_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required"
      });
    }

    const filter = { organization_id };
    if (profile_id) filter.profile_id = profile_id; // optional filter by profile

    const directors = await Director.find(filter).lean();

    res.json({
      success: true,
      data: directors
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// CREATE DIRECTOR
// ==============================
export const createDirector = async (req, res) => {
  try {
    const { organization_id, profile_id, ...data } = req.body;

    if (!organization_id) {
      return res.status(400).json({
        success: false,
        message: "organization_id is required"
      });
    }

    // Find the profile (if profile_id provided) or default profile for organization
    const profileFilter = profile_id ? { _id: profile_id, organization_id } : { organization_id };
    const profile = await CompanyComplianceProfile.findOne(profileFilter);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Company profile not found. Please create a profile first."
      });
    }

    // Create the director
    const director = await Director.create({ organization_id, profile_id: profile._id, ...data });

    // Update the profile's director array and count
    await CompanyComplianceProfile.findByIdAndUpdate(
      profile._id,
      { 
        $push: { directors: director._id },
        $inc: { director_count: 1 }
      }
    );

    console.log(`✅ Director created. Company ${organization_id} now has ${profile.director_count + 1} directors`);

    res.status(201).json({
      success: true,
      data: director,
      message: "Director created successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// UPDATE DIRECTOR
// ==============================
export const updateDirector = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const director = await Director.findByIdAndUpdate(id, updates, { new: true });

    if (!director) {
      return res.status(404).json({
        success: false,
        message: "Director not found"
      });
    }

    res.json({
      success: true,
      data: director
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==============================
// DELETE DIRECTOR
// ==============================
export const deleteDirector = async (req, res) => {
  try {
    const { id } = req.params;

    const director = await Director.findById(id);
    if (!director) {
      return res.status(404).json({
        success: false,
        message: "Director not found"
      });
    }

    // Delete the director
    await Director.findByIdAndDelete(id);

    // Update the profile's director array and count
    const updatedProfile = await CompanyComplianceProfile.findByIdAndUpdate(
      director.profile_id,
      { 
        $pull: { directors: id },
        $inc: { director_count: -1 }
      },
      { new: true }
    );

    console.log(`✅ Director deleted. Company now has ${updatedProfile?.director_count || 0} directors`);

    res.json({
      success: true,
      message: "Director deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};