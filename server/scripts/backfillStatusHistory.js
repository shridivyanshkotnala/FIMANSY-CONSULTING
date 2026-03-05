#!/usr/bin/env node
import connectDB from "../src/db/index.js";
import mongoose from "mongoose";
import { ComplianceTicket } from "../src/models/compliance/complianceTicketModel.js";

const run = async () => {
  try {
    await connectDB();

    console.log("Starting backfill of status_history for ComplianceTicket...");

    const query = {
      $or: [
        { status_history: { $exists: false } },
        { status_history: { $size: 0 } },
      ],
    };

    const cursor = ComplianceTicket.find(query).cursor();
    let count = 0;
    for await (const ticket of cursor) {
      const createdAt = ticket.createdAt || new Date();
      const currentStatus = ticket.status || "initiated";
      const lastActivity = ticket.last_activity_at || ticket.updatedAt || createdAt;

      const history = [];

      // initial initiated entry
      history.push({
        status: "initiated",
        from_status: null,
        to_status: ticket.status || "initiated",
        changed_by_role: "system",
        changed_by: null,
        at: createdAt,
        note: "backfill: initial",
      });

      // if current status is different, add an entry for it
      if (currentStatus && currentStatus !== "initiated") {
        history.push({
          status: currentStatus,
          from_status: ticket.status || "initiated",
          to_status: currentStatus,
          changed_by_role: "system",
          changed_by: null,
          at: lastActivity,
          note: "backfill: current",
        });
      }

      await ComplianceTicket.updateOne({ _id: ticket._id }, { $set: { status_history: history } });
      count++;
      if (count % 100 === 0) console.log(`Backfilled ${count} tickets...`);
    }

    console.log(`Done. Backfilled ${count} tickets.`);
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
};

run();
