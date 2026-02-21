import { Membership } from "../models/membershipModel.js";

export const orgMiddleware = async (req, res, next) => {
  try {
    // prefer header, but allow query param fallback for full-page redirects
    const orgId = req.headers["x-organization-id"] || req.query?.org;

    if (!orgId)
      return res.status(400).json({ message: "Organization header missing" });

    // verify user actually belongs to this org
    const membership = await Membership.findOne({
      userId: req.user._id,
      organizationId: orgId,
      status: "active",
    });

    // DEBUG: log ids to help diagnose membership mismatch during OAuth flow
    try {
      console.debug("orgMiddleware: userId=", String(req.user._id), "orgId=", String(orgId), "membershipFound=", !!membership);
    } catch (e) {
      console.debug("orgMiddleware: debug log error", e.message);
    }

    if (!membership)
      return res.status(403).json({ message: "Access denied to this organization" });

    // attach context
    req.organizationId = orgId;
    req.role = membership.role;

    if (!req.user || !orgId) {
  toast.error("Organization not ready");
  return;
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Organization validation failed" });
  }
};



/*  
2️⃣ Frontend Flow (very important)

When user logs in:

Step A — fetch org list
GET /org/my


Response:

[
 { organizationId: "a1", name: "ABC Traders", role: "owner" },
 { organizationId: "b2", name: "XYZ Pvt Ltd", role: "accountant" }
]

Step B — user selects org

Store in localStorage:

activeOrgId = "b2"

Step C — attach to all requests

Example fetch:

fetch("/api/invoices", {
  headers: {
    Authorization: `Bearer ${token}`,
    "x-organization-id": activeOrgId
  }
})


3️⃣ Protect critical routes

Now routes become:

auth → org → zoho → controller


Example:

router.post(
  "/invoice",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  createInvoice
);

 */