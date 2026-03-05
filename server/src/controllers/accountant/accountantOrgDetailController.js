import {
  fetchOrganizationSummary,
  fetchOrganizationTickets,
  fetchOrganizationCompanyProfile,
} from "../../services/accountant/accountantOrgDetailService.js";
import { asynchandler } from "../../utils/asynchandler.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";
import { Director } from "../../models/compliance/directorModel.js";


export const getOrganizationSummary = async (req, res) => {
  try {
    const { orgId } = req.params;

    const data = await fetchOrganizationSummary(orgId);

    res.status(200).json(data);
  } catch (err) {
    res.status(400).json({
      message: err.message || "Failed to fetch organization summary",
    });
  }
};



// controllers/accountantOrgDetail.controller.js

export const getOrganizationTickets = asynchandler(async (req, res) => {
    const { orgId } = req.params;
    const tickets = await fetchOrganizationTickets(orgId, req.query);
    if (!tickets) {
        throw new ApiError(404, "No tickets found for this organization");
    }
    return res.status(200).json(tickets);

})


export const getOrganizationCompany = asynchandler(async (req, res) => {
    const { orgId } = req.params;
    const companyProfile = await fetchOrganizationCompanyProfile(orgId);
    if (!companyProfile) {
        throw new ApiError(404, "Company profile not found for this organization");
    }
    return res.status(200).json(companyProfile);
})


export const getOrgDirectors = asynchandler(async (req, res) => {
    const { orgId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
        return res.status(400).json({ message: "Invalid org ID" });
    }

    const directors = await Director.find({ organization_id: orgId })
        .sort({ is_active: -1, name: 1 })
        .lean();

    return res.status(200).json({
        total: directors.length,
        data: directors,
    });
})