import os from "os";
import crypto from "crypto";

export const INSTANCE_ID =
  os.hostname() + "-" + process.pid + "-" + crypto.randomUUID().slice(0, 6);
