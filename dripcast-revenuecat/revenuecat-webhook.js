/**
 * RevenueCat webhook receiver for the DripCast backend (se_project_express).
 *
 * DROP-IN: copy this file into your backend repo (e.g. routes/revenuecat-webhook.js)
 * and mount it in your main app file:
 *
 *   app.use("/webhooks/revenuecat", require("./routes/revenuecat-webhook"));
 *
 * ENV (set on the server, e.g. Render dashboard -> Environment):
 *   REVENUECAT_WEBHOOK_SECRET=<the secret you paste into RevenueCat's webhook settings>
 *
 * SCHEMA (add to your User model once — see REVENUECAT_SETUP.md step 0):
 *   isPro:       { type: Boolean, default: false }
 *   proExpiresAt:{ type: Date,    default: null   }
 *
 * HOW MATCHING WORKS: the DripCast app calls Purchases.logIn(<backend user _id>)
 * after sign-in, so RevenueCat's `app_user_id` IS the Mongo user _id. That's
 * what we update below. Anonymous/aliased ids are ignored.
 */

const express = require("express");
const mongoose = require("mongoose");

// Adjust this path to wherever your User model lives.
const User = require("../models/user");

const router = express.Router();

const PRO_ENTITLEMENT_ID = "dripcast_pro";

// Events that grant (or extend) Pro.
const GRANT_EVENTS = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION"]);
// Events that end Pro.
const REVOKE_EVENTS = new Set(["EXPIRATION"]);
// CANCELLATION is intentionally NOT in either set: when a user cancels, they
// keep Pro until the paid period actually expires (Apple/Google's rule).

router.post("/", express.json(), async (req, res, next) => {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authHeader = req.headers.authorization || "";
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { event } = req.body || {};
    if (!event || typeof event !== "object") {
      return res.status(400).json({ message: "Missing event payload" });
    }

    const { type, app_user_id: appUserId } = event;
    if (!type || !appUserId) {
      return res.status(400).json({ message: "Missing event type or app_user_id" });
    }

    // Only act on events tied to the DripCast Pro entitlement.
    const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
    if (!entitlementIds.includes(PRO_ENTITLEMENT_ID)) {
      return res.status(200).json({ message: "Ignored: not a dripcast_pro event" });
    }

    // app_user_id must be a real backend user (we log in with the Mongo _id).
    if (!mongoose.Types.ObjectId.isValid(appUserId)) {
      return res.status(200).json({ message: "Ignored: app_user_id is not a backend user" });
    }

    if (GRANT_EVENTS.has(type)) {
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
      await User.findByIdAndUpdate(appUserId, {
        $set: { isPro: true, proExpiresAt: expiresAt },
      });
      return res.status(200).json({ message: "Pro granted" });
    }

    if (REVOKE_EVENTS.has(type)) {
      await User.findByIdAndUpdate(appUserId, {
        $set: { isPro: false, proExpiresAt: null },
      });
      return res.status(200).json({ message: "Pro revoked" });
    }

    // Everything else (CANCELLATION, TRIAL_STARTED, BILLING_ISSUE, etc.):
    // no state change — the user keeps Pro until EXPIRATION arrives.
    return res.status(200).json({ message: `Ignored: ${type}` });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
