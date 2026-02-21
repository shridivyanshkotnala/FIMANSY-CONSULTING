import { Organization } from "../models/organizationModel.js";
import { Membership } from "../models/membershipModel.js";
import { asynchandler } from "../utils/asynchandler.js";
import { User } from "../models/userModel.js";



export const getMyOrganizations = asynchandler(async (req, res) => {

  const memberships = await Membership.find({
    userId: req.user._id,
    status: "active",
  })
  .populate("organizationId", "name status");

  const orgs = memberships.map(m => ({
    organizationId: m.organizationId._id,
    name: m.organizationId.name,
    role: m.role,
  }));

  res.json(orgs);
});





export const inviteMember = asynchandler(async (req, res) => {

  if (!["owner", "admin"].includes(req.role))
    return res.status(403).json({ message: "Permission denied" });

  const { email, role } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  await Membership.create({
    userId: user._id,
    organizationId: req.organizationId,
    role: role || "accountant",
    invitedBy: req.user._id,
    status: "invited",
  });

  res.json({ message: "Invitation sent" });
});





export const acceptInvite = asynchandler(async (req, res) => {

  const { organizationId } = req.body;

  const membership = await Membership.findOne({
    userId: req.user._id,
    organizationId,
    status: "invited",
  });

  if (!membership)
    return res.status(404).json({ message: "Invite not found" });

  membership.status = "active";
  await membership.save();

  res.json({ message: "Joined organization" });

});





export const removeMember = asynchandler(async (req, res) => {

  if (!["owner", "admin"].includes(req.role))
    return res.status(403).json({ message: "Permission denied" });

  const memberId = req.params.id;

  await Membership.deleteOne({
    userId: memberId,
    organizationId: req.organizationId,
  });

  res.json({ message: "Member removed" });
});
