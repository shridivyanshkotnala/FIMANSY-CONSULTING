import { getPaymentTimeline } from "../services/payments/paymentTimelineService.js";

export const getPaymentTimelineController = async (req, res, next) => {
  try {
    const organizationId = req.headers["x-organization-id"];

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID missing",
      });
    }

    const {
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await getPaymentTimeline({
      organizationId,
      status,
      search,
      startDate,
      endDate,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    next(error);
  }
};