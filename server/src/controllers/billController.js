import { pushBillToZoho } from '../services/zohoBillService.js';

export const syncBillToZoho = async (req, res) => {

  const bill = req.body.bill;

  const result = await pushBillToZoho(req.zoho, bill);

  res.json({
    success: true,
    zohoBillId: result.bill_id,
  });
};