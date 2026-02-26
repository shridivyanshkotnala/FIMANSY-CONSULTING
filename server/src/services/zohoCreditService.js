import { ZohoClient } from "./zohoClient.js";

export const fetchCreditNotesFromZoho = async ({
  connection,
  lastModifiedTime = null
}) => {

  const client = new ZohoClient({ connection });

  const params = {};

  if (lastModifiedTime) {
    params.last_modified_time = lastModifiedTime;
  }

  const { records, lastModified } = await client.paginate(
    "/creditnotes",
    params,
    "creditnotes"
  );

  return { records, lastModified };
};